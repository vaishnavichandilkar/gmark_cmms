import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, Search, RotateCcw, Check, X } from 'lucide-react';

export interface ColumnDefinition {
  id: string;
  label: string;
  category?: string;
  defaultVisible?: boolean;
  required?: boolean;
  description?: string;
}

interface ColumnCustomizerProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onChange: (visibleColumns: string[]) => void;
  storageKey?: string;
  className?: string;
  buttonLabel?: string;
}

export function ColumnCustomizer({
  columns,
  visibleColumns,
  onChange,
  storageKey,
  className = '',
  buttonLabel = 'Manage Columns'
}: ColumnCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number; maxHeight: number }>({
    top: 0,
    right: 12,
    maxHeight: 420
  });

  const updateMenuPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpward = spaceBelow < 300 && spaceAbove > spaceBelow;

    const maxHeight = Math.min(500, Math.max(260, openUpward ? spaceAbove : spaceBelow));
    const top = openUpward ? Math.max(12, rect.top - maxHeight - 6) : rect.bottom + 6;
    const right = Math.max(12, Math.min(window.innerWidth - 24, window.innerWidth - rect.right));

    setMenuCoords({ top, right, maxHeight });
  };

  useEffect(() => {
    if (isOpen) {
      updateMenuPosition();
      const handleScrollOrResize = () => {
        updateMenuPosition();
      };
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen]);

  // Filter columns by search term
  const filteredColumns = useMemo(() => {
    if (!searchTerm.trim()) return columns;
    const term = searchTerm.toLowerCase();
    return columns.filter(col => 
      col.label.toLowerCase().includes(term) || 
      (col.category && col.category.toLowerCase().includes(term))
    );
  }, [columns, searchTerm]);

  // Group columns by category if available
  const groupedColumns = useMemo(() => {
    const groups: Record<string, ColumnDefinition[]> = {};
    filteredColumns.forEach(col => {
      const cat = col.category || 'Standard Fields';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(col);
    });
    return groups;
  }, [filteredColumns]);

  const toggleColumn = (columnId: string) => {
    const colDef = columns.find(c => c.id === columnId);
    if (colDef?.required) return; // Cannot toggle required columns

    let next: string[];
    if (visibleColumns.includes(columnId)) {
      next = visibleColumns.filter(id => id !== columnId);
    } else {
      // Keep columns in their original defined order
      next = columns
        .filter(c => c.id === columnId || visibleColumns.includes(c.id))
        .map(c => c.id);
    }

    onChange(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save columns to localStorage', e);
      }
    }
  };

  // Check if all columns (or all filtered columns) are currently selected
  const isAllSelected = useMemo(() => {
    const targetCols = searchTerm.trim() ? filteredColumns : columns;
    if (targetCols.length === 0) return false;
    return targetCols.every(c => visibleColumns.includes(c.id));
  }, [columns, filteredColumns, searchTerm, visibleColumns]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all (keep only required columns)
      if (searchTerm.trim()) {
        const toRemove = new Set(filteredColumns.filter(c => !c.required).map(c => c.id));
        const next = visibleColumns.filter(id => !toRemove.has(id));
        onChange(next);
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch (e) {
            console.error('Failed to save columns to localStorage', e);
          }
        }
      } else {
        const requiredIds = columns.filter(c => c.required).map(c => c.id);
        onChange(requiredIds);
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(requiredIds));
          } catch (e) {
            console.error('Failed to save columns to localStorage', e);
          }
        }
      }
    } else {
      // Select all
      if (searchTerm.trim()) {
        const toAdd = filteredColumns.map(c => c.id);
        const next = columns
          .filter(c => visibleColumns.includes(c.id) || toAdd.includes(c.id))
          .map(c => c.id);
        onChange(next);
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch (e) {
            console.error('Failed to save columns to localStorage', e);
          }
        }
      } else {
        const allIds = columns.map(c => c.id);
        onChange(allIds);
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(allIds));
          } catch (e) {
            console.error('Failed to save columns to localStorage', e);
          }
        }
      }
    }
  };

  const resetToDefault = () => {
    const defaults = columns.filter(c => c.defaultVisible !== false).map(c => c.id);
    onChange(defaults);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.error('Failed to clear storage', e);
      }
    }
  };

  const isCustomized = useMemo(() => {
    const defaultIds = columns.filter(c => c.defaultVisible !== false).map(c => c.id);
    if (defaultIds.length !== visibleColumns.length) return true;
    return defaultIds.some(id => !visibleColumns.includes(id));
  }, [columns, visibleColumns]);

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) updateMenuPosition();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-xs shrink-0 select-none ${
          isOpen || isCustomized
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
        }`}
        title="Manage visible table columns"
      >
        <SlidersHorizontal size={13} className={isOpen || isCustomized ? 'text-emerald-600' : 'text-slate-500'} />
        <span>{buttonLabel}</span>
        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          {visibleColumns.length}/{columns.length}
        </span>
      </button>

      {isOpen && createPortal(
        <>
          {/* Transparent Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-[99998] bg-black/10 sm:bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          {/* Floating Dropdown Dialog */}
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuCoords.top}px`,
              right: `${menuCoords.right}px`,
              maxHeight: `${menuCoords.maxHeight}px`,
              zIndex: 99999,
            }}
            className="w-[calc(100vw-24px)] sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Manage Columns</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select which fields you want to display in the table
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="p-3 border-b border-slate-100 bg-white space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search columns..."
                  autoFocus
                  className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold pt-1">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  disabled={filteredColumns.length === 0}
                  className={`cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline ${
                    isAllSelected
                      ? 'text-rose-600 hover:text-rose-700 hover:underline'
                      : 'text-emerald-700 hover:text-emerald-800 hover:underline'
                  }`}
                >
                  {isAllSelected
                    ? (searchTerm.trim() ? `Deselect All (${filteredColumns.length})` : 'Deselect All')
                    : (searchTerm.trim() ? `Select All (${filteredColumns.length})` : `Select All (${columns.length})`)}
                </button>
                <button
                  type="button"
                  onClick={resetToDefault}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span>Reset Defaults</span>
                </button>
              </div>
            </div>

            {/* Columns List (Scrollable) */}
            <div className="p-3 overflow-y-auto space-y-3.5 divide-y divide-slate-100 flex-1">
              {Object.entries(groupedColumns).map(([groupName, groupCols]) => (
                <div key={groupName} className="pt-2 first:pt-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    {groupName}
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    {groupCols.map(col => {
                      const isVisible = visibleColumns.includes(col.id);
                      const isRequired = col.required;

                      return (
                        <label
                          key={col.id}
                          htmlFor={`col-cust-${col.id}`}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors select-none ${
                            isRequired
                              ? 'bg-slate-50 text-slate-700 cursor-default opacity-80'
                              : 'hover:bg-emerald-50/60 text-slate-800 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              id={`col-cust-${col.id}`}
                              type="checkbox"
                              checked={isVisible}
                              disabled={isRequired}
                              onChange={() => toggleColumn(col.id)}
                              className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className={`font-medium truncate ${isVisible ? 'text-slate-900' : 'text-slate-500'}`}>
                              {col.label}
                            </span>
                          </div>

                          {isRequired && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-200/60 px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          )}
                          {!isRequired && isVisible && (
                            <span className="text-emerald-600">
                              <Check size={13} strokeWidth={2.5} />
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredColumns.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching columns found
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-500 text-[11px]">
                <strong className="text-slate-700">{visibleColumns.length}</strong> of {columns.length} columns active
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-md text-xs transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
