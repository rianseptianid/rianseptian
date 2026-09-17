const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

// Find all hex string lookups like _0x4026cc(0x..., '...') or _0x132d9f(0x..., '...')
// But even simpler: let's run the beginning of app.js in a vm to get the deobfuscation function!
const vm = require('vm');
const context = {};
vm.createContext(context);

// Look for the string array and table decoder
const match = content.match(/^(const _0x[a-f0-9]+=_0x[a-f0-9]+.*?)(?=document|window|api|\$\()/s);
if (match) {
  console.log('Found prelude length:', match[1].length);
}
