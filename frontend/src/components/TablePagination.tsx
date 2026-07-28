import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: TablePaginationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between text-sm text-gray-500">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1 cursor-pointer border px-2 py-1 rounded-md transition-colors ${
              isOpen ? 'border-green-500 bg-green-50/30' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium text-gray-700">{rowsPerPage}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-green-600' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-10">
              {[5, 10, 20, 50].map((val) => (
                <div
                  key={val}
                  onClick={() => {
                    onRowsPerPageChange(val);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-1.5 cursor-pointer text-sm transition-colors ${
                    rowsPerPage === val ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {val}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <span>
          {totalItems === 0 ? '0-0 of 0' : `${startIndex + 1}-${endIndex} of ${totalItems}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`p-1 rounded-md transition-colors ${
              currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalItems === 0}
            className={`p-1 rounded-md transition-colors ${
              currentPage === totalPages || totalItems === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
