import React, { useState } from 'react';
import { WarehouseItem } from '../types';

interface WarehouseProps {
  items: WarehouseItem[];
  onUpdateItem: (item: WarehouseItem) => void;
}

const Warehouse: React.FC<WarehouseProps> = ({ items, onUpdateItem }) => {
  const [editingItems, setEditingItems] = useState<Record<string, Partial<{ currentStock: string, safetyStockLevel: string }>>>({});

  const handleInputChange = (id: string, field: 'currentStock' | 'safetyStockLevel', value: string) => {
    // Allow only digits or an empty string to be entered.
    if (/^\d*$/.test(value)) {
        setEditingItems(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    }
  };

  const handleSave = (item: WarehouseItem) => {
      const editedData = editingItems[item.id];
      if (editedData) {
          const updatedItem = { ...item };

          if (editedData.currentStock !== undefined) {
              updatedItem.currentStock = editedData.currentStock === '' 
                  ? item.currentStock 
                  : parseInt(editedData.currentStock, 10);
          }

          if (editedData.safetyStockLevel !== undefined) {
              updatedItem.safetyStockLevel = editedData.safetyStockLevel === ''
                  ? item.safetyStockLevel
                  : parseInt(editedData.safetyStockLevel, 10);
          }
          
          onUpdateItem(updatedItem);
          
          setEditingItems(prev => {
              const newState = { ...prev };
              delete newState[item.id];
              return newState;
          });
      }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">Warehouse Inventory</h2>
       <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Current Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Safety Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
               <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {items.map(item => {
                const editedData = editingItems[item.id];
                const isEditing = !!editedData;

                const currentStockDisplay = editedData?.currentStock !== undefined ? editedData.currentStock : String(item.currentStock);
                const safetyStockDisplay = editedData?.safetyStockLevel !== undefined ? editedData.safetyStockLevel : String(item.safetyStockLevel);

                const currentStockForStatus = parseInt(currentStockDisplay, 10) || 0;
                const safetyStockForStatus = parseInt(safetyStockDisplay, 10) || 0;

                return (
                  <tr key={item.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-200">{item.name}</td>
                    <td className="px-6 py-4 text-sm">
                        <input 
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            value={currentStockDisplay}
                            onChange={e => handleInputChange(item.id, 'currentStock', e.target.value)}
                            className="w-24 bg-gray-700 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </td>
                    <td className="px-6 py-4 text-sm">
                         <input 
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            value={safetyStockDisplay}
                            onChange={e => handleInputChange(item.id, 'safetyStockLevel', e.target.value)}
                            className="w-24 bg-gray-700 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </td>
                    <td className="px-6 py-4 text-sm">
                        {currentStockForStatus < safetyStockForStatus ? 
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-900 text-red-200">Low</span> :
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-200">OK</span>
                        }
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                        <button 
                            onClick={() => handleSave(item)}
                            disabled={!isEditing}
                            className={`font-bold py-1 px-3 rounded transition-colors ${isEditing ? 'bg-cyan-500 hover:bg-cyan-600 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                        >
                            Save
                        </button>
                    </td>
                  </tr>
                )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Warehouse;