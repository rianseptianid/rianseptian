const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

// Find where window['api'] is called in loadGoalsUI
const idx = code.indexOf('async function loadGoalsUI');
const snippet = code.substring(idx, idx + 1000);
console.log('Snippet in loadGoalsUI:', snippet);
