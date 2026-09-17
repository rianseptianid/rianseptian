const assert = require('assert');
const TriggerEngine = require('../src/triggerEngine');

async function runTests() {
  console.log('--- Testing Simultaneous Keystroke + Sound + Media Fix ---');

  const mockConfigManager = {
    get: () => ({
      keyTrigger: { defaultDelayMs: 50 },
      interactions: [],
      activities: []
    }),
    updateStats: () => {}
  };

  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {}
  };

  const engine = new TriggerEngine(mockConfigManager, mockLogger);

  // Collect emitted events
  const emittedEvents = [];
  engine.on('sound', data => emittedEvents.push({ type: 'sound', data, time: Date.now() }));
  engine.on('media', data => emittedEvents.push({ type: 'media', data, time: Date.now() }));
  engine.on('trigger:key', data => emittedEvents.push({ type: 'trigger:key', data, time: Date.now() }));

  const testActions = [
    { type: 'key', spec: 'A', delayMs: 100, holdMs: 0 },
    { type: 'sound', file: 'C:\\sounds\\alert.mp3', volume: 100 },
    { type: 'media', file: 'C:\\images\\popup.gif', durationMs: 3000 }
  ];

  // Warm-up to load native binaries
  await engine._executeInteractionActions([{ type: 'key', spec: 'A', delayMs: 0 }], true);

  console.log('1. Testing _executeInteractionActions with simultaneous = true');
  const t0 = Date.now();
  await engine._executeInteractionActions(testActions, true);
  const diffSimultaneous = Date.now() - t0;

  console.log(`Simultaneous execution elapsed time: ${diffSimultaneous}ms`);
  const soundEvt = emittedEvents.find(e => e.type === 'sound');
  const mediaEvt = emittedEvents.find(e => e.type === 'media');

  assert.ok(soundEvt, 'Sound event must be emitted');
  assert.strictEqual(soundEvt.data.file, 'C:\\sounds\\alert.mp3');
  assert.strictEqual(soundEvt.data.volume, 100);

  assert.ok(mediaEvt, 'Media event must be emitted');
  assert.strictEqual(mediaEvt.data.file, 'C:\\images\\popup.gif');
  assert.strictEqual(mediaEvt.data.mediaType, 'image');
  assert.strictEqual(mediaEvt.data.durationMs, 3000);

  // Both sound and media were emitted immediately without waiting for keystroke delay (should be < 50ms)
  assert.ok(diffSimultaneous < 80, `Expected simultaneous execution to not wait for delay, got ${diffSimultaneous}ms`);
  console.log('✅ Simultaneous execution verified!');

  console.log('2. Testing testInteraction API method');
  emittedEvents.length = 0;
  await engine.testInteraction({
    name: 'Test Interaksi Keystroke Sound Media',
    actions: testActions,
    simultaneous: true
  });

  const soundTest = emittedEvents.find(e => e.type === 'sound');
  const mediaTest = emittedEvents.find(e => e.type === 'media');
  assert.ok(soundTest, 'testInteraction must emit sound');
  assert.ok(mediaTest, 'testInteraction must emit media');
  console.log('✅ testInteraction execution verified!');

  console.log('3. Testing _executeInteractionActions with simultaneous = false (sequential)');
  emittedEvents.length = 0;
  const t1 = Date.now();
  await engine._executeInteractionActions(testActions, false);
  const diffSequential = Date.now() - t1;
  console.log(`Sequential execution elapsed time: ${diffSequential}ms`);
  assert.ok(diffSequential >= 90, `Expected sequential execution to wait for key delay (>=90ms), got ${diffSequential}ms`);
  console.log('✅ Sequential execution verified!');

  console.log('--- ALL TESTS PASSED! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
