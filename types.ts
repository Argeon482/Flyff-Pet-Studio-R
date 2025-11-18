
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
}

export interface PetSlot {
  name: string | null;
  startTime: number | null;
  finishTime: number | null;
}

export interface House {
  id: number;
  division: Division;
  serviceBlock: string;
  perfectionAttempts: number;
  slots: {
    npc: NpcSlot;
    pet: PetSlot;
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

export interface DailyBriefingTask {
  houseId: number;
  slotIndex: number;
  currentPet: string;
  task: string;
  estFinishTime: string;
  serviceBlock: string;
  currentNpcType: NpcType;
  nextNpcType: NpcType | null; // For swaps
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
    npcExpenses: number;
    perfectionExpenses: number;
    netProfit: number;
    sPetsCount: number; // Renamed from sPetsPerWeek to be generic for timeframes
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

// Stores the details of a completed task to allow for history display and undoing
export interface CompletedTaskLog {
    id: string;
    task: DailyBriefingTask;
    timestamp: number;
    changes: {
        sourceHouseId: number;
        sourceSlotIndex: number;
        sourcePetType: NpcType; // The pet that finished
        targetHouseId?: number;
        targetSlotIndex?: number;
        targetPetType?: NpcType; // The pet created in the target
        warehouseWipId?: string; // If moved to WIP
        warehouseConsumedId?: string; // If stock was consumed
    }
}

// === Data State Types ===

export interface AppState {
    houses: House[];
    warehouseItems: WarehouseItem[];
    cashBalance: number;
    prices: PriceConfig;
    collectedPets: CollectedPet[];
    salesHistory: SaleRecord[];
    checkinTimes: number[];
    completedTaskLog: CompletedTaskLog[]; // New history log
}
