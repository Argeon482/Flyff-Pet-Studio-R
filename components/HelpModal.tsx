import React, { useState } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

const HelpSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-xl font-bold text-cyan-400 border-b-2 border-gray-600 pb-2 mb-3">{title}</h3>
        <div className="space-y-2 text-gray-300">{children}</div>
    </div>
);

const HelpContent: React.FC = () => (
    <>
      <HelpSection title="Saving & Transferring Your State">
        <p>Your progress is handled in two ways: automatic session saving and manual code backups.</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>Automatic Session Saving:</strong> The app automatically saves your current state to your browser's local storage. You can close the tab or browser, and your factory will be exactly as you left it when you return on the same device.</li>
            <li><strong>Backup & Transfer (Save/Load Codes):</strong> For long-term backups or to move your factory to another device, use the Save/Load feature (floppy disk icon in the header).
                <ul className="list-disc list-inside space-y-1 pl-6 mt-1 text-sm">
                    <li><strong>Generate Code:</strong> This creates a unique text code representing your entire factory. Copy this code and save it in a text file or notes app.</li>
                    <li><strong>Load from Code:</strong> Paste a previously saved code to restore your factory to that state. <strong>Warning:</strong> This will overwrite your current session.</li>
                </ul>
            </li>
        </ul>
      </HelpSection>
      <HelpSection title="Dashboard">
        <p>Your central command. It provides a real-time overview of your empire's key metrics.</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>Cash Balance:</strong> Your current liquid assets. Click the number to edit it directly.</li>
            <li><strong>Projected Weekly Profit:</strong> An estimate of your net profit based on your current factory configuration, market prices, and NPC costs.</li>
            <li><strong>At a Glance Warehouse:</strong> A quick summary of all your inventory levels.</li>
            <li><strong>Next Action:</strong> Tells you which Service Block has a pet finishing next and at what time.</li>
            <li><strong>Critical Alerts:</strong> Warns you about low stock levels or NPCs that are about to expire.</li>
            <li><strong>Champion's Journey:</strong> Tracks the progress of the pet in your designated "Champion Pet" house.</li>
        </ul>
      </HelpSection>
      <HelpSection title="Daily Briefing">
        <p>This is your primary action screen, divided into two key sections for managing your 3 daily check-ins (9 AM, 3 PM, 9 PM).</p>
        <h4 className="font-semibold text-lg text-gray-200 mt-4 mb-2">1. Due Now & Overdue</h4>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li>This is an <strong>interactive checklist</strong> for all pets that have finished training.</li>
            <li><strong>IMPORTANT:</strong> You must complete these tasks in the <strong>order they are presented.</strong></li>
            <li>The list is intelligently sorted to ensure the most efficient workflow (e.g., clearing high-rank slots first).</li>
            <li>Only the top-most, highest-priority task is active. All others are disabled. As you complete one, the next becomes available.</li>
            <li>Checking a box automates the entire process: moving the pet, updating the warehouse, and auto-restocking the empty slot if materials are available.</li>
        </ul>
        <h4 className="font-semibold text-lg text-gray-200 mt-4 mb-2">2. Upcoming for Next Check-in</h4>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li>This is a <strong>read-only plan</strong> showing all pets that will finish before your next scheduled check-in.</li>
            <li>Use this to anticipate your workload for the next session.</li>
        </ul>
      </HelpSection>
      <HelpSection title="Factory Floor">
        <p>This is where you build and configure your entire production empire.</p>
         <h4 className="font-semibold text-lg text-gray-200 mt-4 mb-2">House Management</h4>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>Add/Remove House:</strong> Use the buttons to expand or shrink your factory.</li>
            <li><strong>Division:</strong> Assign each house to a strategic role (Champion, Nursery, or Factory) using the dropdown.</li>
            <li><strong>Service Block:</strong> This is calculated <strong>automatically</strong> based on the house's division to ensure a balanced workload for your 3-shift system. You don't need to manage this.</li>
        </ul>
        <h4 className="font-semibold text-lg text-gray-200 mt-4 mb-2">NPC & Pet Slot Management</h4>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>NPC Type:</strong> Select an NPC type for each slot. The app enforces the "one type per house" rule by disabling options that are already in use in that house.</li>
            <li><strong>NPC Expiration:</strong> This is tracked <strong>automatically.</strong> The 15-day countdown begins the first time you use an NPC to train a pet.</li>
            <li><strong>Pet Timers:</strong> You have three ways to manage timers:
                {/* FIX: Updated help text to match implemented behavior (double-click to start, "by %" button for progress) */}
                <ul className="list-disc list-inside space-y-1 pl-6 mt-1 text-sm">
                    <li><strong>Double-click `Start`:</strong> Starts the timer from the beginning. Click once to prime, then again within 2 seconds to confirm.</li>
                    <li><strong>Click `by %`:</strong> Opens a popup to set the pet's current progress as a percentage. Perfect for syncing pets that were already running.</li>
                    <li><strong>Triple-Tap a Running Timer:</strong> Instantly completes the timer. Useful for testing or correcting mistakes.</li>
                </ul>
            </li>
        </ul>
      </HelpSection>
      <HelpSection title="Warehouse & Pet Sales">
        <p>Manage your inventory, finances, and market prices.</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>Warehouse:</strong> Directly edit your current and safety stock levels for all items. The inventory includes purchased raw materials (F-Pets) and Work-in-Progress (WIP) pets produced by your factory.</li>
            <li><strong>Pet Sales & Config:</strong>
                <ul className="list-disc list-inside space-y-1 pl-6 mt-1 text-sm">
                    <li><strong>Market Config:</strong> Click any price to edit it. This is where you set sale prices for produced pets, the purchase price for F-Pets, and the recurring cost of your NPCs.</li>
                    <li><strong>Inventory:</strong> Sell your finished S-Pets from the collected inventory.</li>
                    <li><strong>Sales Ledger:</strong> A complete history of all your sales transactions is recorded here for analysis.</li>
                </ul>
            </li>
        </ul>
      </HelpSection>
    </>
);

