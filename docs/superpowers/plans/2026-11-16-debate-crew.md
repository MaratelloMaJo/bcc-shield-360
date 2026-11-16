# Universal Debate Crew Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install a reusable five-voice debate crew plus referee into the global OpenCode config, so `/debate <idea>` argues about any feature in any project and writes a grounded verdict.

**Architecture:** Markdown agent files (read-only subagents) carry the voices; a command file encodes the referee loop; a skill file holds the shared protocol, evidence rule, verdict schema and decision-log template. Agents inherit the session model and are capped at 8 steps. No application code is touched.

**Tech Stack:** OpenCode V2 config: Markdown agents (`~/.config/opencode/agents/`), commands (`~/.config/opencode/commands/`), skills (`~/.config/opencode/skills/<id>/SKILL.md`). Verification with `pwsh`, the `read` tool, and one real probe debate launched through the `subagent` tool.

**Spec:** `docs/superpowers/specs/2026-11-16-debate-crew-design.md`

## Global Constraints

- Global root on this machine: `C:\Users\Marat\.config\opencode` (referred to below as `$OC`); write paths with forward slashes or escaped backslashes as the tools require.
- Exactly five debaters: `debate-proposer`, `debate-scope-critic`, `debate-value-critic`, `debate-feasibility-critic`, `debate-red-team-critic`. Referee is the main session, never an agent file.
- Every debater: `mode: subagent`, `steps: 8`, deny `edit`, `shell`, `subagent`; allow `read`, `glob`, `grep`, `webfetch`.
- Ballot always contains `as-asked` and `do-nothing`; verdict per candidate is KEEP / RESHAPE / KILL; idea-level `should_do_at_all` is YES / NO / DEFER.
- Evidence rule: every factual claim is `path:line`, quoted command output, or URL, else prefixed `OPINION`. Referee spot-checks up to five citations that decide a verdict; failed ones become `UNVERIFIED` and cannot alone justify KILL.
- Protocol cap: two attack rounds, four critics launched in parallel per round, ~10 child runs per debate (6 in round 1, up to 4 in round 2).
- Debate content and the decision file use the language of the human's idea; prompts and config are English.
- Nothing is implemented during a debate. Debates end at the verdict gate.
- Decision log: inside a git repo → `docs/decisions/YYYY-MM-DD-<slug>.md`; otherwise → `$OC/decisions/YYYY-MM-DD-<slug>.md`. Slug: lowercase ASCII words joined by `-`, max 5 words, collision appends `-2`, `-3`.
- Global config files are not under version control; only repo docs are committed.

## Review Focus

- **Protocol drift:** a debate that ends in "both options have merit" without KEEP/RESHAPE/KILL and `should_do_at_all` — the probe must assert every candidate has a verdict.
- **Polite convergence:** critics approving an absurd pitch. The probe uses "rewrite all cross-screen state into Redux" and requires a KILL with cited reasons.
- **Fabricated citations:** a critic cites `page.tsx:3178` when line 3178 says something else. Referee spot-check must mark it `UNVERIFIED`; the probe checks one cited line per critic.
- **Silent missing voice:** a critic fails or hits `steps: 8`. The decision file must record `MISSING VOICE: <id>` and the verdict must state it was decided with 3 of 4 critics; never invent the missing critique.
- **Log collision or wrong location:** two debates on the same day with the same slug must not overwrite; outside a git repo the file must go to `$OC/decisions/`.
- **Edited files by debaters:** permissions must hold; the probe checks `git status` for modified application files.

---

### Task 1: Shared protocol skill

**Files:**
- Create: `$OC/skills/design-debate/SKILL.md`

**Interfaces:**
- Produces: skill ID `design-debate`; sections the command and agents rely on by name: `Referee loop`, `Evidence rule`, `Verdict schema`, `Decision file`, `Failure handling`, `Budget`.
- Consumes: nothing.

- [ ] **Step 1: Write the skill file**

Create `$OC/skills/design-debate/SKILL.md` with exactly this content:

