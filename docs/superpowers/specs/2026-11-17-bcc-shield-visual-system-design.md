# BCC Shield 360 — Visual System, Light Theme, and Dark Theme

**Status:** design for approval
**Date:** 2026-11-17
**Visual reference:** `.superpowers/brainstorm/287-1794884292/content/direction.html`, card **C «Полис»** (scratch mockup, git-ignored; not part of the repository)

## Intent

The demo works, but it reads as generated: Inter everywhere, 8–10px labels, cramped
gaps, one hardcoded dark palette, glows and pills. The design should feel like a
reliable bank's own product — calm, legible, document-like — and must work in both
light and dark themes without a second visual language.

The chosen direction is **«Полис»**: cream paper, Literata for titles and scores,
Golos Text for interfaces, Spline Sans Mono for hashes and receipts, dashed
receipt rules, green ink instead of neon. A bank document, not a dashboard.

## Goals

- One semantic token layer drives both themes; no component knows a hex value.
- Light theme is the default; dark theme is a first-class derivation, not an inversion.
- Typography floor: no user-facing label below 12px; no uppercase tracking.
- Spacing follows a 4px scale with deliberate section rhythm.
- All four screens, the dialogs, the jury deck, and the phone chrome restyle together.
- Zero behavior changes: risk engine, HMAC receipts, storage keys, i18n, and flows stay intact.

## Non-goals

- No state refactor, no new feature, no copy rewrite (only theme-toggle labels are added).
- No component library extraction; no splitting `app/page.tsx`.
- No illustration, icon set replacement, or animation redesign beyond color and timing.
- No system-theme follower in v1 (a stage demo should not flip because a laptop is dark).
- No new protection-score ring or metric; the mockup's ring was illustrative.
- No decorative gradients; the balance hero becomes a flat card.
- No print stylesheet, no high-contrast mode, no per-screen themes.

## Anti-goals

- A light theme that is the dark palette inverted (washed-out mint on white).
- Serif everywhere: Literata is an accent, not body text.
- Neon green, glow shadows, gradient text, pill overload, uppercase micro-labels.
- A second set of hardcoded hex values for light mode inside `page.tsx`.
- Redesigning screens while the demo flows are unverified.

## Constraints

- Stack is Next.js 14.2.33, React 18.3.1, TypeScript 5.7, Tailwind 3.4; no new runtime
  dependency. `next/font/google` is built into Next and acceptable.
- `app/page.tsx` is 5,087 lines / ~201 KB and is a single client component; edits are
  mechanical sweeps, not restructuring.
- Existing storage `bcc_shield_360_state_v2` must keep working untouched.
- RU and KK must both render; Cyrillic subsets are required for Literata and Golos Text.
- The demo runs on Vercel and on a judge's laptop; fonts must not depend on Google at runtime.
- Current classes encode 226 hex colors and 241 arbitrary text sizes; both must reach zero.
- `.superpowers/` is git-ignored; mockups are references only.

## Approaches considered

1. **Token layer + typography + spacing sweep (picked).** Semantic CSS variables in
   `globals.css`, Tailwind colors as RGB channels, fonts via `next/font`, then a
   screen-by-screen replacement of hexes and arbitrary sizes. Logic untouched.
   Bounded blast radius; fixes exactly the three complaints (font, spacing, background).
2. **Design-system extraction.** The same token layer plus `components/ui/*` primitives
   and rewritten screen markup. Cleaner long-term, but it moves a 5k-line file's JSX
   around days before a demo and adds regression risk without visible payoff.
3. **Palette-and-fonts only.** Fast, but spacing and 8–10px labels stay; the main
   complaint survives. Rejected.

## The visual system

### Color tokens

