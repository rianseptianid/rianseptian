const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

const regex = /\[\s*['"]textCo/g;
let m;
let count = 0;
while ((m = regex.exec(content)) !== null) {
  count++;
  if (count <= 5) {
    console.log('=== MATCH #' + count + ' at ' + m.index + ' ===');
    console.log(content.substring(Math.max(0, m.index - 120), Math.min(content.length, m.index + 120)));
    console.log('-------------------------------------------');
  }
}
