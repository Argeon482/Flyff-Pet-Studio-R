import { House, NpcType, WarehouseItem, CycleTime, PriceConfig, CollectedPet, SaleRecord, Division } from './types';

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
  { id: 'e-pet-wip', name: 'E-Pets (Awaiting E-NPC)', currentStock: 0, safetyStockLevel: 0 },
  { id: 'd-pet-wip', name: 'D-Pets (Awaiting D-NPC)', currentStock: 0, safetyStockLevel: 0 },
  { id: 'c-pet-wip', name: 'C-Pets (Awaiting C-NPC)', currentStock: 0, safetyStockLevel: 0 },
  { id: 'b-pet-wip', name: 'B-Pets (Awaiting B-NPC)', currentStock: 0, safetyStockLevel: 0 },
  { id: 'a-pet-wip', name: 'A-Pets (Awaiting A-NPC)', currentStock: 0, safetyStockLevel: 0 },
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

// The application now starts with a blank slate, allowing the user to build their factory.
export const INITIAL_HOUSES: House[] = [];

export const DIVISIONS: Division[] = Object.values(Division);

export const DEFAULT_CHECKIN_TIMES: number[] = [9, 15, 21];