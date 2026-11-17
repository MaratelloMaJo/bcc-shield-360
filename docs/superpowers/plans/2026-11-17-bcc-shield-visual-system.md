# BCC Shield 360 Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the «Полис» visual system: semantic tokens, Literata/Golos Text/Spline Sans Mono, a 4px rhythm, and a light-default theme with a real dark theme, across all four screens, dialogs, jury deck, and chrome.

**Architecture:** A CSS variable layer defines every color twice (light, dark); Tailwind exposes them as RGB-channel colors plus type/radius/shadow roles. Fonts come from `next/font/google` and a pre-paint script sets `data-theme` before first paint. `app/page.tsx` is edited screen by screen with class sweeps only — no JSX restructuring, no logic changes.

**Tech Stack:** Next.js 14.2.33, React 18.3.1, TypeScript 5.7, Tailwind 3.4. Verification with `npm run typecheck`, `npm run build`, ripgrep gates, and the browser at 390px and 1440px in both themes.

**Spec:** `docs/superpowers/specs/2026-11-17-bcc-shield-visual-system-design.md`

## Global Constraints

- No new runtime dependency; `next/font/google` only.
- No behavior changes: risk engine, HMAC receipts, `bcc_shield_360_state_v2`, i18n, flows.
- Light is default; dark is selected manually; no `prefers-color-scheme` follower.
- Theme storage key: `bcc_shield_360_theme_v1`, values `light` | `dark`.
- Typography floor: 12px for meaning-bearing text; 11px only for auxiliary timestamps; zero `text-[Npx]`.
- No uppercase labels, no positive tracking, no gradients, no glow shadows, no Inter.
- Brand green `#00A859` only in logo/icon/brand tile (`brand` token).
- One token vocabulary: `canvas, surface, raised, line, line-strong, ink, ink-soft, muted, accent, accent-strong, accent-soft, accent-ink, safe, safe-soft, safe-ink, warn, warn-soft, warn-ink, danger, danger-soft, danger-ink, guardian, guardian-soft, paper, overlay, bezel, brand, brand-ink`.
- Radii: control 10, card 14, sheet 18, device 22, pill 999.
- Spacing set: 4, 8, 12, 16, 20, 24, 32, 40; touch targets ≥ 44px; motion ≤ 280ms.
- Every screen is verified in both themes before the next screen starts.
- `.superpowers/` and `.tmp/` are git-ignored; screenshots stay out of commits.

## Review Focus

- **First-paint flash:** stored dark theme must be applied before paint, not in an effect; a light flash on reload is the most visible failure.
- **Tinted-text contrast:** small status text on `*-soft` backgrounds must use `*-ink` tokens and meet 4.5:1; soft-on-soft is the likely slip.
- **395px header overflow:** wordmark + language switch + 44px toggle must fit without clipping or wrapping; adding the toggle is the stressor.
- **State loss on toggle:** `bcc_shield_360_state_v2` must survive toggling and reload; a new theme key must never share or overwrite it.
- **Dialog readability:** all six dialogs in both themes — scrim, title, body, warning tints, disabled actions — stay legible and reachable.
- **Font failure without Google:** texts must render from self-hosted `next/font` files with Cyrillic support; a runtime `<link>` regression breaks offline/venue network.

## File Structure

| File | Responsibility |
|---|---|
| `app/globals.css` | Token definitions for both themes, base element styles, selection/scrollbars/focus, scam marks, QR grid, reduced motion |
| `tailwind.config.ts` | Token color channels, font families, font-size roles, radii, shadows, keyframes |
| `app/layout.tsx` | `next/font` instances, pre-paint theme script, themeColor pair, remove Google `<link>` |
| `lib/theme.ts` | `Theme` type, storage key, read/apply/toggle helpers — no React |
| `app/page.tsx` | `theme` state, header toggle, i18n labels, and the class sweep across shell/screens/dialogs/aside |
| `app/manifest.ts`, `public/icon.svg` | Manifest colors; brand mark untouched |

---

### Task 1: Foundation — tokens, fonts, theme plumbing

