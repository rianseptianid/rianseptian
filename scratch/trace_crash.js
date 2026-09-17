const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

// Load decoders
const vm = require('vm');
const ctx = {};
vm.createContext(ctx);

// Run the script up to where decoders are defined
// Actually, we can run the whole app.js inside vm with a window and document proxy, but this time:
// intercept every call to $(selector) and log what selector was queried, and if someone tries to set textContent on null, catch it!

const html = fs.readFileSync('renderer/index.html', 'utf8');
const idRegex = /id=["']([^"']+)["']/g;
const validIds = new Set();
let m;
while ((m = idRegex.exec(html)) !== null) {
  validIds.add(m[1]);
}

function createMockEl(id) {
  return {
    tagName: 'DIV',
    id,
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    removeChild() {},
    setAttribute() {},
    getAttribute() { return ''; },
    removeAttribute() {},
    dataset: {},
    children: [],
    value: '',
    checked: false,
    disabled: false,
    _text: '',
    get textContent() { return this._text; },
    set textContent(v) { this._text = v; },
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; }
  };
}

const elMap = {};
function getEl(id) {
  if (!elMap[id]) elMap[id] = createMockEl(id);
  return elMap[id];
}

const userConfigPath = process.env.APPDATA + '/nurearn-studio/config.json';
const userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));

const logs = [];
const window = {
  api: new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'getConfig') return async () => userConfig;
      if (prop === 'getStatus') return async () => ({ state: 'connected' });
      if (prop === 'getPresets') return async () => (userConfig.presets || []);
      if (prop === 'getGifts') return async () => (userConfig.gifts || []);
      if (prop === 'getSoundboard') return async () => (userConfig.soundboard || []);
      if (prop === 'getAllGoals') return async () => (userConfig.goals || []);
      if (prop === 'getLogTail') return async () => [];
      if (prop === 'getYoutubeQueue') return async () => [];
      if (prop === 'getYoutubeSettings') return async () => ({});
      return (...args) => Promise.resolve({});
    }
  }),
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  CustomEvent: function() {}
};

const document = {
  querySelector(sel) {
    logs.push({ op: 'querySelector', sel });
    if (typeof sel === 'string' && sel.startsWith('#')) {
      const id = sel.slice(1);
      if (validIds.has(id)) return getEl(id);
      return null;
    }
    return createMockEl(sel);
  },
  querySelectorAll(sel) {
    logs.push({ op: 'querySelectorAll', sel });
    return [];
  },
  getElementById(id) {
    logs.push({ op: 'getElementById', id });
    if (validIds.has(id)) return getEl(id);
    return null;
  },
  createElement(tag) { return createMockEl(tag); },
  addEventListener() {}
};

ctx.window = window;
ctx.document = document;
ctx.globalThis = ctx;
ctx.navigator = { userAgent: 'test' };
ctx.location = { href: 'http://localhost' };
ctx.localStorage = { getItem: () => null, setItem: () => {} };
ctx.setTimeout = setTimeout;
ctx.clearTimeout = clearTimeout;
ctx.setInterval = () => {};
ctx.clearInterval = () => {};

process.on('unhandledRejection', (err) => {
  console.log('!!! UNHANDLED REJECTION !!!');
  console.log(err);
});
process.on('uncaughtException', (err) => {
  console.log('!!! UNCAUGHT EXCEPTION !!!');
  console.log(err);
});

try {
  vm.runInContext(content, ctx);
  console.log('Synchronous run finished, waiting 1s for async init...');
  setTimeout(() => {
    console.log('All async completed.');
  }, 1000);
} catch (e) {
  console.log('CRASHED WITH:', e.message);
  console.log('Last 10 DOM queries before crash:');
  console.log(logs.slice(-10));
}
