const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const srcRequire = createRequire(path.resolve(__dirname, '../src/index.js'));

const originalCode = fs.readFileSync('src/originalTriggerEngine.js', 'utf8');

const vm = require('vm');
const ctx = { require: srcRequire, console };
vm.createContext(ctx);

const classIdx = originalCode.indexOf('class TriggerEngine');
const headerCode = originalCode.slice(0, classIdx);
vm.runInContext(headerCode, ctx);

console.log('ctx has _0x395e:', typeof ctx._0x395e);
console.log('ctx has _0x13ce:', typeof ctx._0x13ce);

const methodStart = originalCode.indexOf('async[_0xb4e5cb(0x1f2)');
const methodEnd = originalCode.indexOf('async[\'_fire\']');
const methodCode = originalCode.slice(methodStart, methodEnd);

let deob = methodCode.replace(/_0x(?:b4e5cb|efc3e2|3851de|45e3bd|453ed3|171fad|12c2aa|381612|5ad2e0|7f4333|10966e|39c7ae|224eae)\((0x[0-9a-f]+)\)/gi, (m, arg1) => {
  try {
    const val = ctx._0x395e(parseInt(arg1));
    return JSON.stringify(val);
  } catch (e) {
    return m;
  }
});

deob = deob.replace(/_0x(?:5c2dd3|199417|5a2809|41387b|272694|278ec4|2e989a|5448e0|3cdb3f|2e5022|327299|4190af|531629|4d8bbf|3dfc05)\((0x[0-9a-f]+),\s*['"]([^'"]+)['"]\)/gi, (m, arg1, arg2) => {
  try {
    const val = ctx._0x13ce(parseInt(arg1), arg2);
    return JSON.stringify(val);
  } catch (e) {
    return m;
  }
});

console.log('--- DEOBFUSCATED _executeInteractionActions ---');
console.log(deob);
