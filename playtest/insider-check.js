require('./harness.js');

// GHOSTWIRE insider: dig into why passive wins.
// The insider's mechanical signature is: c2 is INSIDE the network, no external beaconing,
// win condition for defender = IDENTIFY + CONTAIN.
// But does the insider actively progress threats toward compromise?

function play(missionId, actorId, difficulty, seed) {
  const mission = global.MISSIONS[missionId];
  let state = seed; const prng = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; };
  const actorIdx = mission.validActors.indexOf(actorId);
  let callN = 0;
  Math.random = () => {
    callN++;
    if (callN === 1 && actorIdx >= 0) return actorIdx / mission.validActors.length + 0.001;
    return prng();
  };
  global.STATE.difficulty = difficulty;
  global.STATE.speed = 'rapid';
  global.beginGame(missionId);
  global._flushTimers();
  global.STATE.speed = 'rapid';

  const insights = [];
  const MAX = 100; let iter = 0;
  while (global.STATE.phase !== 'WIN' && global.STATE.phase !== 'LOSE' && iter < MAX) {
    iter++;
    if (global.STATE.phase === 'INTEL') {
      insights.push('R' + global.STATE.round + ': threats=' + global.STATE.threats.length + ', compromised=' + global.STATE.nodes.filter(n=>n.state==='compromised').length + ', dwell=' + (global.STATE.dwellRoundsAccumulated||0));
      global.startPlanPhase();
      global._flushTimers();
      continue;
    }
    if (global.STATE.phase === 'PLAN') {
      // PURE PASSIVE — queue literally nothing. Just advance.
      // But the game requires at least one action to execute. Force a no-op.
      const anchor = global.STATE.agents.findIndex(a => a.id === 'ANCHOR');
      const harden = global.STATE.agents[anchor].actions.find(a => a.id === 'harden');
      const randomNode = global.STATE.nodes[0];
      if (randomNode) global.queueAction(anchor, harden, randomNode.id);
      global.startResolvePhase();
      global._flushTimers();
      if (global.STATE.gateCallback) { global.releaseGate(); global._flushTimers(); }
      continue;
    }
    global._flushTimers();
    if (global.STATE.gateCallback) global.releaseGate();
    global._flushTimers();
  }
  return { insights, final: global.STATE.phase, round: global.STATE.round, actor: global.STATE.activeActor.id };
}

console.log('=== GHOSTWIRE on BLACKFROST novice ===');
const r1 = play('BLACKFROST', 'GHOSTWIRE', 'novice', 101);
r1.insights.forEach(i => console.log(' ', i));
console.log('Final: ' + r1.final + ' R' + r1.round);

console.log('\n=== TIDEMARK on TIDEBREAK novice ===');
const r2 = play('TIDEBREAK', 'TIDEMARK', 'novice', 101);
r2.insights.forEach(i => console.log(' ', i));
console.log('Final: ' + r2.final + ' R' + r2.round);

console.log('\n=== VOLTFORGE on BLACKFROST novice (contrast) ===');
const r3 = play('BLACKFROST', 'VOLTFORGE', 'novice', 101);
r3.insights.forEach(i => console.log(' ', i));
console.log('Final: ' + r3.final + ' R' + r3.round);

console.log('\n=== CRYO on BLACKFROST novice (contrast) ===');
const r4 = play('BLACKFROST', 'CRYO', 'novice', 101);
r4.insights.forEach(i => console.log(' ', i));
console.log('Final: ' + r4.final + ' R' + r4.round);
