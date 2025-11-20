
import React from 'react';

interface ExampleModeControlsProps {
  onSelectScenario: (scenarioKey: string) => void;
  simulatedTime: number | null;
  onSkipToCheckin: (direction: 'forward' | 'backward') => void;
  onTimeTravel: (amount: number, unit: 'day' | 'week') => void;
}

const ExampleModeControls: React.FC<ExampleModeControlsProps> = ({ 
    onSelectScenario, 
    simulatedTime, 
    onSkipToCheckin, 
    onTimeTravel 
}) => {
  
  const scenarios = [
    { key: 'CURRENT', label: 'Current Live Setup' },
    { key: 'EXAMPLE_2', label: 'Preset: 2-House Startup' },
    { key: 'EXAMPLE_13', label: 'Preset: 13-House Cash Engine' },
    { key: 'EXAMPLE_26', label: 'Preset: 26-House Expansion' },
    { key: 'EXAMPLE_71', label: 'Preset: 71-House Trifecta' },
  ];
  
  const TimeControlButton: React.FC<{onClick: () => void, children: React.ReactNode, label: string}> = ({onClick, children, label}) => (
    <button
      onClick={onClick}
      className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-2 py-1 text-[10px] sm:text-xs rounded transition-colors flex items-center justify-center min-w-[30px]"
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-purple-900/90 backdrop-blur-sm text-white p-1 shadow-lg sticky top-16 z-30 border-b border-purple-500/30 w-full">
      <div className="max-w-full mx-auto px-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Left: Label & Dropdown */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-bold text-xs text-purple-200 uppercase tracking-wider hidden sm:inline">Playground:</span>
            <select 
                className="bg-purple-800 text-white text-xs rounded border border-purple-600 px-2 py-1 outline-none focus:ring-1 focus:ring-purple-400 max-w-[150px] sm:max-w-none"
                onChange={(e) => onSelectScenario(e.target.value)}
                defaultValue=""
            >
                <option value="" disabled>Select Scenario...</option>
                {scenarios.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                ))}
            </select>
          </div>

          {/* Right: Time Controls */}
          <div className="flex flex-wrap items-center gap-1 flex-grow justify-end">
            <TimeControlButton onClick={() => onTimeTravel(-1, 'week')} label="Back one week">{'<< W'}</TimeControlButton>
            <TimeControlButton onClick={() => onTimeTravel(-1, 'day')} label="Back one day">{'< D'}</TimeControlButton>
            <TimeControlButton onClick={() => onSkipToCheckin('backward')} label="Back one check-in">{'< C'}</TimeControlButton>
            
            <div className="bg-black/40 rounded px-2 py-1 text-center min-w-[100px] sm:min-w-[120px]">
              <span className="font-mono text-xs text-purple-100 block leading-none">
                  {simulatedTime ? new Date(simulatedTime).toLocaleDateString() : 'Date'}
              </span>
              <span className="font-mono text-xs font-bold text-white block leading-none mt-0.5">
                  {simulatedTime ? new Date(simulatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Time'}
              </span>
            </div>

            <TimeControlButton onClick={() => onSkipToCheckin('forward')} label="Forward one check-in">{'> C'}</TimeControlButton>
            <TimeControlButton onClick={() => onTimeTravel(1, 'day')} label="Forward one day">{'> D'}</TimeControlButton>
            <TimeControlButton onClick={() => onTimeTravel(1, 'week')} label="Forward one week">{'W >>'}</TimeControlButton>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ExampleModeControls;
