import { House, WarehouseItem, DailyBriefingTask, CycleTime, NpcType, PriceConfig, DailyBriefingData, ProjectedProfit, Division, DashboardAnalytics, VirtualHouse } from "../types";

// Calculates the THEORETICAL MAXIMUM throughput of the current layout using Sink Detection
const calculateProjectedProfit = (
    houses: House[],
    cycleTimes: CycleTime[],
    prices: PriceConfig,
    checkinTimes: number[],
    virtualHouses: VirtualHouse[]
): ProjectedProfit => {
    const checkinCount = checkinTimes.length;
    if (checkinCount === 0) {
        return { grossRevenue: 0, grossRevenueAlternativeA: 0, npcExpenses: 0, perfectionExpenses: 0, netProfit: 0, sPetsCount: 0, producedItems: [] };
    }

    const avgHoursBetweenCheckins = 24 / checkinCount;
    const avgIdleTime = avgHoursBetweenCheckins / 2;

    // 1. Identify Sinks (Terminal Nodes) in the factory graph
    // A Sink is a slot where a pet finishes and is NOT moved to another slot automatically.
    const sinks: NpcType[] = [];

    houses.forEach(h => {
        h.slots.forEach((slot, i) => {
            if (!slot.npc.type) return;

            let isSink = false;

            if (slot.npc.mode === 'LINKED') {
                // Linked: It's a sink if it's the last slot OR the next slot is empty
                if (i === 2) isSink = true;
                else if (!h.slots[i + 1].npc.type) isSink = true;
            } else if (slot.npc.mode === 'SOLO') {
                if (!slot.npc.virtualHouseId) {
                    // Solo & Unassigned: It's a sink (Harvest to Warehouse)
                    isSink = true;
                } else {
                    // Solo & Virtual: It's a sink if it's the last slot in the Virtual Chain
                    const vHouse = virtualHouses.find(vh => vh.id === slot.npc.virtualHouseId);
                    if (vHouse) {
                        const vIndex = vHouse.slots.findIndex(s => s.houseId === h.id && s.slotIndex === i);
                        if (vIndex === vHouse.slots.length - 1) isSink = true;
                    } else {
                        // Fallback if VH missing
                        isSink = true;
                    }
                }
            }

            if (isSink) {
                sinks.push(slot.npc.type);
            }
        });
    });

    // 2. Calculate Revenue based on Sinks
    // In a pipeline, throughput is determined by the Cycle Time of the Sink (the last machine),
    // NOT the sum of the whole chain.
    // Example: D(50) -> C(50) -> B(75). Pipeline outputs one B every 75 hours (plus idle time).
    
    // Map Sink NPC Type -> Produced Pet Type
    const OUTPUT_MAP: Record<string, NpcType> = {
        [NpcType.A]: NpcType.S,
        [NpcType.B]: NpcType.A,
        [NpcType.C]: NpcType.B,
        [NpcType.D]: NpcType.C,
        [NpcType.E]: NpcType.D,
        [NpcType.F]: NpcType.E, 
    };
    
    let grossRevenue = 0;
    let grossRevenueAlternativeA = 0;
    let sPetsCount = 0; 
    const producedItemsMap: Record<string, number> = {};

    sinks.forEach(sinkType => {
        const producedType = OUTPUT_MAP[sinkType] || NpcType.S;
        
        // FIX: Use the actual cycle time of the terminal NPC, not a cumulative chain time.
        const cycleDef = cycleTimes.find(c => c.npcType === sinkType);
        const cycleTime = cycleDef ? cycleDef.time : 24; // Fallback
        
        const throughputPerWeek = (24 * 7) / (cycleTime + avgIdleTime);

        const price = prices.petPrices[producedType] || 0;
        grossRevenue += throughputPerWeek * price;

        if (producedType === NpcType.S) {
            const aPrice = prices.petPrices[NpcType.A] || 0;
            grossRevenueAlternativeA += throughputPerWeek * aPrice;
            sPetsCount += throughputPerWeek;
        }

        const label = `${producedType}-Pets`;
        producedItemsMap[label] = (producedItemsMap[label] || 0) + throughputPerWeek;
    });

    // 3. Calculate Expenses (All Active Slots)
    let npcExpenses = 0;
    houses.forEach(h => h.slots.forEach(s => {
        if (s.npc.type && s.npc.duration) {
            const cost = s.npc.duration === 7 ? prices.npcCost7Day : prices.npcCost15Day;
            npcExpenses += (cost / s.npc.duration) * 7;
        }
    }));

    const hasChampionHouse = houses.some(h => h.division === Division.CHAMPION);
    const perfectionExpenses = hasChampionHouse ? (sPetsCount * (prices.petPrices[NpcType.S] || 0)) : 0; 

    const netProfit = grossRevenue - npcExpenses - perfectionExpenses;

    const producedItems = Object.entries(producedItemsMap).map(([name, count]) => ({ name, count }));

    return { grossRevenue, grossRevenueAlternativeA: grossRevenueAlternativeA || undefined, npcExpenses, perfectionExpenses, netProfit, sPetsCount, producedItems };
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
    let grossRevenueAlternativeA = 0;
    let npcExpenses = 0;
    let sPetsCount = 0;
    const producedItemsMap: Record<string, number> = {};

    houses.forEach(house => {
        house.slots.forEach(slot => {
            // 1. Calculate Revenue
            // A-NPC -> S-Pet
            // B-NPC -> A-Pet
            // Only count if it's finishing this week
            if (slot.pet.finishTime && slot.pet.finishTime > now && slot.pet.finishTime <= endOfWeek) {
                 let producedType: NpcType | null = null;
                 if (slot.npc.type === NpcType.A) producedType = NpcType.S;
                 else if (slot.npc.type === NpcType.B) producedType = NpcType.A;

                 if (producedType) {
                     const price = prices.petPrices[producedType] || 0;
                     grossRevenue += price;
                     
                     const label = `${producedType}-Pets`;
                     producedItemsMap[label] = (producedItemsMap[label] || 0) + 1;

                     if (producedType === NpcType.S) {
                         sPetsCount++;
                         grossRevenueAlternativeA += (prices.petPrices[NpcType.A] || 0);
                     }
                 }
            }

            // 2. Calculate Expenses
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
    const producedItems = Object.entries(producedItemsMap).map(([name, count]) => ({ name, count }));

    return { grossRevenue, grossRevenueAlternativeA, npcExpenses, perfectionExpenses, netProfit, sPetsCount, producedItems };
};


// RE-IMPLEMENTATION with House Batching Logic
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

    const nowTimestamp = now.getTime();
    const nextCheckinTimestamp = nextCheckin!.getTime();

    const npcRankOrder = [NpcType.F, NpcType.E, NpcType.D, NpcType.C, NpcType.B, NpcType.A];

    // Helper to create batched tasks from a list of finished slots
    const createBatchedTasks = (filterFn: (finishTime: number) => boolean): DailyBriefingTask[] => {
        const batchedTasks: DailyBriefingTask[] = [];
        
        houses.forEach(h => {
            const finishedSlotsInHouse = h.slots
                .map((s, i) => ({ ...s, slotIndex: i }))
                .filter(s => s.pet.finishTime && filterFn(s.pet.finishTime));
            
            if (finishedSlotsInHouse.length > 0) {
                // Create a batch for this house
                const subTasks: DailyBriefingTask['subTasks'] = [];
                const requiredItems: DailyBriefingTask['requiredWarehouseItems'] = [];
                let maxFinishTime = 0;

                finishedSlotsInHouse.forEach(slot => {
                    const currentNpcType = slot.npc.type!;
                    const mode = slot.npc.mode || 'LINKED';
                    const currentRankIndex = npcRankOrder.indexOf(currentNpcType);
                    const nextRank = npcRankOrder[currentRankIndex + 1] || NpcType.S;
                    
                    if (slot.pet.finishTime! > maxFinishTime) maxFinishTime = slot.pet.finishTime!;

                    // Requirement Check (F-Stock)
                    if (currentNpcType === NpcType.F) {
                        const existingReq = requiredItems.find(i => i.itemId === 'f-pet-stock');
                        if (existingReq) existingReq.count++;
                        else requiredItems.push({ itemId: 'f-pet-stock', count: 1 });
                    }

                    // SubTask Logic
                    let actionType: DailyBriefingTask['subTasks'][0]['actionType'] = 'HARVEST_AND_RESTART';
                    let targetHouseId: number | undefined;
                    let targetSlotIndex: number | undefined;
                    let virtualHouseName: string | undefined;

                    // 1. Solo/Flexible/Broken
                    if (mode === 'SOLO' && !slot.npc.virtualHouseId) {
                        actionType = 'HARVEST_AND_STORE';
                    }
                    // 2. Virtual House
                    else if (mode === 'SOLO' && slot.npc.virtualHouseId) {
                        const vHouse = virtualHouses.find(vh => vh.id === slot.npc.virtualHouseId);
                        if (vHouse) {
                            virtualHouseName = vHouse.name;
                            const currentVIndex = vHouse.slots.findIndex(s => s.houseId === h.id && s.slotIndex === slot.slotIndex);
                             if (currentVIndex !== -1 && currentVIndex < vHouse.slots.length - 1) {
                                const nextVSlot = vHouse.slots[currentVIndex + 1];
                                targetHouseId = nextVSlot.houseId;
                                targetSlotIndex = nextVSlot.slotIndex;
                                // Note: If moving to SAME house, it stays HARVEST_AND_RESTART logic implicitly by UI, 
                                // but structure handles cross-house.
                             } else {
                                 actionType = 'COLLECT_S'; // Last link in chain
                             }
                        } else {
                            actionType = 'HARVEST_AND_STORE'; // Fallback
                        }
                    }
                    // 3. Linked (Physical)
                    else {
                        if (currentRankIndex === npcRankOrder.length - 1) {
                             actionType = 'COLLECT_S';
                        } else {
                            const targetSlotIdx = h.slots.findIndex(s => s.npc.type === nextRank);
                            if (targetSlotIdx !== -1) {
                                targetHouseId = h.id;
                                targetSlotIndex = targetSlotIdx;
                            } else {
                                actionType = 'HARVEST_AND_STORE'; // Broken link
                            }
                        }
                    }

                    subTasks.push({
                        slotIndex: slot.slotIndex,
                        currentNpcType,
                        nextNpcType: nextRank,
                        actionType,
                        targetHouseId,
                        targetSlotIndex,
                        virtualHouseName
                    });
                });

                subTasks.sort((a, b) => a.slotIndex - b.slotIndex);

                batchedTasks.push({
                    id: `batch-${h.id}-${maxFinishTime}`,
                    houseId: h.id,
                    serviceBlock: h.serviceBlock,
                    taskLabel: `Service House #${h.id}`,
                    estFinishTime: new Date(maxFinishTime).toLocaleString([], { hour: '2-digit', minute: '2-digit' }),
                    subTasks,
                    requiredWarehouseItems: requiredItems
                });
            }
        });

        return batchedTasks;
    };

    const dueTasks = createBatchedTasks((t) => t <= nowTimestamp);
    const upcomingTasks = createBatchedTasks((t) => t > nowTimestamp && t < nextCheckinTimestamp);

    dueTasks.sort((a, b) => a.serviceBlock.localeCompare(b.serviceBlock));

    return { dueTasks, upcomingTasks, nextCheckin };
};


export const generateDashboardAnalytics = (
    houses: House[], 
    warehouseItems: WarehouseItem[],
    cycleTimes: CycleTime[],
    prices: PriceConfig,
    checkinTimes: number[],
    virtualHouses: VirtualHouse[]
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

    const theoreticalMaxWeekly = calculateProjectedProfit(houses, cycleTimes, prices, checkinTimes, virtualHouses);
    const actualNext7Days = calculateActualWeeklyFinances(houses, prices, now.getTime());

    return { alerts, nextAction, theoreticalMaxWeekly, actualNext7Days };
};

export { calculateProjectedProfit };