const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

console.log('Total length:', code.length);
// Find function _0x5374 (which returns the array)
const idx5374 = code.indexOf('function _0x5374');
console.log('idx5374:', idx5374);
// Let's run from idx5374 to the end in a VM to get the array and decoder!
const endCode = code.slice(idx5374);
console.log('endCode length:', endCode.length);

const vm = require('vm');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(endCode, ctx);

const arr = vm.runInContext('_0x5374()', ctx);
console.log('Array length:', arr.length);

// Also we have _0x4fe8 and _0x3ea1 decoders in endCode!
// Let's see what functions are in ctx:
console.log('ctx keys:', Object.keys(ctx));
