const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');
const start = code.indexOf('function setupGoalOverlayListeners');
const end = code.indexOf('async function init');
console.log(code.substring(start, end));
