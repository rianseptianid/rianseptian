const fs = require('fs');
const code = fs.readFileSync('renderer/js/app.js', 'utf8');

// Let's find every occurrence of window[...]['...'] or window.api[...]
// But since app.js has strings decoded by _0x4fe8 and _0x3ea1, let's look at all string literals or decoded strings.
// Let's create an environment with app.js functions and run:
const vm = require('vm');
const ctx = vm.createContext({});
// Grab from 0 up to before setupNavToggle or similar:
const cut = code.substring(0, 500000);
// Let's extract the array and the functions _0x4fe8 and _0x3ea1
const arrayMatch = code.match(/function _0x5374\(\)\{[\s\S]*?return _0x\w+;?\}/);
const fn4fe8 = code.match(/function _0x4fe8\(_0x\w+,_0x\w+\)\{[\s\S]*?return _0x\w+;?\}/);
const fn3ea1 = code.match(/function _0x3ea1\(_0x\w+,_0x\w+\)\{[\s\S]*?return _0x\w+;?\}/);

console.log('Found:', !!arrayMatch, !!fn4fe8, !!fn3ea1);
if (arrayMatch && fn4fe8 && fn3ea1) {
  const setup = arrayMatch[0] + ';' + fn4fe8[0] + ';' + fn3ea1[0] + ';';
  vm.runInContext(setup, ctx);
  // Also run the IIFE shifter:
  const iife = code.substring(code.indexOf('(function(_0x38b123'), code.indexOf('const $='));
  vm.runInContext(iife, ctx);
  
  // Now we can decode ANY index!
  // In loadGoalsUI:
  // window[_0x5e74c5(0xc07)][_0x5e74c5(0xd00)+_0x5e74c5(0x2727)]()
  // let's test:
  console.log('0xc07 ->', ctx._0x4fe8(0xc07));
  console.log('0xd00 ->', ctx._0x4fe8(0xd00));
  console.log('0x2727 ->', ctx._0x4fe8(0x2727));
  console.log('0xd00 + 0x2727 ->', ctx._0x4fe8(0xd00) + ctx._0x4fe8(0x2727));
  console.log('0x155d ->', ctx._0x3ea1(0x155d, 'uHwn'));
}
