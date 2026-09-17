const fs = require('fs');
const js = fs.readFileSync('renderer/js/app.js', 'utf8');

const f5374Start = js.indexOf('function _0x5374()');
const f4fe8Start = js.indexOf('function _0x4fe8(');
const f3ea1Start = js.indexOf('function _0x3ea1(');
const nextFn = js.indexOf('function ', f3ea1Start + 20);

const part1 = js.slice(f5374Start, f4fe8Start);
const part2 = js.slice(f4fe8Start, f3ea1Start);
const part3 = js.slice(f3ea1Start, nextFn);
const iifeStart = js.indexOf('(function(_0x38b123');
const iifeEndStr = '}(_0x5374,';
const iifeEnd = js.indexOf(');', js.indexOf(iifeEndStr)) + 2;
const iife = js.slice(iifeStart, iifeEnd);

const code = 'var $ = () => null;\n' +
  part1 + '\n' + part2 + '\n' + part3 + '\n' +
  'const _0x4026cc = _0x4fe8;\nconst _0x132d9f = _0x3ea1;\n' +
  iife + ';\n' +
  'console.log("0x1829 EdA]:", _0x132d9f(0x1829, "EdA]"));\n' +
  'console.log("0x15b0:", _0x4026cc(0x15b0));\n' +
  'console.log("0x1b06:", _0x4026cc(0x1b06));\n';

fs.writeFileSync('scratch/run_decode.js', code);
