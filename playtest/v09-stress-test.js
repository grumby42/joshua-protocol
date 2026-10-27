// v0.9 stress-test: verify new actor set
// - CRYO plays as slow-dwell-fast-impact
// - IRONHAZE uses DDoS techniques
// - GHOSTWIRE dwell-mode balances
// - HOLLOWKEY plays as compromised-cred actor
// - WARDEN hands off to a successor at round 4
require('./harness.js');

const results = { ok: [], warn: [], fail: [] };
const log = (bucket, msg) => { results[bucket].push(msg); console.log('[' + bucket.toUpperCase() + ']', msg); };

function play(missionId, actorId, difficulty, mode) {
  const mission = global.MISSIONS[missionId];
  if (!mission.validActors.includes(actorId)) throw new Error(actorId + ' not valid for ' + missionId);
  const origRandom = Math.random;
  const actorIdx = mission.validActors.indexOf(actorId);
  let seen = false;
  Math.random = function() {
    if (!seen) { seen = true; return actorIdx / mission.validActors.length + 0.001; }
    return origRandom();
  };
  global.STATE.difficulty = difficulty;
  global.STATE.speed = 'rapid';
  try {
    global.beginGame(missionId);
  } finally {
    Math.random = origRandom;
  }
  global._flushTimers();
  global.STATE.speed = 'rapid';

  const MAX_ITER = 500;
  let iter = 0;
  let lastPhase = null, stuckCount = 0;
  let handoffDetected = false;
  let handoffFromActor = actorId;
  let handoffToActor = null;
  const ttpsSeen = new Set();

  while (global.STATE.phase !== 'WIN' && global.STATE.phase !== 'LOSE' && iter < MAX_ITER) {
    iter++;
    const curPhase = global.STATE.phase + '-' + global.STATE.round;
    if (curPhase === lastPhase) {
      stuckCount++;
      if (stuckCount > 20) {
        if (global.STATE.gateCallback) { global.releaseGate(); global._flushTimers(); stuckCount = 0; continue; }
        break;
      }
    } else { stuckCount = 0; lastPhase = curPhase; }

    // record TTPs (STATE.observedTTPs is a {tid: count} map)
    Object.keys(global.STATE.observedTTPs || {}).forEach(t => ttpsSeen.add(t));

    // detect handoff
    if (global.STATE.handoffFired && !handoffDetected) {
      handoffDetected = true;
      handoffToActor = global.STATE.activeActor && global.STATE.activeActor.id;
    }

    if (global.STATE.phase === 'INTEL') {
      global.startPlanPhase(); global._flushTimers(); continue;
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

      if (mode !== 'passive') {
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
        if (S.plannedActions.length === 0) {
          const anyNode = S.nodes.find(n => n.state !== 'compromised');
          if (anyNode) global.queueAction(vigil, scan, anyNode.id);
        }
      } else {
        // passive mode: do nothing — just advance
      }
      global.startResolvePhase(); global._flushTimers(); continue;
    }
    global._flushTimers();
    if (global.STATE.gateCallback) global.releaseGate();
    global._flushTimers();
  }
  global._flushTimers();
  return {
    finalPhase: global.STATE.phase,
    round: global.STATE.round,
    iter,
    compromised: global.STATE.nodes.filter(n => n.state === 'compromised').length,
    nodeCount: global.STATE.nodes.length,
    c2Revealed: global.STATE.c2Revealed,
    actorRevealed: global.STATE.actorRevealed,
    activeActor: global.STATE.activeActor && global.STATE.activeActor.id,
    handoffFired: !!global.STATE.handoffFired,
    handoffFromActor,
    handoffToActor,
    ttps: Array.from(ttpsSeen),
  };
}

// Reset state helper — reload harness each run isn't necessary, resetting STATE is
function resetAndRun(mission, actor, diff, mode) {
  // beginGame does the full reset
  return play(mission, actor, diff, mode);
}

console.log('\n=== v0.9 ACTOR SMOKE TEST ===\n');

// 1. CRYO on BLACKFROST — should see slow_dwell_fast_impact
console.log('--- Test 1: CRYO on BLACKFROST, operator, active play ---');
try {
  const r = resetAndRun('BLACKFROST', 'CRYO', 'operator', 'active');
  console.log('  result:', r.finalPhase, 'round=' + r.round, 'compromised=' + r.compromised + '/' + r.nodeCount);
  console.log('  TTPs seen:', r.ttps.filter(t => ['T1486','T1490','T1657','T0883','T1566.001'].includes(t)).join(', ') || '(none of expected)');
  const hasImpact = r.ttps.includes('T1486') || r.ttps.includes('T1490');
  if (hasImpact) log('ok', 'CRYO fired impact TTP (T1486/T1490)');
  else log('warn', 'CRYO completed without firing T1486/T1490 — tempo may be too slow for 500-iter cap');
} catch (e) {
  log('fail', 'CRYO run threw: ' + e.message);
}

