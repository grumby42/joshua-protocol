# Sources & Verification Ledger

> **Purpose.** Every real-world claim in Joshua Protocol — statistic, incident detail, advisory number, regulation, framework ID — is listed here with the primary source it rests on, what exactly was checked, and when. If a row says *not independently verified*, treat that claim with the appropriate scepticism; it is cited in good faith but has not been read against its primary in this project.
>
> **Verification standard.** A claim is *verified* only when a primary document (government advisory, standards body, the publishing organisation's own report or page, sworn testimony, court/regulatory filing) was read and the claim matched. Secondary press is noted where it corroborates but does not by itself verify. Figures that a primary does not give are **not stated** in the game.
>
> **Method.** The 17 Oct 2026 hostile audit (~85 claims, 35 findings, all CRITICAL/HIGH remediated in v0.9.5) established the baseline. Everything added since is verified in-session before it is written. Verifier column: *audit* = 17 Oct 2026 fact-check agent against primaries; *session* = read directly during the release that introduced the claim.

Legend — **V** verified against primary · **C** corroborated by secondary press only · **N** not independently verified (cited as published; re-check before relying on it)

---

## Frameworks & catalogs

| Claim in game | Primary source | What was checked | Status | Date |
|---|---|---|---|---|
| MITRE ATT&CK Enterprise technique IDs and names (all 46 Enterprise entries in the catalog) | attack.mitre.org technique pages | Each v0.9+ addition fetched by ID; name and tactic matched (T1557, T1200, T1657, T1491.001, T1565.001, T1531, T1692.001, T0845, T0885, T0871 read directly). Pre-v0.9 entries: names/tactics match ATT&CK as of audit. | V | 2026-10-17 |
| ATT&CK for ICS: T0855→T1692.001, T0803→T1691.001, T0856→T1692.002 (revoked IDs aliased to current) | attack.mitre.org/techniques/T1692/001/ | New IDs resolve; game carries both forms | V | 2026-10-17 |
| "ATT&CK for ICS v19 revoked / v20 current" version labels | — | Technique IDs verified; the *version-number labels* were not re-verified on 27 Oct (site off session allowlist). IDs are what matter; labels are secondary. | N | — |
| SPARTA IDs: REC-0001/0003/0005, EX-0010/0012/0014/0016.01, IA-0005, PER-0001, IMP-0002, IMP-0005 *Destruction*, LM-0001 *Hosted Payload* | sparta.aerospace.org (ST0007 tactic page); d3fend mirror of IA-0005, EX-0014; New Space Economy SPARTA matrix guide | Names matched. Audit found LM-0001 and IMP-0005 mislabeled; corrected v0.9.5. | V | 2026-10-17 |
| MITRE D3FEND 1.3.0 (Dec 2025); 26 defensive technique IDs and names; seven tactics | next.d3fend.mitre.org/mappings/attack-mitigations (57 IDs read); vectra.ai D3FEND overview (version, tactics) | Every D3FEND ID used in the game is on the verified list. 13 previously-cited IDs were unverifiable (two invented) and were replaced in v0.9.7. | V | 2026-10-27 |
| ATLAS: AML.T0020, AML.T0040, AML.T0043 | atlas.mitre.org | Names match the ATLAS matrix as of audit | V | 2026-10-17 |
| Purdue Enterprise Reference Architecture (Williams, 1992) referenced in ANSI/ISA-95; Purdue levels 0–5 + DMZ | ISA-95 / SANS ICS410 curriculum | Conceptual; level naming conventional | N | — |
| IEC 62443 zones & conduits, security levels | IEC 62443-3-2 / -3-3 | Conceptual reference only; not mechanised in game (README disclaims) | N | — |
| Cyber Kill Chain (Lockheed Martin 2011); NIST SP 800-61r2; Diamond Model (Caltagirone, Pendergast, Betz 2013); Pyramid of Pain (Bianco 2013); ACH (Heuer, CIA CSI 1999) | Original publications | Attribution of each framework to its author/year is standard and uncontested | N | — |

## Threat intelligence reports & statistics

| Claim in game | Primary source | What was checked | Status | Date |
|---|---|---|---|---|
| Mandiant M-Trends 2026: 14-day global median dwell (up from 11); ransomware prior-compromise rose from 15% to 30% of initial infection vectors; 22-second IAB handoff case | cloud.google.com/blog/topics/threat-intelligence/m-trends-2026; SecurityWeek coverage of the 22-second figure | Figures match. Audit found a "7-day ransomware median" that the report does **not** contain — removed v0.9.5. | V | 2026-10-17 |
| Ponemon Institute / DTEX *2025 Cost of Insider Risks Global Report* (6th ed.): 81-day average time to **contain**; $17.4M average annual cost; ~55% negligent / ~26% malicious / ~20% "outsmarted" | dtex.ai press release; ponemon.dtex.ai | Title (was "Insider Threats" — wrong), metric (was "detection" — wrong), category label (was "stolen credential" — wrong) all corrected v0.9.5 | V | 2026-10-17 |
| Rapid7 2025 Access Brokers Report: 71% of listings offer privileged access | investors.rapid7.com press release (Jul 2025) | Headline figure matches | V | 2026-10-17 |
| Huntress "What Are Initial Access Brokers"; Huntress 2025 Cyber Threat Report | huntress.com | Documents exist | V | 2026-10-17 |
| Recorded Future *2025 Identity Threat Landscape Report* | recordedfuture.com/blog/identity-trend-report-march-blog | Exact title confirmed | V | 2026-10-27 |
| Verizon DBIR 2025 — Miscellaneous Errors pattern dominant for non-malicious insider actions | verizon.com DBIR | Pattern exists; a previously-cited "72% misdelivery" figure could not be verified and was removed v0.9.5 | C | 2026-10-17 |
| Microsoft Threat Intelligence, "Volt Typhoon targets US critical infrastructure" (24 May 2023) | microsoft.com/security/blog | Title and date match | V | 2026-10-17 |
| Flare / SpyCloud / Hudson Rock infostealer-market reporting (sector-level) | Vendor sites | Cited generically as sector reporting; no specific figure claimed | N | — |
| CSIS Space Threat Assessment (annual); Secure World Foundation Global Counterspace Capabilities (annual); USSF Space Delta 15 briefings | csis.org; swfound.org | Series exist; cited as the sector's public concern reporting, no specific figure claimed. Audit removed an invented "Mandiant M-Trends aerospace-sector series". | C | 2026-10-17 |
| CrowdStrike GTR "breakout time" | — | Not cited in game (a conflated "70-minute detonation window" was removed v0.9.5) | — | — |

## Government advisories, regulations, standards

| Claim in game | Primary source | What was checked | Status | Date |
|---|---|---|---|---|
| CISA/NSA/FBI AA24-038A (Feb 2024), Volt Typhoon: LotL tool list; ESENT event IDs 216, 325, 326, 327, 637; netsh portproxy; Energy named as targeted sector | cisa.gov/news-events/cybersecurity-advisories/aa24-038a | Advisory read; artifacts match | V | 2026-10-17 |
| CISA AA23-335A, IRGC-affiliated CyberAv3ngers / Unitronics PLCs (Dec 2023) | cisa.gov/news-events/cybersecurity-advisories/aa23-335a | Advisory read; content matches | V | 2026-10-17 |
| Executive Order 14116 (21 Feb 2024) — maritime cybersecurity | govinfo.gov EO 14116 | Confirmed | V | 2026-10-17 |
| USCG MARSEC Directive **105-4** (21 Feb 2024, 89 FR 13726); reissued as 105-5 (Nov 2024) | Federal Register; industrialcyber.co | Audit found the game said "105-6" — corrected v0.9.5 | V | 2026-10-17 |
| House Homeland Security + Select Committee on the CCP joint investigation of ZPMC cranes — **16 Sep 2024**; ZPMC ~70–80% of US STS cranes | homeland.house.gov/2024/09/16/ | Audit found the game said "Feb 2024" — corrected v0.9.5 | V | 2026-10-17 |
| TSA Security Directive 1580/82-2022-01C (current; supersedes 01A) | tsa.gov SD PDFs | 01A and 01C both located; game updated to 01C | V | 2026-10-17 |
| FRA 49 CFR Part 236 **Subpart I** §236.1033 (PTC communications and security requirements) | ecfr.gov Part 236 | Audit found the game cited Subpart H (voluntary processor-based systems) — corrected v0.9.5 | V | 2026-10-17 |
| DOE Form OE-417: cyber event causing interruption of electrical system operations = 1-hour Emergency Alert (criterion 3); Reportable Cyber Security Incident = criterion 2 | doe417.pnnl.gov form instructions | Criteria text and time limits read | V | 2026-10-27 |
| NERC CIP-008 (Cyber Security Incident Reporting and Response Planning) | nerc.com | Standard exists; cited by name only | N | — |
| HHS 405(d) Health Industry Cybersecurity Practices: Practice #8 Network Management; Practice #4 crisis management | 405d.hhs.gov | Practice #8 confirmed by document; Practice #4 numbering not independently confirmed | V / N | 2026-10-17 |
| FDA Medical Device Cybersecurity guidance (2023); FD&C Act §524B (via PATCH Act provisions in FDORA 2022) | fda.gov | Cited by name; section number conventional | N | — |
| EN 50159:2010+A1:2020 *Railway applications — Communication, signalling and processing systems — Safety-related communication in transmission systems*; cryptographic techniques among its defence methods; 2025-11 revision draft in circulation | knowledge.bsigroup.com; vde-verlag.de (E DIN EN 50159:2025-11) | Designation, title, "cryptography" keyword confirmed. **Category 1/2/3 definitions could not be read** — the game no longer claims "Category 3" | V (scoped) | 2026-10-27 |
| HL7 v2 MLLP "does not natively support any encryption or authentication" | docs.cloud.google.com/healthcare-api/docs/concepts/hl7v2 | Quoted verbatim | V | 2026-10-27 |
| APTA Cybersecurity Toolkit; CISA #StopRansomware rail-sector advisories; Surface Transportation ISAC | apta.com; cisa.gov | Cited generically as sector context after the audit removed a specific unsupported Taiwan rail anchor | N | — |
| SEI/CERT *Common Sense Guide to Mitigating Insider Threats*, 7th ed. (7 Sep 2022), 22 best practices | sei.cmu.edu library page | Title, edition, date, practice count confirmed | V | 2026-10-27 |
| CERT, *A Pattern for Increased Monitoring for Intellectual Property Theft by Departing Insiders* — "many insiders who stole IP did so within 30 days of their termination" | apps.dtic.mil ADA585504 | Quoted verbatim; **no percentage claimed** (the primary gives none) | V | 2026-10-27 |
| Cappelli, Moore, Trzeciak, *The CERT Guide to Insider Threats* (Addison-Wesley 2012) — IT sabotage / theft of IP / fraud models | informit.com | Book exists; model taxonomy is its central content | N | — |

## Incidents

| Claim in game | Primary source | What was checked | Status | Date |
|---|---|---|---|---|
| **Ukraine 23 Dec 2015**: three oblenergos within ~30 min; ~225,000 customers; Kyivoblenergo 7×110 kV + 23×35 kV substations out 3 h; BlackEnergy 3 via macro spear-phishing; ICS VPNs lacked 2FA; breakers opened via dispatchers' HMIs; KillDisk; serial-to-ethernet firmware corruption; UPS reconfiguration; call-center telephony DoS; "malware did not cause the outage" | E-ISAC/SANS, *Analysis of the Cyber Attack on the Ukrainian Power Grid* (18 Mar 2016), via nsarchive.gwu.edu | Every figure read from the report with page refs | V | 2026-10-27 |
| **Ukraine 17 Dec 2016**: single transmission-level substation in Kyiv; "first ever malware framework designed and deployed to attack electric grids"; IEC 101/104/61850/OPC DA modules; closer to proof-of-concept than full capability | Dragos, *CRASHOVERRIDE* (Jun 2017), via nsarchive.gwu.edu; ESET Industroyer | Quotes read. **No outage duration claimed** (Dragos gives none); substation name not claimed (Dragos does not name it) | V | 2026-10-27 |
| **ViaSat KA-SAT, 24 Feb 2022**: AcidRain wiper; tens of thousands of modems across Europe; ~5,800 Enercon wind turbines in Germany lost remote management; ~2 months recovery | CISA/FBI advisory; Enercon / ViaSat statements; SentinelLabs AcidRain analysis; multiple corroborating outlets | Figures corroborated across sources | V | 2026-10-17 |
| **Port of Houston, Aug 2021**: CVE-2021-40539 (Zoho ManageEngine ADSelfService Plus); described by CISA Director Easterly as a "nation-state actor" | Senate HSGAC hearing (Sep 2021); porttechnology.org | Audit found the game attributed it to Volt Typhoon — **no primary supports that**; removed v0.9.5 | V | 2026-10-17 |
| **Maersk NotPetya, Jun 2017**: $300M loss; operations disrupted across the 76-terminal network; 10-day recovery; 4,000 servers + 45,000 PCs + 2,500 applications re-imaged | Maersk Q2/Q3 2017 results; Jim Hagemann Snabe, WEF Davos Jan 2018 | "76 terminals offline" wording corrected v0.9.5 (17 of 76 directly affected; disruption system-wide) | V | 2026-10-17 |
| **NHS WannaCry, 12–13 May 2017**: at least 81 of 236 trusts; 603 more NHS organisations incl. 595 GP practices; ~19,000 appointments cancelled; £92M (DHSC Oct 2018 review) | UK NAO, *Investigation: WannaCry cyber attack and the NHS* (Oct 2017); DHSC lessons-learned (Oct 2018) | Audit found "80 trusts" — corrected to 81 | V | 2026-10-17 |
| **Change Healthcare, 21 Feb 2024**: ALPHV/BlackCat; Citrix gateway without MFA; ~9 days access-to-detonation; $872M Q1 2024 impact = $593M direct response + $279M business disruption; full-year 2024 > $3B; ~190M individuals (Jan 2025 OCR update) | UnitedHealth Q1–Q4 2024 earnings; CEO Witty testimony to Senate Finance and House Energy & Commerce (1 May 2024); HHS OCR breach portal | Audit corrected: 100M → 190M; $872M composition; 9-day figure re-sourced from CISA to Witty testimony | V | 2026-10-17 |
| **Belarusian Cyber-Partisans / BelZhD, Jan 2022**: encrypted the bulk of BelZhD servers, databases and workstations; destroyed backups; ticketing/scheduling/freight disrupted; security/emergency systems avoided; during Russian force transit | Partisans public statements; TheWarZone; BankInfoSecurity; Reuters | Audit found "dispatch servers" was the game's over-specification — corrected v0.9.5 | C | 2026-10-17 |
| **Polish rail radio-stop incidents, Aug 2023**: approximately 20 trains halted (passenger and freight) by unauthorised VHF stop commands; ABW characterised as sabotage; two arrests | Polish ABW statements; TheRecord; Euronews; CERT Polska | "20+ … freight railways" softened to "~20 trains, passenger and freight" v0.9.5 | C | 2026-10-17 |
| **Europol Operation Eastwood, Jul 2025** — NoName057(16) / DDOSIA takedown | Europol press release; SecurityAffairs | Operation and date confirmed | V | 2026-10-17 |
| **Black Sea / Eastern Mediterranean GPS spoofing (2017–)**; Russia–Ukraine theatre GPS/Starlink/Iridium jamming | Multiple public maritime-safety and OSINT reports | Pattern-level claims only; no figures stated | C | 2026-10-17 |
| ~~Taiwan TRA 2022–2024 ransomware~~ | — | **Removed v0.9.5** — no primary source found for a specific incident | — | — |

---

## How to add a claim

1. Find the primary. If the only source is secondary press, mark **C** and do not state figures the primary does not give.
2. Read the primary; quote it in the commit message with page/section.
3. Add the row here with the date and the exact thing checked.
4. If it is a framework ID, resolve it on the publisher's site before using it. Do not infer IDs from naming patterns — that is how D3-IVV and D3-ITV were invented.

*Ledger created for v0.9.8; current build v0.9.9 — BUILD HUNT-20261027-1658Z. Maintained alongside README.md and DETECTIONS.md.*
