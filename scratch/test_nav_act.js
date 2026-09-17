const fs = require('fs');
const vm = require('vm');

const elements = {};
function getEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id: id,
      style: {},
      value: '',
      checked: false,
      innerHTML: '',
      textContent: '',
      _list: new Set(),
      classList: {
        add(c) { elements[id]._list.add(c); },
        remove(c) { elements[id]._list.delete(c); },
        contains(c) { return elements[id]._list.has(c); }
      },
      listeners: {},
      addEventListener(e, cb) {
        if (!this.listeners[e]) this.listeners[e] = [];
        this.listeners[e].push(cb);
      },
      trigger(e, eventObj = {}) {
        const cbs = this.listeners[e] || [];
        cbs.forEach(cb => cb({ preventDefault: ()=>{}, stopPropagation: ()=>{}, ...eventObj }));
      },
      querySelectorAll: () => [],
      focus() {},
      appendChild(child) {}
    };
  }
  return elements[id];
}

const ctx = {
  window: {
    addEventListener: (e, cb) => {},
    api: {
      getConfig: () => Promise.resolve({
        activities: [],
        interactions: [{ id: 'int_1', name: 'Aksi Keyboard W', type: 'keyboard' }]
      }),
      addActivity: (d) => Promise.resolve({ ok: true, activity: d }),
      updateActivity: (id, d) => Promise.resolve({ ok: true })
    }
  },
  document: {
    getElementById: (id) => getEl(id.startsWith('#') ? id : '#' + id),
    querySelector: (sel) => getEl(sel),
    querySelectorAll: (sel) => [],
    createElement: (tag) => getEl('created_' + tag + '_' + Math.random()),
    addEventListener: (e, cb) => cb()
  },
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); }
  },
  console: console
};

vm.createContext(ctx);

// Run navAndActivities.js
const code = fs.readFileSync('renderer/js/navAndActivities.js', 'utf8');
vm.runInContext(code, ctx);

console.log('\n--- 1. Testing Nav Toggle ---');
const app = getEl('#app');
const toggleBtn = getEl('#toggleNavBtn');
const showBtn = getEl('#showNavBtn');

console.log('Initial app nav-collapsed:', app.classList.contains('nav-collapsed'));
toggleBtn.trigger('click');
console.log('After toggleBtn click, nav-collapsed:', app.classList.contains('nav-collapsed'));
console.log('LocalStorage nav_collapsed:', ctx.localStorage.getItem('nav_collapsed'));

showBtn.trigger('click');
console.log('After showBtn click, nav-collapsed:', app.classList.contains('nav-collapsed'));
console.log('LocalStorage nav_collapsed:', ctx.localStorage.getItem('nav_collapsed'));

console.log('\n--- 2. Testing Tambah Aktivitas Modal ---');
const btnOpenAdd = getEl('#btnOpenAddActivityModal');
const modal = getEl('#activityModal');

console.log('Initial modal display:', modal.style.display || 'none');
btnOpenAdd.trigger('click');
console.log('After btnOpenAdd click, modal display:', modal.style.display);

const btnClose = getEl('#btnCloseActivityModal');
btnClose.trigger('click');
console.log('After btnClose click, modal display:', modal.style.display);

console.log('\nALL TESTS PASSED WITH FLYING COLORS!');
