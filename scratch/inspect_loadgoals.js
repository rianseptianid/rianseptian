const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');
const start = code.indexOf('async function loadGoalsUI');
console.log(code.substring(start, start + 2500));