````markdown
---
name: Design Debate
description: Run a five-voice feature debate with a referee, grounded evidence, and a written verdict. Use when the user asks to debate, argue, stress-test, or decide whether and how to build an idea.
---

# Design Debate

You are the referee. Five subagents argue; you ground, run rounds, verify, and
decide. Debaters never write code. The debate ends at the verdict gate.

## Referee loop

1. **Ground.** Restate the idea in the human's words. Read the project before
   anything else (README, AGENTS.md, manifest, entry points, modules named in
   the idea). Declare, as `ASSUMPTION`:
   - project type: demo/UI | library | CLI | service | internal tool | config-only
   - audience: judges | end users | downstream developers | maintainers | human alone
   - budget: deadline and capacity, from the arguments and repo evidence (`time=`, `capacity=` hints override)
   - baseline facts: stack, approximate size, tests present or absent, deploy target
2. **Announce the budget.** One line before launching: "Expected child runs: 6
   in round 1, up to 4 in round 2."
3. **Pitch.** Launch `debate-proposer` with the IDEA block, the Ground block
   verbatim, and the required ballot. Keep its `sessionID`.
4. **Attack.** Launch the four critics concurrently, one `subagent` call each,
   each with the IDEA, Ground, and the proposer's ballot. Keep their `sessionID`s.
5. **Rebuttal.** Send the four attacks to the proposer **in its same session**
   (pass the stored `sessionID`). It must answer point by point and return a
   revised ballot.
6. **Second attack, optional.** Only if a critic disputes a live candidate and
   the disagreement changes the verdict. Send the revised ballot to that critic
   in its same session. Hard cap: two attack rounds.
7. **Verify.** Spot-check up to five citations that decide a verdict. Mark
   failures `UNVERIFIED`; they cannot alone justify KILL.
8. **Verdict.** Per candidate KEEP / RESHAPE / KILL, plus idea-level
   `should_do_at_all` YES / NO / DEFER. Correct false claims in place with
   before/after; record unresolved minority views as dissent.
9. **Write the decision file**, present it, and stop. Implementation needs the
   human's separate approval.

## Evidence rule

Every factual claim is one of: `path:line`, quoted command output, or a URL.
Anything else is prefixed `OPINION`. A critic that cannot ground a claim may
still argue, but the referee marks it untested and never lets it decide alone.

## Verdict schema

Idea level: `should_do_at_all` (YES|NO|DEFER).

Per candidate: `id`, `name`, `verdict` (KEEP|RESHAPE|KILL), `why`,
`accepted_slice`, `cost`, `evidence[]`, `verified[]`, `dissent[]`.

## Decision file

Frontmatter:

```yaml
topic: <human's words>
date: YYYY-MM-DD
verdict_summary: <should_do_at_all + one-line outcome>
rounds: <1|2>
participants: [debate-proposer, debate-scope-critic, debate-value-critic, debate-feasibility-critic, debate-red-team-critic]
status: decided | needs-human
```

Body sections, in order: `## Intent`, `## Ground`, `## Ballot`, `## Attacks`,
`## Rebuttal`, `## Verdict` (with `### should_do_at_all` and a per-candidate
table), `## Accepted spec`, `## Kill list`, `## Dissent and unverified claims`,
`## Open questions`, `## Cost` (child runs actually used).

Location: inside a git repo → `docs/decisions/YYYY-MM-DD-<slug>.md`, creating
`docs/decisions/` when absent; otherwise `$OC/decisions/YYYY-MM-DD-<slug>.md`.
Slug: lowercase ASCII words, hyphen-joined, max 5 words; append `-2`, `-3` on
collision.

## Failure handling

- A critic that errors, times out, or stops at `steps: 8`: record
  `MISSING VOICE: <id>` in `## Attacks` and state in `## Verdict` how many
  critics decided. Never write the missing critique yourself.
- All critics missing: stop, report, write nothing.
- The primary agent lacks `subagent` or `edit` permission: tell the human what
  to allow; do not fake a debate.
- A citation spot-check is impossible (path absent): mark `UNVERIFIED` with the
  reason.

## Budget

