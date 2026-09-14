import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ModernDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  onBlur?: (dateStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: string; // in DD/MM/YYYY or YYYY-MM-DD
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/**
 * Helper to parse any date string (DD/MM/YYYY or YYYY-MM-DD) into Date object
 */
function parseToDate(str: string): Date | null {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  
  // DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmy) {
    const d = parseInt(dmy[1], 10);
    const m = parseInt(dmy[2], 10) - 1;
    const y = parseInt(dmy[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }

  // YYYY-MM-DD
  const ymd = trimmed.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
  if (ymd) {
    const y = parseInt(ymd[1], 10);
    const m = parseInt(ymd[2], 10) - 1;
    const d = parseInt(ymd[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }

  const dt = new Date(trimmed);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Format Date to DD/MM/YYYY
 */
function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = 'DD/MM/AAAA',
  disabled = false,
  className = '',
  minDate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(value || '');

  // Keep internal calendar view synced with current value or today
  const selectedDate = parseToDate(value);
  const minParsed = minDate ? parseToDate(minDate) : null;

  const [viewDate, setViewDate] = useState<Date>(() => {
    return selectedDate || new Date();
  });

  useEffect(() => {
    setInputText(value || '');
    if (value) {
      const parsed = parseToDate(value);
      if (parsed) setViewDate(parsed);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDaySelect = (dayNum: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum);
    const formatted = formatDateDDMMYYYY(newDate);
    setInputText(formatted);
    onChange(formatted);
    if (onBlur) onBlur(formatted);
    setIsOpen(false);
  };

  const handleTodayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const formatted = formatDateDDMMYYYY(today);
    setViewDate(today);
    setInputText(formatted);
    onChange(formatted);
    if (onBlur) onBlur(formatted);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputText('');
    onChange('');
    if (onBlur) onBlur('');
    setIsOpen(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputText(raw);
    onChange(raw);
  };

  const handleTextBlur = () => {
    const parsed = parseToDate(inputText);
    if (parsed) {
      const formatted = formatDateDDMMYYYY(parsed);
      setInputText(formatted);
      onChange(formatted);
      if (onBlur) onBlur(formatted);
    } else {
      if (onBlur) onBlur(inputText);
    }
  };

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isTodayMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center w-full">
        <input
          type="text"
          value={inputText}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={className || "w-full pl-3.5 pr-10 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5] text-slate-800 transition-all placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-2 p-1.5 text-slate-400 hover:text-[#4F5AF5] rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="Abrir calendario"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-[200] w-72 bg-white rounded-2xl shadow-[0_12px_36px_rgba(15,23,42,0.15)] border border-slate-200/90 p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Month / Year & Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-xs font-bold text-slate-800 tracking-wide">
              {MONTH_NAMES[month]} {year}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAY_NAMES.map((wd) => (
              <span key={wd} className="text-[10px] font-bold text-slate-400 select-none">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for days before start of month */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="w-8 h-8" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateAtDay = new Date(year, month, day);
              const isSelected = Boolean(
                selectedDate &&
                selectedDate.getFullYear() === year &&
                selectedDate.getMonth() === month &&
                selectedDate.getDate() === day
              );
              const isToday = isTodayMonth && today.getDate() === day;
              const isBeforeMin = Boolean(minParsed && dateAtDay < new Date(minParsed.getFullYear(), minParsed.getMonth(), minParsed.getDate()));

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isBeforeMin}
                  onClick={() => !isBeforeMin && handleDaySelect(day)}
                  className={`w-8 h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                    isBeforeMin
                      ? 'text-slate-300 cursor-not-allowed'
                      : isSelected
                      ? 'bg-[#4F5AF5] text-white font-bold shadow-md shadow-indigo-500/20 scale-105'
                      : isToday
                      ? 'border border-[#4F5AF5] text-[#4F5AF5] font-bold bg-indigo-50/50 hover:bg-indigo-100'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleTodayClick}
              className="text-[#4F5AF5] font-bold hover:underline"
            >
              Hoy
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-400 hover:text-rose-600 transition-colors"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-800 font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
