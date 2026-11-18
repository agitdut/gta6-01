const SLOT = 'port-solano:story';
const SOUND = 'port-solano:audio';
const LEGACY = 'port-solano-save-v1';
const number = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;

export function readSave() {
  try {
    const data = JSON.parse(localStorage.getItem(SLOT));
    if (!data) {
      const legacy = JSON.parse(localStorage.getItem(LEGACY));
      if (!legacy || !Number.isFinite(legacy.mission)) return null;
      return {
        mission: number(legacy.mission, 0),
        cash: number(legacy.cash, 0),
        collected: Array.from({ length: Math.min(10, number(legacy.packages, 0)) }, (_, i) => i),
      };
    }
    if (data.version !== 1) return null;
    return {
      mission: number(data.mission, 0),
      cash: number(data.cash, 0),
      collected: Array.isArray(data.collected) ? data.collected.filter(Number.isInteger) : [],
    };
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(SLOT, JSON.stringify({ version: 1, ...data }));
  } catch {
    // Storage may be unavailable in private or embedded sessions.
  }
}

export function audioPreference(value) {
  try {
    if (typeof value === 'boolean') localStorage.setItem(SOUND, String(value));
    const stored = localStorage.getItem(SOUND);
    if (stored === null) return !JSON.parse(localStorage.getItem(LEGACY))?.muted;
    return stored !== 'false';
  } catch {
    return value ?? true;
  }
}
