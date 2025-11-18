import React, { useState, useEffect, useCallback } from 'react';
import { House, DailyBriefingTask, CycleTime, WarehouseItem, NpcType, CompletedTaskLog } from '../types';
import { generateDailyBriefing } from '../services/geminiService';
import ConfirmationModal from './ConfirmationModal';
import { TamerIcon, HarvestIcon, WarehouseIcon, ChampionIcon } from './icons/Icons';

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

const TaskFlowVisual: React.FC<{ task: DailyBriefingTask, warehouseItems: WarehouseItem[] }> = ({ task, warehouseItems }) => {
    const { currentNpcType, nextNpcType } = task;
    
    if (nextNpcType === NpcType.S) {
        return (
            <div className="flex items-center gap-2 text-yellow-400">
                <ChampionIcon />
                <span className="font-bold text-sm">COLLECTION READY</span>
            </div>
        );
    }

    const isStartNewCycle = currentNpcType === NpcType.F;
    const stockItem = warehouseItems.find(i => i.id === 'f-pet-stock');
    const stockCount = stockItem ? stockItem.currentStock : 0;

    return (
        <div className="flex items-center gap-1.5 text-xs md:text-sm">
            {isStartNewCycle ? (
                <>
                    <div className="flex flex-col items-center text-gray-400" title="Take from Warehouse">
                        <WarehouseIcon />
                        <span className={`${stockCount > 0 ? 'text-gray-400' : 'text-red-500 font-bold'}`}>
                            {stockCount}x
                        </span>
                    </div>
                    <span className="text-gray-500">→</span>
                    <div className="flex flex-col items-center">
                        <div className="bg-gray-700 p-1 rounded text-cyan-400"><HarvestIcon /></div>
                        <span>Start</span>
                    </div>
                </>
            ) : (
                <>
                   <div className="flex flex-col items-center text-gray-400">
                        <div className="bg-gray-700 p-1 rounded"><HarvestIcon /></div>
                        <span>Harvest</span>
                    </div>
                    <span className="text-gray-500">→</span>
                    <div className="flex flex-col items-center text-purple-400">
                        <TamerIcon />
                        <span>Upgrade</span>
                    </div>
                    <span className="text-gray-500">→</span>
                    <div className="flex flex-col items-center text-cyan-400">
                        <div className="border border-cyan-500 px-1 rounded">Slot</div>
                        <span>Start</span>
                    </div>
                </>
            )}
            <div className="ml-1 bg-gray-900 px-2 py-1 rounded border border-gray-700 flex items-center gap-1">
                <PetBadge type={nextNpcType!} />
                <span className="text-gray-300 font-semibold">-Pet</span>
            </div>
        </div>
    );
};

const StepByStepGuide: React.FC<{ task: DailyBriefingTask, warehouseItems: WarehouseItem[] }> = ({ task, warehouseItems }) => {
    const { currentNpcType, nextNpcType, houseId, slotIndex } = task;
    const isStartNewCycle = currentNpcType === NpcType.F;
    const isSRank = nextNpcType === NpcType.S;

    if (isSRank) {
         return (
            <div className="space-y-4">
                <div className="bg-yellow-900/30 p-3 rounded border border-yellow-700/50">
                    <h4 className="font-bold text-yellow-400 flex items-center gap-2">
                        <ChampionIcon /> MISSION: COLLECTION
                    </h4>
                </div>
                 <ol className="list-decimal list-inside space-y-3 text-sm text-gray-200">
                    <li className="pl-2">
                        Go to <span className="text-cyan-300 font-bold">House #{houseId}</span>.
                    </li>
                    <li className="pl-2">
                        Claim the finished <PetBadge type={currentNpcType} /> pet (Slot {slotIndex + 1}).
                    </li>
                    <li className="pl-2">
                        Go to Tamer NPC. Complete quest to receive <PetBadge type={NpcType.S} /> pet.
                    </li>
                    <li className="pl-2">
                        <strong>Verify:</strong> You now have the S-Pet in your inventory/warehouse.
                    </li>
                </ol>
            </div>
         )
    }

    return (
        <div className="space-y-4">
             <div className="bg-cyan-900/30 p-3 rounded border border-cyan-700/50">
                <h4 className="font-bold text-cyan-400 flex items-center gap-2">
                    {isStartNewCycle ? <WarehouseIcon /> : <TamerIcon />} 
                    MISSION: {isStartNewCycle ? 'NEW CYCLE START' : 'UPGRADE & RESTART'}
                </h4>
            </div>
            <ol className="list-decimal list-inside space-y-3 text-sm text-gray-200">
                <li className="pl-2">
                    Go to <span className="text-cyan-300 font-bold">House #{houseId}</span>.
                </li>
                <li className="pl-2">
                    Harvest the finished <PetBadge type={currentNpcType} /> pet (Slot {slotIndex + 1}).
                </li>
                {isStartNewCycle ? (
                    <li className="pl-2">
                        Open Warehouse. Retrieve <span className="font-bold text-white">1x F-Pet Stock</span>.
                    </li>
                ) : (
                    <li className="pl-2">
                        Go to Tamer NPC. Upgrade <PetBadge type={currentNpcType} /> to <PetBadge type={nextNpcType!} />.
                    </li>
                )}
                <li className="pl-2">
                    Return to House #{houseId}.
                </li>
                <li className="pl-2">
                    Place the <PetBadge type={nextNpcType!} /> pet into Slot {slotIndex + 1}.
                </li>
                 <li className="pl-2">
                    Confirm the timer has started.
                </li>
            </ol>
        </div>
    );
}

