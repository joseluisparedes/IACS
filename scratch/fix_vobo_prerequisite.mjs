import fs from 'fs';
import path from 'path';

const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

// 1. Update autoSave to include _director_declaration_accepted in formData
const oldAutoSaveBody = `        body: JSON.stringify({
          id: draftIdRef.current,
          form_data: currentFormData,
          chat_history: currentHistory,
          summary: currentSummary,
          confirmed_fields: confirmedFields,
          unstructured_text: unstructuredText,
          status: "Borrador",
          user_id: profile?.id ?? null,
        }),`;

const newAutoSaveBody = `        body: JSON.stringify({
          id: draftIdRef.current,
          form_data: {
            ...currentFormData,
            _director_declaration_accepted: disclaimerAccepted || currentFormData?._director_declaration_accepted || false
          },
          chat_history: currentHistory,
          summary: currentSummary,
          confirmed_fields: confirmedFields,
          unstructured_text: unstructuredText,
          status: "Borrador",
          user_id: profile?.id ?? null,
        }),`;

if (formContent.includes(oldAutoSaveBody)) {
  formContent = formContent.replace(oldAutoSaveBody, newAutoSaveBody);
  console.log('✅ Updated autoSave in InitiativeForm.tsx to preserve _director_declaration_accepted');
}

// 2. Update handleStartChatWithValidation & handleAnalyzeText to enforce disclaimerAccepted as prerequisite
const oldStartChatValidation = `  const handleStartChatWithValidation = (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors } = validateAllFields();
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    handleStartChat(e);
  };`;

const newStartChatValidation = `  const handleStartChatWithValidation = (e: React.FormEvent) => {
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

if (formContent.includes(oldStartChatValidation)) {
  formContent = formContent.replace(oldStartChatValidation, newStartChatValidation);
  console.log('✅ Enforced VoBo disclaimer check in handleStartChatWithValidation');
}

const oldAnalyzeText = `  const handleAnalyzeText = async () => {
    if (!unstructuredText.trim()) return;
    setIsAnalyzing(true);`;

const newAnalyzeText = `  const handleAnalyzeText = async () => {
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

if (formContent.includes(oldAnalyzeText)) {
  formContent = formContent.replace(oldAnalyzeText, newAnalyzeText);
  console.log('✅ Enforced VoBo disclaimer check in handleAnalyzeText');
}

// 3. Make Disclaimer Checkbox visible in Step 1 as well
const oldDisclaimerRender = `            {/* Disclaimer and Checkbox */}
            {(selectedPath === 'unstructured' || (selectedPath === 'direct' && step === 3) || step === 3) && (`;

const newDisclaimerRender = `            {/* Disclaimer and Checkbox */}
            {(step === 1 || selectedPath === 'unstructured' || step === 3) && (`;

if (formContent.includes(oldDisclaimerRender)) {
  formContent = formContent.replace(oldDisclaimerRender, newDisclaimerRender);
  console.log('✅ Made Disclaimer Checkbox visible in Step 1');
}

fs.writeFileSync(formPath, formContent, 'utf8');
