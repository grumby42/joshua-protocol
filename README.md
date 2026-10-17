# Joshua Protocol

A single-file HTML5 tactical cybersecurity strategy game. Mobile-playable. No install, no backend, no account.

**Play:** open `index.html` in any modern browser.

> *"A strange game. The only winning move is not to play."*

Joshua Protocol is a thinking game in the XCOM / Pandemic tradition, applied to the cyber-physical seam. You defend industrial infrastructure — energy grids, satellite constellations, container ports — against adversaries whose tradecraft is modeled on documented real-world patterns. It is explicitly **not** a lab, a tabletop exercise, or a training simulator. It is a strategy game that asks the question real IR leads ask under pressure: *given finite tempo, what do I spend it on?*

---

## Design intent

The game sits in a lane other things don't occupy:

| | Joshua Protocol | [Rail Breach](https://github.com/oliver-dolski/rail-breach) | Labshock | ThreatGen Red vs Blue |
|---|---|---|---|---|
| Format | Single-file HTML, mobile | TypeScript / WebGL2, desktop | Docker lab stack | Multiplayer card game |
| Activity | Tactical decisions under tempo | Watch attack spread, place defenses | Execute real tools against virtual OT | Turn-based team TTX |
| Audience | Curious cyber + strategy players | OT security students & instructors | OT pentesters, blue teamers | SOC team training |
| Time to first value | ~30 seconds | ~1 minute (web) | 30+ minutes setup | Session facilitation |

They are complementary tools. A serious OT learner would use several of them.

---

## What's in the box (v0.6)

### Three missions, each grounded in real incident patterns

- **OP. BLACKFROST** — 8-node Northeast power grid. Ransomware / APT / insider / hacktivist / supply-chain / pre-positioning adversary pool.
- **OP. NIGHTWATCH** — 5-asset satellite constellation (GEO + 2 LEO sun-synchronous + ground station + mission control). Uses real orbital propagation (SGP4-style Kepler solver, J2 perturbation, ECI→geodetic, GMST, link budget) lifted from the author's AeroSec-Lab platform. Grounded in SPARTA technique catalog.
- **OP. TIDEBREAK** — 8-asset Gulf Coast container terminal. Grounded in Port of Houston 2021 (Volt Typhoon-attributed via ManageEngine CVE-2021-40539), Maersk NotPetya 2017 ($300M loss, 76 port terminals offline), and ZPMC crane supply-chain concerns.

### Seven threat actor archetypes

Each is a mechanical fingerprint with distinct behavioral parameters, not an attribution:

- **CRYO COLLECTIVE** — ransomware crew, noisy, high-cascade
- **KINGFISHER** — aerospace APT, patient, adaptive-pivoting
- **IRONHAZE** — hacktivist, loud, easy-to-detect
- **GHOSTWIRE** — insider threat, inverts the win condition (identify foothold rather than sever external C2)
- **WARDEN** — access broker, alternating burst tempo
- **TIDEMARK** — supply-chain operator (ZPMC-pattern), vendor-remote-access vector
- **VOLTFORGE** — pre-positioning operator built on CISA/NSA/FBI advisory [AA24-038A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-038a) on Volt Typhoon. Lives off the land (cmd, certutil, ntdsutil, wmic, PowerShell, netsh, wevtutil, vssadmin, …). Wins by accumulating undetected dwell rounds, not by Impact. Changes the strategic game.

### Combo synergy system

Five named combos reward coordinated multi-agent actions on shared or adjacent targets:

- **RECON STRIKE** — VIGIL ▸ SCAN + WRAITH ▸ DISRUPT same target → enhanced disrupt + 30% C2 reveal
- **KILL BOX** — 2× DISRUPT on adjacent nodes → blocks adaptive-actor pivots this round
- **BULWARK** — 2× HARDEN same target → +1 bonus resilience
- **TRIANGULATE** — SCAN + TRACE same round → guaranteed C2 reveal
- **COVERED RESTORE** — DISRUPT + RESTORE same target → restore to healthy + hardening bonus

### Action point economy

5 AP per round across 3 agents (VIGIL / WRAITH / ANCHOR). Costs: SCAN=1, HARDEN=1, TRACE=2, DISRUPT=2, RESTORE=2, SEVER=3. Agents can act multiple times if AP permit. Forces real opportunity-cost thinking.

### Framework-grounded teaching aids

- **Purdue overlay** (`P` button on map) — translucent horizontal zone bands (L0 Field Devices through L5 Enterprise Networks, with DMZ at 3.5), inspired by the Purdue Enterprise Reference Architecture (Williams, 1992) as referenced within ANSI/ISA-95.
- **Ground truth / operator view toggle** (`GT`/`OPS` button on map, inspired by [Rail Breach](https://github.com/oliver-dolski/rail-breach)) — telemetry-trust mechanic. When an adversary uses T1692.002 (Unauthorized Reporting Message) or T0832 (Manipulation of View), the operator view shows the node as healthy while ground truth shows it compromised. T0829 (Loss of View) freezes operator state at last-known. DISRUPT and RESTORE re-verify telemetry.
- **Persistent attack trail** — every link an attack chain crosses stays lit in dim red (intensifying with repeat traversals), so the full kill chain reads in a single frame. Also inspired by Rail Breach.
- **Threat actor intro cards** cite their behavioral source where applicable (e.g. VOLTFORGE cites AA24-038A).

### Instructor-narrated tutorial demos

One deterministic demo per mission, scripted end-to-end with a bottom-anchored narrator card. Voice: principle/lead incident responder teaching an experienced cyber generalist who hasn't worked in that specific sub-domain. Teaches the tactical loop, combo discovery, and sector-specific decision patterns.

### CODEX reference models

Three sourced reference entries in the in-game codex:

- **Purdue Enterprise Reference Architecture** — origin, levels, ISA-95 relationship
- **IEC 62443 Zones & Conduits** — definitions, SL levels
- **Volt Typhoon pattern** — TTPs by tactic, LotL tool list, hunt artifacts (ESENT event IDs 216, 325, 326, 327, 637 per the advisory). Cites AA24-038A.

Every reference entry has a visible source citation.

### Round-over-round debrief

Pylons-style full-screen rubric (DETECTION / ATTRIBUTION / EFFICIENCY / HARDENING / CASCADE / DOCTRINE), TRENDS tab with sparklines, MOVES tab with repeat-failure pattern detection. CFI-style debrief notes adapt to the adversary actor and difficulty tier.

---

## Framework references and provenance

The game relies on public catalogues:

- **MITRE ATT&CK Enterprise** — Microsoft tactics/techniques, [attack.mitre.org](https://attack.mitre.org/)
- **MITRE ATT&CK for ICS v20** — [attack.mitre.org/matrices/ics](https://attack.mitre.org/matrices/ics/) — including proper handling of techniques revoked in v19 (T0855 → T1692.001, T0803 → T1691.001, T0856 → T1692.002), both IDs preserved as aliases in the codex
- **MITRE D3FEND** — defensive technique references
- **MITRE ATLAS** — adversarial ML techniques
- **SPARTA** (Space Attack Research & Tactic Analysis) — [sparta.aerospace.org](https://sparta.aerospace.org/) — authoritative aerospace cyber matrix maintained by The Aerospace Corporation
- **CISA/NSA/FBI AA24-038A** — [cisa.gov/news-events/cybersecurity-advisories/aa24-038a](https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-038a) — Volt Typhoon joint advisory, the behavioral model for VOLTFORGE

Every actor and codex entry with a real-world attribution has an in-game source citation.

**No fabricated TTPs. No invented framework IDs. No made-up event-log numbers.** Where authoritative confirmation was not available, the content was omitted.

---

## Known gaps and honest disclaimers

- **This is a game, not a safety case.** The adversary mechanics are simplifications. Attack chain progression resolves in abstract 3-phase steps, not realistic timing.
- **The orbital math is real** (verified LEO periods ~95 min, GEO altitude ~35,783 km, Kepler-Newton-Raphson converges), but is used for scene-setting and not for serious mission analysis.
- **The Purdue overlay** maps game nodes to Purdue levels by node type. For teaching purposes it is accurate; for a formal zone analysis of a real plant it would be insufficient.
- **IEC 62443 Zone/Conduit modeling** is referenced conceptually but not deeply mechanized; HARDEN is a soft proxy for raising Security Level.
- **VOLTFORGE** models documented Volt Typhoon tradecraft from AA24-038A but is a game archetype, not an attribution engine. Pattern-match outputs are game-mechanical, not forensic.
- **The game is single-player and air-gapped.** No telemetry, no network calls (except first-party font/CDN assets if any — the file is intentionally offline-first).

---

## Install

Download `index.html` and open it in a browser.

That's it.

To play on a phone: email it to yourself, open with your mobile browser, or use a USB cable + a file manager. Chrome on Android (`file://` or `content://` URLs) works. Portrait or landscape both supported — the UI reflows.

Older builds are archived in `builds/` for reference.

---

## Contributing

Issues and discussions welcome. Pull requests considered carefully — the single-file architecture is intentional, so cross-cutting refactors need to preserve that constraint.

Priorities for future work (v0.7+):
- OP. HEARTLINE — healthcare mission (EHR / PACS / BIOMED / etc.) with life-safety consequence model
- OP. RAILGUARD — railway signaling mission grounded in Pacific NW / Poland / Taiwan recent events
- Save/load + cross-run TRENDS
- Deterministic seeded scenarios (shareable `?seed=…` URLs)
- Sound (Web Audio)
- More threat actor archetypes

---

## Credits and influences

**Rail Breach** by Oliver Dolski ([github.com/oliver-dolski/rail-breach](https://github.com/oliver-dolski/rail-breach)) — the ground-truth / operator-view toggle and persistent attack trail in Joshua Protocol are directly inspired by Rail Breach's teaching mechanics. Different gameplay (watch-and-defend sandbox vs. turn-based tactics game), complementary teaching tools. Credit is due; the techniques are too useful not to borrow.

**Mini Metro**, **Plague Inc**, **Pandemic**, **XCOM** — strategic design heritage.

**WarGames (1983)** — Joshua as a character, the boot banner, the "shall we play a game?" prompt. Narrative heritage.

**MITRE Corporation** — ATT&CK, ATT&CK for ICS, D3FEND, ATLAS catalogues (used under their public terms of use; MITRE ATT&CK® and ATT&CK® are registered trademarks of The MITRE Corporation).

**The Aerospace Corporation** — SPARTA framework.

**CISA, NSA, FBI** — the joint advisory work (AA24-038A and others) that makes documented-behavior modeling possible.

---

## License

[MIT](LICENSE). Use it, modify it, teach with it.

---

## About

Built by Ted Gransbury — [github.com/grumby42](https://github.com/grumby42) · [linkedin.com/in/tgransbury](https://www.linkedin.com/in/tgransbury) — cybersecurity professional, FAA Commercial LTA-Balloon pilot and flight instructor, Launch Director at the Albuquerque International Balloon Fiesta. Career direction: converging aviation and cybersecurity at the cyber-physical seam.

Current version: **v0.6** (October 2026)
