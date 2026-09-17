const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

// Find all occurrences of goal in window.api calls
const regex = /(?:window\[['"]api['"]\]|window\.api)\[['"]?([a-zA-Z0-9_$]+)['"]?\]/g;
const found = new Set();
let m;
while ((m = regex.exec(code)) !== null) {
  if (/goal/i.test(m[1])) {
    found.add(m[1]);
  }
}
console.log('Goal methods on window.api called in app.js:', Array.from(found));
