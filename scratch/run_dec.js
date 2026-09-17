const fs = require('fs');
const content = fs.readFileSync('renderer/js/app.js', 'utf8');

// Search for strings containing feed-item or chatFeed
// In obfuscated code, strings can be found by evaluating the decoder
// Let's get the decoder functions and decode all strings!
const decCode = content.substring(0, content.indexOf('const $='));
const vm = require('vm');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(decCode, ctx);

console.log('Decoders available:', typeof ctx._0x4fe8, typeof ctx._0x3ea1);
