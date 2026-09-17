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

function deobMethod(name) {
  const methodStart = originalCode.indexOf(name);
  if (methodStart === -1) return 'NOT FOUND: ' + name;
  const nextAsync = originalCode.indexOf('async', methodStart + 10);
  const methodCode = originalCode.slice(methodStart, nextAsync !== -1 ? nextAsync : methodStart + 1500);

  let deob = methodCode.replace(/_0x(?:b4e5cb|efc3e2|3851de|45e3bd|453ed3|171fad|12c2aa|381612|5ad2e0|7f4333|10966e|39c7ae|224eae)\((0x[0-9a-f]+)\)/gi, (m, arg1) => {
    try {
      return JSON.stringify(ctx._0x395e(parseInt(arg1)));
    } catch (e) { return m; }
  });

  deob = deob.replace(/_0x(?:5c2dd3|199417|5a2809|41387b|272694|278ec4|2e989a|5448e0|3cdb3f|2e5022|327299|4190af|531629|4d8bbf|3dfc05)\((0x[0-9a-f]+),\s*['"]([^'"]+)['"]\)/gi, (m, arg1, arg2) => {
    try {
      return JSON.stringify(ctx._0x13ce(parseInt(arg1), arg2));
    } catch (e) { return m; }
  });
  return deob;
}

console.log('--- testActions ---');
console.log(deobMethod('async[_0xb4e5cb(0x121)+_0x5c2dd3(0x112'));
