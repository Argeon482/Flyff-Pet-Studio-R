
import { House, WarehouseItem, DailyBriefingTask, CycleTime, NpcType, PriceConfig, DailyBriefingData, ProjectedProfit, Division, DashboardAnalytics, VirtualHouse } from "../types";

// Calculates the THEORETICAL MAXIMUM throughput and ACTUAL UTILIZATION-BASED EXPENSES
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
    const avgIdleTime = avgHoursBetweenCheckins / 2; // Conservative estimate of idle time per cycle

    // --- GRAPH CONSTRUCTION ---
    // We need to group slots into "Production Chains" to determine the bottleneck of each chain.
    // The bottleneck determines the throughput of the whole chain.
    // Upstream slots only need to run fast enough to feed the bottleneck (Utilization < 100%).

    type NodeId = string; // "${houseId}-${slotIndex}"
    const getNodeId = (hId: number, sIdx: number) => `${hId}-${sIdx}`;
    
    interface GraphNode {
        id: NodeId;
        houseId: number;
        slotIndex: number;
        npcType: NpcType;
        cycleTime: number;
        duration: number; // 7 or 15
        nextNodes: NodeId[];
    }

    const nodes: Map<NodeId, GraphNode> = new Map();
    const allNodeIds: Set<NodeId> = new Set();

    // 1. Build Nodes and Edges
    houses.forEach(h => {
        h.slots.forEach((slot, i) => {
            if (!slot.npc.type || !slot.npc.duration) return;

            const id = getNodeId(h.id, i);
            allNodeIds.add(id);
            
            const cycleDef = cycleTimes.find(c => c.npcType === slot.npc.type);
            const cycleTime = cycleDef ? cycleDef.time : 24;

            const node: GraphNode = {
                id,
                houseId: h.id,
                slotIndex: i,
                npcType: slot.npc.type,
                cycleTime,
                duration: slot.npc.duration,
                nextNodes: []
            };

            // Determine connection
            if (slot.npc.mode === 'LINKED') {
                // Connect to next slot in same house if it exists and has an NPC
                if (i < h.slots.length - 1 && h.slots[i+1].npc.type) {
                    node.nextNodes.push(getNodeId(h.id, i + 1));
                }
            } else if (slot.npc.mode === 'SOLO' && slot.npc.virtualHouseId) {
                // Connect to next slot in Virtual House
                const vHouse = virtualHouses.find(vh => vh.id === slot.npc.virtualHouseId);
                if (vHouse) {
                    const vIndex = vHouse.slots.findIndex(s => s.houseId === h.id && s.slotIndex === i);
                    if (vIndex !== -1 && vIndex < vHouse.slots.length - 1) {
                        const nextS = vHouse.slots[vIndex + 1];
                        const nextHouse = houses.find(hx => hx.id === nextS.houseId);
                        // Only connect if next slot actually has an NPC setup
                        if (nextHouse?.slots[nextS.slotIndex].npc.type) {
                            node.nextNodes.push(getNodeId(nextS.houseId, nextS.slotIndex));
                        }
                    }
                }
            }

            nodes.set(id, node);
        });
    });

    // 2. Find Connected Components (Chains)
    const visited = new Set<NodeId>();
    const chains: GraphNode[][] = [];

    for (const nodeId of allNodeIds) {
        if (!visited.has(nodeId)) {
            const chain: GraphNode[] = [];
            const queue = [nodeId];
            visited.add(nodeId);
            // Note: This basic iteration catches nodes. A full traversal is needed for perfect graph theory,
            // but our node map + Union Find below is the robust way.
        }
    }

    // Implementation of Union-Find for grouping
    const parent = new Map<NodeId, NodeId>();
    for (const id of allNodeIds) parent.set(id, id);
    
    const find = (i: NodeId): NodeId => {
        if (parent.get(i) === i) return i;
        const root = find(parent.get(i)!);
        parent.set(i, root);
        return root;
    };
    
    const union = (i: NodeId, j: NodeId) => {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) parent.set(rootI, rootJ);
    };

    nodes.forEach(node => {
        node.nextNodes.forEach(nextId => {
            if (nodes.has(nextId)) union(node.id, nextId);
        });
    });

    // Group nodes by root
    const groupedChains: Map<NodeId, GraphNode[]> = new Map();
    nodes.forEach(node => {
        const root = find(node.id);
        if (!groupedChains.has(root)) groupedChains.set(root, []);
        groupedChains.get(root)!.push(node);
    });

    // 3. Calculate Metrics for each Chain
    
    const OUTPUT_MAP: Record<string, NpcType> = {
        [NpcType.A]: NpcType.S, [NpcType.B]: NpcType.A, [NpcType.C]: NpcType.B,
        [NpcType.D]: NpcType.C, [NpcType.E]: NpcType.D, [NpcType.F]: NpcType.E, 
    };

    let grossRevenue = 0;
    let grossRevenueAlternativeA = 0;
    let npcExpenses = 0;
    let sPetsCount = 0;
    const producedItemsMap: Record<string, number> = {};

    groupedChains.forEach(chainNodes => {
        // A. Find Bottleneck (Slowest Cycle Time in the chain)
        // The chain can only move as fast as its slowest link.
        // We incorporate user check-in intervals into the effective cycle time of the bottleneck.
        let maxRawCycleTime = 0;
        chainNodes.forEach(n => {
            if (n.cycleTime > maxRawCycleTime) maxRawCycleTime = n.cycleTime;
        });
        
        // Effective Bottleneck Time includes the idle time (waiting for player)
        const bottleneckEffectiveTime = maxRawCycleTime + avgIdleTime;

        // B. Throughput (Items per week)
        const throughput = (24 * 7) / bottleneckEffectiveTime;

        // C. Identify Sinks (Revenue Generators)
        // A node is a sink if it has no outgoing connections within the chain
        chainNodes.forEach(node => {
            if (node.nextNodes.length === 0) {
                // This is a terminal node for this chain. Calculate Revenue.
                const producedType = OUTPUT_MAP[node.npcType] || NpcType.S;
                const price = prices.petPrices[producedType] || 0;
                
                grossRevenue += throughput * price;

                const label = `${producedType}-Pets`;
                producedItemsMap[label] = (producedItemsMap[label] || 0) + throughput;

                if (producedType === NpcType.S) {
                    const aPrice = prices.petPrices[NpcType.A] || 0;
                    grossRevenueAlternativeA += throughput * aPrice;
                    sPetsCount += throughput;
                }
            }
        });

        // D. Calculate Expenses based on Utilization
        // Utilization = Node Cycle Time / Bottleneck Cycle Time
        // If Node takes 10h and Bottleneck takes 50h, Node is utilized 20% (0.2).
        // It is "Paused" the rest of the time.
        chainNodes.forEach(node => {
            const utilization = Math.min(1, node.cycleTime / maxRawCycleTime);
            const baseWeeklyCost = (node.duration === 7 ? prices.npcCost7Day : prices.npcCost15Day) * (7 / node.duration);
            npcExpenses += baseWeeklyCost * utilization;
        });
    });

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
            // Ignore PAUSED NPCs (those without an expiration date)
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


