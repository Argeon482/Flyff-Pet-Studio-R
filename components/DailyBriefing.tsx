
import React, { useState, useEffect, useCallback } from 'react';
import { House, DailyBriefingTask, CycleTime, WarehouseItem, NpcType, CompletedTaskLog, VirtualHouse } from '../types';
import { generateDailyBriefing } from '../services/geminiService';
import ConfirmationModal from './ConfirmationModal';
import { TamerIcon, HarvestIcon, WarehouseIcon, ChampionIcon, VirtualIcon, LinkedIcon } from './icons/Icons';

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
    // Count types
    const counts: Partial<Record<NpcType, number>> = {};
    // Defensive coding: Ensure subTasks exists
    (task.subTasks || []).forEach(st => {
        counts[st.currentNpcType] = (counts[st.currentNpcType] || 0) + 1;
    });

    const stockReq = task.requiredWarehouseItems?.find(i => i.itemId === 'f-pet-stock');
    const currentStock = warehouseItems.find(i => i.id === 'f-pet-stock')?.currentStock || 0;
    const hasStock = !stockReq || currentStock >= stockReq.count;

    return (
        <div className="flex flex-wrap gap-2 items-center text-xs md:text-sm">
            {/* Input Req */}
            {stockReq && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded border ${hasStock ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-red-900/50 border-red-500 text-red-200'}`}>
                    <WarehouseIcon />
                    <span>{stockReq.count}x Stock</span>
                </div>
            )}
            
            <span className="text-gray-500">Harvest:</span>
            {Object.entries(counts).map(([type, count]) => (
                 <div key={type} className="flex items-center gap-1">
                    <span className="font-bold">{count}x</span>
                    <PetBadge type={type as NpcType} />
                </div>
            ))}
        </div>
    );
};

