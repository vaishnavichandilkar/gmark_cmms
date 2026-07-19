const fs = require('fs');
const content = fs.readFileSync('prisma/seed.ts', 'utf-8');
const newContent = content.replace(/isVisible:\s*(true|false),?\s*/g, '');
fs.writeFileSync('prisma/seed.ts', newContent);
