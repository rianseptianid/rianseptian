const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

// find all function definitions at the start
const fnMatches = code.match(/function _0x[a-f0-9]+\(/g);
console.log('Functions found:', fnMatches);
