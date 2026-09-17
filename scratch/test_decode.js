const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

const p1 = code.indexOf('function _0x4fe8');
const p2 = code.indexOf('function _0x3ea1');
console.log(p1, p2);
