
import { House, WarehouseItem, DailyBriefingTask, CycleTime, NpcType, PriceConfig, DailyBriefingData, ProjectedProfit, Division, DashboardAnalytics, VirtualHouse } from "../types";

// Calculates the THEORETICAL MAXIMUM throughput of the current layout
const calculateProjectedProfit = (
    houses: House[],
    cycleTimes: CycleTime[],
    prices: PriceConfig,
    checkinTimes: number[]
): ProjectedProfit => {
    const activeSlots = houses.flatMap(h => h.slots).filter(s => s.npc.type && s.npc.duration);
    if (activeSlots.length === 0 || checkinTimes.length === 0) {
        return { grossRevenue: 0, npcExpenses: 0, perfectionExpenses: 0, netProfit: 0, sPetsCount: 0 };
    }

    const fullCycleTimeHours = cycleTimes.reduce((sum, ct) => sum + ct.time, 0);
    const finalPetPrice = prices.petPrices[NpcType.S] || 0;

    const numCheckins = checkinTimes.length;
    const avgHoursBetweenCheckins = 24 / numCheckins;
    const avgIdleTimeHours = avgHoursBetweenCheckins / 2;
    const totalEffectiveCycleTime = fullCycleTimeHours + avgIdleTimeHours;

    const pipelinesPerSlotPerWeek = (7 * 24) / totalEffectiveCycleTime;
    const sPetsCount = activeSlots.length * pipelinesPerSlotPerWeek;
    
    const grossRevenue = sPetsCount * finalPetPrice;

    let npcExpenses = 0;
    activeSlots.forEach(slot => {
        const duration = slot.npc.duration;
        const cost = duration === 7 ? prices.npcCost7Day : prices.npcCost15Day;
        if (duration && cost > 0) {
            const weeklyCostForSlot = (cost / duration) * 7;
            npcExpenses += weeklyCostForSlot;
        }
    });
    
    const hasChampionHouse = houses.some(h => h.division === Division.CHAMPION);
    const perfectionExpenses = hasChampionHouse ? grossRevenue : 0;

    const netProfit = grossRevenue - npcExpenses - perfectionExpenses;

    return { grossRevenue, npcExpenses, perfectionExpenses, netProfit, sPetsCount };
};

// Calculates the ACTUAL expected cash flow for the next 7 days based on current timers
const calculateActualWeeklyFinances = (
    houses: House[],
    prices: PriceConfig,
    currentTime?: number
): ProjectedProfit => {
    const now = currentTime || Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const endOfWeek = now + oneWeekMs;

    let grossRevenue = 0;
    let npcExpenses = 0;
    let sPetsCount = 0;

    houses.forEach(house => {
        house.slots.forEach(slot => {
            // 1. Calculate Revenue: Only 'A' NPCs produce an 'S' pet for sale
            if (slot.npc.type === NpcType.A && slot.pet.finishTime) {
                if (slot.pet.finishTime > now && slot.pet.finishTime <= endOfWeek) {
                    grossRevenue += (prices.petPrices[NpcType.S] || 0);
                    sPetsCount++;
                }
            }

            // 2. Calculate Expenses: NPC Expirations occurring in the next 7 days
            if (slot.npc.expiration) {
                const expirationTime = new Date(slot.npc.expiration).getTime();
                if (expirationTime > now && expirationTime <= endOfWeek) {
                    const cost = slot.npc.duration === 7 ? prices.npcCost7Day : prices.npcCost15Day;
                    npcExpenses += cost;
                }
            }
        });
    });

    const perfectionExpenses = 0; 
    const netProfit = grossRevenue - npcExpenses - perfectionExpenses;

    return { grossRevenue, npcExpenses, perfectionExpenses, netProfit, sPetsCount };
};


