(function() {
  const STORAGE_KEY = "theme";

  function getStoredTheme() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function setStoredTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }

  function initTheme() {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      applyTheme(storedTheme);
    }
  }

  function toggleTheme() {
    const storedTheme = getStoredTheme();
    const currentTheme = storedTheme || getSystemTheme();
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setStoredTheme(newTheme);
    applyTheme(newTheme);
  }

  initTheme();

  document.addEventListener("DOMContentLoaded", function() {
    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.addEventListener("click", toggleTheme);
    }
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function() {
    if (!getStoredTheme()) {
      document.documentElement.classList.remove("light", "dark");
    }
  });
})();
