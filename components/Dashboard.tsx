import React, { useState, useEffect } from 'react';
import { House, WarehouseItem, CycleTime, PriceConfig, Division, NpcType, ProjectedProfit, CollectedPet, DashboardAnalytics } from '../types';
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
                className="w-full bg-gray-700 text-green-400 text-xl sm:text-3xl font-bold text-center rounded-md outline-none py-1"
                autoFocus
            />
        );
    }

    return (
        <p onClick={() => setIsEditing(true)} className="text-xl sm:text-3xl font-bold text-green-400 mt-1 cursor-pointer truncate" title="Click to edit">
            ${balance.toLocaleString()}
        </p>
    );
};

const ProfitBreakdown: React.FC<{ profitData: ProjectedProfit, title: string, subTitle: string }> = ({ profitData, title, subTitle }) => {
    const { grossRevenue, grossRevenueAlternativeA, npcExpenses, perfectionExpenses, netProfit, sPetsCount } = profitData;
    
    const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;

    return (
        <div className="bg-gray-900/40 p-2 sm:p-3 rounded-lg border border-gray-700 flex flex-col h-full">
            <div className="mb-2">
                <h4 className="text-cyan-400 font-bold text-sm">{title}</h4>
                <p className="text-gray-500 text-[9px] sm:text-[10px] leading-tight">{subTitle}</p>
            </div>
            
            <div className="space-y-1 text-[11px] sm:text-sm flex-grow">
                <div className="flex justify-between">
                    <span className="text-gray-400">Rev ({Math.round(sPetsCount)} S)</span>
                    <span className="font-semibold text-green-400">{formatCurrency(grossRevenue)}</span>
                </div>
                {grossRevenueAlternativeA !== undefined && (
                    <div className="flex justify-between text-[10px] sm:text-xs -mt-1 mb-1">
                         <span className="text-gray-500 pl-2">↳ Or Sell as A:</span>
                         <span className="text-gray-400">{formatCurrency(grossRevenueAlternativeA)}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-gray-400">NPC Costs</span>
                    <span className="font-semibold text-yellow-400">-{formatCurrency(npcExpenses)}</span>
                </div>
                 {perfectionExpenses > 0 && (
                     <div className="flex justify-between">
                        <span className="text-gray-400">Perfection</span>
                        <span className="font-semibold text-red-400">-{formatCurrency(perfectionExpenses)}</span>
                    </div>
                )}
            </div>

            <div className="border-t border-gray-700 my-2"></div>
             <div className="flex justify-between text-[11px] sm:text-sm items-center">
                <span className="font-bold text-gray-300">Net Profit</span>
                <span className={`font-bold text-sm sm:text-base ${netProfit >= 0 ? 'text-blue-400' : 'text-red-500'}`}>{formatCurrency(netProfit)}</span>
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ 
    houses, warehouseItems, cashBalance, setCashBalance, 
    cycleTimes, prices, checkinTimes, collectedPets, onPerfectionAttempt 
}) => {
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);

    useEffect(() => {
        const data = generateDashboardAnalytics(houses, warehouseItems, cycleTimes, prices, checkinTimes);
        setAnalytics(data);
    }, [houses, warehouseItems, cycleTimes, prices, checkinTimes]);

    const champion = houses.find(h => h.division === Division.CHAMPION); 
    const availableSPets = collectedPets.find(p => p.petType === NpcType.S)?.quantity || 0;

    const renderPanel = (title: string, icon: React.ReactNode, children: React.ReactNode, className: string = "") => (
        <div className={`bg-gray-800 rounded-lg shadow-lg p-3 flex flex-col ${className}`}>
            <div className="flex items-center mb-2 border-b border-gray-700 pb-2">
                {icon}
                <h3 className="ml-2 text-sm font-semibold text-cyan-400 truncate">{title}</h3>
            </div>
            <div className="flex-grow">
                {children}
            </div>
        </div>
    );
    
    return (
        <div className="flex flex-col gap-3">
            {/* Top Section: Cash & Projections */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Cash - Compact vertical */}
                <div className="lg:col-span-3 bg-gray-800 rounded-lg shadow-lg p-3 flex flex-col justify-center items-center text-center min-h-[auto] py-4">
                    <p className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Current Cash Balance</p>
                    <EditableCashBalance balance={cashBalance} onSave={setCashBalance} />
                </div>
                
                {/* Projections */}
                <div className="lg:col-span-9 bg-gray-800 rounded-lg shadow-lg p-3">
                     <div className="flex items-center mb-2">
                        <h3 className="text-sm font-bold text-white">Financial Projections</h3>
                    </div>
                    {analytics && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 h-full">
                            <ProfitBreakdown 
                                title="Actual (Next 7 Days)" 
                                subTitle="Based on active timers."
                                profitData={analytics.actualNext7Days} 
                            />
                            <ProfitBreakdown 
                                title="Max Capacity (Weekly)" 
                                subTitle="Theoretical max @ 24/7."
                                profitData={analytics.theoreticalMaxWeekly} 
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section: Panels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                 {renderPanel("At a Glance Warehouse", <WarehouseIcon />, 
                    <ul className="space-y-1 text-[11px] sm:text-sm">
                        {warehouseItems.map(item => (
                            <li key={item.id} className="flex justify-between items-center">
                                <span className="truncate mr-2">{item.name.replace(' (Purchased)', '').replace(' (Awaiting', '').replace(')', '')}:</span>
                                <span className={`font-semibold ${item.currentStock < item.safetyStockLevel ? 'text-red-400' : 'text-gray-200'}`}>{item.currentStock}</span>
                            </li>
                        ))}
                    </ul>
                )}
                
                {renderPanel("Next Action", <ClockIcon />,
                    <p className="text-cyan-300 font-bold text-base sm:text-lg leading-tight">{analytics?.nextAction || '...'}</p>
                )}

                {renderPanel("Critical Alerts", <AlertIcon />, 
                    (analytics?.alerts.length || 0) > 0 ? (
                         <ul className="space-y-1 text-[11px] sm:text-sm">
                            {analytics?.alerts.map((alert, i) => <li key={i} className="text-yellow-400 leading-tight">• {alert}</li>)}
                        </ul>
                    ) : <p className="text-gray-500 text-xs italic">No critical alerts.</p>
                )}

                {renderPanel("Champion's Journey", <ChampionIcon />, champion ? (
                        <div className="text-[11px] sm:text-sm space-y-2">
                           <div className="flex justify-between items-center">
                               <span>Attempts:</span>
                               <span className="font-bold text-sm sm:text-base text-purple-400">{champion.perfectionAttempts}</span>
                           </div>
                           <div className="flex justify-between items-center">
                               <span>S-Pets:</span>
                               <span className="font-bold text-sm sm:text-base text-gray-200">{availableSPets}</span>
                           </div>
                           <button 
                                onClick={onPerfectionAttempt}
                                disabled={availableSPets === 0}
                                className={`w-full mt-1 font-bold py-1.5 px-3 rounded transition-colors text-xs sm:text-sm ${
                                    availableSPets > 0 
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                           >
                               Attempt Perfection
                           </button>
                        </div>
                    ) : <p className="text-gray-500 text-xs italic">Champion house not assigned.</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;