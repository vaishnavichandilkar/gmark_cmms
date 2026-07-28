const fs = require('fs');
const path = require('path');

const buttonPatterns = [
  // 1. Primary "Add New [Entity]" button in Master lists
  {
    find: /className=["']flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm["']/g,
    replace: 'className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm"'
  },
  
  // 2. Form "Next" / "Save" / "Submit" button
  {
    find: /className=["'](flex items-center gap-2 )?bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm( disabled:opacity-70)?["']/g,
    replace: 'className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-70"'
  },
  
  {
    find: /className=["']px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors["']/g,
    replace: 'className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm"'
  },

  // 3. Form "Cancel" / "Back" button
  {
    find: /className=["']px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors["']/g,
    replace: 'className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95"'
  },
  
  {
    find: /className=["']px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors["']/g,
    replace: 'className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95"'
  }
];

const processDir = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const pattern of buttonPatterns) {
        if (pattern.find.test(content)) {
          content = content.replace(pattern.find, pattern.replace);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
};

processDir(path.join(__dirname, 'src', 'pages'));
