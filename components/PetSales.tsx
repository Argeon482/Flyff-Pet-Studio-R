import React, { useState } from 'react';
import { PriceConfig, NpcType, CollectedPet, SaleRecord } from '../types';

interface PetSalesProps {
    prices: PriceConfig;
    onUpdatePrices: (newPrices: PriceConfig) => void;
    collectedPets: CollectedPet[];
    salesHistory: SaleRecord[];
    onSellPets: (petType: NpcType, quantity: number, price: number) => void;
}

const ConfigurableValue: React.FC<{
    label: string;
    value: number;
    onSave: (newValue: number) => void;
}> = ({ label, value, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value.toString());

    const handleSave = () => {
        const numValue = parseInt(currentValue, 10);
        if (!isNaN(numValue)) {
            onSave(numValue);
        }
        setIsEditing(false);
    };

    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-gray-300">{label}:</span>
            {isEditing ? (
                <div className="flex items-center gap-2">
                     <input
                        type="number"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        className="w-32 bg-gray-700 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        onBlur={handleSave}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        autoFocus
                    />
                    <button onClick={handleSave} className="text-sm bg-cyan-600 hover:bg-cyan-500 text-white py-1 px-2 rounded">Save</button>
                </div>
            ) : (
                <span onClick={() => setIsEditing(true)} className="font-semibold text-cyan-400 cursor-pointer">${value.toLocaleString()}</span>
            )}
        </div>
    );
}

const PetSales: React.FC<PetSalesProps> = ({ prices, onUpdatePrices, collectedPets, salesHistory, onSellPets }) => {
    const [sellQuantities, setSellQuantities] = useState<Record<string, string>>({});

    const handleSell = (pet: CollectedPet) => {
        const quantity = parseInt(sellQuantities[pet.petType] || '0', 10);
        const price = prices.petPrices[pet.petType] || 0;
        if (quantity > 0 && quantity <= pet.quantity && price > 0) {
            onSellPets(pet.petType, quantity, price);
            setSellQuantities(prev => ({...prev, [pet.petType]: ''}));
        } else {
            alert('Invalid quantity or price.');
        }
    };


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Config & Inventory */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* Config */}
                <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-cyan-400 mb-4">Market Config</h2>
                    <div className="divide-y divide-gray-700">
                        {Object.entries(prices.petPrices).sort(([a], [b]) => a.localeCompare(b)).map(([petType, price]) => (
                             <ConfigurableValue
                                key={petType}
                                label={petType === NpcType.F ? `${petType}-Pet Purchase Price` : `${petType}-Pet Sale Price`}
                                value={price || 0}
                                onSave={(newValue) => onUpdatePrices({ ...prices, petPrices: { ...prices.petPrices, [petType as NpcType]: newValue }})}
                            />
                        ))}
                        <ConfigurableValue
                            label="7-Day NPC Cost"
                            value={prices.npcCost7Day}
                            onSave={(newValue) => onUpdatePrices({ ...prices, npcCost7Day: newValue })}
                        />
                        <ConfigurableValue
                            label="15-Day NPC Cost"
                            value={prices.npcCost15Day}
                            onSave={(newValue) => onUpdatePrices({ ...prices, npcCost15Day: newValue })}
                        />
                    </div>
                </div>

                {/* Inventory */}
                <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                     <h2 className="text-2xl font-bold text-cyan-400 mb-4">Collected Pet Inventory</h2>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="border-b border-gray-700">
                                <tr>
                                    <th className="py-2 text-left text-sm font-semibold text-gray-300">Pet Type</th>
                                    <th className="py-2 text-left text-sm font-semibold text-gray-300">Available</th>
                                    <th className="py-2 text-left text-sm font-semibold text-gray-300">Price Each</th>
                                    <th className="py-2 text-left text-sm font-semibold text-gray-300">Sell Quantity</th>
                                    <th className="py-2 text-right text-sm font-semibold text-gray-300">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collectedPets.length > 0 ? collectedPets.map(pet => (
                                    <tr key={pet.petType} className="border-b border-gray-700">
                                        <td className="py-3 font-medium text-gray-200">{pet.petType}-Pet</td>
                                        <td className="py-3 text-gray-300">{pet.quantity}</td>
                                        <td className="py-3 text-cyan-400">${(prices.petPrices[pet.petType] || 0).toLocaleString()}</td>
                                        <td className="py-3">
                                            <input 
                                                type="number"
                                                min="0"
                                                max={pet.quantity}
                                                value={sellQuantities[pet.petType] || ''}
                                                onChange={e => setSellQuantities({...sellQuantities, [pet.petType]: e.target.value})}
                                                className="w-24 bg-gray-700 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            />
                                        </td>
                                        <td className="py-3 text-right">
                                            <button onClick={() => handleSell(pet)} className="bg-green-700 hover:bg-green-600 text-white font-bold py-1 px-3 rounded">
                                                Sell
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="text-center py-6 text-gray-400">No pets collected for sale.</td></tr>
                                )}
                            </tbody>
                        </table>
                      </div>
                </div>
            </div>

            {/* Right Column: Sales History */}
            <div className="lg:col-span-1 bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">Sales Ledger</h2>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                    {salesHistory.length > 0 ? salesHistory.map(sale => (
                        <div key={sale.id} className="bg-gray-700/50 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-gray-200">{sale.quantity}x {sale.petType}-Pet</p>
                                <p className="font-bold text-green-400">+${sale.totalValue.toLocaleString()}</p>
                            </div>
                            <p className="text-xs text-gray-400">{new Date(sale.timestamp).toLocaleString()}</p>
                        </div>
                    )) : (
                         <div className="text-center py-10 text-gray-500">No sales recorded yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PetSales;