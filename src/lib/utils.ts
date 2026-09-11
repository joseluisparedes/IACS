import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Standardize date formatting to DD/MM/YYYY across the application.
 * Handles:
 * - 'YYYY-MM-DD' strings (e.g. '2026-11-27' -> '27/11/2026') without timezone offset shifts.
 * - 'DD/MM/YYYY' or 'DD-MM-YYYY' strings -> preserves 'DD/MM/YYYY'.
 * - ISO timestamps (e.g. '2026-09-11T14:03:00.000Z' -> '11/09/2026').
 * - Date objects, timestamps, etc.
 */
export function formatDateDDMMYYYY(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '—';
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const str = String(val).trim();
  if (!str) return '—';

  // 1. Check direct YYYY-MM-DD or YYYY/MM/DD (common in HTML date inputs and DB dates)
  const ymdMatch = str.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // 2. Check already DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // 3. Check ISO string with date component (e.g. 2026-11-27T...)
  const isoPrefixMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoPrefixMatch) {
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      const day = String(dt.getDate()).padStart(2, '0');
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const year = dt.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // 4. General Date parse fallback if it looks like a date string
  const dt = new Date(str);
  if (!isNaN(dt.getTime()) && (str.includes('-') || str.includes('/') || str.includes('T'))) {
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

/**
 * Formats datetime to DD/MM/YYYY, HH:mm
 */
export function formatDateTimeDDMMYYYY(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  const dt = val instanceof Date ? val : new Date(val);
  if (isNaN(dt.getTime())) {
    return formatDateDDMMYYYY(val);
  }
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  const hours = String(dt.getHours()).padStart(2, '0');
  const mins = String(dt.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${mins}`;
}

/**
 * Checks if a string or value is formatted like a date (e.g., YYYY-MM-DD or DD/MM/YYYY)
 */
export function isDateLike(val: any): boolean {
  if (!val) return false;
  if (val instanceof Date) return !isNaN(val.getTime());
  if (typeof val !== 'string') return false;
  const s = val.trim();
  return (
    /^\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}/.test(s) ||
    /^\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}/.test(s)
  );
}

