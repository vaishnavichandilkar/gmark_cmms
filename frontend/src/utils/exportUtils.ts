import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Exports data to either PDF or Excel format.
 * 
 * @param headers An array of string headers for the table columns.
 * @param rows A 2D array of data rows corresponding to the headers.
 * @param filename The name of the file to save (without extension).
 * @param title A title to print at the top of the PDF document.
 * @param format 'pdf' or 'excel'
 */
export function exportData(
  headers: string[],
  rows: any[][],
  filename: string,
  title: string,
  format: 'pdf' | 'excel'
) {
  if (format === 'pdf') {
    const doc = new jsPDF();
    
    // Add a title to the PDF
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    // Add timestamp
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Generate the table
    autoTable(doc, {
      startY: 36,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald 500
      styles: { fontSize: 8 },
    });

    doc.save(`${filename}.pdf`);
  } else if (format === 'excel') {
    // Combine headers and rows for SheetJS AOA (Array of Arrays)
    const worksheetData = [headers, ...rows];
    
    // Create a new workbook and add the worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Save the file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }
}
