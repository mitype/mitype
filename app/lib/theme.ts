// Theme switch for the new "Signal" design. Phase 1: admin preview only.
// Stored on this device. The attribute on <html> is what the CSS in
// globals.css reads; removing it returns every page to the current look.

export const THEME_KEY = 'mitype-theme';
export const THEME_EVENT = 'mitype-theme-change';
export type Theme = 'default' | 'signal';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'default';
  try {
    return window.localStorage.getItem(THEME_KEY) === 'signal' ? 'signal' : 'default';
  } catch {
    return 'default';
  }
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    if (theme === 'signal') window.localStorage.setItem(THEME_KEY, 'signal');
    else window.localStorage.removeItem(THEME_KEY);
  } catch { /* ignore */ }
  if (theme === 'signal') document.documentElement.setAttribute('data-theme', 'signal');
  else document.documentElement.removeAttribute('data-theme');
  window.dispatchEvent(new Event(THEME_EVENT));
}
