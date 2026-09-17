const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

// Find the string array and decoder function at the top of app.js
// Usually starts with function _0x....
const header = code.slice(0, 15000);
console.log('Header preview:', header.slice(0, 500));
