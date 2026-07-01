const xlsx = require('./tmp_xlsx/node_modules/xlsx');
const workbook = xlsx.readFile('Task_Management_Feature_Tracker_v4.xlsx');
const result = {};
workbook.SheetNames.forEach(sheetName => {
  result[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1});
});
console.log(JSON.stringify(result, null, 2));
