const fs = require('fs');

const accessed = new Set();
const dummyEl = {
  addEventListener: () => {},
  removeEventListener: () => {},
  classList: { add: () => {}, remove: () => {} },
  style: {},
  dataset: {},
  value: ''
};

const mockDoc = {
  querySelector: () => dummyEl,
  querySelectorAll: () => [dummyEl],
  getElementById: () => dummyEl,
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.window = {
  location: { href: 'http://localhost' },
  addEventListener: () => {},
  api: new Proxy({}, {
    get(target, prop) {
      accessed.add(prop);
      if (prop === 'getConfig') {
        return () => Promise.resolve({
          mode: 'like',
          theme: 'dark',
          overlayPort: 8642,
          stats: {},
          activities: [],
          overlays: {}
        });
      }
      if (prop === 'getGoals' || prop === 'getAllGoals') {
        return () => Promise.resolve({
          likes: { title: 'Likes', current: 0, target: 100 },
          followers: { title: 'Followers', current: 0, target: 100 }
        });
      }
      return (...args) => Promise.resolve({});
    }
  })
};
global.document = mockDoc;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };

require('../renderer/js/app.js');

setTimeout(() => {
  console.log('All window.api properties accessed in app.js:');
  console.log(Array.from(accessed));
}, 1000);