// RE-IMPLEMENTATION with House Batching Logic and Chain of Custody
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
    const inputMap: Record<string, string> = {
        [NpcType.F]: 'f-pet-stock',
        [NpcType.E]: 'e-pet-wip', 
        [NpcType.D]: 'd-pet-wip',
        [NpcType.C]: 'c-pet-wip', 
        [NpcType.B]: 'b-pet-wip',
        [NpcType.A]: 'a-pet-wip',
    };
    const inputNameMap: Record<string, string> = {
        [NpcType.F]: 'F-Stock',
        [NpcType.E]: 'E-Pet',
        [NpcType.D]: 'D-Pet',
        [NpcType.C]: 'C-Pet',
        [NpcType.B]: 'B-Pet',
        [NpcType.A]: 'A-Pet',
    };

    // Helper to create batched tasks from a list of finished slots
    const createBatchedTasks = (filterFn: (finishTime: number) => boolean): DailyBriefingTask[] => {
        const batchedTasks: DailyBriefingTask[] = [];
        
        houses.forEach(h => {
            const subTasks: DailyBriefingTask['subTasks'] = [];
            const requiredItems: DailyBriefingTask['requiredWarehouseItems'] = [];
            let maxFinishTime = 0;
            
            // 1. Check for Expired NPCs (RENEW_NPC)
            // High priority: If NPC is expired, we must renew it before any harvesting can happen
            // Note: We only check for expiration if there is a pet timer active (meaning production stopped)
            // or if it's just expired.
            // For simplicity, any expired NPC generates a renewal task.
            
            const expiredSlots = h.slots.map((s, i) => ({ ...s, slotIndex: i})).filter(s => {
                if (!s.npc.type || !s.npc.expiration) return false;
                return new Date(s.npc.expiration).getTime() <= nowTimestamp;
            });

            if (expiredSlots.length > 0) {
                 expiredSlots.forEach(slot => {
                     subTasks.push({
                         slotIndex: slot.slotIndex,
                         currentNpcType: slot.npc.type!,
                         nextNpcType: slot.npc.type!, // Renewing same type
                         actionType: 'RENEW_NPC',
                     });
                 });
                 // Renewal tasks happen "NOW"
                 if (nowTimestamp > maxFinishTime) maxFinishTime = nowTimestamp;
            }
            
            // 2. Check for Finished Pets (Harvest)
            const finishedSlotsInHouse = h.slots
                .map((s, i) => ({ ...s, slotIndex: i }))
                .filter(s => s.pet.finishTime && filterFn(s.pet.finishTime));

            if (finishedSlotsInHouse.length > 0 || expiredSlots.length > 0) {
                const activeSlots = h.slots.filter(s => s.npc.type !== null);
                // If we have expired slots, we treat this as "Ready" to ensure it gets attention
                const isFullyReady = expiredSlots.length > 0 || (activeSlots.length > 0 && activeSlots.length === finishedSlotsInHouse.length);

                finishedSlotsInHouse.forEach(slot => {
                    // Skip if this slot is already covered by a renewal task (rare edge case)
                    if (subTasks.some(st => st.slotIndex === slot.slotIndex && st.actionType === 'RENEW_NPC')) return;

                    const currentNpcType = slot.npc.type!;
                    const mode = slot.npc.mode || 'LINKED';
                    const currentRankIndex = npcRankOrder.indexOf(currentNpcType);
                    const nextRank = npcRankOrder[currentRankIndex + 1] || NpcType.S;
                    
                    if (slot.pet.finishTime! > maxFinishTime) maxFinishTime = slot.pet.finishTime!;

                    // INPUT Calculation
                    if (slot.slotIndex === 0) {
                        const itemId = inputMap[currentNpcType];
                        const itemName = inputNameMap[currentNpcType];
                        if (itemId) {
                            const existingReq = requiredItems.find(i => i.itemId === itemId);
                            if (existingReq) existingReq.count++;
                            else requiredItems.push({ itemId, count: 1, name: itemName });
                        }
                    }

                    // ACTION Calculation
                    let actionType: DailyBriefingTask['subTasks'][0]['actionType'] = 'HARVEST_AND_RESTART';
                    let targetHouseId: number | undefined;
                    let targetSlotIndex: number | undefined;
                    let virtualHouseName: string | undefined;

                    let potentialTargetHouseId: number | undefined;
                    let potentialTargetSlotIndex: number | undefined;

                    if (mode === 'SOLO') {
                        if (slot.npc.virtualHouseId) {
                            const vHouse = virtualHouses.find(vh => vh.id === slot.npc.virtualHouseId);
                            if (vHouse) {
                                virtualHouseName = vHouse.name;
                                const currentVIndex = vHouse.slots.findIndex(s => s.houseId === h.id && s.slotIndex === slot.slotIndex);
                                if (currentVIndex !== -1 && currentVIndex < vHouse.slots.length - 1) {
                                    const nextVSlot = vHouse.slots[currentVIndex + 1];
                                    potentialTargetHouseId = nextVSlot.houseId;
                                    potentialTargetSlotIndex = nextVSlot.slotIndex;
                                }
                            }
                        }
                    } else {
                        // LINKED
                        if (currentRankIndex < npcRankOrder.length - 1) {
                            const targetSlotIdx = h.slots.findIndex(s => s.npc.type === nextRank);
                            if (targetSlotIdx !== -1) {
                                potentialTargetHouseId = h.id;
                                potentialTargetSlotIndex = targetSlotIdx;
                            }
                        }
                    }

                    // TRAFFIC CONTROL
                    if (potentialTargetHouseId !== undefined && potentialTargetSlotIndex !== undefined) {
                        const targetHouse = houses.find(house => house.id === potentialTargetHouseId);
                        const targetSlot = targetHouse?.slots[potentialTargetSlotIndex];
                        
                        if (targetSlot) {
                            const isTargetOccupied = !!targetSlot.pet.startTime;
                            
                            let isTargetBeingCleared = false;
                            if (potentialTargetHouseId === h.id) {
                                isTargetBeingCleared = finishedSlotsInHouse.some(s => s.slotIndex === potentialTargetSlotIndex);
                            }

                            if (isTargetOccupied && !isTargetBeingCleared) {
                                actionType = 'HARVEST_UPGRADE_AND_STORE';
                            } else {
                                targetHouseId = potentialTargetHouseId;
                                targetSlotIndex = potentialTargetSlotIndex;
                            }
                        } else {
                             actionType = 'HARVEST_UPGRADE_AND_STORE';
                        }
                    } else {
                        if (currentRankIndex === npcRankOrder.length - 1) {
                             actionType = 'COLLECT_S';
                        } else {
                             actionType = 'HARVEST_UPGRADE_AND_STORE';
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

                // Only push if we have tasks
                if (subTasks.length > 0) {
                    batchedTasks.push({
                        id: `batch-${h.id}-${maxFinishTime}-${subTasks.length}`,
                        houseId: h.id,
                        serviceBlock: h.serviceBlock,
                        taskLabel: expiredSlots.length > 0 ? `Renewals & Service House #${h.id}` : `Service House #${h.id}`,
                        estFinishTime: new Date(maxFinishTime).toLocaleString([], { hour: '2-digit', minute: '2-digit' }),
                        subTasks,
                        requiredWarehouseItems: requiredItems,
                        isFullyReady,
                    });
                }
            }
        });

        return batchedTasks;
    };

    const sortTasks = (tasks: DailyBriefingTask[]) => {
        return tasks.sort((a, b) => {
            if (a.isFullyReady && !b.isFullyReady) return -1;
            if (!a.isFullyReady && b.isFullyReady) return 1;
            const houseA = houses.find(h => h.id === a.houseId);
            const houseB = houses.find(h => h.id === b.houseId);
            const isNurseryA = houseA?.division === Division.NURSERY;
            const isNurseryB = houseB?.division === Division.NURSERY;
            if (isNurseryA && !isNurseryB) return -1;
            if (!isNurseryA && isNurseryB) return 1;
            return a.houseId - b.houseId;
        });
    };

    const dueTasks = sortTasks(createBatchedTasks((t) => t <= nowTimestamp));
    const upcomingTasks = sortTasks(createBatchedTasks((t) => t > nowTimestamp && t < nextCheckinTimestamp));

    return { dueTasks, upcomingTasks, nextCheckin };
};


export const generateDashboardAnalytics = (
    houses: House[], 
    warehouseItems: WarehouseItem[],
    cycleTimes: CycleTime[],
    prices: PriceConfig,
    checkinTimes: number[],
    virtualHouses: VirtualHouse[],
    currentTime?: number
): DashboardAnalytics => {
    const alerts: string[] = [];
    const now = currentTime ? new Date(currentTime) : new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    houses.forEach(house => {
        house.slots.forEach(slot => {
            if (slot.npc.type && slot.npc.expiration) {
                const expirationDate = new Date(slot.npc.expiration);
                if (expirationDate.getTime() <= now.getTime()) {
                     alerts.push(`CRITICAL: NPC '${slot.npc.type}' in House #${house.id} is EXPIRED.`);
                } else if (expirationDate <= twentyFourHoursFromNow) {
                    alerts.push(`NPC '${slot.npc.type}' in House #${house.id} expires soon.`);
                }
            }
        });
    });

    warehouseItems.forEach(item => {
        if (item.currentStock < item.safetyStockLevel) {
            alerts.push(`'${item.name}' is below safety stock level.`);
        }
    });

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