const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

console.log(code.substring(142500, 142750));
