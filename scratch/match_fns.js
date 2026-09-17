const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

// Find function _0x5374
const match5374 = content.match(/function _0x5374\(\)\{[\s\S]*?return _0x51a105;\}/);
// Find function _0x4fe8
const match4fe8 = content.match(/function _0x4fe8\([\s\S]*?return _0x4fe8\([\s\S]*?\};\}\}/);
// Find function _0x3ea1
const match3ea1 = content.match(/function _0x3ea1\([\s\S]*?return _0x3ea1\([\s\S]*?\};\}\}/);

console.log('match5374:', !!match5374);
console.log('match4fe8:', !!match4fe8);
console.log('match3ea1:', !!match3ea1);
