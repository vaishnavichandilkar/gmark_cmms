const fs = require('fs');
const file = '/home/vallabh-ghatge/GmarkSoftPvtLtd/hypn/frontend/src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Column Wrappers
content = content.replace(/bg-white border border-gray-200 shadow-sm rounded-\[20px\] p-4 flex flex-col min-h-\[500px\]/g, 
  'bg-white border border-gray-200 shadow-sm rounded-3xl p-5 flex flex-col min-h-[600px]');

// 2. Column Headers
// The headers are wrapped in a div. We can find 'text-xs font-bold text-gray-500 uppercase tracking-widest'
content = content.replace(/className="flex items-center gap-2"/g, 'className="flex items-center gap-2"'); // noop just to check
content = content.replace(/text-xs font-bold text-gray-500 uppercase tracking-widest/g, 'text-xs font-extrabold text-green-500 uppercase tracking-wider ml-1');
// Change header icons to green
content = content.replace(/<Building2 size=\{16\} className="text-gray-500" \/>/g, '<Building2 size={18} className="text-green-500" />');
content = content.replace(/<Server size=\{16\} className="text-gray-500" \/>/g, '<Server size={18} className="text-green-500" />');
// The flex container for the header to have border-b
content = content.replace(/<div className="flex items-center justify-between mb-4">/g, '<div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">');

// 3. Society & Tower Cards
// Societies
content = content.replace(
  /className=\{`flex items-center justify-between p-3 rounded-xl border transition-all select-none \$\{/g,
  'className={`flex items-center justify-between p-4 rounded-[16px] border transition-all select-none ${'
);
content = content.replace(
  /isSelected \? 'border-green-500 bg-gray-50\/20' \n\s*: 'border-gray-200 bg-white hover:border-gray-300'/g,
  "isSelected ? 'border-green-300 bg-[#f0fcf4]' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'"
);
// In case it's on one line
content = content.replace(
  /isSelected \? 'border-green-500 bg-gray-50\/20' : 'border-gray-200 bg-white hover:border-gray-300'/g,
  "isSelected ? 'border-green-300 bg-[#f0fcf4] shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50 shadow-sm'"
);

// Society Icon
content = content.replace(
  /className=\{`p-2 rounded-lg \$\{isSelected \? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'\}`\}/g,
  "className={`p-2.5 rounded-xl ${isSelected ? 'bg-green-100/50 text-green-600' : 'bg-gray-100 text-gray-400'}`}"
);

// Towers
content = content.replace(
  /className=\{`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none \$\{isSelected/g,
  'className={`flex items-center justify-between p-4 rounded-[16px] border transition-all cursor-pointer select-none ${isSelected'
);
content = content.replace(
  /\? 'border-green-500 bg-gray-50\/20'\n\s*: 'border-gray-200 bg-white hover:border-gray-300'/g,
  "? 'border-green-300 bg-[#f0fcf4] shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50 shadow-sm'"
);
// Tower Icon
content = content.replace(
  /className=\{`p-2 rounded-lg \$\{isSelected \? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'\}`\}/g,
  "className={`p-2.5 rounded-xl ${isSelected ? 'bg-green-100/50 text-green-600' : 'bg-gray-100 text-gray-400'}`}" // already changed above, wait it might be the same
);

// 4. Buttons (+ and edit/delete)
content = content.replace(/p-1\.5 hover:bg-white\/5 border border-gray-200 rounded-lg text-gray-500/g, 'p-1.5 hover:bg-gray-100 border border-gray-100 rounded text-gray-400 hover:text-gray-600');
content = content.replace(/p-2 bg-gray-50 border border-gray-100 hover:border-zinc-700 rounded-lg text-gray-500 hover:text-gray-900/g, 'p-1.5 bg-white border border-gray-100 hover:border-gray-300 rounded text-gray-400 hover:text-gray-600');
// Empty state text
content = content.replace(/text-gray-500 italic/g, 'text-gray-400 text-sm font-medium');

fs.writeFileSync(file, content);
console.log("Applied specific styling.");