const OptimizedWorkflowGuide: React.FC<{ task: DailyBriefingTask, warehouseItems: WarehouseItem[] }> = ({ task, warehouseItems }) => {
    const subTasks = task.subTasks || [];
    const stockReq = task.requiredWarehouseItems?.find(i => i.itemId === 'f-pet-stock');
    const currentStock = warehouseItems.find(i => i.id === 'f-pet-stock')?.currentStock || 0;
    const hasStock = !stockReq || currentStock >= stockReq.count;

    const harvestList = subTasks.map(st => st.currentNpcType).join(', ');
    const upgradeList = subTasks.filter(st => st.actionType === 'HARVEST_AND_RESTART' || (st.actionType as any) === 'COLLECT_S' && st.nextNpcType === NpcType.S).map(st => `${st.currentNpcType}→${st.nextNpcType}`).join(', ');
    
    // Group placements by location
    const placements: string[] = [];
    // 1. Place items back in current house (from F-Stock or upgraded pets)
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
    const deposits = subTasks.filter(st => st.actionType === 'HARVEST_AND_STORE');
    
    return (
        <div className="space-y-5 text-sm text-gray-200">
             {/* Step 1: Warehouse Prep */}
             {stockReq && (
                <div className={`p-3 rounded border ${hasStock ? 'bg-gray-800 border-gray-600' : 'bg-red-900/30 border-red-500'}`}>
                    <h5 className="font-bold text-cyan-400 mb-1 flex items-center gap-2"><WarehouseIcon /> Step 1: Warehouse Prep</h5>
                    <ul className="list-disc list-inside">
                        <li>
                            Withdraw <strong>{stockReq.count}x F-Pet Stock</strong>. 
                            <span className={`ml-2 text-xs ${hasStock ? 'text-green-400' : 'text-red-400 font-bold'}`}>
                                (Have: {currentStock})
                            </span>
                        </li>
                    </ul>
                </div>
             )}

             {/* Step 2: House Harvest */}
             <div className="p-3 rounded bg-gray-800 border border-gray-600">
                <h5 className="font-bold text-cyan-400 mb-1 flex items-center gap-2"><HarvestIcon /> Step 2: House #{task.houseId} Harvest</h5>
                <ul className="list-disc list-inside">
                    <li>Harvest <strong>ALL</strong> finished pets: {harvestList}.</li>
                    {/* Optimisation: If we harvested an F, we can place the New F immediately if we have it, 
                        BUT strict ordering says Upgrade first. However, F-Stock is raw. 
                        To keep it simple: Collect everything first. */}
                </ul>
             </div>

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
             {(placements.length > 0 || deposits.length > 0) && (
                 <div className="p-3 rounded bg-green-900/30 border border-green-600">
                    <h5 className="font-bold text-green-400 mb-1 flex items-center gap-2"><LinkedIcon /> Step 4: Finalize</h5>
                    <ul className="list-disc list-inside space-y-1">
                        {placements.map((p, i) => <li key={i}>{p}.</li>)}
                        {deposits.map((d, i) => (
                            <li key={`dep-${i}`}>Deposit <strong>{d.currentNpcType}-Pet</strong> into Warehouse.</li>
                        ))}
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
    activeTaskId?: string | null; // Changed from key to ID
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

    // Filter History by Session
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
          setUndoDetails(`Undo batch: ${task.taskLabel}\nIncludes ${(task.subTasks || []).length} operations.\nThis will reset slots to their finished state.`);
          setUndoTask(task);
      }
  };

  const executeTaskComplete = () => {
    if (!confirmTask) return;
    const task = confirmTask;
    const subTasks = task.subTasks || [];

    let newHouses = JSON.parse(JSON.stringify(houses));
    let newWarehouseItems = JSON.parse(JSON.stringify(warehouseItems));
    const now = simulatedTime || Date.now();

    const affectedSlotsSnapshot: CompletedTaskLog['affectedSlots'] = [];

    // Execute SubTasks
    subTasks.forEach(st => {
        // Snapshot for Undo
        affectedSlotsSnapshot.push({
            houseId: task.houseId,
            slotIndex: st.slotIndex,
            previousPetType: st.currentNpcType
        });

        // 1. Clear Source
        const house = newHouses.find((h: House) => h.id === task.houseId);
        const sourceSlot = house.slots[st.slotIndex];
        sourceSlot.pet = { name: null, startTime: null, finishTime: null };

        // 2. Consume Stock (if F)
        if (st.currentNpcType === NpcType.F) {
             const fStock = newWarehouseItems.find((w: WarehouseItem) => w.id === 'f-pet-stock');
             if (fStock && fStock.currentStock > 0) fStock.currentStock--;
        }

        // 3. Handle Result (Place or Store)
        if (st.actionType === 'COLLECT_S') {
             onUpdateCollectedPets(NpcType.S, 1);
        } else if (st.actionType === 'HARVEST_AND_STORE') {
             const wipMap: { [key in NpcType]?: string } = {
                [NpcType.F]: 'f-pet-stock', 
                [NpcType.E]: 'e-pet-wip', [NpcType.D]: 'd-pet-wip',
                [NpcType.C]: 'c-pet-wip', [NpcType.B]: 'b-pet-wip',
                [NpcType.A]: 'a-pet-wip',
            };
            const itemId = wipMap[st.currentNpcType]; 
            if (itemId) {
                const item = newWarehouseItems.find((w: WarehouseItem) => w.id === itemId);
                if (item) item.currentStock++;
            }
        } else if (st.actionType === 'HARVEST_AND_RESTART') {
             // This implies UPGRADE and PLACEMENT
             const targetHId = st.targetHouseId || task.houseId;
             const targetSIdx = st.targetSlotIndex !== undefined ? st.targetSlotIndex : st.slotIndex;
             
             const targetHouse = newHouses.find((h: House) => h.id === targetHId);
             const targetSlot = targetHouse.slots[targetSIdx];
             
             const cycle = cycleTimes.find(c => c.npcType === st.nextNpcType);
             if (cycle) {
                 const startTime = now;
                 targetSlot.pet = {
                    name: `${st.nextNpcType}-Pet`,
                    startTime,
                    finishTime: startTime + cycle.time * 3600000
                };
                if (!targetSlot.npc.expiration && targetSlot.npc.duration) {
                    const expirationDate = new Date(now);
                    expirationDate.setDate(expirationDate.getDate() + targetSlot.npc.duration);
                    targetSlot.npc.expiration = expirationDate.toISOString();
                }
             }
        }
    });

    // Create Log
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

      // Simplified Undo: 
      // 1. Restore Source Slots to Finished State
      // 2. Clear Target Slots / Refund Warehouse
      
      subTasks.forEach(st => {
          // Restore Source
          const sourceHouse = newHouses.find((h: House) => h.id === task.houseId);
          const sourceSlot = sourceHouse.slots[st.slotIndex];
          // Hack: Set finish time to 1 second ago
          sourceSlot.pet = {
              name: `${st.currentNpcType}-Pet`,
              startTime: Date.now() - 1000000,
              finishTime: Date.now() - 1000
          };

          // Reverse Actions
          if (st.currentNpcType === NpcType.F) {
              const fStock = newWarehouseItems.find((w: WarehouseItem) => w.id === 'f-pet-stock');
              if (fStock) fStock.currentStock++;
          }

          if (st.actionType === 'COLLECT_S') {
              onUpdateCollectedPets(NpcType.S, -1);
          } else if (st.actionType === 'HARVEST_AND_STORE') {
               // Remove from Warehouse
               const wipMap: { [key in NpcType]?: string } = {
                [NpcType.E]: 'e-pet-wip', [NpcType.D]: 'd-pet-wip',
                [NpcType.C]: 'c-pet-wip', [NpcType.B]: 'b-pet-wip',
                [NpcType.A]: 'a-pet-wip',
                };
                const itemId = wipMap[st.currentNpcType];
                if (itemId) {
                    const item = newWarehouseItems.find((w: WarehouseItem) => w.id === itemId);
                    if (item) item.currentStock--;
                }
          } else if (st.actionType === 'HARVEST_AND_RESTART') {
              // Clear Target Slot
              const targetHId = st.targetHouseId || task.houseId;
              const targetSIdx = st.targetSlotIndex !== undefined ? st.targetSlotIndex : st.slotIndex;
              const targetHouse = newHouses.find((h: House) => h.id === targetHId);
              const targetSlot = targetHouse.slots[targetSIdx];
              targetSlot.pet = { name: null, startTime: null, finishTime: null };
          }
      });

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
