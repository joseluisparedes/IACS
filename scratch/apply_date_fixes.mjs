import fs from 'fs';
import path from 'path';

// 1. Update InitiativeForm.tsx
const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

// Update parseQuarterDate in InitiativeForm.tsx
const oldParseQuarterDate = `  // 5. "PROXIMO MES", "MES SIGUIENTE"
  if (cleanStr.includes('PROXIMO MES') || cleanStr.includes('MES SIGUIENTE')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    return \`\${day}/\${month}/\${year}\`;
  }

  // 6. "ESTE MES", "FIN DE MES"
  if (cleanStr.includes('ESTE MES') || cleanStr.includes('FIN DE MES')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    return \`\${day}/\${month}/\${year}\`;
  }

  // 7. "DENTRO DE X MESES", "EN X MESES", "PROXIMOS X MESES"
  const mMatch = cleanStr.match(/(?:DENTRO DE|EN|PROXIMOS)\\s+(?:LOS\\s+)?(\\d{1,2})\\s+MESES?/);
  if (mMatch) {
    const numMonths = parseInt(mMatch[1], 10);
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1 + numMonths, 0);
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    return \`\${day}/\${month}/\${year}\`;
  }`;

const newParseQuarterDate = `  // 5. "PROXIMO MES", "MES SIGUIENTE"
  if (cleanStr.includes('PROXIMO MES') || cleanStr.includes('MES SIGUIENTE')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    return \`\${day}/\${month}/\${year}\`;
  }

  // 6. "ESTE MES", "FIN DE MES"
  if (cleanStr.includes('ESTE MES') || cleanStr.includes('FIN DE MES')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    return \`\${day}/\${month}/\${year}\`;
  }

  // 7. "DENTRO DE X MESES", "EN X MESES", "PROXIMOS X MESES"
  const mMatch = cleanStr.match(/(?:DENTRO DE|EN|PROXIMOS)\\s+(?:LOS\\s+)?(\\d{1,2})\\s+MESES?/);
  if (mMatch) {
    const numMonths = parseInt(mMatch[1], 10);
    const targetDate = new Date(now.getFullYear(), now.getMonth() + numMonths, now.getDate());
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    return \`\${day}/\${month}/\${year}\`;
  }`;

if (formContent.includes(oldParseQuarterDate)) {
  formContent = formContent.replace(oldParseQuarterDate, newParseQuarterDate);
  console.log('✅ Updated parseQuarterDate calculation in InitiativeForm.tsx');
}

// Update DateInputDDMMYYYY component in InitiativeForm.tsx
const dateInputStart = formContent.indexOf('function DateInputDDMMYYYY(');
const dateInputEnd = formContent.indexOf('// ─── Dynamic field ────────────────────────────────────────────────────────────');

