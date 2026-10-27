# Human playtest protocol

**Why this exists.** Every difficulty claim in this repo so far rests on bots that read `STATE.threats` directly — perfect information. They prove the engine's invariants; they say nothing about whether a person with the INTEL tab and five action points can win OPERATOR difficulty, or whether a loss *teaches*. Until a human playtest has been run, the README's difficulty tiers are design intent, not measured fact.

## Who and how many

- **Tier 1 (6–8 people):** security practitioners — SOC analysts, IR, detection engineers. They are the target audience and the only ones who can judge whether the attribution and containment lessons land.
- **Tier 2 (4–6 people):** technical non-security — developers, network/OT engineers, pilots with systems backgrounds. They test whether the onboarding and the demos carry someone without the vocabulary.
- **Minimum useful run:** 6 Tier-1 sessions on one mission at OPERATOR. Anything less is anecdote.

## Session shape (45–60 minutes)

1. **Cold open (5 min).** No briefing beyond "it's a turn-based defence game; the goal is on screen." Record whether they open the onboarding card and whether they watch a demo unprompted.
2. **Demo (10 min, optional for Tier 1, required for Tier 2).** Watch one instructor demo for the mission they will play.
3. **Live run (20–30 min).** One mission, OPERATOR difficulty, no hints from the facilitator. The facilitator records the round-by-round sheet below and says nothing unless the player is stuck on the UI (not on the decision).
4. **Export (2 min).** Player presses **EXPORT** (case-log JSON) and **TICKET** (Markdown) and **SHARE** (seeded URL). All three go in the session folder — the seed makes the run replayable.
5. **Debrief (10 min).** Questions below. Record verbatim where possible.

Second session, if time: the same player on **TWO-ADVERSARY MODE** (Settings ▸ ADVERSARIES ▸ TWO). The question there is narrow: did they notice the `[signature B]` tag, and did the ACH matrix change what they severed?

## Facilitator sheet — per round

| Round | AP spent | Actions queued (agent ▸ action ▸ target) | Threats revealed / active | Compromised | Player stated reason for this plan (verbatim, ≤ 1 line) | Facilitator note |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| … | | | | | | |

Plus, once per session:

| Field | Value |
|---|---|
| Player tier / role | |
| Mission / difficulty / actor (from debrief) | |
| Seed URL (from SHARE) | |
| Outcome / final round / nodes compromised | |
| Round of first SCAN · first TRACE · C2 reveal · SEVER | |
| Rubric scores (from case-log JSON `rubric`) | detection / attribution / efficiency / hardening / cascade / doctrine |
| Opened onboarding? Watched a demo? Opened CODEX? Opened INTEL tab before round 3? | y/n each |
| ACH gate: committed H1, backed out, or ignored? Time spent on it | |
| Combos triggered (from case log) | |

## Debrief questions

1. In one sentence: why did you win or lose? *(Compare against the case log. The gap between the player's story and the metrics is the finding.)*
2. What was the earliest round you could have known the thing that decided the run? What would you have needed to see?
3. Which single piece of on-screen information did you rely on most? Which did you never look at?
4. Did any action do something other than what you expected? Which?
5. *(Tier 1 only)* Does the attribution model — observed TTPs → archetype, ACH before SEVER — match how you reason in a real incident? Where does it diverge?
6. *(Two-adversary session only)* When did you realise there were two? What told you? Did the evidence matrix change your SEVER decision?
7. What would you change first?

## What to measure, and the thresholds that would change the design

| Metric | Source | Design intent | Change the design if… |
|---|---|---|---|
| Win rate, Tier 1, OPERATOR, first run | outcome | 40–60 % | < 25 % (tune `loseThreshold`/`spawnRateMod`) or > 80 % (OPERATOR is too soft) |
| Win rate, Tier 2, OPERATOR, after demo | outcome | 25–50 % | < 15 % — the demo is not transferring |
| Median round of first C2 reveal | case log | 3–4 | > 5 — TRACE odds or TRIANGULATE discoverability |
| Players who open INTEL before round 3 | sheet | > 70 % | lower — the tab needs a nudge, not a tutorial |
| Players who can state the losing cause correctly (Q1 vs. metrics) | debrief | > 60 % | lower — the debrief RUBRIC/TIMELINE is not explaining losses |
| Two-adversary: noticed `[signature B]` unprompted | sheet | > 50 % of Tier 1 | lower — the tag needs more weight in the log |
| Two-adversary: ACH matrix changed a SEVER decision at least once | sheet | > 30 % | lower — the matrix is decoration |

## Reporting

One folder per session: `case-log.json`, `ticket.md`, the seed URL, the facilitator sheet, and the debrief notes. Aggregate in a single table with one row per session. Do not average rubric scores across tiers.

When a session finds a bug, reproduce it headlessly with the seed before filing: `JOSHUA_SEED=<seed> node playtest/one-run.js` (add `ADV=2` for a two-adversary run), or add a case to `v010-two-adversary-test.js`. A bug that cannot be reproduced from the seed is a UI bug, and belongs in a screenshot.

## What this protocol cannot tell you

Whether the lessons transfer to a real incident. That needs a before/after on a tabletop exercise with the same people, and a control group. This protocol measures whether the game is winnable, legible and honest about why you lost — nothing more.
