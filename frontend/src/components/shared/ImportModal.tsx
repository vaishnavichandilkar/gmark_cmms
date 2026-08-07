import { useState, useRef } from 'react';
import { X, UploadCloud, FileType, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

export interface ImportConfig {
  title: string;
  expectedHeaders: string[];
  onImport: (data: any[]) => Promise<void>;
  onClose: () => void;
}

export function ImportModal({ config }: { config: ImportConfig | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importState, setImportState] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!config) return null;

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

  const processFile = (file: File) => {
    setFile(file);
    setValidationErrors([]);
    setImportState('idle');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays to check headers
        const rawData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        
        if (rawData.length === 0) {
          setValidationErrors(['The uploaded file is empty.']);
          return;
        }

        const actualHeaders = (rawData[0] as string[]).map(h => String(h).trim().toLowerCase());
        const expectedLower = config.expectedHeaders.map(h => h.trim().toLowerCase());
        
        // Validate headers loosely
        const missingHeaders = expectedLower.filter(h => !actualHeaders.includes(h));
        
        if (missingHeaders.length > 0) {
          setValidationErrors([
            `Missing required columns: ${missingHeaders.map(h => config.expectedHeaders[expectedLower.indexOf(h)]).join(', ')}`
          ]);
          return;
        }

        // Parse actual data rows
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setParsedData(jsonData);

      } catch (err) {
        setValidationErrors(['Failed to parse the file. Please ensure it is a valid Excel or CSV file.']);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setIsProcessing(true);
    try {
      await config.onImport(parsedData);
      setImportState('success');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('Import failed', err);
      setImportState('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportState('idle');
    config.onClose();
  };

  const resetFile = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportState('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper to generate a template file
  const downloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([config.expectedHeaders]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, `${config.title.replace(/\s+/g, '_')}_Template.xlsx`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 print:hidden"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: 20, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 20, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Import {config.title}</h2>
              <p className="text-xs text-gray-500 mt-1">Upload a CSV or Excel file to bulk import records.</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {!file ? (
              // Upload State
              <div>
                <div
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50/50 scale-[1.02]' 
                      : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors ${isDragging ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    <UploadCloud size={28} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Click to upload or drag and drop</h3>
                  <p className="text-xs text-gray-500">XLSX, XLS, or CSV files supported</p>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                  />
                </div>
                
                <div className="mt-4 flex justify-between items-center bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FileType className="text-blue-500 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-blue-900">Need a template?</p>
                      <p className="text-[11px] text-blue-700 mt-0.5">Download a pre-formatted Excel file with correct headers.</p>
                    </div>
                  </div>
                  <button 
                    onClick={downloadTemplate}
                    className="text-xs font-bold text-blue-700 hover:text-blue-800 bg-white px-3 py-1.5 rounded border border-blue-200 shadow-sm cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              </div>
            ) : (
              // Review State
              <div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden pr-4">
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                      <FileType size={20} className="text-blue-500" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • {parsedData.length} valid rows found</p>
                    </div>
                  </div>
                  <button 
                    onClick={resetFile}
                    className="text-xs font-bold text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>

                {validationErrors.length > 0 && (
                  <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-red-900 mb-1">Validation Errors</p>
                      <ul className="text-xs text-red-700 list-disc pl-4 space-y-1">
                        {validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {importState === 'error' && (
                  <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="text-red-500 shrink-0" size={18} />
                    <p className="text-xs font-bold text-red-900">An error occurred while importing data. Please try again.</p>
                  </div>
                )}

                {importState === 'success' && (
                  <div className="mb-6 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="text-emerald-500 shrink-0" size={18} />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Import Successful!</p>
                      <p className="text-[11px] text-emerald-700">{parsedData.length} records have been imported.</p>
                    </div>
                  </div>
                )}

                {validationErrors.length === 0 && importState !== 'success' && (
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleClose}
                      disabled={isProcessing}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors border border-transparent disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={isProcessing || parsedData.length === 0}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Importing...
                        </>
                      ) : (
                        `Import ${parsedData.length} Records`
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
