import React, { useState } from 'react';
import { HouseTemplate } from '../types';

interface AddHouseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddHouses: (template: HouseTemplate, quantity: number) => void;
}

const templateDetails: { [key in HouseTemplate]: { name: string; config: string; type: 'Nursery' | 'Factory' | 'Empty' } } = {
    [HouseTemplate.A_NURSERY]: { name: '"A" Nursery', config: 'F / E', type: 'Nursery' },
    [HouseTemplate.S_NURSERY]: { name: '"S" Nursery', config: 'F / E / D', type: 'Nursery' },
    [HouseTemplate.A_FACTORY]: { name: '"A" Factory', config: 'D / C / B', type: 'Factory' },
    [HouseTemplate.S_FACTORY]: { name: '"S" Factory', config: 'C / B / A', type: 'Factory' },
    [HouseTemplate.EMPTY]: { name: 'Empty House', config: 'No NPCs', type: 'Empty' },
};


const AddHouseModal: React.FC<AddHouseModalProps> = ({ isOpen, onClose, onAddHouses }) => {
    const [step, setStep] = useState(1);
    const [selectedTemplate, setSelectedTemplate] = useState<HouseTemplate | null>(null);
    const [quantity, setQuantity] = useState('1');

    if (!isOpen) return null;

    const handleSelectTemplate = (template: HouseTemplate) => {
        setSelectedTemplate(template);
        setStep(2);
    };

    const handleConfirm = () => {
        const numQuantity = parseInt(quantity, 10);
        if (selectedTemplate && !isNaN(numQuantity) && numQuantity > 0) {
            onAddHouses(selectedTemplate, numQuantity);
            handleClose();
        } else {
            alert('Please enter a valid quantity.');
        }
    };

    const handleClose = () => {
        setStep(1);
        setSelectedTemplate(null);
        setQuantity('1');
        onClose();
    };
    
    const renderStep1 = () => (
        <>
            <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-400">Select House Template</h2>
            </header>
            <main className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.values(HouseTemplate).map(template => {
                    const details = templateDetails[template];
                    return (
                        <button
                            key={template}
                            onClick={() => handleSelectTemplate(template)}
                            className="bg-gray-700 hover:bg-cyan-900/50 p-4 rounded-lg text-left transition-colors border border-gray-600 hover:border-cyan-500"
                        >
                            <h3 className="font-bold text-lg text-white">{details.name}</h3>
                            <p className="text-sm text-gray-400">Configuration: {details.config}</p>
                        </button>
                    )
                })}
            </main>
        </>
    );

    const renderStep2 = () => {
        if (!selectedTemplate) return null;
        const details = templateDetails[selectedTemplate];
        return (
            <>
                 <header className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-cyan-400">Set Quantity</h2>
                    <button onClick={() => setStep(1)} className="text-sm text-cyan-400 hover:underline">&larr; Back</button>
                </header>
                 <main className="p-6 space-y-4">
                    <p className="text-gray-300">How many <strong>{details.name}</strong> houses would you like to build?</p>
                     <div>
                        <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
                        <input
                            id="quantity-input"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="1"
                            className="w-full bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            autoFocus
                        />
                    </div>
                </main>
                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3">
                     <button onClick={handleClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white font-semibold">
                        Cancel
                    </button>
                    <button onClick={handleConfirm} className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold">
                        Add Houses
                    </button>
                </footer>
            </>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={handleClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                {step === 1 ? renderStep1() : renderStep2()}
            </div>
        </div>
    );
};

export default AddHouseModal;