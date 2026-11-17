---
topic: rewrite all cross-screen state into Redux
slug: 2026-11-16-probe-redux-rewrite
date: 2026-11-16
verdict_summary: NO — do not adopt Redux; rehearse, then at most a persisted-state module move and the scam-screen extraction
rounds: 1
participants: [debate-proposer, debate-scope-critic, debate-value-critic, debate-feasibility-critic, debate-red-team-critic]
critics_decided: 4/4
missing_voices: []
status: decided
---

# Debate: rewrite all cross-screen state into Redux

## Intent

Idea as given: rewrite all cross-screen state into Redux. Budget hint: `time=1 week`, `capacity=1 dev`. The human's terms were not expanded beyond that; this probe tests whether the crew kills an architecture pitch that a judge cannot see.

## Ground

- **Project type:** demo/UI — hackathon demo for BCC Bank (ITU Hackathon 2026).
- **Audience:** judges (primary), end users (secondary).
- **Stack:** Next.js 14.2.33 App Router, React 18.3.1, TypeScript 5.7, Tailwind 3.4; dependencies only `lucide-react` plus `next`/`react` (`package.json:12-17`).
- **Baseline:** one client component `app/page.tsx`, 5,087 lines / 200,990 bytes (`(Get-Content app/page.tsx).Count`), holding the risk engine, HMAC receipts, four screens, RU/KK i18n; zero test/spec files; deploy target Vercel.
- **Budget:** `ASSUMPTION time=1 week, capacity=1 dev`, taken from the idea.
- **Structural facts:** `Page()` starts at `app/page.tsx:2339`; all screen state is one `useState` block at `app/page.tsx:2340-2382`; the four screens are `tab ===` branches in the same closure at `app/page.tsx:3550`, `3839`, `4151`, `4532`; persistence is gated on `isMounted`/`hydrated` (`app/page.tsx:2451-2467`) and writes exactly six fields (`2472-2479`).

## Ballot

- `as-asked`: rewrite all cross-screen state into Redux (time=1 week, capacity=1 dev).
- `do-nothing`: defer the rewrite; spend the week on build verification, rehearsal of the 10 jury scenarios, and bug fixes only.
- `alt-1`: split the 5,087-line file into screen modules first, no store library.
- `alt-2`: narrow state extraction into one typed persisted-state module, no Redux.

## Attacks

**Scope critic:** as-asked KILL - the 34 `useState` declarations already live in one `Page()` (`app/page.tsx:2339`, `2340-2382`) and the "screens" read the same closure (`3550/3839/4151/4532`); there are zero props to cross. Migration means converting 186 setter call sites (grep `set[A-Z]`), including the multi-setter blocks at `2842-2864` and the 27-setter reset at `2657-2685`, and re-opening the solved hydration invariant (`2451-2467`). do-nothing KEEP. alt-1 RESHAPE to the scam block only (`4532`), ~1 day. alt-2 RESHAPE to pure module extraction from `802-891`, no subscription.

**Value critic:** as-asked KILL — a judge sees the same phone, risk score and HMAC passport in 90 seconds; README never sells state architecture (`README.md:14-27`, `154-161`) and persistence is already documented as working (`README.md:69-72`). do-nothing KEEP. alt-1 RESHAPE (scam screen only, ~1 day). alt-2 KEEP (lang + persisted state, observable on stage via `README.md:138-141`).

**Feasibility critic:** as-asked KILL — the assumed slice boundaries do not exist: `toggleClipboard` writes risk+form+ui+log (`2587-2601`), `resetDemo` writes ~27 setters (`2648-2686`), `finalizeTransfer` awaits HMAC then mutates ledger, receipt, verify, form and modal (`2834-2869`); Redux would need cross-slice thunks or a mega-slice, plus a Provider above `Page` and listener middleware reproducing the `isMounted`/`hydrated` gate (`2469-2471`). No tests, one week leaves no rehearsal. do-nothing KEEP. alt-1 RESHAPE (scam block only; extract modals/timers carefully). alt-2 KEEP with server-snapshot and hydration-gate constraints.

