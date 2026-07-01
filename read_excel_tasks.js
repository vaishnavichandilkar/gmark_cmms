const XLSX = require('./tmp_xlsx/node_modules/xlsx');

const workbook = XLSX.readFile('Task_Management_Feature_Tracker_v4.xlsx');

for (const sheetName of workbook.SheetNames) {
  console.log(`Sheet: ${sheetName}`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cellValue = row[c];
      if (typeof cellValue === 'string') {
        const lowerCell = cellValue.toLowerCase();
        if (lowerCell.includes("scada") || lowerCell.includes("audit") || lowerCell.includes("websocket")) {
          console.log(`Sheet '${sheetName}', Row ${r + 1}, Col ${c + 1}: ${cellValue}`);
        }
      }
    }
  }
}
