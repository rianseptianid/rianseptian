const TriggerEngine = require('../src/triggerEngine');

const mockConfigManager = {
  get: () => ({
    keyTrigger: { defaultDelayMs: 50 },
    interactions: [],
    activities: [],
    triggers: []
  })
};

const engine = new TriggerEngine(mockConfigManager, console);

const eventsEmitted = [];
engine.on('sound', (d) => eventsEmitted.push({ event: 'sound', data: d }));
engine.on('media', (d) => eventsEmitted.push({ event: 'media', data: d }));
engine.on('key', (d) => eventsEmitted.push({ event: 'key', data: d }));

async function run() {
  const actions = [
    { type: 'key', spec: 'Space', delayMs: 50, holdMs: 0 },
    { type: 'sound', file: 'C:/test/audio.mp3', volume: 100 },
    { type: 'media', file: 'C:/test/image.png', mediaType: 'image', durationMs: 3000 }
  ];

  await engine.testActions(actions, 'gift', true, 1);
  await new Promise(r => setTimeout(r, 600));
  console.log('Events emitted:', eventsEmitted);
}

run().catch(console.error);
