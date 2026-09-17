const fs = require('fs');
const content = fs.readFileSync('main.js', 'utf8');

const lines = content.split('\n');
const results = [];
lines.forEach((line, idx) => {
  if (line.includes('ipcMain')) {
    results.push(`${idx + 1}: ${line.trim()}`);
  }
});
console.log('ipcMain lines in main.js:', results.slice(0, 30));
