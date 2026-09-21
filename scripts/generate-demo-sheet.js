const ExcelJS = require('exceljs');
const path = require('path');

async function createIndustrialDemoSheet() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gmark Software Pvt Ltd';
  workbook.lastModifiedBy = 'Vallabh Ghatge';
  workbook.created = new Date('2026-09-17T17:58:00');

  const sheet = workbook.addWorksheet('Client Demo Plan', {
    views: [{ showGridLines: true }]
  });

  // 3 Columns: Functionality Name, Description, Date
  sheet.columns = [
    { width: 34 }, // Functionality Name
    { width: 72 }, // Description (Simple Industrial Language)
    { width: 20 }, // Date
  ];

  // Title Banner
  sheet.mergeCells('A1:C2');
  const title = sheet.getCell('A1');
  title.value = 'Plant SCADA System — Client Demo & Delivery Schedule';
  title.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Dark Slate Navy

  // Header Row
  sheet.getRow(3).values = ['Functionality Name', 'Description', 'Date'];
  sheet.getRow(3).height = 28;

  ['A3', 'B3', 'C3'].forEach(cellId => {
    const c = sheet.getCell(cellId);
    c.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Industrial Blue
    c.alignment = { vertical: 'middle', horizontal: cellId === 'C3' ? 'center' : 'left', indent: cellId === 'C3' ? 0 : 1 };
    c.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Clean, Simple Industrial Language Rows
  const rows = [
    // --- SECTION 1: ALARMS & NOTIFICATIONS ---
    {
      isSectionHeader: true,
      title: 'PHASE 1: LIVE MONITORING & ALARM SYSTEM (TWO PANELS)'
    },
    {
      name: 'Set High / Low Alarm Limits',
      desc: 'Set safe operating limits (like high water pressure or low level) to trigger an alarm if crossed.',
      date: '16-Sep-2026'
    },
    {
      name: 'Alarm Severity Levels (Emergency / Warning / Info)',
      desc: 'Classify alarms by urgency with priority levels from 1 to 5 so critical plant faults stand out immediately.',
      date: '16-Sep-2026'
    },
    {
      name: 'Dual Panel Live Monitoring',
      desc: 'Watch live readings (line pressure, 3-phase voltages, pump run status) for two booster panels on one screen.',
      date: '17-Sep-2026'
    },
    {
      name: 'Instant Screen Alarm Pop-ups',
      desc: 'Alarm banners pop up immediately on the operator screen with clear warning messages the moment a fault occurs.',
      date: '17-Sep-2026'
    },
    {
      name: 'Visual Fault Card Highlighting',
      desc: 'The faulty reading box blinks and glows red on screen so operators can spot the troubled machine in seconds.',
      date: '17-Sep-2026'
    },
    {
      name: 'Central Alarm Log & Counter',
      desc: 'Top notification bell showing total active plant alarms, exact trigger time, and fault details in one click.',
      date: '17-Sep-2026'
    },
    {
      name: 'Automatic Alarm Reset (Self-Clear)',
      desc: 'Alarms automatically switch off and turn green when water pressure or machine readings return to normal safe levels.',
      date: '18-Sep-2026'
    },
    {
      name: 'Multi-Panel Simultaneous Alarm Testing',
      desc: 'Tested and verified that alarms from both panels work together smoothly without missing any fault notifications.',
      date: '18-Sep-2026'
    },

    // --- SECTION 2: REMOTE PUMP CONTROLS ---
    {
      isSectionHeader: true,
      title: 'PHASE 2: REMOTE PUMP CONTROL & OPERATOR SAFETY'
    },
    {
      name: 'Remote Pump Start / Stop',
      desc: 'Start or stop pumps directly from the software screen with live running status feedback.',
      date: '18-Sep-2026'
    },
    {
      name: 'Safety Password Lock for Pumps',
      desc: 'Requires a security PIN before turning ON any pump to prevent accidental machine operation by staff.',
      date: '19-Sep-2026'
    },
    {
      name: 'Auto / Manual Mode Selection',
      desc: 'Switch pumps between automated sensor-based running and manual operator control from the screen.',
      date: '20-Sep-2026'
    },
    {
      name: 'Pump Interlock & Trip Protection Testing',
      desc: 'Ensures pumps automatically stop or refuse to run during safety trip conditions (like dry run or overload).',
      date: '21-Sep-2026'
    },

    // --- SECTION 3: REHEARSAL & CLIENT DEMO ---
    {
      isSectionHeader: true,
      title: 'PHASE 3: MANAGEMENT DRY RUN & CLIENT LIVE DEMO'
    },
    {
      name: 'Internal Practice Run with Manager',
      desc: 'Full practice run of alarms and pump controls with the manager to verify everything is smooth before the client call.',
      date: '21-Sep-2026'
    },
    {
      name: 'Official Client Live Demonstration',
      desc: 'Live demonstration for the client showcasing remote pump control, safety password, and dual-panel alarms.',
      date: '22-Sep-2026',
      isFinalDemo: true
    }
  ];

  let currentRow = 4;

  rows.forEach((item, idx) => {
    if (item.isSectionHeader) {
      sheet.mergeCells(`A${currentRow}:C${currentRow}`);
      const sectionCell = sheet.getCell(`A${currentRow}`);
      sectionCell.value = item.title;
      sectionCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      sectionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate Header
      sectionCell.alignment = { vertical: 'middle', indent: 1 };
      sheet.getRow(currentRow).height = 24;
      currentRow++;
      return;
    }

    sheet.getRow(currentRow).values = [item.name, item.desc, item.date];
    sheet.getRow(currentRow).height = 30;

    const cellA = sheet.getCell(`A${currentRow}`);
    const cellB = sheet.getCell(`B${currentRow}`);
    const cellC = sheet.getCell(`C${currentRow}`);

    cellA.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cellA.alignment = { vertical: 'middle', indent: 1 };

    cellB.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };
    cellB.alignment = { vertical: 'middle', wrapText: true, indent: 1 };

    cellC.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: item.isFinalDemo ? { argb: 'FFDC2626' } : { argb: 'FF1E40AF' }
    };
    cellC.alignment = { vertical: 'middle', horizontal: 'center' };

    [cellA, cellB, cellC].forEach(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (item.isFinalDemo) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Red highlight
      } else if (currentRow % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; // Zebra
      }
    });

    currentRow++;
  });

  const outputPath = path.resolve('/home/vallabh-ghatge/GmarkSoftPvtLtd/gmark-iot/docs/client-demo/SCADA_Client_Demo_Timeline_and_Execution_Plan.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Excel sheet successfully updated with industrial language at: ${outputPath}`);
}

createIndustrialDemoSheet().catch(err => {
  console.error(err);
  process.exit(1);
});
