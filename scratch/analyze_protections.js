const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

const regex = /\[\s*['"]textCo/g;
let m;
let count = 0;
while ((m = regex.exec(content)) !== null) {
  count++;
  const before = content.substring(Math.max(0, m.index - 80), m.index);
  const after = content.substring(m.index, Math.min(content.length, m.index + 80));
  
  // Check if protected by if or &&
  const isProtectedIf = /if\s*\([^)]*\)\s*$/.test(before) || /if\s*\([^)]*\)\s*\{?\s*$/.test(before);
  const isProtectedAnd = /&&\s*\(\s*$/.test(before) || /&&\s*$/.test(before);
  const isTernary = /\?\s*\(\s*$/.test(before);

  console.log(`Match #${count} at ${m.index}:`);
  console.log(`  Protected: if=${isProtectedIf}, &&=${isProtectedAnd}, ?=${isTernary}`);
  console.log(`  Snippet: ${before.slice(-40)} >>> [textCo... <<< ${after.slice(0, 40)}`);
  console.log('----------------------------------------------------');
}
