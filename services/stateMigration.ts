
import { AppState } from '../types';
import { INITIAL_APP_STATE } from '../constants';

const isObject = (item: any): item is Record<string, any> => {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

const deepMerge = (target: Record<string, any>, source: Record<string, any>): Record<string, any> => {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }

    return output;
};


export const migrateState = (loadedState: Partial<AppState>): AppState => {
    const defaultState = JSON.parse(JSON.stringify(INITIAL_APP_STATE));
    const migrated = deepMerge(defaultState, loadedState);
    
    if (!migrated.completedTaskLog) {
        migrated.completedTaskLog = [];
    } else {
        migrated.completedTaskLog = migrated.completedTaskLog.filter((log: any) => 
            log.task && 
            Array.isArray(log.task.subTasks) &&
            Array.isArray(log.affectedSlots) &&
            log.affectedSlots.every((slot: any) => slot.previousNpc !== undefined)
        );
    }
    
    if (!migrated.virtualHouses) {
        migrated.virtualHouses = [];
    }
    
    if (typeof migrated.isPerfectionMode === 'undefined') {
        migrated.isPerfectionMode = false;
    }

    if (migrated.houses) {
        migrated.houses = migrated.houses.map((h: any) => {
            const isIndependent = h.productionMode === 'INDEPENDENT';
            
            const updatedSlots = h.slots.map((slot: any) => ({
                ...slot,
                npc: {
                    ...slot.npc,
                    mode: slot.npc.mode || (isIndependent ? 'SOLO' : 'LINKED'),
                }
            }));

            delete h.productionMode;

            return {
                ...h,
                label: h.label || `House #${h.id}`,
                slots: updatedSlots
            };
        });
    }

    return migrated as AppState;
};
