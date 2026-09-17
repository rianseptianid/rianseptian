const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

const p = code.indexOf('function openGoalCustomizeModal');
console.log('Index:', p);
// What is 200 chars before and 200 chars after?
console.log(code.substring(p - 200, p + 200));