Defined as space-separated RGB channels so Tailwind opacity modifiers keep working:
`colors: { canvas: "rgb(var(--bcc-canvas) / <alpha-value>)" }` and CSS uses
`rgb(var(--bcc-accent))`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | 247 243 234 `#F7F3EA` | 14 21 18 `#0E1512` | page behind the phone / outside frame |
| `surface` | 255 253 247 `#FFFDF7` | 22 32 27 `#16201B` | phone body, cards, sheets |
| `raised` | 251 247 238 `#FBF7EE` | 27 39 33 `#1B2721` | inset blocks, rows on surface |
| `line` | 217 207 187 `#D9CFBB` | 42 58 51 `#2A3A33` | 1px borders, dividers |
| `line-strong` | 196 184 161 `#C4B8A1` | 58 79 70 `#3A4F46` | emphasized borders, focus track |
| `ink` | 16 35 31 `#10231F` | 239 233 218 `#EFE9DA` | primary text |
| `ink-soft` | 55 74 67 `#374A43` | 203 191 176 `#CBBFB0` | secondary text on colored surfaces |
| `muted` | 94 111 105 `#5E6F69` | 159 176 168 `#9FB0A8` | captions, units, inactive nav |
| `accent` | 14 110 90 `#0E6E5A` | 87 201 163 `#57C9A3` | primary actions, links, score arc |
| `accent-strong` | 11 90 73 `#0B5A49` | 127 220 187 `#7FDCBB` | hover/pressed, emphasis text |
| `accent-soft` | 228 239 233 `#E4EFE9` | 22 53 43 `#16352B` | icon tiles, selected rows, badges |
| `accent-ink` | 255 253 247 `#FFFDF7` | 14 21 18 `#0E1512` | text/icons on accent fills |
| `brand` | 0 168 89 `#00A859` | 0 168 89 `#00A859` | logo tile only (theme-independent) |
| `brand-ink` | 6 17 12 `#06110C` | 6 17 12 `#06110C` | shield glyph inside the logo tile |
| `safe` | 20 122 91 `#147A5B` | 52 201 139 `#34C98B` | allowed, active protection |
| `safe-soft` | 226 241 233 `#E2F1E9` | 20 48 39 `#143027` | safe tint backgrounds |
| `safe-ink` | 11 93 68 `#0B5D44` | 143 235 199 `#8FEBC7` | safe text on `safe-soft` |
| `warn` | 156 95 18 `#9C5F12` | 229 166 60 `#E5A63C` | cool-down, caution |
| `warn-soft` | 246 231 201 `#F6E7C9` | 58 44 21 `#3A2C15` | warning tint backgrounds |
| `warn-ink` | 122 71 8 `#7A4708` | 243 199 126 `#F3C77E` | warning text on `warn-soft` |
| `danger` | 180 69 59 `#B4453B` | 229 104 92 `#E5685C` | blocked, critical |
| `danger-soft` | 244 223 218 `#F4DFDA` | 60 35 32 `#3C2320` | danger tint backgrounds |
| `danger-ink` | 142 47 39 `#8E2F27` | 255 179 169 `#FFB3A9` | danger text on `danger-soft` |
| `guardian` | 109 85 168 `#6D55A8` | 167 139 224 `#A78BE0` | guardian approval, multi-signature |
| `guardian-soft` | 232 226 243 `#E8E2F3` | 43 35 64 `#2B2340` | guardian tint backgrounds |
| `paper` | 243 237 221 `#F3EDDD` | 27 39 33 `#1B2721` | receipt body, QR background |
| `overlay` | 16 35 31 `#10231F` | 5 10 8 `#050A08` | modal scrims (use `/45` and `/70`) |
| `bezel` | 24 32 28 `#18201C` | 10 14 12 `#0A0E0C` | desktop phone frame |

Brand green `#00A859` survives only as the app icon / logo mark fill (`public/icon.svg`,
`layout.tsx` icon data URI). It never returns as a text or surface color.

Contrast targets: primary and secondary text ≥ 4.5:1 on `surface` and `raised`;
large scores ≥ 3:1. Status text on a `-soft` background uses the matching `*-ink`
(`safe-ink`, `warn-ink`, `danger-ink`); the base status colors are for fills, dots,
borders, and icons, not for small text on tints. The table above is chosen to meet
these; any change must be re-checked.

### Legacy mapping rules

Every literal in `app/page.tsx` maps by role, never by raw equality alone:

