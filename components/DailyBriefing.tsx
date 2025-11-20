
import React, { useState, useEffect, useCallback } from 'react';
import { House, DailyBriefingTask, CycleTime, WarehouseItem, NpcType, CompletedTaskLog, VirtualHouse } from '../types';
import { generateDailyBriefing } from '../services/geminiService';
import ConfirmationModal from './ConfirmationModal';
import { TamerIcon, HarvestIcon, WarehouseIcon, ChampionIcon, VirtualIcon, LinkedIcon, AlertIcon } from './icons/Icons';

interface DailyBriefingProps {
  houses: House[];
  cycleTimes: CycleTime[];
  warehouseItems: WarehouseItem[];
  setHouses: React.Dispatch<React.SetStateAction<House[]>>;
  setWarehouseItems: React.Dispatch<React.SetStateAction<WarehouseItem[]>>;
  onUpdateCollectedPets: (petType: NpcType, quantity: number) => void;
  checkinTimes: number[];
  simulatedTime: number | null;
  completedTaskLog: CompletedTaskLog[];
  setCompletedTaskLog: React.Dispatch<React.SetStateAction<CompletedTaskLog[]>>;
  virtualHouses: VirtualHouse[];
}

const PetBadge: React.FC<{ type: NpcType }> = ({ type }) => {
    const colors: Record<string, string> = {
        [NpcType.F]: 'bg-gray-600 text-white',
        [NpcType.E]: 'bg-green-700 text-white',
        [NpcType.D]: 'bg-blue-700 text-white',
        [NpcType.C]: 'bg-purple-700 text-white',
        [NpcType.B]: 'bg-red-700 text-white',
        [NpcType.A]: 'bg-yellow-700 text-white',
        [NpcType.S]: 'bg-yellow-400 text-black font-bold border border-yellow-600',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${colors[type] || 'bg-gray-600'}`}>
            {type}
        </span>
    );
};

const BatchTaskVisual: React.FC<{ task: DailyBriefingTask, warehouseItems: WarehouseItem[] }> = ({ task, warehouseItems }) => {
    const counts: Partial<Record<NpcType, number>> = {};
    let hasRenewals = false;
    (task.subTasks || []).forEach(st => {
        if (st.actionType === 'RENEW_NPC') hasRenewals = true;
        else counts[st.currentNpcType] = (counts[st.currentNpcType] || 0) + 1;
    });

    return (
        <div className="flex flex-wrap gap-2 items-center text-xs md:text-sm">
             {hasRenewals && (
                 <div className="flex items-center gap-1 px-2 py-1 rounded border bg-red-900/50 border-red-500 text-red-200 font-bold">
                     <AlertIcon />
                     <span>RENEW NPC</span>
                 </div>
             )}
             {/* Inputs */}
             {task.requiredWarehouseItems?.map(req => {
                 const item = warehouseItems.find(i => i.id === req.itemId);
                 const hasStock = (item?.currentStock || 0) >= req.count;
                 return (
                     <div key={req.itemId} className={`flex items-center gap-1 px-2 py-1 rounded border ${hasStock ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-red-900/50 border-red-500 text-red-200'}`}>
                        <WarehouseIcon />
                        <span>{req.count}x {req.name}</span>
                    </div>
                 )
             })}
            
            {Object.keys(counts).length > 0 && (
                <>
                    <span className="text-gray-500 ml-1">Harvest:</span>
                    {Object.entries(counts).map(([type, count]) => (
                        <div key={type} className="flex items-center gap-1">
                            <span className="font-bold">{count}x</span>
                            <PetBadge type={type as NpcType} />
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

const OptimizedWorkflowGuide: React.FC<{ task: DailyBriefingTask, warehouseItems: WarehouseItem[] }> = ({ task, warehouseItems }) => {
    const subTasks = task.subTasks || [];
    
    const renewals = subTasks.filter(st => st.actionType === 'RENEW_NPC');
    
    const harvestList = subTasks
        .filter(st => st.actionType !== 'RENEW_NPC')
        .map(st => st.currentNpcType)
        .join(', ');
    
    const upgradeList = subTasks
        .filter(st => st.actionType !== 'HARVEST_AND_STORE' && st.actionType !== 'RENEW_NPC' && st.actionType !== 'COLLECT_S')
        .map(st => `${st.currentNpcType}→${st.nextNpcType}`)
        .join(', ');
    
    // Group placements by location
    const placements: string[] = [];
    
    // 1. Place items back in current house (Output of Upgrade)
    const currentHousePlacements = subTasks.filter(st => 
        st.actionType === 'HARVEST_AND_RESTART' && (st.targetHouseId === task.houseId || !st.targetHouseId)
    );
    if (currentHousePlacements.length > 0) {
        placements.push(`In House #${task.houseId}: Place ${currentHousePlacements.map(p => p.nextNpcType).join(', ')}`);
    }

    // 2. Cross-House placements
    const crossHouse = subTasks.filter(st => st.targetHouseId && st.targetHouseId !== task.houseId);
    crossHouse.forEach(ch => {
        placements.push(`Go to House #${ch.targetHouseId}: Place ${ch.nextNpcType} (Slot ${(ch.targetSlotIndex || 0) + 1})`);
    });

    // 3. Warehouse deposits
    const deposits = subTasks.filter(st => st.actionType === 'HARVEST_AND_STORE' || st.actionType === 'HARVEST_UPGRADE_AND_STORE');
    
    // 4. Smart Refills & Removals
    const npcRemovals: string[] = [];
    const manualRefills: string[] = [];

    subTasks.forEach(st => {
        // Detect if the source slot becomes empty after this action
        const isSourceEmptying = 
            st.actionType === 'HARVEST_AND_STORE' || 
            st.actionType === 'COLLECT_S' || 
            st.actionType === 'HARVEST_UPGRADE_AND_STORE' ||
            (st.actionType === 'HARVEST_AND_RESTART' && (st.targetHouseId !== task.houseId || st.targetSlotIndex !== st.slotIndex));

        // Check if this slot is receiving a pet from ANOTHER subtask in this batch
        const isSlotReceivingInternalMove = subTasks.some(otherTask => 
            otherTask.actionType === 'HARVEST_AND_RESTART' &&
            (otherTask.targetHouseId === task.houseId || !otherTask.targetHouseId) &&
            otherTask.targetSlotIndex === st.slotIndex
        );

        if (isSourceEmptying && !isSlotReceivingInternalMove) {
            // Check if we have the input stock to REFILL this slot immediately
             const inputMap: Record<string, string> = {
                [NpcType.F]: 'f-pet-stock',
                [NpcType.E]: 'e-pet-wip',
                [NpcType.D]: 'd-pet-wip',
                [NpcType.C]: 'c-pet-wip',
                [NpcType.B]: 'b-pet-wip',
                [NpcType.A]: 'a-pet-wip',
            };
            const itemNameMap: Record<string, string> = {
                 [NpcType.F]: 'F-Stock', [NpcType.E]: 'E-Pet', [NpcType.D]: 'D-Pet',
                 [NpcType.C]: 'C-Pet', [NpcType.B]: 'B-Pet', [NpcType.A]: 'A-Pet',
            };
            
            const inputId = inputMap[st.currentNpcType];
            const item = warehouseItems.find(w => w.id === inputId);
            
            if (item && item.currentStock > 0) {
                manualRefills.push(`In House #${task.houseId}: Place <strong>${itemNameMap[st.currentNpcType]}</strong> into Slot ${st.slotIndex + 1}`);
            } else {
                npcRemovals.push(`Remove ${st.currentNpcType}-NPC from House #${task.houseId} to pause timer`);
            }
        }
    });
    
    return (
        <div className="space-y-5 text-sm text-gray-200">
            {renewals.length > 0 && (
                <div className="p-3 rounded bg-red-900/50 border border-red-600">
                    <h5 className="font-bold text-red-400 mb-1 flex items-center gap-2"><AlertIcon /> Step 0: RENEWALS REQUIRED</h5>
                    <ul className="list-disc list-inside">
                        {renewals.map((r, i) => (
                            <li key={i}>Renew <strong>{r.currentNpcType}-NPC</strong> in Slot {r.slotIndex + 1} (Expired).</li>
                        ))}
                    </ul>
                </div>
            )}

             {/* Step 1: Warehouse Prep */}
             {task.requiredWarehouseItems.length > 0 && (
                <div className="p-3 rounded border bg-gray-800 border-gray-600">
                    <h5 className="font-bold text-cyan-400 mb-1 flex items-center gap-2"><WarehouseIcon /> Step 1: Warehouse Prep</h5>
                    <ul className="list-disc list-inside">
                        {task.requiredWarehouseItems.map(req => {
                             const item = warehouseItems.find(i => i.id === req.itemId);
                             const current = item?.currentStock || 0;
                             const hasStock = current >= req.count;
                             return (
                                <li key={req.itemId}>
                                    Withdraw <strong>{req.count}x {req.name}</strong>. 
                                    <span className={`ml-2 text-xs ${hasStock ? 'text-green-400' : 'text-red-400 font-bold'}`}>
                                        (Have: {current})
                                    </span>
                                </li>
                             )
                        })}
                    </ul>
                </div>
             )}

             {/* Step 2: House Harvest */}
             {harvestList && (
                 <div className="p-3 rounded bg-gray-800 border border-gray-600">
                    <h5 className="font-bold text-cyan-400 mb-1 flex items-center gap-2"><HarvestIcon /> Step 2: House #{task.houseId} Harvest</h5>
                    <ul className="list-disc list-inside">
                        <li>Harvest <strong>ALL</strong> finished pets: {harvestList}.</li>
                    </ul>
                 </div>
             )}

             {/* Step 3: Upgrade Run */}
             {upgradeList && (
                 <div className="p-3 rounded bg-purple-900/30 border border-purple-600">
                    <h5 className="font-bold text-purple-400 mb-1 flex items-center gap-2"><TamerIcon /> Step 3: Tamer Upgrade Run</h5>
                    <ul className="list-disc list-inside">
                        <li>Visit Tamer. Batch upgrade: <strong>{upgradeList}</strong>.</li>
                    </ul>
                 </div>
             )}

             {/* Step 4: Placement */}
             {(manualRefills.length > 0 || placements.length > 0 || deposits.length > 0 || npcRemovals.length > 0) && (
                 <div className="p-3 rounded bg-green-900/30 border border-green-600">
                    <h5 className="font-bold text-green-400 mb-1 flex items-center gap-2"><LinkedIcon /> Step 4: Finalize Placement</h5>
                    <ul className="list-disc list-inside space-y-1">
                        {manualRefills.map((r, i) => <li key={`refill-${i}`} dangerouslySetInnerHTML={{__html: r}} />)}
                        {placements.map((p, i) => <li key={i}>{p}.</li>)}
                        {deposits.map((d, i) => {
                             const label = d.actionType === 'HARVEST_UPGRADE_AND_STORE' ? d.nextNpcType : d.currentNpcType;
                             return <li key={`dep-${i}`}>Deposit <strong>{label}-Pet</strong> into Warehouse.</li>
                        })}
                        {npcRemovals.map((rem, i) => <li key={`rem-${i}`} className="text-yellow-400">{rem}.</li>)}
                    </ul>
                 </div>
             )}
        </div>
    );
}

const TaskTable: React.FC<{
    tasks: DailyBriefingTask[];
    title: string;
    isInteractive: boolean;
    onTaskComplete?: (task: DailyBriefingTask) => void;
    completedTaskIds?: Set<string>;
    activeTaskId?: string | null; 
    isHistoryMode?: boolean;
    onUndo?: (task: DailyBriefingTask) => void;
    warehouseItems?: WarehouseItem[];
}> = ({ tasks, title, isInteractive, onTaskComplete, completedTaskIds, activeTaskId, isHistoryMode, onUndo, warehouseItems = [] }) => {
    
    if (!tasks || tasks.length === 0) {
        return (
             <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-200 border-b-2 border-gray-700 pb-2 mb-4">{title}</h3>
                <div className="text-center p-8 text-gray-400 italic">No tasks to display.</div>
            </div>
        )
    }

    const groupedTasks = tasks.reduce((acc: Record<string, DailyBriefingTask[]>, task) => {
        (acc[task.serviceBlock] = acc[task.serviceBlock] || []).push(task);
        return acc;
    }, {});

    return (
        <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-200 border-b-2 border-gray-700 pb-2 mb-4">{title}</h3>
            {Object.keys(groupedTasks).map((block) => (
                 <div key={block} className="mb-6">
                    <h4 className="text-lg font-medium text-cyan-300 mb-3">{block}</h4>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700/50">
                                <tr>
                                    {isInteractive && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>}
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">House</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Batch Details</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {groupedTasks[block].map((task) => {
                                const isCompleted = completedTaskIds?.has(task.id);
                                const isActive = isInteractive && !isCompleted && task.id === activeTaskId;
                                const isPending = isInteractive && !isCompleted && !isActive;

                                return (
                                    <tr key={task.id} className={`transition-colors 
                                        ${isCompleted ? 'bg-gray-700 opacity-50' : 
                                          isHistoryMode ? 'bg-gray-800' :
                                          isPending ? 'opacity-60' : 
                                          isActive ? 'bg-cyan-900/40' : 'hover:bg-gray-700/50'}
                                        ${!task.isFullyReady && !isCompleted && !isHistoryMode ? 'border-l-4 border-yellow-500' : ''}
                                    `}>
                                        {isInteractive && (
                                            <td className="px-6 py-4 w-16">
                                                {isHistoryMode ? (
                                                     <button 
                                                        onClick={() => onUndo?.(task)}
                                                        className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded border border-gray-500"
                                                        title="Undo this batch"
                                                     >
                                                        Undo
                                                     </button>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        className={`h-6 w-6 rounded bg-gray-900 border-gray-600 text-cyan-600 focus:ring-cyan-500 ${isPending ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                        checked={isCompleted}
                                                        disabled={isCompleted || isPending}
                                                        onChange={() => onTaskComplete?.(task)}
                                                        title={isPending ? "Complete higher-priority tasks first" : "Click to view mission checklist"}
                                                    />
                                                )}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-200">
                                            #{task.houseId}
                                            <div className="text-xs text-gray-500 font-normal">
                                                {(task.subTasks || []).length} Task{(task.subTasks || []).length > 1 ? 's' : ''}
                                            </div>
                                            {!task.isFullyReady && !isCompleted && !isHistoryMode && (
                                                <div className="text-[10px] text-yellow-400 font-bold mt-1 uppercase tracking-wider border border-yellow-600 px-1 rounded w-max">
                                                    Partial Batch
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <BatchTaskVisual task={task} warehouseItems={warehouseItems} />
                                            <div className="text-xs text-gray-500 mt-1">Est: {task.estFinishTime}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};


const DailyBriefing: React.FC<DailyBriefingProps> = ({ 
    houses, cycleTimes, warehouseItems, setHouses, setWarehouseItems, 
    onUpdateCollectedPets, checkinTimes, simulatedTime, completedTaskLog, setCompletedTaskLog, virtualHouses
}) => {
  const [dueTasks, setDueTasks] = useState<DailyBriefingTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<DailyBriefingTask[]>([]);
  const [recentHistoryTasks, setRecentHistoryTasks] = useState<DailyBriefingTask[]>([]);
  const [nextCheckin, setNextCheckin] = useState<Date | null>(null);
  
  const [confirmTask, setConfirmTask] = useState<DailyBriefingTask | null>(null);
  const [undoTask, setUndoTask] = useState<DailyBriefingTask | null>(null);
  const [undoDetails, setUndoDetails] = useState<string>('');

  const calculateBriefing = useCallback(() => {
    const now = simulatedTime || Date.now();
    const { dueTasks, upcomingTasks, nextCheckin } = generateDailyBriefing(houses, cycleTimes, checkinTimes, virtualHouses, now);
    
    setDueTasks(dueTasks);
    setUpcomingTasks(upcomingTasks);
    setNextCheckin(nextCheckin);

    if (checkinTimes.length > 0 && completedTaskLog.length > 0) {
        const nowDate = new Date(now);
        const sortedCheckins = [...checkinTimes].sort((a,b) => a-b);
        const candidates: Date[] = [];
        for (let i = -2; i <= 0; i++) {
            sortedCheckins.forEach(h => {
                candidates.push(new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + i, h, 0, 0));
            });
        }
        candidates.sort((a,b) => b.getTime() - a.getTime());
        const currentSessionStart = candidates.find(d => d.getTime() <= now);
        let cutoffTime = 0;
        if (currentSessionStart) {
            const prevIndex = candidates.indexOf(currentSessionStart) + 1;
            if (prevIndex < candidates.length) {
                cutoffTime = candidates[prevIndex].getTime();
            }
        }
        const recentLogs = completedTaskLog.filter(log => log.timestamp > cutoffTime);
        if (recentLogs.length < completedTaskLog.length) {
            setCompletedTaskLog(recentLogs);
        }
        recentLogs.sort((a,b) => b.timestamp - a.timestamp);
        setRecentHistoryTasks(recentLogs.map(l => l.task));
    } else {
        setRecentHistoryTasks([]);
    }

  }, [houses, cycleTimes, checkinTimes, simulatedTime, completedTaskLog, setCompletedTaskLog, virtualHouses]);

  useEffect(() => {
    calculateBriefing();
  }, [calculateBriefing]);

  const refreshBriefing = () => {
    calculateBriefing();
  };

  const initiateTaskCompletion = (task: DailyBriefingTask) => {
      setConfirmTask(task);
  };

  const initiateUndo = (task: DailyBriefingTask) => {
      const logEntry = completedTaskLog.find(l => l.task.id === task.id);
      if (logEntry) {
          setUndoDetails(`Undo batch: ${task.taskLabel}`);
          setUndoTask(task);
      }
  };

  // Helper to resume timer
  const handleResumeNpcTimer = (slot: any, now: number) => {
        if (slot.npc.remainingDurationMs) {
            const expDate = new Date(now + slot.npc.remainingDurationMs);
            slot.npc.expiration = expDate.toISOString();
            delete slot.npc.remainingDurationMs;
        } else if (!slot.npc.expiration && slot.npc.duration) {
            const expirationDate = new Date(now);
            expirationDate.setDate(expirationDate.getDate() + slot.npc.duration);
            slot.npc.expiration = expirationDate.toISOString();
        }
  }

  const executeTaskComplete = () => {
    if (!confirmTask) return;
    const task = confirmTask;
    const subTasks = task.subTasks || [];

    let newHouses = JSON.parse(JSON.stringify(houses));
    let newWarehouseItems = JSON.parse(JSON.stringify(warehouseItems));
    const now = simulatedTime || Date.now();

    const affectedSlotsSnapshot: CompletedTaskLog['affectedSlots'] = [];

    // 1. Consume Inputs (Step 1 of Workflow)
    task.requiredWarehouseItems.forEach(req => {
        const item = newWarehouseItems.find((w: WarehouseItem) => w.id === req.itemId);
        if (item && item.currentStock > 0) item.currentStock -= req.count;
    });

    // Snapshot state for Undo
    subTasks.forEach(st => {
        const house = newHouses.find((h: House) => h.id === task.houseId);
        const sourceSlot = house.slots[st.slotIndex];
        affectedSlotsSnapshot.push({
            houseId: task.houseId,
            slotIndex: st.slotIndex,
            previousPet: { ...sourceSlot.pet },
            previousNpc: { ...sourceSlot.npc }
        });
    });

    // -------------------------------------------------------
    // PHASE 1: HARVEST / RENEW (Processing Phase)
    // -------------------------------------------------------
    const pendingMoves: { type: NpcType, nextType: NpcType, targetHouseId?: number, targetSlotIndex?: number, action: string, sourceSlotIndex: number }[] = [];

    subTasks.forEach(st => {
        const house = newHouses.find((h: House) => h.id === task.houseId);
        const sourceSlot = house.slots[st.slotIndex];
        
        if (st.actionType === 'RENEW_NPC') {
             // Renew Logic: Extend expiration and shift pet times forward
             const durationMs = (sourceSlot.npc.duration || 15) * 24 * 3600000;
             const expirationDate = new Date(now + durationMs);
             
             const oldExpiration = sourceSlot.npc.expiration ? new Date(sourceSlot.npc.expiration).getTime() : now;
             // Calculate lost time if it was expired
             let lostTime = 0;
             if (oldExpiration < now) {
                 lostTime = now - oldExpiration;
             }

             sourceSlot.npc.expiration = expirationDate.toISOString();
             
             // Shift pet timer if active
             if (sourceSlot.pet.finishTime && lostTime > 0) {
                 sourceSlot.pet.finishTime += lostTime;
                 sourceSlot.pet.startTime += lostTime;
             }

             // Renewals don't generate moves
        } else {
            // Harvest Logic
            sourceSlot.pet = { name: null, startTime: null, finishTime: null }; 
            pendingMoves.push({
                type: st.currentNpcType,
                nextType: st.nextNpcType,
                targetHouseId: st.targetHouseId,
                targetSlotIndex: st.targetSlotIndex,
                action: st.actionType,
                sourceSlotIndex: st.slotIndex
            });
        }
    });

    // -------------------------------------------------------
    // PHASE 2: PLACEMENT & OUTPUTS
    // -------------------------------------------------------
    const getInputId = (npcType: NpcType) => {
         const inputMap: Record<string, string> = { [NpcType.F]: 'f-pet-stock', [NpcType.E]: 'e-pet-wip', [NpcType.D]: 'd-pet-wip', [NpcType.C]: 'c-pet-wip', [NpcType.B]: 'b-pet-wip', [NpcType.A]: 'a-pet-wip' };
         return inputMap[npcType];
    };
    
    const getWipId = (npcType: NpcType) => {
        const wipMap: { [key in NpcType]?: string } = {
            [NpcType.F]: 'f-pet-wip', [NpcType.E]: 'e-pet-wip', [NpcType.D]: 'd-pet-wip',
            [NpcType.C]: 'c-pet-wip', [NpcType.B]: 'b-pet-wip', [NpcType.A]: 'a-pet-wip',
        };
        return wipMap[npcType];
    }

    pendingMoves.forEach(move => {
         if (move.action === 'COLLECT_S') {
             onUpdateCollectedPets(NpcType.S, 1);
         } 
         else if (move.action === 'HARVEST_AND_STORE' || move.action === 'HARVEST_UPGRADE_AND_STORE') {
             const storeType = move.action === 'HARVEST_UPGRADE_AND_STORE' ? move.nextType : move.type;
             const itemId = getWipId(storeType);
             if (itemId) {
                const item = newWarehouseItems.find((w: WarehouseItem) => w.id === itemId);
                if (item) item.currentStock++;
             }
         } 
         else if (move.action === 'HARVEST_AND_RESTART') {
             const targetHId = move.targetHouseId || task.houseId;
             const targetSIdx = move.targetSlotIndex !== undefined ? move.targetSlotIndex : move.sourceSlotIndex;
             
             const targetHouse = newHouses.find((h: House) => h.id === targetHId);
             if (targetHouse) {
                 const targetSlot = targetHouse.slots[targetSIdx];
                 const cycle = cycleTimes.find(c => c.npcType === move.nextType);
                 if (cycle) {
                     const startTime = now;
                     targetSlot.pet = {
                        name: `${move.nextType}-Pet`,
                        startTime,
                        finishTime: startTime + cycle.time * 3600000
                    };
                    handleResumeNpcTimer(targetSlot, now);
                 }
             }
         }
    });

    // -------------------------------------------------------
    // PHASE 3: SMART REFILL (Fill empty slots)
    // -------------------------------------------------------
    subTasks.forEach(st => {
         if (st.actionType === 'RENEW_NPC') return; // Don't refill renewals

         const house = newHouses.find((h: House) => h.id === task.houseId);
         const slot = house.slots[st.slotIndex];
         
         if (!slot.pet.startTime) {
             // Check for stock
             const inputId = getInputId(st.currentNpcType);
             const stockItem = newWarehouseItems.find((w: WarehouseItem) => w.id === inputId);
             
             if (stockItem && stockItem.currentStock > 0) {
                 // REFILL
                 stockItem.currentStock--;
                 const cycle = cycleTimes.find(c => c.npcType === st.currentNpcType);
                 if (cycle) {
                     const startTime = now;
                     slot.pet = { name: `${st.currentNpcType}-Pet`, startTime, finishTime: startTime + cycle.time * 3600000 };
                     handleResumeNpcTimer(slot, now);
                 }
             } else {
                 // PAUSE NPC
                 if (slot.npc.expiration) {
                     const exp = new Date(slot.npc.expiration).getTime();
                     if (exp > now) {
                        slot.npc.remainingDurationMs = exp - now;
                        slot.npc.expiration = null;
                     }
                 }
             }
         }
    });

    const logEntry: CompletedTaskLog = {
        id: task.id,
        task: task,
        timestamp: now,
        summary: `Completed batch ${task.id}`,
        affectedSlots: affectedSlotsSnapshot
    };

    setHouses(newHouses);
    setWarehouseItems(newWarehouseItems);
    setCompletedTaskLog(prev => [logEntry, ...prev]);
    setConfirmTask(null);
  };

  const executeUndo = () => {
      if (!undoTask) return;
      const logIndex = completedTaskLog.findIndex(l => l.task.id === undoTask.id);
      if (logIndex === -1) return;

      const logEntry = completedTaskLog[logIndex];
      const task = logEntry.task;
      const subTasks = task.subTasks || [];
      let newHouses = JSON.parse(JSON.stringify(houses));
      let newWarehouseItems = JSON.parse(JSON.stringify(warehouseItems));

      // 1. Refund Inputs (Batch inputs)
      task.requiredWarehouseItems.forEach(req => {
        const item = newWarehouseItems.find((w: WarehouseItem) => w.id === req.itemId);
        if (item) item.currentStock += req.count;
      });
      
      // 2. Reverse Outputs & Refills
      subTasks.forEach(st => {
          if (st.actionType === 'RENEW_NPC') {
              // State restore is handled by snapshot below, no inventory to refund
          } else if (st.actionType === 'COLLECT_S') {
              onUpdateCollectedPets(NpcType.S, -1);
          } else if (st.actionType === 'HARVEST_AND_STORE' || st.actionType === 'HARVEST_UPGRADE_AND_STORE') {
               const storeType = st.actionType === 'HARVEST_UPGRADE_AND_STORE' ? st.nextNpcType : st.currentNpcType;
               const wipMap: { [key in NpcType]?: string } = {
                [NpcType.F]: 'f-pet-wip', 
                [NpcType.E]: 'e-pet-wip', [NpcType.D]: 'd-pet-wip',
                [NpcType.C]: 'c-pet-wip', [NpcType.B]: 'b-pet-wip',
                [NpcType.A]: 'a-pet-wip',
                };
                const itemId = wipMap[storeType];
                if (itemId) {
                    const item = newWarehouseItems.find((w: WarehouseItem) => w.id === itemId);
                    if (item) item.currentStock--;
                }
          }
          
          // Refund Smart Refills
          const house = houses.find(h => h.id === task.houseId);
          const slot = house?.slots[st.slotIndex];
          if (slot && slot.pet.startTime && Math.abs(slot.pet.startTime - logEntry.timestamp) < 5000) {
               const inputMap: Record<string, string> = { [NpcType.F]: 'f-pet-stock', [NpcType.E]: 'e-pet-wip', [NpcType.D]: 'd-pet-wip', [NpcType.C]: 'c-pet-wip', [NpcType.B]: 'b-pet-wip', [NpcType.A]: 'a-pet-wip' };
               const inputId = inputMap[st.currentNpcType];
               const item = newWarehouseItems.find((w: WarehouseItem) => w.id === inputId);
               if (item) item.currentStock++;
          }
      });

      // 3. Restore Source Slots from Snapshot
      if (logEntry.affectedSlots) {
          logEntry.affectedSlots.forEach(snap => {
              const house = newHouses.find((h: House) => h.id === snap.houseId);
              if (house) {
                  house.slots[snap.slotIndex].pet = snap.previousPet;
                  house.slots[snap.slotIndex].npc = snap.previousNpc;
              }
          });
      }

      setHouses(newHouses);
      setWarehouseItems(newWarehouseItems);
      
      const newLog = [...completedTaskLog];
      newLog.splice(logIndex, 1);
      setCompletedTaskLog(newLog);
      setUndoTask(null);
  };

  const activeTaskId = dueTasks.length > 0 ? dueTasks[0].id : null;

  const nextCheckinString = nextCheckin 
    ? nextCheckin.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) 
    : '';

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">Daily Briefing</h2>
        <button onClick={refreshBriefing} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded transition-colors">
          Refresh
        </button>
      </div>

      <TaskTable
          title="Due Now & Overdue"
          tasks={dueTasks}
          isInteractive={true}
          onTaskComplete={initiateTaskCompletion}
          activeTaskId={activeTaskId}
          warehouseItems={warehouseItems}
      />
      
      {recentHistoryTasks.length > 0 && (
          <TaskTable
              title="Recently Completed"
              tasks={recentHistoryTasks}
              isInteractive={true}
              isHistoryMode={true}
              onUndo={initiateUndo}
              warehouseItems={warehouseItems}
          />
      )}

      <TaskTable
          title={`Upcoming${nextCheckinString ? ` (Check-in: ${nextCheckinString})` : ''}`}
          tasks={upcomingTasks}
          isInteractive={false}
          warehouseItems={warehouseItems}
      />

      <ConfirmationModal
        isOpen={!!confirmTask}
        onClose={() => setConfirmTask(null)}
        onConfirm={executeTaskComplete}
        title="Optimized Mission Workflow"
      >
         {confirmTask && (
             <OptimizedWorkflowGuide task={confirmTask} warehouseItems={warehouseItems} />
         )}
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={!!undoTask}
        onClose={() => setUndoTask(null)}
        onConfirm={executeUndo}
        title="Confirm Undo"
      >
          <div className="space-y-3">
             <p className="text-red-400 font-bold">Warning: This will reverse the batch action.</p>
             <pre className="bg-gray-900 p-3 rounded text-xs text-gray-300 whitespace-pre-wrap font-mono">
                 {undoDetails}
             </pre>
          </div>
      </ConfirmationModal>
    </div>
  );
};

export default DailyBriefing;