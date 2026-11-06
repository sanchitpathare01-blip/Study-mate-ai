/**
 * StudyMate AI - Theme Management (Dark & Light Mode)
 * Persists user preference via localStorage and updates the DOM.
 */

const STORAGE_KEY = 'studymate_theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

/**
 * Get current active theme
 * @returns {'dark'|'light'}
 */
export function getCurrentTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme === THEME_DARK || savedTheme === THEME_LIGHT) {
    return savedTheme;
  }
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return THEME_LIGHT;
  }
  return THEME_DARK;
}

/**
 * Apply theme to document and update all theme toggle buttons
 * @param {'dark'|'light'} theme
 */
export function setTheme(theme) {
  const validTheme = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
  document.documentElement.setAttribute('data-theme', validTheme);
  localStorage.setItem(STORAGE_KEY, validTheme);
  updateThemeToggleUI(validTheme);

  // Dispatch custom event for pages or components listening for theme changes
  window.dispatchEvent(new CustomEvent('studymate-theme-change', { detail: { theme: validTheme } }));
}

/**
 * Toggle between dark and light themes
 * @returns {'dark'|'light'} The newly applied theme
 */
export function toggleTheme() {
  const current = getCurrentTheme();
  const nextTheme = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  setTheme(nextTheme);
  return nextTheme;
}

/**
 * Update UI state of all theme toggle buttons on the page
 * @param {'dark'|'light'} theme
 */
function updateThemeToggleUI(theme) {
  const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
  toggleButtons.forEach((btn) => {
    btn.setAttribute('aria-label', `Switch to ${theme === THEME_DARK ? 'light' : 'dark'} mode`);
    btn.setAttribute('title', `Switch to ${theme === THEME_DARK ? 'light' : 'dark'} mode`);
    // Update inner icon
    const isDark = theme === THEME_DARK;
    btn.innerHTML = isDark
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  });
}

/**
 * Initialize theme listener and set initial theme
 */
export function initTheme() {
  const currentTheme = getCurrentTheme();
  setTheme(currentTheme);

  // Attach click listener to any theme toggle buttons on the page
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.theme-toggle-btn');
    if (toggleBtn) {
      toggleTheme();
    }
  });

  // Listen for OS system theme changes if user has not explicitly chosen
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? THEME_LIGHT : THEME_DARK);
      }
    });
  }
}

// Auto-run immediate initialization script if loaded in browser
if (typeof window !== 'undefined') {
  initTheme();
}

