const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

const matches = new Set();
// Search for string literals like 'int_...' or "int_..."
const regex = /['"`](int_[a-zA-Z0-9_]+)['"`]/g;
let m;
while ((m = regex.exec(code)) !== null) {
  matches.add(m[1]);
}
console.log('int_ literals in app.js:', Array.from(matches));

// Also search for any obfuscated strings in app.js
// Look for string array function
console.log('Searching for interaction in app.js...');
const intMatches = new Set();
const reg2 = /['"`]([a-zA-Z0-9_]*interaction[a-zA-Z0-9_]*)['"`]/gi;
while ((m = reg2.exec(code)) !== null) {
  intMatches.add(m[1]);
}
console.log('interaction literals in app.js:', Array.from(intMatches));
