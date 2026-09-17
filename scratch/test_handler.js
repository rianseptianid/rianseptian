const fs = require('fs');
const s = fs.readFileSync('renderer/js/app.js', 'utf8');
const vm = require('vm');
const dummyApi = new Proxy({}, { get: () => () => Promise.resolve({}) });
let addActivityBtnListener = null;

const elements = {};
function getEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id: id,
      style: {},
      value: '',
      checked: false,
      classList: {
        _list: new Set(),
        add(c) { console.log(`[classList ${id}] + ${c}`); this._list.add(c); },
        remove(c) { console.log(`[classList ${id}] - ${c}`); this._list.delete(c); },
        contains(c) { return this._list.has(c); }
      },
      addEventListener(e, cb) {
        console.log(`[addEventListener ${id}] ${e}`);
        if (id === '#btnOpenAddActivityModal' && e === 'click') {
          addActivityBtnListener = cb;
        }
      },
      focus() { console.log(`[focus ${id}]`); }
    };
  }
  return elements[id];
}

const ctx = {
  window: {
    addEventListener: (e, cb) => console.log(`[window.addEventListener] ${e}`),
    api: dummyApi
  },
  document: {
    querySelector: (sel) => {
      console.log(`[querySelector] ${sel}`);
      return getEl(sel);
    },
    querySelectorAll: (sel) => {
      console.log(`[querySelectorAll] ${sel}`);
      return [];
    },
    addEventListener: () => {}
  },
  localStorage: { getItem: (k) => null, setItem: (k,v) => console.log(`[localStorage.setItem] ${k}=${v}`) },
  setInterval: ()=>{},
  setTimeout: (fn) => { fn(); },
  console: console
};
vm.createContext(ctx);
// Run app.js without calling init() at the end
const code = s.replace('init();', '// init()');
vm.runInContext(code, ctx);

console.log('--- Triggering #btnOpenAddActivityModal click ---');
if (addActivityBtnListener) {
  try {
    addActivityBtnListener({ preventDefault: () => {} });
    console.log('activityModal display is now:', elements['#activityModal']?.style?.display);
  } catch (err) {
    console.error('Error executing addActivityBtnListener:', err);
  }
} else {
  console.log('Listener for #btnOpenAddActivityModal was NOT registered!');
}
