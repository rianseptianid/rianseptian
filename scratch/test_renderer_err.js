const fs = require('fs');
const jsdom = require('jsdom');
// If jsdom is not available, we can test with basic DOM mocks in node
const vm = require('vm');

const html = fs.readFileSync('renderer/index.html', 'utf8');
console.log('HTML loaded, length:', html.length);

// Let's check for any uncaught errors in renderer/js files!
