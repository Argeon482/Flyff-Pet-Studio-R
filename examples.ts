import { House, WarehouseItem, CollectedPet, SaleRecord, Division, NpcType } from './types';

const createPet = (npcType: NpcType, hoursAgo: number, totalHours: number) => {
    const startTime = Date.now() - hoursAgo * 3600000;
    const finishTime = startTime + totalHours * 3600000;
    return { name: `${npcType}-Pet`, startTime, finishTime };
};

const createNpc = (type: NpcType, duration: 7 | 15 = 15) => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + duration);
    return { type, expiration: expirationDate.toISOString().split('T')[0], duration, mode: 'LINKED' as const };
};


// --- EXAMPLE 1: 2-HOUSE STARTUP ---
export const getExample2House = () => ({
    houses: [
        {
            id: 1, division: Division.NURSERY, serviceBlock: 'Nursery Block A',
            label: 'House #1',
            perfectionAttempts: 0,
            slots: [
                { npc: createNpc(NpcType.F), pet: createPet(NpcType.F, 2, 10) },
                { npc: createNpc(NpcType.E), pet: createPet(NpcType.E, 15, 20) },
                { npc: createNpc(NpcType.D), pet: createPet(NpcType.D, 40, 50) },
            ],
        },
        {
            id: 2, division: Division.FACTORY, serviceBlock: 'Factory Block A',
            label: 'House #2',
            perfectionAttempts: 0,
            slots: [
                { npc: createNpc(NpcType.C), pet: createPet(NpcType.C, 10, 50) },
                { npc: createNpc(NpcType.B), pet: createPet(NpcType.B, 60, 75) },
                { npc: createNpc(NpcType.A), pet: createPet(NpcType.A, 100, 250) },
            ],
        },
    ],
    warehouseItems: [
        { id: 'f-pet-stock', name: 'F-Pet Stock (Purchased)', currentStock: 20, safetyStockLevel: 10, isPurchaseOnly: true },
        { id: 'e-pet-wip', name: 'E-Pets (Awaiting E-NPC)', currentStock: 2, safetyStockLevel: 0 },
        { id: 'd-pet-wip', name: 'D-Pets (Awaiting D-NPC)', currentStock: 1, safetyStockLevel: 0 },
        { id: 'c-pet-wip', name: 'C-Pets (Awaiting C-NPC)', currentStock: 1, safetyStockLevel: 0 },
        { id: 'b-pet-wip', name: 'B-Pets (Awaiting B-NPC)', currentStock: 0, safetyStockLevel: 0 },
        { id: 'a-pet-wip', name: 'A-Pets (Awaiting A-NPC)', currentStock: 0, safetyStockLevel: 0 },
    ],
    cashBalance: 250000000,
    collectedPets: [],
    salesHistory: [],
});

// --- EXAMPLE 2: 13-HOUSE "CASH ENGINE" ---
const generate13HousePod = (idStart: number) => {
    const houses: House[] = [];
    // 9 Main Line Houses
    for (let i = 0; i < 9; i++) {
        const id = idStart + i;
        houses.push({
            id, division: Division.FACTORY, serviceBlock: `Factory Block ${String.fromCharCode(65 + (i % 3))}`,
            label: `House #${id}`,
            perfectionAttempts: 0,
            slots: [
                { npc: createNpc(NpcType.D), pet: createPet(NpcType.D, 5 + i * 4, 50) },
                { npc: createNpc(NpcType.C), pet: createPet(NpcType.C, 15 + i * 3, 50) },
                { npc: createNpc(NpcType.B), pet: createPet(NpcType.B, 25 + i * 5, 75) },
            ],
        });
    }
    // 4 Nursery Houses
    const nurseryNpcs: NpcType[][] = [
        [NpcType.F, NpcType.E, NpcType.D],
        [NpcType.F, NpcType.E, NpcType.C],
        [NpcType.F, NpcType.E, NpcType.B],
        [NpcType.F, NpcType.E, NpcType.A], // Flex slot is A
    ];
    for (let i = 0; i < 4; i++) {
        const id = idStart + 9 + i;
        houses.push({
            id, division: Division.NURSERY, serviceBlock: 'Nursery Block A',
            label: `House #${id}`,
            perfectionAttempts: 0,
            slots: [
                { npc: createNpc(nurseryNpcs[i][0]), pet: createPet(nurseryNpcs[i][0], 1 + i, 10) },
                { npc: createNpc(nurseryNpcs[i][1]), pet: createPet(nurseryNpcs[i][1], 10 + i, 20) },
                { npc: createNpc(nurseryNpcs[i][2]), pet: createPet(nurseryNpcs[i][2], 30 + i * 2, nurseryNpcs[i][2] === NpcType.A ? 250 : 50) },
            ],
        });
    }
    return houses;
};

