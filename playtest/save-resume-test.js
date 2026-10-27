require('./harness.js');

const origRandom = Math.random;
let callN = 0;
Math.random = () => {
  callN++;
  if (callN === 1) return 0.001; // first actor
  return 0.5;
};

global.STATE.difficulty = 'operator';
global.STATE.speed = 'rapid';
global.beginGame('BLACKFROST');
global._flushTimers();
global.STATE.speed = 'rapid';

// Advance a few rounds
function doRound() {
  const S = global.STATE;
  if (S.phase === 'INTEL') { global.startPlanPhase(); global._flushTimers(); }
  if (S.phase === 'PLAN') {
    const vigil = S.agents.findIndex(a => a.id === 'VIGIL');
    const scan = S.agents[vigil].actions.find(a => a.id === 'scan');
    if (S.nodes[0]) global.queueAction(vigil, scan, S.nodes[0].id);
    global.startResolvePhase();
    global._flushTimers();
    if (global.STATE.gateCallback) { global.releaseGate(); global._flushTimers(); }
  }
}
for (let i = 0; i < 6; i++) doRound();

console.log('Before save: round=' + global.STATE.round, 'c2Revealed=' + global.STATE.c2Revealed, 'observedTTPs=' + Object.keys(global.STATE.observedTTPs).length, 'actor=' + global.STATE.activeActor.id);

// saveRun() is called automatically on round advance — check localStorage
const savedKey = 'joshua_protocol.save.v1';
const savedRaw = require('./harness.js').localStorageStore[savedKey];
console.log('Save exists:', !!savedRaw);
if (savedRaw) {
  const saved = JSON.parse(savedRaw);
  console.log('Save payload: mission=' + saved.mission, 'round=' + saved.round, 'actor=' + saved.activeActorId, 'ttps=' + Object.keys(saved.observedTTPs||{}).length, 'build=' + saved.build);
}

// Simulate tab close + resume: reset STATE and call resumeSavedRun
const savedBeforeReset = JSON.parse(savedRaw);
// Reset essential state
global.STATE.phase = 'BOOT';
global.STATE.mission = null;
global.STATE.round = 1;
global.STATE.c2Revealed = false;
global.STATE.observedTTPs = {};
global.STATE.threats = [];
global.STATE.nodes = [];

console.log('\nAfter reset: phase=' + global.STATE.phase + ', mission=' + global.STATE.mission);

// Resume
global.resumeSavedRun(savedBeforeReset);
global._flushTimers();

console.log('After resume: round=' + global.STATE.round, 'c2Revealed=' + global.STATE.c2Revealed, 'observedTTPs=' + Object.keys(global.STATE.observedTTPs).length, 'actor=' + global.STATE.activeActor.id);
console.log('Nodes count:', global.STATE.nodes.length);
console.log('Phase:', global.STATE.phase);

// Verify the resumed state matches what we had
const beforeTTPs = Object.keys(savedBeforeReset.observedTTPs || {}).length;
const afterTTPs = Object.keys(global.STATE.observedTTPs).length;
console.log('TTP count match:', beforeTTPs === afterTTPs ? '✓' : '✗ ('+beforeTTPs+' vs '+afterTTPs+')');
console.log('Round match:', savedBeforeReset.round === global.STATE.round ? '✓' : '✗');
console.log('Actor match:', savedBeforeReset.activeActorId === global.STATE.activeActor.id ? '✓' : '✗');
console.log('C2 node match:', savedBeforeReset.c2Node === global.STATE.c2Node ? '✓' : '✗');
Math.random = origRandom;
