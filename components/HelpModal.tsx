
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
            <li><strong>Automatic Session Saving:</strong> The app automatically saves your current state to your browser's local storage. You can close the tab or browser, and your factory will be exactly as you left it.</li>
            <li><strong>Backup & Transfer (Save/Load Codes):</strong> For long-term backups or to move your factory to another device, use the Save/Load feature (floppy disk icon in the header).
                <ul className="list-disc list-inside space-y-1 pl-6 mt-1 text-sm">
                    <li><strong>Generate Code:</strong> This creates a unique text code representing your entire factory. Copy this code and save it safely.</li>
                    <li><strong>Load from Code:</strong> Paste a previously saved code to restore your factory. This system is version-proof; old codes will work even after app updates.</li>
                </ul>
            </li>
        </ul>
      </HelpSection>
      
      <HelpSection title="Dashboard Analytics">
        <p>Your central command provides a dual-view of your finances to help with cash flow management.</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>Cash Balance:</strong> Your current liquid assets. Click the number to edit it directly.</li>
            <li><strong>Actual Cash Flow (Next 7 Days):</strong> The real-world revenue you will generate based <em>strictly</em> on the timers currently running. Use this to plan immediate upgrades.</li>
            <li><strong>Max Capacity (Weekly):</strong> The theoretical maximum profit your factory <em>could</em> generate if every slot was running efficiently 24/7. Use this to measure potential.</li>
            <li><strong>Critical Alerts:</strong> Warns you about low stock levels or NPCs that are about to expire.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Daily Briefing: The Batch System">
        <p>The Briefing is your strategic guide. It groups individual tasks into efficient <strong>"House Batches"</strong> to minimize travel time in-game.</p>
        <h4 className="font-semibold text-lg text-gray-200 mt-4 mb-2">1. Due Now & Overdue</h4>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li>Tasks are grouped by <strong>Physical House</strong>. Instead of servicing one slot at a time, you service the entire house at once.</li>
            <li><strong>The Mission Workflow:</strong> Clicking a task opens a step-by-step guide:
                <ol className="list-decimal list-inside pl-6 mt-1 text-sm space-y-1">
                    <li><strong>Prep:</strong> Withdraw all necessary raw materials (F-Stock) from the Warehouse.</li>
                    <li><strong>Harvest:</strong> Go to the house and collect <em>all</em> finished pets.</li>
                    <li><strong>Upgrade:</strong> Go to the Tamer and upgrade all pets in one batch (e.g., F&rarr;E, E&rarr;D).</li>
                    <li><strong>Place/Finalize:</strong> Return to the house to place upgraded pets, or deposit extras into the Warehouse.</li>
                </ol>
            </li>
            <li><strong>Smart Routing:</strong> The app automatically calculates where pets go based on your Slot Modes and Virtual House configurations.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Factory Floor: Advanced Configuration">
        <p>Build your empire using powerful logical tools to manage complex layouts.</p>
        
        <h4 className="font-semibold text-lg text-gray-200 mt-4 mb-2">House Management</h4>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>Renaming:</strong> Click any House ID (e.g., "House #1") to give it a custom label (e.g., "Nursery A").</li>
            <li><strong>Service Blocks:</strong> Calculated automatically to ensure a balanced 3-shift workload (9 AM, 3 PM, 9 PM).</li>
        </ul>

        <h4 className="font-semibold text-lg text-gray-200 mt-4 mb-2">Slot Modes (The Chain System)</h4>
        <p className="text-sm mb-2">Every NPC slot has a "Link" toggle (Chain Icon) in the top-right corner.</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong><span className="text-green-400">🔗 Linked Mode (Default):</span></strong> Assumes a production line within the house. A finished pet flows to the <em>next slot in the same house</em>.</li>
            <li><strong><span className="text-purple-400">⛓️ Solo Mode:</span></strong> The slot is independent.
                <ul className="list-disc list-inside pl-6 mt-1 text-sm">
                    <li>If unassigned, the task will be <strong>"Harvest to Warehouse"</strong>.</li>
                    <li>If assigned to a <strong>Virtual House</strong>, it flows to the next slot in that virtual chain.</li>
                </ul>
            </li>
        </ul>

        <h4 className="font-semibold text-lg text-gray-200 mt-4 mb-2">Virtual Houses</h4>
        <p>Use this to stitch together production lines across different physical houses.</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>Concept:</strong> Create a logical "House" made of 3 specific Solo slots from anywhere in your factory.</li>
            <li><strong>How to Use:</strong> 
                1. Set 3 slots to <strong>Solo Mode</strong>.
                2. Click <strong>"Manage Virtual Houses"</strong>.
                3. Select the 3 slots and name your chain.
            </li>
            <li><strong>Result:</strong> The Daily Briefing will treat these 3 slots as a single unit, guiding you to move pets from House A &rarr; House B &rarr; House C automatically.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Warehouse & Sales">
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>Warehouse:</strong> Manages "Stock" (Purchased F-Pets) and "WIP" (Pets harvested from Independent slots waiting for a home).</li>
            <li><strong>Pet Sales:</strong> Set your market prices here. These drive the financial projections on the Dashboard.</li>
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
                <li><strong>The "House Uniqueness Constraint":</strong> You can only have <strong>one of each type of NPC per house.</strong></li>
            </ul>
        </HelpSection>

        <HelpSection title="Part 3: Act I - Building Your 13-House A-Rank Cash Engine">
            <p><strong>Required Starting Capital:</strong> 490 Million. Follow the 18-Day Startup Plan by reinvesting 100% of profits to expand from 2 to 13 houses.</p>
            <p><strong>Final Configuration ("Industrial Pod"):</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li><strong>Houses 1-9 (Main Line):</strong> 9x houses, each with `D | C | B` NPCs.</li>
                <li><strong>Houses 10-13 (Nursery Engine):</strong> 
                    <br/>H10: `F|E|D` 
                    <br/>H11: `F|E|C` 
                    <br/>H12: `F|E|B` 
                    <br/>H13: `F|E|Flex`
                </li>
            </ul>
            <p className="mt-2 text-sm bg-gray-900 p-2 rounded border border-gray-600"><strong>Pro Tip:</strong> Use <strong>Virtual Houses</strong> to combine the 3rd slot of Houses 10, 11, and 12 into a "Virtual Factory" line to utilize those extra NPCs efficiently!</p>
            <p className="mt-2">This setup generates a stable net profit of <strong>~1.13 Billion per week.</strong></p>
        </HelpSection>

        <HelpSection title="Part 4: Act II - The Compounding Expansion">
            <p><strong>Strategy:</strong> Pure capital growth by replicating your 13-house "Industrial Pod."</p>
            <ol className="list-decimal list-inside space-y-1 pl-4">
                <li>Run your 13-house factory at maximum capacity.</li>
                <li>When you accumulate 100m in profit, buy a new house plot.</li>
                <li>Build in Pods of 13 houses (13 &rarr; 26 &rarr; 39 &rarr; 52 &rarr; etc.).</li>
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
