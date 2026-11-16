# Design: Universal Debate Crew (proposer vs. critics, referee verdict)

Date: 2026-11-16
Status: Draft — awaiting human approval
First subject: this repository (BCC Shield 360), later any OpenCode project

## Intent

Give the human partner a reusable crew of subagents that **argue about new
features and the method to realize them**, wherever they are working, invoked on
demand. An orchestrator pitches; critics attack necessity, cost, and value; the
referee grounds the argument in evidence, breaks ties, and rewrites the
surviving pitch into a corrected specification. Nothing is built until the
human approves the verdict.

Why: the human wants proposals to be challenged before they cost anything —
"it's not needable", "this adds pressure", "there is a better way" are
first-class outcomes, not objections to smooth over. The argument itself should
produce a better decision and a written record, not a transcript of agreement.

## Goals

- Install once, globally, for every OpenCode project on this machine.
- Invoke any time with a single command; no per-project setup required.
- Force proposals and critiques to be grounded (file/line, command output, URL)
  or explicitly labelled as opinion.
- Always put the human's ask *as stated* and a do-nothing/defer option on the
  ballot, so "should we do this at all?" is answerable.
- Produce one decision artifact per debate: verdict + corrected spec + kill list.
- Keep the referee (main session) in control of rounds, budget, and the gate.

## Non-goals

- Not an in-app product feature for BCC Shield 360. The demo UI is untouched.
- Debaters do not write code, configs, or tests.
- No autonomous background debating, scheduling, or CI integration in v1.
- No multi-repository orchestration in v1.
- No scripted harness (LLM API driver) in v1; revisit only if the crew proves
  useful across several real debates.

## Anti-goals

- Debate theater: long transcripts with no decision.
- Polite convergence where critics approve everything.
- Unbounded rounds or unbounded roster growth.
- A critic "no" without a cheaper or smaller alternative.

## Approaches considered

1. **A. Native agent crew + `/debate` command, installed globally.** Markdown
   agents under `~/.config/opencode/agents/`, a command under
   `~/.config/opencode/commands/`, protocol in a global skill. Recommended.
2. **B. Scripted debate harness.** A Node script driving an LLM API or
   `opencode run` for N rounds, writing transcripts and verdicts to disk.
   Deterministic and CI-friendly, but adds plumbing, keys, and version
   fragility; duplicates what the command already does.
3. **C. A now, B later.** Ship the crew, run real debates, add automation only
   if transcripts-as-data becomes a need.

**Picked: A.** The part that needs iteration is the argument protocol, not the
plumbing. B is deferred until evidence justifies it.

## Anthropic patterns this follows

From *Building effective agents* (Anthropic, Dec 2024):

- **Orchestrator-workers** — the proposer decomposes an idea into candidate
  moves with realization paths; the referee decides what to delegate.
- **Evaluator-optimizer** — critics evaluate, the proposer revises in a loop,
  referee stops it.
- **Parallelization (sectioning)** — the four critics attack different aspects
  simultaneously rather than one generalist critic.
- Stated principles followed here: simplicity, transparency of steps, and adding
  complexity only when it demonstrably improves outcomes. The post's warning
  that agentic systems trade latency and cost for quality is why the roster and
  rounds are capped.

## Roster (v1: five voices + referee)

`debate-proposer` (subagent)
- Produces 2–3 candidate features. Per candidate: user-visible outcome,
  realization method (concrete steps, files or modules touched), smallest
  shippable slice, cost tier (S/M/L), confidence, and what it *displaces*
  (time, attention, complexity budget).
- Must state its assumptions explicitly.
- Always includes two mandatory candidates: `as-asked` (the human's request
  unchanged) and `do-nothing` (defer or reject, stating the cost avoided).
  Invented alternatives sit beside them, never replace them.

`debate-scope-critic` (subagent)
- Attacks necessity and overhead: does this add pressure, maintenance, or
  coordination cost disproportionate to value?
