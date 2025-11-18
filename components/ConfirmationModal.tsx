import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-yellow-400">{title}</h2>
                </header>
                <main className="p-6 text-gray-300">
                    {children}
                </main>
                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white font-semibold">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-white font-bold">
                        Confirm
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ConfirmationModal;