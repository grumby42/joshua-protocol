require('./harness.js');

// Trigger each of the 5 named combos deliberately and verify STATE.combosTriggered captures it.
const origRandom = Math.random;
Math.random = () => 0.3;

global.STATE.difficulty = 'novice';
global.STATE.speed = 'rapid';
global.beginGame('BLACKFROST');
global._flushTimers();
global.STATE.speed = 'rapid';
global.STATE.achGatePassed = true;  // skip ACH

function fresh() {
  // Advance to PLAN phase
  while (global.STATE.phase !== 'PLAN') {
    if (global.STATE.phase === 'INTEL') { global.startPlanPhase(); global._flushTimers(); continue; }
    global._flushTimers();
    if (global.STATE.gateCallback) global.releaseGate();
    global._flushTimers();
  }
  global.STATE.plannedActions = [];
  global.STATE.actionPointsUsed = 0;
}

function queue(agentId, actId, target) {
  const S = global.STATE;
  const ai = S.agents.findIndex(a => a.id === agentId);
  const act = S.agents[ai].actions.find(a => a.id === actId);
  global.queueAction(ai, act, target);
}

function run() {
  const before = (global.STATE.combosTriggered || []).map(c => c.comboId);
  global.startResolvePhase();
  global._flushTimers();
  if (global.STATE.gateCallback) global.releaseGate();
  global._flushTimers();
  const after = (global.STATE.combosTriggered || []).map(c => c.comboId);
  return after.filter(c => !before.includes(c));
}

// Test 1: RECON STRIKE (SCAN + DISRUPT same target). Need a threat there.
// Force a threat on a known node
fresh();
global.STATE.threats = [{target: 'SUB-A', path: ['GEN-2','SUB-A'], phase: 1, techniqueId: 'T1566.001', revealed: false, history: ['T1566.001'], spawnRound: 1}];
queue('VIGIL', 'scan', 'SUB-A');
queue('WRAITH', 'disrupt', 'SUB-A');
let fired = run();
console.log('RECON STRIKE (SCAN+DISRUPT same target):', fired.includes('RECON_STRIKE') ? '✓' : '✗ ' + fired.join(','));

// Test 2: BULWARK (2x HARDEN same target)
fresh();
queue('ANCHOR', 'harden', 'CTRL');
// Second HARDEN requires another anchor — but AP allows it since v0.4 allows multi-action per agent
queue('ANCHOR', 'harden', 'CTRL');
fired = run();
console.log('BULWARK (2x HARDEN same target):', fired.includes('BULWARK') ? '✓' : '✗ ' + fired.join(','));

// Test 3: TRIANGULATE (SCAN + TRACE this round)
fresh();
global.STATE.threats = [{target: 'SUB-A', path: ['GEN-2','SUB-A'], phase: 1, techniqueId: 'T1566.001', revealed: true, history: ['T1566.001'], spawnRound: 1}];
queue('VIGIL', 'scan', 'SUB-A');
queue('VIGIL', 'trace', null);
fired = run();
console.log('TRIANGULATE (SCAN+TRACE):', fired.includes('TRIANGULATE') ? '✓' : '✗ ' + fired.join(','));

// Test 4: COVERED RESTORE (DISRUPT + RESTORE same target)
fresh();
global.STATE.threats = [{target: 'SUB-A', path: ['GEN-2','SUB-A'], phase: 1, techniqueId: 'T1566.001', revealed: true, history: ['T1566.001'], spawnRound: 1}];
const subA = global.STATE.nodes.find(n => n.id === 'SUB-A');
subA.state = 'attacked';
queue('WRAITH', 'disrupt', 'SUB-A');
queue('ANCHOR', 'restore', 'SUB-A');
fired = run();
console.log('COVERED RESTORE (DISRUPT+RESTORE same target):', fired.includes('COVERED_RESTORE') ? '✓' : '✗ ' + fired.join(','));

// Test 5: KILL BOX (DISRUPT on adjacent nodes)
fresh();
// Find two adjacent nodes in the energy grid
const n0 = global.STATE.nodes.find(n => n.id === 'CTRL');
const adj = (function() {
  const set = new Set();
  global.STATE.links.forEach(([a,b]) => { if (a === 'CTRL') set.add(b); if (b === 'CTRL') set.add(a); });
  return [...set];
})();
console.log('  CTRL adjacents:', adj.join(','));
// Set threats so DISRUPT isn't wasted
global.STATE.threats = [
  {target: 'CTRL', path:['GEN-2','CTRL'], phase:1, techniqueId:'T1566.001', revealed:true, history:['T1566.001'], spawnRound: 1},
  {target: adj[0], path:['GEN-2', adj[0]], phase:1, techniqueId:'T1566.001', revealed:true, history:['T1566.001'], spawnRound: 1},
];
queue('WRAITH', 'disrupt', 'CTRL');
queue('WRAITH', 'disrupt', adj[0]);
fired = run();
console.log('KILL BOX (DISRUPT adjacent):', fired.includes('KILL_BOX') ? '✓' : '✗ ' + fired.join(','));

Math.random = origRandom;