export const getExample13House = () => ({
    houses: generate13HousePod(1),
     warehouseItems: [
        { id: 'f-pet-stock', name: 'F-Pet Stock (Purchased)', currentStock: 50, safetyStockLevel: 25, isPurchaseOnly: true },
        { id: 'e-pet-wip', name: 'E-Pets (Awaiting E-NPC)', currentStock: 10, safetyStockLevel: 0 },
        { id: 'd-pet-wip', name: 'D-Pets (Awaiting D-NPC)', currentStock: 5, safetyStockLevel: 0 },
        { id: 'c-pet-wip', name: 'C-Pets (Awaiting C-NPC)', currentStock: 5, safetyStockLevel: 0 },
        { id: 'b-pet-wip', name: 'B-Pets (Awaiting B-NPC)', currentStock: 2, safetyStockLevel: 0 },
        { id: 'a-pet-wip', name: 'A-Pets (Awaiting A-NPC)', currentStock: 1, safetyStockLevel: 0 },
    ],
    cashBalance: 1130000000,
    collectedPets: [{petType: NpcType.S, quantity: 5}],
    salesHistory: [],
});

// --- EXAMPLE 3: 26-HOUSE EXPANSION ---
export const getExample26House = () => ({
    houses: [
        ...generate13HousePod(1),
        ...generate13HousePod(14),
    ],
    warehouseItems: getExample13House().warehouseItems.map(item => ({...item, currentStock: item.currentStock * 2})),
    cashBalance: 2260000000,
    collectedPets: [{petType: NpcType.S, quantity: 10}],
    salesHistory: [],
});

// --- EXAMPLE 4: 71-HOUSE "TRIFECTA" ---
const generate71HouseBehemoth = () => {
    const houses: House[] = [];
    // 1 Champion House
    houses.push({
        id: 1, division: Division.CHAMPION, serviceBlock: 'Champion',
        label: 'House #1',
        perfectionAttempts: 0,
        slots: [
            { npc: createNpc(NpcType.F), pet: createPet(NpcType.F, 3, 10) },
            { npc: createNpc(NpcType.E), pet: {name: null, startTime: null, finishTime: null} },
            { npc: createNpc(NpcType.D), pet: {name: null, startTime: null, finishTime: null} },
        ]
    });
    // 20 Armory Houses (Mid-grade fodder)
    for (let i = 0; i < 20; i++) {
        const id = 2 + i;
        houses.push({
            id, division: Division.NURSERY, serviceBlock: `Nursery Block ${String.fromCharCode(65 + (i % 3))}`,
            label: `House #${id}`,
            perfectionAttempts: 0,
            slots: [
                { npc: createNpc(NpcType.F), pet: createPet(NpcType.F, i % 10, 10) },
                { npc: createNpc(NpcType.E), pet: createPet(NpcType.E, 10 + (i % 10), 20) },
                { npc: createNpc(NpcType.D), pet: createPet(NpcType.D, 30 + (i % 10), 50) },
            ]
        });
    }
    // 50 Forge Houses (S-Rank sacrifices)
    for (let i = 0; i < 50; i++) {
        const id = 22 + i;
         houses.push({
            id, division: Division.FACTORY, serviceBlock: `Factory Block ${String.fromCharCode(65 + (i % 3))}`,
            label: `House #${id}`,
            perfectionAttempts: 0,
            slots: [
                { npc: createNpc(NpcType.C), pet: createPet(NpcType.C, 20 + i * 2, 50) },
                { npc: createNpc(NpcType.B), pet: createPet(NpcType.B, 50 + i * 3, 75) },
                { npc: createNpc(NpcType.A), pet: createPet(NpcType.A, 100 + i * 4, 250) },
            ]
        });
    }
    return houses;
}

export const getExample71House = () => ({
    houses: generate71HouseBehemoth(),
    warehouseItems: [
        { id: 'f-pet-stock', name: 'F-Pet Stock (Purchased)', currentStock: 200, safetyStockLevel: 100, isPurchaseOnly: true },
        { id: 'e-pet-wip', name: 'E-Pets (Awaiting E-NPC)', currentStock: 25, safetyStockLevel: 0 },
        { id: 'd-pet-wip', name: 'D-Pets (Awaiting D-NPC)', currentStock: 15, safetyStockLevel: 0 },
        { id: 'c-pet-wip', name: 'C-Pets (Awaiting C-NPC)', currentStock: 10, safetyStockLevel: 0 },
        { id: 'b-pet-wip', name: 'B-Pets (Awaiting B-NPC)', currentStock: 5, safetyStockLevel: 0 },
        { id: 'a-pet-wip', name: 'A-Pets (Awaiting A-NPC)', currentStock: 5, safetyStockLevel: 0 },
    ],
    cashBalance: 5000000000,
    collectedPets: [{petType: NpcType.S, quantity: 20}],
    salesHistory: [],
});