| Legacy | Token |
|---|---|
| `#06110C`, `#020806` | `canvas` (page), `overlay` (scrims), `surface` (inputs), `raised` (inset wells/`<pre>`), `paper` (receipt/QR) — decide by element, not equality |
| `#0B1F17` | `surface` (phone/modal), `raised` (inset row) |
| `#122B21`, `#163527` | `raised` |
| `#1E4233` | `line` |
| `#00A859` | `accent` (fills/buttons); logo mark keeps brand green |
| `#10B981`, `#34D399`, `#6EE7B7` | `safe` or `accent` / `accent-strong` by role |
| `#7FA793`, `#648975` | `muted` |
| `#A9CBB9`, `#CFE8DC` | `ink-soft` |
| `#E8F5EE`, `#F2FFF9` | `ink`; QR paper uses `paper` |
| `#F59E0B`, `#E7C98A` | `warn` (text) / `warn-soft` (fill) |
| `#8B5CF6`, `#C4B5FD` | `guardian` |
| `#EF4444`, `#FECACA` | `danger` / `danger-soft` |
| `#04130C` | `accent-ink` |

Existing `rgba(...)` values in `page.tsx`, `globals.css`, and palette maps become
`rgb(var(--bcc-*) / <alpha>)`. The fanned-out maps (`STREAM_TONE` around line 1413,
`JURY_TONE` around line 2035, `scamTone`, `phishTone`) are converted first because
each one feeds many rows.

### Typography

| Role | Family | Weight / size / line | Notes |
|---|---|---|---|
| Screen title | Literata | 600, 24/29, `-0.01em` | replaces 22px Inter |
| Modal title | Literata | 600, 20/26 | |
| Score / total | Literata | 600, 40/40, tabular | jury unified risk score only (42→40); scanner, phishing, and balance numerals stay Golos 600 tabular |
| Section heading | Golos Text | 600, 16/22 | |
| Card / row title | Golos Text | 600, 14/20 | |
| Body | Golos Text | 400, 14/22 | |
| Secondary | Golos Text | 400, 13/18 | |
| Meta | Golos Text | 500, 12/16 | smallest allowed for meaning-bearing text |
| Auxiliary | Golos Text | 400, 11/14 | timestamps only, never a label |
| Hash / receipt | Spline Sans Mono | 400–500, 11–13/16, tabular | no uppercase tracking |

Rules:

- Literata appears only in screen titles, modal titles, and the score. Everything else is Golos.
- Delete `text-[7px]`…`text-[10.5px]` everywhere; the 11px floor applies to auxiliary only.
- Remove the mobile `!important` font-size override in `globals.css`; the floor lives in code.
- No uppercase labels; no positive letter-spacing. Negative tracking only on Literata titles.
- Numeric tables, scores, and amounts use `tabular-nums`.
- Load with `next/font/google`: `Literata` (cyrillic+latin, 500/600),
  `Golos_Text` (cyrillic+latin, 400/500/600/700), `Spline_Sans_Mono` (latin, 400/500).
  CSS variables `--font-literata`, `--font-golos`, `--font-spline`; Tailwind families
  `display`, `sans`, `mono`. Remove the Google Fonts `<link>` and Inter from `globals.css`.

### Spacing and rhythm

- Base 4px. Working set: 4, 8, 12, 16, 20, 24, 32, 40.
- Screen padding 16; card padding 16; row vertical padding 12; row gap 8; section gap 24.
- List containers: 8 between rows, 16 after the list, 24 before the next section.
- Header: 16 bottom, 12 between brand and title block; nav height 56.
- Touch targets ≥ 44px; icon buttons 32px visual inside a 44px hit area where possible.
- No stacks of `1.5`/`2`/`2.5` between unrelated elements; those stay only between an icon
  and its label, or inside a badge.

### Radii, borders, shadows, motion

- Radii: control 10, card 14, sheet/modal 18, phone/device 22, pill 999.
  Tailwind: `rounded-control`, `rounded-card`, `rounded-sheet`, `rounded-device`.
- Borders: 1px `line`; emphasized 1px `line-strong`; tinted state borders use `accent/30`,
  `warn/35`, `danger/35`, `guardian/35`.
