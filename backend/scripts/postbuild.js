const fs = require('fs');
const path = require('path');

const distSrcMain = path.join(__dirname, '..', 'dist', 'src', 'main.js');
const distMain = path.join(__dirname, '..', 'dist', 'main.js');

if (fs.existsSync(distSrcMain) && !fs.existsSync(distMain)) {
  fs.writeFileSync(distMain, "require('./src/main');\n", 'utf8');
  console.log('[postbuild] Created dist/main.js entrypoint forwarding to dist/src/main.js');
}