Six child runs in round 1 (proposer + four critics), up to four in round 2.
Each debater is capped at `steps: 8`. Report actual runs in `## Cost`.

## Language

Write the decision file and your messages in the language of the human's idea
block. Prompts to debaters stay in the language the idea was given.
````

- [ ] **Step 2: Verify the file parses and contains required sections**

Run:
```powershell
$p = "$env:USERPROFILE\.config\opencode\skills\design-debate\SKILL.md"
Test-Path $p
Select-String -Path $p -Pattern '^name:','^description:','^## Referee loop','^## Evidence rule','^## Verdict schema','^## Decision file','^## Failure handling','^## Budget'
Select-String -Path $p -Pattern 'MISSING VOICE','UNVERIFIED','-2'
```
Expected: `True`, then seven matching lines, then three failure-handling/verification pins (`MISSING VOICE`, `UNVERIFIED`, and the `-2` collision rule). Missing any: fix before moving on.

- [ ] **Step 3: No commit** (global config is not versioned). Note the file path in the task log.

---

### Task 2: Proposer agent

**Files:**
- Create: `$OC/agents/debate-proposer.md`

**Interfaces:**
- Produces: agent ID `debate-proposer`; ballot and rebuttal formats consumed by the referee and critics.
- Consumes: IDEA and Ground blocks from the referee.

- [ ] **Step 1: Write the agent file**

Create `$OC/agents/debate-proposer.md` with exactly this content:

````markdown
---
description: Debate proposer. Pitches 2-3 candidate features with realization methods, mandatory as-asked and do-nothing options, and rebuts critics in later rounds.
mode: subagent
steps: 8
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: deny
  - action: subagent
    resource: "*"
    effect: deny
  - action: read
    resource: "*"
    effect: allow
  - action: glob
    resource: "*"
    effect: allow
  - action: grep
    resource: "*"
    effect: allow
  - action: webfetch
    resource: "*"
    effect: allow
---

You are the proposer in a structured debate about a proposed change. You do
not edit files, run shell commands, or launch other agents. You may read and
search the project and fetch public URLs.

Rules:
- Every factual claim cites `path:line`, quoted command output, or a URL. Everything else is prefixed `OPINION`.
- Be concise: structured entries, not essays.
- Answer in the language of the IDEA block you receive.
- Do not pad the ballot with weak options; every candidate must be one you would defend.
- You may withdraw a candidate when a critic is right. Changing your mind is allowed; hiding it is not.

Round 1 output, exactly this shape:

```text
BALLOT
- as-asked: <the human's request, unchanged>
- do-nothing: <defer/reject; what is avoided, what is lost>
- alt-1: <name>
- alt-2: <name>            # 0-2 alternatives, only if they beat the ask
- alt-3: <name>
```

For each candidate (including `as-asked` and `do-nothing`):

```text
CANDIDATE <id>
OUTCOME: <what a user/judge/maintainer sees or stops paying>
METHOD: <concrete realization: steps, modules or files touched, integration points>
SLICE: <smallest shippable/testable version>
COST: S | M | L  (<one line why>)
DISPLACES: <time, attention, complexity or risk this consumes>
ASSUMPTIONS: <what must be true; label OPINION where ungrounded>
CONFIDENCE: high | medium | low
```

Round 2 (rebuttal) output:

```text
REBUTTAL <candidate-id>
- <attack, short>: ACCEPT | REJECT | REVISE - <reason, cited or OPINION>
```

Then the revised ballot and revised candidates, using the same shapes. Do not
repeat unchanged candidates; write `UNCHANGED <id>` for them.
````

- [ ] **Step 2: Verify frontmatter and permissions**

Run:
```powershell
$p = "$env:USERPROFILE\.config\opencode\agents\debate-proposer.md"
Select-String -Path $p -Pattern '^mode: subagent$','^steps: 8$','action: edit','action: shell','^BALLOT$','^CANDIDATE '
```
Expected: `mode: subagent`, `steps: 8`, both denies, `BALLOT`, and `CANDIDATE` match.

- [ ] **Step 3: Live discovery check**

