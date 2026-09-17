const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');
const start = code.indexOf('function showConfirm');
console.log(code.substring(start, start + 2500));
