import { useState, useRef, useEffect } from 'react';
import { Search, Download, Upload, Printer, Filter, ChevronDown, FileText, FileSpreadsheet, X } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

export interface FilterOption {
  key: string;
  label: string;
  options: (string | { label: string; value: string })[];
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
    <div className="flex flex-col sm:flex-row justify-end items-center gap-3 mb-5 w-full print:hidden">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto overflow-visible pb-1 sm:pb-0 scrollbar-hide">
        {onImport && (
          <button 
            onClick={onImport}
            className="flex items-center gap-2 h-[38px] px-3.5 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer" 
            title="Import"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Import</span>
          </button>
        )}
        
        {onExport && (
          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 h-[38px] px-3.5 bg-emerald-50/60 border border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300 text-emerald-700 rounded-lg text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer" 
              title="Export"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-emerald-400 hidden sm:block" />
            </button>
            
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                <button
                  onClick={() => {
                    onExport('pdf');
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-500" />
                  Export as PDF
                </button>
                <button
                  onClick={() => {
                    onExport('excel');
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Export as Excel
                </button>
              </div>
            )}
          </div>
        )}

        {onPrint && (
          <button 
            onClick={onPrint}
            className="flex items-center gap-2 h-[38px] px-3.5 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer" 
            title="Print"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print</span>
          </button>
        )}

        {filterOptions.length > 0 && (
          <div className="relative" ref={filterMenuRef}>
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`flex items-center gap-2 h-[38px] px-3.5 border rounded-lg text-xs font-semibold transition-all shrink-0 shadow-xs cursor-pointer ${
                hasActiveFilters 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
              }`}
              title="Filter"
            >
              <Filter className={`w-3.5 h-3.5 ${hasActiveFilters ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">
                Filter {hasActiveFilters && `(${Object.keys(activeFilters).length})`}
              </span>
            </button>

            {isFilterMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Filter Records</span>
                  </div>
                  {hasActiveFilters && (
                    <button 
                      onClick={clearFilters}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
                  {filterOptions.map(option => (
                    <div key={option.key} className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        {option.label}
                      </label>
                      <CustomSelect
                        name={option.key}
                        value={activeFilters[option.key] || ''}
                        onChange={(e) => handleFilterSelect(option.key, e.target.value)}
                        placeholder="All"
                        options={[
                          { label: 'All', value: '' },
                          ...option.options.map(opt => 
                            typeof opt === 'string' ? { label: opt, value: opt } : opt
                          )
                        ]}
                      />
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
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full h-[38px] pl-9.5 pr-3 border border-slate-300 rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 text-xs sm:text-sm text-slate-800 transition-all shadow-xs"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );
}