if (dateInputStart !== -1 && dateInputEnd !== -1) {
  const newDateInputComp = `function DateInputDDMMYYYY({
  value,
  onChange,
  onBlur,
  required,
  disabled,
  className
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const hiddenDateRef = useRef<HTMLInputElement>(null);
  const [inputText, setInputText] = useState<string>(value || "");

  useEffect(() => {
    setInputText(value || "");
  }, [value]);

  const toDDMMYYYY = (val: string): string => {
    if (!val) return "";
    const trimmed = val.trim();
    const qDate = parseQuarterDate(trimmed);
    if (qDate) return qDate;
    const ymd = trimmed.match(/^(\\d{4})[\\/\\.-](\\d{1,2})[\\/\\.-](\\d{1,2})$/);
    if (ymd) {
      return \`\${ymd[3].padStart(2, "0")}/\${ymd[2].padStart(2, "0")}/\${ymd[1]}\`;
    }
    const dmy = trimmed.match(/^(\\d{1,2})[\\/\\.-](\\d{1,2})[\\/\\.-](\\d{4})$/);
    if (dmy) {
      return \`\${dmy[1].padStart(2, "0")}/\${dmy[2].padStart(2, "0")}/\${dmy[3]}\`;
    }
    return val;
  };

  const toYYYYMMDD = (val: string): string => {
    if (!val) return "";
    const trimmed = val.trim();
    const dmyStr = parseQuarterDate(trimmed) || trimmed;
    const dmy = dmyStr.match(/^(\\d{1,2})[\\/\\.-](\\d{1,2})[\\/\\.-](\\d{4})$/);
    if (dmy) {
      return \`\${dmy[3]}-\${dmy[2].padStart(2, "0")}-\${dmy[1].padStart(2, "0")}\`;
    }
    const ymd = dmyStr.match(/^(\\d{4})[\\/\\.-](\\d{1,2})[\\/\\.-](\\d{1,2})$/);
    if (ymd) {
      return \`\${ymd[1]}-\${ymd[2].padStart(2, "0")}-\${ymd[3].padStart(2, "0")}\`;
    }
    return "";
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    onChange(val);
  };

  const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = toDDMMYYYY(raw);
    if (formatted) {
      setInputText(formatted);
      onChange(formatted);
    }
    if (onBlur) onBlur(formatted || raw);
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickerVal = e.target.value;
    if (pickerVal) {
      const formatted = toDDMMYYYY(pickerVal);
      setInputText(formatted);
      onChange(formatted);
      if (onBlur) onBlur(formatted);
    }
  };

  const openCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hiddenDateRef.current && !disabled) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        try {
          hiddenDateRef.current.showPicker();
        } catch {
          hiddenDateRef.current.focus();
          hiddenDateRef.current.click();
        }
      } else {
        hiddenDateRef.current.focus();
        hiddenDateRef.current.click();
      }
    }
  };

  const isoVal = toYYYYMMDD(inputText);

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        value={inputText}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        placeholder="dd/mm/aaaa"
        required={required}
        disabled={disabled}
        className={\`\${className || ''} pr-10\`}
      />
      <button
        type="button"
        onClick={openCalendar}
        disabled={disabled}
        className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50 p-1 rounded hover:bg-slate-100 transition-colors"
        title="Seleccionar fecha del calendario"
      >
        <Calendar className="w-4 h-4 text-slate-500" />
      </button>
      <input
        ref={hiddenDateRef}
        type="date"
        value={isoVal}
        onChange={handleNativeChange}
        tabIndex={-1}
        className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
      />
    </div>
  );
}

`;

  formContent = formContent.substring(0, dateInputStart) + newDateInputComp + formContent.substring(dateInputEnd);
  fs.writeFileSync(formPath, formContent, 'utf8');
  console.log('✅ Replaced DateInputDDMMYYYY in InitiativeForm.tsx with editable input state');
}

// 2. Update normalizeDateStr in server.ts
const serverPath = path.join(process.cwd(), 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

const oldServerMonthCalc = `  if (cleanStr.includes('PROXIMO MES') || cleanStr.includes('MES SIGUIENTE')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  if (cleanStr.includes('ESTE MES') || cleanStr.includes('FIN DE MES')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  const mMatch = cleanStr.match(/(?:DENTRO DE|EN|PROXIMOS)\\s+(?:LOS\\s+)?(\\d{1,2})\\s+MESES?/);
  if (mMatch) {
    const numMonths = parseInt(mMatch[1], 10);
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1 + numMonths, 0);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }`;

const newServerMonthCalc = `  if (cleanStr.includes('PROXIMO MES') || cleanStr.includes('MES SIGUIENTE')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  if (cleanStr.includes('ESTE MES') || cleanStr.includes('FIN DE MES')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  const mMatch = cleanStr.match(/(?:DENTRO DE|EN|PROXIMOS)\\s+(?:LOS\\s+)?(\\d{1,2})\\s+MESES?/);
  if (mMatch) {
    const numMonths = parseInt(mMatch[1], 10);
    const targetDate = new Date(now.getFullYear(), now.getMonth() + numMonths, now.getDate());
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }`;

if (serverContent.includes(oldServerMonthCalc)) {
  serverContent = serverContent.replace(oldServerMonthCalc, newServerMonthCalc);
  fs.writeFileSync(serverPath, serverContent, 'utf8');
  console.log('✅ Updated normalizeDateStr calculation in server.ts');
}
