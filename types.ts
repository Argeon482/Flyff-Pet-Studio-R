export enum NpcType {
  F = 'F',
  E = 'E',
  D = 'D',
  C = 'C',
  B = 'B',
  A = 'A',
  S = 'S',
}

export enum Division {
  CHAMPION = 'Champion Pet',
  NURSERY = 'Nursery',
  FACTORY = 'Factory',
}

export interface NpcSlot {
  type: NpcType | null;
  expiration: string | null;
  duration: 7 | 15 | null;
  mode: 'LINKED' | 'SOLO'; // LINKED = flows to next slot in house; SOLO = managed by Virtual House or manual
  virtualHouseId?: string; // ID of the Virtual House this slot belongs to (if any)
}

export interface PetSlot {
  name: string | null;
  startTime: number | null;
  finishTime: number | null;
}

export interface House {
  id: number;
  division: Division;
  label: string;
  serviceBlock: string;
  perfectionAttempts: number;
  slots: {
    npc: NpcSlot;
    pet: PetSlot;
  }[];
}

// A logical grouping of slots that form a production chain, independent of physical houses
export interface VirtualHouse {
    id: string;
    name: string;
    // The ordered list of physical slots that make up this virtual chain
    slots: {
        houseId: number;
        slotIndex: number;
    }[];
}

export interface WarehouseItem {
  id: string;
  name: string;
  currentStock: number;
  safetyStockLevel: number;
  isPurchaseOnly?: boolean;
}

export interface CycleTime {
  npcType: NpcType;
  time: number; // in hours
}

// Updated to support batched sub-tasks
export interface DailyBriefingTask {
  id: string; // Unique ID for the batch
  houseId: number;
  serviceBlock: string;
  estFinishTime: string;
  
  // The overarching description (e.g. "Service House #1")
  taskLabel: string;

  // The specific sub-actions involved in this batch
  subTasks: {
      slotIndex: number;
      currentNpcType: NpcType;
      nextNpcType: NpcType;
      actionType: 'HARVEST_AND_RESTART' | 'HARVEST_AND_STORE' | 'COLLECT_S';
      targetHouseId?: number; // For cross-house moves
      targetSlotIndex?: number;
      virtualHouseName?: string;
  }[];

  // Aggregated requirements
  requiredWarehouseItems: { itemId: string; count: number }[];
}

export interface DailyBriefingData {
    dueTasks: DailyBriefingTask[];
    upcomingTasks: DailyBriefingTask[];
    nextCheckin: Date;
}

export enum View {
    DASHBOARD = 'DASHBOARD',
    DAILY_BRIEFING = 'DAILY_BRIEFING',
    FACTORY_FLOOR = 'FACTORY_FLOOR',
    WAREHOUSE = 'WAREHOUSE',
    PET_SALES = 'PET_SALES',
}

export interface PriceConfig {
    petPrices: { [key in NpcType]?: number };
    npcCost15Day: number;
    npcCost7Day: number;
}

export interface SaleRecord {
    id: string;
    petType: NpcType;
    quantity: number;
    pricePerUnit: number;
    totalValue: number;
    timestamp: number;
}
  
export interface CollectedPet {
    petType: NpcType;
    quantity: number;
}

export interface ProjectedProfit {
    grossRevenue: number;
    grossRevenueAlternativeA?: number;
    npcExpenses: number;
    perfectionExpenses: number;
    netProfit: number;
    sPetsCount: number;
    producedItems?: { name: string; count: number }[];
}

export interface DashboardAnalytics {
    alerts: string[];
    nextAction: string;
    actualNext7Days: ProjectedProfit;
    theoreticalMaxWeekly: ProjectedProfit;
}

export enum HouseTemplate {
    A_NURSERY = 'A_NURSERY',
    S_NURSERY = 'S_NURSERY',
    A_FACTORY = 'A_FACTORY',
    S_FACTORY = 'S_FACTORY',
    EMPTY = 'EMPTY',
}

export interface CompletedTaskLog {
    id: string;
    task: DailyBriefingTask;
    timestamp: number;
    // We store a simplified snapshot of changes for the log
    summary: string; 
    // Store enough data to attempt an undo (though complex batch undo is tricky, we'll store the pre-state snapshot ideally, but here we keep it simple)
    affectedSlots: {
        houseId: number;
        slotIndex: number;
        previousPetType: NpcType;
    }[];
}

export interface AppState {
    houses: House[];
    warehouseItems: WarehouseItem[];
    cashBalance: number;
    prices: PriceConfig;
    collectedPets: CollectedPet[];
    salesHistory: SaleRecord[];
    checkinTimes: number[];
    completedTaskLog: CompletedTaskLog[];
    virtualHouses: VirtualHouse[]; 
}