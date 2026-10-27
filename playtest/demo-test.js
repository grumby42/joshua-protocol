require('./harness.js');

// Demo mode uses scripted narrator. Our monkey-patch auto-advances narrator cards.
// Verify each demo plays through without stalling or erroring.
['BLACKFROST', 'NIGHTWATCH', 'TIDEBREAK', 'HEARTLINE', 'RAILGUARD'].forEach(missionId => {
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
    console.log('  Compromised:', global.STATE.nodes.filter(n=>n.state==='compromised').map(n=>n.id).join(',')||'none', '| lifeSafety:', (global.STATE.lifeSafetyEvents||[]).length, '| cascade:', !!(global.STATE.metrics&&global.STATE.metrics.sectorCascade));
  } catch (e) {
    console.log('  THROWN:', e.message);
  }
});
