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

## What's in the box (v0.10.0)

### Five missions, each grounded in real incident patterns

- **OP. BLACKFROST** — 8-node Northeast distribution grid at winter peak. Grounded in Ukraine 23 Dec 2015 (E-ISAC/SANS: three oblenergos, ~225,000 customers, breakers opened from the dispatchers' own HMIs, serial-to-ethernet firmware corrupted to block remote restoration) and Ukraine 17 Dec 2016 (Dragos CRASHOVERRIDE / ESET Industroyer — the first malware framework built to attack electric grids). Control-center compromise cascades to all four substations; SUB-B (medical center + water treatment feeders) and SUB-D (winter residential heating) are critical-load life-safety nodes.
- **OP. NIGHTWATCH** — 5-asset satellite constellation (GEO + 2 LEO sun-synchronous + ground station + mission control). Mission-control compromise cascades to the whole fleet — the ViaSat KA-SAT Feb 2022 lesson that the ground segment is the chokepoint. Uses real orbital propagation (SGP4-style Kepler solver, J2 perturbation, ECI→geodetic, GMST, link budget) lifted from the author's AeroSec-Lab platform. Grounded in SPARTA technique catalog.
- **OP. TIDEBREAK** — 8-asset Gulf Coast container terminal. Grounded in Port of Houston Aug 2021 (CVE-2021-40539 Zoho ManageEngine ADSelfService Plus — CISA Director Easterly publicly described as a "nation-state actor" intrusion; no primary source has named a specific cluster), Maersk NotPetya 2017 ($300M loss, operations disrupted across Maersk's 76-terminal network), and ZPMC crane supply-chain concerns.
- **OP. HEARTLINE** — 8-node regional hospital system (EDGE / AD / EHR / PACS / LAB / PHARM / BIOMED-PUMP / BIOMED-TELEM). Grounded in NHS WannaCry 2017 (£92M loss, ~19,000 appointments cancelled, surgeries diverted) and Change Healthcare Feb 2024 (ALPHV/BlackCat; $872M Q1 2024 impact [$593M direct + $279M business disruption], full-year 2024 impact >$3B; ~190M individuals' PHI; pharmacy claims nationwide offline for weeks). First mission with a **life-safety consequence model**: compromise of a patient-connected biomed device registers as a care-delivery event (per FDA Medical Device Cybersecurity Guidance 2023 + HHS 405(d) Healthcare Industry Cybersecurity Practices), not a dollar-value event.
- **OP. RAILGUARD** 🆕 — 8-node regional railway (AD / DISPATCH / PTC-SERVER / FREIGHT-TMS / INTERLOCK-A / INTERLOCK-B / VHF-LINK / GRADE-X). Grounded in Belarusian Cyber-Partisans Jan 2022 (encrypted the bulk of BelZhD IT during Russian troop movements), Polish ABW Aug 2023 investigation of radio-stop command injection (approximately 20 trains halted using legitimate cleartext VHF signaling), and generic rail-sector ransomware exposure per CISA #StopRansomware advisories + APTA Cybersecurity Toolkit. Life-safety consequence model: trackside signaling or grade-crossing compromise = passenger- or motorist-safety event per FRA 49 CFR Part 236 Subpart I §236.1033 (PTC communications and security requirements) + TSA Security Directive 1580/82-2022-01C.

### Eight threat actor archetypes (v0.9: reality-grounded rework)

Each is a mechanical fingerprint with distinct behavioral parameters, not an attribution. v0.9 reworked these to match 2026 ground truth per primary sources (Mandiant M-Trends 2026, CISA advisories, Ponemon 2025 Cost of Insider Risks, Huntress/Rapid7 2025 IAB reporting, Europol Operation Eastwood July 2025):

- **CRYO COLLECTIVE** — RaaS, **slow-dwell reconnaissance + fast-impact double extortion**. 14-day median dwell per M-Trends 2026; exfil before encrypt; backup destruction before encryption; sources CISA Change Healthcare 2024 pattern.
- **KINGFISHER** — aerospace APT, patient, adaptive-pivoting on response.
- **IRONHAZE** — hacktivist, **availability-focused (T1498 DDoS family + T1499 Endpoint DoS)** with opportunistic exposed-OT exploitation. Models NoName057(16) / DDOSIA crowdsourced-DDoS pattern (Europol Operation Eastwood, July 2025) and CyberAv3ngers / Unitronics direct-PLC-abuse pattern (CISA AA23-335A, Nov 2023).
- **GHOSTWIRE** — **malicious insider** (~26% of insider cases per Ponemon 2025 Cost of Insider Risks), long-dwell, authorized-but-abnormal. Separated from compromised-credentials in v0.9.
- **HOLLOWKEY** 🆕 — **"outsmarted" / compromised credentials** (~20% of insider-category cases per Ponemon 2025 Cost of Insider Risks). Infostealer-sourced valid-account abuse; external geography; MFA fatigue / session-cookie theft; immediate reconnaissance after sign-in. Keyhole silhouette.
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
- **GHOSTWIRE is now specifically the malicious insider.** Narrowed to the ~26% of real insider cases per Ponemon 2025 Cost of Insider Risks. Compromised credentials (the ~20% "outsmarted" category in the report) got its own actor:
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
- **TIDEBREAK Maersk-scale consequence** — mission tightened: `maxRounds: 11→9`, `loseThreshold: 4→3`. New `sectorCascade` mechanic: when TOS compromises, both cranes become operationally stressed (not just adjacent-cascade stressed) because manifest truth is lost — the Maersk NotPetya 2017 pattern ($300M loss, operations disrupted across 76-terminal network, 10-day recovery). CFI debrief references Port of Houston Aug 2021 (CVE-2021-40539 Zoho ManageEngine) when the mission ends in loss.

### v0.9.2: Priority 3 — KINGFISHER depth + seeded replay URLs

- **KINGFISHER aerospace APT depth** — the actor now has a 7-stage `aerospaceChain` (RF+OSINT Recon → Ground-IT Initial Access → MCC Lateral → Operator-Identity Theft → Uplink Staging → On-Orbit Payload Delivery → Mission Impact), each stage tagged with its SPARTA/ATT&CK TTPs and a documented real-world incident anchor. 5 new SPARTA techniques added (REC-0005 Eavesdropping, EX-0010 Malicious Code, EX-0012 Modify On-Board Values, IMP-0005 Destruction, LM-0001 Hosted Payload) with full descriptions grounded in CSIS Space Threat Assessment, Secure World Foundation, USSF Space Delta 15, Mandiant M-Trends annual reports (aerospace observations within), CISA ViaSat KA-SAT 2022 analysis, Russia-Ukraine theater jamming reporting, and Black Sea GPS-spoofing campaigns. NIGHTWATCH threatMix extended, intro card renders the chain, dedicated codex entry carries the stage-by-stage tool + incident mapping, CFI debrief has an aerospace-APT-aware doctrine note.
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
- Grounded in **Belarusian Cyber-Partisans Jan 2022** (encrypted the bulk of BelZhD IT during Russian troop movements), **Polish ABW Aug 2023** investigation (approximately 20 trains halted using legitimate cleartext VHF signaling — no cryptographic authentication by legacy design), **CISA #StopRansomware rail-sector advisories + APTA Cybersecurity Toolkit** (generic sector ransomware context), **TSA Security Directive 1580/82-2022-01C** (current rail cybersecurity requirements), **FRA 49 CFR Part 236 Subpart I §236.1033** (PTC communications and security requirements), and **CENELEC EN 50159** (safety-related communications in transmission systems).
- Life-safety consequence model: compromise of INTERLOCK-A, INTERLOCK-B, or GRADE-X = passenger- or motorist-safety event (not dollar loss). CFI debrief cites FRA Part 236 + TSA 1580/82 and the Polish Aug 2023 pattern.
- Belarusian sector cascade: when DISPATCH compromises, interlockings + PTC + FREIGHT-TMS go stressed with narrator beat citing the real BelZhD-pattern lesson (when the IT backbone that coordinates movement goes down, movement authorities freeze while trackside gear stays physically fine).
- Valid actor pool: CRYO (ransomware against rail IT per CISA #StopRansomware archetype), **IRONHAZE** (hacktivist with command-injection — maps Belarus Partisans + Polish VHF patterns), WARDEN → CRYO/HOLLOWKEY handoff, HOLLOWKEY, GHOSTWIRE insider, VOLTFORGE pre-positioning. 6 actors.
- 2 new ATT&CK for ICS techniques: **T0871 Execution Through API** (rail SCADA / PTC back-office API abuse per CISA ICS-CERT advisories), **T0836 Modify Parameter** (parameter manipulation of signaling/PTC gains — Polish Aug 2023 investigation documented command-side parameter abuse).
- 2 new codex entries: **Belarusian Cyber-Partisans / BelZhD Jan 2022** (Reuters + AP reporting, TSA 1580/82, EN 50159), **Polish Freight Railway VHF Radio-Stop Incidents** (Polish ABW statements Aug-Sep 2023, PAP reporting, EN 50159 doctrine).
- Custom node rendering: INTERLOCK draws as a 3-lamp signal aspect; VHF-LINK draws as an antenna mast with animated RF wave arcs; GRADE-X draws as a diamond with X-mark motif. Track-plane band + public-zone (life-safety) band at the bottom of the map.

**TIMELINE debrief tab**

- New TIMELINE tab in the debrief (fourth tab alongside RUBRIC / TRENDS / MOVES)
- Scrubbable round-by-round grid: horizontal rounds × vertical nodes, event glyphs in each cell (threat spawn, compromise, player action with outcome symbol, combo)
- Round-level event row at the bottom: C2 revealed, C2 severed, IAB handoff, sector cascade, life-safety events
- Click a round header → details panel below shows that round's full breakdown (spawns, actions with outcomes + waste reasons, combos, cascade, life-safety)
- Reuses `STATE.metrics` + `STATE.combosTriggered` + `STATE.lifeSafetyEvents` (now with new `metrics.compromisesByRound`, `metrics.handoffRound`, `metrics.handoffFrom/To` tracking)
- Shows the active seed at the top of the tab when a seeded run — closes the loop with v0.9.2's seeded replay URLs so peer review is "same seed → same timeline"
- Mobile-friendly: table is horizontally scrollable; sticky node-name column; compact glyphs

### v0.10.0: TWO-ADVERSARY MODE

The first mechanic that changes what *attribution* means in the game. Opt-in (Settings ▸ ADVERSARIES ▸ TWO, or `?adv=2` on the URL — carried in SHARE links); off by default; never applied to instructor demos; single-adversary play is byte-for-byte unchanged (`coActive()` is false on every new path).

- **Real-world anchor, verified against the primary.** CISA/FBI/CNMF advisory [AA23-250A](https://www.cisa.gov/sites/default/files/2023-09/aa23-250a-apt-actors-exploit-cve-2022-47966-and-cve-2022-42475.pdf) (7 Sep 2023): "multiple nation-state APT actors were present on the organization's network" of an Aeronautical Sector organization — one set via CVE-2022-47966 (Zoho ManageEngine ServiceDesk Plus), "additional APT actors" via CVE-2022-42475 on the firewall device — with "overlapping TTPs across multiple APT actors." Sophos X-Ops (Aug 2022) is the corroborating vendor case (three ransomware groups, two within two hours), carried with Sophos's own caveat that the trend "is still based on anecdotal evidence." The game pairs archetypes from the mission's roster; it does not claim which real actors co-occurred.
- **Mechanics.** A second actor from the mission's roster (never an initial-access broker — the handoff mechanic stays bound to the primary slot) is present from round 1 with its own foothold, its own threat chains (`threat.actorId`), its own adaptive pivots, its own dwell counter if it is a pre-positioning actor, and its own spawn tempo. **TRACE** resolves the primary C2 first, then works the second adversary's beacons; **TRIANGULATE** does the same; **SEVER** hits whichever C2 is revealed and live, primary first — and the second SEVER gets its own ACH gate, with an added competing hypothesis: *the beacons you traced belong to the other intrusion set*. Severing one adversary removes only that adversary's chains; the game does not end until both are cut or the clock runs out.
- **The attribution problem is deliberate.** Observed TTPs stay in one shared pool, so the second adversary's techniques inflate or dilute the primary attribution exactly as they would in a SOC. The INTEL tab keeps a separate evidence count and attribution for "signature B" and reveals the second actor's identity at the same 60% threshold.
- **Everything downstream knows.** Case-log JSON carries `second_adversary`; the TICKET export adds a SECOND ADVERSARY line and an open item for the un-severed C2; the TIMELINE tab marks entry, second reveal and second sever; save/resume round-trips all of it; seeded replay is deterministic in the mode.
- **Codex entry + DETECTIONS.md Play 11** (*Concurrent intrusion sets — clustering before attribution*): cluster beacons by infrastructure and lineage before attributing; ACH per cluster; contain per cluster and re-verify; fix the edge once.
- **Verified headlessly, and now reproducibly** — the harness and every test ship in [`playtest/`](playtest/) (`node playtest/v010-two-adversary-test.js`): 120 seeded active-bot runs (24 per mission, 70 distinct actor pairings) — every invariant holds (second actor ≠ primary and never a broker; second C2 ≠ primary C2; every chain tagged; primary SEVER leaves no primary chains; no WIN-by-sever while the second adversary is live; ticket carries the second adversary); 40/40 mode-off runs unchanged; all five instructor demos still win with nothing compromised; the v0.9 passive, stress, save/resume, ACH, combo and export suites pass.

### v0.9.9: NIGHTWATCH demo correction (and a correction to the v0.9.8 record)

- **Correction.** The v0.9.8 release note and commit message said all five instructor demos finished "with nothing compromised." That was true for four. The NIGHTWATCH walkthrough scanned and hardened the round-one KEYSTONE threat but never DISRUPTed it, so it matured at round 4 and KEYSTONE was compromised in every run. The harness output was there; the claim was written before it was read. Logged here so the record is accurate, not quietly fixed.
- **NIGHTWATCH demo rewritten to the real board.** Round 2 now spends its fifth AP on `WRAITH ▸ DISRUPT KEYSTONE`; the narration describes the deterministic adaptive pivots the engine actually makes (KEYSTONE → MCC at round 2, NWATCH-2 → KEYSTONE at round 3) and closes with a **KILL BOX** on MCC + KEYSTONE at round 4 before severing at round 5. Teaching line: every time the satellite is hit, an aerospace APT falls back toward the ground segment — the uplink is the prize, not the bus.
- **Verified headlessly, 8× per mission: five for five, WIN, nothing compromised** — BLACKFROST R6, NIGHTWATCH R5 (TRIANGULATE + KILL BOX), TIDEBREAK R6, HEARTLINE R6, RAILGUARD R6. This is the claim v0.9.8 should have made, now with the evidence behind it.

### v0.9.8: Verification ledger, SOC-handoff ticket, TIDEBREAK demo determinism

- **[SOURCES.md](SOURCES.md)** — a verification ledger: every real-world claim in the game (statistic, incident detail, advisory number, regulation, framework ID) mapped to its primary source, what exactly was checked, the date, and a status of **V** verified against primary / **C** corroborated by secondary press only / **N** not independently verified. This is the mechanism that lets the game keep growing without the accuracy decaying — a reviewer can re-check any row, and the "N" rows are an honest list of what has not been read against its primary.
- **TICKET export** — a second export beside the JSON case log: a Markdown SOC-handoff ticket in the shape a Tier-1 hands to Tier-2 at shift change. Summary (adversary assessment, attribution shift, C2 state, compromised assets, cascades, life-safety events), round-by-round timeline, observed techniques with tactics, hypothesis state for ACH continuation (TTPs consistent and inconsistent with the primary hypothesis; alternatives still open; IOCs), scorecard with instructor note, and a checklist of open items for the next shift. Built as a pure function of game state so it is unit-tested headlessly.
- **TIDEBREAK demo rewritten** — the adaptive pivot used to land on a random adjacent node the script never addressed, so a "textbook" walkthrough quietly lost CTRL or DALI. Adaptive pivots are now deterministic in demo mode (first eligible adjacent by id; live play keeps the random pivot) and the script teaches the counter: harden the likely pivot target, then close a **KILL BOX** with two DISRUPTs on adjacent nodes — including spending a DISRUPT on an empty node to deny a pivot onto the vessel. 10/10 runs: nothing compromised, two KILL BOXes, one narrated pivot.

### v0.9.7: Insider depth, D3FEND as a real framework, protocol-centric detection plays

- **GHOSTWIRE `insiderChain`** — six stages from the CERT National Insider Threat Center models (IT sabotage / theft of IP / fraud): precipitating event → entitlement accumulation → crown-jewel reconnaissance → staging + archiving → exfiltration → after-termination sabotage. Grounded in the SEI/CERT *Common Sense Guide to Mitigating Insider Threats*, 7th ed. (Sep 2022, 22 practices), *The CERT Guide to Insider Threats* (Cappelli, Moore, Trzeciak, 2012), and CERT's departing-insider pattern report (DTIC ADA585504: "many insiders who stole IP did so within 30 days of their termination"). Affinity 7 → 11.
- **HOLLOWKEY `credentialChain`** — six stages of the infostealer-to-intrusion pipeline: off-network infection → marketplace sale → validation + first login → MFA bypass (session-cookie replay; push fatigue) → in-session recon → monetisation. The teaching point is stage 4: MFA alone does not break this chain. Affinity 7 → 11.
- **Six ATT&CK techniques added** for the insider family: T1539 Steal Web Session Cookie, T1550.004 Web Session Cookie (use), T1621 MFA Request Generation, T1560 Archive Collected Data, T1052.001 Exfiltration over USB, T1567.002 Exfiltration to Cloud Storage. Catalog 68 → 74.
- **One chain renderer** — intro card and codex now render any actor's chain (`lolChain`, `aerospaceChain`, `insiderChain`, `credentialChain`) through a single path; codex entries for chained actors without a hand-written reference are generated from the data. Reference entries 9 → 12.
- **D3FEND is now real.** The boot banner has claimed "D3FEND ✓" since v0.6 while the catalog held zero D3FEND entries, and `counters:` text cited 19 D3- IDs of which only 6 were verifiable. New `D3FEND` catalog: 26 techniques, every ID and name verified against D3FEND 1.3.0 (Dec 2025) via the ATT&CK-mitigations mapping, grouped by the seven tactics. The 13 unverifiable IDs — including two that were simply invented (D3-IVV "Independent Variable Verification", D3-ITV "Internal Traffic Validation") — were replaced with verified IDs or plain language across 26 call sites. The codex renders the full attack→defense map, computed from counters so it cannot drift; all 26 techniques map to at least one attack technique in the catalog; techniques countering TTPs observed in the current run are highlighted.
- **DETECTIONS.md Plays 9 and 10** — the first protocol-centric plays. **Play 9, HL7/DICOM interface tampering**: grounded in the fact that HL7v2's MLLP transport "does not natively support any encryption or authentication" (Google Cloud Healthcare API docs) and HHS 405(d) Practice #8; inventory-driven transport-vs-message identity checks, clinical-plausibility value checks, patient-safety-first triage. **Play 10, VHF cab-signalling / trackside command anomalies**: RF half (spectrum monitoring joined to dispatcher log and transmitter inventory) and IT half (parameter writes without engineering sessions, T0871 API callers); Polish Aug 2023 pattern, EN 50159, TSA SD 1580/82-2022-01C, FRA 236 Subpart I.

### v0.9.6: Consequence-model back-port, five-for-five demos, self-description accuracy

Closes the debt the Oct 27 review found: the two oldest missions had never received the consequence model every later mission got, two missions had no instructor demo, and the game's own boot banner was lying about its contents.

- **BLACKFROST gets its anchors.** The flagship mission was the only one citing no real-world incident. It now carries the two best-documented ICS attacks on record: Ukraine Dec 2015 (E-ISAC/SANS analysis, 18 Mar 2016 — figures verified against the primary: ~225,000 customers, three oblenergos, breakers opened via the dispatchers' HMIs, serial-to-ethernet firmware "blowing the bridges," KillDisk, UPS reconfiguration, call-center telephony DoS) and Ukraine Dec 2016 (Dragos CRASHOVERRIDE / ESET Industroyer — native IEC 101 / 104 / 61850 / OPC DA modules; Dragos assessed it as closer to proof-of-concept than full capability). New codex entry with both sources.
- **BLACKFROST consequence model.** `sectorCascade` on CTRL (all four substations stressed — the 2015 pattern). `lifeSafetyNodes` SUB-B and SUB-D, now described in the map as critical-load feeders (medical center + water treatment; winter residential heating). Debrief cites NERC CIP-008 and the DOE OE-417 1-hour Emergency Alert for a cyber event interrupting operations (criterion 3 — verified against the form instructions). `loseThreshold` 5 → 4: still the on-ramp, no longer two nodes more forgiving than every other sector.
- **NIGHTWATCH consequence model.** `sectorCascade` on MCC → all three spacecraft stressed, with the KA-SAT ground-segment doctrine. Deliberately no life-safety node: an imagery constellation doesn't have one and the game doesn't invent one.
- **Instructor demos for HEARTLINE and RAILGUARD** — five for five. Both use TRIANGULATE for a deterministic C2 reveal and SEVER at round 6; verified headlessly to a clean WIN with zero compromises and zero life-safety events. HEARTLINE teaches EHR-first BULWARK, patient-connected-first priority, and the VPN-without-MFA entry; RAILGUARD teaches life-safety-first ordering, the Belarus dispatch lesson, and the Poland VHF lesson.
- **Boot banner and onboarding now compute from the registries** — "8 archetypes / 5 operations / 5 walkthroughs" can never drift again (it had said 7 / 3 / 3 for two releases). Onboarding card lists all eight archetypes.
- **EN 50159 "Category 3" softened** — the category definitions could not be primary-verified in session; the claim now cites only what BSI confirms (standard designation, title, cryptographic techniques among its defence methods) and notes the 2025-11 revision draft.
- **README roadmap rewritten** — four shipped items removed; the stale "Pacific NW / Taiwan" rail anchors (both rejected by the v0.9.5 audit) gone.

### v0.9.5: SME hostile-audit remediation

A deep-dive SME fact-check audit (35 findings, 7 CRITICAL + 13 HIGH + 10 MEDIUM + 5 LOW) uncovered real sourcing errors that this release fixes. Every change is a factual correction against a primary source.

**SPARTA technique naming fixed** — the two most embarrassing errors. **LM-0001** was labeled "Lateral Movement" (the tactic name) when its real SPARTA name is **Hosted Payload**. **IMP-0005** was labeled "Denial" when its real SPARTA name is **Destruction** (IMP-0003 is Denial — swapped). Both renamed with corrected descriptions.

**USCG MARSEC Directive number corrected everywhere** — the Feb 2024 PRC-crane directive is **105-4** (89 FR 13726), not 105-6. Replaced across index.html, DETECTIONS.md, and README.md. Also noted the Nov 2024 reissuance as 105-5.

**ZPMC committee report date corrected** — the joint House Homeland Security + Select Committee on the CCP report dropped **16 Sep 2024**, not Feb 2024. (Feb 2024 was EO 14116 + MARSEC 105-4.)

**Port of Houston attribution removed** — the Aug 2021 incident was publicly described by CISA Director Easterly as a "nation-state actor" intrusion; **no primary source attributed it to Volt Typhoon**. Removed the Volt Typhoon claim; kept CVE-2021-40539 (Zoho ManageEngine ADSelfService Plus).

**Taiwan TRA 2022-2024 ransomware anchor removed** — no primary source matched the specific-incident claim. RAILGUARD now relies on Belarus Cyber-Partisans + Polish ABW anchors (both well-documented) plus generic CISA #StopRansomware rail-sector + APTA Cybersecurity Toolkit context for ransomware exposure.

**Mandiant M-Trends claims tightened** — M-Trends 2026 does NOT publish a "7-day median for ransomware"; that specific claim is removed. Kept the 14-day global median (verified). The "aerospace-sector incident analyses (2022-2026)" series was invented — Mandiant publishes one annual M-Trends with aerospace observations within; wording corrected throughout.

**Ponemon report title + metric corrected** — the report is "Cost of Insider **Risks**" (renamed 2023+), not "Cost of Insider Threats." The 81-day figure is time to **CONTAIN**, not detect. The 20% category is called **"outsmarted"** / credential theft in the real report, not "stolen-credential." The three-way split is approximately 55% negligent / 26% malicious / 20% outsmarted (closer than the previous 55/25/20 round numbers).

**FRA 49 CFR Part 236 subpart corrected** — the PTC cybersecurity requirements are in **Subpart I §236.1033** (Communications and security requirements), not Subpart H.

**TSA SD updated to current revision** — the current rail-cyber Security Directive is **1580/82-2022-01C** (01A was superseded).

**Change Healthcare statistics corrected** — PHI affected is **~190M** per UnitedHealth's Jan 2025 OCR update (was 100M; doubled after fuller forensic review). The $872M Q1 2024 impact is composed of **$593M direct response + $279M business disruption**, not pure direct response. Full-year 2024 impact exceeded $3B. The "~9-day dwell" is sourced to CEO Witty's May 2024 House E&C testimony, not CISA.

**NHS WannaCry statistics corrected** — "81 of 236 NHS Trusts" (was 80 — off by one per NAO), "603 more NHS organizations including 595 GP practices" (was imprecise).

**Maersk NotPetya scope wording corrected** — "operations disrupted across Maersk's 76-terminal global network" (was "76 terminals offline" — the real figure is 17 of 76 terminals directly affected but the operational blast radius was system-wide; Snabe WEF Davos 2018 quote cites 4,000 servers + 45,000 PCs + 2,500 applications re-imaged).

**Belarusian Cyber-Partisans claim de-overspecified** — Partisans publicly claimed encrypting "the bulk of BelZhD servers, databases, and workstations" with backup destruction, not specifically "dispatch servers" (the game had extrapolated). The sector-cascade *lesson* about dispatch-is-the-control-plane stays as doctrine, no longer attributed to a specific Partisan target.

**Named APT groups removed** — KillNet (index.html), Scattered Spider / UNC3944 + Storm-0501/Storm-0540 + DEV-0537/DEV-0193 (DETECTIONS.md) all removed per the game's archetype-not-attribution doctrine. (Volt Typhoon, AcidRain, ALPHV/BlackCat, NoName057(16), CyberAv3ngers remain where they appear in primary CISA/government advisories — they're the exception set.)

**Internal catalog consistency fixed** — 4 technique IDs that were referenced in actor affinity but had no catalog entry (**T1074 Data Staged**, **T1657 Financial Theft**, **T0803** legacy, **T0856** legacy) added with real ATT&CK descriptions. Catalog now 68 entries, zero undefined references.

**H-ISAC sourcing reweighted** — H-ISAC member-only post-incident briefings now cited as non-public sector-wide intel-sharing; publicly-locatable primaries (UnitedHealth earnings, HHS OCR, Senate Finance + House E&C testimony, CISA #StopRansomware ALPHV/BlackCat) carry the citation weight.

**"70-minute detonation window" number cut** — the game had conflated CrowdStrike breakout time (~62 min, lateral movement) with ransomware detonation window (different concept, no sourced number). Replaced with the qualitative "minutes-to-hours once detonation begins, not days" claim which is accurate and sourceable.

**FSW compromise claim softened** — "Mandiant and CrowdStrike have reported state-nexus actors staging capability" rewritten as "CSIS, SWF, and USSF reporting have described state-nexus concern over FSW-compromise-capability staging; specific public incident reporting is limited" — more honest about the primary-source landscape.

**Verizon DBIR 72% misdelivery softened** — specific figure removed; wording now "Miscellaneous Errors pattern dominant for non-malicious insider actions" per DBIR 2024/2025 published pattern analysis.

**ZPMC market share nuanced** — "approximately 80%" → "roughly 70-80%" per the Sep 2024 joint committee report.

All 24 corrections (CRITICAL + HIGH + attribution + internal consistency) ship in v0.9.5. The 10 MEDIUM items (further stylistic tightening) and 5 LOW items are deferred to v0.9.6 or later.

---

## Framework references and provenance

The game relies on public catalogues:

- **MITRE ATT&CK Enterprise** — Microsoft tactics/techniques, [attack.mitre.org](https://attack.mitre.org/)
- **MITRE ATT&CK for ICS v20** — [attack.mitre.org/matrices/ics](https://attack.mitre.org/matrices/ics/) — including proper handling of techniques revoked in v19 (T0855 → T1692.001, T0803 → T1691.001, T0856 → T1692.002), both IDs preserved as aliases in the codex
- **MITRE D3FEND 1.3.0** — [d3fend.mitre.org](https://d3fend.mitre.org/) — 26 defensive techniques as a structured catalog (verified IDs and names), grouped by the seven D3FEND tactics, with the attack→defense mapping computed from each attack technique's counters
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

Shipped from the original roadmap: OP. HEARTLINE (v0.9.3), OP. RAILGUARD (v0.9.4), save/resume (v0.8), seeded `?seed=…` replay URLs (v0.9.2), TIMELINE debrief (v0.9.4), instructor demos for all five missions (v0.9.6), D3FEND structured catalog + insider stage chains + protocol-centric detection plays (v0.9.7), SOURCES.md verification ledger + SOC-handoff ticket (v0.9.8), two-adversary mode (v0.10.0).

Open priorities:
- **Instructor demo for two-adversary mode** — a scripted walkthrough that teaches cluster-then-attribute on one mission.
- **Per-cluster ACH gate** — the gate currently adds the "other intrusion set" hypothesis as text; scoring each observed TTP against H1 and H2 side by side is the next analytic step.
- Sound (Web Audio, opt-in)

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

Current version: **v0.10.0** (October 2026) · BUILD `HUNT-20261027-1710Z`
