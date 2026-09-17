const fs = require('fs');
const path = require('path');
const OriginalTriggerEngine = require('../src/originalTriggerEngine');

const fnStr = OriginalTriggerEngine.prototype._executeInteractionActions.toString();
console.log('--- _executeInteractionActions code ---');
console.log(fnStr);
