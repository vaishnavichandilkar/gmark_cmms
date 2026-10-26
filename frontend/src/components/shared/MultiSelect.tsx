import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check, Plus } from 'lucide-react';

interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  name: string;
  values: string[];
  options: (string | MultiSelectOption)[];
  onChange: (selectedValues: string[]) => void;
  onToggle?: (isOpen: boolean) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onAddNew?: () => void;
  addNewLabel?: string;
}

export function MultiSelect({ 
  name, 
  values, 
  options, 
  onChange,
  onToggle,
  placeholder = 'Select...', 
  className = '', 
  disabled = false,
  onAddNew,
  addNewLabel = '+ Add'
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const prevIsOpen = useRef(isOpen);

  useEffect(() => {
    if (prevIsOpen.current !== isOpen && onToggle) {
      onToggle(isOpen);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, onToggle]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch(''); // clear search when closing
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    const label = typeof opt === 'string' ? opt : opt.label;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = (e: React.MouseEvent, option: string | MultiSelectOption) => {
    e.stopPropagation();
    const val = typeof option === 'string' ? option : option.value;
    
    let newValues;
    if (values.includes(val)) {
      newValues = values.filter(v => v !== val);
    } else {
      newValues = [...values, val];
    }
    onChange(newValues);
    // Don't close so they can select multiple
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setSearch('');
  };
  
  // Calculate display text based on selected values
  const getDisplayText = () => {
    if (values.length === 0) return '';
    const labels = values.map(val => {
      const opt = options.find(o => {
        const v = typeof o === 'string' ? o : o.value;
        return v === val;
      });
      const rawLabel = typeof opt === 'string' ? opt : opt?.label || val;
      const match = rawLabel.match(/^([^(]+)/);
      return match ? match[1].trim() : rawLabel;
    });

    if (labels.length === 1) {
      return labels[0];
    }
    if (labels.length === 2) {
      return `${labels[0]}, ${labels[1]}`;
    }
    return `${labels.slice(0, 2).join(', ')} (+${labels.length - 2} more)`;
  };

  const displayText = getDisplayText();

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div 
        className={`flex items-center w-full transition-all px-4 py-2.5 border rounded-lg ${
          disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white cursor-text'
        } ${isOpen ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-300 hover:border-gray-400'}`}
        onClick={() => {
          if (!disabled) setIsOpen(true);
        }}
      >
        <div className="flex-1 relative flex items-center min-w-0">
          {!isOpen && displayText && !search && (
            <div className="absolute inset-0 flex items-center text-gray-700 truncate pointer-events-none">
              {displayText}
            </div>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => {
              if (disabled) return;
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            placeholder={!displayText || isOpen ? placeholder : ''}
            disabled={disabled}
            className={`w-full outline-none bg-transparent ${disabled ? 'text-gray-500 cursor-not-allowed' : 'text-gray-700'}`}
          />
        </div>

        <div className="flex items-center gap-1 text-gray-400 ml-2">
          {values.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            className={`p-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:text-gray-600'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                setIsOpen(!isOpen);
                if (isOpen) setSearch('');
              }
            }}
          >
            <ChevronDown size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map((option, idx) => {
                const label = typeof option === 'string' ? option : option.label;
                const val = typeof option === 'string' ? option : option.value;
                const isSelected = values.includes(val);

                return (
                  <div
                    key={idx}
                    onClick={(e) => handleSelect(e, option)}
                    className={`flex items-center px-4 py-2 cursor-pointer text-sm transition-colors ${
                      isSelected ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    {label}
                  </div>
                );
              })}
            </div>
          ) : onAddNew ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onAddNew();
              }}
              className="w-full py-3.5 px-4 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer font-semibold text-sm transition-colors flex items-center justify-center gap-2 select-none"
            >
              <Plus size={16} />
              <span>{addNewLabel}</span>
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No options found
            </div>
          )}
          {onAddNew && filteredOptions.length > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onAddNew();
              }}
              className="border-t border-gray-100 py-2.5 px-4 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer font-semibold text-sm transition-colors flex items-center justify-center gap-2 sticky bottom-0 bg-white select-none"
            >
              <Plus size={16} />
              <span>{addNewLabel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