const TaskTable: React.FC<{
    tasks: DailyBriefingTask[];
    title: string;
    isInteractive: boolean;
    onTaskComplete?: (task: DailyBriefingTask) => void;
    completedTaskIds?: Set<string>;
    activeTaskKey?: string | null;
    isHistoryMode?: boolean;
    onUndo?: (task: DailyBriefingTask) => void;
    warehouseItems?: WarehouseItem[];
}> = ({ tasks, title, isInteractive, onTaskComplete, completedTaskIds, activeTaskKey, isHistoryMode, onUndo, warehouseItems = [] }) => {
    
    if (tasks.length === 0) {
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
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Current</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Task Flow</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {groupedTasks[block].map((task) => {
                                const taskKey = `${task.houseId}-${task.slotIndex}`;
                                const isCompleted = completedTaskIds?.has(taskKey);
                                const isActive = isInteractive && !isCompleted && taskKey === activeTaskKey;
                                const isPending = isInteractive && !isCompleted && !isActive;

                                return (
                                    <tr key={taskKey} className={`transition-colors 
                                        ${isCompleted ? 'bg-gray-700 opacity-50' : 
                                          isHistoryMode ? 'bg-gray-800' :
                                          isPending ? 'opacity-60' : 
                                          isActive ? 'bg-cyan-900/40' : 'hover:bg-gray-700/50'}`}>
                                        {isInteractive && (
                                            <td className="px-6 py-4">
                                                {isHistoryMode ? (
                                                     <button 
                                                        onClick={() => onUndo?.(task)}
                                                        className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded border border-gray-500"
                                                        title="Undo this task"
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-200">#{task.houseId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <PetBadge type={task.currentNpcType} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <TaskFlowVisual task={task} warehouseItems={warehouseItems} />
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
    onUpdateCollectedPets, checkinTimes, simulatedTime, completedTaskLog, setCompletedTaskLog 
}) => {
  const [dueTasks, setDueTasks] = useState<DailyBriefingTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<DailyBriefingTask[]>([]);
  const [recentHistoryTasks, setRecentHistoryTasks] = useState<DailyBriefingTask[]>([]);
  const [nextCheckin, setNextCheckin] = useState<Date | null>(null);
  
  // Modals state
  const [confirmTask, setConfirmTask] = useState<DailyBriefingTask | null>(null);
  const [undoTask, setUndoTask] = useState<DailyBriefingTask | null>(null);
  const [undoDetails, setUndoDetails] = useState<string>('');

  const calculateBriefing = useCallback(() => {
    const now = simulatedTime || Date.now();
    const { dueTasks, upcomingTasks, nextCheckin } = generateDailyBriefing(houses, cycleTimes, checkinTimes, now);
    
    setDueTasks(dueTasks);
    setUpcomingTasks(upcomingTasks);
    setNextCheckin(nextCheckin);

    // --- History Session Logic & Auto-Pruning ---
    if (checkinTimes.length > 0 && completedTaskLog.length > 0) {
        const nowDate = new Date(now);
        const sortedCheckins = [...checkinTimes].sort((a,b) => a-b);
        
        // Calculate check-in points for the last 48 hours to determine session boundaries
        const candidates: Date[] = [];
        for (let i = -2; i <= 0; i++) {
            sortedCheckins.forEach(h => {
                candidates.push(new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + i, h, 0, 0));
            });
        }
        // Sort descending (newest first)
        candidates.sort((a,b) => b.getTime() - a.getTime());
        
        // First timestamp <= now is Current Session Start
        const currentSessionStart = candidates.find(d => d.getTime() <= now);
        
        // The next one down is Previous Session Start
        let cutoffTime = 0;
        if (currentSessionStart) {
            const prevIndex = candidates.indexOf(currentSessionStart) + 1;
            if (prevIndex < candidates.length) {
                cutoffTime = candidates[prevIndex].getTime();
            }
        }

        // Filter logs: Keep only tasks completed AFTER the cutoff time
        const recentLogs = completedTaskLog.filter(log => log.timestamp > cutoffTime);

        // Pruning Logic: If we have logs older than cutoff, permanently delete them from state.
        if (recentLogs.length < completedTaskLog.length) {
            setCompletedTaskLog(recentLogs);
        }
        
        // Sort for display
        recentLogs.sort((a,b) => b.timestamp - a.timestamp);
        setRecentHistoryTasks(recentLogs.map(l => l.task));
    } else {
        setRecentHistoryTasks([]);
    }

  }, [houses, cycleTimes, checkinTimes, simulatedTime, completedTaskLog, setCompletedTaskLog]);

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
      const logEntry = completedTaskLog.find(l => 
          l.task.houseId === task.houseId && 
          l.task.slotIndex === task.slotIndex && 
          l.task.currentPet === task.currentPet // Basic matching
      );

      if (logEntry) {
          // Construct explanation string
          const parts = [];
          parts.push(`1. Restore ${logEntry.changes.sourcePetType}-Pet to House #${logEntry.changes.sourceHouseId} (Slot ${logEntry.changes.sourceSlotIndex + 1}).`);
          if (logEntry.changes.targetHouseId) {
              parts.push(`2. Remove ${logEntry.changes.targetPetType}-Pet from House #${logEntry.changes.targetHouseId} (Slot ${(logEntry.changes.targetSlotIndex || 0) + 1}).`);
          } else if (logEntry.changes.warehouseWipId) {
              parts.push(`2. Remove 1x ${logEntry.changes.targetPetType}-Pet from Warehouse WIP.`);
          }
          if (logEntry.changes.warehouseConsumedId) {
              parts.push(`3. Refund 1x ${logEntry.changes.sourcePetType}-Pet Stock to Warehouse.`);
          }
          
          setUndoDetails(parts.join('\n'));
          setUndoTask(task);
      }
  };

  const executeTaskComplete = () => {
    if (!confirmTask) return;
    const task = confirmTask;

    let newHouses = JSON.parse(JSON.stringify(houses));
    let newWarehouseItems = JSON.parse(JSON.stringify(warehouseItems));
    const now = simulatedTime || Date.now();

    const sourceHouse = newHouses.find((h: House) => h.id === task.houseId);
    if (!sourceHouse) return;
    
    const sourceSlot = sourceHouse.slots[task.slotIndex];
    const currentNpcType = sourceSlot.npc.type;
    const outputPetType = task.nextNpcType; 
    
    if (!currentNpcType || !outputPetType) return;

    // Prepare Log Entry
    const logEntry: CompletedTaskLog = {
        id: crypto.randomUUID(),
        task: task,
        timestamp: now,
        changes: {
            sourceHouseId: task.houseId,
            sourceSlotIndex: task.slotIndex,
            sourcePetType: currentNpcType
        }
    };
    
    // Step 1: Handle the output pet
    if (outputPetType === NpcType.S) {
        onUpdateCollectedPets(NpcType.S, 1);
        logEntry.changes.targetPetType = NpcType.S; 
    } else {
        let nextSlotLocation: { houseId: number; slotIndex: number } | null = null;
        for (const house of newHouses) {
            for (let i = 0; i < house.slots.length; i++) {
                if (house.slots[i].npc.type === outputPetType && !house.slots[i].pet.name) {
                    nextSlotLocation = { houseId: house.id, slotIndex: i };
                    break;
                }
            }
            if (nextSlotLocation) break;
        }

        if (nextSlotLocation) {
            const targetHouse = newHouses.find((h: House) => h.id === nextSlotLocation!.houseId);
            const targetSlot = targetHouse.slots[nextSlotLocation.slotIndex];
            const cycle = cycleTimes.find(c => c.npcType === outputPetType);
            if (cycle) {
                const startTime = now;
                targetSlot.pet = {
                    name: `${outputPetType}-Pet`,
                    startTime,
                    finishTime: startTime + cycle.time * 3600000
                };
                if (!targetSlot.npc.expiration && targetSlot.npc.duration) {
                    const expirationDate = new Date(now);
                    expirationDate.setDate(expirationDate.getDate() + targetSlot.npc.duration);
                    targetSlot.npc.expiration = expirationDate.toISOString();
                }
            }
            // Log Target Info
            logEntry.changes.targetHouseId = nextSlotLocation.houseId;
            logEntry.changes.targetSlotIndex = nextSlotLocation.slotIndex;
            logEntry.changes.targetPetType = outputPetType;

        } else {
            const wipMap: { [key in NpcType]?: string } = {
                [NpcType.E]: 'e-pet-wip', [NpcType.D]: 'd-pet-wip',
                [NpcType.C]: 'c-pet-wip', [NpcType.B]: 'b-pet-wip',
                [NpcType.A]: 'a-pet-wip',
            };
            const wipItemId = wipMap[outputPetType];
            const wipItem = newWarehouseItems.find((item: WarehouseItem) => item.id === wipItemId);
            if (wipItem) {
                wipItem.currentStock += 1;
                // Log Warehouse Info
                logEntry.changes.warehouseWipId = wipItemId;
                logEntry.changes.targetPetType = outputPetType;
            }
        }
    }

    // Step 2: Clear source
    sourceSlot.pet = { name: null, startTime: null, finishTime: null };

    // Step 3: Auto-restock
    const inputMap: { [key in NpcType]?: string } = {
        [NpcType.F]: 'f-pet-stock', [NpcType.E]: 'e-pet-wip',
        [NpcType.D]: 'd-pet-wip', [NpcType.C]: 'c-pet-wip',
        [NpcType.B]: 'b-pet-wip', [NpcType.A]: 'a-pet-wip',
    };
    const inputItemId = inputMap[currentNpcType];
    const inputItem = newWarehouseItems.find((item: WarehouseItem) => item.id === inputItemId);

    if (inputItem && inputItem.currentStock > 0) {
        inputItem.currentStock -= 1;
        logEntry.changes.warehouseConsumedId = inputItemId; // Log consumption

        const cycle = cycleTimes.find(c => c.npcType === currentNpcType);
        if (cycle) {
            const startTime = now;
            sourceSlot.pet = {
                name: `${currentNpcType}-Pet`,
                startTime,
                finishTime: startTime + cycle.time * 3600000
            };
            if (!sourceSlot.npc.expiration && sourceSlot.npc.duration) {
                const expirationDate = new Date(now);
                expirationDate.setDate(expirationDate.getDate() + sourceSlot.npc.duration);
                sourceSlot.npc.expiration = expirationDate.toISOString();
            }
        }
    }

    setHouses(newHouses);
    setWarehouseItems(newWarehouseItems);
    setCompletedTaskLog(prev => [logEntry, ...prev]);
    setConfirmTask(null);
  };

  const executeUndo = () => {
      if (!undoTask) return;
      
      const logIndex = completedTaskLog.findIndex(l => l.task.houseId === undoTask.houseId && l.task.slotIndex === undoTask.slotIndex);
      if (logIndex === -1) {
          alert("Could not find history record for this task.");
          setUndoTask(null);
          return;
      }
      const logEntry = completedTaskLog[logIndex];
      const { changes } = logEntry;

      let newHouses = JSON.parse(JSON.stringify(houses));
      let newWarehouseItems = JSON.parse(JSON.stringify(warehouseItems));
      
      // 1. Restore Source Pet
      const sourceHouse = newHouses.find((h: House) => h.id === changes.sourceHouseId);
      if (!sourceHouse) return;
      const sourceSlot = sourceHouse.slots[changes.sourceSlotIndex];

      if (changes.warehouseConsumedId) {
          const consumedItem = newWarehouseItems.find((w: WarehouseItem) => w.id === changes.warehouseConsumedId);
          if (consumedItem) consumedItem.currentStock += 1;
          sourceSlot.pet = { name: null, startTime: null, finishTime: null };
      }

      // Restore original finished pet
      sourceSlot.pet = {
          name: `${changes.sourcePetType}-Pet`,
          startTime: Date.now() - 1000000,
          finishTime: Date.now() - 1000 
      };

      // 2. Remove Target Pet
      if (changes.targetPetType === NpcType.S) {
           onUpdateCollectedPets(NpcType.S, -1);
      } else if (changes.targetHouseId !== undefined) {
          const targetHouse = newHouses.find((h: House) => h.id === changes.targetHouseId);
          if (targetHouse) {
              const targetSlot = targetHouse.slots[changes.targetSlotIndex!];
              if (targetSlot.pet.name === `${changes.targetPetType}-Pet`) {
                  targetSlot.pet = { name: null, startTime: null, finishTime: null };
              } else {
                  console.warn("Target slot contents changed. Removing anyway to enforce undo.");
                  targetSlot.pet = { name: null, startTime: null, finishTime: null };
              }
          }
      } else if (changes.warehouseWipId) {
          const wipItem = newWarehouseItems.find((w: WarehouseItem) => w.id === changes.warehouseWipId);
          if (wipItem && wipItem.currentStock > 0) {
              wipItem.currentStock -= 1;
          }
      }

      setHouses(newHouses);
      setWarehouseItems(newWarehouseItems);
      
      const newLog = [...completedTaskLog];
      newLog.splice(logIndex, 1);
      setCompletedTaskLog(newLog);
      
      setUndoTask(null);
  };

  const activeTaskKey = dueTasks.length > 0 ? `${dueTasks[0].houseId}-${dueTasks[0].slotIndex}` : null;

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
          activeTaskKey={activeTaskKey}
          warehouseItems={warehouseItems}
      />
      
      {recentHistoryTasks.length > 0 && (
          <TaskTable
              title="Recently Completed (Current & Previous Session)"
              tasks={recentHistoryTasks}
              isInteractive={true}
              isHistoryMode={true}
              onUndo={initiateUndo}
              warehouseItems={warehouseItems}
          />
      )}

      <TaskTable
          title={`Upcoming for Next Check-in (${nextCheckin ? nextCheckin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '...'})`}
          tasks={upcomingTasks}
          isInteractive={false}
          warehouseItems={warehouseItems}
      />

      <ConfirmationModal
        isOpen={!!confirmTask}
        onClose={() => setConfirmTask(null)}
        onConfirm={executeTaskComplete}
        title="Mission Checklist"
      >
         {confirmTask && (
             <StepByStepGuide task={confirmTask} warehouseItems={warehouseItems} />
         )}
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={!!undoTask}
        onClose={() => setUndoTask(null)}
        onConfirm={executeUndo}
        title="Confirm Undo"
      >
          <div className="space-y-3">
             <p className="text-red-400 font-bold">Warning: This will reverse the following actions:</p>
             <pre className="bg-gray-900 p-3 rounded text-xs text-gray-300 whitespace-pre-wrap font-mono">
                 {undoDetails}
             </pre>
             <p className="text-sm text-gray-400">
                 Ensure the target house/slot has not been manually modified since completion, or data may be inconsistent.
             </p>
          </div>
      </ConfirmationModal>
    </div>
  );
};

export default DailyBriefing;