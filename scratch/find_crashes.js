const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

// Find occurrences of )['addEventListener'] or )["addEvent or )[_0x...('addEvent...
// with NO question mark '?.'
const regex = /\)\s*\[\s*['"_0x][^?\]]*?(?:addEve|on)/g;
// Actually let's search for any `)(...)[...` where there is no `?.`
const matches = [];
let i = 0;
while (true) {
  const addEv = content.indexOf('addEventListener', i);
  if (addEv === -1) break;
  // look backwards from addEv
  const chunk = content.substring(Math.max(0, addEv - 80), addEv + 30);
  if (!chunk.includes('?.') && chunk.includes('$(')) {
    matches.push({ pos: addEv, chunk });
  }
  i = addEv + 1;
}

console.log('Found non-optional addEventListener on $(...) :', matches.length);
matches.slice(0, 15).forEach(m => console.log(m.pos, ':', m.chunk.replace(/\s+/g, ' ')));