- Must give a verdict per candidate (KEEP / RESHAPE / KILL) and either the
  cheaper alternative that reaches most of the value, or a smaller slice.

`debate-value-critic` (subagent)
- Judges whether the change matters to the *declared* audience and is
  visible/distinct on the project's own surface: for a demo, does a judge see
  it in 90 seconds; for a library or CLI, does an adopter notice it in the docs
  or first run; for an internal tool, does an operator's daily work change.
- Flags duplication of existing capability.

`debate-feasibility-critic` (subagent)
- Attacks the *realization method*: can it be built as described with what the
  project actually has? Missing dependencies, integration points, migration
  cost, absent tests, hidden coupling, failure modes.
- Must give a verdict per candidate and either the cheapest workable path or a
  smaller technical slice that can be proven first.

`debate-red-team-critic` (subagent)
- Attacks what breaks or gets abused: failure scenarios, abuse paths, privacy
  and compliance exposure, demo-crash risk, operational surprises.
- Must name the cheapest mitigation per live candidate, or state plainly that
  the risk is accepted and by whom.

`referee` = the main session running `/debate`
- Reads project context before round 1 (README, AGENTS.md, package manifest,
  entry points, relevant modules).
- Launches debaters as subagents; keeps each thread alive via session id across
  rounds so the argument has memory.
- Enforces the evidence rule, the round cap, and the verdict schema.
- Writes the decision file. Implements nothing.

Optional specialists (documented as slots, not installed in v1): security audit,
accessibility, performance, cost/ops. Adding one later must not change the
protocol.

## Debate protocol

1. **Ground** (referee): one paragraph restating the idea in the human's terms;
   read the project; note constraints found (stack, size, tests present or
   absent, deploy target). It also declares the project type (demo/UI, library,
   CLI, service, internal tool, config-only) and audience (judges, end users,
   downstream developers, maintainers, the human alone), plus a budget
   assumption (deadline and capacity inferred from the arguments and repo
   evidence). Declarations are labelled `ASSUMPTION` and printed in the
   decision file. No mandatory follow-up questions; `/debate` accepts optional
   budget hints inside the arguments (`time=...`, `capacity=...`).
2. **Pitch** (proposer): 2–3 candidates, schema above.
3. **Attack** (all four critics, launched in parallel): per-candidate verdict
   and reasoning, each claim cited or labelled opinion.
4. **Rebuttal** (proposer, same session): respond point by point, revise or
   withdraw candidates, state the new smallest slice.
5. **Optional second attack** only if a critic still disputes a live candidate.
   Hard cap: two attack rounds, then the referee decides.
6. **Verdict** (referee): KEEP / RESHAPE / KILL per candidate, with the reason,
   the accepted slice, and the corrected spec. Claims proven false in the
   debate are corrected in place, with before/after — never silently dropped.
7. **Gate**: present the decision file to the human. Implementation begins only
   on approval, through the normal workflow.

### Evidence rule

Every factual claim carries one of: `path:line`, quoted command output, or a
URL. Anything else must be prefixed "OPINION". A critic that cannot ground a
claim may still argue, but the referee must mark it as untested and must not
let it decide the verdict alone.

The referee **spot-checks the citations that decide a verdict** (up to five
reads per debate). A claim whose citation fails verification is marked
`UNVERIFIED`, cannot by itself justify a KILL, and stays in the dissent record.
Checking format alone would make the evidence rule theater, which is an
anti-goal.

### Verdict schema

Idea level: `should_do_at_all` (YES|NO|DEFER), derived from the mandatory
`as-asked` and `do-nothing` candidates.

Per candidate: `id`, `name`, `verdict` (KEEP|RESHAPE|KILL), `why`, `accepted_slice`,
`cost`, `evidence[]`, `verified[]` (spot-check result per decisive citation),
`dissent[]` (unresolved minority view, kept on record).

