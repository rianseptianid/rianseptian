const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

[178773, 346560, 521832, 523146].forEach(idx => {
  console.log('====================================');
  console.log('SURROUNDING OF ' + idx + ':');
  console.log(content.substring(idx - 300, idx + 300));
});
