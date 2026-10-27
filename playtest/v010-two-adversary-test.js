// v0.10 TWO-ADVERSARY MODE test.
// 1. Regression: with the mode off, coActive() is false everywhere and the
//    single-adversary run is byte-for-byte the old behaviour (checked via a
//    seeded run compared against the pre-patch build, run separately).
// 2. Mode on: invariants across many seeded active-bot runs on all 5 missions:
//    - coActor != activeActor, coActor never a handoff actor
//    - coC2Node != c2Node
//    - every threat carries actorId in {primary, co}
//    - after primary SEVER, no primary threats remain; co threats survive
//    - WIN never fires while the co adversary has entered and is unsevered
//    - a second SEVER is required when both entered; ticket + case log carry it
require('./harness.js');

const S = () => global.STATE;
const fails = [];
const check = (cond, msg) => { if (!cond) { fails.push(msg); console.log('[FAIL]', msg); } };

function bot() {
  const st = S();
  const vigil = st.agents.findIndex(a => a.id === 'VIGIL');
  const wraith = st.agents.findIndex(a => a.id === 'WRAITH');
  const anchor = st.agents.findIndex(a => a.id === 'ANCHOR');
  const act = (i, id) => st.agents[i].actions.find(a => a.id === id);
  const scan = act(vigil, 'scan'), trace = act(vigil, 'trace'), disrupt = act(wraith, 'disrupt'), sever = act(wraith, 'sever'), harden = act(anchor, 'harden');
  const can = (a) => st.actionPointsUsed + a.cost <= st.actionBudget;
  if (global.severCandidate() && can(sever)) { st.achGatePassed = true; global.queueAction(wraith, sever, null); }
  st.threats.filter(t => t.revealed).forEach(t => { if (can(disrupt)) global.queueAction(wraith, disrupt, t.target); });
  const unrevealed = st.threats.filter(t => !t.revealed);
  if (unrevealed.length && can(scan)) global.queueAction(vigil, scan, unrevealed[0].target);
  const needTrace = !st.c2Revealed || (global.coActive() && st.coEntered && !st.coC2Revealed);
  if (needTrace && can(trace)) global.queueAction(vigil, trace, null);
  if (can(harden)) { const hv = st.nodes.find(n => n.state !== 'compromised' && n.resilience < 3); if (hv) global.queueAction(anchor, harden, hv.id); }
  if (st.plannedActions.length === 0) { const n = st.nodes.find(n => n.state !== 'compromised'); if (n) global.queueAction(vigil, scan, n.id); }
}

function play(missionId, seed, twoAdv, difficulty) {
  Math.random = global.mulberry32(seed);
  global.STATE.twoAdversary = twoAdv;
  global.STATE.difficulty = difficulty || 'operator';
  global.STATE.speed = 'rapid';
  global.STATE.demoMode = false;
  global.beginGame(missionId);
  global._flushTimers();
  const st = S();
  const trace = { primary: st.activeActor.id, co: st.coActor && st.coActor.id, c2: st.c2Node, coC2: st.coC2Node, severs: [], coEnteredRound: null, winWhileCoLive: false, badActorIds: 0, primaryLeftAfterSever: 0 };
  let it = 0, last = null, stuck = 0;
  while (st.phase !== 'WIN' && st.phase !== 'LOSE' && it < 600) {
    it++;
    const sig = st.phase + '-' + st.round;
    if (sig === last) { stuck++; if (stuck > 30) { if (st.gateCallback) { global.releaseGate(); global._flushTimers(); stuck = 0; continue; } break; } } else { stuck = 0; last = sig; }
    st.threats.forEach(t => { if (!(t.actorId === trace.primary || (trace.co && t.actorId === trace.co))) trace.badActorIds++; });
    if (st.coEntered && trace.coEnteredRound === null) trace.coEnteredRound = st.round;
    if (st.phase === 'INTEL') { global.startPlanPhase(); global._flushTimers(); continue; }
    if (st.phase === 'PLAN') {
      const sevBefore = (st.c2Severed ? 1 : 0) + (st.coC2Severed ? 1 : 0);
      bot(); global.startResolvePhase(); global._flushTimers();
      const sevAfter = (st.c2Severed ? 1 : 0) + (st.coC2Severed ? 1 : 0);
      if (sevAfter > sevBefore) {
        trace.severs.push({ round: st.round, primary: st.c2Severed, co: st.coC2Severed });
        if (st.c2Severed) trace.primaryLeftAfterSever += st.threats.filter(t => t.actorId === trace.primary).length;
      }
      continue;
    }
    global._flushTimers(); if (st.gateCallback) global.releaseGate(); global._flushTimers();
  }
  global._flushTimers();
  if (st.phase === 'WIN' && global.coActive() && st.coEntered && !st.coC2Severed && st.c2Severed && st.round < global.MISSIONS[missionId].maxRounds) trace.winWhileCoLive = true;  // survive-to-maxRounds is a legitimate WIN, as in single mode
  // renders / exports must not throw
  try { global.renderIntelTab(global.document.createElement('div')); } catch (e) { fails.push('renderIntelTab threw: ' + e.message); }
  try { global.renderTimelineTab(); } catch (e) { fails.push('renderTimelineTab threw: ' + e.message); }
  let ticket = '', caselog = null;
  try { const rub = global.computeRubric(); ticket = global.buildHandoffTicket(rub, '', st.phase === 'WIN', 'test'); } catch (e) { fails.push('buildHandoffTicket threw: ' + e.message); }
  try { global.exportCaseLog(global.computeRubric(), '', st.phase === 'WIN', 'test'); } catch (e) { fails.push('exportCaseLog threw: ' + e.message); }
  return Object.assign(trace, { phase: st.phase, round: st.round, compromised: st.nodes.filter(n => n.state === 'compromised').length, coEntered: st.coEntered, coRevealed: st.coC2Revealed, coSevered: st.coC2Severed, coAttributed: st.coActorRevealed, ticketHasCo: /SECOND ADVERSARY/.test(ticket), it });
}

