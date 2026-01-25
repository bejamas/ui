import type { ThemePreset } from "../types/theme";
import { defaultPresets } from "./presets";
import { PRESET_CHANGE_EVENT } from "./preset-store";

export const CUSTOM_PRESETS_KEY = "bejamas-custom-presets";
export const EDITING_PRESET_KEY = "bejamas-editing-preset";
export const CUSTOM_PRESETS_CHANGE_EVENT = "bejamas:custom-presets-change";

export interface CustomPreset extends ThemePreset {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
}

export interface CustomPresetsStore {
  presets: Record<string, CustomPreset>;
  version: number;
}

/**
 * Get all custom presets from localStorage
 */
export function getCustomPresets(): Record<string, CustomPreset> {
  if (typeof localStorage === "undefined") return {};

  try {
    const stored = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!stored) return {};

    const data: CustomPresetsStore = JSON.parse(stored);
    return data.presets || {};
  } catch (e) {
    console.error("Failed to parse custom presets:", e);
    return {};
  }
}

/**
 * Sync a custom preset to Redis for server-side CSS generation
 * This is fire-and-forget - we don't block on the result
 */
async function syncToRedis(action: "save" | "delete", preset?: CustomPreset, id?: string): Promise<void> {
  try {
    const body = action === "save" 
      ? { action, theme: preset }
      : { action, id };
    
    await fetch("/api/themes/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // Silently fail - Redis sync is optional enhancement
    console.debug("Redis sync failed (non-critical):", e);
  }
}

/**
 * Save a custom preset to localStorage and sync to Redis
 */
export function saveCustomPreset(preset: CustomPreset): void {
  if (typeof localStorage === "undefined") return;

  try {
    const existing = getCustomPresets();
    const now = new Date().toISOString();

    const updated: CustomPreset = {
      ...preset,
      modifiedAt: now,
      createdAt: preset.createdAt || now,
    };

    existing[preset.id] = updated;

    const store: CustomPresetsStore = {
      presets: existing,
      version: 1,
    };

    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(store));

    // Sync to Redis for server-side CSS generation (fire-and-forget)
    if (preset.id.startsWith("custom-")) {
      syncToRedis("save", updated);
    }

    // Dispatch event to notify listeners
    window.dispatchEvent(
      new CustomEvent(CUSTOM_PRESETS_CHANGE_EVENT, {
        detail: { presets: existing, action: "save", id: preset.id },
      })
    );
  } catch (e) {
    console.error("Failed to save custom preset:", e);
  }
}

/**
 * Delete a custom preset from localStorage and Redis
 */
export function deleteCustomPreset(id: string): void {
  if (typeof localStorage === "undefined") return;

  try {
    const existing = getCustomPresets();
    delete existing[id];

    const store: CustomPresetsStore = {
      presets: existing,
      version: 1,
    };

    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(store));

    // Sync deletion to Redis (fire-and-forget)
    if (id.startsWith("custom-")) {
      syncToRedis("delete", undefined, id);
    }

    // Dispatch event to notify listeners
    window.dispatchEvent(
      new CustomEvent(CUSTOM_PRESETS_CHANGE_EVENT, {
        detail: { presets: existing, action: "delete", id },
      })
    );
  } catch (e) {
    console.error("Failed to delete custom preset:", e);
  }
}

/**
 * Get all presets (built-in + custom), with custom taking precedence
 */
export function getAllPresets(): Record<string, ThemePreset & { id: string; name: string; isCustom?: boolean }> {
  const builtIn = Object.entries(defaultPresets).reduce(
    (acc, [key, preset]) => {
      acc[key] = {
        ...preset,
        id: key,
        name: preset.label || key,
        isCustom: false,
      };
      return acc;
    },
    {} as Record<string, ThemePreset & { id: string; name: string; isCustom: boolean }>
  );

  const custom = Object.entries(getCustomPresets()).reduce(
    (acc, [key, preset]) => {
      acc[key] = {
        ...preset,
        isCustom: true,
      };
      return acc;
    },
    {} as Record<string, CustomPreset & { isCustom: boolean }>
  );

  return { ...builtIn, ...custom };
}

/**
 * Generate a unique preset ID
 */
export function generatePresetId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new custom preset based on an existing one
 */
export function duplicatePreset(
  sourceId: string,
  newName: string
): CustomPreset | null {
  const all = getAllPresets();
  const source = all[sourceId];

  if (!source) return null;

  const now = new Date().toISOString();
  const newPreset: CustomPreset = {
    id: generatePresetId(),
    name: newName,
    label: newName,
    createdAt: now,
    modifiedAt: now,
    source: "SAVED",
    styles: JSON.parse(JSON.stringify(source.styles)), // Deep clone
  };

  saveCustomPreset(newPreset);
  return newPreset;
}

/**
 * Store the currently editing preset state (for live preview without saving)
 */
export function setEditingPreset(preset: ThemePreset | null): void {
  if (typeof sessionStorage === "undefined") return;

  if (preset) {
    sessionStorage.setItem(EDITING_PRESET_KEY, JSON.stringify(preset));
  } else {
    sessionStorage.removeItem(EDITING_PRESET_KEY);
  }
}

/**
 * Get the currently editing preset state
 */
export function getEditingPreset(): ThemePreset | null {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const stored = sessionStorage.getItem(EDITING_PRESET_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Expose globally for inline scripts
if (typeof window !== "undefined") {
  (window as any).bejamas = (window as any).bejamas || {};
  (window as any).bejamas.customPresets = {
    getAll: getAllPresets,
    getCustom: getCustomPresets,
    save: saveCustomPreset,
    delete: deleteCustomPreset,
    duplicate: duplicatePreset,
    generateId: generatePresetId,
  };
}