- Shadows: light `0 1px 2px rgb(16 35 31 / .06), 0 8px 24px -12px rgb(16 35 31 / .18)`;
  dark `0 1px 0 rgb(255 255 255 / .04) inset, 0 12px 32px -18px rgb(0 0 0 / .85)`.
  No glow shadows; the radar pulse keeps its keyframes but uses `danger` via a CSS var.
- Motion stays 180–280ms; `fade-rise` and `drawer-up` keep their shape. Reduced-motion
  behavior is preserved.

### Component rules

- **Card:** `surface`, border `line`, radius `card`, padding 16. No shadow on cards in light.
- **Row:** 48px min height, title 14/600, secondary 13/400, chevron `muted`, 1px divider
  or 8px gap depending on grouping; pressed state uses `raised`.
- **Primary button:** `accent` fill, `accent-ink` text, radius `control`, 44px height,
  14/600; hover `accent-strong`; disabled `line` fill + `muted` text.
- **Secondary:** transparent, `line` border, `ink` text; hover `raised`.
- **Status badge:** `-soft` background, strong text, 6px dot, radius pill, 12/500.
  One badge per state; no glow, no gradient.
- **Risk indicator:** no ring and no new metric. The existing header risk badge and risk
  scale bar are restyled with `accent`/`warn`/`danger` and `*-soft` tints; the jury's
  unified risk score is Literata 40, every other numeral stays Golos 600 tabular.
- **Header:** wordmark, language switch, and 32px theme toggle (inside a 44px target) on
  the 395px phone; the protection chip leaves the phone header — state stays visible in
  the risk badge and the jury panel. The wordmark is never truncated.
- **Balance hero:** flat `surface` card with 1px `line` and an `accent` rule; no gradient,
  no dark-green block. Amount in Golos 600 tabular, labels `muted`.
- **QR:** `paper` container with `ink` cells; never `surface`.
- **Receipt:** `paper` background, 1px dashed `line-strong`, radius `control`, mono hash
  12/400 `muted`, title 13/600 `ink`.
- **Input:** `surface`, border `line`, radius `control`, 44px, 16px text (keeps iOS zoom off),
  placeholder `muted`.
- **Modal / dialog:** `surface`, radius `sheet`, 1px `line`, overlay `overlay/45` in light
  and `overlay/70` in dark; title Literata; body 14/400; actions stack 8 apart.
- **Nav:** 56px, labels 12/500, inactive `muted`, active `accent`; icon tile radius 8 in
  `accent-soft`; active indicator is a 2px top rule, not a glow.
- **Jury deck / aside:** same tokens; panel `surface`, inner cards `raised`, headings
  Golos 600 16, no separate dark styling.
- **Phone chrome:** page canvas behind, bezel token, inner `surface`; status bar `muted`
  icons; the notch/dynamic-island stays near-black in both themes. Outer hardware radius
  stays 46px; `rounded-device` (22px) applies to inner device surfaces.

### Theme mechanism

- `<html data-theme="light">` by default. `[data-theme="dark"]` overrides the variable block.
- Storage key `bcc_shield_360_theme_v1`, values `light` | `dark`. Absent → light.
- Pre-paint inline script in `app/layout.tsx` reads the key and sets the attribute before
  first paint; no flash. `color-scheme` follows the theme so native controls match.
- Toggle: 32px sun/moon button inside a 44px hit target, beside the language switch.
  Render both icons and hide one via `[data-theme="dark"]` CSS so no icon flashes on the
  first frame; sync `aria-pressed` and the localized label (`themeToDark`/`themeToLight`,
  RU/KK) in an effect. It updates the attribute, the storage key, and `meta[name="theme-color"]`.
- `viewport.themeColor` is one static `#F7F3EA` (light default); the pre-paint script and
  the toggle update `meta[name="theme-color"]` to the active canvas. A media-query pair
  would follow the OS, not the stored theme. The iOS status bar style stays static
  (dark text on cream).
- Theme state is UI-local to the page; no context, no provider, no storage inside the
  risk-state object.

## File map

