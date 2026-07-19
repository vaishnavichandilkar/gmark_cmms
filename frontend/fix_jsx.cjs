const fs = require('fs');
const file = '/home/vallabh-ghatge/GmarkSoftPvtLtd/hypn/frontend/src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\{activeAdminTab === 'societies' && \(\n\s*\{\/\* COLUMN 1: SOCIETIES \*\/\}\n\s*<div/g,
  "{activeAdminTab === 'societies' && (\n        <div"
);

content = content.replace(
  /\{activeAdminTab === 'towers' && \(\n\s*\{\/\* COLUMN 2: TOWERS \*\/\}\n\s*<div/g,
  "{activeAdminTab === 'towers' && (\n        <div"
);

content = content.replace(
  /\{activeAdminTab === 'devices' && \(\n\s*\{\/\* COLUMN 3: DEVICES \*\/\}\n\s*<div/g,
  "{activeAdminTab === 'devices' && (\n        <div"
);

fs.writeFileSync(file, content);
console.log("Fixed JSX syntax.");
