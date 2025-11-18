
import React from 'react';
import { View } from '../types';
import { DashboardIcon, BriefingIcon, FactoryIcon, WarehouseIcon, DollarIcon, HelpIcon, SettingsIcon, PlaygroundIcon, SaveIcon } from './icons/Icons';

interface HeaderProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
  onSaveLoadClick: () => void;
  isInExampleMode: boolean;
  onEnterExampleMode: () => void;
  onExitExampleMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    currentView, 
    setCurrentView, 
    onHelpClick, 
    onSettingsClick,
    onSaveLoadClick,
    isInExampleMode,
    onEnterExampleMode,
    onExitExampleMode,
}) => {
  const navItems = [
    { view: View.DASHBOARD, label: 'Dashboard', icon: <DashboardIcon /> },
    { view: View.DAILY_BRIEFING, label: 'Daily Briefing', icon: <BriefingIcon /> },
    { view: View.FACTORY_FLOOR, label: 'Factory Floor', icon: <FactoryIcon /> },
    { view: View.WAREHOUSE, label: 'Warehouse', icon: <WarehouseIcon /> },
    { view: View.PET_SALES, label: 'Pet Sales', icon: <DollarIcon /> },
  ];

  return (
    <header className="bg-gray-800 shadow-lg sticky top-0 z-40">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-lg md:text-2xl font-bold text-cyan-400 truncate">Flyff Pet Studio</h1>
          </div>
          <div className="flex items-center">
            <nav className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navItems.map(item => (
                  <button
                    key={item.view}
                    onClick={() => setCurrentView(item.view)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      currentView === item.view
                        ? 'bg-cyan-500 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </button>
                ))}
              </div>
            </nav>
            <div className="flex items-center ml-2 sm:ml-4">
                 <button
                    onClick={isInExampleMode ? onExitExampleMode : onEnterExampleMode}
                    className={`flex items-center px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                      isInExampleMode 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                    aria-label={isInExampleMode ? "Exit Playground Mode" : "Enter Playground Mode"}
                  >
                    <PlaygroundIcon />
                    <span className="ml-2 hidden sm:inline">{isInExampleMode ? 'Exit' : 'Playground'}</span>
                </button>
                <button
                  onClick={onSaveLoadClick}
                  className="ml-1 sm:ml-2 p-2 rounded-full text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Save or Load State"
                  disabled={isInExampleMode}
                >
                  <SaveIcon />
                </button>
                <button
                onClick={onSettingsClick}
                className="ml-1 sm:ml-2 p-2 rounded-full text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                aria-label="Operational Schedule Settings"
                >
                <SettingsIcon />
                </button>
                <button
                onClick={onHelpClick}
                className="ml-1 sm:ml-2 p-2 rounded-full text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                aria-label="Help and Strategy Guide"
                >
                <HelpIcon />
                </button>
            </div>
          </div>
        </div>
      </div>
       <nav className="md:hidden bg-gray-800 border-t border-gray-700 overflow-x-auto no-scrollbar">
            <div className="px-2 pt-2 pb-3 flex space-x-2 min-w-max">
              {navItems.map(item => (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  className={`flex flex-col items-center justify-center flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    currentView === item.view
                      ? 'bg-cyan-500 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="mt-1 text-xs whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
    </header>
  );
};

export default Header;
