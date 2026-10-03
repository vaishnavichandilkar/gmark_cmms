import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supplierService, type Supplier } from '../../../services/supplierService';

interface ImportSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportSupplierModal: React.FC<ImportSupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.csv')) {
        toast.error('Please select a valid .csv file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
  };

  const parseCSV = (text: string): Partial<Supplier>[] => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const suppliers: Partial<Supplier>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
      if (currentline.length === 0 || !currentline[0]) continue;

      const obj: any = {};
      headers.forEach((header, index) => {
        const val = currentline[index] || '';
        if (header.includes('name')) obj.name = val;
        else if (header.includes('code')) obj.supplierCode = val;
        else if (header.includes('contact')) obj.contactPerson = val;
        else if (header.includes('email')) obj.email = val;
        else if (header.includes('phone') || header.includes('mobile')) obj.phone = val;
        else if (header.includes('gst')) obj.gstNumber = val;
        else if (header.includes('address')) obj.address = val;
        else if (header.includes('city')) obj.city = val;
        else if (header.includes('state')) obj.state = val;
        else if (header.includes('country')) obj.country = val;
        else if (header.includes('category')) obj.businessCategory = val;
      });

      if (!obj.name && currentline[1]) {
        obj.name = currentline[1];
      } else if (!obj.name && currentline[0]) {
        obj.name = currentline[0];
      }

      if (obj.name) {
        suppliers.push(obj);
      }
    }

    return suppliers;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a CSV file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const text = await selectedFile.text();
      const suppliers = parseCSV(text);

      if (suppliers.length === 0) {
        toast.error('No valid supplier records found in CSV file');
        setIsUploading(false);
        return;
      }

      await supplierService.importSuppliers(suppliers);
      toast.success(`Successfully imported ${suppliers.length} supplier(s)`);
      onSuccess();
      onClose();
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error?.response?.data?.message || 'Failed to import suppliers');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-6 md:p-8"
        >
          {/* Header with back arrow */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={onClose}
              className="text-emerald-800 hover:text-emerald-900 transition-colors p-1 rounded-full hover:bg-emerald-50"
            >
              <ArrowLeft size={24} strokeWidth={2.5} />
            </button>
            <h2 className="text-2xl font-bold text-emerald-950 tracking-tight">
              Import Suppliers
            </h2>
          </div>

          {/* Upload Input Area */}
          <div className="mb-6">
            <div className="border border-gray-300 rounded-2xl p-3 flex items-center justify-between bg-white shadow-xs">
              <label className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0">
                Upload File
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <div className="flex items-center gap-2 pr-2 text-sm text-gray-700 font-medium truncate ml-3">
                <span className="truncate">{selectedFile ? selectedFile.name : 'Filename.csv'}</span>
                {selectedFile && (
                  <button
                    onClick={handleClearFile}
                    className="text-gray-500 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-gray-100 shrink-0"
                    title="Clear file"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Informative CSV description callout */}
          <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 mb-8 flex items-start gap-3 text-xs leading-relaxed text-gray-700">
            <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center shrink-0 mt-0.5 font-serif font-bold text-[11px]">
              i
            </div>
            <p>
              A CSV is a comma-separated values file, which allows data to be saved in a tabular format. CSVs look like a garden-variety spreadsheet but with a .csv extension. CSV files can be used with most any spreadsheet program, such as Microsoft Excel or Google Spreadsheets.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-[#00a651] hover:bg-[#008f44] text-white px-10 py-3 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer min-w-[140px]"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
