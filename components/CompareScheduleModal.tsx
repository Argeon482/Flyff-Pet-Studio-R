import React, { useMemo } from 'react';
import { House, CycleTime, PriceConfig, ProjectedProfit } from '../types';
import { calculateProjectedProfit } from '../services/geminiService';
import { DEFAULT_CHECKIN_TIMES } from '../constants';

interface CompareScheduleModalProps {
    onClose: () => void;
    userSchedule: number[];
    houses: House[];
    cycleTimes: CycleTime[];
    prices: PriceConfig;
}

const BreakdownRow: React.FC<{ label: string, data: ProjectedProfit, idealData: ProjectedProfit, field: keyof Omit<ProjectedProfit, 'sPetsPerWeek' | 'netProfit'>, isGood?: boolean }> = 
({ label, data, idealData, field, isGood = true }) => {
    const userValue = data[field] as number;
    const idealValue = idealData[field] as number;
    const difference = userValue - idealValue;

    const formatCurrency = (val: number) => `$${Math.round(val).toLocaleString()}`;
    const diffColor = (difference >= 0 && isGood) || (difference < 0 && !isGood) ? 'text-green-400' : 'text-red-400';
    const diffSign = difference > 0 ? '+' : '';

    return (
        <>
            <div className="text-gray-400 text-sm text-right pr-2">{label}</div>
            <div className="text-md font-semibold">{formatCurrency(userValue)}</div>
            <div className="text-md font-semibold">{formatCurrency(idealValue)}</div>
            <div className={`text-md font-bold ${diffColor}`}>{`${diffSign}${formatCurrency(difference)}`}</div>
        </>
    );
};


const CompareScheduleModal: React.FC<CompareScheduleModalProps> = ({ onClose, userSchedule, houses, cycleTimes, prices }) => {
    
    const userAnalytics = useMemo(() => {
        return calculateProjectedProfit(houses, cycleTimes, prices, userSchedule);
    }, [houses, cycleTimes, prices, userSchedule]);

    const idealAnalytics = useMemo(() => {
        return calculateProjectedProfit(houses, cycleTimes, prices, DEFAULT_CHECKIN_TIMES);
    }, [houses, cycleTimes, prices]);

    const renderStat = (label: string, userValue: number, idealValue: number) => {
        const difference = userValue - idealValue;
        const diffColor = difference >= 0 ? 'text-green-400' : 'text-red-400';
        const diffSign = difference > 0 ? '+' : '';

        return (
            <>
                <div className="text-gray-300 font-semibold">{label}</div>
                <div className="text-lg font-bold">{userValue.toFixed(2)}</div>
                <div className="text-lg font-bold">{idealValue.toFixed(2)}</div>
                <div className={`text-lg font-bold ${diffColor}`}>{`${diffSign}${difference.toFixed(2)}`}</div>
            </>
        )
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-cyan-400">Schedule Performance Comparison</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </header>
                <main className="p-6">
                    <div className="grid grid-cols-4 gap-x-4 gap-y-3 text-center mb-6">
                        {/* Headers */}
                        <div></div>
                        <div className="font-bold text-cyan-400 text-xl border-b border-cyan-700 pb-2">Your Schedule</div>
                        <div className="font-bold text-purple-400 text-xl border-b border-purple-700 pb-2">Ideal 3-Shift</div>
                        <div className="font-bold text-gray-300 text-xl border-b border-gray-600 pb-2">Difference</div>

                        {/* Data Rows */}
                        {renderStat("S-Pets / Week", userAnalytics.sPetsPerWeek, idealAnalytics.sPetsPerWeek)}

                        {/* Profit Breakdown Section */}
                        <div className="col-span-4 border-t border-gray-700 my-3"></div>
                        <div className="col-span-4 text-left text-lg font-bold text-gray-200 mb-2">Financial Breakdown</div>
                        
                        <BreakdownRow label="Gross Revenue" data={userAnalytics} idealData={idealAnalytics} field="grossRevenue" />
                        <BreakdownRow label="NPC Expenses" data={userAnalytics} idealData={idealAnalytics} field="npcExpenses" isGood={false} />
                        { (userAnalytics.perfectionExpenses > 0 || idealAnalytics.perfectionExpenses > 0) &&
                           <BreakdownRow label="Perfection Exp." data={userAnalytics} idealData={idealAnalytics} field="perfectionExpenses" isGood={false} />
                        }

                        <div className="col-span-4 border-t border-gray-600 my-2"></div>
                        <div className="text-gray-200 font-bold text-right pr-2">Net Profit</div>
                        <div className="text-xl font-extrabold text-blue-400">${Math.round(userAnalytics.netProfit).toLocaleString()}</div>
                        <div className="text-xl font-extrabold text-blue-400">${Math.round(idealAnalytics.netProfit).toLocaleString()}</div>
                        <div className={`text-xl font-extrabold ${userAnalytics.netProfit >= idealAnalytics.netProfit ? 'text-green-400' : 'text-red-400'}`}>
                            {userAnalytics.netProfit - idealAnalytics.netProfit > 0 ? '+' : ''}${Math.round(userAnalytics.netProfit - idealAnalytics.netProfit).toLocaleString()}
                        </div>

                    </div>
                    <div className="text-sm text-gray-400 mt-4 text-center">
                        <p>This comparison shows the financial impact of your schedule. Fewer check-ins lead to more production 'idle time', reducing overall output and profit.</p>
                        <p className="mt-2">The "Ideal 3-Shift" schedule (9am, 3pm, 9pm) is designed to maximize efficiency and is the basis of the strategy blueprint.</p>
                    </div>
                </main>
                <footer className="p-4 bg-gray-900/50 text-right">
                    <button onClick={onClose} className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default CompareScheduleModal;