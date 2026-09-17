const fs = require('fs');

// Create mock browser globals
global.window = global;
global.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: (id) => {
    // Return mock element
    return {
      addEventListener: () => {},
      style: {},
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      setAttribute: () => {},
      getAttribute: () => null
    };
  },
  addEventListener: () => {}
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.navigator = { userAgent: 'node' };
global.api = {
  getConfig: async () => ({ interactions: [], activities: [] }),
  getGifts: async () => [],
  getSoundboard: async () => []
};
global.location = { href: 'http://localhost' };

try {
  require('../renderer/js/app.js');
  console.log('app.js loaded without error!');
} catch (e) {
  console.error('Error in app.js:', e);
}
