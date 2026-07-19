const fs = require('fs');
const file = '/home/vallabh-ghatge/GmarkSoftPvtLtd/hypn/frontend/src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Inject State
content = content.replace(
  /const \[isUsersDrawerOpen, setIsUsersDrawerOpen\] = useState\(false\);/,
  "const [isUsersDrawerOpen, setIsUsersDrawerOpen] = useState(false);\n  const [activeAdminTab, setActiveAdminTab] = useState('societies');"
);

// 2. Inject Tabs and replace Grid wrapper
const tabsUI = `      {/* Admin Tabs Navigation */}
      <div className="flex items-center gap-8 border-b border-gray-200 mb-6 px-2">
        {['societies', 'towers', 'devices', 'users'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveAdminTab(tab as any)}
            className={\`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative \${
              activeAdminTab === tab ? 'text-green-600' : 'text-gray-500 hover:text-gray-900'
            }\`}
          >
            {tab}
            {activeAdminTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content Wrapper */}
      <div className="flex-1 items-stretch mb-24">`;

content = content.replace(
  /\{\/\* 3-Column Core Dashboard Layout \*\/\}\s*<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-stretch mb-24">/,
  tabsUI
);

// 3. Wrap Columns in Conditionals
content = content.replace(
  /\{\/\* COLUMN 1: SOCIETIES \*\/\}/g,
  "{activeAdminTab === 'societies' && (\n        {/* COLUMN 1: SOCIETIES */}"
);

content = content.replace(
  /\{\/\* COLUMN 2: TOWERS \*\/\}/g,
  "      )}\n\n      {activeAdminTab === 'towers' && (\n        {/* COLUMN 2: TOWERS */}"
);

content = content.replace(
  /\{\/\* COLUMN 3: DEVICES \*\/\}/g,
  "      )}\n\n      {activeAdminTab === 'devices' && (\n        {/* COLUMN 3: DEVICES */}"
);

// Close the devices conditional right before the Modals section
content = content.replace(
  /\{\/\* === MODALS === \*\/\}/g,
  "      )}\n\n      {/* === MODALS === */}"
);

fs.writeFileSync(file, content);
console.log("Tabbed layout base applied.");
