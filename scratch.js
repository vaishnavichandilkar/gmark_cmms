const fs = require('fs');
let code = fs.readFileSync('./frontend/src/pages/machines/AddMachine.tsx', 'utf8');

// Add import
if (!code.includes('CustomSelect')) {
  code = code.replace("import { ArrowLeft } from 'lucide-react';", "import { ArrowLeft } from 'lucide-react';\nimport { CustomSelect } from '../../components/CustomSelect';");
}

// Replace Company select
code = code.replace(
  /<select[\s\S]*?name="company"[\s\S]*?<\/select>/,
  `<CustomSelect
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Select Company"
                      options={[{ label: 'Gritpulse', value: 'Gritpulse' }]}
                    />`
);

// Replace facilityId select
code = code.replace(
  /<select[\s\S]*?name="facilityId"[\s\S]*?<\/select>/,
  `<CustomSelect
                      name="facilityId"
                      value={formData.facilityId}
                      onChange={handleChange}
                      placeholder="Select Main Facility"
                      options={facilities.map(f => ({ label: f.facilityName, value: f.id.toString() }))}
                    />`
);

// Replace maintenanceHead select
code = code.replace(
  /<select[\s\S]*?name="maintenanceHead"[\s\S]*?<\/select>/,
  `<CustomSelect
                      name="maintenanceHead"
                      value={formData.maintenanceHead}
                      onChange={handleChange}
                      placeholder="Select Head"
                      options={[
                        { label: 'Head 1', value: 'Head 1' },
                        { label: 'Head 2', value: 'Head 2' }
                      ]}
                    />`
);

// Replace status select
code = code.replace(
  /<select[\s\S]*?name="status"[\s\S]*?<\/select>/,
  `<CustomSelect
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      placeholder="Select Status"
                      options={[
                        { label: 'Online', value: 'Online' },
                        { label: 'Offline', value: 'Offline' }
                      ]}
                    />`
);

// Replace make select
code = code.replace(
  /<select[\s\S]*?name="make"[\s\S]*?<\/select>/,
  `<CustomSelect
                      name="make"
                      value={formData.make}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[{ label: 'Make 1', value: 'Make 1' }]}
                    />`
);

// Replace modelNumber select
code = code.replace(
  /<select[\s\S]*?name="modelNumber"[\s\S]*?<\/select>/,
  `<CustomSelect
                      name="modelNumber"
                      value={formData.modelNumber}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[{ label: 'Model 1', value: 'Model 1' }]}
                    />`
);

// Replace machineCategory select
code = code.replace(
  /<select[\s\S]*?name="machineCategory"[\s\S]*?<\/select>/,
  `<CustomSelect
                      name="machineCategory"
                      value={formData.machineCategory}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[{ label: 'Category 1', value: 'Category 1' }]}
                    />`
);

// Replace machineSubCategory select
code = code.replace(
  /<select[\s\S]*?name="machineSubCategory"[\s\S]*?<\/select>/,
  `<CustomSelect
                      name="machineSubCategory"
                      value={formData.machineSubCategory}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[{ label: 'Sub-Category 1', value: 'Sub-Category 1' }]}
                    />`
);

fs.writeFileSync('./frontend/src/pages/machines/AddMachine.tsx', code);
