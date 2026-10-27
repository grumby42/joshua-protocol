require('./harness.js');

// Demo mode uses scripted narrator. Our monkey-patch auto-advances narrator cards.
// Verify each demo plays through without stalling or erroring.
// v0.10.1: demos run on a fixed PRNG (beginDemo seeds Math.random), so one run per script is representative.
let failures = 0;
Object.keys(global.DEMOS).forEach(missionId => {
  console.log('--- DEMO:', missionId);
  global.STATE.speed = 'rapid';
  global._debriefCalled = null;
  try {
    global.beginDemo(missionId);
    global._flushTimers();
    global.STATE.speed = 'rapid';
    // Loop until win/lose or stuck
    const MAX = 500; let iter = 0, stuck = 0, lastSig = null;
    while (global.STATE.phase !== 'WIN' && global.STATE.phase !== 'LOSE' && iter < MAX) {
      iter++;
      const sig = global.STATE.phase + '-' + global.STATE.round;
      if (sig === lastSig) { stuck++; if (stuck > 50) {
        if (global.STATE.gateCallback) { global.releaseGate(); global._flushTimers(); stuck=0; continue; }
        console.log('  STUCK at', sig);
        break;
      }} else { stuck = 0; lastSig = sig; }
      global._flushTimers();
      if (global.STATE.gateCallback) global.releaseGate();
      global._flushTimers();
    }
    console.log('  Final:', global.STATE.phase, 'R' + global.STATE.round);
    console.log('  Debrief:', global._debriefCalled ? global._debriefCalled.reason : 'NOT CALLED');
    console.log('  Combos triggered:', (global.STATE.combosTriggered || []).length);
    console.log('  TTPs:', Object.keys(global.STATE.observedTTPs || {}).length);
    console.log('  C2 severed:', global.STATE.c2Severed);
    const comp = global.STATE.nodes.filter(n=>n.state==='compromised').map(n=>n.id);
    console.log('  Compromised:', comp.join(',')||'none', '| lifeSafety:', (global.STATE.lifeSafetyEvents||[]).length, '| cascade:', !!(global.STATE.metrics&&global.STATE.metrics.sectorCascade));
    if (global.STATE.coActor) console.log('  Second adversary:', global.STATE.coActor.id, '| coC2 severed:', global.STATE.coC2Severed, '| pivots:', JSON.stringify(global.STATE.pivotEvents.map(p=>'r'+p.round+':'+p.from+'>'+p.to)));
    // Every instructor demo must end in a clean WIN with nothing compromised — that is what the narration promises.
    if (global.STATE.phase !== 'WIN' || comp.length) { failures++; console.log('  *** DEMO CONTRACT BROKEN'); }
  } catch (e) {
    console.log('  THROWN:', e.message); failures++;
  }
});
console.log(failures ? `\n${failures} DEMO(S) FAILED` : '\nALL DEMOS: WIN, nothing compromised');
process.exit(failures ? 1 : 0);
