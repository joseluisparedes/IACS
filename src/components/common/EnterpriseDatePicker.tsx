import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface EnterpriseDatePickerProps {
  value: string; // DD/MM/YYYY format or ISO
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const WEEKDAY_NAMES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export function EnterpriseDatePicker({
  value,
  onChange,
  onBlur,
  required,
  disabled,
  className,
  placeholder = "dd/mm/aaaa"
}: EnterpriseDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse DD/MM/YYYY or YYYY-MM-DD to a valid Date object
  const parseToDate = (str: string): Date | null => {
    if (!str) return null;
    const trimmed = str.trim();
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
      const d = parseInt(dmy[1], 10);
      const m = parseInt(dmy[2], 10) - 1;
      const y = parseInt(dmy[3], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime()) && date.getMonth() === m) return date;
    }
    // YYYY-MM-DD
    const ymd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymd) {
      const y = parseInt(ymd[1], 10);
      const m = parseInt(ymd[2], 10) - 1;
      const d = parseInt(ymd[3], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime()) && date.getMonth() === m) return date;
    }
    return null;
  };

  const formatDateToDDMMYYYY = (date: Date): string => {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const initialDate = parseToDate(value) || new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const parsed = parseToDate(value);
      if (parsed) {
        setInputText(formatDateToDDMMYYYY(parsed));
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      } else {
        setInputText(value);
      }
    } else {
      setInputText("");
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    onChange(text);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseToDate(raw);
    if (parsed) {
      const formatted = formatDateToDDMMYYYY(parsed);
      setInputText(formatted);
      onChange(formatted);
      if (onBlur) onBlur(formatted);
    } else {
      if (onBlur) onBlur(raw);
    }
  };

  const handleSelectDate = (date: Date) => {
    const formatted = formatDateToDDMMYYYY(date);
    setInputText(formatted);
    onChange(formatted);
    if (onBlur) onBlur(formatted);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleQuickPreset = (preset: "today" | "endOfMonth" | "nextMonth" | "clear") => {
    const now = new Date();
    if (preset === "today") {
      handleSelectDate(now);
    } else if (preset === "endOfMonth") {
      const lastDay = new Date(viewYear, viewMonth + 1, 0);
      handleSelectDate(lastDay);
    } else if (preset === "nextMonth") {
      const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      handleSelectDate(nextMonthFirst);
    } else if (preset === "clear") {
      setInputText("");
      onChange("");
      if (onBlur) onBlur("");
      setIsOpen(false);
    }
  };

  // Compute days for calendar grid
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const selectedDateObj = parseToDate(inputText);
  const isSelectedDay = (day: number) => {
    return (
      selectedDateObj !== null &&
      selectedDateObj.getDate() === day &&
      selectedDateObj.getMonth() === viewMonth &&
      selectedDateObj.getFullYear() === viewYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center w-full">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`${className || "w-full border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white rounded-xl px-3.5 py-2.5 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#EB5F46]/20 focus:border-[#EB5F46] transition-all disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"} pr-10 font-medium`}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(prev => !prev)}
          disabled={disabled}
          className="absolute right-2.5 p-1 text-slate-400 hover:text-[#EB5F46] hover:bg-[#FFF0ED] rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Abrir selector de fechas corporativo"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Modern Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white/98 backdrop-blur-md rounded-2xl border border-[#E2E8F0] shadow-[0_16px_36px_rgba(15,23,42,0.16)] p-3.5 w-[290px] animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Calendar Header: Month/Year navigation */}
          <div className="flex items-center justify-between gap-1 mb-3 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-[#EB5F46] hover:bg-[#FFF0ED] transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 font-bold text-xs text-[#1E293B]">
              <select
                value={viewMonth}
                onChange={e => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-slate-50 border border-slate-200 hover:border-[#EB5F46] rounded-lg px-2 py-1 text-xs font-bold text-[#1E293B] focus:outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>{name}</option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={e => setViewYear(parseInt(e.target.value, 10))}
                className="bg-slate-50 border border-slate-200 hover:border-[#EB5F46] rounded-lg px-2 py-1 text-xs font-bold text-[#1E293B] focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 15 }, (_, i) => 2022 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-[#EB5F46] hover:bg-[#FFF0ED] transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES.map(w => (
              <span key={w} className="text-[10px] font-bold text-[#94A3B8] uppercase">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Trailing days from previous month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-7 flex items-center justify-center text-[11px] text-slate-300 font-normal select-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelectedDay(day);
              const today = isToday(day);

              return (
                <button
                  key={`cur-${day}`}
                  type="button"
                  onClick={() => handleSelectDate(new Date(viewYear, viewMonth, day))}
                  className={`h-7 w-7 mx-auto flex items-center justify-center text-xs rounded-lg transition-all font-semibold cursor-pointer ${
                    selected
                      ? "bg-[#EB5F46] text-white shadow-sm shadow-[#EB5F46]/30 font-bold scale-105"
                      : today
                        ? "border border-[#EB5F46] text-[#EB5F46] hover:bg-[#FFF0ED]"
                        : "text-[#334155] hover:bg-[#FFF0ED] hover:text-[#EB5F46]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Presets & Actions Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleQuickPreset("today")}
                className="px-2 py-1 text-[10px] font-bold rounded bg-slate-100 hover:bg-[#FFF0ED] text-slate-600 hover:text-[#EB5F46] transition-colors"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("endOfMonth")}
                className="px-2 py-1 text-[10px] font-bold rounded bg-slate-100 hover:bg-[#FFF0ED] text-slate-600 hover:text-[#EB5F46] transition-colors"
              >
                Fin de mes
              </button>
            </div>

            {inputText && (
              <button
                type="button"
                onClick={() => handleQuickPreset("clear")}
                className="flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 rounded transition-colors"
                title="Limpiar fecha"
              >
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