// RE-IMPLEMENTATION with VirtualHouses support
export const generateDailyBriefing = (
    houses: House[], 
    cycleTimes: CycleTime[], 
    checkinTimes: number[], 
    virtualHouses: VirtualHouse[],
    currentTime?: number
): DailyBriefingData => {
    const now = currentTime ? new Date(currentTime) : new Date();
    const sortedCheckinHours = [...checkinTimes].sort((a,b) => a - b);

    const allCheckinDates = [
        ...sortedCheckinHours.map(hour => new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, hour, 0, 0)),
        ...sortedCheckinHours.map(hour => new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0)),
        ...sortedCheckinHours.map(hour => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, 0, 0))
    ];

    let nextCheckin = allCheckinDates.find(time => time.getTime() > now.getTime());
    if (!nextCheckin) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 2);
      nextCheckin = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), sortedCheckinHours[0] || 9, 0, 0);
    }

    const allFinishedSlots = houses.flatMap(h => 
        h.slots
            .map((s, i) => ({ ...s, houseId: h.id, serviceBlock: h.serviceBlock, slotIndex: i }))
            .filter(s => s.pet.finishTime)
    );
    
    const nowTimestamp = now.getTime();
    const dueSlots = allFinishedSlots.filter(s => s.pet.finishTime! <= nowTimestamp);
    const upcomingSlots = allFinishedSlots.filter(s => s.pet.finishTime! > nowTimestamp && s.pet.finishTime! < nextCheckin!.getTime());

    const npcRankOrder = [NpcType.F, NpcType.E, NpcType.D, NpcType.C, NpcType.B, NpcType.A];
    const petRankOrder = [NpcType.F, NpcType.E, NpcType.D, NpcType.C, NpcType.B, NpcType.A, NpcType.S];

    const mapSlotsToTasks = (slots: typeof allFinishedSlots): DailyBriefingTask[] => {
        return slots.map((slot): DailyBriefingTask => {
            const currentNpcType = slot.npc.type!;
            const currentRankIndex = npcRankOrder.indexOf(currentNpcType);
            const currentPetName = slot.pet.name || `${currentNpcType}-Pet`;
            const finishTime = new Date(slot.pet.finishTime || 0).toLocaleString();
            const nextRank = npcRankOrder[currentRankIndex + 1] || NpcType.S; // Default to S if at end

            // Determine Task Logic based on Mode
            const mode = slot.npc.mode || 'LINKED';
            let taskName = `Harvest ${currentNpcType} & Start ${nextRank}`;
            if (currentNpcType === NpcType.F) taskName = `Harvest F & Start E (Use Stock)`;

            // Base Task Object
            const taskBase: DailyBriefingTask = {
                houseId: slot.houseId,
                slotIndex: slot.slotIndex,
                currentPet: currentPetName,
                task: taskName,
                estFinishTime: finishTime,
                serviceBlock: slot.serviceBlock,
                currentNpcType,
                nextNpcType: nextRank,
            };

            // --- LOGIC BRANCHING ---

            // 1. Independent / Flexible Solo
            if (mode === 'SOLO' && !slot.npc.virtualHouseId) {
                return {
                    ...taskBase,
                    task: `Harvest ${currentNpcType} to Warehouse`,
                    nextNpcType: currentNpcType, // Loops on itself or just empties
                    forceStore: true
                };
            }

            // 2. Virtual House Chain
            if (mode === 'SOLO' && slot.npc.virtualHouseId) {
                const vHouse = virtualHouses.find(vh => vh.id === slot.npc.virtualHouseId);
                if (vHouse) {
                    const currentVIndex = vHouse.slots.findIndex(s => s.houseId === slot.houseId && s.slotIndex === slot.slotIndex);
                    
                    if (currentVIndex !== -1 && currentVIndex < vHouse.slots.length - 1) {
                        // Move to next slot in virtual chain
                        const nextVSlot = vHouse.slots[currentVIndex + 1];
                        return {
                            ...taskBase,
                            task: `Transfer to ${vHouse.name} (Pos ${currentVIndex + 2})`,
                            targetHouseId: nextVSlot.houseId,
                            targetSlotIndex: nextVSlot.slotIndex,
                            virtualHouseName: vHouse.name
                        };
                    } else {
                        // Last slot in virtual chain -> S Pet Collection
                        return {
                            ...taskBase,
                            task: `Claim Sacri S for Sale (${vHouse.name})`,
                            nextNpcType: NpcType.S
                        };
                    }
                }
                // Fallback if VHouse not found
                return { ...taskBase, forceStore: true, task: `Harvest ${currentNpcType} (VH Error)` };
            }

            // 3. Linked (Physical House Chain)
            // Look for next slot in same house
            const house = houses.find(h => h.id === slot.houseId);
            if (house) {
                // Naive check: Next physical slot index
                // A more robust check would verify the NPC type matches 'nextRank', 
                // but for 'Linked' we assume standard linear progression 0->1->2.
                // Or we scan the house for the correct NPC type.
                
                if (currentRankIndex === npcRankOrder.length - 1) { // 'A' Pet
                    return {
                        ...taskBase,
                        task: `Claim Sacri S for Sale`,
                        nextNpcType: NpcType.S
                    };
                }

                // Scan house for the target NPC type
                const targetSlotIndex = house.slots.findIndex(s => s.npc.type === nextRank);
                if (targetSlotIndex !== -1) {
                     return {
                        ...taskBase,
                        targetHouseId: house.id,
                        targetSlotIndex: targetSlotIndex
                    };
                } else {
                    // Broken Link: Can't find next NPC in same house
                    return {
                        ...taskBase,
                        task: `Harvest ${currentNpcType} to Warehouse (Link Broken)`,
                        forceStore: true
                    };
                }
            }

            return taskBase;

        }).filter((task): task is DailyBriefingTask => task !== null && !!task.currentNpcType);
    };
    
    const dueTasks = mapSlotsToTasks(dueSlots);
    const upcomingTasks = mapSlotsToTasks(upcomingSlots);

    dueTasks.sort((a, b) => {
        const rankA = petRankOrder.indexOf(a.nextNpcType!);
        const rankB = petRankOrder.indexOf(b.nextNpcType!);
        return rankB - rankA;
    });

    return { dueTasks, upcomingTasks, nextCheckin };
};


