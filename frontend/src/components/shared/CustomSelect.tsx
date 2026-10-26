import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check, Plus, Search } from 'lucide-react';

export interface CustomSelectOption {
  label: string;
  value: string;
  isAction?: boolean;
}

export interface CustomSelectProps {
  name: string;
  value: string;
  options: (string | CustomSelectOption)[];
  onChange: (e: any) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  searchable?: boolean;
  showClear?: boolean;
  variant?: 'default' | 'ghost';
  rounded?: 'lg' | 'xl' | '2xl';
  onAddOption?: (newVal: string) => void;
  noOptionsText?: string;
}

export function CustomSelect({ 
  name, 
  value, 
  options, 
  onChange, 
  placeholder = 'Select...', 
  className = '', 
  inputClassName = '',
  dropdownClassName = '',
  disabled = false, 
  allowCustom = false, 
  searchable = false,
  showClear = true,
  variant = 'default',
  rounded = 'lg',
  onAddOption,
  noOptionsText = 'No options found'
}: CustomSelectProps) {
  // Deduplicate and filter out invalid/empty options
  const normalizedOptions = React.useMemo(() => {
    const seen = new Set<string>();
    const result: (string | CustomSelectOption)[] = [];

    options.forEach(opt => {
      if (!opt) return;
      const val = typeof opt === 'string' ? opt.trim() : opt.value?.trim();
      if (!val || val === '+') return;

      const key = `${val}___${typeof opt !== 'string' && opt.isAction ? 'action' : 'item'}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(opt);
      }
    });

    return result;
  }, [options]);

  const getLabel = (val: string) => {
    const opt = normalizedOptions.find(o => {
      if (typeof o === 'string') return o === val;
      return o.value === val;
    });
    if (!opt) return val;
    return typeof opt === 'string' ? opt : opt.label;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterSearchRef = useRef(filterSearch);
  filterSearchRef.current = filterSearch;

  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
  });

  const displayLabel = getLabel(value);

  // Check if current search matches an existing option exactly
  const trimmedSearch = filterSearch.trim();
  const exactMatch = React.useMemo(() => {
    if (!trimmedSearch) return undefined;
    return normalizedOptions.find(opt => {
      const val = typeof opt === 'string' ? opt : (opt.value || opt.label);
      return val.trim().toLowerCase() === trimmedSearch.toLowerCase();
    });
  }, [normalizedOptions, trimmedSearch]);
  const hasExactMatch = !!exactMatch;

  // Separate Action items (like "+ Add Role") from regular options
  const actionOptions = normalizedOptions.filter(opt => {
    if (typeof opt !== 'string') return !!opt.isAction;
    const str = opt.toLowerCase();
    return str.startsWith('+') || str.includes('add new') || str.includes('add role') || str.includes('create new');
  });

  const regularOptions = normalizedOptions.filter(opt => !actionOptions.includes(opt));

  // Filter regular options based on search query
  const filteredRegularOptions = regularOptions.filter(opt => {
    if (!trimmedSearch) return true;
    const label = typeof opt === 'string' ? opt : opt.label;
    return label.toLowerCase().includes(trimmedSearch.toLowerCase());
  });

  const allVisibleOptions = React.useMemo(() => {
    return [...actionOptions, ...filteredRegularOptions];
  }, [actionOptions, filteredRegularOptions]);

  const updateCoords = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200),
        openUpward: false,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      setHighlightedIndex(-1);

      // Always smoothly scroll active field to center of screen so dropdown menu is 100% visible
      const timer = setTimeout(() => {
        if (wrapperRef.current) {
          wrapperRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 40);

      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      const handleResizeOrScroll = () => updateCoords();
      window.addEventListener('resize', handleResizeOrScroll);
      window.addEventListener('scroll', handleResizeOrScroll, true);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll, true);
      };
    }
  }, [isOpen, filteredRegularOptions.length]);

  const handleSelect = (option: string | CustomSelectOption) => {
    const val = typeof option === 'string' ? option : option.value;
    setIsOpen(false);
    setFilterSearch('');
    onChange({ target: { name, value: val } });
  };

  const handleAddCustom = (newVal: string) => {
    const trimmed = newVal.trim();
    if (!trimmed) return;
    setIsOpen(false);
    setFilterSearch('');
    onChange({ target: { name, value: trimmed } });
    if (onAddOption) {
      onAddOption(trimmed);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        wrapperRef.current && !wrapperRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        const curSearch = filterSearchRef.current.trim();
        if (allowCustom && curSearch) {
          const matched = normalizedOptions.find(opt => {
            const v = typeof opt === 'string' ? opt : (opt.value || opt.label);
            return v.trim().toLowerCase() === curSearch.toLowerCase();
          });
          if (matched) {
            handleSelect(matched);
          } else {
            handleAddCustom(curSearch);
          }
        } else {
          setIsOpen(false);
          setFilterSearch('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [normalizedOptions, allowCustom, name]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ target: { name, value: '' } });
    setFilterSearch('');
    setIsOpen(false);
  };

  const cleanActionLabel = (rawLabel: string) => {
    return rawLabel.replace(/^\+\s*/, '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setFilterSearch('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < allVisibleOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : allVisibleOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < allVisibleOptions.length) {
        handleSelect(allVisibleOptions[highlightedIndex]);
      } else if (allowCustom && trimmedSearch) {
        if (exactMatch) {
          handleSelect(exactMatch);
        } else {
          handleAddCustom(trimmedSearch);
        }
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef} onKeyDown={handleKeyDown}>
      {/* Input / Display Field */}
      <div 
        className={`flex items-center w-full transition-all outline-none ${
          variant === 'ghost'
            ? `px-2.5 py-1.5 bg-transparent border-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 rounded-lg'} ${isOpen ? 'bg-slate-50' : ''}`
            : `${inputClassName ? inputClassName : 'px-2.5 py-1 min-h-[32px] h-8 text-xs'} border ${rounded === 'xl' ? 'rounded-lg' : rounded === '2xl' ? 'rounded-xl' : 'rounded-md'} ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-400' : 'bg-white cursor-pointer'} ${isOpen ? 'border-emerald-600 ring-1 ring-emerald-500/20' : 'border-slate-300 hover:border-slate-400'}`
        }`}
        onClick={() => {
          if (!disabled && !isOpen) setIsOpen(true);
        }}
      >
        <input
          type="text"
          disabled={disabled}
          value={isOpen ? filterSearch : displayLabel}
          onChange={(e) => {
            setFilterSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled && !isOpen) setIsOpen(true);
          }}
          placeholder={displayLabel || placeholder}
          className={`flex-1 w-full min-w-0 bg-transparent outline-none text-xs text-slate-800 placeholder:text-slate-400 ${
            disabled ? 'cursor-not-allowed' : 'cursor-text'
          } ${value && !isOpen ? 'font-medium' : ''}`}
        />
        <div className="flex items-center gap-1.5 text-slate-400 ml-2">
          {value && !disabled && showClear && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              title="Clear selection"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            className={`p-0.5 transition-all duration-150 ${
              isOpen 
                ? 'rotate-180 text-emerald-600' 
                : 'hover:text-slate-600'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) setIsOpen(!isOpen);
            }}
          >
            <ChevronDown size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Dropdown Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className={`bg-white border border-slate-200 ${
              rounded === 'xl' || rounded === '2xl' ? 'rounded-2xl' : 'rounded-xl'
            } shadow-xl overflow-hidden p-1.5 flex flex-col gap-1.5 ${dropdownClassName}`}
          >
            {/* Search Input (only when searchable prop is true) */}
            {searchable && (
              <div className="p-0.5">
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-2.5 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-600 focus:bg-white transition-colors text-slate-800 placeholder-slate-400"
                  />
                  {filterSearch && (
                    <button
                      type="button"
                      onClick={() => setFilterSearch('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Pinned Action Header Button (+ Add Role) */}
            {actionOptions.length > 0 && (
              <div className="w-full">
                {actionOptions.map((actOpt, aIdx) => {
                  const rawLabel = typeof actOpt === 'string' ? actOpt : actOpt.label;
                  const isHighlighted = highlightedIndex === aIdx;

                  return (
                    <button
                      key={aIdx}
                      type="button"
                      onClick={() => handleSelect(actOpt)}
                      className={`w-full px-3 py-2 cursor-pointer text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                        isHighlighted ? 'ring-2 ring-emerald-500' : ''
                      }`}
                    >
                      <Plus size={14} className="text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{cleanActionLabel(rawLabel)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Option Button when user types an unlisted value */}
            {allowCustom && trimmedSearch && !hasExactMatch && (
              <div className="w-full">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAddCustom(trimmedSearch)}
                  className="w-full px-3 py-2 text-left cursor-pointer text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300 rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Plus size={14} className="text-emerald-600 flex-shrink-0" />
                  <span className="truncate">Add &ldquo;{trimmedSearch}&rdquo;</span>
                </button>
              </div>
            )}

            {/* Options List Container */}
            <div className="max-h-[190px] overflow-y-auto space-y-0.5 pr-0.5">
              {filteredRegularOptions.length > 0 ? (
                filteredRegularOptions.map((option, idx) => {
                  const itemIndex = actionOptions.length + idx;
                  const optVal = typeof option === 'string' ? option : option.value;
                  const optLabel = typeof option === 'string' ? option : option.label;
                  const isSelected = value === optVal;
                  const isHighlighted = highlightedIndex === itemIndex;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      className={`px-3 py-2 cursor-pointer text-xs sm:text-sm rounded-lg transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                          : isHighlighted
                          ? 'bg-slate-100 text-slate-900 font-medium'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate">{optLabel}</span>
                      {isSelected && <Check size={15} className="text-emerald-600 flex-shrink-0 ml-2" />}
                    </div>
                  );
                })
              ) : (
                (!allowCustom || !trimmedSearch) ? (
                  <div className="px-4 py-3 text-xs text-slate-400 text-center font-medium">
                    {noOptionsText}
                  </div>
                ) : null
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
