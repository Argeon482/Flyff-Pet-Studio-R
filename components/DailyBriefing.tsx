import React, { useState, useEffect, useCallback } from 'react';
import { House, DailyBriefingTask, CycleTime, WarehouseItem, NpcType } from '../types';
import { generateDailyBriefing } from '../services/geminiService';

interface DailyBriefingProps {
  houses: House[];
  cycleTimes: CycleTime[];
  warehouseItems: WarehouseItem[];
  setHouses: React.Dispatch<React.SetStateAction<House[]>>;
  setWarehouseItems: React.Dispatch<React.SetStateAction<WarehouseItem[]>>;
  onUpdateCollectedPets: (petType: NpcType, quantity: number) => void;
  checkinTimes: number[];
  simulatedTime: number | null;
}

const TaskTable: React.FC<{
    tasks: DailyBriefingTask[];
    title: string;
    isInteractive: boolean;
    onTaskComplete?: (task: DailyBriefingTask) => void;
    completedTasks?: Set<string>;
    activeTaskKey?: string | null;
}> = ({ tasks, title, isInteractive, onTaskComplete, completedTasks, activeTaskKey }) => {
    
    if (tasks.length === 0) {
        return (
             <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-200 border-b-2 border-gray-700 pb-2 mb-4">{title}</h3>
                <div className="text-center p-8 text-gray-400">No tasks in this category.</div>
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
                                    {isInteractive && <th scope="col" className="px-6 py-3"></th>}
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">House #</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Current Pet</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Task</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Finished At</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {groupedTasks[block].map((task) => {
                                const taskKey = `${task.houseId}-${task.slotIndex}`;
                                const isCompleted = completedTasks?.has(taskKey);
                                const isActive = isInteractive && !isCompleted && taskKey === activeTaskKey;
                                const isPending = isInteractive && !isCompleted && !isActive;

                                return (
                                    <tr key={taskKey} className={`transition-colors 
                                        ${isCompleted ? 'bg-gray-700 opacity-50' : 
                                          isPending ? 'opacity-60' : 
                                          isActive ? 'bg-cyan-900/50' : 'hover:bg-gray-700/50'}`}>
                                        {isInteractive && (
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className={`h-4 w-4 rounded bg-gray-900 border-gray-600 text-cyan-600 focus:ring-cyan-500 ${isPending ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                    checked={isCompleted}
                                                    disabled={isCompleted || isPending}
                                                    onChange={() => onTaskComplete?.(task)}
                                                    title={isPending ? "Complete higher-priority tasks first" : ""}
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{task.houseId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{task.currentPet}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400 font-semibold">{task.task}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{task.estFinishTime}</td>
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


const DailyBriefing: React.FC<DailyBriefingProps> = ({ houses, cycleTimes, warehouseItems, setHouses, setWarehouseItems, onUpdateCollectedPets, checkinTimes, simulatedTime }) => {
  const [dueTasks, setDueTasks] = useState<DailyBriefingTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<DailyBriefingTask[]>([]);
  const [nextCheckin, setNextCheckin] = useState<Date | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const calculateBriefing = useCallback(() => {
    const { dueTasks, upcomingTasks, nextCheckin } = generateDailyBriefing(houses, cycleTimes, checkinTimes, simulatedTime || undefined);
    setDueTasks(dueTasks);
    setUpcomingTasks(upcomingTasks);
    setNextCheckin(nextCheckin);
     // When briefing recalculates (e.g., due to time travel), clear completed tasks for the new set.
    setCompletedTasks(new Set());
  }, [houses, cycleTimes, checkinTimes, simulatedTime]);

  useEffect(() => {
    calculateBriefing();
  }, [calculateBriefing]);

  const refreshBriefing = () => {
    calculateBriefing();
  };

  const handleTaskComplete = (task: DailyBriefingTask) => {
    const taskKey = `${task.houseId}-${task.slotIndex}`;
    if (completedTasks.has(taskKey)) return;

    let newHouses = JSON.parse(JSON.stringify(houses));
    let newWarehouseItems = JSON.parse(JSON.stringify(warehouseItems));
    const now = simulatedTime || Date.now();

    const sourceHouse = newHouses.find((h: House) => h.id === task.houseId);
    if (!sourceHouse) return;
    
    const sourceSlot = sourceHouse.slots[task.slotIndex];
    const currentNpcType = sourceSlot.npc.type;
    const outputPetType = task.nextNpcType; // The rank of the pet that has been PRODUCED.
    
    if (!currentNpcType || !outputPetType) return;
    
    // Step 1: Handle the output pet (the one that just finished)
    if (outputPetType === NpcType.S) {
        // This is a final collection task for an S-Pet
        onUpdateCollectedPets(NpcType.S, 1);
    } else {
        // This is a swap task. Find the next available slot for the output pet.
        let nextSlotLocation: { houseId: number; slotIndex: number } | null = null;
        for (const house of newHouses) {
            for (let i = 0; i < house.slots.length; i++) {
                // Find a slot with the correct NPC type that is currently empty
                if (house.slots[i].npc.type === outputPetType && !house.slots[i].pet.name) {
                    nextSlotLocation = { houseId: house.id, slotIndex: i };
                    break;
                }
            }
            if (nextSlotLocation) break;
        }

        if (nextSlotLocation) {
            // Found a free slot, so start the pet there
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
                 // Set expiration on first use
                if (!targetSlot.npc.expiration && targetSlot.npc.duration) {
                    const expirationDate = new Date(now);
                    expirationDate.setDate(expirationDate.getDate() + targetSlot.npc.duration);
                    targetSlot.npc.expiration = expirationDate.toISOString();
                }
            }
        } else {
            // No free slot, move the finished pet to WIP inventory
            const wipMap: { [key in NpcType]?: string } = {
                [NpcType.E]: 'e-pet-wip', [NpcType.D]: 'd-pet-wip',
                [NpcType.C]: 'c-pet-wip', [NpcType.B]: 'b-pet-wip',
                [NpcType.A]: 'a-pet-wip',
            };
            const wipItemId = wipMap[outputPetType];
            const wipItem = newWarehouseItems.find((item: WarehouseItem) => item.id === wipItemId);
            if (wipItem) {
                wipItem.currentStock += 1;
            }
        }
    }

    // --- Step 2: Clear the source pet slot ---
    sourceSlot.pet = { name: null, startTime: null, finishTime: null };

    // --- Step 3: Attempt to auto-restock the now-empty source slot ---
    const inputMap: { [key in NpcType]?: string } = {
        [NpcType.F]: 'f-pet-stock', [NpcType.E]: 'e-pet-wip',
        [NpcType.D]: 'd-pet-wip', [NpcType.C]: 'c-pet-wip',
        [NpcType.B]: 'b-pet-wip', [NpcType.A]: 'a-pet-wip',
    };
    const inputItemId = inputMap[currentNpcType];
    const inputItem = newWarehouseItems.find((item: WarehouseItem) => item.id === inputItemId);

    if (inputItem && inputItem.currentStock > 0) {
        inputItem.currentStock -= 1;
        const cycle = cycleTimes.find(c => c.npcType === currentNpcType);
        if (cycle) {
            const startTime = now;
            sourceSlot.pet = {
                name: `${currentNpcType}-Pet`,
                startTime,
                finishTime: startTime + cycle.time * 3600000
            };
            // Set expiration on first use
            if (!sourceSlot.npc.expiration && sourceSlot.npc.duration) {
                const expirationDate = new Date(now);
                expirationDate.setDate(expirationDate.getDate() + sourceSlot.npc.duration);
                sourceSlot.npc.expiration = expirationDate.toISOString();
            }
        }
    }

    // --- Step 4: Commit all state changes and update UI ---
    setHouses(newHouses);
    setWarehouseItems(newWarehouseItems);
    setCompletedTasks(prev => new Set(prev).add(taskKey));
  };

  const activeTaskIndex = dueTasks.findIndex(task => !completedTasks.has(`${task.houseId}-${task.slotIndex}`));
  const activeTaskKey = activeTaskIndex !== -1 ? `${dueTasks[activeTaskIndex].houseId}-${dueTasks[activeTaskIndex].slotIndex}` : null;


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
          onTaskComplete={handleTaskComplete}
          completedTasks={completedTasks}
          activeTaskKey={activeTaskKey}
      />

      <TaskTable
          title={`Upcoming for Next Check-in (${nextCheckin ? nextCheckin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '...'})`}
          tasks={upcomingTasks}
          isInteractive={false}
      />
    </div>
  );
};

export default DailyBriefing;