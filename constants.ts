
import { House, NpcType, WarehouseItem, CycleTime, PriceConfig, CollectedPet, SaleRecord, Division, AppState, CompletedTaskLog, VirtualHouse } from './types';

export const CYCLE_TIMES: CycleTime[] = [
  { npcType: NpcType.F, time: 10 },
  { npcType: NpcType.E, time: 20 },
  { npcType: NpcType.D, time: 50 },
  { npcType: NpcType.C, time: 50 },
  { npcType: NpcType.B, time: 75 },
  { npcType: NpcType.A, time: 250 },
];

export const INITIAL_WAREHOUSE_ITEMS: WarehouseItem[] = [
  // Raw Materials
  { id: 'f-pet-stock', name: 'F-Pet Stock (Purchased)', currentStock: 10, safetyStockLevel: 5, isPurchaseOnly: true },
  // Work-in-Progress Inventory (what is PRODUCED)
  { id: 'f-pet-wip', name: 'F-Pets (From Solo F-Slots)', currentStock: 0, safetyStockLevel: 0 },
  { id: 'e-pet-wip', name: 'E-Pets (Ready for E-NPC)', currentStock: 0, safetyStockLevel: 0 },
  { id: 'd-pet-wip', name: 'D-Pets (Ready for D-NPC)', currentStock: 0, safetyStockLevel: 0 },
  { id: 'c-pet-wip', name: 'C-Pets (Ready for C-NPC)', currentStock: 0, safetyStockLevel: 0 },
  { id: 'b-pet-wip', name: 'B-Pets (Ready for B-NPC)', currentStock: 0, safetyStockLevel: 0 },
  { id: 'a-pet-wip', name: 'A-Pets (Ready for A-NPC)', currentStock: 0, safetyStockLevel: 0 },
];

export const INITIAL_PRICES: PriceConfig = {
  petPrices: {
    [NpcType.F]: 3100000,
    [NpcType.C]: 18000000,
    [NpcType.B]: 35000000,
    [NpcType.A]: 65000000,
    [NpcType.S]: 140000000,
  },
  npcCost15Day: 28000000, // For a 15-day NPC
  npcCost7Day: 14000000, // For a 7-day NPC
};

export const INITIAL_COLLECTED_PETS: CollectedPet[] = [];
export const INITIAL_SALES_HISTORY: SaleRecord[] = [];
export const INITIAL_COMPLETED_TASK_LOG: CompletedTaskLog[] = [];
export const INITIAL_VIRTUAL_HOUSES: VirtualHouse[] = [];

export const INITIAL_HOUSES: House[] = [];

export const DIVISIONS: Division[] = Object.values(Division);

export const DEFAULT_CHECKIN_TIMES: number[] = [9, 15, 21];

export const INITIAL_APP_STATE: AppState = {
  houses: INITIAL_HOUSES,
  warehouseItems: INITIAL_WAREHOUSE_ITEMS,
  cashBalance: 490000000,
  prices: INITIAL_PRICES,
  collectedPets: INITIAL_COLLECTED_PETS,
  salesHistory: INITIAL_SALES_HISTORY,
  checkinTimes: DEFAULT_CHECKIN_TIMES,
  completedTaskLog: INITIAL_COMPLETED_TASK_LOG,
  virtualHouses: INITIAL_VIRTUAL_HOUSES,
  isPerfectionMode: false,
};
