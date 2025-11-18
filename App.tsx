

import React, { useState, useCallback, useEffect } from 'react';
import { House, NpcType, View, WarehouseItem, PriceConfig, SaleRecord, CollectedPet, Division, AppState, HouseTemplate, NpcSlot, PetSlot } from './types';
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

// UTILITY FUNCTION (Previously in services/utils.ts)
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
            const blockLetter = String.fromCharCode(65 + (index % numBlocks)); // A, B, C
            updatedHouses.push({ ...house, serviceBlock: `${division} Block ${blockLetter}` });
        });
    });

    return updatedHouses.sort((a, b) => a.id - b.id);
};


// MODAL COMPONENT (Previously in components/SaveLoadModal.tsx)
interface SaveLoadModalProps {
    isOpen: boolean;
    onClose: () => void;
    appState: AppState;
    onLoadState: (state: AppState) => void;
}

const SaveLoadModal: React.FC<SaveLoadModalProps> = ({ isOpen, onClose, appState, onLoadState }) => {
    const [generatedCode, setGeneratedCode] = useState('');
    const [codeToLoad, setCodeToLoad] = useState('');
    const [copyStatus, setCopyStatus] = useState('Copy Code');
    const [error, setError] = useState('');

    const handleGenerateCode = useCallback(() => {
        try {
            const jsonState = JSON.stringify(appState);
            const code = btoa(jsonState);
            setGeneratedCode(code);
            navigator.clipboard.writeText(code).then(() => {
                setCopyStatus('Copied!');
                setTimeout(() => setCopyStatus('Copy Code'), 2000);
            }).catch(() => {
                setCopyStatus('Failed to copy');
            });
        } catch (e) {
            console.error("Failed to generate code:", e);
            setGeneratedCode('Error generating code.');
        }
    }, [appState]);

    const handleLoadCode = () => {
        if (!codeToLoad.trim()) {
            setError('Please paste a code to load.');
            return;
        }
        try {
            const decodedJson = atob(codeToLoad.trim());
            const newState = JSON.parse(decodedJson);
            if (newState && typeof newState === 'object' && 'houses' in newState && 'warehouseItems' in newState) {
                onLoadState(newState);
                onClose();
            } else {
                throw new Error('Invalid state structure.');
            }
        } catch (e) {
            console.error("Failed to load state from code:", e);
            setError('Invalid or corrupted code. Please check and try again.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-cyan-400">Save & Load State</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </header>
                <main className="p-6 max-h-[60vh] overflow-y-auto space-y-8">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-200 mb-3">Save Current State</h3>
                        <p className="text-sm text-gray-400 mb-4">Generate a unique code that represents your entire factory setup. Copy this code and save it somewhere safe to restore your progress later.</p>
                        <button onClick={handleGenerateCode} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors">
                            Generate Code
                        </button>
                        {generatedCode && (
                            <div className="mt-4">
                                <textarea
                                    readOnly
                                    value={generatedCode}
                                    className="w-full h-24 bg-gray-900 text-gray-300 font-mono text-xs rounded-md p-2 border border-gray-600"
                                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                />
                                <button onClick={() => navigator.clipboard.writeText(generatedCode).then(() => { setCopyStatus('Copied!'); setTimeout(() => setCopyStatus('Copy Code'), 2000); })} className="mt-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1 px-3 rounded-md text-sm">
                                    {copyStatus}
                                </button>
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-200 mb-3">Load State from Code</h3>
                        <p className="text-sm text-gray-400 mb-4">Paste your previously generated code here to restore your factory to that exact state.</p>
                        <textarea
                            value={codeToLoad}
                            onChange={(e) => {
                                setCodeToLoad(e.target.value);
                                setError('');
                            }}
                            placeholder="Paste your save code here..."
                            className="w-full h-24 bg-gray-700 text-white font-mono text-xs rounded-md p-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                         {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
                    </div>
                </main>
                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white font-semibold">
                        Cancel
                    </button>
                    <button onClick={handleLoadCode} className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                        Load State
                    </button>
                </footer>
            </div>
        </div>
    );
};


const LOCAL_STORAGE_KEY = 'flyff-pet-studio-state';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedStateJSON) {
        const loadedState = JSON.parse(savedStateJSON);
        // Use the migration service to ensure forward compatibility
        return migrateState(loadedState);
      }
    } catch (error) {
      console.error("Failed to load or parse state from localStorage:", error);
      // If parsing fails, the data is corrupt. Remove it to prevent future load failures.
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    // Return a fresh copy of the initial state if nothing is loaded or if there's an error.
    return JSON.parse(JSON.stringify(INITIAL_APP_STATE));
  });

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isSaveLoadModalOpen, setIsSaveLoadModalOpen] = useState(false);

  // Playground Mode State
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
      });
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
    // Use the migration service to ensure forward compatibility when loading from a code
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
    updateCollectedPets(petType, -quantity);
    const totalValue = quantity * pricePerUnit;
    setAppState(prev => {
      const newRecord: SaleRecord = { 
        id: crypto.randomUUID(), petType, quantity, pricePerUnit, totalValue, timestamp: Date.now() 
      };
      return {
        ...prev,
        cashBalance: prev.cashBalance + totalValue,
        salesHistory: [newRecord, ...prev.salesHistory],
      }
    });
  }, [updateCollectedPets]);
  
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
      return prev + msToAdd;
    });
  }, []);

  const handleSkipToCheckin = useCallback((direction: 'forward' | 'backward') => {
    if (simulatedTime === null || appState.checkinTimes.length === 0) return;

    const now = new Date(simulatedTime);
    const sortedCheckinHours = [...appState.checkinTimes].sort((a, b) => a - b);

    const checkinDates: Date[] = [];
    [-2, -1, 0, 1, 2].forEach(dayOffset => {
        sortedCheckinHours.forEach(hour => {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0, 0, 0);
            checkinDates.push(date);
        });
    });

    if (direction === 'forward') {
        const nextCheckin = checkinDates
            .sort((a, b) => a.getTime() - b.getTime())
            .find(time => time.getTime() > now.getTime());
        
        if (nextCheckin) {
            setSimulatedTime(nextCheckin.getTime());
        }
    } else { // backward
        const prevCheckin = checkinDates
            .sort((a, b) => b.getTime() - a.getTime())
            .find(time => time.getTime() < now.getTime());

        if (prevCheckin) {
            setSimulatedTime(prevCheckin.getTime());
        }
    }
  }, [simulatedTime, appState.checkinTimes]);

  const renderView = () => {
    const { houses, warehouseItems, cashBalance, prices, collectedPets, salesHistory, checkinTimes } = appState;
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard 
            houses={houses} warehouseItems={warehouseItems} cashBalance={cashBalance}
            setCashBalance={setCashBalance} cycleTimes={CYCLE_TIMES} prices={prices}
            checkinTimes={checkinTimes} collectedPets={collectedPets} onPerfectionAttempt={handlePerfectionAttempt}
        />;
      case View.DAILY_BRIEFING:
        return <DailyBriefing 
            houses={houses} cycleTimes={CYCLE_TIMES} warehouseItems={warehouseItems}
            onUpdateCollectedPets={updateCollectedPets} setHouses={setHouses}
            setWarehouseItems={setWarehouseItems} checkinTimes={checkinTimes} simulatedTime={simulatedTime}
        />;
      case View.FACTORY_FLOOR:
        return <FactoryFloor
            houses={houses} onUpdateHouse={updateHouse} cycleTimes={CYCLE_TIMES} onSetHouses={setHouses}
            onAddHousesFromTemplate={addHousesFromTemplate} onRemoveHouse={removeHouse} simulatedTime={simulatedTime}
        />;
      case View.WAREHOUSE:
        return <Warehouse items={warehouseItems} onUpdateItem={updateWarehouseItem} />;
      case View.PET_SALES:
        return <PetSales
            prices={prices} onUpdatePrices={setPrices} collectedPets={collectedPets}
            salesHistory={salesHistory} onSellPets={handleSellPets}
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
            onSelectExample={loadExample}
            simulatedTime={simulatedTime}
            onSkipToCheckin={handleSkipToCheckin}
            onTimeTravel={handleTimeTravel}
        />}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-full mx-auto w-full">
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
    </div>
  );
};

export default App;