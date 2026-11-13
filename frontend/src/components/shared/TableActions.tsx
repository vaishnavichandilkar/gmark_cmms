import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Download, Upload, Printer, Filter, ChevronDown, FileText, FileSpreadsheet, X, RotateCcw } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

export interface FilterOption {
  key: string;
  label: string;
  options: (string | { label: string; value: string })[];
}

interface TableActionsProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;
  onImport?: () => void;
  onExport?: (format: 'pdf' | 'excel') => void;
  onPrint?: () => void;
  columnCustomizer?: React.ReactNode;
  hasActiveColumnFilters?: boolean;
  onResetColumnFilters?: () => void;
  activeColumnFilterCount?: number;
  extraActions?: React.ReactNode;
  // Filter Props
  filterOptions?: FilterOption[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (filters: Record<string, string>) => void;
  filterButtonLabel?: string;
  actionButton?: React.ReactNode;
  children?: React.ReactNode;
}

export function TableActions({ 
  title,
  subtitle,
  searchQuery, 
  setSearchQuery, 
  searchPlaceholder = "Search...",
  onImport,
  onExport,
  onPrint,
  columnCustomizer,
  hasActiveColumnFilters,
  onResetColumnFilters,
  activeColumnFilterCount,
  extraActions,
  filterOptions = [],
  activeFilters = {},
  onFilterChange,
  filterButtonLabel = "Filter",
  actionButton,
  children
}: TableActionsProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPortalRef = useRef<HTMLDivElement>(null);
  const [filterCoords, setFilterCoords] = useState<{ top: number; right: number; maxHeight: number }>({
    top: 0,
    right: 12,
    maxHeight: 460
  });

  const updateFilterMenuPosition = () => {
    if (!filterButtonRef.current) return;
    const rect = filterButtonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpward = spaceBelow < 280 && spaceAbove > spaceBelow;

    const maxHeight = Math.min(520, Math.max(260, openUpward ? spaceAbove : spaceBelow));
    const top = openUpward ? Math.max(12, rect.top - maxHeight - 6) : rect.bottom + 6;
    const right = Math.max(12, Math.min(window.innerWidth - 24, window.innerWidth - rect.right));

    setFilterCoords({ top, right, maxHeight });
  };

  useEffect(() => {
    if (isFilterMenuOpen) {
      updateFilterMenuPosition();
      const handleScrollOrResize = () => {
        updateFilterMenuPosition();
      };
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isFilterMenuOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (
        isFilterMenuOpen &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node) &&
        filterPortalRef.current &&
        !filterPortalRef.current.contains(event.target as Node)
      ) {
        // Also don't close if clicking inside a custom select portal dropdown
        const targetEl = (event.target as Node | null) instanceof Element 
          ? (event.target as Element) 
          : (event.target as Node | null)?.parentElement;
        if (targetEl?.closest?.('[data-custom-select-portal="true"]')) {
          return;
        }
        setIsFilterMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterMenuOpen]);

  const handleFilterSelect = (key: string, value: string) => {
    if (!onFilterChange) return;
    const newFilters = { ...activeFilters };
    if (value && value !== 'All') {
      newFilters[key] = value;
    } else {
      delete newFilters[key];
    }
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    if (onFilterChange) onFilterChange({});
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  const filteredFilterOptions = useMemo(() => {
    if (!filterSearchTerm.trim()) return filterOptions;
    const term = filterSearchTerm.toLowerCase();
    return filterOptions.filter(opt => opt.label.toLowerCase().includes(term));
  }, [filterOptions, filterSearchTerm]);

  return (
    <div className="w-full mb-4 print:hidden space-y-3">
      {/* Page Title & Subtitle Header */}
      {(title || subtitle) && (
        <div className="min-w-0">
          {typeof title === 'string' ? (
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">{title}</h1>
          ) : (
            title
          )}
          {subtitle && (
            typeof subtitle === 'string' ? (
              <p className="text-xs text-slate-500 mt-0.5 leading-normal">{subtitle}</p>
            ) : (
              subtitle
            )
          )}
        </div>
      )}

      {/* Toolbar / Actions - Guaranteed in EXACTLY ONE Row Across the Entire Project */}
      <div className="flex items-center justify-between gap-2.5 w-full flex-nowrap sm:overflow-visible overflow-x-auto pb-1 scrollbar-hide">
        {/* Search Bar (Left Anchored) */}
        <div className="relative flex-1 min-w-[160px] max-w-xs sm:max-w-sm shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full h-9 pl-9 pr-3.5 border border-slate-300 rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 text-xs text-slate-800 transition-all shadow-xs"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Action Controls & Primary Action Buttons (Right Anchored in ONE Row) */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {onImport && (
            <button 
              onClick={onImport}
              className="flex items-center gap-1.5 h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer" 
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
                className="flex items-center gap-1.5 h-9 px-3.5 bg-emerald-50/60 border border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300 text-emerald-700 rounded-lg text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer" 
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
              className="flex items-center gap-1.5 h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer" 
              title="Print"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}

          {columnCustomizer}

          {hasActiveColumnFilters && onResetColumnFilters && (
            <button
              type="button"
              onClick={onResetColumnFilters}
              className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
              title="Reset all column filters"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reset Column Filters {activeColumnFilterCount ? `(${activeColumnFilterCount})` : ''}</span>
            </button>
          )}

          {extraActions}

          {filterOptions.length > 0 && (
            <div>
              <button 
                ref={filterButtonRef}
                type="button"
                onClick={() => {
                  if (!isFilterMenuOpen) updateFilterMenuPosition();
                  setIsFilterMenuOpen(!isFilterMenuOpen);
                }}
                className={`flex items-center gap-1.5 h-9 px-3.5 border rounded-lg text-xs font-semibold transition-all shrink-0 shadow-xs cursor-pointer ${
                  hasActiveFilters 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-emerald-50' 
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                }`}
                title="Filter"
              >
                <Filter className={`w-3.5 h-3.5 ${hasActiveFilters ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span className="hidden sm:inline font-semibold">
                  {filterButtonLabel}
                </span>
                {hasActiveFilters && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                    {Object.keys(activeFilters).length}
                  </span>
                )}
              </button>

              {isFilterMenuOpen && createPortal(
                <div 
                  ref={filterPortalRef}
                  style={{
                    position: 'fixed',
                    top: `${filterCoords.top}px`,
                    right: `${filterCoords.right}px`,
                    maxHeight: `${filterCoords.maxHeight}px`,
                    zIndex: 99999,
                  }}
                  className="w-80 sm:w-88 bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                        <Filter className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 tracking-tight">Filter</span>
                        <p className="text-[10px] text-slate-500 leading-none mt-0.5">Filter records by multiple criteria</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasActiveFilters && (
                        <button 
                          type="button"
                          onClick={clearFilters}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={() => setIsFilterMenuOpen(false)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                        title="Close"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {filterOptions.length > 4 && (
                    <div className="px-3.5 pt-2.5 pb-1 border-b border-slate-100 bg-white">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search filter criteria..."
                          value={filterSearchTerm}
                          onChange={(e) => setFilterSearchTerm(e.target.value)}
                          className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
                    {filteredFilterOptions.length > 0 ? (
                      filteredFilterOptions.map(option => {
                        const isFieldActive = Boolean(activeFilters[option.key]);
                        return (
                          <div 
                            key={option.key} 
                            className={`space-y-1.5 p-2 rounded-xl transition-all ${
                              isFieldActive ? 'bg-emerald-50/50 border border-emerald-200/80' : 'border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <label className={`text-[11px] font-bold tracking-wider block ${
                                isFieldActive ? 'text-emerald-800' : 'text-slate-600'
                              }`}>
                                {option.label}
                              </label>
                              {isFieldActive && (
                                <button
                                  type="button"
                                  onClick={() => handleFilterSelect(option.key, '')}
                                  className="text-[10px] text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Reset this filter"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
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
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No filters match "{filterSearchTerm}"
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}

          {/* Primary Action Button */}
          {(actionButton || children) && (
            <div className="shrink-0 flex items-center gap-1.5 [&_button]:h-9 [&_button]:rounded-lg [&_button]:text-xs [&_button]:font-semibold">
              {actionButton || children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
