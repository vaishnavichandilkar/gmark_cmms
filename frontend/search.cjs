const fs = require('fs');
const path = require('path');

function searchDir(dir, term) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, term);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(term.toLowerCase())) {
        console.log(`Found "${term}" in: ${fullPath}`);
      }
    }
  }
}

console.log('Searching for "Config Editor"...');
searchDir('./src', 'Config Editor');

console.log('Searching for "MQTT Debugger"...');
searchDir('./src', 'MQTT Debugger');

console.log('Searching for "View Configer"...');
searchDir('./src', 'View Configer');
