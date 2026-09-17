const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');
['renderGoalSelectedInteractionBadges', 'updateModalLivePreview', 'syncColorField'].forEach(fn => {
  const start = code.indexOf('function ' + fn);
  console.log('=== ' + fn + ' ===');
  console.log(code.substring(start, start + 500));
});
