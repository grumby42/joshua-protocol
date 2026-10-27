// Joshua Protocol headless playthrough harness.
// Loads the real index.html <script> as a script in the current V8 context
// (via vm.runInThisContext). Function declarations hoist, top-level var
// becomes a global, const/let are block-scoped per script. We use var-flavored
// rewriting so the game's constants land on the global object.

const fs = require('fs');
const vm = require('vm');

const HTML_PATH = process.env.JP_HTML || require('path').join(__dirname, '..', 'index.html');

// ---------- DOM & canvas stubs ----------
const dummyCtx = new Proxy({}, {
  get: (t, k) => {
    if (k === 'createLinearGradient' || k === 'createRadialGradient') {
      return () => ({ addColorStop(){} });
    }
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'getImageData') return () => ({ data: new Uint8Array(4) });
    return () => {};
  },
  set: () => true,
});

function makeEl(tag) {
  const el = {
    tagName: (tag || 'DIV').toUpperCase(),
    style: new Proxy({setProperty(){}, removeProperty(){}, cssText:''}, {get:(t,k)=>typeof t[k]!=='undefined'?t[k]:'', set:()=>true}),
    className: '', id: '', dataset: {},
    classList: {
      _s: new Set(),
      add(c){ this._s.add(c); },
      remove(c){ this._s.delete(c); },
      toggle(c, on){ if (on === undefined) { if (this._s.has(c)) { this._s.delete(c); return false; } this._s.add(c); return true; } if (on) this._s.add(c); else this._s.delete(c); return on; },
      contains(c){ return this._s.has(c); },
    },
    children: [],
    appendChild(c){ this.children.push(c); return c; },
    removeChild(c){ this.children = this.children.filter(x => x !== c); return c; },
    remove(){},
    addEventListener(){}, removeEventListener(){},
    querySelector(){ return makeEl(); },
    querySelectorAll(){ return []; },
    innerHTML: '', textContent: '',
    scrollTop: 0, scrollHeight: 0,
    offsetWidth: 380, offsetHeight: 600,
    width: 380, height: 600,
    getContext(){ return dummyCtx; },
    getBoundingClientRect(){ return { width: 380, height: 600, top: 0, left: 0, right: 380, bottom: 600 }; },
    disabled: false, value: '', onclick: null,
    click(){ if (this.onclick) try { this.onclick(); } catch (e) {} },
  };
  return el;
}

const _byId = {};
function getEl(id) {
  if (!_byId[id]) {
    const el = makeEl();
    el.id = id;
    _byId[id] = el;
  }
  return _byId[id];
}

const localStorageStore = {};
global.localStorage = {
  getItem(k){ return localStorageStore[k] !== undefined ? localStorageStore[k] : null; },
  setItem(k, v){ localStorageStore[k] = String(v); },
  removeItem(k){ delete localStorageStore[k]; },
  clear(){ for (const k of Object.keys(localStorageStore)) delete localStorageStore[k]; },
};

global.document = {
  getElementById: getEl,
  createElement: makeEl,
  querySelector: () => makeEl(),
  querySelectorAll: () => [],
  addEventListener(){},
  body: makeEl(),
  documentElement: makeEl(),
};
global.window = {
  devicePixelRatio: 1,
  addEventListener(){}, removeEventListener(){},
  innerWidth: 380, innerHeight: 800,
  matchMedia: () => ({ matches: false, addListener(){}, removeListener(){} }),
  requestAnimationFrame: () => 0,
  cancelAnimationFrame(){},
  localStorage: global.localStorage,
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
};
global.URL = {
  createObjectURL: () => 'blob:fake',
  revokeObjectURL(){},
};
global.Blob = function(parts, opts){ this.parts = parts; this.type = (opts && opts.type) || ''; this.size = (parts||[]).join('').length; };
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};
global.performance = { now: () => Date.now() };

const _timers = [];
global.setTimeout = (fn, ms) => {
  const id = _timers.length + 1;
  _timers.push({ id, fn, ms: ms || 0 });
  return id;
};
global.clearTimeout = (id) => { const i = _timers.findIndex(t => t.id === id); if (i >= 0) _timers.splice(i, 1); };
global.setInterval = () => 0;
global.clearInterval = () => {};
function flushTimers(maxIterations) {
  let n = 0;
  while (_timers.length && n < (maxIterations || 1000)) {
    const t = _timers.shift();
    try { t.fn(); } catch (e) {}
    n++;
  }
  return n;
}
global._flushTimers = flushTimers;
global._timerCount = () => _timers.length;
global._clearTimers = () => { _timers.length = 0; };

