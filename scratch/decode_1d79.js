const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

// Let's decode _0x4026cc(0x1d79)
// In app.js _0x4026cc is alias for _0x4fe8
// Let's find _0x4fe8
const pArray = code.indexOf('function _0x5374()');
const endArray = code.indexOf('return _0x5374();}', pArray) + 'return _0x5374();}'.length;
const arrayStr = code.substring(pArray, endArray);

const p4fe8 = code.indexOf('function _0x4fe8(');
const end4fe8 = code.indexOf('return _0x', p4fe8);
const end4fe8Close = code.indexOf('}', end4fe8) + 1;
const str4fe8 = code.substring(p4fe8, end4fe8Close);

const p3ea1 = code.indexOf('function _0x3ea1(');
const end3ea1 = code.indexOf('return _0x', p3ea1);
const end3ea1Close = code.indexOf('}', end3ea1) + 1;
const str3ea1 = code.substring(p3ea1, end3ea1Close);

// Evaluate:
const fn = new Function(arrayStr + '\n' + str4fe8 + '\n' + str3ea1 + '\n' + 'return _0x4fe8(0x1d79);');
try {
  console.log('Result of 0x1d79:', fn());
} catch (e) {
  console.error(e);
}
