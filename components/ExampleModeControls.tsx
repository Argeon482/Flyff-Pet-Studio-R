
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
    { key: 'CURRENT', label: 'Current Setup' },
    { key: 'EXAMPLE_2', label: '2-House Start' },
    { key: 'EXAMPLE_13', label: '13-House Pod' },
    { key: 'EXAMPLE_26', label: '26-House Exp.' },
    { key: 'EXAMPLE_71', label: '71-House Full' },
  ];
  
  const TimeControlButton: React.FC<{onClick: () => void, children: React.ReactNode, label: string}> = ({onClick, children, label}) => (
    <button
      onClick={onClick}
      className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-1.5 py-0.5 text-[10px] rounded transition-colors flex items-center justify-center min-w-[24px]"
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-purple-900/95 backdrop-blur-sm text-white py-1 shadow-lg sticky top-16 z-30 border-b border-purple-500/30 w-full overflow-hidden">
      <div className="w-full px-1 sm:px-2">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          
          {/* Left: Dropdown */}
          <div className="flex-shrink-0">
            <select 
                className="bg-purple-800 text-white text-[10px] sm:text-xs rounded border border-purple-600 px-1 py-0.5 outline-none focus:ring-1 focus:ring-purple-400 w-24 sm:w-32"
                onChange={(e) => onSelectScenario(e.target.value)}
                defaultValue=""
            >
                <option value="" disabled>Scenario...</option>
                {scenarios.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                ))}
            </select>
          </div>

          {/* Right: Time Controls */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-grow justify-end overflow-x-auto no-scrollbar">
            <TimeControlButton onClick={() => onTimeTravel(-1, 'week')} label="Back 1 week">{'<<W'}</TimeControlButton>
            <TimeControlButton onClick={() => onTimeTravel(-1, 'day')} label="Back 1 day">{'<D'}</TimeControlButton>
            <TimeControlButton onClick={() => onSkipToCheckin('backward')} label="Back 1 checkin">{'<C'}</TimeControlButton>
            
            <div className="bg-black/40 rounded px-1.5 py-0.5 text-center min-w-[60px] flex flex-col items-center justify-center mx-0.5">
              <span className="font-mono text-[9px] text-purple-200 leading-none whitespace-nowrap">
                  {simulatedTime ? new Date(simulatedTime).toLocaleDateString(undefined, {month:'numeric', day:'numeric'}) : '--/--'}
              </span>
              <span className="font-mono text-[9px] font-bold text-white leading-none mt-0.5 whitespace-nowrap">
                  {simulatedTime ? new Date(simulatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
              </span>
            </div>

            <TimeControlButton onClick={() => onSkipToCheckin('forward')} label="Forward 1 checkin">{'C>'}</TimeControlButton>
            <TimeControlButton onClick={() => onTimeTravel(1, 'day')} label="Forward 1 day">{'D>'}</TimeControlButton>
            <TimeControlButton onClick={() => onTimeTravel(1, 'week')} label="Forward 1 week">{'W>>'}</TimeControlButton>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ExampleModeControls;