**Files:**
- Modify: `app/globals.css` (rewrite the top through base styles; keep scam-mark/QR/rail/reduced-motion blocks, delete the mobile size override)
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`
- Create: `lib/theme.ts`
- Modify: `app/page.tsx:348` (DictKey auto-updates), `471` (DICT), state near `2358`, header near `3504`, imports near the top

**Interfaces:**
- Produces: CSS vars `--bcc-*`; Tailwind colors `canvas…brand-ink`, fonts `font-sans`/`font-display`/`font-mono`, sizes `text-screen/modal/score/section/body/secondary/meta/aux/hash`, radii `rounded-control/card/sheet/device`, shadows `shadow-card/panel`; `lib/theme.ts` exports `type Theme`, `THEME_STORAGE_KEY`, `readTheme()`, `applyTheme(theme)`, `toggleTheme(current): Theme`; page state `theme: Theme`.
- Consumes: nothing.

- [ ] **Step 1: Write the token layer in `app/globals.css`**

Replace `:root { color-scheme: dark; ... }` and the body block with:

```css
:root,
[data-theme="light"] {
  color-scheme: light;
  --bcc-canvas: 247 243 234;      --bcc-surface: 255 253 247;
  --bcc-raised: 251 247 238;      --bcc-line: 217 207 187;
  --bcc-line-strong: 196 184 161; --bcc-ink: 16 35 31;
  --bcc-ink-soft: 55 74 67;       --bcc-muted: 94 111 105;
  --bcc-accent: 14 110 90;        --bcc-accent-strong: 11 90 73;
  --bcc-accent-soft: 228 239 233; --bcc-accent-ink: 255 253 247;
  --bcc-safe: 20 122 91;          --bcc-safe-soft: 226 241 233;
  --bcc-safe-ink: 11 93 68;       --bcc-warn: 156 95 18;
  --bcc-warn-soft: 246 231 201;   --bcc-warn-ink: 122 71 8;
  --bcc-danger: 180 69 59;        --bcc-danger-soft: 244 223 218;
  --bcc-danger-ink: 142 47 39;    --bcc-guardian: 109 85 168;
  --bcc-guardian-soft: 232 226 243; --bcc-paper: 243 237 221;
  --bcc-overlay: 16 35 31;        --bcc-bezel: 24 32 28;
  --bcc-brand: 0 168 89;          --bcc-brand-ink: 6 17 12;
  --bcc-shadow-card: 0 1px 2px rgb(16 35 31 / .06), 0 8px 24px -12px rgb(16 35 31 / .18);
  --bcc-shadow-panel: 0 1px 0 rgb(255 255 255 / .6) inset, 0 10px 28px -18px rgb(16 35 31 / .22);
}

[data-theme="dark"] {
  color-scheme: dark;
  --bcc-canvas: 14 21 18;         --bcc-surface: 22 32 27;
  --bcc-raised: 27 39 33;         --bcc-line: 42 58 51;
  --bcc-line-strong: 58 79 70;    --bcc-ink: 239 233 218;
  --bcc-ink-soft: 203 191 176;    --bcc-muted: 159 176 168;
  --bcc-accent: 87 201 163;       --bcc-accent-strong: 127 220 187;
  --bcc-accent-soft: 22 53 43;    --bcc-accent-ink: 14 21 18;
  --bcc-safe: 52 201 139;         --bcc-safe-soft: 20 48 39;
  --bcc-safe-ink: 143 235 199;    --bcc-warn: 229 166 60;
  --bcc-warn-soft: 58 44 21;      --bcc-warn-ink: 243 199 126;
  --bcc-danger: 229 104 92;       --bcc-danger-soft: 60 35 32;
  --bcc-danger-ink: 255 179 169;  --bcc-guardian: 167 139 224;
  --bcc-guardian-soft: 43 35 64;  --bcc-paper: 27 39 33;
  --bcc-overlay: 5 10 8;          --bcc-bezel: 10 14 12;
  --bcc-brand: 0 168 89;          --bcc-brand-ink: 6 17 12;
  --bcc-shadow-card: 0 1px 0 rgb(255 255 255 / .04) inset, 0 12px 32px -18px rgb(0 0 0 / .85);
  --bcc-shadow-panel: 0 1px 0 rgb(255 255 255 / .05) inset, 0 14px 34px -20px rgb(0 0 0 / .9);
}

