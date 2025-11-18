
import { AppState } from '../types';
import { INITIAL_APP_STATE } from '../constants';

// Helper to check if a value is a non-null object
const isObject = (item: any): item is Record<string, any> => {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

/**
 * Deeply merges two objects. The source object's properties overwrite the target object's properties.
 * Arrays from the source object completely replace arrays in the target object.
 */
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
        // CRITICAL FIX: Filter out legacy logs that don't have the new 'subTasks' structure.
        // Attempting to render old logs without subTasks causes the DailyBriefing to crash.
        migrated.completedTaskLog = migrated.completedTaskLog.filter((log: any) => 
            log.task && Array.isArray(log.task.subTasks)
        );
    }
    
    if (!migrated.virtualHouses) {
        migrated.virtualHouses = [];
    }

    // Migration: Convert House-level 'productionMode' (legacy) to Slot-level 'mode'
    if (migrated.houses) {
        migrated.houses = migrated.houses.map((h: any) => {
            const isIndependent = h.productionMode === 'INDEPENDENT';
            
            // If house was previously labeled independent, mark all its slots as SOLO
            // otherwise default to LINKED
            const updatedSlots = h.slots.map((slot: any) => ({
                ...slot,
                npc: {
                    ...slot.npc,
                    mode: slot.npc.mode || (isIndependent ? 'SOLO' : 'LINKED')
                }
            }));

            // Remove the legacy property implicitly by not including it in the returned object
            // if we were creating a fresh object, but here we are mutating/mapping.
            // We keep the other props and overwrite slots.
            // Delete legacy property to clean up state
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