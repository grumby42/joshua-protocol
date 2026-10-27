// v0.9 passive test — defender does nothing, let actor play out
require('./harness.js');

function play(missionId, actorId, difficulty, maxRounds) {
  const mission = global.MISSIONS[missionId];
  const origRandom = Math.random;
  const actorIdx = mission.validActors.indexOf(actorId);
  let seen = false;
  Math.random = function() {
    if (!seen) { seen = true; return actorIdx / mission.validActors.length + 0.001; }
    return origRandom();
  };
  global.STATE.difficulty = difficulty;
  global.STATE.speed = 'rapid';
  try { global.beginGame(missionId); } finally { Math.random = origRandom; }
  global._flushTimers();
  global.STATE.speed = 'rapid';
  const ttpsSeen = new Set();
  const actorTrace = [];
  const MAX = 500;
  let iter = 0, lastPhase = null, stuck = 0;
  let roundLog = [];

  while (global.STATE.phase !== 'WIN' && global.STATE.phase !== 'LOSE' && iter < MAX && global.STATE.round < (maxRounds || 10)) {
    iter++;
    const key = global.STATE.phase + '-' + global.STATE.round;
    if (key === lastPhase) {
      stuck++;
      if (stuck > 20) { if (global.STATE.gateCallback) { global.releaseGate(); global._flushTimers(); stuck = 0; continue; } break; }
    } else { stuck = 0; lastPhase = key; }
    Object.keys(global.STATE.observedTTPs || {}).forEach(t => ttpsSeen.add(t));
    actorTrace.push({ round: global.STATE.round, actor: global.STATE.activeActor && global.STATE.activeActor.id, handoff: !!global.STATE.handoffFired });

    if (global.STATE.phase === 'INTEL') { global.startPlanPhase(); global._flushTimers(); continue; }
    if (global.STATE.phase === 'PLAN') { global.startResolvePhase(); global._flushTimers(); continue; }
    global._flushTimers();
    if (global.STATE.gateCallback) global.releaseGate();
    global._flushTimers();
  }

  // Dedupe trace
  const dedupe = [];
  actorTrace.forEach(e => {
    const last = dedupe[dedupe.length - 1];
    if (!last || last.round !== e.round || last.actor !== e.actor || last.handoff !== e.handoff) dedupe.push(e);
  });

  return {
    finalPhase: global.STATE.phase,
    round: global.STATE.round,
    compromised: global.STATE.nodes.filter(n => n.state === 'compromised').length,
    nodeCount: global.STATE.nodes.length,
    activeActor: global.STATE.activeActor && global.STATE.activeActor.id,
    handoffFired: !!global.STATE.handoffFired,
    ttps: Array.from(ttpsSeen),
    actorTrace: dedupe,
  };
}

console.log('\n=== v0.9 PASSIVE ACTOR BEHAVIOR TEST ===\n');

const tests = [
  { m: 'BLACKFROST', a: 'CRYO',     exp: 'slow dwell for 2 rounds, then rapid encrypt T1486/T1490' },
  { m: 'BLACKFROST', a: 'IRONHAZE', exp: 'DDoS techniques (T1498 family), avail impact' },
  { m: 'BLACKFROST', a: 'GHOSTWIRE', exp: 'dwell to loss (fixes v0.8 passive exploit)' },
  { m: 'BLACKFROST', a: 'HOLLOWKEY', exp: 'credential-abuse pattern (T1078, T1555.003, T1021)' },
  { m: 'BLACKFROST', a: 'WARDEN',   exp: 'recon rounds 1-3, HANDOFF at round 4 to CRYO or HOLLOWKEY' },
];

let allOk = true;
tests.forEach(({ m, a, exp }) => {
  console.log('--- ' + a + ' on ' + m + ' (expect: ' + exp + ') ---');
  try {
    const r = play(m, a, 'operator', 10);
    console.log('  result: ' + r.finalPhase + ' at round ' + r.round + ', ' + r.compromised + '/' + r.nodeCount + ' compromised, finalActor=' + r.activeActor);
    console.log('  TTPs: ' + r.ttps.join(', '));
    console.log('  trace: ' + r.actorTrace.map(e => 'r' + e.round + ':' + e.actor + (e.handoff ? '*' : '')).join(' → '));

    // Expectation checks
    if (a === 'CRYO') {
      const hasImpact = r.ttps.includes('T1486') || r.ttps.includes('T1490');
      console.log('  check: impact TTP fired? ' + hasImpact);
      if (!hasImpact) allOk = false;
    }
    if (a === 'IRONHAZE') {
      const hasDDoS = r.ttps.some(t => ['T1498','T1498.001','T1498.002','T1499','T1491.001','T1531'].includes(t));
      console.log('  check: DDoS tech fired? ' + hasDDoS);
      if (!hasDDoS) allOk = false;
    }
    if (a === 'GHOSTWIRE') {
      console.log('  check: passive loses? ' + (r.finalPhase === 'LOSE'));
      if (r.finalPhase !== 'LOSE') allOk = false;
    }
    if (a === 'WARDEN') {
      console.log('  check: handoff fired? ' + r.handoffFired + ', final actor=' + r.activeActor);
      if (!r.handoffFired) allOk = false;
      else if (r.activeActor !== 'CRYO' && r.activeActor !== 'HOLLOWKEY') allOk = false;
    }
  } catch (e) {
    console.log('  THREW:', e.message);
    allOk = false;
  }
  console.log();
});

console.log(allOk ? '=== ALL PASSIVE CHECKS PASSED ===' : '=== SOME CHECKS FAILED ===');
process.exit(allOk ? 0 : 1);
