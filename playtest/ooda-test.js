require('./harness.js');

let oodaFires = [];
global.maybeShowOODAReflection = (triggerId, content) => {
  oodaFires.push({ triggerId, title: content.title });
};

Math.random = () => 0.3;
global.STATE.difficulty = 'novice';
global.STATE.speed = 'rapid';
global.beginGame('BLACKFROST');
global._flushTimers();
global.STATE.speed = 'rapid';
global.STATE.reasoningShown = {};  // ensure fresh

// Force a C2 reveal via TRACE
while (global.STATE.phase !== 'PLAN') {
  if (global.STATE.phase === 'INTEL') { global.startPlanPhase(); global._flushTimers(); continue; }
  global._flushTimers();
  if (global.STATE.gateCallback) global.releaseGate();
  global._flushTimers();
}

// Give trace high chance to land
global.STATE.threats = [{target: 'SUB-A', path: ['GEN-2','SUB-A'], phase: 1, techniqueId: 'T1566.001', revealed: true, history: ['T1566.001'], spawnRound: 1}];
const vigil = global.STATE.agents.findIndex(a => a.id === 'VIGIL');
const trace = global.STATE.agents[vigil].actions.find(a => a.id === 'trace');
// Keep trying until TRACE succeeds
let tries = 0;
while (!global.STATE.c2Revealed && tries < 20) {
  global.STATE.plannedActions = [];
  global.STATE.actionPointsUsed = 0;
  global.queueAction(vigil, trace, null);
  global.startResolvePhase();
  global._flushTimers();
  if (global.STATE.gateCallback) global.releaseGate();
  global._flushTimers();
  tries++;
  if (global.STATE.phase !== 'PLAN') {
    while (global.STATE.phase !== 'PLAN' && global.STATE.phase !== 'WIN' && global.STATE.phase !== 'LOSE') {
      if (global.STATE.phase === 'INTEL') { global.startPlanPhase(); global._flushTimers(); continue; }
      global._flushTimers();
      if (global.STATE.gateCallback) global.releaseGate();
      global._flushTimers();
    }
  }
  if (global.STATE.phase === 'WIN' || global.STATE.phase === 'LOSE') break;
}
console.log('Tries until C2 revealed:', tries, '/ c2Revealed:', global.STATE.c2Revealed);
console.log('OODA fires:', oodaFires.map(f => f.triggerId).join(','));
console.log('Has first_c2_reveal:', oodaFires.some(f => f.triggerId === 'first_c2_reveal') ? '✓' : '✗');
console.log('All triggers:', oodaFires);
