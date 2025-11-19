import React, { useState } from 'react';
import { House, VirtualHouse, NpcType } from '../types';
import { VirtualIcon } from './icons/Icons';

interface VirtualHouseModalProps {
    isOpen: boolean;
    onClose: () => void;
    houses: House[];
    virtualHouses: VirtualHouse[];
    onUpdateVirtualHouses: (houses: VirtualHouse[]) => void;
}

const VirtualHouseModal: React.FC<VirtualHouseModalProps> = ({ isOpen, onClose, houses, virtualHouses, onUpdateVirtualHouses }) => {
    const [newHouseName, setNewHouseName] = useState('');
    const [selectedSlots, setSelectedSlots] = useState<{houseId: number, slotIndex: number}[]>([]);
    
    if (!isOpen) return null;

    // Filter for slots that are:
    // 1. Not Empty (have an NPC type)
    // 2. Marked as 'SOLO' mode
    // 3. Not already in a virtual house
    const availableSoloSlots = houses.flatMap(h => 
        h.slots.map((s, i) => ({ 
            houseId: h.id, 
            slotIndex: i, 
            slot: s, 
            label: h.label 
        }))
    ).filter(item => 
        item.slot.npc.type && 
        item.slot.npc.mode === 'SOLO' && 
        !item.slot.npc.virtualHouseId
    );

    const handleSlotToggle = (houseId: number, slotIndex: number) => {
        const isSelected = selectedSlots.some(s => s.houseId === houseId && s.slotIndex === slotIndex);
        if (isSelected) {
            setSelectedSlots(prev => prev.filter(s => !(s.houseId === houseId && s.slotIndex === slotIndex)));
        } else {
            if (selectedSlots.length < 3) {
                setSelectedSlots(prev => [...prev, { houseId, slotIndex }]);
            }
        }
    };

    const handleCreate = () => {
        if (!newHouseName.trim()) {
            alert("Please name your Virtual House.");
            return;
        }
        if (selectedSlots.length !== 3) {
            alert("A Virtual House must consist of exactly 3 slots.");
            return;
        }

        const newVirtualHouse: VirtualHouse = {
            id: crypto.randomUUID(),
            name: newHouseName.trim(),
            slots: selectedSlots // Order matters (Slot 1 -> Slot 2 -> Slot 3)
        };

        onUpdateVirtualHouses([...virtualHouses, newVirtualHouse]);
        setNewHouseName('');
        setSelectedSlots([]);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure? This will disband the Virtual House and return slots to Solo mode.")) {
            onUpdateVirtualHouses(virtualHouses.filter(vh => vh.id !== id));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                        <VirtualIcon /> Manage Virtual Houses
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </header>

                <main className="p-6 overflow-y-auto flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left: Creator */}
                    <div className="space-y-6">
                        <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                            <h3 className="text-lg font-bold text-gray-200 mb-3">Create New Virtual House</h3>
                            <p className="text-sm text-gray-400 mb-4">
                                Select 3 available "Solo" slots to stitch together into a logical production line (Slot 1 &rarr; Slot 2 &rarr; Slot 3).
                            </p>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Virtual House Name</label>
                                <input 
                                    type="text" 
                                    value={newHouseName}
                                    onChange={e => setNewHouseName(e.target.value)}
                                    placeholder="e.g., Ind. Pod A - Extra Line"
                                    className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-gray-300 mb-2">Select Slots ({selectedSlots.length}/3)</h4>
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                    {availableSoloSlots.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">No unassigned Solo slots available. Toggle slots to 'Solo' mode on the Factory Floor first.</p>
                                    ) : (
                                        availableSoloSlots.map(item => {
                                            const isSelected = selectedSlots.some(s => s.houseId === item.houseId && s.slotIndex === item.slotIndex);
                                            const selectionIndex = selectedSlots.findIndex(s => s.houseId === item.houseId && s.slotIndex === item.slotIndex);
                                            
                                            return (
                                                <div 
                                                    key={`${item.houseId}-${item.slotIndex}`}
                                                    onClick={() => handleSlotToggle(item.houseId, item.slotIndex)}
                                                    className={`flex justify-between items-center p-2 rounded cursor-pointer border ${
                                                        isSelected 
                                                        ? 'bg-purple-900/50 border-purple-500' 
                                                        : 'bg-gray-700 border-transparent hover:border-gray-500'
                                                    }`}
                                                >
                                                    <span className="text-sm text-gray-200">
                                                        {item.label} <span className="text-gray-400 mx-1">|</span> {item.slot.npc.type}-NPC
                                                    </span>
                                                    {isSelected && (
                                                        <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                            Pos {selectionIndex + 1}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleCreate}
                                disabled={selectedSlots.length !== 3 || !newHouseName}
                                className={`w-full font-bold py-2 rounded transition-colors ${
                                    selectedSlots.length === 3 && newHouseName 
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                Create Virtual House
                            </button>
                        </div>
                    </div>

                    {/* Right: List */}
                    <div className="space-y-4">
                         <h3 className="text-lg font-bold text-gray-200">Active Virtual Houses</h3>
                         {virtualHouses.length === 0 ? (
                             <p className="text-gray-500 italic">No virtual houses created yet.</p>
                         ) : (
                             <div className="space-y-3">
                                 {virtualHouses.map(vh => (
                                     <div key={vh.id} className="bg-gray-900 p-4 rounded border border-gray-700">
                                         <div className="flex justify-between items-start mb-3">
                                             <h4 className="font-bold text-purple-400 text-lg">{vh.name}</h4>
                                             <button onClick={() => handleDelete(vh.id)} className="text-red-400 hover:text-red-300 text-sm underline">Disband</button>
                                         </div>
                                         <div className="flex items-center text-sm text-gray-300 gap-2">
                                             {vh.slots.map((s, i) => {
                                                 const house = houses.find(h => h.id === s.houseId);
                                                 const npcType = house?.slots[s.slotIndex].npc.type || '?';
                                                 return (
                                                     <React.Fragment key={i}>
                                                         <div className="bg-gray-800 px-2 py-1 rounded">
                                                             <div className="text-xs text-gray-500">Slot {i+1}</div>
                                                             <div>H#{s.houseId} ({npcType})</div>
                                                         </div>
                                                         {i < 2 && <span className="text-gray-600">&rarr;</span>}
                                                     </React.Fragment>
                                                 )
                                             })}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>

                </main>
            </div>
        </div>
    );
};

export default VirtualHouseModal;