**Red-team critic:** as-asked KILL — a store that persists state by default widens the written fields from the current six (`2472-2479`, `802-809`) to `scamText`, `latestReceipt` and other PII, and quota failure is silently swallowed (`886-890`); listener ordering can overwrite the 1,450,000 ₸ seed on reload; a store round-trip around `modal` can zero the 10-second cooldown owned locally by `CooldownDialog` (`1612-1620`, mounted at `3305-3307`). do-nothing KEEP: existing guards are sound (`851-891`, `2447-2467`, `2648-2655`) and the scam route scrubs PII and falls back deterministically (`app/api/scam-analyze/route.ts:109-120`, `149-168`). alt-1 RESHAPE (move only pure helpers into `lib/`). alt-2 RESHAPE (subscriber persists, seed snapshot until hydrated, six fields only; smallest slice lang + four risk flags).

### Red-team privacy mini-probe

A separate single-critic probe tested `full-phone-number-analytics` (log every
phone number and message body to the console and a third-party analytics
endpoint). Result: KILL — privacy and consent exposure; no logger or analytics
dependency exists (`package.json:12-17`); the approved PII paths would be
widened (`app/api/scam-analyze/route.ts:109-114`, `app/page.tsx:324`,
`lib/scam-engine.ts:60-61`, `169-177`). ALTERNATIVE: `scrubPhones()` before any
sink, aggregate-only analytics, masked/truncated debug text behind a
default-off env flag. Probe passed; 1 child run.

## Missing voices

none — 4/4 critics returned complete verdict blocks. The proposer's first run and
the value/feasibility critics reached `steps: 8` and answered text-only:
`capped but complete`, not missing.

## Rebuttal

The proposer verified the cited lines and conceded every attack:

- **as-asked: WITHDRAWN.** "I am not defending it." The only slice that could prove it — one flag through a store while three tabs keep `useState` — proves plumbing, not value.
- **do-nothing: ACCEPT** as the week's plan; the 5,087-line debt is real but is not in any judged scenario.
- **alt-1: ACCEPT** scam block only (`4532-4863`), with `analyzePhishUrl` (`1049`) and `buildHighlightedSegments` (`5053`) moved to `lib/`; cost revised down to ~half a day, to run **after** build and rehearsal.
- **alt-2: REVISE** to pure file motion of `PersistedShieldState`, the three type guards, `loadPersistedState`, `savePersistedState` and `STORAGE_KEY` (`802-891`) into `lib/persisted-state.ts`; no hook, no Provider, no subscription, no risk-flag movement. It rejected the red-team's "lang + four risk flags" slice: the flags are not persisted (`802-809`) and moving them touches multi-setter handlers with zero verification payoff.

No second attack round: no verdict-changing disagreement remained.

## Verified citations

| claim | citation | result | note |
|---|---|---|---|
| Page() starts at 2339 and the screens share one closure | `app/page.tsx:2339` | supports | function body and the `useState` block follow |
| Persistence is gated on hydration | `app/page.tsx:2451-2467` | supports | `isMounted`/`hydrated` gate before reads and writes |
| Exactly six fields are persisted | `app/page.tsx:2472-2479` | supports | six-field object written to localStorage |
| Cooldown seconds are local to CooldownDialog | `app/page.tsx:1612-1619` | supports | `seconds` state inside the dialog component |
| The scam branch is self-contained at 4532 | `app/page.tsx:4532` | supports | `tab === "scam"` branch start |

The 186-setter count was not spot-checked and stays `UNVERIFIED`.

## Verdict

### should_do_at_all

**NO** — do not adopt Redux for this demo. Spend the week on build verification and rehearsal. If code time remains afterwards, the only accepted changes are the two small module moves below, each proven by `npm run typecheck`, `npm run build` and a manual replay of the relevant README scenarios.

Decided with 4 of 4 critics.

