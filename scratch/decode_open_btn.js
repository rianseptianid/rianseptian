const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

const f5374Start = content.indexOf('function _0x5374()');
const f4fe8Start = content.indexOf('function _0x4fe8(');
const f3ea1Start = content.indexOf('function _0x3ea1(');

let depth = 0, f4fe8End = -1;
for (let i = f4fe8Start; i < content.length; i++) {
  if (content[i] === '{') depth++;
  else if (content[i] === '}') { depth--; if (depth === 0) { f4fe8End = i + 1; break; } }
}
depth = 0; let f3ea1End = -1;
for (let i = f3ea1Start; i < content.length; i++) {
  if (content[i] === '{') depth++;
  else if (content[i] === '}') { depth--; if (depth === 0) { f3ea1End = i + 1; break; } }
}
depth = 0; let f5374End = -1;
for (let i = f5374Start; i < content.length; i++) {
  if (content[i] === '{') depth++;
  else if (content[i] === '}') { depth--; if (depth === 0) { f5374End = i + 1; break; } }
}

const iifeMatch = content.match(/\(function\(_0x38b123,_0x3002ba\)\{[\s\S]*?\}\(_0x5374,-0xd7c44\+-0x5\*-0x3d300\+0x1\*0x58b11\)\);/);

const codeToEval = [
  content.substring(f5374Start, f5374End),
  content.substring(f4fe8Start, f4fe8End),
  content.substring(f3ea1Start, f3ea1End),
  iifeMatch[0]
].join('\n;\n');

const vm = require('vm');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(codeToEval, ctx);

const p1 = ctx._0x3ea1(0x1e8d, 'V#di');
const p2 = 'enAddI';
const p3 = ctx._0x4fe8(0x2294);
const p4 = ctx._0x4fe8(0x1164);
const p5 = ctx._0x4fe8(0x925);
console.log('Resulting selector:', p1 + p2 + p3 + p4 + p5);
console.log('Parts:', { p1, p2, p3, p4, p5 });
