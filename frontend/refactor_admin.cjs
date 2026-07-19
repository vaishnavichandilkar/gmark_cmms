const fs = require('fs');
const file = '/home/vallabh-ghatge/GmarkSoftPvtLtd/hypn/frontend/src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  // Layout wrappers
  [/className="min-h-screen bg-black -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 text-white relative flex flex-col"/g, 'className="min-h-screen bg-transparent -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 text-gray-900 relative flex flex-col"'],
  [/className="flex items-center justify-between pb-4 border-b border-white\/10 mb-6"/g, 'className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6"'],
  
  // Cards
  [/liquid-glass border border-white\/5 bg-zinc-950\/20/g, 'bg-white border border-gray-200 shadow-sm'],
  
  // Text colors
  [/text-white/g, 'text-gray-900'],
  [/text-zinc-400/g, 'text-gray-500'],
  [/text-zinc-500/g, 'text-gray-400'],
  [/text-zinc-300/g, 'text-gray-600'],
  [/text-zinc-600/g, 'text-gray-400'],
  [/text-gray-900\/10/g, 'text-gray-200'], // revert any accidental override if there was white/10
  
  // Borders
  [/border-white\/10/g, 'border-gray-200'],
  [/border-white\/5/g, 'border-gray-100'],
  [/border-white\/20/g, 'border-gray-300'],
  
  // Backgrounds
  [/bg-zinc-900\/50/g, 'bg-gray-50'],
  [/bg-zinc-900\/30/g, 'bg-white'],
  [/bg-zinc-900\/60/g, 'bg-gray-50'],
  [/hover:bg-zinc-900\/60/g, 'hover:bg-gray-50'],
  [/bg-zinc-800/g, 'bg-gray-100'],
  [/bg-zinc-900/g, 'bg-gray-50'],
  [/bg-\[\#0f1117\]/g, 'bg-white'],
  [/bg-black\/50/g, 'bg-gray-900/50'],
  [/bg-\[\#090a0e\]/g, 'bg-white'],
  [/bg-black\/80/g, 'bg-gray-900/50'],
  
  // Buttons
  [/bg-blue-600 hover:bg-blue-500/g, 'bg-green-600 hover:bg-green-500'],
  [/from-blue-600 to-indigo-600/g, 'from-green-500 to-emerald-600'],
  [/text-blue-400/g, 'text-green-600'],
  [/text-blue-500/g, 'text-green-500'],
  [/border-blue-500\/50/g, 'border-green-500/50'],
  [/focus:border-blue-500/g, 'focus:border-green-500'],
  [/ring-blue-500\/20/g, 'ring-green-500/20'],
  
  // Amber / Teal / Purple -> Green (To match 4M theme strictly)
  [/text-amber-500/g, 'text-green-600'],
  [/bg-amber-500\/20/g, 'bg-green-50'],
  [/text-amber-400/g, 'text-green-600'],
  [/bg-amber-500\/10 border-amber-500\/30/g, 'bg-green-50 border-green-200'],
  
  [/text-purple-500/g, 'text-green-600'],
  [/bg-purple-500\/20/g, 'bg-green-50'],
  [/text-purple-400/g, 'text-green-600'],
  [/bg-purple-500\/10 border-purple-500\/30/g, 'bg-green-50 border-green-200'],
  
  [/text-cyan-500/g, 'text-green-600'],
  [/bg-cyan-500\/20/g, 'bg-green-50'],
  [/text-cyan-400/g, 'text-green-600'],
  [/bg-cyan-500\/10 border-cyan-500\/30/g, 'bg-green-50 border-green-200'],
  
  [/text-rose-500/g, 'text-green-600'],
  [/bg-rose-500\/20/g, 'bg-green-50'],
  [/text-rose-400/g, 'text-green-600'],
];

for (const [regex, replacement] of replacements) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync(file, content);
console.log("Refactored AdminPage.tsx to light theme.");
