const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

const p = code.indexOf('function renderSettings(');
console.log(code.substring(p, p + 500));
