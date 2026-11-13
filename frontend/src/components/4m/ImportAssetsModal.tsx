import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Download, 
  Loader2,
  Building,
  Building2,
  Cpu,
  Layers,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export interface ImportAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingTreeData?: any[];
}

export interface ParsedAssetItem {
  type: 'mainFacility' | 'facility' | 'machine';
  rawType: string;
  name: string;
  code: string;
  category: string;
  subCategory: string;
  parentLocation: string;
  make: string;
  model: string;
  status: string;
  description: string;
  isValid: boolean;
  validationError?: string;
  importStatus?: 'pending' | 'success' | 'already_exists' | 'failed';
  importMessage?: string;
}

export function downloadSampleAssetsTemplate() {
  const headers = [
    'Asset Type',
    'Asset Name',
    'Asset Code',
    'Category',
    'Sub Category',
    'Parent Location',
    'Make',
    'Model Number',
    'Status',
    'Description'
  ];

  // Clean template with headers only (no sample data rows)
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);

  worksheet['!cols'] = [
    { wch: 16 }, // Asset Type
    { wch: 30 }, // Asset Name
    { wch: 14 }, // Asset Code
    { wch: 22 }, // Category
    { wch: 25 }, // Sub Category
    { wch: 30 }, // Parent Location
    { wch: 16 }, // Make
    { wch: 16 }, // Model Number
    { wch: 12 }, // Status
    { wch: 45 }, // Description
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets_Template');
  XLSX.writeFile(workbook, 'Sample_Assets_Import_Template.xlsx');
  toast.success('Excel import template downloaded successfully!');
}

