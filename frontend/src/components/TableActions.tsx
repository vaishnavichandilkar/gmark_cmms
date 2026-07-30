import { useState, useRef, useEffect } from 'react';
import { Search, Download, Upload, Printer, Filter, ChevronDown, FileText, FileSpreadsheet, X } from 'lucide-react';

export interface FilterOption {
  key: string;
  label: string;
  options: string[];
}

interface TableActionsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;
  onImport?: () => void;
  onExport?: (format: 'pdf' | 'excel') => void;
  onPrint?: () => void;
  // Filter Props
  filterOptions?: FilterOption[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (filters: Record<string, string>) => void;
}

export function TableActions({ 
  searchQuery, 
  setSearchQuery, 
  searchPlaceholder = "Search...",
  onImport,
  onExport,
  onPrint,
  filterOptions = [],
  activeFilters = {},
  onFilterChange
}: TableActionsProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterSelect = (key: string, value: string) => {
    if (!onFilterChange) return;
    const newFilters = { ...activeFilters };
    if (value) {
      newFilters[key] = value;
    } else {
      delete newFilters[key];
    }
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    if (onFilterChange) onFilterChange({});
    setIsFilterMenuOpen(false);
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mb-6 w-full print:hidden">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto overflow-visible pb-2 sm:pb-0 scrollbar-hide">
        {onImport && (
          <button 
            onClick={onImport}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shrink-0 shadow-sm cursor-pointer" 
            title="Import"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Import</span>
          </button>
        )}
        
        {onExport && (
          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 active:scale-95 transition-all shrink-0 shadow-sm cursor-pointer" 
              title="Export"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-blue-600 hidden sm:block" />
            </button>
            
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                <button
                  onClick={() => {
                    onExport('pdf');
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Export as PDF
                </button>
                <button
                  onClick={() => {
                    onExport('excel');
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export as Excel
                </button>
              </div>
            )}
          </div>
        )}

        {onPrint && (
          <button 
            onClick={onPrint}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shrink-0 shadow-sm cursor-pointer" 
            title="Print"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">Print</span>
          </button>
        )}

        {filterOptions.length > 0 && (
          <div className="relative" ref={filterMenuRef}>
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-all shrink-0 shadow-sm cursor-pointer ${
                hasActiveFilters 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="Filter"
            >
              <Filter className={`w-4 h-4 ${hasActiveFilters ? 'text-emerald-600' : 'text-gray-500'}`} />
              <span className="hidden sm:inline">
                Filter {hasActiveFilters && `(${Object.keys(activeFilters).length})`}
              </span>
            </button>

            {isFilterMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <span className="text-sm font-bold text-gray-700">Filters</span>
                  {hasActiveFilters && (
                    <button 
                      onClick={clearFilters}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div className="p-3 space-y-4 max-h-64 overflow-y-auto">
                  {filterOptions.map(option => (
                    <div key={option.key} className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        {option.label}
                      </label>
                      <select
                        value={activeFilters[option.key] || ''}
                        onChange={(e) => handleFilterSelect(option.key, e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white outline-none cursor-pointer"
                      >
                        <option value="">All</option>
                        {option.options.map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-72 shrink-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-all shadow-sm"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );
}
