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
  // Next emits a single static theme-color meta; sync every copy in case the
  // pre-paint script had to create one before head parsing finished.
  const metas = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );
  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    metas.push(meta);
    document.head.appendChild(meta);
  }
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
