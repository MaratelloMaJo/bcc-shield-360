export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "bcc_shield_360_theme_v1";

const THEME_COLOR: Record<Theme, string> = {
  light: "#F7F3EA",
  dark: "#0E1512",
};

/* Absent, unreadable, or unexpected values all mean light: it is the default. */
export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/* Paint the theme on <html> and keep the browser chrome in sync. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  // viewport emits one theme-color meta per media query, so sync every copy.
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  metas.forEach((meta) => {
    meta.content = THEME_COLOR[theme];
  });
}

export function toggleTheme(current: Theme): Theme {
  const next: Theme = current === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* Storage can be blocked; the toggle still flips for this session. */
  }
  applyTheme(next);
  return next;
}
