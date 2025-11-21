
import React, { useState, useCallback, useEffect } from 'react';
import { House, NpcType, View, WarehouseItem, PriceConfig, SaleRecord, CollectedPet, Division, AppState, HouseTemplate, NpcSlot, PetSlot, CompletedTaskLog, VirtualHouse } from './types';
import { CYCLE_TIMES, INITIAL_APP_STATE } from './constants';
import { migrateState } from './services/stateMigration';
import * as examples from './examples';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DailyBriefing from './components/DailyBriefing';
import FactoryFloor from './components/FactoryFloor';
import Warehouse from './components/Warehouse';
import PetSales from './components/PetSales';
import HelpModal from './components/HelpModal';
import ScheduleModal from './components/ScheduleModal';
import ExampleModeControls from './components/ExampleModeControls';
import SaveLoadModal from './components/SaveLoadModal';
import VirtualHouseModal from './components/VirtualHouseModal';

const calculateAndAssignServiceBlocks = (houses: House[]): House[] => {
    const groupedByDivision: Record<string, House[]> = {};
    for (const house of houses) {
        if (!groupedByDivision[house.division]) {
            groupedByDivision[house.division] = [];
        }
        groupedByDivision[house.division].push(house);
    }

    const updatedHouses: House[] = [];
    Object.keys(groupedByDivision).forEach(division => {
        const divisionHouses = groupedByDivision[division];
        if (division === Division.CHAMPION) {
            divisionHouses.forEach(h => updatedHouses.push({ ...h, serviceBlock: 'Champion' }));
            return;
        }

        const numBlocks = Math.min(3, divisionHouses.length);
        if (numBlocks === 0) return;

        divisionHouses.forEach((house, index) => {
            const blockLetter = String.fromCharCode(65 + (index % numBlocks)); 
            updatedHouses.push({ ...house, serviceBlock: `${division} Block ${blockLetter}` });
        });
    });

    return updatedHouses.sort((a, b) => a.id - b.id);
};


