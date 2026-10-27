# playtest/ — headless verification harness

Every "verified headlessly" claim in the top-level README is reproducible from here. The harness loads the real `index.html` `<script>` into Node (DOM/canvas stubs, timers flushed synchronously, modal callbacks auto-advanced) and drives the phase machine directly.

```
cd playtest
node demo-test.js                 # all five instructor demos; expect 5× "Final: WIN" with nothing compromised
node v010-two-adversary-test.js   # 120 seeded two-adversary runs + 40 mode-off runs; expect "ALL INVARIANTS HOLD"
node v09-passive-test.js          # a do-nothing player must lose to every actor
node v09-stress-test.js           # actor fingerprints (CRYO tempo, WARDEN handoff, …)
node save-resume-test.js          # save → resume round-trip
node ach-test.js | combo-test.js | export-test.js | ooda-test.js
```

Requires Node ≥ 18, no dependencies. `JP_HTML=/path/to/other/build.html` points the harness at an archived build.

Caveats a reviewer should know: the active bots in these tests read `STATE.threats` directly (perfect information), so their win rates measure engine invariants, not game difficulty. Timers are flushed synchronously, so anything that depends on real wall-clock pacing is untested here. Rendering is stubbed — layout and canvas drawing are checked by opening the file in a browser, not by this harness.
