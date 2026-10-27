require('./harness.js');

// Restore the original showACHGate (overridden by harness monkey-patch)
delete global.showACHGate;
// Re-inject real one by re-executing just that function definition
// Simpler: observe whether queueAction correctly calls the gate before SEVER
// by replacing showACHGate with a counter

let gateCalls = 0;
global.showACHGate = (onC, onR) => {
  gateCalls++;
  onC(); // auto-confirm
};

const origRandom = Math.random;
Math.random = () => 0.3;
global.STATE.difficulty = 'operator';
global.STATE.speed = 'rapid';
global.beginGame('BLACKFROST');
global._flushTimers();
global.STATE.speed = 'rapid';
global.STATE.c2Revealed = true;  // precondition for sever
global.STATE.c2Node = 'GEN-2';

// Force into PLAN
while (global.STATE.phase !== 'PLAN') {
  if (global.STATE.phase === 'INTEL') { global.startPlanPhase(); global._flushTimers(); continue; }
  global._flushTimers();
  if (global.STATE.gateCallback) global.releaseGate();
  global._flushTimers();
}
global.STATE.achGatePassed = false; // ensure gate fires

// Queue a SEVER
const S = global.STATE;
const wraith = S.agents.findIndex(a => a.id === 'WRAITH');
const sever = S.agents[wraith].actions.find(a => a.id === 'sever');
console.log('Before queueAction: gateCalls=' + gateCalls);
global.queueAction(wraith, sever, null);
console.log('After queueAction: gateCalls=' + gateCalls);
console.log('ACH gate flag set:', global.STATE.achGatePassed);
console.log('SEVER queued:', global.STATE.plannedActions.some(a => a.actionId === 'sever'));

// Queue a SECOND SEVER — ACH should NOT fire again (once per run)
const beforeGate = gateCalls;
global.queueAction(wraith, sever, null);
console.log('Second SEVER queue - gate fired again:', gateCalls > beforeGate);
console.log('Second SEVER actually queued:', global.STATE.plannedActions.filter(a => a.actionId === 'sever').length);

// Verify demo mode skips the ACH gate
global.STATE.achGatePassed = false;
global.STATE.demoMode = true;
global.STATE.plannedActions = [];
global.STATE.actionPointsUsed = 0;
const beforeDemo = gateCalls;
global.queueAction(wraith, sever, null);
console.log('Demo mode SEVER - gate fired:', gateCalls > beforeDemo);
console.log('Demo mode SEVER queued:', global.STATE.plannedActions.some(a => a.actionId === 'sever'));

Math.random = origRandom;
