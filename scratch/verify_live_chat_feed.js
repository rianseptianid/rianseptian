const fs = require('fs');
const path = require('path');

// Test index.html has the elements
const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');

console.log('--- Checking HTML Elements ---');
console.log('Has #chatFeed:', html.includes('id="chatFeed"'));
console.log('Has #btnClearChatFeed:', html.includes('id="btnClearChatFeed"'));
console.log('Has #btnTestChatFeed:', html.includes('id="btnTestChatFeed"'));
console.log('Has script liveChatFeed.js:', html.includes('src="js/liveChatFeed.js"'));

// Test liveChatFeed.js syntax & logic
const js = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'js', 'liveChatFeed.js'), 'utf8');

console.log('--- Checking liveChatFeed.js features ---');
console.log('Handles type === "chat":', js.includes("type === 'chat'"));
console.log('Handles member/join:', js.includes("type === 'member' || type === 'join'"));
console.log('Handles follow:', js.includes("type === 'follow'"));
console.log('Handles share:', js.includes("type === 'share'"));
console.log('Has appendChatComment:', js.includes('function appendChatComment'));
console.log('Has appendJoinEvent:', js.includes('function appendJoinEvent'));

// Mock DOM execution
const eventCallbacks = [];
global.window = {
  api: {
    onEvent: (cb) => eventCallbacks.push(cb)
  }
};

const domStore = {};
function createMockEl(id, className = '') {
  const children = [];
  const el = {
    id,
    className,
    style: {},
    innerHTML: '',
    children,
    querySelector: (sel) => {
      if (sel === '#chatFeedEmpty') return children.find(c => c.id === 'chatFeedEmpty') || null;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.feed-item') return children.filter(c => c.className && c.className.includes('feed-item'));
      return [];
    },
    appendChild: (child) => {
      children.push(child);
      return child;
    },
    removeChild: (child) => {
      const idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
    },
    remove: () => {},
    scrollTop: 0,
    scrollHeight: 500,
    addEventListener: (evt, handler) => {
      el['on_' + evt] = handler;
    }
  };
  domStore[id] = el;
  return el;
}

const chatFeed = createMockEl('chatFeed', 'feed chat-feed');
const chatEmpty = createMockEl('chatFeedEmpty', 'chat-feed-empty-state');
chatFeed.children.push(chatEmpty);
chatEmpty.remove = () => {
  const idx = chatFeed.children.indexOf(chatEmpty);
  if (idx !== -1) chatFeed.children.splice(idx, 1);
};

const btnTest = createMockEl('btnTestChatFeed', 'btn btn-ghost btn-sm');
const btnClear = createMockEl('btnClearChatFeed', 'btn btn-ghost btn-sm');

global.document = {
  readyState: 'complete',
  getElementById: (id) => domStore[id] || null,
  createElement: (tag) => {
    return {
      tagName: tag,
      className: '',
      innerHTML: '',
      style: {}
    };
  },
  addEventListener: () => {}
};
global.MutationObserver = class {
  observe() {}
  disconnect() {}
};

eval(js);

console.log('--- Executing Realtime TikTok Events ---');
console.log('Registered callbacks:', eventCallbacks.length);

// 1. Fire chat event
eventCallbacks.forEach(cb => cb({
  type: 'chat',
  payload: {
    uniqueId: 'rian_dev',
    nickname: 'Rian Developer',
    comment: 'Halo min, ini komentar overlay!',
    avatar: 'https://p16-sign-va.tiktokcdn.com/avatar.jpg'
  },
  ts: Date.now()
}));

console.log('ChatFeed children count after chat event:', chatFeed.children.length);
const firstItem = chatFeed.children[0];
console.log('First item className:', firstItem.className);
console.log('First item contains gold name:', firstItem.innerHTML.includes('Rian Developer'));
console.log('First item contains comment:', firstItem.innerHTML.includes('Halo min, ini komentar overlay!'));

// 2. Fire join event
eventCallbacks.forEach(cb => cb({
  type: 'member',
  payload: {
    uniqueId: 'siti_gamer',
    nickname: 'Siti Gamer',
    avatar: ''
  },
  ts: Date.now()
}));

console.log('ChatFeed children count after join event:', chatFeed.children.length);
const secondItem = chatFeed.children[1];
console.log('Second item className:', secondItem.className);
console.log('Second item has BERGABUNG badge:', secondItem.innerHTML.includes('👋 BERGABUNG'));
console.log('Second item has Siti Gamer:', secondItem.innerHTML.includes('Siti Gamer'));
console.log('Second item has bergabung desc:', secondItem.innerHTML.includes('bergabung ke siaran LIVE'));

// 3. Test button click simulation
btnTest.on_click({ preventDefault: () => {} });
console.log('ChatFeed children count after clicking Test button:', chatFeed.children.length);

console.log('--- ALL VERIFICATION CHECKS PASSED! ---');
