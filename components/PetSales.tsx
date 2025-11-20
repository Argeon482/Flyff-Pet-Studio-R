
import React, { useState } from 'react';
import { PriceConfig, NpcType, CollectedPet, SaleRecord, WarehouseItem } from '../types';

interface PetSalesProps {
    prices: PriceConfig;
    onUpdatePrices: (newPrices: PriceConfig) => void;
    collectedPets: CollectedPet[];
    salesHistory: SaleRecord[];
    onSellPets: (petType: NpcType, quantity: number, price: number) => void;
    warehouseItems: WarehouseItem[];
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
            <span className="text-gray-300 text-sm sm:text-base">{label}:</span>
            {isEditing ? (
                <div className="flex items-center gap-2">
                     <input
                        type="number"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        className="w-24 sm:w-32 bg-gray-700 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                        onBlur={handleSave}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        autoFocus
                    />
                    <button onClick={handleSave} className="text-xs sm:text-sm bg-cyan-600 hover:bg-cyan-500 text-white py-1 px-2 rounded">Save</button>
                </div>
            ) : (
                <span onClick={() => setIsEditing(true)} className="font-semibold text-cyan-400 cursor-pointer text-sm sm:text-base">${value.toLocaleString()}</span>
            )}
        </div>
    );
}

const PetSales: React.FC<PetSalesProps> = ({ prices, onUpdatePrices, collectedPets, salesHistory, onSellPets, warehouseItems }) => {
    const [sellQuantities, setSellQuantities] = useState<Record<string, string>>({});

    // Helper to calculate total available items to sell (Collected + Warehouse WIP + Stock)
    const getAvailableQuantity = (petType: NpcType) => {
        let total = 0;
        // 1. Collected (Mainly S)
        const collected = collectedPets.find(p => p.petType === petType);
        if (collected) total += collected.quantity;

        // 2. Warehouse WIP
        const wipMap: { [key in NpcType]?: string } = {
            [NpcType.F]: 'f-pet-wip', [NpcType.E]: 'e-pet-wip', [NpcType.D]: 'd-pet-wip',
            [NpcType.C]: 'c-pet-wip', [NpcType.B]: 'b-pet-wip', [NpcType.A]: 'a-pet-wip',
        };
        const wipId = wipMap[petType];
        if (wipId) {
            const item = warehouseItems.find(i => i.id === wipId);
            if (item) total += item.currentStock;
        }

        // 3. Warehouse Stock (Only for F)
        if (petType === NpcType.F) {
            const stockItem = warehouseItems.find(i => i.id === 'f-pet-stock');
            if (stockItem) total += stockItem.currentStock;
        }
        return total;
    };

    const handleSell = (petType: NpcType, available: number) => {
        const quantity = parseInt(sellQuantities[petType] || '0', 10);
        const price = prices.petPrices[petType] || 0;
        if (quantity > 0 && quantity <= available && price > 0) {
            onSellPets(petType, quantity, price);
            setSellQuantities(prev => ({...prev, [petType]: ''}));
        } else {
            alert('Invalid quantity or price.');
        }
    };

    // List S -> F
    const allPetTypes = [NpcType.S, NpcType.A, NpcType.B, NpcType.C, NpcType.D, NpcType.E, NpcType.F];

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-8">
            {/* Left Column: Config & Inventory */}
            <div className="xl:col-span-2 space-y-4 sm:space-y-8">
                
                {/* Config */}
                <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-cyan-400 mb-4">Market Config</h2>
                    <div className="divide-y divide-gray-700 max-h-60 overflow-y-auto sm:max-h-none">
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
                <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                     <h2 className="text-xl sm:text-2xl font-bold text-cyan-400 mb-4">Pet Inventory & Sales</h2>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="border-b border-gray-700">
                                <tr>
                                    <th className="py-2 text-left text-xs sm:text-sm font-semibold text-gray-300">Type</th>
                                    <th className="py-2 text-left text-xs sm:text-sm font-semibold text-gray-300">Total Qty</th>
                                    <th className="py-2 text-left text-xs sm:text-sm font-semibold text-gray-300">Value</th>
                                    <th className="py-2 text-left text-xs sm:text-sm font-semibold text-gray-300">Quantity</th>
                                    <th className="py-2 text-right text-xs sm:text-sm font-semibold text-gray-300">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {allPetTypes.map(petType => {
                                    const available = getAvailableQuantity(petType);
                                    const price = prices.petPrices[petType] || 0;
                                    return (
                                    <tr key={petType}>
                                        <td className="py-3 font-medium text-gray-200 text-sm">{petType}-Pet</td>
                                        <td className="py-3 text-gray-300 text-sm">{available}</td>
                                        <td className="py-3 text-cyan-400 text-sm">${price.toLocaleString()}</td>
                                        <td className="py-3">
                                            <input 
                                                type="number"
                                                min="0"
                                                max={available}
                                                value={sellQuantities[petType] || ''}
                                                onChange={e => setSellQuantities({...sellQuantities, [petType]: e.target.value})}
                                                className="w-16 sm:w-24 bg-gray-700 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                                                disabled={available === 0}
                                            />
                                        </td>
                                        <td className="py-3 text-right">
                                            <button 
                                                onClick={() => handleSell(petType, available)}
                                                disabled={available === 0}
                                                className={`text-xs sm:text-sm font-bold py-1 px-3 rounded ${available > 0 ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                                            >
                                                Sell
                                            </button>
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                      </div>
                </div>
            </div>

            {/* Right Column: Sales History */}
            <div className="xl:col-span-1 bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 flex flex-col">
                <h2 className="text-xl sm:text-2xl font-bold text-cyan-400 mb-4">Sales Ledger</h2>
                <div className="space-y-3 overflow-y-auto flex-grow max-h-[500px]">
                    {salesHistory.length > 0 ? salesHistory.map(sale => (
                        <div key={sale.id} className="bg-gray-700/50 p-3 rounded-md border border-gray-700">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-gray-200 text-sm">{sale.quantity}x {sale.petType}-Pet</p>
                                <p className="font-bold text-green-400 text-sm">+${sale.totalValue.toLocaleString()}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{new Date(sale.timestamp).toLocaleString()}</p>
                        </div>
                    )) : (
                         <div className="text-center py-10 text-gray-500 text-sm">No sales recorded yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PetSales;
