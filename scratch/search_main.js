const fs = require('fs');
const lines = fs.readFileSync('main.js', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('connector.on') || l.includes('tiktok:chat') || l.includes('chatFeed') || l.includes('eventFeed')) {
    console.log((i + 1) + ': ' + l.trim());
  }
});