// 2. IRONHAZE on BLACKFROST — should use DDoS techniques
console.log('\n--- Test 2: IRONHAZE on BLACKFROST, operator, active play ---');
try {
  const r = resetAndRun('BLACKFROST', 'IRONHAZE', 'operator', 'active');
  console.log('  result:', r.finalPhase, 'round=' + r.round, 'compromised=' + r.compromised + '/' + r.nodeCount);
  const ddosTTPs = r.ttps.filter(t => ['T1498','T1498.001','T1498.002','T1499','T1491.001','T1531'].includes(t));
  console.log('  DDoS/avail TTPs seen:', ddosTTPs.join(', ') || '(none)');
  if (ddosTTPs.length > 0) log('ok', 'IRONHAZE fired DDoS/availability techniques');
  else log('warn', 'IRONHAZE did not fire any DDoS tech in this run — may be RNG');
} catch (e) {
  log('fail', 'IRONHAZE run threw: ' + e.message);
}

// 3. GHOSTWIRE on BLACKFROST — insider dwell mode, PASSIVE (should lose)
console.log('\n--- Test 3: GHOSTWIRE on BLACKFROST, operator, PASSIVE play (should lose by dwell) ---');
try {
  const r = resetAndRun('BLACKFROST', 'GHOSTWIRE', 'operator', 'passive');
  console.log('  result:', r.finalPhase, 'round=' + r.round, 'compromised=' + r.compromised + '/' + r.nodeCount);
  if (r.finalPhase === 'LOSE') log('ok', 'GHOSTWIRE dwell-mode loses passive player (fixes v0.8 exploit)');
  else if (r.finalPhase === 'WIN') log('fail', 'GHOSTWIRE still winnable by passive play — dwell mode not active');
  else log('warn', 'GHOSTWIRE run hit iter cap at phase ' + r.finalPhase);
} catch (e) {
  log('fail', 'GHOSTWIRE run threw: ' + e.message);
}

// 4. HOLLOWKEY on BLACKFROST — new actor smoke test
console.log('\n--- Test 4: HOLLOWKEY on BLACKFROST, operator, active play ---');
try {
  const r = resetAndRun('BLACKFROST', 'HOLLOWKEY', 'operator', 'active');
  console.log('  result:', r.finalPhase, 'round=' + r.round, 'compromised=' + r.compromised + '/' + r.nodeCount);
  log('ok', 'HOLLOWKEY run completed (actor exists in catalog + mission pool)');
  const credTTPs = r.ttps.filter(t => ['T1078','T1555.003','T1110','T1021.001','T1087.001'].includes(t));
  console.log('  credential-abuse TTPs seen:', credTTPs.join(', ') || '(none)');
} catch (e) {
  log('fail', 'HOLLOWKEY run threw: ' + e.message);
}

// 5. WARDEN on BLACKFROST — must hand off at round 4
console.log('\n--- Test 5: WARDEN on BLACKFROST, operator, active play (expect handoff at r4) ---');
try {
  const r = resetAndRun('BLACKFROST', 'WARDEN', 'operator', 'active');
  console.log('  result:', r.finalPhase, 'round=' + r.round, 'compromised=' + r.compromised + '/' + r.nodeCount);
  console.log('  handoffFired=' + r.handoffFired, 'from=' + r.handoffFromActor, 'to=' + r.handoffToActor);
  if (r.handoffFired) {
    if (r.handoffToActor === 'CRYO' || r.handoffToActor === 'HOLLOWKEY') {
      log('ok', 'WARDEN handed off to successor: ' + r.handoffToActor);
    } else {
      log('warn', 'WARDEN handoff fired but successor unexpected: ' + r.handoffToActor);
    }
  } else if (r.round <= 3) {
    log('warn', 'WARDEN run ended before round 4 (handoff round) — ' + r.finalPhase + ' at round ' + r.round);
  } else {
    log('fail', 'WARDEN reached round > 3 but handoff did not fire');
  }
} catch (e) {
  log('fail', 'WARDEN run threw: ' + e.message);
}

