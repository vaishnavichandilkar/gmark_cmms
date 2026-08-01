const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/machines/EditMachine.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix label font weight and color
content = content.replace(/className="block text-xs font-bold text-gray-900 mb-1\.5"/g, 'className="block text-xs font-semibold text-gray-700 mb-1.5"');

// Fix input borders
content = content.replace(/border-gray-400/g, 'border-gray-300');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed theme classes in EditMachine.tsx');