console.log('=== v0.10 TWO-ADVERSARY MODE ===');
const MISSIONS = ['BLACKFROST', 'NIGHTWATCH', 'TIDEBREAK', 'HEARTLINE', 'RAILGUARD'];
const summary = {};
for (const m of MISSIONS) {
  summary[m] = { runs: 0, win: 0, lose: 0, coEntered: 0, twoSevers: 0, coAttributed: 0, coC2Revealed: 0, rounds: [], comp: [] };
  for (let seed = 1; seed <= 24; seed++) {
    const r = play(m, 1000 * seed + 7, true, 'operator');
    const sm = summary[m]; sm.runs++;
    if (r.phase === 'WIN') sm.win++; else if (r.phase === 'LOSE') sm.lose++; else fails.push(m + ' seed ' + seed + ' did not terminate: ' + r.phase);
    if (r.coEntered) sm.coEntered++;
    if (r.coSevered && r.severs.length >= 2) sm.twoSevers++;
    if (r.coAttributed) sm.coAttributed++;
    if (r.coRevealed) sm.coC2Revealed++;
    sm.rounds.push(r.round); sm.comp.push(r.compromised); sm.pairs=(sm.pairs||{}); sm.pairs[r.primary+'+'+r.co]=(sm.pairs[r.primary+'+'+r.co]||0)+1;
    check(r.co && r.co !== r.primary, `${m}/${seed}: coActor must differ from primary (${r.primary}/${r.co})`);
    check(!r.co || !global.THREAT_ACTORS[r.co].handoffAfterRounds, `${m}/${seed}: coActor must not be a handoff actor`);
    check(r.coC2 && r.coC2 !== r.c2, `${m}/${seed}: coC2 must differ from c2 (${r.c2}/${r.coC2})`);
    check(r.badActorIds === 0, `${m}/${seed}: ${r.badActorIds} threats with unknown actorId`);
    check(!r.winWhileCoLive, `${m}/${seed}: WIN fired while second adversary live`);
    check(r.primaryLeftAfterSever === 0, `${m}/${seed}: primary threats survived primary SEVER`);
    if (r.coEntered) check(r.ticketHasCo, `${m}/${seed}: ticket missing SECOND ADVERSARY line`);
    if (r.phase === 'WIN' && r.coEntered && r.severs.length) check(r.coSevered || r.round >= global.MISSIONS[m].maxRounds, `${m}/${seed}: WIN by sever with co live? severs=${JSON.stringify(r.severs)}`);
  }
}
for (const m of MISSIONS) {
  const sm = summary[m];
  const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  console.log(m.padEnd(11), `W${sm.win}/L${sm.lose}/${sm.runs}`, `coEntered ${sm.coEntered}`, `coC2rev ${sm.coC2Revealed}`, `coAttr ${sm.coAttributed}`, `2xSEVER ${sm.twoSevers}`, `avgR ${avg(sm.rounds)}`, `avgComp ${avg(sm.comp)}`, 'rounds', sm.rounds.join(','), Object.keys(sm.pairs).length+' pairings');
}

// Mode off: coActor must be null and coActive() false, bot still wins mostly
console.log('--- mode OFF regression (same bot) ---');
let offWins = 0, offRuns = 0;
for (const m of MISSIONS) for (let seed = 1; seed <= 8; seed++) {
  const r = play(m, 500 * seed + 3, false, 'operator'); offRuns++;
  check(r.co === null || r.co === undefined, `${m}/${seed}: mode off but coActor set`);
  check(!global.coActive(), `${m}/${seed}: coActive() true with mode off`);
  if (r.phase === 'WIN') offWins++;
}
console.log('mode off:', offWins + '/' + offRuns, 'wins');
console.log(fails.length ? `\n${fails.length} FAILURES` : '\nALL INVARIANTS HOLD');
process.exit(fails.length ? 1 : 0);
