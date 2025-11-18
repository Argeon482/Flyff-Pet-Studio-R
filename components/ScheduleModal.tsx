import React, { useState } from 'react';
import { House, CycleTime, PriceConfig } from '../types';
import CompareScheduleModal from './CompareScheduleModal';

interface ScheduleModalProps {
    onClose: () => void;
    checkinTimes: number[];
    onUpdateCheckinTimes: (times: number[]) => void;
    houses: House[];
    cycleTimes: CycleTime[];
    prices: PriceConfig;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ onClose, checkinTimes, onUpdateCheckinTimes, houses, cycleTimes, prices }) => {
    const [newTime, setNewTime] = useState('');
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

    const handleAddTime = () => {
        const hour = parseInt(newTime, 10);
        if (!isNaN(hour) && hour >= 0 && hour <= 23 && !checkinTimes.includes(hour)) {
            onUpdateCheckinTimes([...checkinTimes, hour].sort((a, b) => a - b));
            setNewTime('');
        } else {
            alert('Please enter a unique hour between 0 and 23.');
        }
    };

    const handleRemoveTime = (timeToRemove: number) => {
        onUpdateCheckinTimes(checkinTimes.filter(t => t !== timeToRemove));
    };
    
    const formatHour = (hour: number) => {
        const h = hour % 12 === 0 ? 12 : hour % 12;
        const ampm = hour < 12 || hour === 24 ? 'AM' : 'PM';
        return `${h}:00 ${ampm}`;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-cyan-400">Operational Schedule</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </header>
                <main className="p-6">
                    <p className="text-sm text-gray-400 mb-4">Set your daily check-in times (0-23 hours). This schedule determines your 'Next Check-in' time in the Daily Briefing.</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {checkinTimes.map(time => (
                            <div key={time} className="flex items-center bg-gray-700 rounded-full px-3 py-1 text-sm">
                                <span>{formatHour(time)}</span>
                                <button onClick={() => handleRemoveTime(time)} className="ml-2 text-red-400 hover:text-red-300 font-bold">&times;</button>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 mb-6">
                        <input
                            type="number"
                            min="0"
                            max="23"
                            value={newTime}
                            onChange={e => setNewTime(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddTime()}
                            placeholder="Hour (0-23)"
                            className="w-32 bg-gray-700 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button onClick={handleAddTime} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1 px-3 rounded">Add Time</button>
                    </div>
                    <button onClick={() => setIsCompareModalOpen(true)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded">
                        Compare Schedules
                    </button>
                </main>
            </div>
            {isCompareModalOpen && <CompareScheduleModal 
                onClose={() => setIsCompareModalOpen(false)}
                userSchedule={checkinTimes}
                houses={houses}
                cycleTimes={cycleTimes}
                prices={prices}
            />}
        </div>
    );
};

export default ScheduleModal;