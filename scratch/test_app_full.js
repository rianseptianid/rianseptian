const fs = require('fs');
const html = fs.readFileSync('renderer/index.html', 'utf8');

const ids = new Set();
for (const m of html.matchAll(/id="([^"]+)"/g)) ids.add(m[1]);

function makeEl(id = '', tag = 'div') {
  const el = {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    checked: false,
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      add() {},
      remove() {},
      contains() { return false; },
      toggle() {}
    },
    children: [],
    dataset: {},
    setAttribute() {},
    getAttribute() { return null; },
    removeAttribute() {},
    focus() {},
    click() {},
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
    addEventListener(evt, fn) {
      this._listeners = this._listeners || {};
      this._listeners[evt] = this._listeners[evt] || [];
      this._listeners[evt].push(fn);
    },
    removeEventListener() {},
    querySelector(sel) { return makeEl(sel); },
    querySelectorAll(sel) { return []; },
    closest() { return this; }
  };
  return el;
}

const elementsById = new Map();
ids.forEach(id => elementsById.set(id, makeEl(id)));

global.window = global;
global.window.addEventListener = (evt, fn) => {};
global.window.removeEventListener = () => {};

global.document = {
  getElementById(id) {
    if (elementsById.has(id)) return elementsById.get(id);
    return null;
  },
  querySelector(sel) {
    if (sel && sel.startsWith('#')) {
      const id = sel.slice(1);
      if (elementsById.has(id)) return elementsById.get(id);
      return null;
    }
    return makeEl('', 'div');
  },
  querySelectorAll(sel) {
    return [makeEl('', 'div')];
  },
  createElement(tag) {
    return makeEl('', tag);
  },
  addEventListener() {}
};

global.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};
global.navigator = { userAgent: 'node' };
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

global.api = {
  connect: async () => {},
  disconnect: async () => {},
  getStatus: async () => {},
  onStatus: () => {},
  onEvent: () => {}, // <--- ADDED!
  playYoutubeInView: () => {}, // <--- ADDED!
  onYoutubeVideoEnded: () => {}, // <--- ADDED!
  getGoalUrl: () => {}, // <--- ADDED!
  getNurearnLive: async () => [],
  getNurearnLiveStreamers: async () => [],
  onNurearnLiveUpdate: () => {},
  getConfig: async () => ({
    interactions: [
      { id: 'int_1', name: 'Lompat Space', actions: [{ type: 'key', spec: 'Space' }] }
    ],
    activities: [],
    triggers: []
  }),
  updateConfig: async () => {},
  addInteraction: async (d) => d,
  updateInteraction: async (id, d) => d,
  removeInteraction: async () => true,
  resetInteractions: async () => true,
  testInteraction: async () => ({ ok: true }),
  addActivity: async (d) => d,
  updateActivity: async (id, d) => d,
  removeActivity: async () => true,
  resetActivities: async () => true,
  testActivity: async () => ({ ok: true }),
  getGifts: async () => [],
  getSoundboard: async () => [],
  onStatsUpdate: () => {},
  onGoalUpdate: () => {},
  onGoalsAll: () => {},
  onSoundPlay: () => {},
  onOverlayMediaPreview: () => {},
  onTriggerFired: () => {},
  onTriggerKey: () => {},
  onYoutubeQueue: () => {},
  onYoutubePlay: () => {},
  onYoutubeStop: () => {},
  onYoutubeProgress: () => {},
  onYoutubeHistory: () => {},
  onYoutubeState: () => {},
  onYoutubePlayerVisibility: () => {},
  onTtsSpeak: () => {},
  onTtsClear: () => {},
  onLogEntry: () => {},
  onLogCleared: () => {},
  onTunnelStatus: () => {},
  onSoundboardTrigger: () => {},
  on: () => {}
};
global.location = { href: 'http://localhost' };
global.CustomEvent = class { constructor(n, d) { this.type = n; this.detail = d?.detail; } };
global.dispatchEvent = () => {};

try {
  require('../renderer/js/app.js');
  console.log('SUCCESS: app.js loaded and executed completely to the end!');
  
  const btn = elementsById.get('btnOpenAddInteractionModal');
  console.log('btnOpenAddInteractionModal listeners count:', btn._listeners?.click?.length);
  
  const searchInput = elementsById.get('interactionSearchInput');
  console.log('interactionSearchInput listeners count:', Object.keys(searchInput._listeners || {}));
  
  const list = elementsById.get('interactionList');
  console.log('interactionList rendered children count:', list.children?.length);
} catch (e) {
  console.error('CRASHED in app.js:', e);
}
