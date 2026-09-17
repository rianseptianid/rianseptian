const fs = require('fs');
const html = fs.readFileSync('renderer/index.html', 'utf8');

// Parse all IDs from index.html
const idRegex = /id=["']([^"']+)["']/g;
const validIds = new Set();
let m;
while ((m = idRegex.exec(html)) !== null) {
  validIds.add(m[1]);
}

// Parse all classes from index.html
const classRegex = /class=["']([^"']+)["']/g;
const validClasses = new Set();
while ((m = classRegex.exec(html)) !== null) {
  m[1].split(/\s+/).forEach(c => validClasses.add(c));
}

console.log('Valid IDs:', validIds.size, 'Valid Classes:', validClasses.size);

function createMockEl(tagOrSel) {
  return {
    tagName: 'DIV',
    id: '',
    className: '',
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    },
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

const elCache = {};
function getExistingEl(id) {
  if (!elCache[id]) elCache[id] = createMockEl(id);
  return elCache[id];
}

let lastQueried = null;

global.window = {
  api: new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'getConfig') return async () => ({
        sound: { mode: 'overlap' },
        keyTrigger: { defaultDelayMs: 50 },
        soundboard: [],
        activities: [],
        interactions: [],
        triggers: []
      });
      if (prop === 'getStatus') return async () => ({ state: 'connected' });
      if (prop === 'getPresets') return async () => [];
      if (prop === 'getGifts') return async () => [];
      if (prop === 'getSoundboard') return async () => [];
      if (prop === 'getAllGoals') return async () => [];
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

global.document = {
  querySelector(sel) {
    if (typeof sel === 'string') {
      if (sel.startsWith('#')) {
        const id = sel.slice(1);
        if (validIds.has(id)) {
          return getExistingEl(id);
        } else {
          lastQueried = sel;
          console.log('-> querySelector NULL:', sel);
          return null;
        }
      } else if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        if (validClasses.has(cls)) return createMockEl(sel);
        lastQueried = sel;
        console.log('-> querySelector (class) NULL:', sel);
        return null;
      }
    }
    return createMockEl(sel);
  },
  querySelectorAll(sel) {
    return [];
  },
  getElementById(id) {
    if (validIds.has(id)) {
      return getExistingEl(id);
    } else {
      lastQueried = '#' + id;
      console.log('-> getElementById NULL:', id);
      return null;
    }
  },
  createElement(t) { return createMockEl(t); },
  addEventListener() {}
};

global.navigator = { userAgent: 'test' };
global.location = { href: 'http://localhost' };
global.localStorage = { getItem() { return null; }, setItem() {} };

console.log('Loading renderer/js/app.js...');
try {
  require('../renderer/js/app.js');
  console.log('app.js loaded synchronously without error.');
} catch (err) {
  console.log('!!! CAUGHT ERROR IN app.js !!!');
  console.log('Last queried selector before crash:', lastQueried);
  console.log('Error message:', err.message);
  console.log('Stack:', err.stack);
}
