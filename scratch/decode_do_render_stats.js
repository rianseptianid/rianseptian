const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

const vm = require('vm');
const ctx = {};
vm.createContext(ctx);

// Extract the 3 functions
const f5374 = content.substring(content.indexOf('function _0x5374'), content.indexOf('const _0x4026cc='));
const f4fe8 = content.substring(content.indexOf('function _0x4fe8'), content.indexOf('function _0x5374'));
const f3ea1 = content.substring(content.indexOf('function _0x3ea1'), content.indexOf('async function init('));
const iife = content.substring(content.indexOf('(function(_0x38b123'), content.indexOf('const $='));

vm.runInContext(f5374 + '\n' + f4fe8 + '\n' + f3ea1, ctx);
vm.runInContext(iife, ctx);

ctx._0x4995cc = ctx._0x4fe8;
ctx._0x2dbb16 = ctx._0x3ea1;

console.log('Decoded values in doRenderStats:');
console.log('MwnHS:', ctx._0x2dbb16(0x1449,'i#P^') + ctx._0x2dbb16(0x94e,'GhH0') + 'l');
console.log('caBYC:', ctx._0x2dbb16(0x18e4,'CA5!') + ctx._0x2dbb16(0x8a7,'giIk') + 's');
console.log('1edd:', ctx._0x4995cc(0xe51) + 'ikes');
console.log('iewers:', ctx._0x2dbb16(0x50f,'FGw8') + 'iewers');
console.log('follow:', ctx._0x4995cc(0x219b) + ctx._0x2dbb16(0x217,'sU#L'));