export function downloadImportResultsExcel(rows: ParsedAssetItem[]) {
  if (!rows || rows.length === 0) {
    toast.error('No import records available to download.');
    return;
  }

  const workbook = XLSX.utils.book_new();

  // 1. All Records Sheet
  const allRowsData = rows.map((r, index) => ({
    'Row #': index + 1,
    'Asset Type': r.rawType,
    'Asset Name': r.name,
    'Asset Code': r.code || '-',
    'Category': r.category || '-',
    'Sub Category': r.subCategory || '-',
    'Parent Location': r.parentLocation || '-',
    'Make': r.make || '-',
    'Model Number': r.model || '-',
    'Import Status': r.importStatus === 'success' 
      ? 'SUCCESS' 
      : r.importStatus === 'already_exists' 
      ? 'ALREADY EXISTS (SKIPPED)' 
      : r.importStatus === 'failed'
      ? 'FAILED'
      : 'PENDING',
    'Details / Message': r.importMessage || (r.importStatus === 'success' ? 'Imported successfully' : '-')
  }));

  const allWorksheet = XLSX.utils.json_to_sheet(allRowsData);
  allWorksheet['!cols'] = [
    { wch: 8 },  // Row #
    { wch: 16 }, // Asset Type
    { wch: 30 }, // Asset Name
    { wch: 15 }, // Asset Code
    { wch: 20 }, // Category
    { wch: 20 }, // Sub Category
    { wch: 25 }, // Parent Location
    { wch: 15 }, // Make
    { wch: 15 }, // Model Number
    { wch: 26 }, // Import Status
    { wch: 55 }, // Details / Message
  ];
  XLSX.utils.book_append_sheet(workbook, allWorksheet, 'Import_Results');

  // 2. Errors & Duplicates Sheet
  const issueRows = rows.filter(r => r.importStatus === 'failed' || r.importStatus === 'already_exists');
  if (issueRows.length > 0) {
    const errorRowsData = issueRows.map((r, index) => ({
      'Row #': index + 1,
      'Asset Type': r.rawType,
      'Asset Name': r.name,
      'Asset Code': r.code || '-',
      'Category': r.category || '-',
      'Parent Location': r.parentLocation || '-',
      'Issue Type': r.importStatus === 'already_exists' ? 'ALREADY EXISTS (SKIPPED)' : 'FAILED / ERROR',
      'Reason / Error Details': r.importMessage || 'Error occurred'
    }));

    const errorWorksheet = XLSX.utils.json_to_sheet(errorRowsData);
    errorWorksheet['!cols'] = [
      { wch: 8 },  // Row #
      { wch: 16 }, // Asset Type
      { wch: 30 }, // Asset Name
      { wch: 15 }, // Asset Code
      { wch: 20 }, // Category
      { wch: 25 }, // Parent Location
      { wch: 26 }, // Issue Type
      { wch: 60 }, // Reason
    ];
    XLSX.utils.book_append_sheet(workbook, errorWorksheet, 'Errors_And_Duplicates');
  }

  // 3. Summary Stats Sheet
  const successCount = rows.filter(r => r.importStatus === 'success').length;
  const alreadyExistsCount = rows.filter(r => r.importStatus === 'already_exists').length;
  const failedCount = rows.filter(r => r.importStatus === 'failed').length;

  const summaryData = [
    { 'Metric': 'Total Parsed Rows', 'Value': rows.length },
    { 'Metric': 'Successfully Imported', 'Value': successCount },
    { 'Metric': 'Already Exists (Skipped)', 'Value': alreadyExistsCount },
    { 'Metric': 'Failed / Errors', 'Value': failedCount },
    { 'Metric': 'Generated At', 'Value': new Date().toLocaleString() },
  ];
  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [{ wch: 28 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary_Stats');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Assets_Import_Report_${timestamp}.xlsx`);
  toast.success('Import report file downloaded successfully!');
}

export function ImportAssetsModal({ isOpen, onClose, onSuccess, existingTreeData = [] }: ImportAssetsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedAssetItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importState, setImportState] = useState<'idle' | 'success' | 'error'>('idle');
  const [importSummary, setImportSummary] = useState<{
    total: number;
    created: number;
    alreadyExists: number;
    failed: number;
  } | null>(null);
  const [resultsFilter, setResultsFilter] = useState<'all' | 'success' | 'already_exists' | 'failed'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDisplayRows = useMemo(() => {
    if (importState !== 'success') return parsedData;
    if (resultsFilter === 'all') return parsedData;
    if (resultsFilter === 'success') return parsedData.filter(d => d.importStatus === 'success');
    if (resultsFilter === 'already_exists') return parsedData.filter(d => d.importStatus === 'already_exists');
    if (resultsFilter === 'failed') return parsedData.filter(d => d.importStatus === 'failed');
    return parsedData;
  }, [parsedData, importState, resultsFilter]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const normalizeType = (raw: string): 'mainFacility' | 'facility' | 'machine' => {
    const s = String(raw || '').toLowerCase().trim();
    if (s.includes('main') || s.includes('plant')) return 'mainFacility';
    if (s.includes('sub') || s.includes('facility') || s.includes('building') || s.includes('location')) return 'facility';
    return 'machine';
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setValidationErrors([]);
    setImportState('idle');
    setImportSummary(null);
    setParsedData([]);

    // 1. Strictly enforce Excel format only (.xlsx, .xls)
    const fileName = selectedFile.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isExcel) {
      setValidationErrors([
        'Invalid file type. Only Excel files (.xlsx, .xls) matching the sample template are supported.'
      ]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setValidationErrors(['The uploaded Excel workbook contains no valid worksheets.']);
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];

        // 2. Validate template headers
        const headerRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (!headerRows || headerRows.length === 0 || !headerRows[0] || (headerRows[0] as any[]).length === 0) {
          setValidationErrors([
            'The uploaded Excel file is empty. Please download and use the official sample Excel template.'
          ]);
          return;
        }

        const rawHeaders = (headerRows[0] as any[]).map(h =>
          String(h ?? '').trim().toLowerCase().replace(/[\s_-]/g, '')
        );

        // Required headers matching the sample template:
        // Sample headers: 'Asset Type', 'Asset Name', 'Asset Code', 'Category', 'Sub Category', 'Parent Location'
        const hasAssetType = rawHeaders.some(h => h.includes('assettype') || h === 'type');
        const hasAssetName = rawHeaders.some(h => h.includes('assetname') || h === 'name');

        if (!hasAssetType || !hasAssetName) {
          setValidationErrors([
            'Invalid template format. The uploaded file must match the official sample Excel template headers (Asset Type, Asset Name, Asset Code, Category, Sub Category, Parent Location, Make, Model Number, Status, Description). Please download the sample template.'
          ]);
          return;
        }

        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          setValidationErrors([
            'The uploaded Excel file contains only headers and no asset data rows. Please fill in your assets into the template and upload again.'
          ]);
          return;
        }

        const items: ParsedAssetItem[] = rawRows.map((row) => {
          // Find field values with case-insensitive / flexible keys
          const getVal = (candidates: string[]) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.trim().toLowerCase().replace(/[\s_-]/g, '');
              for (const cand of candidates) {
                if (cleanKey === cand.toLowerCase().replace(/[\s_-]/g, '')) {
                  return String(row[key] || '').trim();
                }
              }
            }
            return '';
          };

          const rawType = getVal(['Asset Type', 'Type', 'Kind', 'Level']);
          const name = getVal(['Asset Name', 'Name', 'Facility Name', 'Machine Name', 'Title']);
          const code = getVal(['Asset Code', 'Code', 'Machine Code', 'Facility Code']);
          const category = getVal(['Category', 'Asset Category', 'Type Category']);
          const subCategory = getVal(['Sub Category', 'Subcategory', 'Sub-Category']);
          const parentLocation = getVal(['Parent Location', 'Parent', 'Location', 'Facility', 'Building', 'Main Facility']);
          const make = getVal(['Make', 'Manufacturer', 'Brand']);
          const model = getVal(['Model Number', 'Model', 'Model No']);
          const status = getVal(['Status', 'State']) || 'Active';
          const description = getVal(['Description', 'Notes', 'Remarks']);

          const type = normalizeType(rawType);
          const isValid = Boolean(name);
          const validationError = !name ? 'Asset Name is required' : undefined;

          return {
            type,
            rawType: rawType || (type === 'mainFacility' ? 'Main Facility' : type === 'facility' ? 'Sub Facility' : 'Machine'),
            name,
            code,
            category,
            subCategory,
            parentLocation,
            make,
            model,
            status,
            description,
            isValid,
            validationError
          };
        });

        const invalidRows = items.filter(it => !it.isValid);
        if (invalidRows.length > 0) {
          setValidationErrors([`${invalidRows.length} rows have missing required fields (e.g. Asset Name).`]);
        }

        setParsedData(items);
      } catch (err: any) {
        console.error('File parsing error:', err);
        setValidationErrors(['Failed to read Excel file. Please verify it is a valid Excel file (.xlsx, .xls) matching the sample template.']);
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsProcessing(true);
    setImportState('idle');

    let createdCount = 0;
    let alreadyExistsCount = 0;
    let failedCount = 0;

    const workingRows: ParsedAssetItem[] = parsedData.map(r => ({
      ...r,
      importStatus: r.isValid ? ('pending' as const) : ('failed' as const),
      importMessage: r.isValid ? '' : (r.validationError || 'Asset Name is required')
    }));

    // Pre-count validation failures
    failedCount = workingRows.filter(r => !r.isValid).length;

    try {
      // 1. Fetch current existing facilities, main facilities, and machines for duplicate checking
      const [mainFacsRes, facsRes, buildingsRes, machinesRes] = await Promise.all([
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] })),
        api.get('/buildings').catch(() => ({ data: [] })),
        api.get('/machines').catch(() => ({ data: [] }))
      ]);

      const mainFacMap = new Map<string, number>();
      const existingMainFacNames = new Map<string, number>();
      const existingMainFacCodes = new Map<string, number>();

      (mainFacsRes.data || []).forEach((mf: any) => {
        const id = mf.id;
        if (mf.mainFacilityName) {
          const nameKey = mf.mainFacilityName.toLowerCase().trim();
          mainFacMap.set(nameKey, id);
          existingMainFacNames.set(nameKey, id);
        }
        if (mf.mainFacilityCode) {
          const codeKey = mf.mainFacilityCode.toLowerCase().trim();
          mainFacMap.set(codeKey, id);
          existingMainFacCodes.set(codeKey, id);
        }
      });

      const facMap = new Map<string, number>();
      const existingFacNames = new Map<string, number>();
      const existingFacCodes = new Map<string, number>();

      (facsRes.data || []).forEach((f: any) => {
        const id = f.id;
        if (f.facilityName) {
          const nameKey = f.facilityName.toLowerCase().trim();
          facMap.set(nameKey, id);
          existingFacNames.set(nameKey, id);
        }
        if (f.facilityCode) {
          const codeKey = f.facilityCode.toLowerCase().trim();
          facMap.set(codeKey, id);
          existingFacCodes.set(codeKey, id);
        }
      });

      const bldgMap = new Map<string, number>();
      (buildingsRes.data || []).forEach((b: any) => {
        if (b.name) {
          const nameKey = b.name.toLowerCase().trim();
          bldgMap.set(nameKey, b.id);
          facMap.set(nameKey, b.id);
        }
      });

      const existingMachineNames = new Set<string>();
      const existingMachineCodes = new Set<string>();
      (machinesRes.data || []).forEach((m: any) => {
        if (m.name) existingMachineNames.add(m.name.toLowerCase().trim());
        if (m.machineCode) existingMachineCodes.add(m.machineCode.toLowerCase().trim());
        if (m.assetCode) existingMachineCodes.add(m.assetCode.toLowerCase().trim());
      });

      // Also ingest existingTreeData if provided
      const ingestTree = (nodes: any[]) => {
        for (const n of nodes) {
          const nameLower = (n.name || '').toLowerCase().trim();
          if (n.type === 'mainFacility' || String(n.id).startsWith('mf-')) {
            const num = parseInt(String(n.id).replace('mf-', ''), 10);
            if (!isNaN(num)) {
              mainFacMap.set(nameLower, num);
              existingMainFacNames.set(nameLower, num);
            }
          } else if (n.type === 'facility' || n.type === 'building' || String(n.id).startsWith('fac-') || String(n.id).startsWith('bldg-')) {
            const num = parseInt(String(n.id).replace(/^(fac-|bldg-)/, ''), 10);
            if (!isNaN(num)) {
              facMap.set(nameLower, num);
              existingFacNames.set(nameLower, num);
            }
          } else {
            existingMachineNames.add(nameLower);
            if (n.originalData?.machineCode) existingMachineCodes.add(String(n.originalData.machineCode).toLowerCase().trim());
            if (n.originalData?.assetCode) existingMachineCodes.add(String(n.originalData.assetCode).toLowerCase().trim());
          }
          if (n.children && n.children.length > 0) {
            ingestTree(n.children);
          }
        }
      };
      if (existingTreeData && existingTreeData.length > 0) {
        ingestTree(existingTreeData);
      }

      // Pass 1: Main Facilities
      for (const row of workingRows) {
        if (!row.isValid || row.type !== 'mainFacility') continue;

        const nameKey = row.name.toLowerCase().trim();
        const codeKey = row.code ? row.code.toLowerCase().trim() : '';

        // Check if already exists in DB
        if (existingMainFacNames.has(nameKey) || (codeKey && existingMainFacCodes.has(codeKey))) {
          const existingId = existingMainFacNames.get(nameKey) || (codeKey ? existingMainFacCodes.get(codeKey) : undefined);
          if (existingId) {
            mainFacMap.set(nameKey, existingId);
            if (codeKey) mainFacMap.set(codeKey, existingId);
          }
          row.importStatus = 'already_exists';
          row.importMessage = `Main Facility '${row.name}' already exists in database (Skipped duplicate).`;
          alreadyExistsCount++;
          continue;
        }

        try {
          const payload = {
            mainFacilityCode: row.code || `MF-${Date.now().toString().slice(-4)}`,
            mainFacilityName: row.name,
            mainFacilityHead: 'Admin',
            category: row.category || 'Plants',
            subcategory: row.subCategory || 'General',
            status: row.status || 'Active',
            address: 'Default Address',
            description: row.description || '',
          };
          const res = await api.post('/main-facilities', payload);
          const newId = res.data?.id;
          if (newId) {
            mainFacMap.set(nameKey, newId);
            if (codeKey) mainFacMap.set(codeKey, newId);
            existingMainFacNames.set(nameKey, newId);
          }
          row.importStatus = 'success';
          row.importMessage = 'Imported successfully';
          createdCount++;
        } catch (err: any) {
          const errMsg = err.response?.data?.message || err.message || 'Failed to create Main Facility';
          const isDup = String(errMsg).toLowerCase().includes('already exists') || err.response?.status === 409;
          if (isDup) {
            row.importStatus = 'already_exists';
            row.importMessage = `Main Facility already exists: ${errMsg}`;
            alreadyExistsCount++;
          } else {
            row.importStatus = 'failed';
            row.importMessage = errMsg;
            failedCount++;
          }
        }
      }

      // Pass 2: Sub Facilities
      for (const row of workingRows) {
        if (!row.isValid || row.type !== 'facility') continue;

        const nameKey = row.name.toLowerCase().trim();
        const codeKey = row.code ? row.code.toLowerCase().trim() : '';
        const parentKey = row.parentLocation.toLowerCase().trim();

        // Check if already exists in DB
        if (existingFacNames.has(nameKey) || (codeKey && existingFacCodes.has(codeKey))) {
          const existingId = existingFacNames.get(nameKey) || (codeKey ? existingFacCodes.get(codeKey) : undefined);
          if (existingId) {
            facMap.set(nameKey, existingId);
            if (codeKey) facMap.set(codeKey, existingId);
          }
          row.importStatus = 'already_exists';
          row.importMessage = `Sub Facility '${row.name}' already exists in database (Skipped duplicate).`;
          alreadyExistsCount++;
          continue;
        }

        try {
          const mainFacId = mainFacMap.get(parentKey);
          const parentFacId = facMap.get(parentKey);
          const fallbackMainFacId = mainFacMap.size > 0 ? Array.from(mainFacMap.values())[0] : 1;

          const payload = {
            facilityCode: row.code || `FAC-${Date.now().toString().slice(-4)}`,
            facilityName: row.name,
            category: row.category || 'Buildings',
            subCategory: row.subCategory || 'General',
            mainFacilityId: mainFacId || (!parentFacId ? fallbackMainFacId : undefined),
            parentFacilityId: parentFacId || undefined,
            status: row.status || 'Active',
            description: row.description || '',
          };

          const res = await api.post('/facilities', payload);
          const newId = res.data?.id;
          if (newId) {
            facMap.set(nameKey, newId);
            if (codeKey) facMap.set(codeKey, newId);
            existingFacNames.set(nameKey, newId);
          }
          row.importStatus = 'success';
          row.importMessage = 'Imported successfully';
          createdCount++;
        } catch (err: any) {
          const errMsg = err.response?.data?.message || err.message || 'Failed to create Sub Facility';
          const isDup = String(errMsg).toLowerCase().includes('already exists') || err.response?.status === 409;
          if (isDup) {
            row.importStatus = 'already_exists';
            row.importMessage = `Sub Facility already exists: ${errMsg}`;
            alreadyExistsCount++;
          } else {
            row.importStatus = 'failed';
            row.importMessage = errMsg;
            failedCount++;
          }
        }
      }

      // Pass 3: Machines
      for (const row of workingRows) {
        if (!row.isValid || row.type !== 'machine') continue;

        const nameKey = row.name.toLowerCase().trim();
        const codeKey = row.code ? row.code.toLowerCase().trim() : '';
        const parentKey = row.parentLocation.toLowerCase().trim();

        // Check if already exists in DB
        if (existingMachineNames.has(nameKey) || (codeKey && existingMachineCodes.has(codeKey))) {
          row.importStatus = 'already_exists';
          row.importMessage = `Machine '${row.name}' already exists in database (Skipped duplicate).`;
          alreadyExistsCount++;
          continue;
        }

        try {
          const targetFacilityId = facMap.get(parentKey);
          const targetBuildingId = bldgMap.get(parentKey);
          const fallbackFacId = facMap.size > 0 ? Array.from(facMap.values())[0] : 1;

          const payload = {
            name: row.name,
            machineCode: row.code || `MCH-${Date.now().toString().slice(-4)}`,
            machineCategory: row.category || 'Equipment',
            machineSubCategory: row.subCategory || '',
            facilityId: targetFacilityId || (!targetBuildingId ? fallbackFacId : undefined),
            buildingId: targetBuildingId || undefined,
            make: row.make || '',
            modelNumber: row.model || '',
            status: row.status || 'Active',
            description: row.description || '',
          };

          await api.post('/machines', payload);
          existingMachineNames.add(nameKey);
          if (codeKey) existingMachineCodes.add(codeKey);

          row.importStatus = 'success';
          row.importMessage = 'Imported successfully';
          createdCount++;
        } catch (err: any) {
          const errMsg = err.response?.data?.message || err.message || 'Failed to create Machine';
          const isDup = String(errMsg).toLowerCase().includes('already exists') || err.response?.status === 409;
          if (isDup) {
            row.importStatus = 'already_exists';
            row.importMessage = `Machine already exists: ${errMsg}`;
            alreadyExistsCount++;
          } else {
            row.importStatus = 'failed';
            row.importMessage = errMsg;
            failedCount++;
          }
        }
      }

      setParsedData(workingRows);
      setImportSummary({
        total: workingRows.length,
        created: createdCount,
        alreadyExists: alreadyExistsCount,
        failed: failedCount,
      });
      setImportState('success');

      if (createdCount > 0) {
        toast.success(`Bulk import completed: ${createdCount} imported successfully.`);
        onSuccess();
      } else if (alreadyExistsCount > 0) {
        toast(`Import finished: All ${alreadyExistsCount} items already exist in database.`);
      } else {
        toast.error('Import failed. Please check the error report.');
      }
    } catch (err: any) {
      console.error('Import process failed:', err);
      setImportState('error');
      toast.error('An error occurred during bulk import.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportState('idle');
    setImportSummary(null);
    setResultsFilter('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetFile();
    onClose();
  };

  const mainFacCount = parsedData.filter(d => d.type === 'mainFacility').length;
  const facilityCount = parsedData.filter(d => d.type === 'facility').length;
  const machineCount = parsedData.filter(d => d.type === 'machine').length;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UploadCloud size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Import Assets</h2>
              <p className="text-xs text-slate-500">Bulk import facilities, sub-facilities, and machines using the sample Excel template</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!file ? (
            <>
              {/* Middle Level: Download Sample Template */}
              <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-4 py-2.5 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <FileSpreadsheet size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Sample Excel Template</p>
                    <p className="text-[11px] text-slate-500">Download the blank template with formatted column headers (.xlsx)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleAssetsTemplate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  title="Download sample Excel template"
                >
                  <Download size={13} />
                  <span>Download Sample</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]' 
                    : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/80 bg-slate-50/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  <UploadCloud size={24} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-0.5">Click to choose Excel file, or drag and drop here</h4>
                <p className="text-[11px] text-slate-500">Only Excel files (.xlsx, .xls) matching the sample template are supported</p>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                />
              </div>

              {/* Information Note */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 text-[11px]">Supported Asset Types in Excel Template:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Building2 size={13} className="text-purple-600" />
                    <span><strong>Main Facility</strong> (Plant)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Building size={13} className="text-blue-600" />
                    <span><strong>Sub Facility</strong> (Building)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Cpu size={13} className="text-emerald-600" />
                    <span><strong>Machine</strong> (Asset / Tool)</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* File Selected Card */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • {parsedData.length} records parsed
                    </p>
                  </div>
                </div>
                {!isProcessing && importState !== 'success' && (
                  <button
                    type="button"
                    onClick={resetFile}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Change File
                  </button>
                )}
              </div>

              {/* Summary Stats - Shown only when parsedData has records */}
              {parsedData.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-purple-700 uppercase block">Main Facilities</span>
                    <span className="text-base font-extrabold text-purple-900">{mainFacCount}</span>
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block">Sub Facilities</span>
                    <span className="text-base font-extrabold text-blue-900">{facilityCount}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">Machines</span>
                    <span className="text-base font-extrabold text-amber-900">{machineCount}</span>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex gap-2.5">
                    <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs font-bold text-rose-900 mb-0.5">
                        {parsedData.length === 0 ? 'Template Validation Failed' : 'Validation Warnings'}
                      </p>
                      <ul className="text-[11px] text-rose-700 list-disc pl-4 space-y-0.5">
                        {validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {parsedData.length === 0 && (
                    <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                      <span className="text-[11px] text-rose-800">Need the correct template?</span>
                      <button
                        type="button"
                        onClick={downloadSampleAssetsTemplate}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Download size={12} />
                        <span>Download Sample Template</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Success Result State */}
              {importState === 'success' && importSummary && (
                <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 sm:mt-0">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Import Processing Completed</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          <span className="font-semibold text-emerald-700">{importSummary.created} Imported Successfully</span>
                          {importSummary.alreadyExists > 0 && (
                            <span> • <span className="font-semibold text-amber-700">{importSummary.alreadyExists} Already Exists (Skipped)</span></span>
                          )}
                          {importSummary.failed > 0 && (
                            <span> • <span className="font-semibold text-rose-700">{importSummary.failed} Failed</span></span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Download Error & Success Report Button */}
                    <button
                      type="button"
                      onClick={() => downloadImportResultsExcel(parsedData)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                      title="Download detailed Excel file containing success, already exists, and error status"
                    >
                      <Download size={13} />
                      <span>Download Error / Results File</span>
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60">
                    <div className="bg-white/80 rounded-lg p-2 text-center border border-emerald-200/80">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Imported</span>
                      <span className="text-base font-extrabold text-emerald-800">{importSummary.created}</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2 text-center border border-amber-200/80">
                      <span className="text-[10px] font-bold text-amber-700 uppercase block">Already Exists</span>
                      <span className="text-base font-extrabold text-amber-800">{importSummary.alreadyExists}</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2 text-center border border-slate-200">
                      <span className="text-[10px] font-bold text-rose-700 uppercase block">Failed</span>
                      <span className="text-base font-extrabold text-rose-800">{importSummary.failed}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {importState === 'error' && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="text-rose-600 shrink-0" size={22} />
                  <div>
                    <p className="text-xs font-bold text-rose-900">Import Failed</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">An error occurred while importing records. Please check the file format and try again.</p>
                  </div>
                </div>
              )}

              {/* Records Table */}
              {parsedData.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-100/80 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {importState === 'success' 
                          ? `Imported Records (${filteredDisplayRows.length} of ${parsedData.length})` 
                          : `Parsed Records Preview (Showing first ${Math.min(5, parsedData.length)} of ${parsedData.length})`
                        }
                      </span>
                    </div>

                    {/* Filter Pills when import completed */}
                    {importState === 'success' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setResultsFilter('all')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                            resultsFilter === 'all'
                              ? 'bg-slate-800 text-white'
                              : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          All ({parsedData.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setResultsFilter('success')}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                            resultsFilter === 'success'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          <CheckCircle2 size={11} />
                          <span>Imported ({importSummary?.created || 0})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setResultsFilter('already_exists')}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                            resultsFilter === 'already_exists'
                              ? 'bg-amber-600 text-white'
                              : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-300'
                          }`}
                        >
                          <AlertTriangle size={11} />
                          <span>Already Exists ({importSummary?.alreadyExists || 0})</span>
                        </button>
                        {(importSummary?.failed ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setResultsFilter('failed')}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                              resultsFilter === 'failed'
                                ? 'bg-rose-600 text-white'
                                : 'bg-white hover:bg-rose-50 text-rose-800 border border-rose-300'
                            }`}
                          >
                            <AlertCircle size={11} />
                            <span>Failed ({importSummary?.failed})</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-1.5 font-bold">Type</th>
                          <th className="px-3 py-1.5 font-bold">Name</th>
                          <th className="px-3 py-1.5 font-bold">Code</th>
                          <th className="px-3 py-1.5 font-bold">Parent Location</th>
                          {importState === 'success' ? (
                            <>
                              <th className="px-3 py-1.5 font-bold">Import Status</th>
                              <th className="px-3 py-1.5 font-bold">Details / Reason</th>
                            </>
                          ) : (
                            <th className="px-3 py-1.5 font-bold">Category</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                        {(importState === 'success' ? filteredDisplayRows : parsedData.slice(0, 5)).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                row.type === 'mainFacility'
                                  ? 'bg-purple-100 text-purple-700'
                                  : row.type === 'facility'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {row.rawType}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 font-medium text-slate-900 whitespace-nowrap">{row.name}</td>
                            <td className="px-3 py-1.5 text-slate-500 font-mono whitespace-nowrap">{row.code || '-'}</td>
                            <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{row.parentLocation || '-'}</td>

                            {importState === 'success' ? (
                              <>
                                <td className="px-3 py-1.5 whitespace-nowrap">
                                  {row.importStatus === 'success' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <CheckCircle2 size={11} className="text-emerald-600" /> Imported
                                    </span>
                                  ) : row.importStatus === 'already_exists' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      <AlertTriangle size={11} className="text-amber-600" /> Already Exists
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                      <AlertCircle size={11} className="text-rose-600" /> Failed
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-1.5 text-[11px] text-slate-600 max-w-xs truncate" title={row.importMessage}>
                                  {row.importMessage || '-'}
                                </td>
                              </>
                            ) : (
                              <td className="px-3 py-1.5 whitespace-nowrap">{row.category || '-'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div>
            {importState === 'success' && (
              <button
                type="button"
                onClick={() => downloadImportResultsExcel(parsedData)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Download full report of successes, existing assets, and errors"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>Download Report (.xlsx)</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                importState === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/60 border border-slate-300'
              }`}
            >
              {importState === 'success' ? 'Done' : 'Cancel'}
            </button>
            {file && importState !== 'success' && (
              <button
                type="button"
                onClick={handleImport}
                disabled={isProcessing || parsedData.filter(d => d.isValid).length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Importing Assets...</span>
                  </>
                ) : (
                  <span>Import {parsedData.filter(d => d.isValid).length} Assets</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

