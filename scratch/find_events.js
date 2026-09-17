const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

// Search for any ipcRenderer or window.api listeners or event names
const matches = content.match(/['"][a-zA-Z0-9_\-:]+['"]/g) || [];
const interesting = new Set();
matches.forEach(m => {
  const str = m.slice(1, -1);
  if (str.includes('tiktok') || str.includes('chat') || str.includes('event') || str.includes('feed') || str.includes('connect')) {
    interesting.add(str);
  }
});

console.log('Interesting strings in app.js:', Array.from(interesting));