html { background: rgb(var(--bcc-canvas)); }
body {
  background: rgb(var(--bcc-canvas));
  color: rgb(var(--bcc-ink));
  font-family: var(--font-golos), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

Keep the selection, `.bcc-scroll`, input, placeholder, focus-visible, scam-mark, `.qr-grid`, `.rail`, keyframe, and reduced-motion rules; replace their literal colors with `rgb(var(--bcc-*) / …)`. Delete the entire mobile `@media (max-width: 1023px)` block that forces `text-[7px]…text-[10px]` to 11px.

- [ ] **Step 2: Map Tailwind to the tokens**

In `tailwind.config.ts` replace the `bcc` palette with:

```ts
colors: {
  canvas: "rgb(var(--bcc-canvas) / <alpha-value>)",
  surface: "rgb(var(--bcc-surface) / <alpha-value>)",
  raised: "rgb(var(--bcc-raised) / <alpha-value>)",
  line: "rgb(var(--bcc-line) / <alpha-value>)",
  "line-strong": "rgb(var(--bcc-line-strong) / <alpha-value>)",
  ink: "rgb(var(--bcc-ink) / <alpha-value>)",
  "ink-soft": "rgb(var(--bcc-ink-soft) / <alpha-value>)",
  muted: "rgb(var(--bcc-muted) / <alpha-value>)",
  accent: "rgb(var(--bcc-accent) / <alpha-value>)",
  "accent-strong": "rgb(var(--bcc-accent-strong) / <alpha-value>)",
  "accent-soft": "rgb(var(--bcc-accent-soft) / <alpha-value>)",
  "accent-ink": "rgb(var(--bcc-accent-ink) / <alpha-value>)",
  safe: "rgb(var(--bcc-safe) / <alpha-value>)",
  "safe-soft": "rgb(var(--bcc-safe-soft) / <alpha-value>)",
  "safe-ink": "rgb(var(--bcc-safe-ink) / <alpha-value>)",
  warn: "rgb(var(--bcc-warn) / <alpha-value>)",
  "warn-soft": "rgb(var(--bcc-warn-soft) / <alpha-value>)",
  "warn-ink": "rgb(var(--bcc-warn-ink) / <alpha-value>)",
  danger: "rgb(var(--bcc-danger) / <alpha-value>)",
  "danger-soft": "rgb(var(--bcc-danger-soft) / <alpha-value>)",
  "danger-ink": "rgb(var(--bcc-danger-ink) / <alpha-value>)",
  guardian: "rgb(var(--bcc-guardian) / <alpha-value>)",
  "guardian-soft": "rgb(var(--bcc-guardian-soft) / <alpha-value>)",
  paper: "rgb(var(--bcc-paper) / <alpha-value>)",
  overlay: "rgb(var(--bcc-overlay) / <alpha-value>)",
  bezel: "rgb(var(--bcc-bezel) / <alpha-value>)",
  brand: "rgb(var(--bcc-brand) / <alpha-value>)",
  "brand-ink": "rgb(var(--bcc-brand-ink) / <alpha-value>)",
},
fontFamily: {
  sans: ["var(--font-golos)", "system-ui", "sans-serif"],
  display: ["var(--font-literata)", "Georgia", "serif"],
  mono: ["var(--font-spline)", "ui-monospace", "monospace"],
},
fontSize: {
  screen: ["24px", { lineHeight: "29px", letterSpacing: "-0.01em" }],
  modal: ["20px", { lineHeight: "26px" }],
  score: ["40px", { lineHeight: "40px" }],
  section: ["16px", { lineHeight: "22px" }],
  body: ["14px", { lineHeight: "22px" }],
  secondary: ["13px", { lineHeight: "18px" }],
  meta: ["12px", { lineHeight: "16px" }],
  aux: ["11px", { lineHeight: "14px" }],
  hash: ["12px", { lineHeight: "16px" }],
},
borderRadius: { control: "10px", card: "14px", sheet: "18px", device: "22px" },
boxShadow: { card: "var(--bcc-shadow-card)", panel: "var(--bcc-shadow-panel)" },
```

Keep `content`, keyframes, and animation entries. Keep the old `bcc` colors for now (screens still reference until Task 8); remove them there.

- [ ] **Step 3: Create `lib/theme.ts`**

```ts
export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "bcc_shield_360_theme_v1";
export function readTheme(): Theme { /* localStorage read, "dark" only when stored exactly; catch errors */ }
export function applyTheme(theme: Theme): void { /* set html data-theme + colorScheme + meta[theme-color] content (#F7F3EA / #0E1512) */ }
export function toggleTheme(current: Theme): Theme { /* compute next, persist, apply, return next; swallow storage errors */ }
```

No React imports. `applyTheme` must tolerate a missing meta tag.

- [ ] **Step 4: Wire fonts and the pre-paint script in `app/layout.tsx`**

Add:

```ts
import { Golos_Text, Literata, Spline_Sans_Mono } from "next/font/google";
const golos = Golos_Text({ subsets: ["cyrillic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-golos", display: "swap" });
const literata = Literata({ subsets: ["cyrillic", "latin"], weight: ["500", "600"], variable: "--font-literata", display: "swap" });
const spline = Spline_Sans_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-spline", display: "swap" });
```

Set `<html lang="ru" data-theme="light" className={`${golos.variable} ${literata.variable} ${spline.variable}`} suppressHydrationWarning>`, add inside `<head>`:

```tsx
<script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem("bcc_shield_360_theme_v1")==="dark"){document.documentElement.dataset.theme="dark";document.documentElement.style.colorScheme="dark";}}catch(e){}})();` }} />
```

Remove the three Google Fonts `<preconnect>/<link>` tags. Set `viewport.themeColor` to `[{ media: "(prefers-color-scheme: light)", color: "#F7F3EA" }, { media: "(prefers-color-scheme: dark)", color: "#0E1512" }]`.

- [ ] **Step 5: Add theme state, labels, and the toggle in `app/page.tsx`**

- RU_DICT: `themeToDark: "Тёмная тема"`, `themeToLight: "Светлая тема"`.
- KK_DICT: `themeToDark: "Қараңғы тақырып"`, `themeToLight: "Жарық тақырып"`.
- Import `readTheme, toggleTheme, type Theme` from `@/lib/theme`.
- Near `balance` state: `const [theme, setTheme] = useState<Theme>("light");`
- Near the storage effect: `useEffect(() => { setTheme(readTheme()); }, []);`
- In the header right cluster before `LangSwitch`: a 44px hit button, 32px visual, `aria-pressed={theme === "dark"}`, `aria-label={t(theme === "dark" ? "themeToLight" : "themeToDark")}`, `onClick={() => setTheme((v) => toggleTheme(v))}`, icons `Sun`/`Moon` size 16.

Style it with tokens now: outer `grid h-11 w-11 place-items-center`, inner `grid h-8 w-8 place-items-center rounded-control text-ink`, no border.

- [ ] **Step 6: Verify typecheck and first-paint behavior**

Run:
```powershell
npm run typecheck
```
Expected: no errors.

Start `npm run dev`, open the app, then in the browser console:
```js
document.documentElement.dataset.theme
localStorage.setItem("bcc_shield_360_theme_v1", "dark"); location.reload()
```
Expected after reload: `dataset.theme === "dark"` before any paint flash (verify with a reload trace or a screenshot taken immediately), toggle switches back to light instantly, reload keeps light.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css tailwind.config.ts app/layout.tsx lib/theme.ts app/page.tsx
git commit -m "feat(ui): add token layer, new fonts, and light/dark theme plumbing"
```

