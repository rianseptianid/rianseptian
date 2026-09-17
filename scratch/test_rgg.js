const fs = require('fs');
const js = fs.readFileSync('renderer/js/app.js', 'utf8');

const rggIdx = js.indexOf('function renderGiftGallery()');
console.log('rggIdx:', rggIdx);
console.log(js.slice(rggIdx, rggIdx + 3000));
