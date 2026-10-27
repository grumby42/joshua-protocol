# Detection Engineering Appendix — think it, don't paste it

> **Scope.** One starter detection *play* per threat actor archetype in the Joshua Protocol game (Plays 1–8), plus two protocol-centric plays (9–10) for exposures that belong to the wire rather than to any actor. The game teaches *decisions under tempo*; this appendix teaches *the detection work that would catch the tradecraft the game models.* Reusable playbook units in the sense of Bollinger, Enright & Valites, *Crafting the InfoSec Playbook* (O'Reilly) and Don Murdoch, *Blue Team Handbook: SOC, SIEM, and Threat Hunting Use Cases*.
>
> **Each play has seven fields.** Fill all seven when you adapt one for your environment:
>
> 1. **Objective** — the attacker behavior this catches, and why it matters.
> 2. **Hypothesis** — the testable statement ("a NON-X does Y").
> 3. **Data source** — the exact log/table that proves or refutes it.
> 4. **Logic** — the query/rule as pseudocode (a starting point, not a drop-in).
> 5. **Known false positives** — what legitimately looks like this.
> 6. **Response / triage** — what the analyst does on a hit.
> 7. **Maintenance & trend** — how to baseline, tune, and read the trend signals.

> **Not drop-in rules.** These are starting moves. You own the field names, the operators, the path exclusions, and the thresholds — because those are specific to *your* SIEM/EDR schema, *your* environment, and *your* normal.

> **No real IOCs anywhere.** All in-game indicators are synthetic placeholders. Point learners to the cited primary sources for real IOCs.

> **How to read each play**
> - **Behavior** — what the attacker actually does, and why it's detectable.
> - **Starter logic** — tool-agnostic pseudocode. Map the fields yourself.
> - **Real anchors** — published rules/sources to compare against (attributed).
> - **Evolve it** — climb the Pyramid of Pain so the detection survives attacker tool changes.
> - **Tune & baseline** — how to cut false positives with *your* data, not a guess.
> - **Watch the trend** — spike / drop-off / first-seen / beacon.
> - **Pivot to** — the adjacent data/patterns you check next.

> **Fact-check rigor bar.** Every technique ID below is verified against live MITRE ATT&CK (Enterprise or ICS v20). Volt Typhoon artifacts are verified against the joint CISA/NSA/FBI advisory [AA24-038A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-038a). CyberAv3ngers / Unitronics patterns are from [AA23-335A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-335a). Ransomware dwell-time figures are from Mandiant M-Trends 2026 (14-day global median); double-extortion and ~9-day access-to-detonation figures for Change Healthcare are from UnitedHealth CEO Andrew Witty's May 2024 House Energy & Commerce testimony. Insider statistics are from the Ponemon Institute / DTEX Systems *2025 Cost of Insider Risks Global Report* (6th edition) — 81-day average time to CONTAIN an insider incident; approximately 55% negligent / 26% malicious / 20% "outsmarted" (credential theft) split. Initial-Access-Broker model is from Mandiant M-Trends 2026 (handoff timing) and Huntress/Rapid7 2025 reporting. ICS v19 revoked IDs (T0855 → T1692.001, T0803 → T1691.001, T0856 → T1692.002) are presented with both forms for operator familiarity. Where a canonical public rule exists, it is cited; where one doesn't (hunt built from your own baseline), that is said plainly.

> **Format convention.** Pseudocode uses `source:` and `where:` / `project:` keywords in the spirit of KQL/SPL/EQL without binding to one. Replace with your schema's equivalents.

---

## Play 1 · CRYO — Ransomware (slow-dwell reconnaissance → fast-impact double extortion)

### Objective
Catch modern RaaS operations during their **reconnaissance and staging dwell window** — before T1657 Financial Theft (exfil) and T1486 Data Encrypted for Impact / T1490 Inhibit System Recovery fire. Mandiant M-Trends 2026 reports a **14-day global median dwell time** (up from 11 days in 2025); the Change Healthcare 2024 incident operated with ~9 days of access-to-detonation (per UnitedHealth CEO Andrew Witty's May 2024 House Energy & Commerce testimony), backup destruction before encryption, and double-extortion (exfil before encrypt). Rapid-encryption detections are the last-chance net — the real catch window is during the quiet recon/staging phase.

### Hypothesis
A non-admin user credential (via T1566.001, T1190, or T1133) is followed over the next 1-14 days by: (a) credential-material access on the host (T1003.001 LSASS access) OR (b) outbound beacon pattern to never-before-seen infrastructure OR (c) first-seen SMB admin-share lateral movement from a workstation to a server, before any destructive activity. Each individual signal has noise; the sequence inside a 14-day window on a credential that didn't previously generate it is the catch.

### Data source
EDR process-tree telemetry (Sysmon event ID 1 with parent, hash, user; equivalent fields in CrowdStrike / Defender for Endpoint / Elastic). LSASS-access EDR events (Sysmon event 10). SMB-session audit on file servers (Windows event 5140, 5145). DNS/proxy logs. Volume Shadow Copy service logs (Windows event 8193-8225) and backup-system audit logs (Veeam, Rubrik, Commvault admin events) for the pre-encryption backup-destruction phase.

### Starter logic (sequence hunt, 14-day sliding window)
```
// Phase A — foothold candidates (any one of)
source: edr_process_create
where: parent_image in ("outlook.exe", "winword.exe", "excel.exe", "teams.exe", "chrome.exe", "msedge.exe", "firefox.exe")
  and image_name in ("powershell.exe", "wscript.exe", "cscript.exe", "mshta.exe", "rundll32.exe", "regsvr32.exe")
  and user_sid not in (known_admin_sids)
let: footholds = (user, host, time) tuples

// Phase B — within 14d of a foothold, same host/user shows ANY of:
source: edr_lsass_access | edr_process_create | smb_session_audit | proxy_dns
where (ANY):
  // credential dumping
  (edr_lsass_access and target_process = "lsass.exe" and access_mask includes PROCESS_VM_READ and image not in (allowed_edr_av))
  // first-seen SMB admin-share from a workstation
  or (smb_session.share in ("ADMIN$", "C$", "IPC$") and smb_session.client_host in workstations
      and (smb_session.client_host, smb_session.target_host) not in historical_pairs(90d))
  // beacon pattern to young infrastructure
  or (proxy_dns.domain first_seen within 7d and proxy_dns.pattern = beacon(interval_ms, jitter))

// Phase C — pre-impact tells (fire LOUD when seen on a host with Phase A+B)
source: windows_event
where: (event_id = 1102 and provider = "Microsoft-Windows-Eventlog")  // security log cleared (T1070.001)
    or (process = "vssadmin.exe" and command_line regex "delete\\s+shadows")  // T1490
    or (backup_system.action = "repository_deleted" and principal not in approved_backup_admins)  // backup destruction
project: user, host, time, phase, signal
```

### Known false positives
- IT engineering teams scripting against user mailboxes (Outlook → PowerShell for shared-mailbox automation)
- Legitimate EDR/AV accessing LSASS (allowlist by signer + path)
- Backup software legitimately deleting old restore points (should be a service account from a scheduled job)
- First-seen SMB admin pairs during legitimate server-provisioning / IT project work (should correlate with change tickets)
- IT red teams running scheduled sweeps (scope out)

### Response / triage
1. **If Phase A alone**: isolate the user host, confirm the lure, hunt forward 14 days on the user's account. **This is the real catch window.**
2. **If Phase A + Phase B**: assume active intrusion in staging. Rotate credentials for the user and any accounts seen on the lateral-movement path. Pull EDR for the full process tree on every host that saw lateral SMB. Expect data exfiltration to be in progress (double-extortion) — check egress volume on recently-touched file servers and watch for cloud-storage uploads (rclone, MEGA, dropbox-cli).
3. **If Phase C fires**: encryption is imminent. Trigger major-incident playbook now. Backup-destruction before encryption is the ransomware signature — if your backup repository just lost admin credentials, you have 1-4 hours. Isolate the environment at the network boundary. Preserve forensic images.
4. **Hand-off**: IR tier-2 with the full 14-day timeline, every credential touched, every destination host, and the data-exfil footprint for breach-counsel / notification scoping.

### Maintenance & trend
- **Baseline**: 90 days of normal SMB admin-share pairs per workstation, LSASS-access per host, and backup-admin actions per account. The 14-day sequence window is the TTL; expire footholds past that.
- **Tune**: add `path exclude` for internal IT automation; allowlist EDR/AV LSASS access by signer; allowlist your backup system's service account by host + schedule.
- **Trends to watch**:
  - **Phase A spike** → active phishing or edge-exploit campaign landing in your org.
  - **Phase A → B hit rate climbing** → the dwell window is shrinking faster than your detection cadence. Add more Phase B signals.
  - **Phase C fires without Phase A/B history** → either operator missed earlier phases (go hunt backwards) or you have a new initial-access vector you don't yet detect.
  - **Backup-system admin-event spike without a change ticket** → treat as very high. This is the pre-encryption signature.

### Real anchors
- **Mandiant M-Trends 2026** — 14-day global median dwell time (up from 11 in 2025); ransomware prior-compromise rose from 15% to 30% of initial infection vectors
- **CISA Alert on Change Healthcare / ALPHV-BlackCat (2024)** — ~9-day dwell, backup destruction, double extortion
- CISA #StopRansomware guides (LockBit, Royal, Play, ALPHV, Qilin, Akira)
- MITRE ATT&CK T1486 Data Encrypted for Impact, T1490 Inhibit System Recovery, T1657 Financial Theft, T1070.001 Clear Windows Event Logs
- Sigma: SigmaHQ `windows/process_creation/proc_creation_win_vssadmin_shadowcopy_delete.yml`, `proc_creation_win_wevtutil_log_clear.yml`
- Elastic Detection Rules `endpoint/credential_access_lsass_memdump_file_created.toml`

### Evolve it (Pyramid of Pain)
- *Easy*: block known encoded-PS flags, block known ransomware binaries by hash. Operators rotate hashes per victim and use LOLBAS.
- *Harder*: hash-match the loader, allowlist LSASS-accessors by signer. Operators sign malware with stolen certs; LotL evades hash matching entirely.
- *Toughest*: the three-phase behavioral chain above — foothold → credential-material + lateral + beacon → log-clear / shadow-delete / backup-destruction. Operators have to redesign *the business model* (not just tools) to evade a sequence detection on this timescale.

### Pivot to
- The lure email's `Message-ID` + sender infrastructure (Phase A)
- NTDS.dit pulls from any DC in the next 24 hours — a DC compromise with credential-dumping precedes most whole-domain encryption events (Phase B escalation)
- Egress volume from file servers touched during Phase B — this is the double-extortion exfil signature. Watch for rclone/MEGA/Dropbox-cli/pscp on the involved hosts.
- Any `vssadmin delete shadows`, `wmic shadowcopy delete`, `wevtutil cl` across the fleet in a 2-hour window — these are the "impact imminent" markers.

---

## Play 2 · KINGFISHER — Nation-state aerospace APT; adaptive pivoting

### Objective
Detect long-dwell adversary who deliberately avoids noise but *moves laterally when disrupted*. The signature is low-frequency, high-reuse credential-based lateral movement to high-value aerospace ground-segment assets, combined with the pivot behavior that fires after you break one of their footholds.

### Hypothesis
After a credential reset or EDR response action on a host, authenticated sessions appear within 2-6 hours on a different host that shares the same user-group or service-account path, originating from an internal source that did not previously authenticate to the target.

### Data source
Windows Security Event 4624 (successful logon) with LogonType correlation (10 = RemoteInteractive, 3 = Network, 2 = Interactive); Linux `sshd` success logs; identity provider logs (Azure AD / Okta). EDR response action timeline from your SOAR or EDR console.

### Starter logic
```
source: windows_event_security
where: event_id = 4624
  and logon_type in (3, 10)
  and target_user_name in (same_group_as(prior_response_target))
project: time, source_ip, source_host, target_host, user
join: edr_response_actions on target_host = response_target
where: this.time between response.time and response.time + 6h
project: incident_id, user, source_host, this.target_host as pivot_host
having: pivot_host not in historical_access_pattern(user, 90d)
```

### Known false positives
- Legitimate IR team doing their own lateral triage from a jump host after the response action
- IT running post-incident validation sweeps
- Scheduled tasks that happen to run after the response window
- A service account the responder didn't realize was in the same group

### Response / triage
1. **Immediate**: enumerate all hosts the pivoted user has touched in the last 24h.
2. **Within 30 min**: dump NTDS.dit access logs from the domain controller(s) that authenticated the pivot session.
3. **Hunt**: look for `netsh portproxy` persistence on the pivot host (a classic LotL-APT signature — see Play 7 VOLTFORGE for the Volt Typhoon chain reference).
4. **Escalate**: APT confirmation triggers your major-incident playbook — breach counsel, exec notification, TI vendor hand-off.

### Maintenance & trend
- **Baseline**: 90 days of "normal" user-to-host authentication patterns per user and per group.
- **Tune**: expand the baseline window during known-maintenance periods; add group exclusions for IR / IT groups.
- **Trends to watch**:
  - **First-seen pivot** after a response action → almost always worth triage.
  - **Beacon** cadence between pivots → the actor has a scripted re-emergence loop.
  - **Drop-off** after a round of EDR hardening → either you broke them (unlikely for a committed APT) or they went deeper into LotL and your rule is now blind. Reinforce with the Volt-Typhoon-style detections below.

### Real anchors
- MITRE ATT&CK T1021 Remote Services + T1078 Valid Accounts
- SANS FOR572 lateral movement curriculum
- Mandiant M-Trends annual (lateral movement dwell times by sector)

### Evolve it
- *Easy*: alert on 4624 LogonType 10 to high-value hosts. APTs use type 3 (network) exclusively to avoid interactive-flag triggers.
- *Harder*: UEBA — "this user never touches this host; now they do."
- *Toughest*: behavioral chain — "response action on host A, within 6h a cross-group pivot to host B, within 24h credential dump on host C." That's a TTP-level detection the attacker has to redesign to evade.

### Pivot to
- Credential-dump telemetry on any pivot-target host (LSASS access, ESENT event IDs 216/325/326/327/637 per CISA AA24-038A)
- Any `netsh portproxy` registry writes
- SPARTA REC-0001 / REC-0003 if the pivot target is a ground-segment system (satellite ops) — gather spacecraft design or communications information often precedes operator spoofing

---

## Play 3 · IRONHAZE — Hacktivist (availability-focused DDoS + opportunistic exploit)

### Objective
Catch availability-impact hacktivism — the two 2024-2026 patterns: (1) **DDoS campaigns** per NoName057(16) / DDOSIA (T1498 Network Denial of Service, T1498.001 Direct Flood, T1498.002 Reflection Amplification, T1499 Endpoint DoS) and (2) **direct exploitation of exposed OT devices** per CISA Advisory AA23-335A (CyberAv3ngers Unitronics PLC campaign — default-credential-abused HMI/PLC used for defacement and water-system disruption). Both patterns are LOUD and FAST; the catch is at the edge, not deep in the network.

### Hypothesis (two parallel sub-hypotheses)
**(A) DDoS pattern.** Edge services receive volumetric or application-layer request floods from distributed/crowdsourced source infrastructure, often correlated with geopolitical events the actor has stated as a target rationale.
**(B) OT-direct pattern.** An internet-exposed OT device (Unitronics VisiLogic HMI, Modbus-TCP PLC, Siemens S7, BACnet) authenticates successfully with default or weak credentials (T1078.001 Default Accounts, T1110 Brute Force), is written to (T1565.001 Stored Data Manipulation), has its account access removed (T1531), or its screen defaced (T1491.001 Internal Defacement / IMP-0002 Device Restart/Shutdown).

### Data source
**For DDoS**: Edge load-balancer / CDN telemetry (Cloudflare, Akamai, Imperva), WAF access logs with per-second request rate aggregation, NetFlow/IPFIX from the perimeter, DNS-authority query rate (for reflection-DDoS targeting your DNS). **For OT-direct**: internet-exposure scanner results (internal Shodan-equivalent), OT device audit logs where available (Unitronics VisiLogic has event logs; most Modbus PLCs don't), Zeek with the `modbus`, `s7comm`, and `bacnet` parsers, firewall logs for inbound traffic to Purdue Levels 2-3.

### Starter logic — Sub-hypothesis A (DDoS)
```
source: edge_access_log | netflow
where: dest_asset in (public_facing_services)
summarize: req_rate = count() / 10s, src_distinct = count_distinct(source_ip)
  by: dest_asset, 10s_window
having: req_rate > p99(baseline(dest_asset, 30d)) * 10
     or src_distinct > p99(baseline(dest_asset, 30d)) * 10
join_optional: threat_intel on source_ip
where: ti.tag in ("ddosia", "noname057", "booter", "stresser")
project: dest_asset, 10s_window, req_rate, src_distinct, top_source_asns
```

### Starter logic — Sub-hypothesis B (OT-direct)
```
source: zeek_modbus | zeek_s7comm | ot_device_audit | firewall_inbound
where: dest_asset in (ot_devices)
  and (source_ip in external_networks or source_ip not in authorized_engineering_hosts)
  and (modbus.function_code in (05, 06, 15, 16)  // write-coil, write-register, write-multiple
       or s7comm.function in ("write_var", "download_block", "stop_plc", "run_plc")
       or ot_device_audit.action in ("default_credential_login", "config_write", "screen_defacement"))
project: time, dest_asset, source_ip, protocol, function_or_action
```

### Known false positives
- **DDoS**: CDN health probes, legitimate campaign launches (marketing, holiday rush), vulnerability-scanner nodes, backup/sync traffic hitting an API faster than usual, legitimate large-scale integrations
- **OT-direct**: engineering-workstation maintenance from an authorized source, vendor remote-support sessions (should match Play 6's allow-list), scheduled poll from HMI itself to its PLC
- Internal red team or scheduled DAST (allowlist by scope + schedule)

### Response / triage
1. **DDoS confirmed**: activate upstream scrubbing (CDN / provider DDoS-mitigation), apply rate-limits at the edge, geoblock the top source ASNs if business-tolerable. Expect bursts to repeat on symbolic dates — brief leadership on sector-wide campaign context (NoName057(16) regularly re-targets victims across weeks per Europol Operation Eastwood, July 2025).
2. **OT-direct confirmed (write / stop / defacement)**: isolate the OT device from the business network immediately. Verify physical process state out-of-band (talk to the operator, read the gauge, don't trust the HMI). Report to your sector ISAC and CISA — the CyberAv3ngers / Unitronics pattern is a declared national-security concern per AA23-335A.
3. **OT-direct confirmed (default-credential login, no writes yet)**: rotate credentials on the device and every like-model device in the estate NOW. Pull the device from internet exposure. Hunt for persistence (schedule, logic-block modifications).
4. **Both patterns in sequence**: possible cover-and-strike — the DDoS is distraction, the real goal is OT. Escalate per major-incident playbook.

### Maintenance & trend
- **Baseline**: 30d p99 of request rate per public endpoint; monthly internal exposure scan of OT ranges; weekly cross-check against Shodan / Censys for your own address space.
- **Tune (DDoS)**: distinguish seasonal legitimate spikes (sales events, product launches) from campaign spikes — the hacktivist pattern is also usually politically-motivated and announced in the actor's own channels before the attack.
- **Trends to watch**:
  - **DDoS spike correlated with a geopolitical event your org is tied to** → expect sustained campaign; mitigation posture is weeks, not hours.
  - **First-seen OT device internet-exposed** → your attack surface just grew. Patch the hole before scanning adversaries find it (hours to days).
  - **Default-credential login attempt on an OT device** → every like-model device in your estate is probably being tried. Rotate across the fleet.

### Real anchors
- **CISA AA23-335A**: "IRGC-Affiliated Cyber Actors Exploit PLCs in Multiple Sectors" (CyberAv3ngers / Unitronics Vision series, Nov 2023)
- **Europol / Eurojust Operation Eastwood, July 2025** — NoName057(16) DDoS infrastructure takedown; the DDOSIA crowdsourced-DDoS model
- CISA Fact Sheets on DDoS mitigation; US-CERT TA14-017A (reflection/amplification)
- MITRE ATT&CK T1498, T1498.001, T1498.002, T1499 (Enterprise); T0883 Internet Accessible Device, IMP-0002 Device Restart/Shutdown (ICS)
- Dragos "CyberAv3ngers" research briefings
- NIST SP 800-82r3 OT security guide

### Evolve it
- *Easy*: block source IPs. DDOSIA rotates volunteer hosts hourly; CyberAv3ngers rotates VPS infrastructure daily.
- *Harder*: block on JA3/JA4 TLS fingerprints or Modbus function-code patterns from unfamiliar sources.
- *Toughest*: behavioral — "request-rate deviation from p99 baseline from distributed low-reputation sources" (DDoS), or "any Modbus/S7 write from a source not in the engineering host inventory, ever" (OT). TTP-level — attacker has to redesign their attack to evade.

### Pivot to
- **DDoS**: upstream carrier DDoS reports; the actor's own public channels (claims of responsibility are typical for hacktivists) for next-target intel
- **OT-direct**: physical process verification; vendor advisory feeds for the specific device model; CISA ICS-CERT bulletin for the model-wide pattern
- Any downstream webshell or defacement artifact on compromised OT HMIs (file writes to `/vl_webserver/`, defaced splash screens with hacktivist branding)

---

## Play 4 · GHOSTWIRE — Malicious insider (long-dwell, authorized-but-abnormal)

### Objective
Detect **a trusted insider acting against the organization** — the ~26% of insider cases Ponemon 2025 attributes to deliberately malicious actors (as distinct from negligence at ~55% or "outsmarted" / credential-theft cases at ~20%; those get separate plays — negligence is a training/control gap, credential theft gets Play 8 HOLLOWKEY). Average time to **CONTAIN** an insider incident is **81 days** at an average per-case cost of **$17.4M** (Ponemon Institute / DTEX Systems *2025 Cost of Insider Risks Global Report*, 6th edition). Note: 81 days is containment end-to-end, not detection — detection is typically a smaller figure. The dwell is the point: the insider knows what will alert, what won't, and when their access is normal — so the signal is subtle divergence in behavior over weeks, not a single loud event.

### Hypothesis
An authorized user with privileged access to sensitive data or systems shows a **slow drift** across weeks — the user starts touching assets slightly outside their historical pattern, accesses them during slightly different hours, or at slightly higher volumes than their 90-day baseline — AND those touches concentrate on assets with high data-exfil or sabotage value, AND those touches occur in the vicinity (temporal, not causal) of HR adverse events (notice given, PIP, grievance, access review, denied promotion, team reorganization).

### Data source
UEBA platform (Splunk UBA, Microsoft Sentinel UEBA, Exabeam, Securonix) if deployed. If not: compose it — Windows 4624/4634, Azure AD sign-in logs, file-access audit logs on your crown-jewel data stores, PAM session recordings, DLP agent events, removable-media / cloud-upload events (Microsoft Purview, CASB), SCM (git) activity for source-code exfil scenarios, and the HR events table (termination notices, PIPs, access reviews, policy violations).

### Starter logic
```
// Phase A — slow drift over weeks (per-user, not single-event)
source: identity_signin_logs | file_access_audit | pam_session
summarize: per_week_metrics = { assets_touched, hours_distribution, volume_bytes, geo_distribution }
  by: user, week
where: user in watchlist(privileged_users) or user in watchlist(crown_jewel_access_holders)
  and (
    jaccard_distance(this_week.assets_touched, baseline_90d.assets_touched) > 0.3
    or kl_divergence(this_week.hours, baseline_90d.hours) > threshold
    or this_week.volume_bytes > p95(baseline_90d.volume_bytes)
  )

// Phase B — HR-event correlation (adverse events near the drift)
join_optional: hr_events on user, +/- 90d
where: hr_events.type in ("termination_notice", "pip_opened", "grievance_filed",
                          "access_review_denial", "policy_violation", "role_change_denied")

// Phase C — exfil-primitive signal (the drift started leaving the perimeter)
join_optional: dlp_events | cloud_upload_events | removable_media | git_bulk_clone
where: event occurs within +/- 30d of drift start on same user
project: user, drift_start_week, drift_signals, hr_signal, exfil_signal
```

### Known false positives
- Legitimate project pivot (new team, new access needs — HR has a role-change event; drift is bounded, not progressive)
- Audit / compliance year-end work (DBA pulling broad data to answer legitimate RFPs; HR has nothing adverse)
- A long overdue data-cleanup / archive sweep (should have a change ticket)
- Someone preparing a legitimate departure (giving two weeks' notice; grabbing their own files) — context matters

### Response / triage
1. **DO NOT alert the user.** Insider investigations are ruined by premature confrontation. Preserve forensic evidence silently. This is why the account is not locked at detection time.
2. **Within 1 business day**: engage insider-threat program (if your org has one), legal, HR, and the user's management chain — not the user. Confirm the HR event timeline matches the technical drift.
3. **Scope the exfil footprint** before any action: how much, which assets, which destinations (cloud, removable, personal webmail, print). This drives notification and civil-recovery decisions, which drive the HR and legal strategy.
4. **If exfil is confirmed and in-flight**: coordinated action — HR arranges a meeting that removes the user from a terminal while IT revokes credentials and recovers endpoint. Preserve device as evidence.
5. **If no exfil but drift + HR event + crown-jewel access**: tighten access, add to active watchlist, do not confront. Insider cases often take weeks of monitoring before resolution.

### Maintenance & trend
- **Baseline**: 90-day rolling per user for hours, countries, assets, volume. Longer baselines (6-12 months) for roles with legitimately low-frequency bursty access patterns (financial-close DBAs, auditors).
- **Tune**: weight by role (DBAs get wider volume tolerance; junior analysts get tighter); seasonal adjustment for fiscal-year-end patterns. Insider-threat lead reviews false-positive rate monthly.
- **Trends**:
  - **Drift of 2+ weeks concentrated on crown jewels** → treat as high even without an HR correlation; some insiders have no HR signal.
  - **HR adverse-event + any drift signal on a privileged user** → treat as medium; monitoring is appropriate response, not a lockdown.
  - **Multiple users drifting at once on the same crown-jewel set** → often not insider — more likely a shared compromise (pivot to Play 8 HOLLOWKEY or Play 2 KINGFISHER). Investigate before concluding insider.

### Real anchors
- **Ponemon Institute / DTEX Systems, *2025 Cost of Insider Risks Global Report* (6th edition)** — 81-day average time to CONTAIN an insider incident (down from 86 days in 2023), $17.4M average annual cost, approximately 55% negligent / 26% malicious / 20% "outsmarted" (credential theft) split
- CERT National Insider Threat Center (SEI/CMU) — the Insider Threat Database and Common Sense Guide
- NIST SP 800-53 PM-12 Insider Threat Program
- CISA Insider Threat Mitigation Guide
- MITRE ATT&CK T1078 Valid Accounts + sub-techniques (behavior is "legitimate account used illegitimately")

### Evolve it
- *Easy*: alert on off-hours access. The insider knows the window; they stay inside normal hours.
- *Harder*: baseline per-user-per-role access patterns. The insider stays inside the baseline until the actual exfil event — which is why the HR-event correlation matters.
- *Toughest*: behavioral chain — "slow drift over weeks on crown-jewel-adjacent assets + HR adverse event + exfil primitive". That's a kill-chain-complete detection the insider has to change their *motivation* to evade.

### Pivot to
- The user's recent HR events (manager interview, access review, PIP)
- The crown-jewel asset's audit log — what was accessed, in what order?
- Removable media / cloud storage upload events in the same session
- DNS queries from the user's workstation to personal webmail / file-sharing services
- SCM clone / download logs if source code is in scope

---

## Play 5 · WARDEN — Initial Access Broker (recon, foothold, sell, hand off)

### Objective
Detect the **initial access broker (IAB)** operating model as it actually runs in 2025-2026. Per Huntress and Rapid7 2025 reporting, IABs **don't deploy ransomware or run impact themselves** — they obtain footholds, enumerate the environment, package the access ("domain admin on X-sized network, $Y price"), post it on criminal forums, and hand off to a buyer. Mandiant M-Trends 2026 documents handoff timing measured in seconds in some cases (22-second broker-to-successor pivots observed). The signature is **recon without impact, followed by a tradecraft discontinuity** when the buyer takes over.

### Hypothesis
A single foothold (credential, host, service account) is followed by **enumeration-heavy, impact-light activity** — AD enumeration, port scanning, host inventory — over hours or days. The foothold then goes **quiet** for minutes to days. Activity resumes from the same foothold but with a **different behavioral signature**: different parent processes, different tool fingerprints, different working hours, often a different source geography. The second signature often matches a known successor archetype (ransomware operator, nation-state).

### Data source
Identity provider sign-in logs with source IP, user agent, authentication method. EDR process execution for sessions originating from each sign-in. AD-enumeration tool signatures (BloodHound/SharpHound, AdFind, net.exe reconnaissance patterns). PowerShell script-block logging for Invoke-ShareFinder, Invoke-UserHunter patterns.

### Starter logic
```
// Phase A — IAB recon fingerprint (enumeration without impact)
source: edr_process_create | ad_object_access | powershell_scriptblock
where: image_name in ("sharphound.exe", "adfind.exe", "nltest.exe") 
    or command_line regex "net\\s+(user|group|localgroup|accounts)\\s+/domain"
    or command_line regex "Get-Domain|Get-NetUser|Get-NetGroup|Invoke-ShareFinder"
    or ad_object_access.pattern = "bulk_group_enumeration"
let: iab_candidates = (host, user, time)
having: no_destructive_action(host, user, +72h)  // no T1486, T1490, T1657, T1565, T1491

// Phase B — handoff signature (same foothold, discontinuous tradecraft)
source: edr_process_create | identity_signin
where: (host, user) in iab_candidates
summarize: tradecraft_cluster = (parent_image_set, hourly_distribution, source_geo, tool_fingerprint)
  by: (host, user), rolling_6h
where: cluster_similarity(this_cluster, prior_cluster) < 0.3
    and time_gap(this_cluster, prior_cluster) between 1min and 7d
    and distinct_cluster_count >= 2
project: host, user, handoff_time, prior_cluster_signature, new_cluster_signature

// Phase C — successor-archetype classification (optional, for TI product)
join_optional: ti_catalog on new_cluster_signature
where: ti_catalog.actor_tag in ("ransomware_affiliate", "data_broker", "nation_state_handoff")
```

### Known false positives
- Legitimate pentest / red team (allowlist by scope + schedule)
- IT handoff between shifts using the same break-glass account
- Shared service accounts legitimately used by multiple teams (bad practice but exists)
- IR team coming in from a jump host after an incident (should match response-action timeline)
- Legitimate access enumeration during access reviews (should be ticketed)

### Response / triage
1. **If Phase A alone (recon fingerprint, no handoff yet)**: you have caught the IAB in the sell window. Lock the credential, isolate the host, rotate adjacent credentials — before the handoff fires. This is the highest-value catch.
2. **If Phase A + Phase B (handoff fired)**: assume **two attackers have been in your environment**. The access is sold. Treat the follow-on actor by their behavioral signature:
   - High-tempo credential dumping + lateral movement → likely ransomware affiliate; pivot to Play 1 response.
   - Patient LotL + ESENT activity on DCs → likely nation-state successor; pivot to Play 2 / Play 7.
   - Bulk data staging + egress → likely data-extortion-only buyer; focus on Play 1 Phase B exfil response.
3. **Scope the broker's foothold** regardless of successor: what else did the broker touch? What else did the broker have time to sell? Dark-web monitoring for the org domain in access-sale listings informs scoping.
4. **TI handoff**: the broker's advertisement text (if findable) + initial-access vector feed sector-ISAC and CISA sharing.

### Maintenance & trend
- **Baseline**: 60-90 days per account/host for the enumeration pattern; 60 days for the tradecraft-cluster feature set.
- **Tune**: broker tradecraft shifts; refresh enumeration-tool fingerprints quarterly from SigmaHQ.
- **Trends**:
  - **Spike** in Phase A detections across many accounts → active IAB campaign against your sector.
  - **Shortening gap between Phase A and Phase B** → brokers are selling faster (M-Trends 2026 trend: 22-second handoffs now observed). Your detection window is shrinking; invest in the Phase A catch.
  - **Successor archetype shifting** (same broker signature, different buyer type) → broker is diversifying their customer base; sector-wide intel-sharing is now higher-value.

### Real anchors
- **Mandiant M-Trends 2026** — IAB marketplace analytics, 22-second handoff cases, broker-to-ransomware pipeline
- **Huntress 2025 Cyber Threat Report**, **Rapid7 2025 Mid-Year Report** — IAB-as-separate-actor model, broker tradecraft catalog
- Microsoft Threat Intelligence profiles on access-broker clusters (cluster labels change over time)
- Flashpoint / Intel 471 broker-market intelligence
- MITRE ATT&CK T1078, T1555.003 (Browser Credential Theft — infostealer-sourced), T1046, T1082, T1087.001

### Evolve it
- *Easy*: alert on password-spray and 4625 failures. Brokers use infostealer-sourced valid credentials; no failures.
- *Harder*: fingerprint the buyer by post-foothold tool use. Buyers rotate tools.
- *Toughest*: behavioral — "enumeration-heavy no-impact session followed by same-foothold tradecraft discontinuity." Attackers have to change the two-stage business model to evade.

### Pivot to
- The initial-access vector that let the broker in (often Play 3 Sub-A edge exploit or infostealer-sourced credentials from Play 8)
- Dark-web monitoring for your org's domain in access-sale listings
- The successor's play — most Play-5 detections pivot into another play within hours of the handoff

---

## Play 6 · TIDEMARK — Supply-chain / trusted vendor remote access + ZPMC cellular-modem signature

### Objective
Catch adversary presence that enters through a trusted-vendor remote-access channel (vendor VPN, LogMeIn, TeamViewer, vendor-managed jump host) OR through a cellular modem embedded in vendor-manufactured OT equipment (ZPMC-pattern per the 2024 U.S. House Select Committee on CCP report). The vendor-remote-access entry point is authorized; the activity after it isn't. The cellular-modem channel is a different problem — the enterprise firewall never sees it. **Two parallel sub-plays below.**

### Hypothesis
A session originating from a vendor-access channel reaches assets outside the vendor's documented support scope, or executes commands outside the vendor's documented maintenance patterns.

### Data source
VPN concentrator / zero-trust access gateway logs (Zscaler, Cloudflare Access, Tailscale). Jump host session recordings (PAM — CyberArk, BeyondTrust). ICS network telemetry (Zeek with Modbus/DNP3 parsers for cellular-modem crane patterns). Vendor SLA / support-scope documentation as ground-truth reference.

### Starter logic
```
source: vendor_access_logs
join: vendor_support_scope on vendor_id
where: destination_asset not in vendor_support_scope.allowed_assets
   or command_executed not matches vendor_support_scope.allowed_patterns
   or session_duration > p99(vendor_support_scope.historical_duration)
project: time, vendor_id, user, destination, command, deviation_type
```

Supplement for ICS/OT with Zeek Modbus (adapted from Zeek `modbus.log`):
```
source: zeek_modbus
where: function_code in (05, 06, 15, 16)  // Write Single Coil, Write Single Register, Write Multiple Coils, Write Multiple Registers
  and source_ip in (vendor_cellular_modem_range)
  and dest_asset in (crown_jewel_plcs)
having: time outside documented_maintenance_window
```

### Known false positives
- Legitimate emergency maintenance outside normal windows (should have an incident ticket)
- Vendor technician performing out-of-scope work with verbal authorization (process gap, not malicious)
- Vendor's own backend monitoring that polls PLCs
- Documentation drift — scope doc out of date

### Response / triage
1. **Immediate**: contact the vendor. Is a technician currently connected? Who authorized this session?
2. **If no vendor acknowledgment**: this is a supply-chain compromise. Disable the vendor-access channel. Isolate the destination asset.
3. **For ICS Modbus writes outside maintenance window**: assume unauthorized command. Trip to safe state via out-of-band path if possible.
4. **TI product**: supply-chain compromise indicators go to CISA JCDC, your sector ISAC (E-ISAC for electric, Maritime-ISAC for ports), and ICS-CERT.

### Maintenance & trend
- **Baseline**: establish vendor-support-scope ground truth with the vendor contract. Refresh quarterly.
- **Tune**: separate detection rule per vendor; shared template.
- **Trends**:
  - **First-seen** destination asset for a vendor → either legitimate scope expansion (update doc) or scope creep that's a compromise precursor.
  - **Spike** in vendor-access-channel sessions → either patch deployment underway or compromise. Correlate with vendor patch calendar.
  - **Beacon** pattern on cellular modem traffic from a crane / substation / medical device → implant installed at the vendor-firmware layer. Treat as the ZPMC pattern.

### Real anchors
- CISA Alert AA24-182A (SolarWinds — the archetypal supply-chain compromise)
- U.S. House Select Committee on CCP report on ZPMC port cranes (2024)
- MITRE ATT&CK T1195 Supply Chain Compromise
- ICS-CERT advisories on PLC remote-access vulnerabilities

### Evolve it
- *Easy*: block the vendor channel after hours. Supply-chain adversary uses in-hours access.
- *Harder*: enforce vendor-scope allow-lists at the network layer, not just the audit layer.
- *Toughest*: behavioral — "vendor session executes commands outside the documented pattern on a crown-jewel asset." The attacker has to compromise the vendor's own tooling AND match their behavioral signature to evade.

### Pivot to
- The vendor's own IR team (they may already know they're compromised)
- Other customers of the same vendor via your ISAC
- Any ICS/OT equipment of the same vendor make/model elsewhere in your estate (common foothold)

### Sub-play 6B — ZPMC cellular-modem out-of-band C2

### Objective
Catch an adversary using a cellular modem embedded in vendor-manufactured OT equipment (classically ZPMC STS cranes) for out-of-band command-and-control that bypasses the enterprise firewall. Enterprise NetFlow does not see this traffic; carrier-level visibility is the only path.

### Hypothesis
A piece of vendor-manufactured OT equipment contains a cellular radio (SIM) not documented in the equipment purchase contract or system engineering drawings. The radio periodically contacts a carrier network, or receives inbound traffic-signaling events (T1205), from infrastructure not matched to any legitimate maintenance program.

### Data source
Carrier-provided SIM activity reports (billing records, data-session logs — your carrier contract may require you to request these explicitly, or you may need law-enforcement partnership). Physical cellular-radio inventory of OT equipment (RF survey, FCC equipment ID lookup, physical teardown during maintenance). Vendor contract and system-engineering drawings as ground truth for which radios SHOULD exist. OT-equipment procurement records for all PLC / HMI / crane / substation hardware.

### Starter logic
This is primarily a *procurement + physical audit* detection; secondarily a carrier-metadata hunt. The "logic" is a checklist, not pseudocode:

```
# Inventory baseline — document the ground truth
for each piece of vendor-manufactured OT equipment in the estate:
  - record manufacturer, model, serial, install date
  - record vendor contract and whether cellular radios are specified
  - record ALL radios present (RF survey + FCC ID + physical inspection)
  - record any SIMs installed and their carrier/MSISDN

# Carrier-metadata hunt — once a quarter at minimum
for each enterprise-contracted SIM:
  - pull carrier data-session log (data volume per day, destination IPs/ASNs)
  - correlate with documented maintenance program (what SHOULD this SIM talk to?)
  - flag: data sessions outside maintenance windows
  - flag: destinations outside the vendor's documented support infrastructure
  - flag: inbound signaling patterns (T1205) — the SIM receives traffic without initiating

# Procurement exception hunt
for each OT equipment arrival or firmware update:
  - compare physical radio inventory before/after
  - any new radio = out-of-contract hardware addition
```

### Known false positives
- Legitimate vendor cellular telemetry contractually specified (should match vendor contract and support-scope documentation)
- Carrier-side maintenance (DNS re-pointing, provisioning updates — the carrier should notify you)
- Legitimate 4G/5G backup links in network design (should be documented in network architecture)
- RF survey picking up adjacent cellular equipment not actually inside your gear (common in multi-tenant environments)

### Response / triage
1. **Confirmed undocumented radio**: physical isolation first — disconnect the radio or power the equipment down if operationally feasible. Document everything (serial, MSISDN, physical location, carrier). Preserve chain of custody. Report to USCG (maritime), CISA, and your sector ISAC — this is a national-security concern under USCG MARSEC Directive 105-4 (21 Feb 2024, 89 FR 13726) and EO 14116.
2. **Confirmed anomalous carrier traffic on a documented SIM**: contact the carrier for session metadata. If the destinations suggest state-adversary infrastructure, escalate immediately per major-incident playbook; this is beyond enterprise-only response.
3. **Compliance posture**: for STS cranes specifically, verify USCG MARSEC Directive 105-4 posture (reissued as MARSEC 105-5 in Nov 2024). For other PRC-manufactured OT equipment, apply the same logic — Executive Order 14116 (Feb 2024) authorized USCG to directly regulate maritime cybersecurity.
4. **TI product**: physical and procurement evidence feeds strategic reporting on supply-chain compromise patterns at sector level.

### Maintenance & trend
- **Baseline**: annual physical radio inventory per OT asset. Quarterly carrier-SIM reconciliation against contracted-SIM list.
- **Tune**: your carrier contract may not give you data-session visibility by default; renegotiate. Some carriers offer "enterprise SIM visibility" products.
- **Trends to watch**:
  - **Discovery of a single undocumented radio** → verify against contract; it may be legitimate undocumented support capacity (bad hygiene, not malicious) OR adversary capability. Scope matters.
  - **Pattern across multiple assets of the same vendor** → sector-wide concern. Share immediately via ISAC.
  - **Carrier reports inbound signaling** (T1205) to one of your SIMs with no outbound initiation history → covert-channel activation attempt. High urgency.

### Real anchors
- **U.S. House Committee on Homeland Security + Select Committee on the CCP joint investigation on ZPMC STS cranes (16 Sep 2024, homeland.house.gov)**
- **USCG MARSEC Directive 105-4** (21 Feb 2024, 89 FR 13726) — cybersecurity requirements for PRC-manufactured STS cranes at U.S. ports (reissued as MARSEC 105-5, Nov 2024)
- **Executive Order 14116** (Feb 2024) — USCG authority over maritime cybersecurity
- CISA / USCG joint maritime cybersecurity briefings (2023-2025)
- MITRE ATT&CK T1205 Traffic Signaling, T1571 Non-Standard Port, T1573 Encrypted Channel
- MITRE ATT&CK for ICS T0885 Commonly Used Port, T0845 Program Upload

### Evolve it
- *Easy*: enterprise NetFlow + firewall log analysis. Covert cellular channel never crosses the firewall — this control is blind to it.
- *Harder*: Carrier-provided SIM-activity reports. Still misses radio presence if the SIM is dormant.
- *Toughest*: Physical radio inventory + procurement verification + carrier-side anomaly detection. This is a *supply-chain assurance program*, not a SOC detection — and that is the only configuration that catches this pattern reliably.

### Pivot to
- Vendor-contract audit: what radios were procured, what maintenance program activates them, who authorized install?
- Sector ISAC: are other operators of the same equipment seeing the same pattern?
- Procurement future-state: contract language and acceptance-test procedures that enumerate ALL radios before equipment goes live

---

## Play 7 · VOLTFORGE — Pre-positioning / living-off-the-land

### Objective
Detect the Volt Typhoon pattern per [CISA/NSA/FBI advisory AA24-038A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-038a). The adversary uses the operators' own tools (vssadmin, ntdsutil, wmic, PowerShell, netsh, certutil, wevtutil), rarely deploys malware, and intends to persist for years to enable future disruption. The signature is in the sequence and timing of native-tool use, not in file hashes.

### Objective sub-detection A — NTDS.dit copy via shadow volume

### Hypothesis
A process creates a shadow copy, enumerates its contents, and copies `NTDS.dit` from `C:\Windows\NTDS\` on a Domain Controller.

### Data source
ESENT application log (as called out verbatim in AA24-038A): event IDs **216, 325, 326, 327, 637** are high-signal indicators of NTDS.dit access. Also: Sysmon event ID 1 for `ntdsutil.exe`, `vssadmin.exe`, `wmic shadowcopy call create` command lines. File-access telemetry on the NTDS.dit path.

### Starter logic
```
source: windows_event_application
where: provider_name = "ESENT"
   and event_id in (216, 325, 326, 327, 637)
   and host in domain_controllers
project: time, host, event_id, user, message
```

Parallel detection:
```
source: windows_event_security
where: event_id = 4688
   and (process_name in ("ntdsutil.exe", "vssadmin.exe")
        or command_line regex "shadowcopy\\s*call\\s*create"
        or command_line regex "ntds.*ifm")
   and host in domain_controllers
```

### Known false positives
- Legitimate backup software touching NTDS.dit (should be an allowlisted service account from an allowlisted host)
- AD recovery / DR exercises (should be ticketed)
- Microsoft Defender XDR legitimately opening a shadow copy for scan

### Response / triage
1. **Immediate**: assume credential theft of all domain accounts. Begin **domain-wide credential rotation planning** — this is a multi-day effort.
2. **Within 1 hour**: pull NTDS.dit modification time, confirm the copy destination, hunt for exfil traffic from the DC.
3. **Within 4 hours**: notify leadership. If confirmed, trigger major-incident playbook. Legal, HR, breach counsel in the loop.
4. **Hunt**: look for the follow-up DCSync activity (replication requests from non-DC hosts), netsh portproxy registry writes, SOHO router pivots. These are the AA24-038A chain markers.

### Maintenance & trend
- **Baseline**: ESENT events 216/325/326/327/637 are routine on DCs. Baseline the *rate* and the *process context* — the deviation is what matters.
- **Tune**: whitelist your backup service accounts; alert on everything else.
- **Trends**:
  - **First-seen** ESENT event correlation to a non-standard process → unknown. Investigate.
  - **Spike** → either multiple DC maintenance windows (should be ticketed) or active compromise.
  - **Drop-off** → unlikely to indicate anything useful; this isn't a volume detection.

### Objective sub-detection B — netsh portproxy for internal pivot

### Hypothesis
`netsh int portproxy add v4tov4` registers a port-forwarding relay on an internal host that was not previously running one.

### Data source
Sysmon event ID 1 (process create) for `netsh.exe` with `portproxy` in command line. Sysmon event ID 13 (registry set) for `HKLM\SYSTEM\CurrentControlSet\Services\PortProxy\v4tov4\tcp\`.

### Starter logic
```
source: sysmon_process_create
where: image_name = "netsh.exe"
  and command_line regex "int(erface)?\\s+portproxy\\s+(add|show)"
project: time, host, user, parent_process, command_line
```

Registry hunt:
```
source: sysmon_registry_set
where: target_object regex "SYSTEM\\\\.*\\\\Services\\\\PortProxy\\\\v4tov4\\\\tcp\\\\"
project: time, host, target_object, value_data
```

### Known false positives
- Developers testing port forwarding (should be dev workstations only)
- Legitimate internal tooling using portproxy (document it, allowlist it)

### Response / triage
1. **Immediate**: `netsh int portproxy show all` on the host — enumerate active forwards.
2. **Isolate** the host if the forward points to internal infrastructure not matching documented topology.
3. **Hunt**: who authenticated to the forward's listening port? Those are the pivot targets.

### Real anchors
- CISA AA24-038A — "Living off the Land" and "Table 1, Key Log Indicators" sections
- Microsoft Threat Intelligence blog "Volt Typhoon targets US critical infrastructure"
- Elastic Security Labs Volt Typhoon analysis
- SigmaHQ `windows/registry_set/registry_set_persistence_portproxy.yml`

### Evolve it
- *Easy*: block `netsh portproxy` via WDAC. Attacker uses PowerShell `New-NetFirewallRule` equivalents.
- *Harder*: EDR behavioral — process executes a well-known LotL binary with a well-known malicious parameter.
- *Toughest*: TTP-level — "any process (LolBin or not) creating a bidirectional network relay on an internal host without IT change-request context." This is the detection that survives attacker tool pivots.

### Pivot to
- Any ESENT events on domain controllers from this host (NTDS exfil)
- Any `vssadmin` or `wmic shadowcopy` activity on DCs with user matching this host's user
- Downstream: SOHO router infrastructure in your network that this adversary may be chaining through

---

## Play 8 · HOLLOWKEY — Compromised credentials (infostealer-sourced valid-account abuse)

### Objective
Detect the **~20% of insider-category cases Ponemon 2025 attributes to the "outsmarted" / credential-theft category** — the account is legitimate, the human behind it isn't the owner. The 2024-2026 shape: an infostealer (RedLine, Raccoon, LummaC2, Vidar) grabs credentials from a user's personal device or an under-protected workstation, those credentials appear on criminal markets or in a combo-list within hours, and the buyer logs in. Unlike GHOSTWIRE's slow deliberate drift, HOLLOWKEY arrives from an unfamiliar geography immediately and acts fast — the buyer paid for working access and intends to monetize it quickly.

### Hypothesis
A valid, non-privileged user credential (or increasingly, an OAuth/session-token cookie) successfully authenticates from a **first-seen source IP, ASN, device fingerprint, and often country** — with impossible-travel characteristics relative to the user's last legitimate session, no corresponding MFA notification acknowledgment pattern (push-fatigue bypass), and immediate reconnaissance activity (access to shared drives, inbox search, OAuth grant creation) in the first session.

### Data source
Identity provider sign-in logs with device fingerprint, source IP enriched with geolocation + ASN + risk-reputation (Azure AD, Okta, Ping Identity). MFA event logs (push accepted/denied/expired). OAuth consent and token-grant logs. EDR for the user's historical workstation (to detect infostealer artifacts at root cause). Email inbox search / rule-creation events (M365 UAL, Google Workspace Audit). Threat-intel feeds for leaked-credential markets (Flare, SpyCloud, DarkOwl, Hudson Rock).

### Starter logic
```
// Phase A — first-seen auth pattern + impossible travel
source: identity_signin_logs
where: event = "success"
  and (source_ip, source_asn) not in historical_set(user, 180d)
  and source_country not in historical_countries(user, 180d)
  and (
    time_since_last_legit_signin(user) * avg_travel_speed < distance(prior_country, this_country)
    or device_fingerprint not in trusted_device_set(user)
  )

// Phase B — in-session recon or OAuth-grant creation
join: m365_audit | gsuite_audit | ews_access on session_id
where: event in ("inbox_rule_created", "mailbox_search_bulk", "oauth_consent_granted",
                 "shared_drive_bulk_access", "sharepoint_download_bulk",
                 "forwarding_rule_created_to_external")
  and time within signin.time + 15min

// Phase C — root-cause: was credential infostealer-sourced?
join_optional: threat_intel_leaked_creds on user_upn
where: ti.breach_date < signin.time
    or ti.market_listing_date < signin.time
join_optional: edr_historical_artifacts on user_workstation, 90d_lookback
where: edr.ioc in known_infostealer_families  // RedLine, Raccoon, LummaC2, Vidar
```

### Known false positives
- Legitimate traveling user (should have travel notification, prior device, MFA acknowledgment pattern consistent)
- VPN rollout changing source IP geography (should correlate with IT change ticket)
- Legitimate OAuth app enrollment (should match an org-approved app catalog)
- Legitimate inbox rule creation for personal workflow (shouldn't be bulk, shouldn't forward externally)
- IT engineer logging in from a datacenter range for maintenance (allowlist by scope + schedule)

### Response / triage
1. **Immediate (within minutes)**: terminate all active sessions for the user across every connected app, force password reset, revoke OAuth refresh tokens, require re-enrollment of MFA. Session-cookie theft bypasses MFA — assume cookies are also stolen.
2. **Within 1 hour**: enumerate what the session touched — email forwarded (classic BEC precursor), files downloaded, inbox rules created ("mark as read and move to RSS Feeds" is the BEC classic to hide reply-chain visibility), OAuth consents granted. Revoke each.
3. **Within 4 hours**: scope the root cause. Was the credential sourced from the user's own workstation (hunt for infostealer artifacts) or from a third-party breach that reused their corporate password (train, enforce unique passwords)? Was it a session-cookie theft (hunt for the stealer; audit browser-cookie-access events; CyberArk / BeyondTrust for session hygiene)?
4. **If sector-wide**: coordinate — infostealer-sourced credentials for one sector often appear in bulk marketplace listings. Sector-ISAC sharing informs others' detection timing.

### Maintenance & trend
- **Baseline**: 180-day per-user set of (ASN, country, device fingerprint). Rolling MFA-acknowledgment latency distribution.
- **Tune**: travel-notification integration dramatically cuts false positives; without it, remote-first workforces will generate volume.
- **Trends**:
  - **Spike** in first-seen auth across many accounts in 24h → bulk-credential drop against your org (combo-list or sector-specific infostealer-log market).
  - **Shortening gap** between credential drop and attempted use → the market is more efficient; invest in faster session termination.
  - **MFA-push-accepted-after-prolonged-prompt pattern** → push-fatigue abuse; invest in number-matching MFA or FIDO2 passkeys.
  - **OAuth-consent-granted spike** → session-token theft campaign; audit app catalog.

### Real anchors
- **Ponemon Institute / DTEX Systems 2025 Cost of Insider Risks Global Report** — ~20% of insider-category cases are "outsmarted" (credential theft)
- CISA Advisories on infostealer + MFA fatigue + session cookie theft tradecraft (2023-2026)
- Microsoft Threat Intelligence on access-broker-to-ransomware clusters fed by infostealer-sourced creds (cluster labels change over time)
- **Flare / SpyCloud / Hudson Rock** market intelligence on infostealer log volumes
- MITRE ATT&CK T1078 Valid Accounts, T1555.003 Credentials from Web Browsers, T1539 Steal Web Session Cookie, T1621 Multi-Factor Authentication Request Generation
- CISA #StopRansomware guides — most recent entries reference infostealer-sourced access as the primary initial-access path for RaaS affiliates in 2025

### Evolve it
- *Easy*: alert on impossible travel. Attackers residential-proxy from the user's own country.
- *Harder*: baseline device fingerprint + ASN. Attackers match the ASN pool after reconnaissance.
- *Toughest*: behavioral — "first-seen (device, ASN, country) tuple followed by in-session bulk recon or OAuth-grant creation within 15 minutes." That's a kill-chain-complete detection — the attacker has to match the user's entire environmental fingerprint to evade.

### Pivot to
- The user's own workstation EDR history (90d back) for infostealer artifacts
- Third-party breach feeds (HIBP, SpyCloud) for the user's email on leaked lists
- Any OAuth consents granted in-session — those are persistence that survives password rotation
- Any new mailbox forwarding rules — BEC fraud is the common monetization path for HOLLOWKEY
- Session-cookie-theft indicators on the user's workstation (browser extension abuse, suspicious cookie-store access)

---

## Play 9 · HL7 / DICOM interface tampering (HEARTLINE — protocol play, not actor play)

The first eight plays are organised by adversary. This one and the next are organised by **protocol**, because in healthcare and rail the exposure is a property of the wire, not of who is on it: any actor on the segment inherits it.

### Objective
Detect adversary-in-the-middle manipulation (T1557) of clinical interface traffic — HL7 v2 orders/results between EHR, LIS and pharmacy, and DICOM imaging between modalities and PACS. The reason this is a play of its own: HL7 v2's de-facto transport, MLLP, "does not natively support any encryption or authentication" (Google Cloud Healthcare API documentation), and the common mitigation is to wrap the TCP connection in a VPN rather than to authenticate the messages. HHS 405(d) HICP Practice #8 (Network Management) treats these interfaces as known-exposed. An adversary on the clinical VLAN can read, alter or inject orders and results without touching the EHR itself.

### Hypothesis
On a clinical interface segment, an HL7 or DICOM message arrives at a receiving system (LIS, pharmacy, PACS, EHR interface engine) whose transport-layer source is not the documented sending system for that interface — or whose message-level sending application / facility fields (HL7 `MSH-3` / `MSH-4`; DICOM `Calling AE Title`) do not match the transport source they arrived from. Secondary: a message that modifies a patient identifier, result value or medication order outside the sending system's normal value distribution.

### Data source
Zeek with the `hl7` and `dicom` protocol analysers (or Suricata with application-layer keywords) on a SPAN/tap of the clinical interface VLAN. Interface-engine audit logs (Rhapsody, Cloverleaf, Mirth/NextGen Connect, InterSystems) — these record sender, receiver, message control ID and ACK status per message. PACS association logs (AE title, calling IP). The interface inventory (every HL7/DICOM interface, its documented sender, receiver, port and AE titles) as ground truth — if you don't have this, building it is step one.

### Starter logic
```
# Ground truth: the interface inventory
interfaces = { (dest_ip, dest_port) : { sender_ip, msh3_app, msh4_facility, ae_title_calling } }

source: zeek_hl7 | zeek_dicom | interface_engine_audit
join: interfaces on (dest_ip, dest_port)
where (ANY):
  # transport source is not the documented sender
  src_ip != interfaces.sender_ip
  # message claims an identity its transport does not match
  or (hl7.msh3 != interfaces.msh3_app or hl7.msh4 != interfaces.msh4_facility)
  or (dicom.calling_ae != interfaces.ae_title_calling)
  # a sender that normally emits one message type starts emitting another
  or hl7.msh9_type not in baseline_message_types(src_ip, 90d)
  # result / order value outside the sending system's distribution
  or (hl7.msh9_type in ("ORU^R01","RDE^O11","OMP^O09") and value_zscore(hl7.obx5 | hl7.rxe) > 4)
project: time, src_ip, dest_ip, interface_name, msh3, msh4, msh9_type, patient_id_hash, deviation
```

### Known false positives
- Interface-engine failover: the backup engine's IP is a legitimate second sender (put it in the inventory)
- Vendor remote-support sessions replaying test messages (should be ticketed; see Play 6)
- Modality replacements / PACS migrations changing AE titles (change-management event)
- Downtime-procedure re-sends after an EHR outage (bulk replays with old timestamps — correlate with the outage window)
- Documentation drift — the inventory is stale (fix the inventory, not the rule)

### Response / triage
1. **Do not act on the clinical system first.** Confirm with the interface engine's own audit log whether the message was processed, ACKed and delivered — that tells you whether a clinician has already seen an altered result or order.
2. **If a result or order was altered and delivered**: this is a patient-safety event. Notify the patient-safety officer and the clinical lead for the affected service per hospital policy; the clinical team re-verifies the affected results/orders against the source system (the analyser, the prescriber). Preserve the interface-engine message store.
3. **Contain the segment**: isolate the rogue source; if the source is a legitimate host, treat it as compromised (pivot to Play 1 / Play 8).
4. **Report**: HHS OCR if PHI integrity is affected; FDA MedWatch if a device's output was altered; H-ISAC for sector sharing.

### Maintenance & trend
- **Baseline**: 90 days per interface — message types, volume per hour, value distributions for high-risk result and order types.
- **Tune**: the inventory is the control. Review it on every interface change; alert on any interface not in it.
- **Trends**: a new sender IP appearing on multiple interfaces at once → segment compromise, not a config change. Value-distribution drift on one analyser → instrument fault first, then adversary.

### Real anchors
- Google Cloud Healthcare API documentation, HL7v2 concepts — "MLLP does not natively support any encryption or authentication"
- HHS 405(d) Health Industry Cybersecurity Practices, Practice #8 Network Management
- MITRE ATT&CK T1557 Adversary-in-the-Middle; T1565.001 Stored Data Manipulation
- Zeek `hl7` / `dicom` analyser packages
- FDA Medical Device Cybersecurity guidance (2023) for device-output integrity

### Evolve it
- *Easy*: alert on unknown source IPs to interface ports. Attacker spoofs or compromises the legitimate sender.
- *Harder*: validate message-level identity fields against transport identity. Attacker forges MSH-3/MSH-4 to match.
- *Toughest*: value-distribution and clinical-plausibility checks on results and orders — an altered potassium or insulin dose is caught by the content, not the envelope. That is a detection the attacker cannot evade by fixing headers.

### Pivot to
- The receiving system's audit trail: which clinician viewed the altered message, and when
- The sending host's EDR timeline (how did an adversary reach the clinical VLAN?)
- Play 1 (CRYO) if the segment compromise is ransomware staging; Play 8 (HOLLOWKEY) if the source authenticated with valid credentials

---

## Play 10 · VHF cab-signalling / trackside command anomalies (RAILGUARD — protocol play)

### Objective
Detect unauthorised command transmission on legacy rail radio and trackside protocols — the Polish August 2023 pattern, in which approximately 20 trains were halted by radio-stop commands sent over the legitimate VHF cab-signalling system (Polish ABW investigation; TheRecord / Euronews coverage). The protocol was safety-engineered to fail safe, not cyber-engineered to authenticate: any transmitter in range that sends the right tones is obeyed. EN 50159:2010+A1:2020 (*Safety-related communication in transmission systems*) lists cryptographic techniques among its defence methods for transmission systems with unauthorised-access risk; most legacy deployments predate it.

### Hypothesis
A command is received by rolling stock or trackside equipment that (a) did not originate from an authorised transmitter — by RF direction-finding, by signal characteristics, or by absence from the dispatcher's command log — or (b) is inconsistent with the operational state (an emergency stop with no dispatcher-initiated cause; a parameter change on an interlocking or grade crossing with no authorised engineering session).

### Data source
This play has an RF half and an IT half.
- **RF**: spectrum monitoring receivers along corridors (fixed or on-train SDRs) logging command-tone events with timestamp, frequency, received signal strength and, where available, direction-finding bearing. Transmitter authorisation inventory (every licensed base and cab transmitter, location, hours).
- **IT**: dispatcher command log (CAD/dispatch system); PTC / interlocking / grade-crossing controller audit logs where the equipment produces them; engineering-workstation session logs; TSA SD 1580/82-2022-01C-required logging for critical cyber systems.

### Starter logic
```
# RF half — command events not matched to an authorised transmitter
source: rf_monitor_log
where: event_type in ("radio_stop", "emergency_stop_tone", "cab_signal_command")
join_optional: dispatcher_command_log on time within ±30s and corridor
where: no matching dispatcher command
join_optional: transmitter_inventory on bearing/location within tolerance
where: no authorised transmitter in that bearing
      or received_signal_strength outside the profile of the nearest authorised transmitter
project: time, corridor, event_type, frequency, rssi, bearing, nearest_authorised_tx, dispatcher_match

# IT half — trackside parameter or command changes without an engineering session
source: interlocking_audit | grade_crossing_audit | ptc_backoffice_api_log
where: action in ("parameter_write", "command_issue", "config_change")
join_optional: engineering_session_log on asset, time ±15m
where: no_matching_session
   or session_user not in authorised_engineers(asset)
   or (ptc_api.caller not in authorised_api_principals)        # T0871
project: time, asset, action, value_before, value_after, caller, session_match
```

### Known false positives
- Legitimate dispatcher-initiated emergency stops (will match the dispatcher log — that is the point of the join)
- Maintenance-of-way crews using handheld radios within procedure (should be in the inventory with hours)
- RF propagation anomalies producing phantom events on marginal receivers (tune the RSSI floor)
- Scheduled engineering sessions whose ticket closed early / late (widen the session window before blaming the operator)

### Response / triage
1. **Safety first, forensics second.** An unexplained stop is handled as a safety event by operations under FRA 49 CFR Part 236 Subpart I fallback procedures; the security team's job is to tell operations within minutes whether it was authorised.
2. **If unauthorised RF command confirmed**: notify TSA Transportation Security Operations Center per SD 1580/82-2022-01C and FRA; hand bearing/time data to law enforcement for direction-finding (in Poland, arrests followed within days).
3. **If trackside parameter change without session**: treat the asset as compromised; restore known-good parameters from the engineering baseline; the asset stays under flagman / manual authority until re-verified.
4. **Correlate the two halves**: an RF event and an IT event in the same window is a coordinated campaign (IRONHAZE pattern — RF trackside plus DDoS/IT), not two incidents.

### Maintenance & trend
- **Baseline**: 90 days of RF command-event rate per corridor; parameter-change rate per asset; engineering-session cadence.
- **Tune**: the transmitter inventory and the engineering-authorisation list are the controls — audit both quarterly.
- **Trends**: events clustered on one corridor at odd hours → a mobile transmitter working the line. Parameter writes trending up on one asset class → firmware/tooling change or adversary staging.

### Real anchors
- Polish Agencja Bezpieczeństwa Wewnętrznego (ABW) statements, Aug–Sep 2023; TheRecord, Euronews coverage (~20 trains halted; two arrests)
- EN 50159:2010+A1:2020, *Railway applications — Communication, signalling and processing systems — Safety-related communication in transmission systems* (BSI)
- TSA Security Directive 1580/82-2022-01C (rail cybersecurity mitigation actions and testing)
- FRA 49 CFR Part 236 Subpart I, §236.1033 (PTC communications and security requirements)
- MITRE ATT&CK for ICS T0855 / T1692.001 Unauthorized Command Message; T0836 Modify Parameter; T0871 Execution Through API

### Evolve it
- *Easy*: alert on any emergency-stop tone. Drowns in legitimate stops.
- *Harder*: join to the dispatcher log and transmitter inventory. Catches the rogue transmitter; misses a compromised authorised one.
- *Toughest*: cryptographic authentication of command messages (EN 50159 defence method) so an unauthenticated command is rejected by the receiver, not merely detected. That is the architectural fix — detection is the bridge until it is deployed.

### Pivot to
- RAILGUARD Play 3 (IRONHAZE) for the DDoS half of a coordinated campaign
- Play 7 (VOLTFORGE) if the IT-side parameter changes show LotL tradecraft on the back-office
- Sector ISAC (Surface Transportation ISAC) — a rogue transmitter pattern on one operator's corridors is usually not unique to them

---

## Play 11 · Concurrent intrusion sets — clustering before attribution (all missions — analytic play)

### Objective
Keep two independent adversaries on the same network from being analysed as one. CISA/FBI/CNMF advisory AA23-250A (7 Sep 2023) documents the pattern: "multiple nation-state APT actors were present on the organization's network" of an Aeronautical Sector organization, with indicators as early as January 2023; one set exploited CVE-2022-47966 in Zoho ManageEngine ServiceDesk Plus on the public-facing web server, "additional APT actors" exploited CVE-2022-42475 to establish presence on the firewall device, and the advisory itself notes "overlapping TTPs across multiple APT actors." Sophos X-Ops (Aug 2022) reported three ransomware groups hitting one network — "the first two attacks took place within two hours, and the third attack took place two weeks later" — while cautioning that "the rise in multiple attackers is still based on anecdotal evidence." The failure mode this play prevents is not a missed detection; it is a correct detection filed under the wrong adversary, followed by a containment action that ends one intrusion and leaves the other running.

### Hypothesis
Observed malicious activity on this network comes from more than one independent operator. Evidence: two or more clusters of C2 infrastructure (distinct destinations, beacon intervals, TLS/JA3 profiles, or user-agents) that do not share a parent process lineage or a common initial foothold; or two distinct initial-access vectors active in overlapping windows; or post-containment activity that continues after a confirmed eradication of the first set.

### Data source
Network: Zeek `conn.log` / `ssl.log` / `http.log` or NDR equivalent for beacon profiling; firewall and VPN logs for the edge. Endpoint: EDR process trees with parent lineage, scheduled-task and service creation, web-shell file writes on edge servers. Case management: the ticket itself — every observation must carry a cluster tag before it carries an actor hypothesis.

### Starter logic
```
# 1. Cluster beacons by infrastructure + cadence, not by "known bad"
source: zeek_conn | zeek_ssl
where: dest is external and (periodicity_score > threshold or dest in known_c2)
group_by: dest_asn, ja3, user_agent, median_interval(±jitter)
emit: cluster_id per group

# 2. Tie each endpoint artifact to a cluster via process lineage
source: edr_process_tree
where: process initiated a connection in a beacon cluster
       or process wrote a file later executed by such a process
project: host, cluster_id, root_parent, first_seen, initial_access_vector_guess

# 3. Alarm on independence
where: count(distinct cluster_id) >= 2
   and clusters share no root_parent and no initial_access_vector
   # or: a cluster's beacons persist > 1 interval after the other cluster's foothold was eradicated
project: cluster_ids, hosts_per_cluster, initial_access_per_cluster, earliest_seen_per_cluster
```

### Known false positives
- One operator with two infrastructure tiers (short-haul and long-haul C2) — lineage will usually link them; treat as one cluster until it doesn't
- Red team and real adversary overlapping an exercise window — check the exercise deconfliction list first
- Commodity malware riding on the same unpatched edge as a targeted set — still two clusters; the triage priority differs, the hygiene fix does not

### Response / triage
1. **Tag before you attribute.** Every observation gets a cluster ID in the ticket. Attribution hypotheses are per cluster. A TTP that "matches" your primary hypothesis is only evidence for that hypothesis if it belongs to that cluster.
2. **Run ACH per cluster.** Hold H1 and H2 explicitly; score each observation against both. AA23-250A's "overlapping TTPs" is the reason a single-hypothesis workflow fails here.
3. **Contain per cluster; verify after each.** After eradicating cluster A's foothold, re-run step 3 of the logic. Continued beaconing is not "A came back" until lineage says so — it is more likely B.
4. **Fix the edge once.** AA23-250A's mitigations are deliberately generic (patch internet-facing systems, MFA, least privilege, log retention): two actors on the same vulnerable edge are an edge problem.

### Maintenance & trend
- **Baseline**: how many distinct beacon clusters the environment normally shows (SaaS telemetry, update agents) — label those so a new cluster stands out.
- **Tune**: periodicity threshold and jitter tolerance per network segment.
- **Trend**: a new cluster appearing within days of a public edge CVE is the AA23-250A shape — more than one operator scanning for the same bug.

### Real anchors
- CISA/FBI/CNMF, Cybersecurity Advisory AA23-250A, "Multiple Nation-State Threat Actors Exploit CVE-2022-47966 and CVE-2022-42475" (7 Sep 2023)
- Sophos press release / X-Ops whitepaper, "Multiple Attackers: A Clear and Present Danger" (Aug 2022)
- Richards J. Heuer Jr., *Psychology of Intelligence Analysis*, CIA Center for the Study of Intelligence (1999) — Analysis of Competing Hypotheses

### Evolve it
- *Easy*: alert when two different known-bad destinations are seen. Misses everything not on a list.
- *Harder*: cluster by cadence and lineage, alarm on independence. Catches an unknown second set; needs endpoint lineage to be trustworthy.
- *Toughest*: make cluster tagging a mandatory field in case management so the analytic discipline survives the analyst. That is the AA23-250A lesson — the tooling was not what failed.

### Pivot to
- Any actor play (1–8) once a cluster has a hypothesis — run it per cluster
- Play 7 (VOLTFORGE) if one cluster is quiet and LotL while the other is loud: a noisy intrusion is cover for a quiet one whether or not the two are coordinated
- In-game: TWO-ADVERSARY MODE (Settings ▸ ADVERSARIES ▸ TWO, or `?adv=2`) — one shared evidence pool, two C2s, one SEVER each

---

## Detection authoring notes

- **Build these for authoring, not copying.** Every environment is different. The seven-field schema is the discipline; the specific logic is yours.
- **Climb the Pyramid.** For each play, the Easy/Harder/Toughest ladder shows how to make the detection survive attacker evolution.
- **Fact-check every claim.** The ESENT event IDs 216, 325, 326, 327, 637 are quoted verbatim from AA24-038A. The MITRE technique IDs are verified. The ZPMC concerns reference the 2024 U.S. House Select Committee on CCP report. Where no public rule exists for a play, it says so.

---

*Appendix generated for Joshua Protocol v0.10.0 — BUILD HUNT-20261027-1710Z · STAMP 2026-10-27T17:10Z. In the spirit of grumby42/dfir-trainers' TRAINER_SPEC.md: detections authored as plays, not shipped as copy-paste rules.*
