require('./harness.js');

// v0.10.1: JOSHUA_SEED=<decimal|0xhex|string> reproduces a shared ?seed= run
// (same normalisation as initSeedFromURL). ADV=2 turns on two-adversary mode.
if (process.env.JOSHUA_SEED) {
  const raw = process.env.JOSHUA_SEED; let seed;
  if (/^-?\d+$/.test(raw)) seed = parseInt(raw, 10) >>> 0;
  else if (/^0x[0-9a-fA-F]+$/.test(raw)) seed = parseInt(raw, 16) >>> 0;
  else { let h = 2166136261 >>> 0; for (let i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } seed = h; }
  Math.random = global.mulberry32(seed);
  console.log('[one-run] seeded:', raw, '->', seed);
}
if (process.env.ADV === '2') global.STATE.twoAdversary = true;

function play(missionId, actorId, difficulty) {
  const mission = global.MISSIONS[missionId];
  if (!mission.validActors.includes(actorId)) throw new Error(actorId + ' not valid for ' + missionId);
  const origRandom = Math.random;
  const actorIdx = mission.validActors.indexOf(actorId);
  let seen = false;
  Math.random = function() {
    if (!seen) { seen = true; return actorIdx / mission.validActors.length + 0.001; }
    return origRandom();
  };
  // Force rapid pacing so gate() uses setTimeout which we can flush
  global.STATE.difficulty = difficulty;
  global.STATE.speed = 'rapid';
  try {
    global.beginGame(missionId);
  } finally {
    Math.random = origRandom;
  }
  global._flushTimers();

  // Hard safety: force RAPID throughout
  global.STATE.speed = 'rapid';

  const MAX_ITER = 500;
  let iter = 0;
  let lastPhase = null, stuckCount = 0;
  while (global.STATE.phase !== 'WIN' && global.STATE.phase !== 'LOSE' && iter < MAX_ITER) {
    iter++;
    const curPhase = global.STATE.phase + '-' + global.STATE.round;
    if (curPhase === lastPhase) {
      stuckCount++;
      if (stuckCount > 20) {
        // Auto-release any gate
        if (global.STATE.gateCallback) { global.releaseGate(); global._flushTimers(); stuckCount = 0; continue; }
        break;
      }
    } else { stuckCount = 0; lastPhase = curPhase; }

    if (global.STATE.phase === 'INTEL') {
      global.startPlanPhase();
      global._flushTimers();
      continue;
    }
    if (global.STATE.phase === 'PLAN') {
      const S = global.STATE;
      const vigil = S.agents.findIndex(a => a.id === 'VIGIL');
      const wraith = S.agents.findIndex(a => a.id === 'WRAITH');
      const anchor = S.agents.findIndex(a => a.id === 'ANCHOR');
      const scan = S.agents[vigil].actions.find(a => a.id === 'scan');
      const trace = S.agents[vigil].actions.find(a => a.id === 'trace');
      const disrupt = S.agents[wraith].actions.find(a => a.id === 'disrupt');
      const sever = S.agents[wraith].actions.find(a => a.id === 'sever');
      const harden = S.agents[anchor].actions.find(a => a.id === 'harden');

      if (S.c2Revealed && S.actionPointsUsed + sever.cost <= S.actionBudget) {
        S.achGatePassed = true;
        global.queueAction(wraith, sever, null);
      }
      S.threats.filter(t => t.revealed).forEach(t => {
        if (S.actionPointsUsed + disrupt.cost <= S.actionBudget) {
          global.queueAction(wraith, disrupt, t.target);
        }
      });
      const unrevealed = S.threats.filter(t => !t.revealed);
      if (unrevealed.length > 0 && S.actionPointsUsed + scan.cost <= S.actionBudget) {
        global.queueAction(vigil, scan, unrevealed[0].target);
      }
      if (!S.c2Revealed && S.actionPointsUsed + trace.cost <= S.actionBudget) {
        global.queueAction(vigil, trace, null);
      }
      const hv = S.nodes.find(n => (n.type === 'control' || n.id === 'TOS' || n.id === 'MCC' || n.id === 'CTRL') && n.state !== 'compromised');
      if (hv && S.actionPointsUsed + harden.cost <= S.actionBudget) {
        global.queueAction(anchor, harden, hv.id);
      }
      // Something queued? Execute. Nothing queued? Burn turn by scanning random.
      if (S.plannedActions.length === 0) {
        const anyNode = S.nodes.find(n => n.state !== 'compromised');
        if (anyNode) global.queueAction(vigil, scan, anyNode.id);
      }
      global.startResolvePhase();
      global._flushTimers();
      continue;
    }
    // RESOLVE / CONSEQ — flush and loop
    global._flushTimers();
    if (global.STATE.gateCallback) global.releaseGate();
    global._flushTimers();
  }
  // Final flush
  global._flushTimers();
  return {
    finalPhase: global.STATE.phase,
    round: global.STATE.round,
    iter,
    snap: require('./harness.js').snapshot(),
    debriefCalled: global._debriefCalled,
  };
}

// Try one run
const result = play('BLACKFROST', 'CRYO', 'operator');
console.log('phase=' + result.finalPhase, 'round=' + result.round, 'iter=' + result.iter);
console.log('compromised=' + result.snap.compromised, 'c2Rev=' + result.snap.c2Revealed, 'c2Sev=' + result.snap.c2Severed);
console.log('combos=' + result.snap.combosTriggered, 'ttps=' + result.snap.observedTTPs);
console.log('actor=' + result.snap.activeActor + ' revealed=' + result.snap.actorRevealed);
console.log('debrief:', result.debriefCalled);
