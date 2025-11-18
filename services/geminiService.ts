
import { House, WarehouseItem, DailyBriefingTask, CycleTime, NpcType, PriceConfig, DailyBriefingData, ProjectedProfit, Division, DashboardAnalytics } from "../types";

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

    // Calculate average idle time based on the number of check-ins per 24 hours
    const numCheckins = checkinTimes.length;
    const avgHoursBetweenCheckins = 24 / numCheckins;
    // On average, a pet finishes halfway between check-ins and waits for the next one.
    const avgIdleTimeHours = avgHoursBetweenCheckins / 2;
    
    const totalEffectiveCycleTime = fullCycleTimeHours + avgIdleTimeHours;

    // How many full pipelines can one slot complete in a week?
    const pipelinesPerSlotPerWeek = (7 * 24) / totalEffectiveCycleTime;
    const sPetsCount = activeSlots.length * pipelinesPerSlotPerWeek;
    
    const grossRevenue = sPetsCount * finalPetPrice;

    // Cost of NPCs for all active slots, considering their individual durations
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
                    // Assume we re-hire for the same duration
                    const cost = slot.npc.duration === 7 ? prices.npcCost7Day : prices.npcCost15Day;
                    npcExpenses += cost;
                }
            }
        });
    });

    // Note: Perfection expenses are harder to predict "actually" without knowing user intent,
    // so we leave them as 0 for the "Cash Flow" view, or we could check the Champion house.
    // For now, let's assume 0 unless we track specific "Sacrifice" tasks.
    const perfectionExpenses = 0; 
    
    const netProfit = grossRevenue - npcExpenses - perfectionExpenses;

    return { grossRevenue, npcExpenses, perfectionExpenses, netProfit, sPetsCount };
};


export const generateDailyBriefing = (houses: House[], cycleTimes: CycleTime[], checkinTimes: number[], currentTime?: number): DailyBriefingData => {
    const now = currentTime ? new Date(currentTime) : new Date();
    
    const sortedCheckinHours = [...checkinTimes].sort((a,b) => a - b);

    // Generate today's, yesterday's, and tomorrow's check-in Date objects for robust lookup
    const allCheckinDates = [
        ...sortedCheckinHours.map(hour => new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, hour, 0, 0)),
        ...sortedCheckinHours.map(hour => new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0)),
        ...sortedCheckinHours.map(hour => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, 0, 0))
    ];

    // Find the next check-in time from now
    let nextCheckin = allCheckinDates.find(time => time.getTime() > now.getTime());
    if (!nextCheckin) {
      // Fallback in case of an empty schedule, though UI should prevent this.
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 2); // Go further out to be safe
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
            
            const house = houses.find(h => h.id === slot.houseId);

            if (currentRankIndex === npcRankOrder.length - 1) { // Final NPC is 'A'
                return {
                    houseId: slot.houseId,
                    slotIndex: slot.slotIndex,
                    currentPet: currentPetName,
                    task: `Claim Sacri S for Sale`, // Specific task name for S-Rank
                    estFinishTime: finishTime,
                    serviceBlock: slot.serviceBlock,
                    currentNpcType,
                    nextNpcType: NpcType.S, // Use S as a signal for collection
                };
            } else {
                // Check for INDEPENDENT mode logic
                const isIndependent = house?.productionMode === 'INDEPENDENT';

                if (isIndependent) {
                    return {
                         houseId: slot.houseId,
                         slotIndex: slot.slotIndex,
                         currentPet: currentPetName,
                         task: `Harvest ${currentNpcType} to Warehouse`,
                         estFinishTime: finishTime,
                         serviceBlock: slot.serviceBlock,
                         currentNpcType,
                         nextNpcType: currentNpcType, // It produces a pet of the same type as the NPC (e.g. E NPC -> E Pet)
                         forceStore: true
                    };
                }

                const nextRank = npcRankOrder[currentRankIndex + 1];
                
                // Logic to distinguish simple start vs upgrade loop
                let taskName = `Harvest ${currentNpcType} & Start ${nextRank}`;
                if (currentNpcType === NpcType.F) {
                    taskName = `Harvest F & Start E (Use Stock)`;
                }

                return {
                    houseId: slot.houseId,
                    slotIndex: slot.slotIndex,
                    currentPet: currentPetName,
                    task: taskName,
                    estFinishTime: finishTime,
                    serviceBlock: slot.serviceBlock,
                    currentNpcType,
                    nextNpcType: nextRank,
                };
            }
        }).filter((task): task is DailyBriefingTask => task !== null && !!task.currentNpcType);
    };
    
    const dueTasks = mapSlotsToTasks(dueSlots);
    const upcomingTasks = mapSlotsToTasks(upcomingSlots);

    // Sort dueTasks by NPC rank descending to prioritize end-of-line tasks
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

// Export for use in the comparison modal
export { calculateProjectedProfit };
