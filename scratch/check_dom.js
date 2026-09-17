const fs = require('fs');
const html = fs.readFileSync('renderer/index.html', 'utf8');

const nurearnStart = html.indexOf('id="nurearnLiveApp"');
const chatPanelStart = html.indexOf('id="dashboardLiveChatPanel"');

console.log('nurearnStart:', nurearnStart);
console.log('chatPanelStart:', chatPanelStart);

const sliceNurearn = html.substring(nurearnStart, chatPanelStart);
const openNurearn = (sliceNurearn.match(/<div(\s|>)/gi) || []).length;
const closeNurearn = (sliceNurearn.match(/<\/div>/gi) || []).length;
console.log('nurearnApp slice: Opens:', openNurearn, 'Closes:', closeNurearn, 'Diff:', openNurearn - closeNurearn);

const dashStart = html.indexOf('id="tab-dashboard"');
const dashEnd = html.indexOf('</section>', dashStart);
const sliceDash = html.substring(dashStart, dashEnd);
const openDash = (sliceDash.match(/<div(\s|>)/gi) || []).length;
const closeDash = (sliceDash.match(/<\/div>/gi) || []).length;
console.log('tab-dashboard slice: Opens:', openDash, 'Closes:', closeDash, 'Diff:', openDash - closeDash);
