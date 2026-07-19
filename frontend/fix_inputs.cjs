const fs = require('fs');
const file = '/home/vallabh-ghatge/GmarkSoftPvtLtd/hypn/frontend/src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  [/bg-black\/40/g, 'bg-gray-50'],
  [/bg-black\/20/g, 'bg-gray-50'],
  [/border-gray-200 focus:border-green-500/g, 'border-gray-300 focus:border-green-500 bg-white'],
];

for (const [regex, replacement] of replacements) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync(file, content);
console.log("Fixed inputs.");