| File | Change |
|---|---|
| `app/globals.css` | Rewrite base: token blocks, body, selection, scrollbars, focus, scam marks, QR, mobile floor removed, reduced motion kept |
| `tailwind.config.ts` | Colors as RGB-var channels, font families, radii, shadows, keyframes colors |
| `app/layout.tsx` | `next/font` setup, pre-paint theme script, themeColor pair; remove Google Fonts links |
| `app/page.tsx` | Header toggle + i18n keys; token/type/spacing sweep across shell, four screens, dialogs, aside, nav, palette maps |
| `lib/theme.ts` (new) | `Theme` type, storage key, `readTheme`, `applyTheme`, `toggleTheme`; no React |
| `public/icon.svg`, `app/manifest.ts` | Brand mark stays; manifest `background_color` = light canvas `#F7F3EA`, `theme_color` = `accent` `#0E6E5A` (not brand green) |

No other source files are expected to change.

## Rollout order

1. **Foundation:** tokens, Tailwind mapping, fonts, `lib/theme.ts`, layout script,
   header toggle. The app renders in both themes; components still use legacy classes.
2. **Chrome and navigation:** page canvas, phone frame, status bar, header, nav.
3. **Transfer screen.**
4. **TrustLens screen.**
5. **GuardPay screen.**
6. **Scam scanner screen.**
7. **Dialogs and jury deck:** hold, cooldown, report, result, success receipt, NBRK
   report, drawer, aside.
8. **Sweep cleanup:** palette maps, remaining hexes/rgba, arbitrary sizes, spacing rhythm
   per screen, remove the mobile override.
9. **Verification:** both themes, four tabs, dialogs, 390px and 1440px, flows, contrast.

Each screen is verified in both themes before the next one starts; a screen is not
"done" because it compiles.

## Verification

- `npm run typecheck` and `npm run build` pass.
- `rg -n '#[0-9A-Fa-f]{3,8}' app/page.tsx app/globals.css` finds only token definitions
  (none in component code); `rg -n 'text-\[[0-9.]+px\]' app/page.tsx` returns zero.
- First paint carries the stored `data-theme` before any render: inspect the head script
  and the attribute on a cold load. A screenshot alone does not prove the absence of flash.
- Toggle switches immediately and persists; both icons resolve without a first-frame
  flash; `aria-pressed` and the visible label match the theme.
- Header at 395px fits wordmark, language switch, and toggle with ≥12px labels and 44px
  targets; no clipped chip, no truncated wordmark.
- Status text on tinted backgrounds uses `*-ink` and passes 4.5:1; QR renders `paper`
  with `ink` cells.
- One online `npm run build` before the demo; runtime has no Google Fonts dependency.
- Manifest colors and `theme-color` match the stored theme after a toggle.
- Four tabs × two themes, plus hold/cooldown/report/result/success dialogs and the
  jury drawer: text legible, no clipped content, no white-on-cream or dark-text-on-dark
  artifacts.
- Existing flows pass in both themes: transfer + HMAC receipt, TrustLens code word,
  GuardPay hold/approval, scam scan (deterministic path, no API key), language switch RU/KK.
- `bcc_shield_360_state_v2` data survives a toggle and a reload.
- Contrast spot-check (AA) for body/muted/status text; large score ≥ 3:1.
- 390px viewport: no horizontal scroll, nav reachable, labels ≥ 12px; 1440px: phone and
  aside aligned, no layout jump when toggling.

## Risks

- **5k-line sweep:** mechanical edits can hit dynamic class strings. Mitigation: convert
  palette maps first, per-screen commits, grep gates, typecheck after each slice.
- **Contrast drift:** manual token edits can quietly fail AA. Mitigation: fixed table,
  contrast check in verification.
- **Font loading/build:** `next/font` needs network at build and correct Cyrillic subsets.
  Mitigation: build once before the sweep; fallback is the existing `<link>`.
- **Theme flash:** a client-side effect is too late. Mitigation: pre-paint script in `<head>`.
- **Demo regression:** visual edits while logic is untouched. Mitigation: no JSX restructure
  beyond class strings; run every flow after each screen.
- **Light-mode tint blindness:** soft backgrounds can hide status text. Mitigation: status
  text uses strong tokens, never `-soft` backgrounds as text color.

