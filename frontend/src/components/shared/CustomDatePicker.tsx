import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { format } from 'date-fns';

interface CustomDatePickerProps {
  name?: string;
  value: Date | string | null;
  onChange: (e: any) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  hasError?: boolean;
}

export function CustomDatePicker({ 
  name, 
  value, 
  onChange, 
  placeholder = 'Select Date', 
  className = '', 
  inputClassName = '',
  disabled = false,
  minDate,
  maxDate,
  hasError = false
}: CustomDatePickerProps) {
  
  const [mode, setMode] = useState<'date' | 'month' | 'year'>('date');
  const [pickerOpen, setPickerOpen] = useState(false);
  
  // Safe date parser to avoid timezone shifts or invalid date strings
  const parseDate = (val: Date | string | null | undefined): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return null;
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
        const [d, m, y] = trimmed.split('/').map(Number);
        return new Date(y, m - 1, d);
      }
      if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
        const [y, m, d] = trimmed.split('T')[0].split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      const parsed = new Date(trimmed);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const dateValue = parseDate(value);
  const minDateVal = parseDate(minDate);
  const maxDateVal = parseDate(maxDate);

  const handleDateChange = (date: Date | null) => {
    const formattedString = date ? format(date, 'yyyy-MM-dd') : '';
    const returnValue = typeof value === 'string' ? formattedString : date;

    onChange({
      target: {
        name,
        value: returnValue,
        valueDate: date,
        valueString: formattedString
      }
    });
    setPickerOpen(false);
  };

  const handleHeaderClick = (newMode: 'date' | 'month' | 'year') => {
    setMode(prev => prev === newMode ? 'date' : newMode);
  };

  // When picker is closed externally, reset mode to date
  const handleCalendarClose = () => {
    setPickerOpen(false);
    setTimeout(() => setMode('date'), 300);
  };
  
  const handleCalendarOpen = () => {
    setPickerOpen(true);
  };

  return (
    <div className={`relative ${className}`}>
      <DatePicker
        selected={dateValue}
        onChange={handleDateChange}
        disabled={disabled}
        placeholderText={placeholder}
        dateFormat="dd/MM/yyyy"
        minDate={minDateVal || undefined}
        maxDate={maxDateVal || undefined}
        className={`w-full px-4 py-2.5 ${hasError ? 'border-red-500 bg-red-50/50' : 'bg-white border-gray-300'} border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-gray-900 ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer'} ${inputClassName}`}
        wrapperClassName="w-full"
        popperClassName="pt-2"
        calendarClassName="!border-gray-200 !shadow-lg border-0"
        portalId="datepicker-portal"
        showPopperArrow={false}
        shouldCloseOnSelect={true}
        open={pickerOpen}
        onInputClick={handleCalendarOpen}
        onClickOutside={handleCalendarClose}
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
          changeMonth,
          changeYear
        }) => {
          return (
            <>
              <div className="flex items-center justify-between px-2.5 py-2 bg-white rounded-t-lg relative z-[60] border-b border-gray-100">
                {/* Left controls: Previous Year (<<) and Previous Month (<) */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === 'year') {
                        changeYear(date.getFullYear() - 12);
                      } else {
                        changeYear(date.getFullYear() - 1);
                      }
                    }}
                    className="p-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors rounded-md"
                    title={mode === 'year' ? 'Previous 12 Years' : 'Previous Year (<<)'}
                  >
                    <ChevronsLeft size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (mode === 'year') {
                        changeYear(date.getFullYear() - 12);
                      } else if (mode === 'month') {
                        changeYear(date.getFullYear() - 1);
                      } else {
                        decreaseMonth();
                      }
                    }}
                    disabled={mode === 'date' && prevMonthButtonDisabled}
                    className={`p-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors rounded-md disabled:opacity-30 disabled:cursor-not-allowed ${mode === 'year' ? 'invisible pointer-events-none' : ''}`}
                    title={mode === 'month' ? 'Previous Year' : 'Previous Month (<)'}
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
                
                {/* Center: Month and Year selectors */}
                <div className="flex items-center gap-1">
                  {mode === 'date' && (
                    <button
                      type="button"
                      onClick={() => handleHeaderClick('month')}
                      className="text-gray-900 font-semibold text-sm hover:text-emerald-700 transition-colors px-2 py-1 rounded-md hover:bg-emerald-50"
                      title="Choose month"
                    >
                      {format(date, 'MMMM')}
                    </button>
                  )}
                  
                  {(mode === 'date' || mode === 'month') && (
                    <button
                      type="button"
                      onClick={() => handleHeaderClick('year')}
                      className="text-gray-900 font-semibold text-sm hover:text-emerald-700 transition-colors px-2 py-1 rounded-md hover:bg-emerald-50"
                      title="Choose year"
                    >
                      {format(date, 'yyyy')}
                    </button>
                  )}
                  
                  {mode === 'year' && (
                    <button
                      type="button"
                      onClick={() => handleHeaderClick('date')}
                      className="text-gray-900 font-semibold text-sm hover:text-emerald-700 transition-colors px-2 py-1 rounded-md hover:bg-emerald-50"
                      title="Back to calendar view"
                    >
                      Select Year
                    </button>
                  )}
                </div>

                {/* Right controls: Next Month (>) and Next Year (>>) */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === 'year') {
                        changeYear(date.getFullYear() + 12);
                      } else if (mode === 'month') {
                        changeYear(date.getFullYear() + 1);
                      } else {
                        increaseMonth();
                      }
                    }}
                    disabled={mode === 'date' && nextMonthButtonDisabled}
                    className={`p-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors rounded-md disabled:opacity-30 disabled:cursor-not-allowed ${mode === 'year' ? 'invisible pointer-events-none' : ''}`}
                    title={mode === 'month' ? 'Next Year' : 'Next Month (>)'}
                  >
                    <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (mode === 'year') {
                        changeYear(date.getFullYear() + 12);
                      } else {
                        changeYear(date.getFullYear() + 1);
                      }
                    }}
                    className="p-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors rounded-md"
                    title={mode === 'year' ? 'Next 12 Years' : 'Next Year (>>)'}
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>

              {/* Month Grid Overlay */}
              {mode === 'month' && (
                <div className="absolute top-[48px] left-0 right-0 h-[260px] bg-white z-50 p-3 grid grid-cols-3 gap-2 rounded-b-lg border-t border-gray-100 shadow-inner">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        changeMonth(i);
                        setMode('date');
                      }}
                      className={`rounded-lg flex items-center justify-center text-sm transition-colors ${
                        date.getMonth() === i 
                          ? 'bg-emerald-600 text-white font-bold shadow-sm' 
                          : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      {format(new Date(2000, i, 1), 'MMM')}
                    </button>
                  ))}
                </div>
              )}

              {/* Year Grid Overlay */}
              {mode === 'year' && (
                <div className="absolute top-[48px] left-0 right-0 h-[260px] bg-white z-50 p-3 grid grid-cols-3 gap-2 rounded-b-lg border-t border-gray-100 overflow-y-auto custom-scrollbar content-start shadow-inner">
                  {Array.from({ length: 150 }).map((_, i) => {
                    const y = new Date().getFullYear() - 100 + i;
                    const isSelected = date.getFullYear() === y;
                    return (
                      <button
                        key={y}
                        type="button"
                        ref={isSelected ? (el) => {
                          if (el && !el.dataset.scrolled) {
                            el.scrollIntoView({ block: 'center' });
                            el.dataset.scrolled = 'true';
                          }
                        } : undefined}
                        onClick={() => {
                          changeYear(y);
                          setMode('month');
                        }}
                        className={`rounded-lg flex items-center justify-center text-sm py-2 transition-colors ${
                          isSelected 
                            ? 'bg-emerald-600 text-white font-bold shadow-sm' 
                            : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          );
        }}
      />
      <Calendar 
        size={18} 
        className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${disabled ? 'text-gray-300' : 'text-gray-400'}`} 
      />
    </div>
  );
}

