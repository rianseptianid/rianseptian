const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

// The snippet around 316587 to 321000 has renderInteractionList!
// Let's decode strings in that region (from index 308000 to 330000)
const { ctx, arr } = (() => {
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
  const context = {};
  vm.createContext(context);
  vm.runInContext(codeToEval, context);
  return { ctx: context, arr: context._0x5374() };
})();

// Replace all calls like _0x...(0x...) in snippet with the decoded string
let snippet = content.substring(308000, 325000);
snippet = snippet.replace(/_0x[a-f0-9]+\((0x[a-f0-9]+)(?:,\s*['"][^'"]*['"])?\)/g, (match, hex) => {
  try {
    const val = ctx._0x4fe8(parseInt(hex, 16));
    return JSON.stringify(val);
  } catch (e) {
    return match;
  }
});

fs.writeFileSync('scratch/decoded_interactions.js', snippet);
console.log('Wrote decoded snippet to scratch/decoded_interactions.js, length:', snippet.length);
