const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

// Search for any element IDs used in app.js related to interaction
// e.g. document.getElementById('...') or $('...')
const regex = /\$\(['"]([^'"]+)['"]\)|getElementById\(['"]([^'"]+)['"]\)/g;
const ids = new Set();
let m;
while ((m = regex.exec(code)) !== null) {
  const id = m[1] || m[2];
  if (id.toLowerCase().includes('interact') || id.toLowerCase().includes('int_') || id.toLowerCase().includes('action')) {
    ids.add(id);
  }
}
console.log('Interaction/Action IDs in app.js:', Array.from(ids));
