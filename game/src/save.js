const SLOT = 'port-solano-save-v1';

export function load() {
  try {
    const record = JSON.parse(localStorage.getItem(SLOT));
    return record && typeof record === 'object' && !Array.isArray(record) ? record : null;
  } catch {
    return null;
  }
}

export function save(s) {
  const record = {
    cash: s.player.cash,
    mission: s.mission,
    packages: s.packages,
    best: s.best || 0,
    muted: s.muted,
  };

  try {
    localStorage.setItem(SLOT, JSON.stringify(record));
  } catch {
    // Play can continue when storage is blocked or full.
  }
}