const LOCAL_STORAGE_KEY = 'flyff-pet-studio-state';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedStateJSON) {
        const loadedState = JSON.parse(savedStateJSON);
        return migrateState(loadedState);
      }
    } catch (error) {
      console.error("Failed to load or parse state from localStorage:", error);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    return JSON.parse(JSON.stringify(INITIAL_APP_STATE));
  });

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isSaveLoadModalOpen, setIsSaveLoadModalOpen] = useState(false);
  const [isVirtualHouseModalOpen, setIsVirtualHouseModalOpen] = useState(false);

  const [isInExampleMode, setIsInExampleMode] = useState(false);
  const [userSavedState, setUserSavedState] = useState<AppState | null>(null);
  const [simulatedTime, setSimulatedTime] = useState<number | null>(null);

  useEffect(() => {
    if (isInExampleMode) return;
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
        console.error("Failed to save state to localStorage:", error);
    }
  }, [appState, isInExampleMode]);

  const loadExample = (exampleData: any) => {
      setAppState({
          houses: exampleData.houses,
          warehouseItems: exampleData.warehouseItems,
          cashBalance: exampleData.cashBalance,
          collectedPets: exampleData.collectedPets,
          salesHistory: exampleData.salesHistory,
          prices: appState.prices, 
          checkinTimes: appState.checkinTimes,
          completedTaskLog: [],
          virtualHouses: [], 
          isPerfectionMode: false,
      });
  };

  const handleLoadScenario = (key: string) => {
      if (key === 'CURRENT') {
          if (userSavedState) {
              setAppState(JSON.parse(JSON.stringify(userSavedState)));
          }
      } else {
          switch (key) {
              case 'EXAMPLE_2': loadExample(examples.getExample2House()); break;
              case 'EXAMPLE_13': loadExample(examples.getExample13House()); break;
              case 'EXAMPLE_26': loadExample(examples.getExample26House()); break;
              case 'EXAMPLE_71': loadExample(examples.getExample71House()); break;
          }
      }
  };

  const enterExampleMode = () => {
    setUserSavedState(appState);
    setIsInExampleMode(true);
    setSimulatedTime(Date.now());
    loadExample(examples.getExample2House());
  };

  const exitExampleMode = () => {
    if (userSavedState) {
        setAppState(userSavedState);
    }
    setIsInExampleMode(false);
    setUserSavedState(null);
    setSimulatedTime(null);
  };

  const handleLoadState = useCallback((newState: AppState) => {
    const migratedState = migrateState(newState);
    setAppState(migratedState);
    alert('State loaded successfully!');
  }, []);

  const setHouses = useCallback((updater: React.SetStateAction<House[]>) => {
    setAppState(prev => {
        const newHouses = typeof updater === 'function' ? updater(prev.houses) : updater;
        return { ...prev, houses: newHouses };
    });
  }, []);
  
  const setCompletedTaskLog = useCallback((updater: React.SetStateAction<CompletedTaskLog[]>) => {
      setAppState(prev => {
          const newLog = typeof updater === 'function' ? updater(prev.completedTaskLog) : updater;
          return { ...prev, completedTaskLog: newLog };
      });
  }, []);
  
  const handleUpdateVirtualHouses = useCallback((updater: React.SetStateAction<VirtualHouse[]>) => {
      setAppState(prev => {
          const newVirtualHouses = typeof updater === 'function' ? updater(prev.virtualHouses) : updater;
          
          const newHouses = prev.houses.map(house => ({
              ...house,
              slots: house.slots.map((slot, idx) => {
                  const vHouse = newVirtualHouses.find(vh => 
                      vh.slots.some(s => s.houseId === house.id && s.slotIndex === idx)
                  );
                  
                  if (slot.npc.virtualHouseId !== (vHouse ? vHouse.id : undefined)) {
                      return {
                          ...slot,
                          npc: {
                              ...slot.npc,
                              virtualHouseId: vHouse ? vHouse.id : undefined
                          }
                      };
                  }
                  return slot;
              })
          }));

          return { ...prev, virtualHouses: newVirtualHouses, houses: newHouses };
      });
  }, []);

  const updateHouse = useCallback((updatedHouse: House) => {
    setAppState(prev => {
        const newHouses = prev.houses.map(h => (h.id === updatedHouse.id ? updatedHouse : h));
        const oldHouse = prev.houses.find(h => h.id === updatedHouse.id);
        if (oldHouse && oldHouse.division !== updatedHouse.division) {
            return { ...prev, houses: calculateAndAssignServiceBlocks(newHouses) };
        }
        return { ...prev, houses: newHouses };
    });
  }, []);

  const addHousesFromTemplate = useCallback((template: HouseTemplate, quantity: number) => {
    setAppState(prev => {
        const newHouses: House[] = [];
        let lastId = prev.houses.length > 0 ? Math.max(...prev.houses.map(h => h.id)) : 0;

        for (let i = 0; i < quantity; i++) {
            const newId = ++lastId;
            
            const createSlot = (type: NpcType | null): { npc: NpcSlot; pet: PetSlot } => ({
                npc: {
                    type,
                    expiration: null,
                    duration: type ? 15 : null,
                    mode: 'LINKED', 
                },
                pet: { name: null, startTime: null, finishTime: null },
            });

            let newHouseConfig: { division: Division; slots: { npc: NpcSlot; pet: PetSlot }[] };

            switch (template) {
                case HouseTemplate.A_NURSERY:
                    newHouseConfig = {
                        division: Division.NURSERY,
                        slots: [createSlot(NpcType.F), createSlot(NpcType.E), createSlot(null)],
                    };
                    break;
                case HouseTemplate.S_NURSERY:
                    newHouseConfig = {
                        division: Division.NURSERY,
                        slots: [createSlot(NpcType.F), createSlot(NpcType.E), createSlot(NpcType.D)],
                    };
                    break;
                case HouseTemplate.A_FACTORY:
                    newHouseConfig = {
                        division: Division.FACTORY,
                        slots: [createSlot(NpcType.D), createSlot(NpcType.C), createSlot(NpcType.B)],
                    };
                    break;
                case HouseTemplate.S_FACTORY:
                    newHouseConfig = {
                        division: Division.FACTORY,
                        slots: [createSlot(NpcType.C), createSlot(NpcType.B), createSlot(NpcType.A)],
                    };
                    break;
                case HouseTemplate.EMPTY:
                    newHouseConfig = {
                        division: Division.NURSERY,
                        slots: [createSlot(null), createSlot(null), createSlot(null)],
                    };
                    break;
            }

            const newHouse: House = {
                id: newId,
                division: newHouseConfig.division,
                label: `House #${newId}`,
                serviceBlock: '',
                perfectionAttempts: 0,
                slots: newHouseConfig.slots,
            };
            newHouses.push(newHouse);
        }
        
        return { ...prev, houses: calculateAndAssignServiceBlocks([...prev.houses, ...newHouses]) };
    });
  }, []);

  const removeHouse = useCallback((houseId: number) => {
    setAppState(prev => ({ ...prev, houses: calculateAndAssignServiceBlocks(prev.houses.filter(h => h.id !== houseId)) }));
  }, []);

  const setWarehouseItems = useCallback((updater: React.SetStateAction<WarehouseItem[]>) => {
      setAppState(prev => {
          const newItems = typeof updater === 'function' ? updater(prev.warehouseItems) : updater;
          return { ...prev, warehouseItems: newItems };
      });
  }, []);
  
  const updateWarehouseItem = useCallback((updatedItem: WarehouseItem) => {
    setAppState(prev => ({ ...prev, warehouseItems: prev.warehouseItems.map(item => (item.id === updatedItem.id ? updatedItem : item)) }));
  }, []);
  
  const setCashBalance = useCallback((balance: number) => {
    setAppState(prev => ({ ...prev, cashBalance: balance }));
  }, []);

  const setPrices = useCallback((newPrices: PriceConfig) => {
    setAppState(prev => ({ ...prev, prices: newPrices }));
  }, []);
  
  const updateCollectedPets = useCallback((petType: NpcType, quantity: number) => {
    setAppState(prev => {
        let newCollectedPets: CollectedPet[];
        const existing = prev.collectedPets.find(p => p.petType === petType);
        if (existing) {
            newCollectedPets = prev.collectedPets.map(p => 
                p.petType === petType ? { ...p, quantity: p.quantity + quantity } : p
            ).filter(p => p.quantity > 0);
        } else if (quantity > 0) {
            newCollectedPets = [...prev.collectedPets, { petType, quantity }];
        } else {
            newCollectedPets = prev.collectedPets;
        }
        return { ...prev, collectedPets: newCollectedPets };
    });
  }, []);
  
  const handleSellPets = useCallback((petType: NpcType, quantity: number, pricePerUnit: number) => {
    setAppState(prev => {
      let newCollectedPets = prev.collectedPets.map(item => ({ ...item }));
      let newWarehouseItems = prev.warehouseItems.map(item => ({ ...item }));
      
      let remainingToSell = quantity;

      const existingCollectedIndex = newCollectedPets.findIndex(p => p.petType === petType);
      if (existingCollectedIndex !== -1) {
          const existingCollected = newCollectedPets[existingCollectedIndex];
          const sellAmount = Math.min(remainingToSell, existingCollected.quantity);
          if (sellAmount > 0) {
              newCollectedPets[existingCollectedIndex] = { 
                  ...existingCollected, 
                  quantity: existingCollected.quantity - sellAmount 
              };
              remainingToSell -= sellAmount;
          }
      }
      newCollectedPets = newCollectedPets.filter(p => p.quantity > 0);


      if (remainingToSell > 0) {
          const wipMap: { [key in NpcType]?: string } = {
              [NpcType.F]: 'f-pet-wip',
              [NpcType.E]: 'e-pet-wip',
              [NpcType.D]: 'd-pet-wip',
              [NpcType.C]: 'c-pet-wip',
              [NpcType.B]: 'b-pet-wip',
              [NpcType.A]: 'a-pet-wip',
          };
          const wipId = wipMap[petType];
          if (wipId) {
              const wipIndex = newWarehouseItems.findIndex(i => i.id === wipId);
              if (wipIndex !== -1) {
                  const wipItem = newWarehouseItems[wipIndex];
                  if (wipItem.currentStock > 0) {
                      const sellAmount = Math.min(remainingToSell, wipItem.currentStock);
                      if (sellAmount > 0) {
                           newWarehouseItems[wipIndex] = {
                               ...wipItem,
                               currentStock: wipItem.currentStock - sellAmount
                           };
                           remainingToSell -= sellAmount;
                       }
                  }
              }
          }
      }

      if (remainingToSell > 0 && petType === NpcType.F) {
           const stockIndex = newWarehouseItems.findIndex(i => i.id === 'f-pet-stock');
           if (stockIndex !== -1) {
               const stockItem = newWarehouseItems[stockIndex];
               if (stockItem.currentStock > 0) {
                   const sellAmount = Math.min(remainingToSell, stockItem.currentStock);
                   if (sellAmount > 0) {
                       newWarehouseItems[stockIndex] = {
                           ...stockItem,
                           currentStock: stockItem.currentStock - sellAmount
                       };
                       remainingToSell -= sellAmount;
                   }
               }
           }
      }

      if (remainingToSell > 0) {
          console.error("Tried to sell more than available", { requested: quantity, remaining: remainingToSell });
          return prev; 
      }

      const totalValue = quantity * pricePerUnit;
      const newRecord: SaleRecord = { 
        id: crypto.randomUUID(), petType, quantity, pricePerUnit, totalValue, timestamp: Date.now() 
      };

      return {
        ...prev,
        collectedPets: newCollectedPets,
        warehouseItems: newWarehouseItems,
        cashBalance: prev.cashBalance + totalValue,
        salesHistory: [newRecord, ...prev.salesHistory],
      };
    });
  }, []);
  
  const handlePerfectionAttempt = useCallback(() => {
    const championHouse = appState.houses.find(h => h.division === Division.CHAMPION);
    const sPets = appState.collectedPets.find(p => p.petType === NpcType.S);

    if (championHouse && sPets && sPets.quantity > 0) {
        updateCollectedPets(NpcType.S, -1);
        const updatedChampionHouse = { ...championHouse, perfectionAttempts: championHouse.perfectionAttempts + 1 };
        updateHouse(updatedChampionHouse);
    } else {
        alert("No S-Pets available in inventory to attempt perfection.");
    }
  }, [appState.houses, appState.collectedPets, updateCollectedPets, updateHouse]);

  const setCheckinTimes = useCallback((times: number[]) => {
      setAppState(prev => ({ ...prev, checkinTimes: times }));
  }, []);

  const togglePerfectionMode = useCallback(() => {
      setAppState(prev => ({ ...prev, isPerfectionMode: !prev.isPerfectionMode }));
  }, []);

  const advanceFactoryState = (prevTime: number, newTime: number, state: AppState): AppState => {
      if (newTime <= prevTime) return state;

      const newHouses = state.houses.map(house => ({
          ...house,
          slots: house.slots.map(slot => {
              let updatedSlot = { ...slot };

              if (updatedSlot.npc.expiration && updatedSlot.npc.duration) {
                  let currentExpiration = new Date(updatedSlot.npc.expiration).getTime();
                  if (currentExpiration <= newTime) {
                      const durationMs = updatedSlot.npc.duration * 24 * 60 * 60 * 1000;
                      while (currentExpiration <= newTime) {
                          currentExpiration += durationMs;
                      }
                      updatedSlot.npc = {
                          ...updatedSlot.npc,
                          expiration: new Date(currentExpiration).toISOString()
                      };
                  }
              }

              if (updatedSlot.pet.finishTime && updatedSlot.pet.finishTime <= newTime) {
                  const cycle = CYCLE_TIMES.find(c => c.npcType === updatedSlot.npc.type);
                  if (cycle) {
                      const durationMs = cycle.time * 3600000;
                      let currentFinish = updatedSlot.pet.finishTime;
                      
                      while (currentFinish <= newTime) {
                          currentFinish += durationMs;
                      }
                      
                      updatedSlot.pet = {
                          ...updatedSlot.pet,
                          finishTime: currentFinish,
                          startTime: currentFinish - durationMs
                      };
                  }
              }

              return updatedSlot;
          })
      }));

      return { ...state, houses: newHouses };
  };

  const handleTimeTravel = useCallback((amount: number, unit: 'day' | 'week') => {
    setSimulatedTime(prev => {
      if (prev === null) return null;
      const msInDay = 24 * 60 * 60 * 1000;
      let msToAdd = 0;
      if (unit === 'day') {
        msToAdd = amount * msInDay;
      } else if (unit === 'week') {
        msToAdd = amount * 7 * msInDay;
      }
      
      const newTime = prev + msToAdd;
      
      if (msToAdd > 0) {
          setAppState(curr => advanceFactoryState(prev, newTime, curr));
      }
      
      return newTime;
    });
  }, []);

  const handleSkipToCheckin = useCallback((direction: 'forward' | 'backward') => {
    if (simulatedTime === null || appState.checkinTimes.length === 0) return;

    setSimulatedTime(prev => {
        if (prev === null) return null;
        const now = new Date(prev);
        const sortedCheckinHours = [...appState.checkinTimes].sort((a, b) => a - b);

        const checkinDates: Date[] = [];
        [-2, -1, 0, 1, 2].forEach(dayOffset => {
            sortedCheckinHours.forEach(hour => {
                const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0, 0, 0);
                checkinDates.push(date);
            });
        });

        let nextTime: number | null = null;

        if (direction === 'forward') {
            const nextCheckin = checkinDates
                .sort((a, b) => a.getTime() - b.getTime())
                .find(time => time.getTime() > now.getTime());
            
            if (nextCheckin) nextTime = nextCheckin.getTime();
        } else { 
            const prevCheckin = checkinDates
                .sort((a, b) => b.getTime() - a.getTime())
                .find(time => time.getTime() < now.getTime());

            if (prevCheckin) nextTime = prevCheckin.getTime();
        }

        if (nextTime !== null) {
            if (direction === 'forward' && nextTime > prev) {
                setAppState(curr => advanceFactoryState(prev, nextTime!, curr));
            }
            return nextTime;
        }
        return prev;
    });
  }, [appState.checkinTimes, simulatedTime]);

  const renderView = () => {
    const { houses, warehouseItems, cashBalance, prices, collectedPets, salesHistory, checkinTimes, completedTaskLog, virtualHouses, isPerfectionMode } = appState;
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard 
            houses={houses} warehouseItems={warehouseItems} cashBalance={cashBalance}
            setCashBalance={setCashBalance} cycleTimes={CYCLE_TIMES} prices={prices}
            checkinTimes={checkinTimes} collectedPets={collectedPets} onPerfectionAttempt={handlePerfectionAttempt}
            virtualHouses={virtualHouses}
            simulatedTime={simulatedTime}
            isPerfectionMode={isPerfectionMode}
            onTogglePerfectionMode={togglePerfectionMode}
        />;
      case View.DAILY_BRIEFING:
        return <DailyBriefing 
            houses={houses} cycleTimes={CYCLE_TIMES} warehouseItems={warehouseItems}
            onUpdateCollectedPets={updateCollectedPets} setHouses={setHouses}
            setWarehouseItems={setWarehouseItems} checkinTimes={checkinTimes} simulatedTime={simulatedTime}
            completedTaskLog={completedTaskLog} setCompletedTaskLog={setCompletedTaskLog}
            virtualHouses={virtualHouses}
            isPerfectionMode={isPerfectionMode}
        />;
      case View.FACTORY_FLOOR:
        return <FactoryFloor
            houses={houses} onUpdateHouse={updateHouse} cycleTimes={CYCLE_TIMES} onSetHouses={setHouses}
            onAddHousesFromTemplate={addHousesFromTemplate} onRemoveHouse={removeHouse} simulatedTime={simulatedTime}
            virtualHouses={virtualHouses}
            onOpenVirtualHouseModal={() => setIsVirtualHouseModalOpen(true)}
        />;
      case View.WAREHOUSE:
        return <Warehouse items={warehouseItems} onUpdateItem={updateWarehouseItem} />;
      case View.PET_SALES:
        return <PetSales
            prices={prices} onUpdatePrices={setPrices} collectedPets={collectedPets}
            salesHistory={salesHistory} onSellPets={handleSellPets}
            warehouseItems={warehouseItems}
        />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <Header 
        currentView={currentView} setCurrentView={setCurrentView}
        onHelpClick={() => setIsHelpModalOpen(true)}
        onSettingsClick={() => setIsScheduleModalOpen(true)}
        onSaveLoadClick={() => setIsSaveLoadModalOpen(true)}
        isInExampleMode={isInExampleMode}
        onEnterExampleMode={enterExampleMode}
        onExitExampleMode={exitExampleMode}
      />
      {isInExampleMode && 
        <ExampleModeControls 
            onSelectScenario={handleLoadScenario}
            simulatedTime={simulatedTime}
            onSkipToCheckin={handleSkipToCheckin}
            onTimeTravel={handleTimeTravel}
        />}
      <main className="flex-grow p-2 sm:p-4 lg:p-8 max-w-full mx-auto w-full">
        {renderView()}
      </main>
      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
      {isScheduleModalOpen && <ScheduleModal 
        onClose={() => setIsScheduleModalOpen(false)}
        checkinTimes={appState.checkinTimes}
        onUpdateCheckinTimes={setCheckinTimes}
        houses={appState.houses}
        cycleTimes={CYCLE_TIMES}
        prices={appState.prices}
      />}
      {isSaveLoadModalOpen && <SaveLoadModal
        isOpen={isSaveLoadModalOpen}
        onClose={() => setIsSaveLoadModalOpen(false)}
        appState={appState}
        onLoadState={handleLoadState}
       />}
      {isVirtualHouseModalOpen && <VirtualHouseModal
        isOpen={isVirtualHouseModalOpen}
        onClose={() => setIsVirtualHouseModalOpen(false)}
        houses={appState.houses}
        virtualHouses={appState.virtualHouses}
        onUpdateVirtualHouses={handleUpdateVirtualHouses}
      />}
    </div>
  );
};

export default App;
