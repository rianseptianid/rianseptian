const fs = require('fs');
const html = fs.readFileSync('renderer/index.html', 'utf8');

// Extract all IDs from index.html
const ids = new Set();
const idMatches = html.matchAll(/id="([^"]+)"/g);
for (const m of idMatches) {
  ids.add(m[1]);
}
console.log('Total IDs in index.html:', ids.size);

// Check if connectBtn is in IDs
console.log('connectBtn in HTML?', ids.has('connectBtn'));
console.log('btnOpenAddInteractionModal in HTML?', ids.has('btnOpenAddInteractionModal'));
console.log('interactionList in HTML?', ids.has('interactionList'));
console.log('interactionModal in HTML?', ids.has('interactionModal'));
console.log('btnResetInteractionsOnly in HTML?', ids.has('btnResetInteractionsOnly'));
