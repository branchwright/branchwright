// Theme management
(function () {
  const STORAGE_KEY = 'branchwright-theme';
  const THEME_ATTR = 'data-theme';

  // Get stored theme or system preference
  function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute(THEME_ATTR, theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleButton(theme);
  }

  // Update toggle button icon
  function updateToggleButton(theme) {
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.textContent = theme === 'dark' ? '☀️' : '🌙';
      button.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
  }

  // Toggle theme
  function toggleTheme() {
    const current = document.documentElement.getAttribute(THEME_ATTR) || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  // Initialize theme on load
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);

  // Listen for system preference changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Expose toggle function globally
  window.toggleTheme = toggleTheme;

  // Initialize button when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateToggleButton(initialTheme));
  } else {
    updateToggleButton(initialTheme);
  }
})();
