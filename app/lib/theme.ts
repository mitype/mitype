// Theme switch for the new "Signal" design. Every member can switch.
// SIGNAL_DEFAULT_ON decides what members who never chose see: false = classic
// look (new design is opt-in), true = new design (classic is opt-out).
// Stored on this device. The attribute on <html> is what the CSS in
// globals.css reads; removing it returns every page to the current look.

export const THEME_KEY = 'mitype-theme';
export const THEME_EVENT = 'mitype-theme-change';
export const SIGNAL_DEFAULT_ON = false;
export type Theme = 'default' | 'signal';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'default';
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (v === 'signal') return 'signal';
    if (v === 'classic') return 'default';
    return SIGNAL_DEFAULT_ON ? 'signal' : 'default';
  } catch {
    return SIGNAL_DEFAULT_ON ? 'signal' : 'default';
  }
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme === 'signal' ? 'signal' : 'classic');
  } catch { /* ignore */ }
  if (theme === 'signal') document.documentElement.setAttribute('data-theme', 'signal');
  else document.documentElement.removeAttribute('data-theme');
  window.dispatchEvent(new Event(THEME_EVENT));
}
