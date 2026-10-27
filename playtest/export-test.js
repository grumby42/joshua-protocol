require('./harness.js');

Math.random = () => 0.3;
global.STATE.difficulty = 'operator';
global.STATE.speed = 'rapid';
global.beginGame('BLACKFROST');
global._flushTimers();
global.STATE.speed = 'rapid';
global.STATE.achGatePassed = true;

// Play through
const MAX = 100;
let iter = 0;
while (global.STATE.phase !== 'WIN' && global.STATE.phase !== 'LOSE' && iter < MAX) {
  iter++;
  if (global.STATE.phase === 'INTEL') { global.startPlanPhase(); global._flushTimers(); continue; }
  if (global.STATE.phase === 'PLAN') {
    const S = global.STATE;
    const vigil = S.agents.findIndex(a => a.id === 'VIGIL');
    const wraith = S.agents.findIndex(a => a.id === 'WRAITH');
    const scan = S.agents[vigil].actions.find(a => a.id === 'scan');
    const trace = S.agents[vigil].actions.find(a => a.id === 'trace');
    const disrupt = S.agents[wraith].actions.find(a => a.id === 'disrupt');
    const sever = S.agents[wraith].actions.find(a => a.id === 'sever');
    if (S.c2Revealed) global.queueAction(wraith, sever, null);
    S.threats.filter(t => t.revealed).forEach(t => global.queueAction(wraith, disrupt, t.target));
    const unrev = S.threats.filter(t => !t.revealed);
    if (unrev[0]) global.queueAction(vigil, scan, unrev[0].target);
    if (!S.c2Revealed) global.queueAction(vigil, trace, null);
    global.startResolvePhase();
    global._flushTimers();
    continue;
  }
  global._flushTimers();
  if (global.STATE.gateCallback) global.releaseGate();
  global._flushTimers();
}

// Game won. Now export case-log — but exportCaseLog uses `document.createElement('a')` + .click() + Blob.
// We stub those. Verify payload shape by intercepting at Blob creation.
const origBlob = global.Blob;
let capturedPayload = null;
global.Blob = function(parts, opts) {
  if (parts && parts[0]) {
    try { capturedPayload = JSON.parse(parts[0]); } catch (e) {}
  }
  return new origBlob(parts, opts);
};

// Trigger the export
const rubric = global.computeRubric();
const cfi = global.generateCFINote(rubric);
global.exportCaseLog(rubric, cfi, true, 'Test win');

console.log('Export payload captured:', !!capturedPayload);
if (capturedPayload) {
  console.log('  schema:', capturedPayload.schema);
  console.log('  build:', capturedPayload.build);
  console.log('  outcome:', capturedPayload.outcome);
  console.log('  mission:', capturedPayload.mission && capturedPayload.mission.id);
  console.log('  adversary:', capturedPayload.adversary && capturedPayload.adversary.id);
  console.log('  rounds count:', (capturedPayload.rounds || []).length);
  console.log('  actions count:', (capturedPayload.actions || []).length);
  console.log('  observed TTPs:', Object.keys(capturedPayload.observed_ttps || {}).length);
  console.log('  diamond vertices:', JSON.stringify(capturedPayload.diamond));
  console.log('  rubric keys:', Object.keys(capturedPayload.rubric || {}).join(','));
  console.log('  cfi_note length:', (capturedPayload.cfi_note || '').length);
}

// Also test renderFramesTab
const framesEl = { innerHTML: '' };
global.renderFramesTab(framesEl);
console.log('\nFRAMES tab html length:', framesEl.innerHTML.length);
console.log('Contains Kill Chain:', framesEl.innerHTML.includes('CYBER KILL CHAIN'));
console.log('Contains NIST:', framesEl.innerHTML.includes('NIST SP 800-61'));
console.log('Contains Diamond:', framesEl.innerHTML.includes('DIAMOND MODEL'));
console.log('Contains Pyramid:', framesEl.innerHTML.includes('PYRAMID OF PAIN'));