---

### Task 2: Chrome, header, navigation, and risk badge

**Files:**
- Modify: `app/page.tsx:3484-3548` (page shell, phone frame, island, header)
- Modify: `app/page.tsx` nav block (~`4830-4904`) and the aside container (~`4905`)
- Modify: `app/page.tsx` `RiskBadge` component

**Interfaces:**
- Consumes: Task 1 tokens and type roles.
- Produces: themed chrome; header without the protection chip; nav labels at 12px; `RiskBadge` using tint + `*-ink`.

- [ ] **Step 1: Restyle the shell**

- Page wrapper: `bg-canvas`.
- Phone frame: `bg-bezel`, keep `lg:w-[395px] lg:h-[852px]`, radius `device`, `shadow-panel`.
- Phone interior: `bg-surface`.
- Island: `bg-black` stays, ring `line/40`; status bar text `muted`.

- [ ] **Step 2: Restyle the header and remove the protection chip**

- Header padding `px-4 pb-4 pt-[max(14px,env(safe-area-inset-top))]`.
- Brand tile: `bg-brand text-brand-ink`, `rounded-control`, size 36.
- Wordmark: `text-ink text-[13px] font-semibold` — replace arbitrary with `text-meta font-semibold` (12px) only if it still reads as a wordmark; keep 13px via `text-secondary font-semibold` (13px). Subtitle: `text-meta text-muted`.
- Right cluster: `gap-1`, jury button 44px target with 32px visual (`rounded-control border border-line text-ink-soft`), theme toggle from Task 1, `LangSwitch`.
- Delete the `<span>` protection chip (lines 3529-3532) entirely.
- Screen title: `font-display text-screen text-ink`; subtitle `text-meta text-muted`; row `mt-4`.
- `RiskBadge`: text `text-meta` (12px), soft background + `*-ink` text + 6px dot; no glow; height ≤ 26px.

