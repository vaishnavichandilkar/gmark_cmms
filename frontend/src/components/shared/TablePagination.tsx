import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages?: number;
  totalItems: number;
  startIndex?: number;
  endIndex?: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages: propTotalPages,
  totalItems,
  startIndex: propStartIndex,
  endIndex: propEndIndex,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: TablePaginationProps) {
  const totalPages = propTotalPages !== undefined ? propTotalPages : Math.ceil(totalItems / (rowsPerPage || 10));
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const startIndex = propStartIndex !== undefined ? propStartIndex : (currentPage - 1) * rowsPerPage;
  const endIndex = propEndIndex !== undefined ? propEndIndex : Math.min(startIndex + rowsPerPage, totalItems);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-2 text-xs text-slate-600 font-medium">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="whitespace-nowrap text-slate-500">Rows per page:</span>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 cursor-pointer border px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              isOpen ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <span>{rowsPerPage}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
          </button>

          {isOpen && (
            <div className="absolute bottom-full left-0 mb-1.5 w-24 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
              {[5, 10, 20, 50].map((val) => (
                <div
                  key={val}
                  onClick={() => {
                    onRowsPerPageChange(val);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-1.5 cursor-pointer text-xs transition-colors ${
                    rowsPerPage === val ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {val} rows
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-5">
        <span className="whitespace-nowrap text-slate-500 font-medium">
          {totalItems === 0 ? '0-0 of 0' : `${startIndex + 1}-${endIndex} of ${totalItems}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`p-1.5 rounded-md border border-slate-200 transition-all ${
              currentPage === 1 ? 'text-slate-300 border-slate-100 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 cursor-pointer shadow-2xs'
            }`}
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalItems === 0}
            className={`p-1.5 rounded-md border border-slate-200 transition-all ${
              currentPage === totalPages || totalItems === 0
                ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 cursor-pointer shadow-2xs'
            }`}
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
