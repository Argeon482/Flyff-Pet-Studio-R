import React, { useState, useEffect } from 'react';
import { House, WarehouseItem, CycleTime, PriceConfig, Division, NpcType, ProjectedProfit, CollectedPet } from '../types';
import { generateDashboardAnalytics } from '../services/geminiService';
import { AlertIcon, ChampionIcon, ClockIcon, WarehouseIcon } from './icons/Icons';

interface DashboardProps {
  houses: House[];
  warehouseItems: WarehouseItem[];
  cashBalance: number;
  setCashBalance: (balance: number) => void;
  cycleTimes: CycleTime[];
  prices: PriceConfig;
  checkinTimes: number[];
  collectedPets: CollectedPet[];
  onPerfectionAttempt: () => void;
}

const EditableCashBalance: React.FC<{ balance: number; onSave: (newBalance: number) => void }> = ({ balance, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [displayValue, setDisplayValue] = useState(balance.toLocaleString());

    const handleSave = () => {
        const numericValue = parseInt(displayValue.replace(/,/g, ''), 10);
        if (!isNaN(numericValue)) {
            onSave(numericValue);
        }
        setIsEditing(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/,/g, '');
        if (/^\d*$/.test(rawValue)) {
            const numValue = parseInt(rawValue, 10);
            setDisplayValue(isNaN(numValue) ? '' : numValue.toLocaleString());
        }
    };
    
    useEffect(() => {
        if (!isEditing) {
            setDisplayValue(balance.toLocaleString());
        }
    }, [balance, isEditing]);


    if (isEditing) {
        return (
            <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-full bg-gray-700 text-green-400 text-3xl font-bold text-center rounded-md outline-none"
                autoFocus
            />
        );
    }

    return (
        <p onClick={() => setIsEditing(true)} className="text-3xl font-bold text-green-400 mt-1 cursor-pointer">
            ${balance.toLocaleString()}
        </p>
    );
};

const ProfitBreakdown: React.FC<{ profitData: ProjectedProfit }> = ({ profitData }) => {
    const { grossRevenue, npcExpenses, perfectionExpenses, netProfit } = profitData;
    
    const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;

    return (
        <div className="space-y-3 text-sm">
            <div className="flex justify-between">
                <span className="text-gray-400">Gross Potential Revenue</span>
                <span className="font-semibold text-green-400">{formatCurrency(grossRevenue)}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-400">Operational Expenses (NPCs)</span>
                <span className="font-semibold text-yellow-400">-{formatCurrency(npcExpenses)}</span>
            </div>
            {perfectionExpenses > 0 && (
                 <div className="flex justify-between">
                    <span className="text-gray-400">Perfection Expenses (S-Pets)</span>
                    <span className="font-semibold text-red-400">-{formatCurrency(perfectionExpenses)}</span>
                </div>
            )}
            <div className="border-t border-gray-700 my-2"></div>
             <div className="flex justify-between text-base">
                <span className="font-bold text-gray-200">Est. Net Profit</span>
                <span className={`font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-red-500'}`}>{formatCurrency(netProfit)}</span>
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ 
    houses, warehouseItems, cashBalance, setCashBalance, 
    cycleTimes, prices, checkinTimes, collectedPets, onPerfectionAttempt 
}) => {
    const [analytics, setAnalytics] = useState<{ 
        alerts: string[], 
        nextAction: string, 
        projectedProfit: ProjectedProfit 
    }>({ 
        alerts: [], 
        nextAction: '', 
        projectedProfit: { grossRevenue: 0, npcExpenses: 0, perfectionExpenses: 0, netProfit: 0, sPetsPerWeek: 0 } 
    });

    useEffect(() => {
        const data = generateDashboardAnalytics(houses, warehouseItems, cycleTimes, prices, checkinTimes);
        setAnalytics(data);
    }, [houses, warehouseItems, cycleTimes, prices, checkinTimes]);

    const champion = houses.find(h => h.division === Division.CHAMPION); 
    const availableSPets = collectedPets.find(p => p.petType === NpcType.S)?.quantity || 0;

    const renderPanel = (title: string, icon: React.ReactNode, children: React.ReactNode) => (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
                {icon}
                <h3 className="ml-3 text-lg font-semibold text-cyan-400">{title}</h3>
            </div>
            {children}
        </div>
    );
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Main Stats */}
            <div className="lg:col-span-1 xl:col-span-1 space-y-6">
                <div className="bg-gray-800 rounded-lg shadow-lg p-6 text-center">
                    <p className="text-gray-400 text-sm font-medium">Cash Balance</p>
                    <EditableCashBalance balance={cashBalance} onSave={setCashBalance} />
                </div>
                 <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <p className="text-gray-400 text-sm font-medium mb-2 text-center">Projected Weekly Profit</p>
                    <ProfitBreakdown profitData={analytics.projectedProfit} />
                </div>
            </div>

            {/* Panels */}
            <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {renderPanel("At a Glance Warehouse", <WarehouseIcon />, 
                    <ul className="space-y-2 text-sm">
                        {warehouseItems.map(item => (
                            <li key={item.id} className="flex justify-between">
                                <span>{item.name}:</span>
                                <span className={`font-semibold ${item.currentStock < item.safetyStockLevel ? 'text-red-400' : 'text-gray-200'}`}>{item.currentStock}</span>
                            </li>
                        ))}
                    </ul>
                )}
                
                {renderPanel("Next Action", <ClockIcon />,
                    <p className="text-cyan-300 font-semibold">{analytics.nextAction}</p>
                )}

                {renderPanel("Critical Alerts", <AlertIcon />, 
                    analytics.alerts.length > 0 ? (
                         <ul className="space-y-2 text-sm">
                            {analytics.alerts.map((alert, i) => <li key={i} className="text-yellow-400">{alert}</li>)}
                        </ul>
                    ) : <p className="text-gray-400">No critical alerts.</p>
                )}

                {renderPanel("Champion's Journey", <ChampionIcon />, champion ? (
                        <div className="text-sm space-y-3">
                           <div className="flex justify-between items-center">
                               <span>Perfection Attempts:</span>
                               <span className="font-bold text-lg text-purple-400">{champion.perfectionAttempts}</span>
                           </div>
                           <div className="flex justify-between items-center">
                               <span>S-Pets Available:</span>
                               <span className="font-bold text-lg text-gray-200">{availableSPets}</span>
                           </div>
                           <button 
                                onClick={onPerfectionAttempt}
                                disabled={availableSPets === 0}
                                className={`w-full mt-2 font-bold py-2 px-4 rounded transition-colors ${
                                    availableSPets > 0 
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                           >
                               Attempt Perfection
                           </button>
                        </div>
                    ) : <p>Champion house not assigned.</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;