## Files to create (global install)

```
~/.config/opencode/
  agents/debate-proposer.md          # mode: subagent, read-only
  agents/debate-scope-critic.md      # mode: subagent, read-only
  agents/debate-value-critic.md      # mode: subagent, read-only
  agents/debate-feasibility-critic.md # mode: subagent, read-only
  agents/debate-red-team-critic.md   # mode: subagent, read-only
  commands/debate.md                 # /debate $ARGUMENTS, runs in current session
  skills/design-debate/SKILL.md      # protocol, evidence rule, verdict schema, log format
```

Agent frontmatter: `description`, `mode: subagent`, `steps: 8` (each run gets
a hard cap of model steps), `permissions` denying `edit`, `shell`, and
`subagent`, allowing `read`/`glob`/`grep`/`webfetch`.
Models inherit the session model in v1; per-role models are a later option.

Budget: the cap is roster (five voices), rounds (two attacks) and `steps: 8`
per agent. The referee announces the expected child-run count before round 1
and records actual runs in the decision file. There is no wall-clock guarantee;
`steps` is what bounds a talkative child.

### Decision log location

- If the working directory is inside a git repository: create
  `docs/decisions/YYYY-MM-DD-<slug>.md` in that repository.
- Otherwise: `~/.config/opencode/decisions/YYYY-MM-DD-<slug>.md`.

Frontmatter: `topic`, `date`, `verdict_summary`, `rounds`, `participants`,
`status`; body: intent, candidates, attacks, rebuttals, verdict, accepted spec,
kill list, open questions.

## Portability

- Global install means every OpenCode project on this machine gets `/debate`
   with no setup.
- A project may override any voice by adding `.opencode/agents/<same-id>.md`.
- The protocol body is harness-neutral; the agent-file format is
  OpenCode-specific. Porting to Claude Code requires copying the same prompts
  into its own agent format — documented, not automated, in v1.

## Risks and mitigations

- **Debaters cannot launch each other's rounds** (subagents cannot spawn
  children): the referee orchestrates everything; this is by design.
- **Primary agent denies `subagent` or `edit`**: `/debate` cannot run or cannot
  log. Verification step checks this; command documents the requirement.
- **Cost**: ~10 child runs per debate, each capped at 8 steps. Round and roster
  caps in the protocol; run count recorded per debate.
- **Weak models agree too easily**: evidence rule and mandatory alternative
  turn critique into claims that can be checked; per-role models are the
  upgrade path.
- **Referee verification adds reads**: spot-checks are capped at five, chosen
  only among citations that decide a verdict.
- **Noise from five voices**: critics must produce candidate-level verdicts and
  an alternative, not essays. The second attack round is optional, so
  overlapping criticisms can be merged instead of re-run.
- **Deadlock**: referee decides after round two; dissent is recorded, not
  deleted.

## Verification (before calling it done)

1. `opencode` lists `debate-proposer`, `debate-scope-critic`,
   `debate-value-critic`, `debate-feasibility-critic`,
   `debate-red-team-critic` as subagents.
2. `/debate` on a throwaway idea produces a decision file in the expected
   location, with verdicts and at least one cited evidence item per critic.
3. A deliberately absurd pitch (e.g. "rewrite the cross-screen state into
   Redux") gets KILL with cited reasons, not polite approval; the ballot shows
   `as-asked` and `do-nothing`, and the citations supporting the KILL are true
   when the referee checks them.
4. Debaters make no file edits (permissions enforced).
5. A pitch whose failure mode is obvious (e.g. "log full phone numbers for
   analytics") draws a red-team objection with a mitigation, not silence.

Rollback: delete the seven files; no project state was modified.

## Left to the builder

- Exact prompt text for each voice (must encode schema and evidence rule).
- Command template wording and the referee step list.
- Decision-file template and slug rules.
- Whether value-critic and red-team-critic earn their cost after the first
  three debates.
