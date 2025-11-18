import React, { useState, useEffect, useRef } from 'react';
import { House, CycleTime, NpcType, Division, HouseTemplate } from '../types';
import { DIVISIONS } from '../constants';
import ConfirmationModal from './ConfirmationModal';
import AddHouseModal from './AddHouseModal';

interface FactoryFloorProps {
  houses: House[];
  onUpdateHouse: (house: House) => void;
  cycleTimes: CycleTime[];
  onSetHouses: (houses: House[]) => void;
  onAddHousesFromTemplate: (template: HouseTemplate, quantity: number) => void;
  onRemoveHouse: (id: number) => void;
  simulatedTime: number | null;
}

const CountdownTimer: React.FC<{ finishTime: number, onComplete: () => void, simulatedTime: number | null }> = ({ finishTime, onComplete, simulatedTime }) => {
    const getRemainingTime = () => {
        const now = simulatedTime || Date.now();
        return finishTime - now;
    };
    
    const [timeLeft, setTimeLeft] = useState(getRemainingTime());
    const [tapCount, setTapCount] = useState(0);
    const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (simulatedTime) {
            setTimeLeft(getRemainingTime());
            return; // No interval needed in simulation mode
        }

        if (timeLeft <= 0) return;
        
        const interval = setInterval(() => {
            const newTimeLeft = getRemainingTime();
            setTimeLeft(newTimeLeft > 0 ? newTimeLeft : 0);
            if (newTimeLeft <= 0) clearInterval(interval);
        }, 1000);
        
        return () => clearInterval(interval);
    }, [finishTime, simulatedTime]);


    useEffect(() => {
        if (tapCount === 3) {
            onComplete();
            setTapCount(0);
            if (tapTimer.current) clearTimeout(tapTimer.current);
        }
    }, [tapCount, onComplete]);

    const handleTap = () => {
        const newTapCount = tapCount + 1;
        setTapCount(newTapCount);
        if (tapTimer.current) clearTimeout(tapTimer.current);
        tapTimer.current = setTimeout(() => setTapCount(0), 800); // Reset taps after 800ms
    };

    const remaining = getRemainingTime();
    if (remaining <= 0) return <span className="text-green-400 font-semibold">Ready</span>;

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return <span onClick={handleTap} className="cursor-pointer" title="Triple-tap to complete">{`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}</span>;
};

const SetProgressModal: React.FC<{ onClose: () => void; onSave: (percentage: number) => void; totalHours: number; }> = ({ onClose, onSave, totalHours }) => {
    const [percentage, setPercentage] = useState('');
    const [error, setError] = useState('');

    const numPercent = parseFloat(percentage);
    const isValid = !isNaN(numPercent) && numPercent >= 0 && numPercent <= 100;

    useEffect(() => {
        if (percentage === '') {
            setError('');
            return;
        }
        if (!isValid) {
            setError('Percentage must be between 0 and 100.');
        } else {
            setError('');
        }
    }, [percentage, isValid]);

    const handleSave = () => {
        if (isValid) {
            onSave(numPercent);
            onClose();
        }
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">Set Pet Progress</h3>
                <p className="text-sm text-gray-400 mb-4">Enter the pet's current progress as a percentage (0-100). The app will calculate the exact remaining time.</p>
                <div className="mb-4">
                    <label htmlFor="current-progress" className="block text-sm font-medium text-gray-300">Current Progress (%)</label>
                    <input 
                        id="current-progress"
                        type="number" 
                        value={percentage} 
                        onChange={(e) => setPercentage(e.target.value)} 
                        className={`mt-1 w-full bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${error ? 'ring-red-500' : 'focus:ring-cyan-500'}`}
                        placeholder={`e.g., 92.5`} 
                        autoFocus 
                    />
                    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                    <p className="text-xs text-gray-500 mt-1">Total Training Time: {totalHours} hours</p>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancel</button>
                    <button 
                        onClick={handleSave} 
                        className={`px-4 py-2 rounded text-white font-bold transition-colors ${isValid ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-gray-500 cursor-not-allowed'}`}
                        disabled={!isValid}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

const SetExpirationModal: React.FC<{ onClose: () => void; onSave: (remainingMs: number) => void }> = ({ onClose, onSave }) => {
    const [days, setDays] = useState('');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');

    const handleSave = () => {
        const d = parseInt(days) || 0;
        const h = parseInt(hours) || 0;
        const m = parseInt(minutes) || 0;
        const totalMs = (d * 24 * 3600000) + (h * 3600000) + (m * 60000);
        onSave(totalMs);
        onClose();
    };

    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
        if (/^\d*$/.test(value)) {
            setter(value);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">Set NPC Expiration</h3>
                <p className="text-sm text-gray-400 mb-4">Enter the time remaining for this NPC. This is useful for setting up a factory that is already in progress.</p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Days</label>
                        <input type="number" value={days} onChange={(e) => handleInputChange(setDays, e.target.value)} className="mt-1 w-full bg-gray-700 text-white rounded-md px-3 py-2" placeholder="0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Hours</label>
                        <input type="number" value={hours} onChange={(e) => handleInputChange(setHours, e.target.value)} className="mt-1 w-full bg-gray-700 text-white rounded-md px-3 py-2" placeholder="0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Minutes</label>
                        <input type="number" value={minutes} onChange={(e) => handleInputChange(setMinutes, e.target.value)} className="mt-1 w-full bg-gray-700 text-white rounded-md px-3 py-2" placeholder="0" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold">Save</button>
                </div>
            </div>
        </div>
    );
};


const NpcExpirationDisplay: React.FC<{ expiration: string | null; simulatedTime: number | null }> = ({ expiration, simulatedTime }) => {
    if (!expiration) return <span className="text-sm text-gray-500">Not Started</span>;
    
    const now = simulatedTime || Date.now();
    const expirationTime = new Date(expiration).getTime();
    const remaining = expirationTime - now;

    if (remaining <= 0) return <span className="text-sm text-red-400">Expired</span>;

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return <span className="text-sm text-gray-300">{`${days}d ${hours}h ${minutes}m`}</span>;
};

const FactoryFloor: React.FC<FactoryFloorProps> = ({ houses, onUpdateHouse, cycleTimes, onSetHouses, onAddHousesFromTemplate, onRemoveHouse, simulatedTime }) => {
    const [progressInputSlot, setProgressInputSlot] = useState<{ houseId: number; slotIndex: number; totalHours: number } | null>(null);
    const [expirationInputSlot, setExpirationInputSlot] = useState<{ houseId: number; slotIndex: number; } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'clear_houses' | 'reset' | 'remove'; houseId?: number; title: string; message: React.ReactNode; } | null>(null);
    const [isAddHouseModalOpen, setIsAddHouseModalOpen] = useState(false);

    // State for double-click start confirmation
    const [startConfirm, setStartConfirm] = useState<{ houseId: number; slotIndex: number } | null>(null);
    const startConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Cleanup timers on unmount
        return () => {
            if (startConfirmTimer.current) clearTimeout(startConfirmTimer.current);
        };
    }, []);

    const handleFieldChange = (houseId: number, field: keyof House, value: any) => {
        const house = houses.find(h => h.id === houseId);
        if (house) onUpdateHouse({ ...house, [field]: value });
    };

    const handleNpcChange = (houseId: number, slotIndex: number, field: keyof House['slots'][0]['npc'], value: any) => {
        const house = houses.find(h => h.id === houseId);
        if (house) {
            const newSlots = [...house.slots];
            const npcSlot = newSlots[slotIndex].npc;
            
            (npcSlot as any)[field] = value;

            if (field === 'type' && value && !npcSlot.duration) {
                npcSlot.duration = 15;
            }
            if (field === 'type' && !value) {
                npcSlot.duration = null;
                npcSlot.expiration = null;
            }

            onUpdateHouse({ ...house, slots: newSlots });
        }
    };

    const handleClearAllHouses = () => {
        onSetHouses([]);
    };

    const startPetTimer = (houseId: number, slotIndex: number, finishTime: number) => {
        const house = houses.find(h => h.id === houseId);
        if (!house) return;
        const updatedHouse = JSON.parse(JSON.stringify(house));
        const slot = updatedHouse.slots[slotIndex];
        const cycle = cycleTimes.find(c => c.npcType === slot.npc.type);
        const now = simulatedTime || Date.now();

        if (slot.npc.type && cycle && slot.npc.duration) {
            if (!slot.npc.expiration) {
                const expirationDate = new Date(now);
                expirationDate.setDate(expirationDate.getDate() + slot.npc.duration);
                slot.npc.expiration = expirationDate.toISOString();
            }
            slot.pet = {
                name: `${slot.npc.type}-Pet`,
                startTime: finishTime - (cycle.time * 3600000),
                finishTime
            };
            onUpdateHouse(updatedHouse);
        } else if (!simulatedTime) {
            alert("Please select an NPC duration before starting a pet.");
        }
    };

    const handleStartPet = (houseId: number, slotIndex: number) => {
        const house = houses.find(h => h.id === houseId);
        if (!house) return;
        const slot = house.slots[slotIndex];
        const cycle = cycleTimes.find(c => c.npcType === slot.npc.type);
        if (cycle) {
            const now = simulatedTime || Date.now();
            const finishTime = now + cycle.time * 3600000;
            startPetTimer(houseId, slotIndex, finishTime);
        }
    };
    
    const handleStartPetClick = (houseId: number, slotIndex: number) => {
        if (startConfirm && startConfirm.houseId === houseId && startConfirm.slotIndex === slotIndex) {
            handleStartPet(houseId, slotIndex);
            setStartConfirm(null);
            if (startConfirmTimer.current) {
                clearTimeout(startConfirmTimer.current);
                startConfirmTimer.current = null;
            }
        } else {
            if (startConfirmTimer.current) {
                clearTimeout(startConfirmTimer.current);
            }
            setStartConfirm({ houseId, slotIndex });
            startConfirmTimer.current = setTimeout(() => {
                setStartConfirm(null);
            }, 2000);
        }
    };

    const handleInstantComplete = (houseId: number, slotIndex: number) => {
        const house = houses.find(h => h.id === houseId);
        if (!house) return;
        const updatedHouse = JSON.parse(JSON.stringify(house));
        const slot = updatedHouse.slots[slotIndex];
        const now = simulatedTime || Date.now();
        if (slot.pet.startTime) { 
            slot.pet.finishTime = now;
            onUpdateHouse(updatedHouse);
        }
    };
    
    const handleResetHouse = (houseId: number) => {
        const house = houses.find(h => h.id === houseId);
        if (house) {
            const resetHouse: House = {
                ...house,
                perfectionAttempts: 0,
                slots: Array.from({ length: 3 }, () => ({
                    npc: { type: null, expiration: null, duration: null },
                    pet: { name: null, startTime: null, finishTime: null }
                }))
            };
            onUpdateHouse(resetHouse);
        }
    };

    const handleProgressSave = (percentage: number) => {
        if (!progressInputSlot) return;
        const { houseId, slotIndex, totalHours } = progressInputSlot;
        
        const elapsedHours = totalHours * (percentage / 100);
        const remainingHours = totalHours - elapsedHours;
        const now = simulatedTime || Date.now();
        const finishTime = now + remainingHours * 3600000;

        startPetTimer(houseId, slotIndex, finishTime);
        setProgressInputSlot(null);
    };

    const handleExpirationSave = (remainingMs: number) => {
        if (!expirationInputSlot) return;
        const { houseId, slotIndex } = expirationInputSlot;
        const house = houses.find(h => h.id === houseId);
        if (house) {
            const newSlots = [...house.slots];
            const now = simulatedTime || Date.now();
            const expirationDate = new Date(now + remainingMs);
            newSlots[slotIndex].npc.expiration = expirationDate.toISOString();
            onUpdateHouse({ ...house, slots: newSlots });
        }
        setExpirationInputSlot(null);
    };

    const handleConfirmAction = () => {
        if (!confirmAction) return;
        switch (confirmAction.type) {
            case 'clear_houses':
                handleClearAllHouses();
                break;
            case 'reset':
                if (confirmAction.houseId) handleResetHouse(confirmAction.houseId);
                break;
            case 'remove':
                if (confirmAction.houseId) onRemoveHouse(confirmAction.houseId);
                break;
        }
        setConfirmAction(null);
    };

    const npcOptions = Object.values(NpcType).filter(type => type !== NpcType.S);
    const now = simulatedTime || Date.now();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                 <button
                    onClick={() => setIsAddHouseModalOpen(true)}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded"
                >
                    Add House
                </button>

                 <button
                    onClick={() => setConfirmAction({
                        type: 'clear_houses',
                        title: 'Confirm Clear All Houses',
                        message: <p>Are you sure you want to <strong>PERMANENTLY REMOVE ALL</strong> houses from the factory? This cannot be undone.</p>
                    })}
                    className="bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                    Clear All Houses
                </button>
            </div>
            <div className="bg-gray-800 rounded-lg shadow-lg p-1 sm:p-2 md:p-4">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700/50">
                            <tr>
                                {['House #', 'Division', 'Service Block', 'Slot 1', 'Slot 2', 'Slot 3', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {houses.map(house => {
                                const usedNpcTypes = house.slots.map(s => s.npc.type).filter(Boolean);
                                return (
                                <tr key={house.id}>
                                    <td className="px-3 py-4 text-sm font-bold text-gray-200">{house.id}</td>
                                    <td className="px-3 py-4">
                                        <select value={house.division} onChange={e => handleFieldChange(house.id, 'division', e.target.value as Division)} className="w-32 bg-gray-700 text-white rounded p-1">
                                            {DIVISIONS.map(div => <option key={div} value={div}>{div}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-300">{house.serviceBlock}</td>
                                    {house.slots.map((slot, i) => {
                                        const isConfirmingStart = startConfirm && startConfirm.houseId === house.id && startConfirm.slotIndex === i;
                                        return (
                                        <td key={i} className="px-3 py-4 align-top">
                                            <div className="flex flex-col gap-2 w-40">
                                                <select value={slot.npc.type || ''} onChange={e => handleNpcChange(house.id, i, 'type', e.target.value || null)} className="bg-gray-700 text-white rounded p-1">
                                                    <option value="">Empty</option>
                                                    {npcOptions.map(opt => <option key={opt} value={opt} disabled={usedNpcTypes.includes(opt) && slot.npc.type !== opt}>{opt}</option>)}
                                                </select>
                                                {slot.npc.type && <>
                                                    <select value={slot.npc.duration || ''} onChange={e => handleNpcChange(house.id, i, 'duration', e.target.value ? parseInt(e.target.value) : null)} className="bg-gray-700 text-white rounded p-1">
                                                        <option value="">Duration?</option>
                                                        <option value="7">7 Day</option>
                                                        <option value="15">15 Day</option>
                                                    </select>
                                                    <div className="bg-gray-700 rounded p-1 flex items-center justify-between">
                                                        <NpcExpirationDisplay expiration={slot.npc.expiration} simulatedTime={simulatedTime} />
                                                        <button onClick={() => setExpirationInputSlot({houseId: house.id, slotIndex: i})} className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold">Set</button>
                                                    </div>
                                                    <div>
                                                        {slot.pet.finishTime && slot.pet.finishTime > now 
                                                            ? <CountdownTimer finishTime={slot.pet.finishTime} onComplete={() => handleInstantComplete(house.id, i)} simulatedTime={simulatedTime} /> 
                                                            : slot.pet.finishTime 
                                                                ? <span className="text-green-400 font-semibold">Ready</span> 
                                                                : <div className="flex items-center gap-1.5">
                                                                    <button 
                                                                        onClick={() => handleStartPetClick(house.id, i)}
                                                                        className={`${isConfirmingStart ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-700 hover:bg-green-600'} text-white text-xs font-bold py-1 px-2 rounded`}
                                                                    >
                                                                        {isConfirmingStart ? 'Confirm?' : 'Start'}
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => {
                                                                            const cycle = cycleTimes.find(c => c.npcType === slot.npc.type);
                                                                            if (cycle) {
                                                                                setProgressInputSlot({ houseId: house.id, slotIndex: i, totalHours: cycle.time });
                                                                            }
                                                                        }}
                                                                        className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold py-1 px-2 rounded"
                                                                        title="Start pet with existing progress"
                                                                    >
                                                                        by %
                                                                    </button>
                                                                  </div>
                                                        }
                                                    </div>
                                                </>}
                                            </div>
                                        </td>
                                    )})}
                                    <td className="px-3 py-4 align-top">
                                        <div className="flex flex-col gap-1.5">
                                            <button
                                                onClick={() => setConfirmAction({
                                                    type: 'reset',
                                                    houseId: house.id,
                                                    title: 'Confirm Reset',
                                                    message: <p>Are you sure you want to reset House #{house.id}? All NPC and Pet data will be cleared.</p>
                                                })}
                                                className="bg-yellow-700 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded text-xs"
                                                title="Reset House"
                                            >
                                                Reset
                                            </button>
                                            <button
                                                onClick={() => setConfirmAction({
                                                    type: 'remove',
                                                    houseId: house.id,
                                                    title: 'Confirm Removal',
                                                    message: <p>Are you sure you want to <strong>PERMANENTLY REMOVE</strong> House #{house.id}?</p>
                                                })}
                                                className="bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                                                title="Remove House"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
            {progressInputSlot && <SetProgressModal 
                onClose={() => setProgressInputSlot(null)} 
                onSave={handleProgressSave} 
                totalHours={progressInputSlot.totalHours} 
            />}
            {expirationInputSlot && <SetExpirationModal 
                onClose={() => setExpirationInputSlot(null)} 
                onSave={handleExpirationSave} 
            />}
            <ConfirmationModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleConfirmAction}
                title={confirmAction?.title || ''}
            >
                {confirmAction?.message}
            </ConfirmationModal>
            <AddHouseModal
                isOpen={isAddHouseModalOpen}
                onClose={() => setIsAddHouseModalOpen(false)}
                onAddHouses={onAddHousesFromTemplate}
            />
        </div>
    );
};

export default FactoryFloor;