const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

// Find the string array function and the decoder function
// Line 1 has: const _0x4026cc=_0x4fe8,_0x132d9f=_0x3ea1;(function(_0x38b123,_0x3002ba){...}(_0x5374, ...));
// Let's extract _0x5374, _0x4fe8, _0x3ea1 and the IIFE
const iifeEnd = content.indexOf('const $=');
const prelude = content.substring(0, iifeEnd);

// Also we need _0x4fe8, _0x3ea1 and _0x5374 functions. Where are they defined?
// In JS obfuscator, they are defined further down or inside the file.
// Let's search where `function _0x4fe8` or `function _0x5374` is defined.
const f4fe8 = content.indexOf('function _0x4fe8');
const f3ea1 = content.indexOf('function _0x3ea1');
const f5374 = content.indexOf('function _0x5374');

console.log('Offsets:', { f4fe8, f3ea1, f5374 });
