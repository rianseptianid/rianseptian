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
    addEventListener() {},
    removeEventListener() {},
    querySelector(sel) { return makeEl(sel); },
    querySelectorAll() { return []; },
    closest() { return this; }
  };
}

const elementsById = new Map();
ids.forEach(id => elementsById.set(id, makeEl(id)));

global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
const querySelectorsUsed = new Set();
global.document = {
  getElementById(id) {
    querySelectorsUsed.add('#' + id);
    return elementsById.get(id) || null;
  },
  querySelector(sel) {
    querySelectorsUsed.add(sel);
    if (sel && sel.startsWith('#')) return elementsById.get(sel.slice(1)) || null;
    return makeEl('', 'div');
  },
  querySelectorAll(sel) {
    querySelectorsUsed.add('all:' + sel);
    return [];
  },
  createElement(tag) { return makeEl('', tag); },
  addEventListener() {}
};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.navigator = { userAgent: 'node' };
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const accessedProps = new Set();
const apiTarget = {
  getConfig: async () => ({
    sound: { mode: 'overlap' },
    keyTrigger: { defaultDelayMs: 50 },
    interactions: [{ id: 'int_1', name: 'Test', actions: [] }],
    activities: [],
    triggers: []
  }),
  getPresets: async () => [],
  getGifts: async () => [],
  getSoundboard: async () => [],
  getLogTail: async () => [],
  getTtsVoiceCatalog: async () => []
};

global.api = new Proxy(apiTarget, {
  get(target, prop) {
    accessedProps.add(String(prop));
    if (prop in target) return target[prop];
    return (...args) => {
      return Promise.resolve({ ok: true });
    };
  }
});

try {
  require('../renderer/js/app.js');
} catch (e) {
  console.log('Error during app.js execution:', e);
}

setTimeout(() => {
  console.log('Query selectors matching interact:');
  console.log(Array.from(querySelectorsUsed).filter(s => s && s.toLowerCase().includes('interact')));
  console.log('Query selectors matching modal:');
  console.log(Array.from(querySelectorsUsed).filter(s => s && s.toLowerCase().includes('modal')));

  process.exit(0);
}, 1000);