global.HTMLElement = function(){};
global.HTMLCanvasElement = function(){};
global.CanvasRenderingContext2D = function(){};

// ---------- Load the game ----------
let gameSrc = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = gameSrc.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('No <script> found in HTML');
let s = scriptMatch[1];
// Strip the auto-bootstrap at end (last resizeCanvas() through end)
const cut = s.lastIndexOf('resizeCanvas();');
if (cut > 0) s = s.substring(0, cut);
// Convert top-level const/let → var so they become globals under runInThisContext.
// Function declarations are left alone — they hoist automatically.
s = s
  .replace(/^'use strict';/m, '')
  .replace(/^const /mg, 'var ')
  .replace(/^let /mg, 'var ');
// Prepend minimal globals the game refers to
const prelude = 'var CW = 380; var CH = 600; var ctx = this.dummyCtx; var canvas = { getContext: () => this.dummyCtx, width: 380, height: 600 };\n';
global.dummyCtx = dummyCtx;

try {
  vm.runInThisContext(prelude + s, { filename: 'joshua-protocol.js' });
} catch (e) {
  console.error('LOAD ERROR:', e.message);
  console.error(e.stack.split('\n').slice(0, 10).join('\n'));
  process.exit(1);
}

// After load, top-level `var` names land on global
// Verify
const need = ['STATE', 'MISSIONS', 'THREAT_ACTORS', 'COMBOS', 'TECHNIQUES', 'beginGame', 'startIntelPhase', 'startPlanPhase', 'startResolvePhase', 'queueAction', 'advanceRound', 'computeRubric', 'showSettingsModal', 'saveRun', 'exportCaseLog'];
const missing = need.filter(n => typeof global[n] === 'undefined');
if (missing.length) {
  console.error('MISSING GLOBALS:', missing.join(', '));
  process.exit(1);
}



// Monkey-patch modal flows so headless tests don't stall on buttons
// Intro, OODA and ACH all call onDone/onConfirm callbacks after user action.
// For automated runs we auto-complete them immediately.
if (typeof global.showThreatActorIntro === 'function') {
  global.showThreatActorIntro = function(onDone){ if (onDone) onDone(); };
}
if (typeof global.maybeShowOODAReflection === 'function') {
  global.maybeShowOODAReflection = function(){};  // just skip
}
if (typeof global.showNarratorCard === 'function') {
  const _orig = global.showNarratorCard;
  global.showNarratorCard = function(opts){ if (opts && opts.onContinue) opts.onContinue(); };
}
if (typeof global.showACHGate === 'function') {
  global.showACHGate = function(onConfirm){ if (onConfirm) onConfirm(); };
}
if (typeof global.showKillChainReplay === 'function') {
  global.showKillChainReplay = function(onDone){ if (onDone) onDone(); };
}
if (typeof global.showDebrief === 'function') {
  // Keep showDebrief's side effects (set phase etc) but skip DOM — set WIN/LOSE already handled by trigger*
  const _origDebrief = global.showDebrief;
  global.showDebrief = function(win, reason){
    // Note: triggerWin/Lose already setPhase. We just capture that debrief was called.
    global._debriefCalled = { win, reason, round: global.STATE.round };
  };
}


function snapshot() {
  const S = global.STATE;
  return {
    phase: S.phase,
    round: S.round,
    c2Node: S.c2Node,
    c2Revealed: S.c2Revealed,
    c2Severed: S.c2Severed,
    threats: (S.threats || []).map(t => ({ target: t.target, phase: t.phase, revealed: t.revealed, tech: t.techniqueId })),
    nodes: (S.nodes || []).map(n => ({ id: n.id, state: n.state, resilience: n.resilience, opState: n.operatorState })),
    plannedActions: [...(S.plannedActions || [])],
    ap: S.actionPointsUsed + '/' + S.actionBudget,
    activeActor: S.activeActor && S.activeActor.id,
    actorRevealed: S.actorRevealed,
    observedTTPs: Object.keys(S.observedTTPs || {}).length,
    combosTriggered: (S.combosTriggered || []).length,
    pivotEvents: (S.pivotEvents || []).length,
    dwellRounds: S.dwellRoundsAccumulated || 0,
    compromised: (S.nodes || []).filter(n => n.state === 'compromised').length,
  };
}

function pickAgent(id) {
  return global.STATE.agents.findIndex(a => a.id === id);
}
function pickAction(agentIdx, actionId) {
  const ag = global.STATE.agents[agentIdx];
  return ag.actions.find(a => a.id === actionId);
}

module.exports = {
  snapshot,
  pickAgent,
  pickAction,
  flushTimers,
  localStorageStore,
};
