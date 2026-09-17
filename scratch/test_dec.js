const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

// Let's create an environment in vm to execute the string array setup
const vm = require('vm');
const sandbox = {};
vm.createContext(sandbox);

// Extract the functions
// _0x5374 definition
const endOf5374 = content.indexOf('function _0x4fe8');
// Wait, let's see how _0x4fe8 and _0x3ea1 are structured
const f4fe8Str = content.substring(content.indexOf('function _0x4fe8'), content.indexOf('function _0x4fe8') + 2000).match(/function _0x4fe8\([\s\S]*?\}\}/);
console.log('f4fe8 match:', f4fe8Str ? 'found' : 'not found');
