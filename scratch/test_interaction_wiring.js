const fs = require('fs');
const html = fs.readFileSync('renderer/index.html', 'utf8');

const ids = new Set();
for (const m of html.matchAll(/id="([^"]+)"/g)) ids.add(m[1]);

function makeEl(id = '', tag = 'div') {
  return {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    checked: false,
    textContent: '',
    innerHTML: '',
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    children: [],
    dataset: {},
    setAttribute() {},
    getAttribute() { return null; },
    removeAttribute() {},
    focus() {},
    click() {},
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { return c; },
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
}

const elementsById = new Map();
ids.forEach(id => elementsById.set(id, makeEl(id)));

global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.document = {
  getElementById(id) { return elementsById.get(id) || null; },
  querySelector(sel) {
    if (sel && sel.startsWith('#')) return elementsById.get(sel.slice(1)) || null;
    return makeEl('', 'div');
  },
  querySelectorAll(sel) { return []; },
  createDocumentFragment() {
    return {
      children: [],
      appendChild(c) { this.children.push(c); return c; }
    };
  },
  createElement(tag) { return makeEl('', tag); },
  addEventListener() {}
};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.navigator = { userAgent: 'node' };
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

global.api = {
  connect: async () => {},
  disconnect: async () => {},
  getStatus: async () => ({ state: 'DISCONNECTED', status: 'DISCONNECTED' }),
  onStatus: () => {},
  getYoutubeSettings: async () => ({ enabled: false }),
  onEvent: (cb) => {
    global._onEventCb = cb;
  },
  playYoutubeInView: () => {},
  onYoutubeVideoEnded: () => {},
  getGoalUrl: () => {},
  getConfig: async () => ({
    tiktokUsername: '',
    sound: { mode: 'overlap' },
    keyTrigger: { defaultDelayMs: 50 },
    interactions: [{ id: 'int_1', name: 'Lompat Space', actions: [{ type: 'key', spec: 'Space', delayMs: 50, holdMs: 0 }] }],
    activities: [],
    triggers: []
  }),
  getPresets: async () => [],
  getGifts: async () => [],
  getSoundboard: async () => [],
  getLogTail: async () => [],
  getTtsVoiceCatalog: async () => [],
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

require('../renderer/js/app.js');

setTimeout(() => {
  const btnReset = elementsById.get('btnResetInteractionsOnly');
  const btnAdd = elementsById.get('btnOpenAddInteractionModal');
  const searchInput = elementsById.get('interactionSearchInput');
  const list = elementsById.get('interactionList');
  const badge = elementsById.get('interactionCountBadge');
  const modal = elementsById.get('interactionModal');

  console.log('btnReset fn string:', btnReset?._listeners?.click?.[0]?.toString());
  console.log('btnOpenAddInteractionModal listeners:', btnAdd?._listeners);
  console.log('interactionSearchInput listeners:', searchInput?._listeners);
  console.log('interactionCountBadge textContent:', badge?.textContent);
  console.log('interactionList rendered children count:', list?.children?.length);

  const chatFeed = elementsById.get('chatFeed');
  console.log('chatFeed children before events:', chatFeed?.children?.length);

  if (global._onEventCb) {
    global._onEventCb({
      type: 'chat',
      payload: { uniqueId: 'user123', nickname: 'Budi Gaming', comment: 'Halo bang lagi main apa?', avatar: '' },
      ts: Date.now()
    });

    global._onEventCb({
      type: 'member',
      payload: { uniqueId: 'user456', nickname: 'Siti Live', avatar: '' },
      ts: Date.now()
    });

    global._onEventCb({
      type: 'join',
      payload: { uniqueId: 'user789', nickname: 'Rian Official', avatar: '' },
      ts: Date.now()
    });
  }

  setTimeout(() => {
    console.log('chatFeed children after events:', chatFeed?.children?.length);
    if (chatFeed?.children?.length > 0) {
      chatFeed.children.forEach((c, idx) => {
        console.log(`Child ${idx}:`, c.innerHTML);
      });
    }
    process.exit(0);
  }, 300);
}, 500);
