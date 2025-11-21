
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
  mode: 'LINKED' | 'SOLO'; 
  virtualHouseId?: string; 
  remainingDurationMs?: number; 
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

export interface VirtualHouse {
    id: string;
    name: string;
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
  time: number; 
}

export interface DailyBriefingTask {
  id: string; 
  houseId: number;
  serviceBlock: string;
  estFinishTime: string;
  
  taskLabel: string;

  isFullyReady: boolean;

  subTasks: {
      slotIndex: number;
      currentNpcType: NpcType;
      nextNpcType: NpcType;
      actionType: 'HARVEST_AND_RESTART' | 'HARVEST_AND_STORE' | 'HARVEST_UPGRADE_AND_STORE' | 'COLLECT_S' | 'RENEW_NPC' | 'FILL_IDLE';
      targetHouseId?: number; 
      targetSlotIndex?: number;
      virtualHouseName?: string;
  }[];

  requiredWarehouseItems: { itemId: string; count: number; name: string }[];
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
    summary: string; 
    affectedSlots: {
        houseId: number;
        slotIndex: number;
        previousPet: PetSlot;
        previousNpc: NpcSlot;
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
    isPerfectionMode: boolean;
}
