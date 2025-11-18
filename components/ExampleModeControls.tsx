import React from 'react';
import * as examples from '../examples';

interface ExampleModeControlsProps {
  onSelectExample: (example: any) => void;
  simulatedTime: number | null;
  onSkipToCheckin: (direction: 'forward' | 'backward') => void;
  onTimeTravel: (amount: number, unit: 'day' | 'week') => void;
}

const ExampleModeControls: React.FC<ExampleModeControlsProps> = ({ 
    onSelectExample, 
    simulatedTime, 
    onSkipToCheckin, 
    onTimeTravel 
}) => {
  const exampleSetups = [
    { name: '2-House Startup', getData: examples.getExample2House },
    { name: '13-House "Cash Engine"', getData: examples.getExample13House },
    { name: '26-House Expansion', getData: examples.getExample26House },
    { name: '71-House "Trifecta"', getData: examples.getExample71House },
  ];
  
  const TimeControlButton: React.FC<{onClick: () => void, children: React.ReactNode, label: string}> = ({onClick, children, label}) => (
    <button
      onClick={onClick}
      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-1 px-2 text-xs rounded-md transition-colors flex items-center"
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-purple-800 text-white p-2 shadow-lg sticky top-16 z-30">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="font-bold text-lg">PLAYGROUND MODE</span>
            <span className="ml-2 text-sm opacity-80 hidden lg:inline">Your personal data is safe. Feel free to experiment!</span>
          </div>

          {/* Time Travel Controls */}
          <div className="flex items-center gap-2">
            <TimeControlButton onClick={() => onTimeTravel(-1, 'week')} label="Back one week">{'<< W'}</TimeControlButton>
            <TimeControlButton onClick={() => onTimeTravel(-1, 'day')} label="Back one day">{'< D'}</TimeControlButton>
            <TimeControlButton onClick={() => onSkipToCheckin('backward')} label="Back one check-in">{'< C'}</TimeControlButton>
            <div className="bg-gray-900/50 rounded-md px-3 py-1 text-center">
              <span className="font-mono text-sm">{simulatedTime ? new Date(simulatedTime).toLocaleString() : 'Loading...'}</span>
            </div>
            <TimeControlButton onClick={() => onSkipToCheckin('forward')} label="Forward one check-in">{'> C'}</TimeControlButton>
            <TimeControlButton onClick={() => onTimeTravel(1, 'day')} label="Forward one day">{'> D'}</TimeControlButton>
            <TimeControlButton onClick={() => onTimeTravel(1, 'week')} label="Forward one week">{'W >>'}</TimeControlButton>
          </div>
          
          {/* Example Loaders */}
          <div className="flex flex-wrap gap-2 justify-center">
            {exampleSetups.map(ex => (
              <button
                key={ex.name}
                onClick={() => onSelectExample(ex.getData())}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-1 px-3 text-xs rounded-md transition-colors"
              >
                Load: {ex.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExampleModeControls;