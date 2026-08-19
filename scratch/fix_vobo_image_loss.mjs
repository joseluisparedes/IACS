import fs from 'fs';
import path from 'path';

// 1. Update server.ts: sanitizeInitialDataForAI deep clone & getMockSummaryResponse fix
const serverPath = path.join(process.cwd(), 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

const oldSanitizeFunc = `  function sanitizeInitialDataForAI(initialData: any): any {
    if (!initialData) return initialData;
    const sanitized = { ...initialData };
    for (const key of Object.keys(sanitized)) {
      const val = sanitized[key];
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (parsed && typeof parsed === 'object' && parsed.name) {
            sanitized[key] = \`[Archivo adjunto: \${parsed.name}]\`;
          }
        } catch (e) {
          // Not JSON
        }
      }
    }
    return sanitized;
  }`;

const newSanitizeFunc = `  function sanitizeInitialDataForAI(initialData: any): any {
    if (!initialData) return initialData;
    const sanitized = JSON.parse(JSON.stringify(initialData));
    for (const key of Object.keys(sanitized)) {
      const val = sanitized[key];
      if (typeof val === 'string' && val.startsWith('{"name":')) {
        try {
          const parsed = JSON.parse(val);
          if (parsed && typeof parsed === 'object' && parsed.name) {
            sanitized[key] = \`[Archivo adjunto: \${parsed.name}]\`;
          }
        } catch (e) {
          // Not JSON
        }
      }
    }
    return sanitized;
  }`;

if (serverContent.includes(oldSanitizeFunc)) {
  serverContent = serverContent.replace(oldSanitizeFunc, newSanitizeFunc);
  console.log('✅ Fixed sanitizeInitialDataForAI deep cloning in server.ts');
}

// Ensure getMockSummaryResponse in server.ts preserves original VoBo file JSON from initialData
const oldMockSummary = `function getMockSummaryResponse(initialData: any) {
  const inst = initialData?.institucion || "UPN";
  return {`;

const newMockSummary = `function getMockSummaryResponse(initialData: any) {
  const inst = initialData?.institucion || "UPN";
  const voboVal = initialData?.aprobacion_de_director || initialData?.aprobacin_de_director;
  const extraVobo = voboVal ? { aprobacion_de_director: voboVal, aprobacin_de_director: voboVal } : {};
  return {
    ...extraVobo,`;

if (serverContent.includes(oldMockSummary)) {
  serverContent = serverContent.replace(oldMockSummary, newMockSummary);
  console.log('✅ Updated getMockSummaryResponse in server.ts to preserve original VoBo file value');
}

fs.writeFileSync(serverPath, serverContent, 'utf8');

// 2. Update InitiativeForm.tsx
const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

// A. Restore Step 1 rendering: remove the Declaración checkbox from Step 1 (keep only in Step 3 / Consent modal)
const oldStep1Disclaimer = `            {/* Disclaimer and Checkbox */}
            {(step === 1 || selectedPath === 'unstructured' || step === 3) && (`;

const newStep1Disclaimer = `            {/* Disclaimer and Checkbox */}
            {((selectedPath === 'unstructured' && step === 3) || (selectedPath === 'direct' && step === 3) || step === 3) && (`;

if (formContent.includes(oldStep1Disclaimer)) {
  formContent = formContent.replace(oldStep1Disclaimer, newStep1Disclaimer);
  console.log('✅ Removed unwanted Declaración checkbox from Step 1');
}

// B. Remove disclaimerAccepted requirement from handleStartChatWithValidation & handleAnalyzeText
const oldStartValidation = `  const handleStartChatWithValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclaimerAccepted) {
      showToast("Debes declarar que tu Director tiene conocimiento sobre esta iniciativa antes de iniciar el chat.", "warning");
      return;
    }
    const { isValid, errors } = validateAllFields();
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    setFormData(prev => ({
      ...prev,
      _director_declaration_accepted: true
    }));
    handleStartChat(e);
  };`;

const newStartValidation = `  const handleStartChatWithValidation = (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors } = validateAllFields();
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    handleStartChat(e);
  };`;

if (formContent.includes(oldStartValidation)) {
  formContent = formContent.replace(oldStartValidation, newStartValidation);
  console.log('✅ Restored handleStartChatWithValidation in InitiativeForm.tsx');
}

const oldAnalyzeValidation = `  const handleAnalyzeText = async () => {
    if (!unstructuredText.trim()) return;
    if (!disclaimerAccepted) {
      showToast("Debes declarar que tu Director tiene conocimiento sobre esta iniciativa antes de continuar.", "warning");
      return;
    }
    setFormData(prev => ({
      ...prev,
      _director_declaration_accepted: true
    }));
    setIsAnalyzing(true);`;

const newAnalyzeValidation = `  const handleAnalyzeText = async () => {
    if (!unstructuredText.trim()) return;
    setIsAnalyzing(true);`;

if (formContent.includes(oldAnalyzeValidation)) {
  formContent = formContent.replace(oldAnalyzeValidation, newAnalyzeValidation);
  console.log('✅ Restored handleAnalyzeText in InitiativeForm.tsx');
}

// C. Update DynamicField file parsing to handle stringified JSON, raw text "[Archivo adjunto:...]", and image URLs
const oldFileParse = `  // Parse current value if it is a JSON file representation
  let fileObj: { name: string; content?: string; url?: string; type?: string } | null = null;
  if (value && typeof value === "string" && value.startsWith('{"name":')) {
    try {
      fileObj = JSON.parse(value);
    } catch (e) {
      // Not a valid JSON, fallback to null
    }
  }`;

const newFileParse = `  // Parse current value if it is a JSON file representation, attachment text, or file URL
  let fileObj: { name: string; content?: string; url?: string; type?: string } | null = null;
  if (value && typeof value === "string" && value.trim() !== "") {
    if (value.startsWith('{"name":')) {
      try {
        fileObj = JSON.parse(value);
      } catch (e) { /* Not JSON */ }
    }
    if (!fileObj && value.includes('[Archivo adjunto:')) {
      const match = value.match(/\\[Archivo adjunto:\\s*([^\\]]+)\\]/);
      if (match) {
        fileObj = { name: match[1].trim() };
      }
    }
    if (!fileObj && (value.match(/\\.(png|jpg|jpeg|pdf|docx|txt|webp)$/i) || value.startsWith('http'))) {
      fileObj = { name: value.split('/').pop() || value, url: value.startsWith('http') ? value : undefined };
    }
  }`;

if (formContent.includes(oldFileParse)) {
  formContent = formContent.replace(oldFileParse, newFileParse);
  console.log('✅ Updated DynamicField file parsing to support stringified JSON, attachment markers, and URLs');
}

fs.writeFileSync(formPath, formContent, 'utf8');
