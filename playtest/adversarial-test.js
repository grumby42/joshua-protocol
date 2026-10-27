// Tests the game CAN be lost. If no policy ever loses, the game is too easy.
require('./harness.js');

function play(missionId, actorId, difficulty, seed) {
  const mission = global.MISSIONS[missionId];
  const origRandom = Math.random;
  let state = seed || 1;
  const prng = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; };
  const actorIdx = mission.validActors.indexOf(actorId);
  let callN = 0;
  Math.random = () => {
    callN++;
    if (callN === 1 && actorIdx >= 0) return actorIdx / mission.validActors.length + 0.001;
    return prng();
  };
  global.STATE.difficulty = difficulty;
  global.STATE.speed = 'rapid';
  global._debriefCalled = null;
  try {
    global.beginGame(missionId);
    global._flushTimers();
    global.STATE.speed = 'rapid';
    const MAX = 500;
    let iter = 0, lastSig = null, stuck = 0;
    while (global.STATE.phase !== 'WIN' && global.STATE.phase !== 'LOSE' && iter < MAX) {
      iter++;
      const sig = global.STATE.phase + '-' + global.STATE.round;
      if (sig === lastSig) { stuck++; if (stuck > 30) {
        if (global.STATE.gateCallback) { global.releaseGate(); global._flushTimers(); stuck=0; continue; }
        break;
      }} else { stuck = 0; lastSig = sig; }
      if (global.STATE.phase === 'INTEL') { global.startPlanPhase(); global._flushTimers(); continue; }
      if (global.STATE.phase === 'PLAN') {
        // PASSIVE policy: only harden a random node per round. Never SEVER, never DISRUPT.
        const S = global.STATE;
        const anchor = S.agents.findIndex(a => a.id === 'ANCHOR');
        const harden = S.agents[anchor].actions.find(a => a.id === 'harden');
        const n = S.nodes.find(nn => nn.state !== 'compromised');
        if (n) global.queueAction(anchor, harden, n.id);
        global.startResolvePhase();
        global._flushTimers();
        continue;
      }
      global._flushTimers();
      if (global.STATE.gateCallback) global.releaseGate();
      global._flushTimers();
    }
    global._flushTimers();
  } catch (e) {
    return { finalPhase: 'ERROR', err: e.message };
  } finally {
    Math.random = origRandom;
  }
  return {
    missionId, actorId, difficulty, seed,
    finalPhase: global.STATE.phase,
    round: global.STATE.round,
    compromised: global.STATE.nodes.filter(n => n.state === 'compromised').length,
    dwell: global.STATE.dwellRoundsAccumulated || 0,
  };
}

// Run passive policy against every combo, 5 seeds each
const results = [];
Object.values(global.MISSIONS).forEach(m => {
  m.validActors.forEach(a => {
    ['novice', 'operator', 'analyst'].forEach(d => {
      for (let seed = 1; seed <= 5; seed++) {
        const r = play(m.id, a, d, seed * 7919);
        results.push(r);
      }
    });
  });
});

// Summary
const stats = {};
results.forEach(r => {
  const k = r.missionId + '/' + r.actorId + '/' + r.difficulty;
  if (!stats[k]) stats[k] = { W: 0, L: 0, OTHER: 0, avgRound: 0, maxRound: 0, n: 0 };
  stats[k].n++;
  if (r.finalPhase === 'WIN') stats[k].W++;
  else if (r.finalPhase === 'LOSE') stats[k].L++;
  else stats[k].OTHER++;
  stats[k].avgRound += r.round;
  stats[k].maxRound = Math.max(stats[k].maxRound, r.round);
});
Object.entries(stats).sort().forEach(([k, v]) => {
  console.log(k, '→', v.W + 'W/' + v.L + 'L/' + v.OTHER + 'O avgR=' + (v.avgRound/v.n).toFixed(1), 'max=' + v.maxRound);
});

// Did any combo always win (0 losses) with the passive policy?
const alwaysWin = Object.entries(stats).filter(([k,v]) => v.L === 0 && v.W > 0);
const alwaysLose = Object.entries(stats).filter(([k,v]) => v.W === 0 && v.L > 0);
console.log('\nAlways-win (even w/ passive policy):', alwaysWin.length, 'combos');
console.log('Always-lose (passive):', alwaysLose.length, 'combos');
if (alwaysWin.length > 0) {
  console.log('  Passive-win sample:', alwaysWin.slice(0,5).map(x=>x[0]).join(', '));
}