- [ ] **Step 3: Restyle the navigation**

- Container `h-14 border-t border-line bg-surface`.
- Labels `text-meta font-medium`; inactive `text-muted`, active `text-accent`.
- Icon tile 32px, `rounded-control`, active `bg-accent-soft`; active indicator `h-0.5 bg-accent` at the top of the tab, not a glow.
- Replace every `text-[8.5px]` label and any uppercase/tracking class.

- [ ] **Step 4: Restyle the aside container**

- Outer page grid stays; aside panel `bg-surface border border-line rounded-sheet shadow-panel`, width `lg:w-[480px]`.
- Inner headings `text-section font-sans font-semibold`; body `text-secondary text-muted`.

- [ ] **Step 5: Verify at 395px and both themes**

Run `npm run dev`, inspect at 395×852 and 1440×900:
- Wordmark not truncated, no header wrap; right cluster fits; no horizontal scroll.
- Toggle to dark and back; nav, badge, header remain legible.
- Title is Literata, labels are Golos.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): restyle app chrome, header, nav, and risk badge"
```

---

### Task 3: Transfer screen

**Files:**
- Modify: `app/page.tsx` inside `{tab === "transfer" && (` through the next `tab ===` block

**Interfaces:**
- Consumes: tokens, type roles, spacing set.
- Produces: transfer screen in both themes with the flattened balance hero.

- [ ] **Step 1: Flatten the balance hero**

Replace the gradient/dark balance card at ~`3613-3616` with `bg-surface border border-line rounded-card p-4`, a 2px `bg-accent` rule above the balance label, label `text-meta text-muted`, amount `font-sans font-semibold text-[28px] tabular-nums text-ink`, secondary amount `text-secondary text-muted`.

- [ ] **Step 2: Convert colors and sizes in the screen**

Map every hex/rgba in this block through the spec's legacy table: `#10B981` → `safe` (status) or `accent` (action); `#EF4444` → `danger` + `danger-soft`; `#F59E0B` → `warn`; `#8B5CF6` → `guardian`; surfaces → `surface`/`raised`; borders → `line`. Replace every `text-[Npx]` with `text-meta/secondary/body/section`; replace `px-2.5 py-2` with the 8/12/16 set; remove tracking and uppercase.

- [ ] **Step 3: Apply component rules**

Cards `rounded-card border-line p-4`; rows 48px min, `rounded-control` on press only; primary CTA `h-11 rounded-control bg-accent text-accent-ink text-body font-semibold`; secondary `border-line text-ink`; receipt strip `bg-paper border border-dashed border-line-strong rounded-control`.

- [ ] **Step 4: Verify the flow in both themes**

Run `npm run dev`; enter an amount, pick a recipient, submit, open the hold/confirm dialog path, confirm the HMAC receipt renders. Toggle theme at each step. Check 390px width: no overflow, labels ≥ 12px.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): restyle transfer screen for light and dark"
```

---

### Task 4: TrustLens screen

**Files:**
- Modify: `app/page.tsx` inside `{tab === "trustlens" && (`

**Interfaces:**
- Consumes: Task 1–3 system.
- Produces: TrustLens screen themed.

- [ ] **Step 1: Sweep colors and type**

Apply the legacy table; code word in `font-sans font-semibold` (never mono — Spline has no Cyrillic); hashes/signatures in `font-mono text-hash tabular-nums`; headings `text-section`, body `text-body`, helper `text-secondary`.
- [ ] **Step 2: Apply surfaces and spacing** — cards `surface + line + rounded-card p-4`; the code-word panel is `raised` with `border-line`; gaps 8/12/24; no pill stacks.
- [ ] **Step 3: Verify in both themes** — generate the code word, copy it, toggle language RU/KK; confirm the Cyrillic code word renders in Golos and stays legible.
- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): restyle TrustLens screen"
```

---

### Task 5: GuardPay screen

**Files:**
- Modify: `app/page.tsx` inside `{tab === "guardpay" && (`

**Interfaces:**
- Consumes: Task 1–4 system.
- Produces: GuardPay themed, including family/guardian states.

- [ ] **Step 1: Sweep colors and type** — status tones via `safe`/`warn`/`danger`/`guardian` with `*-soft` fills and `*-ink` text; amounts `font-sans font-semibold tabular-nums`; labels `text-meta`.
- [ ] **Step 2: Apply surfaces, controls, and spacing** — approval cards `surface + line`; selected `accent-soft` + `ring-1 ring-accent/16`; actions 44px; 8/12/24 rhythm.
- [ ] **Step 3: Verify the hold/approve paths in both themes** — trigger a guardian approval and a hold, confirm actions remain reachable and status tints readable; toggle theme mid-dialog.
- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): restyle GuardPay screen"
```

---

### Task 6: Scam scanner screen

**Files:**
- Modify: `app/page.tsx` inside `{tab === "scam" && (`

**Interfaces:**
- Consumes: Task 1–5 system.
- Produces: scanner themed; mark highlights readable on `paper`.

- [ ] **Step 1: Sweep colors and type** — textarea `surface + line + rounded-control`, 16px text; scan button primary; result rows `surface`; risk scale uses `safe/warn/danger` with `*-ink` labels.
- [ ] **Step 2: Restyle scanned-text marks** — mark backgrounds `danger-soft`/`warn-soft`/`accent-soft`; mark text `danger-ink`/`warn-ink`/`accent-strong`; no `#hex` left in the mark logic or classes.
- [ ] **Step 3: Verify the deterministic scan in both themes** — paste a scam sample with a phone number and amount, run the scan with no API key; confirm masking, marks, and the verdict are legible; 390px: no overflow.
- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): restyle scam scanner and highlight marks"
```

---

### Task 7: Dialogs and jury deck

**Files:**
- Modify: `app/page.tsx` dialog components (`1443-1735`, `1736-1888`, `1889-2122`, `2123-2430` areas) and the success receipt
- Modify: `app/page.tsx` `JURY_TONE` map (~`2035`) and the aside deck (~`4905-5100`)

**Interfaces:**
- Consumes: tokens, sizes, component rules.
- Produces: six dialogs (hold, cooldown, result, NBRK report, jury, success receipt) and the jury deck in both themes.

- [ ] **Step 1: Dialog shell** — scrim `bg-overlay/45` light and `bg-overlay/70` dark (no `bg-black/70`), panel `surface + line + rounded-sheet`, title `font-display text-modal`, body `text-body`, actions stacked 8 apart, primary/secondary per component rules, 44px targets.
- [ ] **Step 2: Tinted states** — warning banners `warn-soft` + `warn-ink` + `border-warn/35`; danger `danger-soft` + `danger-ink`; guardian `guardian-soft` + `guardian`.
- [ ] **Step 3: Jury deck** — panel `surface`, score `font-display text-score` (40, jury only), section headings `text-section`, rows `raised` with `line`; `JURY_TONE` returns token classes, not hexes; aside top block may scroll if needed.
- [ ] **Step 4: Verify all six in both themes** — open each dialog, check title/body/warning/disabled states, scrim contrast, close button reachability at 390px; toggle mid-dialog.
- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): restyle dialogs and jury deck"
```

---

### Task 8: Cleanup sweep and legacy removal

**Files:**
- Modify: `app/page.tsx` (remaining literals anywhere in the file)
- Modify: `tailwind.config.ts` (remove the legacy `bcc` palette, `phone` shadow, and old animations if unused)
- Modify: `app/globals.css` (remove dead legacy classes)
- Modify: `README.md` (visual system + theme section)

**Interfaces:**
- Consumes: all previous tasks.
- Produces: zero raw colors and zero arbitrary font sizes in component code.

- [ ] **Step 1: Run the gates and fix what they find**

```powershell
rg -n "text-\[[0-9.]+px\]" app/page.tsx
rg -n "#[0-9A-Fa-f]{3,8}" app/page.tsx
rg -n "bg-white|text-white|ring-white|border-white" app/page.tsx
rg -n "tracking-\[|uppercase" app/page.tsx
rg -n "bg-bcc-|text-bcc-|border-bcc-|shadow-phone" app/page.tsx
```
Expected: all five return no matches. Fix each remaining hit by role (spec legacy table), not by nearest color.

- [ ] **Step 2: Remove legacy Tailwind entries** — delete the `bcc` color object, `shadow.phone`, and any animation keyframes no longer referenced (`rg` first). Keep `fade-rise`/`drawer-up` if still used.

- [ ] **Step 3: Remove dead CSS** — delete scam-mark variants or rail rules that no longer have consumers; keep `.bcc-scroll`, focus-visible, QR, reduced-motion.

- [ ] **Step 4: Update README** — add a "Visual system" section: light default, dark toggle, token names, fonts, 12px floor, `bcc_shield_360_theme_v1`.

- [ ] **Step 5: Verify**

```powershell
npm run typecheck
npm run build
```
Expected: both succeed, font assets listed in build output, no Google Fonts request at runtime.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/globals.css tailwind.config.ts README.md
git commit -m "chore(ui): remove legacy palette and finish the token sweep"
```

---

### Task 9: Final verification

**Files:** none modified unless a check fails.

**Interfaces:**
- Consumes: everything.
- Produces: evidence for the acceptance criteria in the spec.

- [ ] **Step 1: Automated gates**

```powershell
npm run typecheck
npm run build
rg -n "text-\[[0-9.]+px\]|bg-white|text-white|#06110C|#0B1F17|#10B981" app/page.tsx app/globals.css
```
Expected: typecheck/build pass; the grep returns no matches.

- [ ] **Step 2: First-paint check (Review Focus)**

Set dark in localStorage, hard reload, capture immediately. Expected: `html[data-theme="dark"]` is already set before content paints; no light flash. Repeat with light.

- [ ] **Step 3: Screen and dialog matrix**

For each of the four tabs × two themes, plus six dialogs: screenshot at 390px and 1440px. Check: no overflow, labels ≥ 12px, Literata only in titles/score, status text readable, scrim contrast, disabled actions distinguishable.

- [ ] **Step 4: State and flow regression**

- `bcc_shield_360_state_v2` survives a toggle and reload (balance, profile, recipients intact).
- Transfer → hold → HMAC receipt; TrustLens code word; GuardPay hold/approve; scam scan + marks; RU/KK switch; theme toggle mid-flow.
- Manifest `theme_color`/`background_color` and the runtime meta update on toggle.

- [ ] **Step 5: Offline font check**

Block network access to `fonts.googleapis.com` and `fonts.gstatic.com` (or disable network) and reload. Expected: no request to those hosts; Literata/Golos render from `/_next/static` assets with Cyrillic intact.

- [ ] **Step 6: Contrast spot-check**

In both themes, read computed colors for: body text on `surface`, muted meta on `surface`, `safe-ink` on `safe-soft`, `warn-ink` on `warn-soft`, `danger-ink` on `danger-soft`, `accent` on `surface`. Expected: ≥ 4.5:1 for small text, ≥ 3:1 for the jury score.

- [ ] **Step 7: Record and commit only fixes**

```bash
git status --short
git add app lib tailwind.config.ts README.md docs
git commit -m "test(ui): verify light and dark visual system"
```
If no files changed, skip the commit and record "verification only".

---

## Self-Review Notes

- **Spec coverage:** tokens (Task 1), typography (Tasks 1–7), spacing (Tasks 2–7), theme mechanism (Tasks 1, 9), all screens (3–6), dialogs/jury (7), manifest/README (8), verification (9).
- **Interfaces:** `Theme`, `readTheme`, `applyTheme`, `toggleTheme`, token names, size roles, and radii are defined once in Task 1 and consumed by name later.
- **Review Focus** tests live in Task 9 (first paint, state, contrast, fonts), Task 2 (395px header), Task 7 (dialogs); tinted-text contrast is also checked in Task 9.
- The two font-only risks (Cyrillic code word, Spline Latin-only) are pinned in Task 4 and Task 9.
