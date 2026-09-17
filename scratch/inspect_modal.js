const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');
const start = code.indexOf('function openGoalCustomizeModal');
const end = code.indexOf('function closeGoalCustomizeModal');
console.log(code.substring(start, end));
