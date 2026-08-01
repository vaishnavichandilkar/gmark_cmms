const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/machines/EditMachine.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Add Specification Field
content = content.replace(/className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-sm font-semibold text-gray-800 rounded-lg transition-colors"/g,
  'className="flex items-center gap-2 px-4 py-2 bg-[#00a651] hover:bg-[#009040] border border-transparent text-sm font-semibold text-white rounded-lg transition-colors shadow-sm"');

// Replace Add Spare, AMC, Purchase, Upload, Add location
content = content.replace(/className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold text-sm rounded-xl flex items-center gap-2 hover:bg-gray-300 transition-colors shadow-sm"/g,
  'className="px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm"');

// Replace Add System
content = content.replace(/className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-sm rounded-lg transition-colors shadow-sm"/g,
  'className="flex items-center gap-2 px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-bold text-sm rounded-lg transition-colors shadow-sm"');

// Fix Plus icons inside these buttons (remove text-[#00a651])
content = content.replace(/<Plus size=\{18\} className="text-\[#00a651\] stroke-\[3\]" \/>/g, '<Plus size={18} className="stroke-[3]" />');
content = content.replace(/<Plus size=\{16\} className="text-\[#00a651\] stroke-\[3\]" \/>/g, '<Plus size={16} className="stroke-[3]" />');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed button colors');
