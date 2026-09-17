const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

// Let's find occurrences of window.api or api. in app.js
const regex = /api\.[a-zA-Z0-9_]+/g;
const apiCalls = new Set(content.match(regex) || []);
console.log('API calls in app.js:', Array.from(apiCalls));
