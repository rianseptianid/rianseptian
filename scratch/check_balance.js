const fs = require('fs');
const html = fs.readFileSync('renderer/index.html', 'utf8');
const pStart = html.indexOf('id="nurearnLiveApp"');
const pEnd = html.indexOf('id="dashboardLiveChatPanel"');
const slice = html.substring(pStart, pEnd);
const opens = (slice.match(/<div\b/g) || []).length;
const closes = (slice.match(/<\/div>/g) || []).length;
console.log('Opens:', opens, 'Closes:', closes, 'Unclosed div count:', opens - closes);
