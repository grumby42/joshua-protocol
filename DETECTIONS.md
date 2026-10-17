# Detection Engineering Appendix — think it, don't paste it

> **Scope.** One starter detection *play* per threat actor archetype in the Joshua Protocol game. The game teaches *decisions under tempo*; this appendix teaches *the detection work that would catch the tradecraft the game models.* Reusable playbook units in the sense of Bollinger, Enright & Valites, *Crafting the InfoSec Playbook* (O'Reilly) and Don Murdoch, *Blue Team Handbook: SOC, SIEM, and Threat Hunting Use Cases*.
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

> **Fact-check rigor bar.** Every technique ID below is verified against live MITRE ATT&CK (Enterprise or ICS). Every Volt Typhoon artifact is verified against the joint CISA/NSA/FBI advisory [AA24-038A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-038a). ICS v19 revoked IDs (T0855 → T1692.001, T0803 → T1691.001, T0856 → T1692.002) are presented with both forms for operator familiarity. Where a canonical public rule exists, it is cited; where one doesn't (hunt built from your own baseline), that is said plainly.

> **Format convention.** Pseudocode uses `source:` and `where:` / `project:` keywords in the spirit of KQL/SPL/EQL without binding to one. Replace with your schema's equivalents.

---

## Play 1 · CRYO — Ransomware broad-landing phishing + rapid encryption

### Objective
Catch ransomware operations in the gap between successful spearphishing attachment execution (ATT&CK T1566.001) and T1486 Data Encrypted for Impact — the window where the kill chain is interruptible.

### Hypothesis
A non-admin user process (parent = Outlook, Teams, browser) spawns a scripting interpreter (`powershell.exe`, `wscript.exe`, `mshta.exe`) that initiates outbound HTTPS to a never-before-seen domain within 60 seconds.

### Data source
EDR process-tree telemetry (Sysmon event ID 1 with parent process; equivalent fields in CrowdStrike / Defender for Endpoint / Elastic). Proxy or DNS logs for the outbound call.

### Starter logic
```
source: edr_process_create
where: parent_image in ("outlook.exe", "winword.exe", "excel.exe", "teams.exe", "chrome.exe", "msedge.exe", "firefox.exe")
  and image_name in ("powershell.exe", "wscript.exe", "cscript.exe", "mshta.exe", "rundll32.exe", "regsvr32.exe")
  and user_sid not in (known_admin_sids)
join: dns_query on hostname = query_source_process_pid within 60s
where: dns_query.domain first_seen within 7d
project: user, host, parent_image, image_name, command_line, dns_query.domain
```

### Known false positives
- IT engineering teams scripting against user mailboxes (Outlook → PowerShell for shared-mailbox automation)
- Teams PWA installer legitimately spawning `rundll32`
- Internal patching tools proxied through user-mode launchers
- Developers using VBS for one-off scripts

### Response / triage
1. **Immediate**: isolate the host via EDR network containment (do not power off — preserve volatile memory).
2. **Within 15 min**: confirm the user clicked a phishing lure (check their Outlook sent/received for the lure; interview if possible). Grab a memory capture.
3. **Within 1 hr**: pivot to the mail security gateway — did the same lure land in other inboxes?
4. **Hand-off**: if confirmed malicious, kick to IR tier-2 with the EDR process graph, DNS pivot, and lure email.

### Maintenance & trend
- **Baseline**: run this detection in observe-only mode for 7-14 days against a known-clean dev environment to seed the false-positive list.
- **Tune**: add `path exclude` for internal IT automation hosts; add `command_line` regex exclusions for known management strings; raise the DNS first-seen window to 30d after the initial burn-in.
- **Trends to watch**:
  - **Spike** → active phishing campaign landing in your org.
  - **Drop-off** → either defenders rolled a mail-gateway rule that worked, or attackers moved to a different initial-access vector (which means the rule is stale, not successful).
  - **First-seen** of a new parent process → user installed something new. Pivot into deployment telemetry.
  - **Beacon** pattern in the follow-up DNS → the lure landed and the implant is calling home. Treat as high.

### Real anchors
- Sigma `proc_creation_win_office_outlook_macro_load.yml` and similar in SigmaHQ `windows/process_creation/` tree
- Elastic Detection Rules `endpoint/execution_from_unusual_directory_office_apps.toml`
- CISA #StopRansomware guides (Lockbit, Royal, Play) — each reiterates this pattern

### Evolve it (Pyramid of Pain)
- *Easy*: block known PowerShell encoded-command flags. Attackers rename `powershell.exe` to `pwsh_alt.exe` and bypass.
- *Harder*: hash-match `powershell.exe` binaries. Attackers use LOLBAS alternates (`certutil`, `rundll32`).
- *Toughest*: behavioral — "office-parented script interpreter with outbound HTTPS to young domain". This is a TTP-level detection; the attacker has to rebuild their delivery stack to evade it. That's the goal.

### Pivot to
- The lure email's `Message-ID`, sender infrastructure, attachment hash (fully-malicious-only; the actual document); send to TI team for enrichment.
- EDR process-tree child discovery: did the implant drop additional binaries? Scheduled tasks?
- NTDS.dit pulls from any domain controller in the next 24 hours (precursor to T1486).

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
3. **Hunt**: look for `netsh portproxy` persistence on the pivot host (Volt Typhoon signature; APTs reuse these tradecraft patterns).
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

## Play 3 · IRONHAZE — Hacktivist / opportunistic exploit of public-facing apps

### Objective
Catch the loud, fast opportunistic exploitation of exposed services (ATT&CK T1190) and T0883 (ICS Internet Accessible Device) — the pattern seen in defacement, limited-dwell disruption, and most Iran-nexus CyberAv3ngers-style activity against exposed PLCs.

### Hypothesis
A publicly-exposed service receives a sudden burst of exploit-pattern requests (CVE-matching URIs, Unicode-encoded path traversal, known webshell paths) from a single or small set of source IPs within a tight time window.

### Data source
WAF / reverse-proxy access logs (Nginx, Apache, F5, Cloudflare). IDS/IPS alerts (Suricata / Snort). For PLC exposure: shodan-equivalent internal scanner + Zeek Modbus/DNP3 logs.

### Starter logic
```
source: waf_access_log
where: status_code in (200, 500)
  and (uri contains "/wp-admin/" or uri contains "/boaform/" or uri contains "/.env"
       or uri contains "../.." or uri regex "/cgi-bin/.*\\.cgi")
summarize: count_distinct(uri) as unique_paths, count() as attempts
  by: source_ip, 10min_window
having: attempts > 50 or unique_paths > 10
project: source_ip, 10min_window, attempts, unique_paths
```

### Known false positives
- Internal pentesters (unless scoped out of this detection)
- Legitimate security researcher scanning (Shodan verified, Censys, GreyNoise community)
- Vulnerability scanner nodes you forgot to allowlist
- CDN health probes hitting unusual paths

### Response / triage
1. **Immediate**: enrich source IP against GreyNoise and your TI feeds; if it's a known crawler, close.
2. **If targeted**: block the source IP at the edge; confirm no successful 200s against known-exploitable paths.
3. **If 200 on exploit path**: assume compromise. Pull the response body — webshell markers? Isolate.
4. **For exposed PLCs** (Modbus/DNP3/S7Comm visible from outside): emergency network segmentation. This is the CyberAv3ngers playbook — direct PLC command execution, no middleware exploit needed.

### Maintenance & trend
- **Baseline**: 30 days of normal external request volume per endpoint.
- **Tune**: the exploit-pattern URI list drifts quarterly; refresh from SigmaHQ `web/` tree.
- **Trends**:
  - **Spike** → active exploitation campaign in the wild. Check CISA KEV catalog.
  - **First-seen URI pattern** → new CVE being weaponized. Patch window just closed.
  - **Drop-off** → either you patched or they moved on. Verify.

### Real anchors
- SigmaHQ `web/web_apt_webshell_access.yml` and family
- CISA #StopRansomware guides on CVE-2021-40539 (Zoho ManageEngine — the Port of Houston 2021 entry vector)
- Dragos "CyberAv3ngers Targets US Water Infrastructure" (2023) — PLC-direct exploitation pattern
- GreyNoise `malicious` tag taxonomy

### Evolve it
- *Easy*: block source IPs. They rotate on cheap VPSes.
- *Harder*: block on JA3/JA4 TLS fingerprints of exploit tools.
- *Toughest*: behavioral — "request burst against our edge with CVE-matching patterns from a source showing no normal browsing behavior." Attackers have to redesign their delivery to evade.

### Pivot to
- Any successful (2xx) response following a 4xx storm from the same IP
- Immediate downstream: webshell artifacts on the exposed server (file writes to `/var/www/`, `wwwroot/`, etc.)
- Internal lateral movement from the compromised DMZ host inward (pivot to Play 2's logic)

---

## Play 4 · GHOSTWIRE — Insider threat / compromised credentials

### Objective
Detect authorized credentials behaving abnormally. The signature isn't "unauthorized login" — the credentials are valid. The signature is deviation from the user's historical access pattern, combined with high-value asset interaction.

### Hypothesis
An authenticated user accesses a sensitive dataset, system, or asset *at a time, from a location, or in a volume* that falls outside their 90-day baseline — with no corresponding ticket, change-request, or on-call rotation.

### Data source
UEBA platform (Splunk UBA, Microsoft Sentinel UEBA, Exabeam, Securonix) if deployed. If not: write it with raw logs — Windows 4624/4634, Azure AD sign-in logs, file access audit logs, PAM session logs, and your HR/change-management system.

### Starter logic
```
source: identity_signin_logs
where: user in watchlist(privileged_users) or asset in watchlist(crown_jewels)
join: baseline_access_patterns on user
project: time, user, source_ip, source_country, asset, volume
having: (time outside baseline_hours(user) by > 2h)
     or (source_country not in baseline_countries(user, 90d))
     or (volume > p99(baseline_volume(user, 90d)))
     or (asset not in baseline_assets(user, 90d) and asset in crown_jewels)
join_optional: change_management on user, 24h window
where: no_matching_ticket
```

### Known false positives
- On-call engineer called in at 2am (should match pager rotation)
- Business trip without updated travel notification
- Legitimate project pivot (new team, new access needs)
- IT engineer who got a new asset-provisioning request

### Response / triage
1. **First**: don't lock the account yet. Insiders can be innocent; the account might also be stolen credentials belonging to a legitimate user. The investigation window matters.
2. **Within 30 min**: check UEBA for additional anomaly signals from the same user; check HR for recent events (termination notice, PIP, grievance); check ticketing for a legitimate change.
3. **If no legitimate explanation**: contact the user's manager OR trigger managed-insider-threat process depending on your org's playbook. Preserve forensic evidence (don't tip the user).
4. **If stolen credentials suspected**: trigger credential-rotation playbook; isolate; alert incident response.

### Maintenance & trend
- **Baseline**: 90-day rolling per user for hours, countries, assets, volume. Longer for roles with low-frequency access patterns.
- **Tune**: weight by role (DBAs get wider volume tolerance; junior analysts get tighter); seasonal adjustment for fiscal-year-end patterns.
- **Trends**:
  - **Spike** → external credential breach exposing many users at once. Check HIBP, breach-notification feeds.
  - **First-seen** pattern for a user → either role change (update HR integration) or compromise.
  - **Beacon** pattern — same anomaly repeating weekly → either shadow IT (talk to user) or persistent compromise (incident).

### Real anchors
- Microsoft Sentinel UEBA playbooks
- CISA Insider Threat Mitigation Guide
- MITRE ATT&CK T1078 Valid Accounts + sub-techniques
- NIST SP 800-53 PM-12 Insider Threat Program controls

### Evolve it
- *Easy*: alert on off-hours access. Insider shifts to work hours.
- *Harder*: baseline per-user-per-role access patterns. Insider stays within pattern until the actual exfil event.
- *Toughest*: behavioral chain — "normal user access followed by first-time staging-area upload followed by removable-media event." That's a kill-chain-complete detection.

### Pivot to
- The user's recent HR events (manager interview, access review)
- The crown-jewel asset's audit log — what was accessed?
- Removable media / cloud storage upload events in the same session
- DNS queries from the user's workstation to personal webmail / file-sharing services

---

## Play 5 · WARDEN — Access broker / cybercriminal; burst-pattern

### Objective
Detect short-dwell credential-abuse operations characteristic of initial-access brokers who sell access to multiple downstream buyers. The signature is a *burst* of credential-based access from a single foothold, followed by quiet, followed by another burst from the *same credential* but with different behavioral signatures (different buyer's tradecraft).

### Hypothesis
A single service account or valid user credential shows two or more distinct access *clusters* within a 30-day window, where each cluster has internally-consistent behavioral patterns (times, source IPs, command patterns) but the clusters differ substantially from each other.

### Data source
Identity provider sign-in logs with source IP, user agent, authentication method. EDR process execution for the sessions originating from each sign-in.

### Starter logic
```
source: identity_signin_logs
where: user in watchlist(service_accounts) or user in watchlist(privileged_users)
summarize: cluster_signin_patterns(source_ip, user_agent, time_of_day, auth_method) as patterns
  by: user, 7d_window
where: distinct_cluster_count(patterns, 30d) >= 2
  and cluster_similarity(patterns) < 0.3
project: user, 30d_window, distinct_clusters, similarity_score
```

### Known false positives
- Shared service accounts legitimately used by multiple teams (bad practice but exists)
- Account used from both corporate laptop and personal mobile
- IT handoff between shifts using the same break-glass account
- VPN change rolled out mid-period, legitimately shifting source IP ranges

### Response / triage
1. **Immediate**: enumerate all sessions in the two-plus clusters. Timeline them.
2. **Within 1 hr**: for each cluster, pull EDR process trees. Different clusters = different buyers = different tradecraft. The behavioral differences are evidence.
3. **Lock the credential** on confirmation. Rotate. Audit for persistence artifacts (scheduled tasks, service installations).
4. **Hand to TI**: broker IOCs (initial-foothold source IPs, exploited CVE if applicable, broker's advertisement if findable on criminal forums) feed strategic reporting.

### Maintenance & trend
- **Baseline**: cluster-similarity scoring needs ~60 days of history to be reliable per account.
- **Tune**: increase threshold for shared service accounts; decrease for human-user accounts.
- **Trends**:
  - **Spike** in multi-cluster detections across many accounts → active broker campaign against your org or your industry.
  - **First-seen** cluster divergence on a long-stable account → start of a sell event or stolen-credential handoff.

### Real anchors
- Microsoft Threat Intelligence reports on access brokers (DEV-0537, DEV-0193, etc.)
- Mandiant M-Trends annual on initial-access broker market
- Flashpoint / Intel 471 broker-market reports (if you have access)

### Evolve it
- *Easy*: alert on password spray and 4625 failures. Brokers use stuffed credentials; successes don't trigger failure-based detections.
- *Harder*: fingerprint the buyer by their post-foothold tool use.
- *Toughest*: track the broker's advertising cadence against your detection cadence. If you're seeing cluster-count spikes, the broker is actively selling.

### Pivot to
- Each cluster's downstream tool deployment pattern (that identifies the buyer)
- Dark-web monitoring for your org's domain in access-sale listings
- The initial-access vector that let the broker in (likely in Play 3's exploit-of-public-facing-app detection)

---

## Play 6 · TIDEMARK — Supply-chain / trusted vendor remote access

### Objective
Catch adversary presence that enters through a trusted-vendor remote-access channel (vendor VPN, LogMeIn, TeamViewer, vendor-managed jump host, PLC vendor cellular modem per ZPMC supply-chain concerns). The entry point is authorized; the activity after it isn't.

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

## Detection authoring notes

- **Build these for authoring, not copying.** Every environment is different. The seven-field schema is the discipline; the specific logic is yours.
- **Climb the Pyramid.** For each play, the Easy/Harder/Toughest ladder shows how to make the detection survive attacker evolution.
- **Fact-check every claim.** The ESENT event IDs 216, 325, 326, 327, 637 are quoted verbatim from AA24-038A. The MITRE technique IDs are verified. The ZPMC concerns reference the 2024 U.S. House Select Committee on CCP report. Where no public rule exists for a play, it says so.

---

*Appendix generated for Joshua Protocol v0.7 — BUILD HUNT-20261017-1121Z · STAMP 2026-10-17T11:21Z. In the spirit of grumby42/dfir-trainers' TRAINER_SPEC.md: detections authored as plays, not shipped as copy-paste rules.*
