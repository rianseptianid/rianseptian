const fs = require('fs');

// We have the deobfuscated pure_backup/preload.js string earlier in grep:
// In pure_backup/preload.js:
const backupContent = fs.readFileSync('pure_backup/preload.js', 'utf8');
const currentContent = fs.readFileSync('preload.js', 'utf8');

// Let's decode pure_backup/preload.js methods!
// The structure in pure_backup/preload.js is contextBridge.exposeInMainWorld('api', { ... })
// Let's evaluate pure_backup/preload.js with a mock contextBridge:
let backupMethods = [];
const mockContextBridge = {
  exposeInMainWorld(name, obj) {
    backupMethods = Object.keys(obj);
  }
};

const mockIpc = {
  invoke() {},
  on() {}
};

try {
  const vm = require('vm');
  const ctx = {
    require(m) {
      if (m === 'electron') return { contextBridge: mockContextBridge, ipcRenderer: mockIpc };
      return {};
    },
    module: { exports: {} }
  };
  vm.createContext(ctx);
  vm.runInContext(backupContent, ctx);
  console.log('pure_backup/preload.js has', backupMethods.length, 'methods:');
} catch (e) {
  console.error('Error running pure_backup/preload.js:', e);
}

// Now extract methods from current preload.js
const currentMatches = currentContent.matchAll(/^\s*([a-zA-Z0-9_]+)\s*:\s*(?:\([^)]*\)|function|\()/gm);
const currentMethods = new Set();
for (const m of currentMatches) {
  currentMethods.add(m[1]);
}
console.log('current preload.js has', currentMethods.size, 'methods:');

// Find missing methods
const missing = backupMethods.filter(m => !currentMethods.has(m));
console.log('MISSING METHODS IN preload.js:');
console.log(missing);