// 6. HOLLOWKEY on NIGHTWATCH + TIDEBREAK — pool membership check
console.log('\n--- Test 6: HOLLOWKEY on NIGHTWATCH + TIDEBREAK (pool membership) ---');
['NIGHTWATCH', 'TIDEBREAK'].forEach(m => {
  try {
    const r = resetAndRun(m, 'HOLLOWKEY', 'operator', 'active');
    log('ok', 'HOLLOWKEY plays on ' + m + ': ' + r.finalPhase + ' round=' + r.round);
  } catch (e) {
    log('fail', 'HOLLOWKEY on ' + m + ' threw: ' + e.message);
  }
});

// 7. CRYO double extortion — should log exfil (we can only check that doubleExtortion flag exists)
console.log('\n--- Test 7: CRYO config check (doubleExtortion, tempo flags) ---');
const cryoCfg = global.THREAT_ACTORS && global.THREAT_ACTORS.CRYO;
if (cryoCfg) {
  if (cryoCfg.tempo === 'slow_dwell_fast_impact') log('ok', 'CRYO tempo = slow_dwell_fast_impact');
  else log('fail', 'CRYO tempo = ' + cryoCfg.tempo);
  if (cryoCfg.doubleExtortion === true) log('ok', 'CRYO doubleExtortion = true');
  else log('fail', 'CRYO doubleExtortion = ' + cryoCfg.doubleExtortion);
  if (cryoCfg.dwellRoundsBeforeImpact === 2) log('ok', 'CRYO dwellRoundsBeforeImpact = 2');
  else log('warn', 'CRYO dwellRoundsBeforeImpact = ' + cryoCfg.dwellRoundsBeforeImpact);
} else log('fail', 'CRYO not in THREAT_ACTORS');

// 8. HOLLOWKEY config check
console.log('\n--- Test 8: HOLLOWKEY config check ---');
const hkCfg = global.THREAT_ACTORS && global.THREAT_ACTORS.HOLLOWKEY;
if (hkCfg) {
  log('ok', 'HOLLOWKEY in THREAT_ACTORS; archetype=' + hkCfg.archetype);
  if (hkCfg.archetype === 'compromised_credentials') log('ok', 'HOLLOWKEY archetype = compromised_credentials');
  else log('fail', 'HOLLOWKEY archetype wrong: ' + hkCfg.archetype);
} else log('fail', 'HOLLOWKEY not in THREAT_ACTORS');

// 9. WARDEN config check
console.log('\n--- Test 9: WARDEN config check ---');
const wCfg = global.THREAT_ACTORS && global.THREAT_ACTORS.WARDEN;
if (wCfg) {
  log('ok', 'WARDEN in THREAT_ACTORS; archetype=' + wCfg.archetype);
  if (wCfg.archetype === 'initial_access_broker') log('ok', 'WARDEN archetype = initial_access_broker');
  else log('fail', 'WARDEN archetype wrong: ' + wCfg.archetype);
  if (wCfg.handoffAfterRounds === 3) log('ok', 'WARDEN handoffAfterRounds = 3');
  else log('fail', 'WARDEN handoffAfterRounds = ' + wCfg.handoffAfterRounds);
  if (Array.isArray(wCfg.successorPool) && wCfg.successorPool.includes('CRYO') && wCfg.successorPool.includes('HOLLOWKEY')) {
    log('ok', 'WARDEN successorPool = ' + wCfg.successorPool.join(','));
  } else log('fail', 'WARDEN successorPool wrong: ' + JSON.stringify(wCfg.successorPool));
} else log('fail', 'WARDEN not in THREAT_ACTORS');

// 10. Mission pool check — all 3 missions have HOLLOWKEY
console.log('\n--- Test 10: Missions include HOLLOWKEY ---');
['BLACKFROST', 'NIGHTWATCH', 'TIDEBREAK'].forEach(m => {
  const mi = global.MISSIONS[m];
  if (mi && mi.validActors && mi.validActors.includes('HOLLOWKEY')) log('ok', m + ' includes HOLLOWKEY');
  else log('fail', m + ' missing HOLLOWKEY in validActors: ' + JSON.stringify(mi && mi.validActors));
});

// Summary
console.log('\n=== SUMMARY ===');
console.log('OK:   ' + results.ok.length);
console.log('WARN: ' + results.warn.length);
console.log('FAIL: ' + results.fail.length);
if (results.fail.length > 0) {
  console.log('\nFAILURES:');
  results.fail.forEach(f => console.log(' - ' + f));
}
process.exit(results.fail.length > 0 ? 1 : 0);
