require('./harness.js');

function play(missionId, actorId, difficulty, policyMode, seed) {
  const mission = global.MISSIONS[missionId];
  const origRandom = Math.random;
  let callN = 0;
  // Deterministic PRNG
  let state = seed || 1;
  const prng = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; };
  const actorIdx = mission.validActors.indexOf(actorId);
  Math.random = function() {
    callN++;
    if (callN === 1 && actorIdx >= 0) return actorIdx / mission.validActors.length + 0.001;
    return prng();
  };
  global.STATE.difficulty = difficulty;
  global.STATE.speed = 'rapid';
  global._debriefCalled = null;
  const errors = [];
  try {
    global.beginGame(missionId);
    global._flushTimers();
    global.STATE.speed = 'rapid';

    const MAX_ITER = 500;
    let iter = 0;
    let lastSig = null, stuckCount = 0;
    while (global.STATE.phase !== 'WIN' && global.STATE.phase !== 'LOSE' && iter < MAX_ITER) {
      iter++;
      const sig = global.STATE.phase + '-' + global.STATE.round + '-' + global.STATE.actionPointsUsed;
      if (sig === lastSig) { stuckCount++; if (stuckCount > 30) {
        if (global.STATE.gateCallback) { global.releaseGate(); global._flushTimers(); stuckCount = 0; continue; }
        errors.push('STUCK at ' + sig);
        break;
      }} else { stuckCount = 0; lastSig = sig; }

      if (global.STATE.phase === 'INTEL') { global.startPlanPhase(); global._flushTimers(); continue; }
      if (global.STATE.phase === 'PLAN') {
        planActions(policyMode);
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
    errors.push('EXCEPTION: ' + e.message);
  } finally {
    Math.random = origRandom;
  }
  return {
    missionId, actorId, difficulty, policyMode, seed,
    finalPhase: global.STATE.phase,
    round: global.STATE.round,
    actualActor: global.STATE.activeActor && global.STATE.activeActor.id,
    snap: require('./harness.js').snapshot(),
    debrief: global._debriefCalled,
    errors,
  };
}

function planActions(mode) {
  const S = global.STATE;
  const vigil = S.agents.findIndex(a => a.id === 'VIGIL');
  const wraith = S.agents.findIndex(a => a.id === 'WRAITH');
  const anchor = S.agents.findIndex(a => a.id === 'ANCHOR');
  const scan = S.agents[vigil].actions.find(a => a.id === 'scan');
  const trace = S.agents[vigil].actions.find(a => a.id === 'trace');
  const disrupt = S.agents[wraith].actions.find(a => a.id === 'disrupt');
  const sever = S.agents[wraith].actions.find(a => a.id === 'sever');
  const harden = S.agents[anchor].actions.find(a => a.id === 'harden');
  const restore = S.agents[anchor].actions.find(a => a.id === 'restore');

  if (mode === 'offensive') {
    // Prioritize SEVER > DISRUPT > SCAN > TRACE > HARDEN
    if (S.c2Revealed && S.actionPointsUsed + sever.cost <= S.actionBudget) {
      S.achGatePassed = true;
      global.queueAction(wraith, sever, null);
    }
    S.threats.filter(t => t.revealed).forEach(t => {
      if (S.actionPointsUsed + disrupt.cost <= S.actionBudget) global.queueAction(wraith, disrupt, t.target);
    });
    const unrev = S.threats.filter(t => !t.revealed);
    if (unrev.length > 0 && S.actionPointsUsed + scan.cost <= S.actionBudget) global.queueAction(vigil, scan, unrev[0].target);
    if (!S.c2Revealed && S.actionPointsUsed + trace.cost <= S.actionBudget) global.queueAction(vigil, trace, null);
  } else if (mode === 'defensive') {
    // Prioritize HARDEN high-value, RESTORE compromised, then detect
    const hv = S.nodes.find(n => (n.type === 'control' || n.id === 'TOS' || n.id === 'MCC' || n.id === 'CTRL') && n.state !== 'compromised');
    if (hv && S.actionPointsUsed + harden.cost <= S.actionBudget) global.queueAction(anchor, harden, hv.id);
    const comp = S.nodes.find(n => n.state === 'compromised');
    if (comp && S.actionPointsUsed + restore.cost <= S.actionBudget) global.queueAction(anchor, restore, comp.id);
    const unrev = S.threats.filter(t => !t.revealed);
    if (unrev.length > 0 && S.actionPointsUsed + scan.cost <= S.actionBudget) global.queueAction(vigil, scan, unrev[0].target);
  } else { // 'balanced'
    if (S.c2Revealed && S.actionPointsUsed + sever.cost <= S.actionBudget) {
      S.achGatePassed = true;
      global.queueAction(wraith, sever, null);
    }
    S.threats.filter(t => t.revealed).forEach(t => {
      if (S.actionPointsUsed + disrupt.cost <= S.actionBudget) global.queueAction(wraith, disrupt, t.target);
    });
    const unrev = S.threats.filter(t => !t.revealed);
    if (unrev.length > 0 && S.actionPointsUsed + scan.cost <= S.actionBudget) global.queueAction(vigil, scan, unrev[0].target);
    if (!S.c2Revealed && S.actionPointsUsed + trace.cost <= S.actionBudget) global.queueAction(vigil, trace, null);
    const hv = S.nodes.find(n => (n.type === 'control' || n.id === 'TOS' || n.id === 'MCC' || n.id === 'CTRL') && n.state !== 'compromised');
    if (hv && S.actionPointsUsed + harden.cost <= S.actionBudget) global.queueAction(anchor, harden, hv.id);
  }
  // Fallback: scan something to burn turn
  if (S.plannedActions.length === 0) {
    const any = S.nodes.find(n => n.state !== 'compromised');
    if (any) global.queueAction(vigil, scan, any.id);
  }
}

// Enumerate all mission x actor combos
const combos = [];
Object.values(global.MISSIONS).forEach(m => {
  m.validActors.forEach(a => {
    ['novice', 'operator', 'analyst'].forEach(d => {
      ['balanced', 'offensive', 'defensive'].forEach(policy => {
        combos.push({ m: m.id, a, d, policy });
      });
    });
  });
});

console.log('Total combinations:', combos.length);

const results = [];
const errors = [];
let i = 0;
for (const c of combos) {
  for (let seed = 1; seed <= 3; seed++) {
    i++;
    try {
      const r = play(c.m, c.a, c.d, c.policy, seed * 7919);
      results.push(r);
      if (r.errors && r.errors.length > 0) {
        errors.push({ ...c, seed, errs: r.errors });
      }
      if (r.finalPhase !== 'WIN' && r.finalPhase !== 'LOSE') {
        errors.push({ ...c, seed, errs: ['did not terminate: ' + r.finalPhase + ' @ R' + r.round] });
      }
      // Validate debrief got called
      if (!r.debrief && (r.finalPhase === 'WIN' || r.finalPhase === 'LOSE')) {
        errors.push({ ...c, seed, errs: ['debrief never called'] });
      }
    } catch (e) {
      errors.push({ ...c, seed, errs: ['throw: ' + e.message] });
    }
  }
}

console.log('Runs completed:', results.length);
console.log('Errors found:', errors.length);
if (errors.length > 0) {
  console.log('\nError sample (first 20):');
  errors.slice(0, 20).forEach(e => console.log(' ', JSON.stringify(e)));
}

// Win/loss distribution per mission × actor
const stats = {};
results.forEach(r => {
  const k = r.missionId + '/' + r.actualActor + '/' + r.difficulty;
  if (!stats[k]) stats[k] = { wins: 0, losses: 0, avgRound: 0, n: 0 };
  stats[k].n++;
  if (r.finalPhase === 'WIN') stats[k].wins++;
  else if (r.finalPhase === 'LOSE') stats[k].losses++;
  stats[k].avgRound += r.round;
});
Object.values(stats).forEach(s => s.avgRound = (s.avgRound / s.n).toFixed(1));

console.log('\nSample stats (first 15 keys sorted):');
Object.entries(stats).sort().slice(0, 15).forEach(([k, v]) => {
  console.log(' ', k, '→', v.wins + 'W/' + v.losses + 'L, avgR=' + v.avgRound, '(n=' + v.n + ')');
});
