const fs = require('fs');
let code = fs.readFileSync('./frontend/src/pages/machines/EditMachine.tsx', 'utf8');

// Add import
if (!code.includes('CustomSelect')) {
  code = code.replace("import { ArrowLeft", "import { CustomSelect } from '../../components/CustomSelect';\nimport { ArrowLeft");
}

// Replace select 1
code = code.replace(
  /<select[\s\S]*?name="headOfDepartment"[\s\S]*?<\/select>/,
  `<CustomSelect
                      name="headOfDepartment"
                      value={formData.headOfDepartment}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[
                        { label: 'Head 1', value: 'Head 1' }
                      ]}
                    />`
);

// Replace select 2
code = code.replace(
  /<select[\s\S]*?name="machineOwner"[\s\S]*?<\/select>/,
  `<CustomSelect
                      name="machineOwner"
                      value={formData.machineOwner}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[
                        { label: 'Owner 1', value: 'Owner 1' }
                      ]}
                    />`
);

// Replace status select (in step 1 or other places if exists)
// Wait, I only saw the ones with long classes and the small ones.

// For the rest of the <select> tags, they don't seem to have standard formData names, or maybe they do.
// Let's just fix the remaining ones if any.

fs.writeFileSync('./frontend/src/pages/machines/EditMachine.tsx', code);
