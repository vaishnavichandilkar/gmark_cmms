const fs = require('fs');
const path = require('path');

const distSrcMain = path.join(__dirname, '..', 'dist', 'src', 'main.js');
const distMain = path.join(__dirname, '..', 'dist', 'main.js');

if (fs.existsSync(distSrcMain)) {
  fs.writeFileSync(distMain, "require('./src/main');\n", 'utf8');
  console.log('[postbuild] Created/updated dist/main.js entrypoint forwarding to dist/src/main.js');
}

// If DATABASE_URL is present at build time (e.g. Render build environment), run schema sync now
if (process.env.DATABASE_URL) {
  try {
    const initDb = require('./init-production-db');
    initDb()
      .then(() => {
        console.log('[postbuild] Database initialized during build phase.');
      })
      .catch((err) => {
        console.warn('[postbuild] Non-fatal initDb warning:', err.message);
      });
  } catch (e) {
    console.warn('[postbuild] Could not run init-production-db during postbuild:', e.message);
  }
}
