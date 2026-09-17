const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

console.log(code.substring(140500, 141000));
