// Run immediately after a non-emulator optimized build. No SDK/network initialization.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const markers = /__learningEmulatorApps|Invalid Firebase local-test|Emulator integration must not use mock mode|Unsafe Firebase local-test|127\.0\.0\.1:8080|127\.0\.0\.1:9099/;
let checked = 0;
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) scan(file);
    else if (file.endsWith('.js')) {
      checked++;
      assert.doesNotMatch(fs.readFileSync(file, 'utf8'), markers, file);
    }
  }
}
scan(path.join(root, '.next/static'));
scan(path.join(root, '.next/server'));
assert.ok(checked > 0);
console.log(`PASS: ${checked} generated client/server JS files, including dynamic chunks, contain no app emulator initialization markers/endpoints/globals. Generic SDK exports are not app call sites.`);