const fs = require('fs');
let code = fs.readFileSync('renderer/js/app.js', 'utf8');

// The string table and deobfuscation function are at the top of app.js
// Let's find the first 50 lines / functions:
const header = code.substring(0, 10000);
console.log(header.substring(0, 1000));
