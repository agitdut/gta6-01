// Versioned local progress and preferences, resilient when browser storage is unavailable.
const KEY = 'port-solano-save-v1';
export function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}
export function save(s) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        cash: s.player.cash,
        mission: s.mission,
        packages: s.packages,
        best: s.best || 0,
        muted: s.muted,
      }),
    );
  } catch {}
}
