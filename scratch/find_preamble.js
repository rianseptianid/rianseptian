const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

// Find function _0x3ea1
const idx = code.indexOf('function _0x3ea1');
console.log('idx:', idx);
console.log(code.slice(idx, idx + 1000));
