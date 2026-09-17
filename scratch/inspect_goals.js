const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');
const idx = code.indexOf('openGoalCustomizeModal');
console.log(code.substring(idx + 2000, idx + 4000));