export const generateDashboardAnalytics = (
    houses: House[], 
    warehouseItems: WarehouseItem[],
    cycleTimes: CycleTime[],
    prices: PriceConfig,
    checkinTimes: number[]
): DashboardAnalytics => {
    const alerts: string[] = [];
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // NPC expiration alerts
    houses.forEach(house => {
        house.slots.forEach(slot => {
            if (slot.npc.type && slot.npc.expiration) {
                const expirationDate = new Date(slot.npc.expiration);
                if (expirationDate > now && expirationDate <= twentyFourHoursFromNow) {
                    alerts.push(`NPC '${slot.npc.type}' in House #${house.id} expires soon.`);
                }
            }
        });
    });

    // Warehouse stock alerts
    warehouseItems.forEach(item => {
        if (item.currentStock < item.safetyStockLevel) {
            alerts.push(`'${item.name}' is below safety stock level.`);
        }
    });

    // Next action
    let nextFinishTime = Infinity;
    let nextServiceBlock = '';

    houses.forEach(house => {
        house.slots.forEach(slot => {
            if (slot.pet.finishTime && slot.pet.finishTime > now.getTime()) {
                if (slot.pet.finishTime < nextFinishTime) {
                    nextFinishTime = slot.pet.finishTime;
                    nextServiceBlock = house.serviceBlock;
                }
            }
        });
    });

    let nextAction = 'No upcoming actions.';
    if (nextFinishTime !== Infinity) {
        const finishDate = new Date(nextFinishTime);
        const timeString = finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        nextAction = `UP NEXT: ${nextServiceBlock} at ${timeString}`;
    }

    const theoreticalMaxWeekly = calculateProjectedProfit(houses, cycleTimes, prices, checkinTimes);
    const actualNext7Days = calculateActualWeeklyFinances(houses, prices, now.getTime());

    return { alerts, nextAction, theoreticalMaxWeekly, actualNext7Days };
};

export { calculateProjectedProfit };
