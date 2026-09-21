import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface CustomSelectOption {
  label: string;
  value: string;
  isAction?: boolean;
}

interface CustomSelectProps {
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
  variant?: 'default' | 'ghost';
  rounded?: 'lg' | 'xl' | '2xl';
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
  variant = 'default',
  rounded = 'lg'
}: CustomSelectProps) {
  const getLabel = (val: string) => {
    const opt = options.find(o => {
      if (typeof o === 'string') return o === val;
      return o.value === val;
    });
    if (!opt) return val;
    return typeof opt === 'string' ? opt : opt.label;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(getLabel(value));
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync search with value if value changes externally (e.g. from API fetch)
  useEffect(() => {
    setSearch(getLabel(value));
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If they typed something but didn't select, revert to the actual value
        setSearch(getLabel(value));
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  let filteredOptions = options.filter(opt => {
    const label = typeof opt === 'string' ? opt : opt.label;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  if (allowCustom && search.trim() !== '') {
    const exactMatch = options.some(opt => {
      const label = typeof opt === 'string' ? opt : opt.label;
      return label.toLowerCase() === search.trim().toLowerCase();
    });

    if (!exactMatch) {
      filteredOptions = [
        ...filteredOptions,
        { label: `Add "${search.trim()}"`, value: search.trim(), isAction: true }
      ];
    }
  }

  const handleSelect = (option: string | CustomSelectOption) => {
    const label = typeof option === 'string' ? option : option.label;
    const val = typeof option === 'string' ? option : option.value;
    const isAction = typeof option !== 'string' && option.isAction;
    
    setSearch(isAction ? val : label);
    setIsOpen(false);
    onChange({ target: { name, value: val } });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearch('');
    onChange({ target: { name, value: '' } });
    setIsOpen(true); // Keep open after clear so they can select again
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div 
        className={`flex items-center w-full transition-all ${
          variant === 'ghost'
            ? `px-3 py-2 bg-transparent border-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text hover:bg-gray-50 rounded-lg'} ${isOpen ? 'bg-gray-50' : ''}`
            : `${inputClassName ? inputClassName : 'px-4 py-2.5'} border ${rounded === 'xl' ? 'rounded-xl' : rounded === '2xl' ? 'rounded-2xl' : 'rounded-lg'} ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white cursor-text'} ${isOpen ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-300 hover:border-gray-400'}`
        }`}
        onClick={() => {
          if (!disabled) setIsOpen(true);
        }}
      >
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
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 outline-none bg-transparent min-w-0 ${disabled ? 'text-gray-500 cursor-not-allowed' : 'text-gray-700'}`}
        />
        <div className="flex items-center gap-1 text-gray-400 ml-2">
          {value && !disabled && (
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
            className={`p-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-green-600' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:text-gray-600'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) setIsOpen(!isOpen);
            }}
          >
            <ChevronDown size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className={`absolute z-50 min-w-full w-full mt-1.5 bg-white border border-gray-100 ${rounded === 'xl' || rounded === '2xl' ? 'rounded-2xl shadow-2xl' : 'rounded-lg shadow-lg'} max-h-60 overflow-y-auto ${dropdownClassName}`}>
          {filteredOptions.length > 0 ? (
            <div className="p-1.5 space-y-0.5">
              {filteredOptions.map((option, idx) => {
                const isAction = typeof option !== 'string' && option.isAction;
                const optVal = typeof option === 'string' ? option : option.value;
                const optLabel = typeof option === 'string' ? option : option.label;
                const isSelected = value === optVal;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(option)}
                    className={
                      isAction
                        ? "mx-1 my-1 px-4 py-2.5 cursor-pointer text-sm font-semibold text-center text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-sm transition-colors"
                        : `px-3.5 py-2.5 cursor-pointer text-sm rounded-xl transition-all flex items-center justify-between ${
                            isSelected 
                              ? 'bg-green-50 text-green-700 font-semibold' 
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`
                    }
                  >
                    <span className="truncate">{optLabel}</span>
                    {isSelected && <Check size={16} className="text-green-600 flex-shrink-0 ml-2" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No options found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
