import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface CustomDatePickerProps {
  name: string;
  value: Date | string | null;
  onChange: (e: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomDatePicker({ 
  name, 
  value, 
  onChange, 
  placeholder = 'DD/MM/YYYY', 
  className = '', 
  disabled = false 
}: CustomDatePickerProps) {
  
  const [mode, setMode] = useState<'date' | 'month' | 'year'>('date');
  const [pickerOpen, setPickerOpen] = useState(false);
  
  // Parse incoming value if it's a string
  const dateValue = typeof value === 'string' && value ? new Date(value) : (value as Date | null);

  const handleDateChange = (date: Date | null) => {
    onChange({
      target: {
        name,
        value: date
      }
    });
    setPickerOpen(false);
  };

  const handleHeaderClick = (newMode: 'date' | 'month' | 'year') => {
    setMode(newMode);
  };

  // When picker is closed externally, reset mode to date
  const handleCalendarClose = () => {
    setPickerOpen(false);
    // Slight delay to not visibly snap the UI before it hides
    setTimeout(() => setMode('date'), 300);
  };
  
  const handleCalendarOpen = () => {
    setPickerOpen(true);
  };

  const handleRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    let formatted = '';
    
    if (val.length > 0) {
      formatted += val.substring(0, 2);
    }
    if (val.length > 2) {
      formatted += '/' + val.substring(2, 4);
    }
    if (val.length > 4) {
      formatted += '/' + val.substring(4, 8);
    }
    
    e.target.value = formatted;
  };

  return (
    <div className={`relative ${className}`}>
      <DatePicker
        selected={dateValue}
        onChange={handleDateChange}
        disabled={disabled}
        placeholderText={placeholder}
        dateFormat="dd/MM/yyyy"
        strictParsing={true}
        onChangeRaw={handleRawChange}
        className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-900 ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}`}
        wrapperClassName="w-full"
        popperClassName="!w-full pt-2"
        calendarClassName="!w-full !border-gray-200 !shadow-lg border-0"
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
          
          const startYear = Math.floor(date.getFullYear() / 12) * 12;
          
          return (
            <>
              <div className="flex items-center justify-between px-3 py-2 bg-white rounded-t-lg relative z-[60]">
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
                  className={`p-1 text-gray-500 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-100 ${mode === 'year' ? 'invisible' : ''}`}
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex gap-2">
                  {mode === 'date' && (
                    <button
                      type="button"
                      onClick={() => handleHeaderClick('month')}
                      className="text-gray-900 font-semibold hover:text-green-600 transition-colors px-2 py-1 rounded-md hover:bg-green-50"
                    >
                      {format(date, 'MMMM')}
                    </button>
                  )}
                  
                  {(mode === 'date' || mode === 'month') && (
                    <button
                      type="button"
                      onClick={() => handleHeaderClick('year')}
                      className="text-gray-900 font-semibold hover:text-green-600 transition-colors px-2 py-1 rounded-md hover:bg-green-50"
                    >
                      {format(date, 'yyyy')}
                    </button>
                  )}
                  
                  {mode === 'year' && (
                    <span className="text-gray-900 font-semibold px-2 py-1">
                      Select Year
                    </span>
                  )}
                </div>

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
                  className={`p-1 text-gray-500 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-100 ${mode === 'year' ? 'invisible' : ''}`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Month Grid Overlay */}
              {mode === 'month' && (
                <div className="absolute top-[48px] left-0 right-0 h-[260px] bg-white z-50 p-3 grid grid-cols-3 gap-2 rounded-b-lg border-t border-gray-100">
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
                          ? 'bg-[#00a651] text-white font-bold' 
                          : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                      }`}
                    >
                      {format(new Date(2000, i, 1), 'MMM')}
                    </button>
                  ))}
                </div>
              )}

              {/* Year Grid Overlay */}
              {mode === 'year' && (
                <div className="absolute top-[48px] left-0 right-0 h-[260px] bg-white z-50 p-3 grid grid-cols-3 gap-2 rounded-b-lg border-t border-gray-100 overflow-y-auto custom-scrollbar content-start">
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
                            ? 'bg-[#00a651] text-white font-bold' 
                            : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
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