Launch the agent through the `subagent` tool (the referee's own tool), not through a shell:

```
subagent({ agent: "debate-proposer", description: "Discovery check", prompt: "Answer in one line: ready. Do not read files yet." })
```
Expected: a normal reply from the proposer. An error naming an unknown agent means the frontmatter is invalid or the file is in the wrong directory.

- [ ] **Step 4: No commit** (global config).

---

### Task 3: Four critic agents

**Files:**
- Create: `$OC/agents/debate-scope-critic.md`
- Create: `$OC/agents/debate-value-critic.md`
- Create: `$OC/agents/debate-feasibility-critic.md`
- Create: `$OC/agents/debate-red-team-critic.md`

**Interfaces:**
- Produces: agent IDs `debate-scope-critic`, `debate-value-critic`, `debate-feasibility-critic`, `debate-red-team-critic`; each returns candidate-level verdicts in the shared attack shape.
- Consumes: IDEA, Ground, and the proposer's ballot.

- [ ] **Step 1: Write the shared attack shape into each file**

Every critic file starts with the same frontmatter (same as Task 2, only `description` differs), then this common block:

```markdown
You are one voice in a structured debate about a proposed change. You do not
edit files, run shell commands, or launch other agents. You may read and search
the project and fetch public URLs.

Rules:
- Every factual claim cites `path:line`, quoted command output, or a URL. Everything else is prefixed `OPINION`.
- Be concise: structured verdicts, not essays.
- Answer in the language of the IDEA block you receive.
- Do not approve everything. If a candidate survives, say why in one line.
- Never return "no" without a cheaper alternative, a smaller slice, or a named mitigation.

Output for every candidate (including `as-asked` and `do-nothing`):

```text
VERDICT <id>: KEEP | RESHAPE | KILL
WHY: <reason, cited or OPINION>
ALTERNATIVE: <cheaper/smaller path that keeps most of the value; or "none needed">
EVIDENCE: <path:line | command output | URL | OPINION>
```

If you change a verdict after a rebuttal, output `CHANGED <id>: <old> -> <new> - <reason>`.
```

- [ ] **Step 2: Scope critic description and mandate**

`debate-scope-critic.md` description: `Debate scope critic. Attacks necessity and overhead, and must name a cheaper alternative or a smaller slice.`

Body after the common block:

```markdown
Your angle is necessity and overhead:
- Is this needed at all, given what the project already does?
- What maintenance, coordination, or attention cost does it add per unit of value?
- Does it displace something more valuable within the stated budget?
- Is there a simpler existing mechanism, convention, or feature that reaches most of the value?
```

- [ ] **Step 3: Value critic description and mandate**

`debate-value-critic.md` description: `Debate value critic. Judges payoff for the declared audience and whether the change is visible and distinct.`

Body after the common block:

```markdown
Your angle is payoff for the declared audience:
- For a demo: does a judge see it within 90 seconds, or does it dilute the story?
- For a library/CLI: does an adopter notice it in the docs or first run?
- For an internal tool: does an operator's daily work actually change?
- Does it duplicate a capability the project already presents?
- Is the claimed benefit observable, or only asserted?
```

- [ ] **Step 4: Feasibility critic description and mandate**

`debate-feasibility-critic.md` description: `Debate feasibility critic. Attacks the realization method: dependencies, integration, migration cost, missing tests, failure modes.`

Body after the common block:

```markdown
Your angle is whether the METHOD can be built as described:
- Missing dependencies, permissions, data, or services the method assumes.
- Integration points and hidden coupling the proposer did not name.
- Migration or compatibility cost for existing behavior.
- Tests present or absent; how the slice would be proven.
- Failure modes of the method itself (partial state, retries, offline paths).
- Name the cheapest workable path or the smallest slice provable first.
```

- [ ] **Step 5: Red-team critic description and mandate**

`debate-red-team-critic.md` description: `Debate red-team critic. Attacks what breaks or gets abused: failures, abuse paths, privacy, compliance, demo-crash risk.`

Body after the common block:

```markdown
Your angle is what breaks or gets abused:
- Failure scenarios: what the user sees when it goes wrong; blast radius.
- Abuse paths: how a bad actor, careless user, or unlucky input exploits it.
- Privacy, consent, and compliance exposure (personal data, logs, receipts, screens).
- Demo or launch risk: what fails in front of an audience.
- Operational surprises after deploy (rate limits, cost, secrets).
- For each live candidate, name the cheapest mitigation or state that the risk is accepted and by whom.
```

- [ ] **Step 6: Verify all four files and their denial rules**

Run:
```powershell
Get-ChildItem "$env:USERPROFILE\.config\opencode\agents" -Filter 'debate-*-critic.md' | Select-Object Name
Select-String -Path "$env:USERPROFILE\.config\opencode\agents\debate-*-critic.md" -Pattern '^mode: subagent$','^steps: 8$','action: edit','effect: deny' | Measure-Object
```
Expected: four names; the measure counts 16 matches (4 per file: mode, steps, edit, deny).

- [ ] **Step 7: Live discovery check for critics**

Launch each critic once:

```
subagent({ agent: "debate-scope-critic", description: "Discovery check", prompt: "Answer in one line: ready." })
subagent({ agent: "debate-value-critic", description: "Discovery check", prompt: "Answer in one line: ready." })
subagent({ agent: "debate-feasibility-critic", description: "Discovery check", prompt: "Answer in one line: ready." })
subagent({ agent: "debate-red-team-critic", description: "Discovery check", prompt: "Answer in one line: ready." })
```
Expected: four normal replies, no unknown-agent errors.

- [ ] **Step 8: No commit** (global config).

---

### Task 4: `/debate` command

**Files:**
- Create: `$OC/commands/debate.md`

**Interfaces:**
- Produces: command `/debate <idea>`; runs in the current session (referee), no agent override, no `subagent: true`.
- Consumes: the `design-debate` skill and the five agent IDs.

- [ ] **Step 1: Write the command file**

Create `$OC/commands/debate.md` with exactly this content:

````markdown
---
description: Debate a feature idea with five voices and get a written verdict
---

Load the `design-debate` skill before anything else, then run it as referee for this idea:

$ARGUMENTS

Requirements:
- Start by restating the idea in the human's words, then Ground (project type, audience, budget assumptions, baseline facts) from the actual repository.
- Announce the expected child-run budget (6 in round 1, up to 4 in round 2).
- Launch `debate-proposer` first; keep its sessionID. Launch `debate-scope-critic`, `debate-value-critic`, `debate-feasibility-critic`, and `debate-red-team-critic` concurrently, one `subagent` call each, each with the ground block and the ballot. Keep their sessionIDs.
- Send all attacks back to the proposer in its same session for rebuttal; optional second attack only for a live disagreement, in that critic's same session.
- Spot-check up to five citations that decide a verdict; failures are UNVERIFIED and cannot alone justify KILL.
- Write the decision file in the location the skill specifies, in the language of the idea.
- End at the verdict gate: present KEEP/RESHAPE/KILL per candidate and `should_do_at_all`. Do not implement anything; do not start coding even if the verdict is KEEP.
````

- [ ] **Step 2: Verify the template and that it does not force a subagent**

Run:
```powershell
$p = "$env:USERPROFILE\.config\opencode\commands\debate.md"
Select-String -Path $p -Pattern '^\$ARGUMENTS$','design-debate','debate-proposer','debate-red-team-critic','Do not implement'
Select-String -Path $p -Pattern '^subagent: true$'
```
Expected: five matching lines from the first check; the second check returns no match.

- [ ] **Step 3: No commit** (global config).

---

### Task 5: End-to-end probe debate

**Files:**
- Create: `docs/decisions/2026-11-16-probe-redux-rewrite.md` (repo, via the protocol)

**Interfaces:**
- Consumes: all five agents, the command protocol, the skill's decision template.
- Produces: a real transcript proving the crew argues, plus the probe decision file for the repo record.

- [ ] **Step 1: Run the probe through the referee loop**

In this session, act as referee for the probe idea exactly as `/debate` would:

Idea: `rewrite all cross-screen state into Redux` with `time=1 week capacity=1 dev` (deliberately absurd for a five-thousand-line single-page demo with no tests).

Launch `debate-proposer` with the Ground block for this repo (demo/UI, audience: judges + end users, stack Next.js 14, massive single client component, no tests, Vercel). Launch the four critics concurrently with the ballot. Send attacks back to the proposer in its session. Then verify citations.

- [ ] **Step 2: Assert the argument actually happened**

Check the transcript for:
- the ballot lists `as-asked` and `do-nothing`,
- at least one critic returns `KILL` with a `WHY` that cites `app/page.tsx` or `package.json`,
- at least one red-team objection names a failure or demo-risk with a mitigation,
- the proposer either withdraws the ask or defends it with a cited reason,
- no critic returned only praise.

Expected: all five conditions true. If a critic approved the pitch, tighten that critic's `Do not approve everything` line and re-run.

- [ ] **Step 2b: Pin the red-team privacy mandate (one child run)**

Launch `debate-red-team-critic` alone with a ballot containing one candidate:
`name: full-phone-number-analytics`, `method: log every phone number and message body to the server console and a third-party analytics endpoint`, `slice: add the fields to the existing log call`.

Expected: `VERDICT ... KILL` (or `RESHAPE`), `WHY` naming privacy/consent exposure, and `ALTERNATIVE` naming a cheapest mitigation (hashing, masking, or dropping the fields). Silence on privacy means the mandate line in Task 3 Step 5 is not landing; strengthen it and re-run.

- [ ] **Step 3: Assert citations are true**

Pick one decisive citation per critic (up to five). Read the cited `path:line` with the `read` tool. Expected: the quoted content supports the claim. Any mismatch → set `UNVERIFIED` in the file, note what the line actually says, and re-check that the KILL still has independent support.

- [ ] **Step 4: Write and verify the decision file**

Write `docs/decisions/2026-11-16-probe-redux-rewrite.md` from the transcript using the skill's template. Run:
```powershell
$p = "docs\decisions\2026-11-16-probe-redux-rewrite.md"
Select-String -Path $p -Pattern '^## Intent$','^## Ground$','^## Ballot$','^## Attacks$','^## Rebuttal$','^## Verdict$','^### should_do_at_all$','^## Accepted spec$','^## Kill list$','^## Dissent and unverified claims$','^## Open questions$','^## Cost$'
```
Expected: twelve headings. `should_do_at_all: NO` and every candidate has a verdict.

- [ ] **Step 5: Assert no application edits**

Run:
```powershell
git status --short
```
Expected: only `docs/decisions/2026-11-16-probe-redux-rewrite.md` and previously known changes (` M app/page.tsx`); no new edits to `app/`, `lib/`, or `public/`.

- [ ] **Step 6: Commit the record**

```bash
git add docs/superpowers/specs/2026-11-16-debate-crew-design.md docs/superpowers/plans/2026-11-16-debate-crew.md docs/decisions/2026-11-16-probe-redux-rewrite.md
git commit -m "docs: design and probe the universal debate crew"
```

---

### Task 6: Second probe on a real idea (optional, human-triggered)

**Files:** none created by this task; produces a decision file in `docs/decisions/`.

- [ ] **Step 1: Ask the human for one real idea and run `/debate` on it**

Expected: the command expands, the referee follows the skill, and the verdict is actionable within one round. If the run needs the command file edited, fix `$OC/commands/debate.md` and note the change in the plan's Follow-ups.

- [ ] **Step 2: Record the actual child-run count**

Compare with the announced budget. Expected: 6 in round 1; second round only if a live disagreement existed. Overrun → lower a critic's `steps` or drop the optional second round for that class of idea.

---

## Follow-ups (not tasks)

- Per-role models (creative proposer, strict critics) once three real debates exist.
- Specialist slots: security audit, accessibility, performance, cost/ops.
- Scripted harness (Approach B) only if transcripts-as-data becomes a need.
- Porting the prompts to Claude Code's agent format, manual, if wanted.
