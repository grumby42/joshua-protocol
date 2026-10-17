# Joshua Protocol

A single-file HTML5 tactical cybersecurity strategy game. Mobile-playable. No install, no backend, no account.

**▶ Play in your browser: [grumby42.github.io/joshua-protocol/](https://grumby42.github.io/joshua-protocol/)**
Or open `index.html` locally in any modern browser.

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

## What's in the box (v0.9.4)

### Five missions, each grounded in real incident patterns

- **OP. BLACKFROST** — 8-node Northeast power grid. Ransomware / APT / insider / hacktivist / supply-chain / pre-positioning adversary pool.
- **OP. NIGHTWATCH** — 5-asset satellite constellation (GEO + 2 LEO sun-synchronous + ground station + mission control). Uses real orbital propagation (SGP4-style Kepler solver, J2 perturbation, ECI→geodetic, GMST, link budget) lifted from the author's AeroSec-Lab platform. Grounded in SPARTA technique catalog.
- **OP. TIDEBREAK** — 8-asset Gulf Coast container terminal. Grounded in Port of Houston 2021 (Volt Typhoon-attributed via ManageEngine CVE-2021-40539), Maersk NotPetya 2017 ($300M loss, 76 port terminals offline), and ZPMC crane supply-chain concerns.
- **OP. HEARTLINE** — 8-node regional hospital system (EDGE / AD / EHR / PACS / LAB / PHARM / BIOMED-PUMP / BIOMED-TELEM). Grounded in NHS WannaCry 2017 (£92M loss, ~19,000 appointments cancelled, surgeries diverted) and Change Healthcare Feb 2024 (ALPHV/BlackCat, $872M direct loss, pharmacy claims nationwide offline for weeks). First mission with a **life-safety consequence model**: compromise of a patient-connected biomed device registers as a care-delivery event (per FDA Medical Device Cybersecurity Guidance 2023 + HHS 405(d) Healthcare Industry Cybersecurity Practices), not a dollar-value event.
- **OP. RAILGUARD** 🆕 — 8-node regional railway (AD / DISPATCH / PTC-SERVER / FREIGHT-TMS / INTERLOCK-A / INTERLOCK-B / VHF-LINK / GRADE-X). Grounded in Belarusian Cyber-Partisans Jan 2022 (BelZhD dispatch encryption during Russian troop movements), Polish ABW Aug 2023 investigation of radio-stop command injection on freight lines (20+ unauthorized stop signals via legitimate cleartext VHF signaling), and Taiwan TRA 2022-2024 ransomware+phishing. Life-safety consequence model: trackside signaling or grade-crossing compromise = passenger- or motorist-safety event per FRA 49 CFR 236 Subpart H + TSA Security Directive 1580/82-2022-01A.

### Eight threat actor archetypes (v0.9: reality-grounded rework)

Each is a mechanical fingerprint with distinct behavioral parameters, not an attribution. v0.9 reworked these to match 2026 ground truth per primary sources (Mandiant M-Trends 2026, CISA advisories, Ponemon 2025 Insider Threats, Huntress/Rapid7 2025 IAB reporting, Europol Operation Eastwood July 2025):

- **CRYO COLLECTIVE** — RaaS, **slow-dwell reconnaissance + fast-impact double extortion**. 14-day median dwell per M-Trends 2026; exfil before encrypt; backup destruction before encryption; sources CISA Change Healthcare 2024 pattern.
- **KINGFISHER** — aerospace APT, patient, adaptive-pivoting on response.
- **IRONHAZE** — hacktivist, **availability-focused (T1498 DDoS family + T1499 Endpoint DoS)** with opportunistic exposed-OT exploitation. Models NoName057(16) / DDOSIA crowdsourced-DDoS pattern (Europol Operation Eastwood, July 2025) and CyberAv3ngers / Unitronics direct-PLC-abuse pattern (CISA AA23-335A, Nov 2023).
- **GHOSTWIRE** — **malicious insider** (~25% of insider cases per Ponemon 2025), long-dwell, authorized-but-abnormal. Separated from compromised-credentials in v0.9.
- **HOLLOWKEY** 🆕 — **compromised credentials** (~20% of insider-category cases per Ponemon 2025). Infostealer-sourced valid-account abuse; external geography; MFA fatigue / session-cookie theft; immediate reconnaissance after sign-in. Keyhole silhouette.
- **WARDEN** — **true Initial Access Broker** per 2025-2026 reality. Enumeration-heavy, impact-light. **Hands off to a successor actor** (CRYO or HOLLOWKEY) after round 3 — the broker-to-ransomware handoff; sources Mandiant M-Trends 2026 (22-second handoff cases observed) and Huntress/Rapid7 2025.
- **TIDEMARK** — supply-chain operator (ZPMC-pattern), vendor-remote-access vector.
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

### v0.7: Senior-analyst reasoning layer

New in v0.7, inspired by [grumby42/dfir-trainers](https://github.com/grumby42/dfir-trainers)' TRAINER_SPEC:

- **FRAMES tab** — four analyst frameworks shown live, filling in as evidence accumulates:
  - Cyber Kill Chain® (Lockheed Martin, 2011) — attacker position
  - NIST SP 800-61 Rev. 2 IR phases — your position
  - Diamond Model of Intrusion Analysis (Caltagirone, Pendergast, Betz 2013) — attribution completeness
  - Pyramid of Pain (David Bianco, 2013) — attribution rung quality
- **OODA reflection cards** — Observe → Orient → Relevance → Sufficiency reasoning prompts at three key moments per run (first combo, first C2 reveal, first compromise). Fires at most once per run per trigger — not for every event.
- **ACH gate before SEVER** — Analysis of Competing Hypotheses discipline per Richards J. Heuer Jr. (CIA Center for the Study of Intelligence, 1999). Before you commit the irreversible 3-AP SEVER action, you're forced to acknowledge the primary hypothesis AND the strongest alternatives with their evidence strength scored.
- **Keyboard navigation** — ←/→, Enter, Space, Esc for narrator / modal interaction; 1/2/3 to select agents during PLAN; V toggles view mode; P toggles Purdue overlay; `,` opens settings.
- **BUILD stamping** — every build carries `BUILD_ID = HUNT-YYYYMMDD-HHMMZ` + `STAMP_UTC` surfaced in-boot. Pattern borrowed from DFIR Trainers.
- **[DETECTIONS.md](DETECTIONS.md)** companion — one starter detection *play* per threat actor archetype, authored to the seven-field schema from Bollinger/Enright/Valites' *Crafting the InfoSec Playbook* and Murdoch's *Blue Team Handbook*. Teaches how to author detections, not what rules to paste.

### v0.8: Ship-ready polish

- **First-launch onboarding** — one-time card explaining the game, agents, archetypes, and letting you calibrate difficulty + pacing. Settings persist on your device.
- **Save & resume** — the game snapshots your run at every round boundary and on tab close. Mission select shows a RESUME banner when a save exists. Clear it with DISCARD.
- **Preferences persistence** — difficulty, verbosity, and pacing stick between sessions.
- **Case-log JSON export** — EXPORT button on the debrief downloads a `joshua-protocol.case-log.v1` JSON file compatible with [grumby42/dfir-trainers](https://github.com/grumby42/dfir-trainers) case-log schema. Share your runs; compare notes with peers.
- **Trends-tab NaN safety** — defensive normalization on round-metric fields so a missing field can't poison the sparkline rendering with literal "NaN" strings.

### v0.9: SME-accuracy rework (Priority 1)

Found by audit: several archetypes were playing to pre-2020 Hollywood tropes rather than 2026 ground truth. v0.9 fixes:

- **CRYO is no longer a 2018 ransomware.** Reworked to Mandiant M-Trends 2026 slow-dwell (14-day median) + fast-impact tempo with double extortion (exfil before encrypt) and backup destruction. New `tempo: 'slow_dwell_fast_impact'` flag. Mirrors CISA's Change Healthcare 2024 advisory pattern.
- **IRONHAZE has DDoS now.** Added T1498 (Network DoS), T1498.001 (Direct Flood), T1498.002 (Reflection Amplification), T1499 (Endpoint DoS), T1491.001 (Internal Defacement) to the technique catalog. Primary bias toward availability impact (DDoS), with secondary OT-direct exploitation per CISA AA23-335A (CyberAv3ngers / Unitronics).
- **GHOSTWIRE is now specifically the malicious insider.** Narrowed to the ~25% of real insider cases per Ponemon 2025. Compromised credentials (the ~20% stolen-cred cases) got its own actor:
- **HOLLOWKEY (new)** — infostealer-sourced compromised-credential actor. External geography, MFA fatigue / session-cookie theft tradecraft, immediate recon after sign-in. New `archetype: 'compromised_credentials'`, keyhole silhouette, added to all three missions' valid-actor pools.
- **WARDEN is now a true Initial Access Broker.** No longer deploys ransomware itself. New `handoffAfterRounds: 3` mechanic — WARDEN enumerates for 3 rounds, then hands off STATE.activeActor to a successor from `successorPool: ['CRYO', 'HOLLOWKEY']` on round 4, with a 30-point attribution penalty (you have to re-identify the new actor). Models the broker-to-ransomware pipeline per Mandiant M-Trends 2026 and Huntress/Rapid7 2025.
- **CFI debrief notes** got four new actor-specific branches (slow-dwell ransomware, IAB handoff, compromised-creds, availability-focused hacktivist).
- **DETECTIONS.md** rewritten for all four reworked actors + new Play 8 for HOLLOWKEY. Every claim sourced to primary advisory / report.
- **11 new ATT&CK techniques** added to the catalog: T1498, T1498.001, T1498.002, T1499, T1491.001, T1078.001, T1110, T1565.001, T1531, T1555.003, T1087.001.
- **Zero fabrication.** Every TTP sourced to primary advisory / report. Every statistic cited to source (M-Trends 2026, Ponemon 2025, CISA advisories, Europol Operation Eastwood).

### v0.9.1: Priority 2 SME audit — depth passes

Added depth to the three archetypes/missions the audit flagged as thin:

- **VOLTFORGE stage-chain** — the AA24-038A tool ladder is now stage-aware. `lolChain` carries 7 stages (Recon → Discovery → Credential Access → Lateral → Defense Evasion → C2/Proxy → Exfil Staging) with real tool names and command-line fingerprints per the advisory. Codex Volt Typhoon entry now shows every stage with its signature commands (`ntdsutil "ac i ntds" "ifm"`, `nltest /domain_trusts`, `netsh int portproxy add v4tov4`, `rundll32 comsvcs.dll MiniDump`, …).
- **TIDEMARK cellular-modem signature (ZPMC pattern)** — new `cellularBeaconMode: true` flag + 5 new ATT&CK techniques (T1205 Traffic Signaling, T1571 Non-Standard Port, T1573 Encrypted Channel, T0885 Commonly Used Port ICS, T0845 Program Upload ICS). Dedicated codex entry on the 2024 U.S. House Select Committee on CCP ZPMC report + USCG MARSEC Directive 105-6 + EO 14116. DETECTIONS.md Play 6 extended with sub-play 6B — a procurement + physical + carrier-metadata hunt, because enterprise NetFlow is blind to this traffic.
- **TIDEBREAK Maersk-scale consequence** — mission tightened: `maxRounds: 11→9`, `loseThreshold: 4→3`. New `sectorCascade` mechanic: when TOS compromises, both cranes become operationally stressed (not just adjacent-cascade stressed) because manifest truth is lost — the Maersk NotPetya 2017 pattern ($300M loss, 76 terminals offline, 10-day recovery). CFI debrief references Port of Houston 2021 (CVE-2021-40539, Volt Typhoon via ManageEngine) when the mission ends in loss.

### v0.9.2: Priority 3 — KINGFISHER depth + seeded replay URLs

- **KINGFISHER aerospace APT depth** — the actor now has a 7-stage `aerospaceChain` (RF+OSINT Recon → Ground-IT Initial Access → MCC Lateral → Operator-Identity Theft → Uplink Staging → On-Orbit Payload Delivery → Mission Impact), each stage tagged with its SPARTA/ATT&CK TTPs and a documented real-world incident anchor. 5 new SPARTA techniques added (REC-0005 Eavesdropping, EX-0010 Malicious Code, EX-0012 Modify On-Board Values, IMP-0005 Denial, LM-0001 Lateral Movement) with full descriptions grounded in CSIS Space Threat Assessment, Secure World Foundation, USSF Space Delta 15, Mandiant M-Trends aerospace, CISA ViaSat KA-SAT 2022 analysis, Russia-Ukraine theater jamming reporting, and Black Sea GPS-spoofing campaigns. NIGHTWATCH threatMix extended, intro card renders the chain, dedicated codex entry carries the stage-by-stage tool + incident mapping, CFI debrief has an aerospace-APT-aware doctrine note.
- **Deterministic seeded replay URLs** — append `?seed=…` to the game URL and every random draw becomes deterministic. Seeds accept decimal, hex (`0x…`), or human-friendly strings (FNV-1a normalized). The debrief header shows the active seed; a new **SHARE** button on the debrief copies a shareable `?seed=…` URL to the clipboard. Case-log JSON export now carries the seed. mulberry32 PRNG — small, uniform, deterministic. Share your runs; peers can replay the exact scenario, actor, and attack sequence you faced.

### v0.9.3: OP. HEARTLINE healthcare mission + life-safety consequence model

- **New mission OP. HEARTLINE** — 8-node regional hospital: EDGE (VPN) → AD (identity) → EHR (clinical control plane) → PACS / LAB / PHARM (clinical IT) → BIOMED-PUMP / BIOMED-TELEM (patient-connected). 13-link topology; EHR is the hub. Purdue mapping treats biomedical devices as L1 field, clinical IT as L3, AD as L4, EDGE as DMZ.
- **Life-safety consequence model** — new `lifeSafetyNodes` mission field + `lifeSafetyEvents` state capture. When a patient-connected device (BIOMED-PUMP or BIOMED-TELEM) compromises, the game logs a `⚠⚠ LIFE-SAFETY EVENT` and records it to the metrics; CFI debrief treats this as a care-delivery event (not dollar loss), referencing FDA Medical Device Cybersecurity Guidance 2023 and HHS 405(d) HICP. Case-log JSON export carries `life_safety_events`.
- **NHS WannaCry sector cascade** — when EHR compromises, PACS + LAB + PHARM + both biomed nodes transition to `stressed` with narrator beat citing the NHS 2017 pattern. Models the real-world finding (per UK NAO report): the ransomware itself didn't kill patients, but the loss of the information backbone that coordinates care did, by forcing clinicians onto manual workflows at an unsustainable tempo.
- **Valid actor pool** per CISA #StopRansomware Hospital guidance: CRYO (ransomware dominant), HOLLOWKEY (infostealer-sourced creds — Change Healthcare 2024 pattern), WARDEN → CRYO/HOLLOWKEY handoff (IAB-to-ransomware pipeline), GHOSTWIRE (malicious insider — EHR snooping per HHS OCR breach reporting), VOLTFORGE (strategic pre-positioning concern per CISA/USSF briefings on healthcare).
- **2 new ATT&CK techniques**: T1557 Adversary-in-the-Middle (HL7/DICOM MITM — called out by HHS 405(d) HICP Practice #8 as a known-exposed interface), T1200 Hardware Additions (biomedical device supply-chain per FDA 524B and Patch Act).
- **2 new codex entries**: NHS WannaCry 2017 pattern (NAO + DHSC post-incident reports), Change Healthcare Feb 2024 pattern (UnitedHealth earnings disclosures + HHS OCR + Senate Finance Committee testimony).
- **Custom node rendering**: BIOMED nodes draw as EKG-pulse diamonds (visual cue that this is patient-connected), EHR draws as a clinical-cross circle (visual cue that this is the control plane). "Patient zone" band at the bottom of the map with a `⚠ PATIENT ZONE — LIFE SAFETY` legend.
- **CFI debrief**: HEARTLINE-specific doctrine notes on life-safety events and (on loss) the Change Healthcare 2024 doctrinal lesson — vendor interdependency mapping and manual-mode workflow readiness, not "better backups alone."

### v0.9.4: OP. RAILGUARD rail mission + TIMELINE debrief tab

**OP. RAILGUARD — 5th playable mission**

- 8 nodes: AD → DISPATCH → PTC-SERVER / FREIGHT-TMS (back-office) → INTERLOCK-A / INTERLOCK-B (trackside signaling) + VHF-LINK (RF cab-signaling) + GRADE-X (grade crossing). 14-link topology; DISPATCH is the hub. Purdue mapping: rail-back-office=L3, interlock=L2, trackside/rf-link=L1, identity=L4.
- Grounded in **Belarusian Cyber-Partisans Jan 2022** (BelZhD dispatch encryption during Russian troop movements), **Polish ABW Aug 2023** investigation (20+ unauthorized VHF radio-stop signals on freight lines using legitimate cleartext signaling — no cryptographic authentication by legacy design), **Taiwan TRA 2022-2024** (ransomware + phishing against back-office), **TSA Security Directive 1580/82-2022-01A** (rail cybersecurity requirements), **FRA 49 CFR Part 236 Subpart H** (PTC cybersecurity + fallback operations), and **CENELEC 50159** (safety-critical rail communications).
- Life-safety consequence model: compromise of INTERLOCK-A, INTERLOCK-B, or GRADE-X = passenger- or motorist-safety event (not dollar loss). CFI debrief cites FRA Part 236 + TSA 1580/82 and the Polish Aug 2023 pattern.
- Belarusian sector cascade: when DISPATCH compromises, interlockings + PTC + FREIGHT-TMS go stressed with narrator beat citing the real BelZhD incident doctrine ("Dispatch is the control plane for every movement").
- Valid actor pool: CRYO (Taiwan TRA archetype), **IRONHAZE** (hacktivist with command-injection — maps Belarus Partisans + Polish VHF patterns), WARDEN → CRYO/HOLLOWKEY handoff, HOLLOWKEY, GHOSTWIRE insider, VOLTFORGE pre-positioning. 6 actors.
- 2 new ATT&CK for ICS techniques: **T0871 Execution Through API** (rail SCADA / PTC back-office API abuse per CISA ICS-CERT advisories), **T0836 Modify Parameter** (parameter manipulation of signaling/PTC gains — Polish Aug 2023 investigation documented command-side parameter abuse).
- 2 new codex entries: **Belarusian Cyber-Partisans / BelZhD Jan 2022** (Reuters + AP reporting, TSA 1580/82, CENELEC 50159), **Polish Freight Railway VHF Radio-Stop Incidents** (Polish ABW statements Aug-Sep 2023, PAP reporting, CENELEC 50159 doctrine).
- Custom node rendering: INTERLOCK draws as a 3-lamp signal aspect; VHF-LINK draws as an antenna mast with animated RF wave arcs; GRADE-X draws as a diamond with X-mark motif. Track-plane band + public-zone (life-safety) band at the bottom of the map.

**TIMELINE debrief tab**

- New TIMELINE tab in the debrief (fourth tab alongside RUBRIC / TRENDS / MOVES)
- Scrubbable round-by-round grid: horizontal rounds × vertical nodes, event glyphs in each cell (threat spawn, compromise, player action with outcome symbol, combo)
- Round-level event row at the bottom: C2 revealed, C2 severed, IAB handoff, sector cascade, life-safety events
- Click a round header → details panel below shows that round's full breakdown (spawns, actions with outcomes + waste reasons, combos, cascade, life-safety)
- Reuses `STATE.metrics` + `STATE.combosTriggered` + `STATE.lifeSafetyEvents` (now with new `metrics.compromisesByRound`, `metrics.handoffRound`, `metrics.handoffFrom/To` tracking)
- Shows the active seed at the top of the tab when a seeded run — closes the loop with v0.9.2's seeded replay URLs so peer review is "same seed → same timeline"
- Mobile-friendly: table is horizontally scrollable; sticky node-name column; compact glyphs

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

Easiest: **[play it in your browser](https://grumby42.github.io/joshua-protocol/)** — nothing to install.

Offline / mobile: download `index.html` from this repo and open it in any modern browser. Email it to yourself, open with your mobile browser, or sideload via USB. Portrait or landscape both supported — the UI reflows.

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

Current version: **v0.9.4** (October 2026) · BUILD `HUNT-20261017-1645Z`
