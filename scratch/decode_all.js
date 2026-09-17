const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

// The string decoder setup in app.js ends before main code starts.
// Let's find where the IIFE ends.
// Let's run the header in a vm context and get the decoded strings!
const vm = require('vm');
const ctx = {};
vm.createContext(ctx);

// Find index where `function _0x3ea1` and the shuffle loop end.
// We can search for the end of the deobfuscation preamble.
const preambleEnd = code.indexOf('const {ipcRenderer') !== -1 ? code.indexOf('const {ipcRenderer') : code.indexOf('let config');
console.log('Preamble search pos:', preambleEnd);

// Let's find where the first variable or class is declared after the string decoder
const match = code.match(/function _0x3ea1[\s\S]+?return _0x3e18a9;\s*\}/);
if (match) {
  const endIdx = match.index + match[0].length;
  console.log('Decoder end idx:', endIdx);
  const preamble = code.slice(0, endIdx);
  vm.runInContext(preamble, ctx);

  console.log('ctx keys:', Object.keys(ctx));
  // The string array is _0x5374()
  const arr = vm.runInContext('_0x5374()', ctx);
  console.log('Array length:', arr.length);

  // Let's decode all strings by calling _0x4fe8 or inspecting raw strings
  const found = [];
  for (let i = 0; i < arr.length; i++) {
    const raw = arr[i];
    found.push(raw);
  }
  
  // Search for keywords
  const keywords = ['simultaneous', 'int_', 'keystroke', 'suara', 'gambar', 'action', 'Action', 'interaction', 'delay'];
  const matches = found.filter(s => keywords.some(k => s.toLowerCase().includes(k.toLowerCase())));
  console.log('Matching strings in array:', matches);
}
