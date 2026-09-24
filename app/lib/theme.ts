/**
 * Client-Side Theme & Accent Manager
 * Updates CSS custom properties dynamically on the document root
 * and persists the selected accent in localStorage without server round-trips.
 */

export const PRESET_ACCENT_COLORS = [
  { name: 'Sky Blue', hex: '#38bdf8', category: 'cool' },
  { name: 'Titanium White', hex: '#ffffff', category: 'neutral' },
  { name: 'Electric Indigo', hex: '#6366f1', category: 'cool' },
  { name: 'Emerald Mint', hex: '#10b981', category: 'vibrant' },
  { name: 'Amber Gold', hex: '#f59e0b', category: 'warm' },
  { name: 'Sunset Coral', hex: '#f43f5e', category: 'warm' },
  { name: 'Purple Orchid', hex: '#a855f7', category: 'cool' },
  { name: 'Cyan Teal', hex: '#14b8a6', category: 'vibrant' },
];

export function applyClientAccent(hex: string) {
  if (typeof window === 'undefined') return;

  const validHex = hex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.trim())
    ? hex.trim()
    : '#38bdf8';

  document.documentElement.style.setProperty('--accent-color', validHex);

  try {
    localStorage.setItem('atlas_theme_accent', validHex);
  } catch {
    // ignore localStorage error
  }
}

export function getClientAccent(defaultHex = '#38bdf8'): string {
  if (typeof window === 'undefined') return defaultHex;

  try {
    const direct = localStorage.getItem('atlas_theme_accent');
    if (direct) return direct;

    const savedSettings = localStorage.getItem('antigravity_chat_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.accentColor) return parsed.accentColor;
    }
  } catch {
    // ignore error
  }

  return defaultHex;
}
