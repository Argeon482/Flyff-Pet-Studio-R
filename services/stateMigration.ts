
import { AppState } from '../types';
import { INITIAL_APP_STATE } from '../constants';

// Helper to check if a value is a non-null object
const isObject = (item: any): item is Record<string, any> => {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

/**
 * Deeply merges two objects. The source object's properties overwrite the target object's properties.
 * Arrays from the source object completely replace arrays in the target object.
 * @param target The object to merge into.
 * @param source The object to merge from.
 * @returns A new object with the merged properties.
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


/**
 * Migrates a potentially outdated app state to the current version.
 * It ensures that any new properties added to the state structure are present
 * with their default values, preventing crashes and data inconsistencies.
 * @param loadedState The state loaded from localStorage or a save code.
 * @returns A fully compatible, migrated AppState object.
 */
export const migrateState = (loadedState: Partial<AppState>): AppState => {
    // Create a deep copy of the initial state to avoid mutations
    const defaultState = JSON.parse(JSON.stringify(INITIAL_APP_STATE));
    
    // Deep merge the loaded state onto the default state.
    // This will add any missing properties from the default state to the loaded state.
    const migrated = deepMerge(defaultState, loadedState);
    
    // Ensure completedTaskLog exists (specifically for this migration step)
    if (!migrated.completedTaskLog) {
        migrated.completedTaskLog = [];
    }

    // Migration for House properties (Labeling & Production Mode)
    if (migrated.houses) {
        migrated.houses = migrated.houses.map((h: any) => ({
            ...h,
            label: h.label || `House #${h.id}`,
            productionMode: h.productionMode || 'LINKED'
        }));
    }

    // Ensure it conforms to the AppState type for type safety
    return migrated as AppState;
};