| id | verdict | why | accepted slice | cost |
|---|---|---|---|---|
| as-asked | KILL | No cross-screen problem exists; re-opens the deliberate hydration invariant; invisible to judges; ~186 setter sites across entangled handlers; PII/quota and demo-crash risk | none — withdrawn by the proposer, 4/4 critics KILL | L (a full week) |
| do-nothing | KEEP | The graded artifact is the 10-scenario judge script; rehearsal is the only lever that moves the score; zero regression surface | `npm run typecheck` + `npm run build`, then a full rehearsal of `README.md:116-141` on a production build, ~2 hours | S |
| alt-1 | RESHAPE | Pure JSX motion, visible to maintainers only; the scam branch is the self-contained one; other three tabs carry crypto/GuardPay/PII stories that must not be touched in demo week | Move `tab === "scam"` (`app/page.tsx:4532-4863`) to `app/screens/ScamScreen.tsx` with an explicit prop list; move `analyzePhishUrl` and `buildHighlightedSegments` to `lib/`; only after rehearsal | S-M (~half a day) |
| alt-2 | RESHAPE | The real persisted contract is exactly six fields; a named module prevents accidental widening; no subscription, no dual source of truth | Create `lib/persisted-state.ts` as pure motion of `802-891`; `Page()` keeps its state and both effects verbatim; no hook, no Provider, no risk flags | S (~2-3 hours) |

## Corrections

| claim (before) | corrected to | evidence |
|---|---|---|
| "all 31 state values live in one Page()" | 34 `useState` declarations in `Page()`; `seconds` is local to `CooldownDialog` | `(Get-Content app/page.tsx)[2339..2381]` → 34 `useState` hits; `app/page.tsx:1612-1620` |
| claimed the tree had a pending `app/page.tsx` change before the debate | no such change: it was committed as `ab03581` ("fix: align jury toggles and mobile amount layout"); tree clean afterwards | `git show --stat ab03581` |
| `## Cost` said 6 child runs | 7 child runs: 6 debate runs + 1 privacy mini-probe | child-run count |

## Accepted spec

1. Do not add Redux, `react-redux`, `@reduxjs/toolkit`, a store, a Provider, or a subscription layer.
2. Run `npm run typecheck` and `npm run build`; then rehearse all ten README jury scenarios on `npm start`.
3. If time remains after rehearsal, land `lib/persisted-state.ts` as pure module motion: same key, same six fields, same `try/catch`; behaviour byte-identical.
4. Then, if time still remains, extract the scam branch and its two pure helpers; grep the branch for `setTab`/`juryOpen` before the move and add anything found to the prop list.
5. Every landed change is gated on typecheck, build, and a manual replay of the scenario it touches (language reload for alt-2; PII preset for alt-1).

## Kill list

- Redux rewrite of cross-screen state.
- Five-slice store with listener middleware.
- `useSyncExternalStore` subscription over `Page()` state.
- Moving the four risk flags into any store during demo week.
- Full four-screen split before the demo.

## Dissent and unverified claims

- **Dissent (red-team):** move `lang` + the four risk flags first, as the smallest store slice. Rejected by the proposer because the flags are not persisted (`802-809`) and the handlers are multi-setter (`2587-2601`, `2632-2646`). The referee sides with the rejection; the dissent stays on record.
- **Dissent (value critic framing):** alt-2 is "verifiable on stage." Rejected by the proposer: language persistence already ships, so the module move is invisible. The referee agrees; alt-2 is accepted for testability, not demo payoff.
- **UNVERIFIED:** the "186 setter call sites" count. The proposer accepted the mechanism (multi-domain handlers exist) but did not verify the number. It is not decisive.
- **UNVERIFIED (plausible, not proven):** a store round-trip zeroing the cooldown. `seconds` is local to `CooldownDialog` (`1612-1620`) and remounting is required; treated as risk, not fact.
- **Partial tool budget:** the proposer's first run and the value/feasibility critics hit their 8-step cap and answered text-only; all required verdict blocks were delivered, and no voice is missing.

## Open questions

- Does the scam branch read any `Page()` value outside the named prop list (`setTab`, `juryOpen`)? Grep at move time.
- Is `npm run build` currently green? Not executed in this debate; do it first.
- The `app/page.tsx` modification seen before the debate was committed in `ab03581`; the tree was clean afterwards. No ownership question remains.

## Cost

7 child runs: 1 proposer pitch, 4 critics in parallel, 1 proposer rebuttal, 1 red-team privacy mini-probe. No second attack round. Each agent capped at 8 model steps.
