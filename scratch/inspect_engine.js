const OriginalTriggerEngine = require('../src/originalTriggerEngine');

console.log('OriginalTriggerEngine prototype methods:');
console.log(Object.getOwnPropertyNames(OriginalTriggerEngine.prototype));

const engine = new OriginalTriggerEngine({}, console);
console.log('engine keys:', Object.keys(engine));