## What is left to the builder

- The exact per-occurrence mapping of remaining colors and arbitrary sizes, guided by the
  tables above; where a literal serves two roles (e.g. `#E8F5EE` text vs QR paper), decide
  by the element, not by equality.
- Final spacing values inside the dense scam-scanner and jury deck, within the stated set.
- Whether the theme toggle becomes a tiny `ThemeToggle` component inside `page.tsx` or
  stays inline; no new files beyond `lib/theme.ts`.
- Screenshot tooling for the verification pass (existing Playwright scripts or the browser
  tool), kept out of the repository.

## Builder-check rulings (minor, settled)

- Translucent `#06110C/70|40` chips become opaque `raised` + `line`; `bg-white*`,
  `bg-white/20`, `ring-white/5` map to `ink`, `ink/20`, `line`; the toggle knob is `surface`.
- Inline `meta.hex`/`tone.hex` values and arbitrary `rgba()` shadows must become token
  strings, CSS vars, or ring utilities; the hex grep alone is not the gate.
- Add the type roles as `fontSize` entries in Tailwind (`screen`, `modal`, `score`,
  `section`, `body`, `secondary`, `aux`, `hash`) so the table and the zero-arbitrary-size
  gate agree.
- Literata and Golos Text load `cyrillic-ext` (ә, ғ, қ, ң, ө, ұ, ү, һ). Spline Sans Mono
  is Latin-only: Cyrillic code words, JSON, and receipts use Golos 600.
- Keep the strings RU/ҚАЗ/REC/LIVE but remove uppercase and tracking classes; copy is frozen.
- The sixth dialog (success receipt) is part of the dialog sweep.
- The jury aside's top block may scroll, and its rows may relax below 48px, to avoid clipping
  the bottom controls at 852px.
- 44px hit areas use transparent insets; visual controls stay 32px. The pending-count badge
  becomes an 18px pill with 12/500 type.
- `shadow-phone`/`shadow-panel` derive from the per-theme shadow token; bars cap at 280ms;
  selected rows use `accent-soft` + `ring-accent/16`; disabled primary uses `line` + `muted`.
- One online `npm run build` before the demo and ship `.next`/Vercel; both `next/font` and
  a Google `<link>` fail offline. Manifest `background_color` is the light canvas,
  `theme_color` is `accent`.
- Remove the legacy `bcc` hex palette and hardcoded shadows from Tailwind after the token
  move; update the README's font/manifest lines rather than leaving them stale.

## Calls made after the builder check

1. **Tint text gets `*-ink` tokens.** Base `safe`/`warn`/`danger` stay for fills, dots,
   borders, and icons; small text on `-soft` backgrounds uses `safe-ink`, `warn-ink`,
   `danger-ink`. This keeps AA without flattening the status palette. If wrong: two extra
   tokens per theme, cheap to remove.
2. **No protection ring.** The mockup ring was illustrative; the app has no such metric.
   The existing risk badge and scale are restyled instead, and Literata 40 applies only to
   the jury's unified score. If wrong: add a ring later as a feature, not a re-skin.
3. **The protection chip leaves the phone header.** Wordmark + language + toggle remain at
   395px; state stays visible in the risk badge and jury panel. If wrong: the chip returns
   as a 12px line under the title.
4. **The balance hero is flat.** No gradient, no dark-green card: `surface` + `line` +
   `accent` rule. A branded dark card would need its own on-brand tokens and would fight
   the cream direction. If wrong: add on-brand tokens as a contained follow-up.
5. **Brand is a token.** `brand`/`brand-ink` keep the logo tile and shield glyph constant
   across themes; interactive accent stays `accent`.

## Decisions proposed to the human

1. **Default light**, manual toggle, no system follower. (Recommended: predictable on stage.)
2. **Keep the phone frame and jury aside** as demo chrome, restyled with tokens.
3. **Serif is an accent:** Literata for screen/modal titles and the score only; Golos Text
   for everything else.
4. **Brand green `#00A859` stays in the logo/icon only**; interactive accent becomes
   `#0E6E5A` light / `#57C9A3` dark.