const StrategyContent: React.FC = () => (
     <>
        <HelpSection title="Part 1: The Philosophy - The Path of the Industrialist">
            <p>Your journey is a grand campaign in three acts, guided by one principle: <strong>Profit Fuels Power.</strong></p>
            <ol className="list-decimal list-inside space-y-1 pl-4">
                <li><strong>Act I: The Cash Engine.</strong> Build a hyper-efficient, 13-house factory designed for one purpose: to generate a massive, reliable stream of cash profit.</li>
                <li><strong>Act II: The Compounding Expansion.</strong> Use colossal profits to aggressively expand, building more identical cash engines.</li>
                <li><strong>Act III: The Grand Re-Specialization.</strong> Pivot your entire industrial empire into a legendary "Perfection Engine," to achieve the "Perfect Pet."</li>
            </ol>
        </HelpSection>
        
        <HelpSection title="Part 2: The Core Concepts">
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li><strong>The "Decent Pet":</strong> An S-Rank pet with lucky high-end stats (e.g., `1/1/2/3/7/8`). The primary profit target.</li>
                <li><strong>The "Perfect Pet":</strong> The legendary `1/2/3/4/5/7/9` stat progression. A multi-month, multi-billion currency project.</li>
                <li><strong>The "Perfection Journey":</strong> Rerolling a "Champion" pet's stats with "sacrifice" pets at each rank.</li>
                <li><strong>The "House Uniqueness Constraint":</strong> You can only have <strong>one of each type of NPC per house.</strong></li>
            </ul>
        </HelpSection>

        <HelpSection title="Part 3: Act I - Building Your 13-House A-Rank Cash Engine">
            <p><strong>Required Starting Capital:</strong> 490 Million. Follow the 18-Day Startup Plan by reinvesting 100% of profits to expand from 2 to 13 houses.</p>
            <p><strong>Daily Schedule (3-Shift System):</strong> Manage pet flow at <strong>9 AM, 3 PM, and 9 PM</strong> to keep all NPC slots active 24/7.</p>
            <p><strong>Final Configuration ("Industrial Pod"):</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li><strong>Houses 1-9 (Main Line):</strong> 9x houses, each with `D | C | B` NPCs.</li>
                <li><strong>Houses 10-13 (Nursery Engine):</strong> H10: `F|E|D` | H11: `F|E|C` | H12: `F|E|B` | H13: `F|E|Flex`</li>
            </ul>
            <p>This generates a stable net profit of <strong>~1.13 Billion per week.</strong></p>
        </HelpSection>

        <HelpSection title="Part 4: Act II - The Compounding Expansion">
            <p><strong>Strategy:</strong> Pure capital growth by replicating your 13-house "Industrial Pod."</p>
            <ol className="list-decimal list-inside space-y-1 pl-4">
                <li>Run your 13-house factory at maximum capacity.</li>
                <li>When you accumulate 100m in profit, buy a new house plot.</li>
                <li>Build in Pods of 13 houses (13 → 26 → 39 → 52 → etc.).</li>
            </ol>
             <p>Implement the <strong>Master Rotational Schedule</strong> as you expand to keep daily workload manageable.</p>
        </HelpSection>

        <HelpSection title="Part 5: Act III - The Grand Re-Specialization">
            <p>Execute this endgame pivot when the A-pet market price falls to ~45m, or you've reached your desired scale (e.g., 71 houses).</p>
            <p><strong>The Final Blueprint (The "Trifecta"):</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li><strong>Division 1: The Artisan's Workshop (1 House):</strong> The "clean room" for your single "Champion" pet (`F|E|D`).</li>
                <li><strong>Division 2: The Mid-Grade Armory (~20 Houses):</strong> Your on-demand fodder warehouse for E, D, C, B, and A-rank sacrifices.</li>
                <li><strong>Division 3: The S-Rank Sacrifice Forge (~50 Houses):</strong> Your new cash flow engine, mass-producing baseline S-Ranks.</li>
            </ul>
            <p>The empire becomes cash-flow-positive, generating a net operating profit of <strong>~3.84 Billion per month</strong> to fund the "Perfection Journey."</p>
        </HelpSection>

         <HelpSection title="Part 6: The Complete Operational Schedule">
            <p>Your three daily check-ins are: <strong>9 AM, 3 PM, and 9 PM.</strong></p>
            <h4 className="font-semibold text-lg text-gray-200 mt-4 mb-2">The Cash Engine Phase (13 Houses)</h4>
            <p>The Main Line (9 houses) is split into 3 blocks (A, B, C). The Nursery Engine (4 houses) is one block.</p>
             <ul className="list-disc list-inside space-y-1 pl-4">
                <li><strong>9 AM:</strong> Service Main Line Block A & Nurseries.</li>
                <li><strong>3 PM:</strong> Service Main Line Block B & quick Nursery check.</li>
                <li><strong>9 PM:</strong> Service Main Line Block C & final Nursery service.</li>
            </ul>

            <h4 className="font-semibold text-lg text-gray-200 mt-4 mb-2">The Behemoth Phase (71 Houses)</h4>
            <p><strong>The Armory (~20 Houses):</strong> Split into 3 blocks.</p>
             <ul className="list-disc list-inside space-y-1 pl-4">
                <li><strong>9 AM:</strong> Armory Block A (7 Houses).</li>
                <li><strong>3 PM:</strong> Armory Block B (7 Houses).</li>
                <li><strong>9 PM:</strong> Armory Block C (6 Houses).</li>
            </ul>
             <p><strong>The Forge (~49 Houses):</strong> Split into 7 daily blocks of 7 houses each (e.g., "Monday Block", "Tuesday Block").</p>
             <p className="mt-2"><strong>Example Day (Tuesday):</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li><strong>9 AM:</strong> Service Forge "Tuesday Block" (7 houses) & Armory Block A (7 houses). Quick check on Artisan's Workshop.</li>
                <li><strong>3 PM:</strong> Service Armory Block B (7 houses).</li>
                <li><strong>9 PM:</strong> Service Armory Block C (6 houses). Final check on Artisan's Workshop.</li>
            </ul>
            <p className="mt-2">This schedule keeps total daily management time around <strong>45-60 minutes,</strong> split into three stress-free sessions.</p>
        </HelpSection>
    </>
);


const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('help');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-2xl font-bold text-cyan-400">Help &amp; Strategy</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </header>

        <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <nav className="flex space-x-2 sm:space-x-4">
                <button
                    onClick={() => setActiveTab('help')}
                    className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                        activeTab === 'help'
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                >
                    How to Use
                </button>
                <button
                    onClick={() => setActiveTab('strategy')}
                    className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                        activeTab === 'strategy'
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                >
                    Strategy Blueprint
                </button>
            </nav>
        </div>

        <main className="p-6 overflow-y-auto">
            {activeTab === 'help' ? <HelpContent /> : <StrategyContent />}
        </main>
      </div>
    </div>
  );
};

export default HelpModal;