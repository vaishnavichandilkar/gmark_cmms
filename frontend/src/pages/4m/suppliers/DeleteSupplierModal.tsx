import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supplierService } from '../../../services/supplierService';

interface DeleteSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedIds: number[];
}

export const DeleteSupplierModal: React.FC<DeleteSupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedIds,
}) => {
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const count = selectedIds.length;

  const handleDelete = async () => {
    if (count === 0) {
      toast.error('No suppliers selected for deletion');
      return;
    }

    setIsDeleting(true);
    try {
      if (count === 1) {
        await supplierService.deleteSupplier(selectedIds[0]);
        toast.success('Supplier deleted successfully');
      } else {
        await supplierService.bulkDeleteSuppliers(selectedIds, reason);
        toast.success(`Successfully deleted ${count} supplier(s)`);
      }
      onSuccess();
      onClose();
      setReason('');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete supplier(s)');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-6 md:p-8"
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
              Delete Supplier
            </h2>
          </div>

          {/* Question text */}
          <p className="text-sm font-semibold text-gray-800 mb-6">
            Are you sure you want to delete {count} record(s)?
          </p>

          {/* Input label and textarea */}
          <div className="mb-8">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Reason for Deletion
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason"
              rows={4}
              className="w-full border border-gray-300 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none shadow-xs placeholder-gray-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer min-w-[110px]"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-8 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer min-w-[110px]"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
