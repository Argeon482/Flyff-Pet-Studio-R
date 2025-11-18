import React, { useState } from 'react';
import { AppState } from '../types';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onLoadState: (state: AppState) => void;
}

const SaveLoadModal: React.FC<SaveLoadModalProps> = ({ isOpen, onClose, appState, onLoadState }) => {
  const [loadCode, setLoadCode] = useState('');
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  if (!isOpen) return null;

  // Create a save code (Base64 encoded JSON)
  const saveCode = btoa(JSON.stringify(appState));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(saveCode);
      setCopySuccess('Code copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      setError('Failed to copy code.');
    }
  };

  const handleLoad = () => {
    try {
      const decoded = atob(loadCode);
      const parsed = JSON.parse(decoded);
      
      // Basic validation to check if it looks like a state object
      if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid data format');
      }
      
      onLoadState(parsed as AppState);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Invalid save code. Please check and try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-cyan-400">Save / Load State</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </header>
        
        <main className="p-6 space-y-8">
          {/* Save Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Export Save Code</h3>
            <p className="text-sm text-gray-400 mb-3">
              Copy this code to back up your data or transfer it to another device.
            </p>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={saveCode} 
                className="w-full bg-gray-700 text-gray-300 text-sm rounded-md px-3 py-2 focus:outline-none"
                onFocus={(e) => e.target.select()}
              />
              <button 
                onClick={handleCopy}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
            {copySuccess && <p className="text-green-400 text-sm mt-2">{copySuccess}</p>}
          </div>

          <div className="border-t border-gray-700"></div>

          {/* Load Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Import Save Code</h3>
            <p className="text-sm text-gray-400 mb-3">
              Paste a valid save code here to restore your factory. <span className="text-red-400 font-bold">Warning: This will overwrite your current session.</span>
            </p>
            <textarea
              value={loadCode}
              onChange={(e) => {
                  setLoadCode(e.target.value);
                  setError('');
              }}
              placeholder="Paste save code here..."
              className="w-full bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 h-24 text-sm"
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <button 
              onClick={handleLoad}
              disabled={!loadCode}
              className={`w-full mt-4 font-bold py-2 px-4 rounded transition-colors ${
                  loadCode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Load State
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SaveLoadModal;