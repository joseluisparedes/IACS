import fs from 'fs';
import path from 'path';

const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let content = fs.readFileSync(formPath, 'utf8');

// 1. Update the condition for Disclaimer and Checkbox rendering
const oldDisclaimerCond = `{((selectedPath === 'unstructured' && step === 3) || (selectedPath === 'direct' && step === 3) || step === 3) && (`;
const newDisclaimerCond = `{((selectedPath === 'unstructured' && step >= 2) || (selectedPath === 'direct' && step === 3) || step === 3) && (`;

if (content.includes(oldDisclaimerCond)) {
  content = content.replace(oldDisclaimerCond, newDisclaimerCond);
  console.log('✅ Updated Disclaimer Checkbox condition to show at step >= 2 in Option A');
} else {
  console.error('❌ Could not find oldDisclaimerCond in InitiativeForm.tsx');
}

// 2. Make disclaimer checkbox container more prominent with red/amber highlight if missing on submit attempt
const oldDisclaimerBox = `            {((selectedPath === 'unstructured' && step >= 2) || (selectedPath === 'direct' && step === 3) || step === 3) && (
              <div className="px-8 py-5 border-t border-[#F1F5F9] bg-[#FFFBEB]/30">
                <div className="flex items-start gap-3 p-4 bg-amber-50/60 rounded-xl border border-amber-100/70">
                  <input
                    type="checkbox"
                    id="disclaimer-checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#E2E8F0] text-[#4F5AF5] focus:ring-[#4F5AF5] transition-colors cursor-pointer"
                  />
                  <label htmlFor="disclaimer-checkbox" className="text-xs text-amber-900 leading-relaxed select-none cursor-pointer">
                    <span className="font-bold">Declaración de Responsabilidad:</span> Estoy conforme con la información mostrada y soy consciente de la información que estoy registrando y aceptando.
                  </label>
                </div>
              </div>
            )}`;

const newDisclaimerBox = `            {((selectedPath === 'unstructured' && step >= 2) || (selectedPath === 'direct' && step === 3) || step === 3) && (
              <div id="consent-disclaimer-section" className="px-8 py-5 border-t border-[#F1F5F9] bg-[#FFFBEB]/30">
                <div className={\`flex items-start gap-3 p-4 rounded-xl border transition-all \${disclaimerAccepted ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'}\`}>
                  <input
                    type="checkbox"
                    id="disclaimer-checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-amber-400 text-[#4F5AF5] focus:ring-[#4F5AF5] transition-colors cursor-pointer shrink-0"
                  />
                  <label htmlFor="disclaimer-checkbox" className="text-xs text-amber-950 leading-relaxed select-none cursor-pointer">
                    <span className="font-bold text-amber-900">Declaración de Responsabilidad (Consentimiento):</span> Estoy conforme con toda la información mostrada y declaro que mi Director / VP tiene pleno conocimiento y ha otorgado su consentimiento para que esta necesidad sea aprobada por el BP TI.
                  </label>
                </div>
              </div>
            )}`;

if (content.includes(oldDisclaimerBox)) {
  content = content.replace(oldDisclaimerBox, newDisclaimerBox);
  console.log('✅ Updated Disclaimer Box design and text in InitiativeForm.tsx');
} else {
  console.error('❌ Could not find oldDisclaimerBox in InitiativeForm.tsx');
}

// 3. Update handleSaveWithValidation to scroll smoothly to disclaimer when missing
const oldValidationToast = `      if (!disclaimerAccepted) {
        showToast("Debes aceptar la declaración de responsabilidad indicando que tu Director tiene conocimiento antes de enviar a aprobación.", "warning");
        return;
      }`;

const newValidationToast = `      if (!disclaimerAccepted) {
        showToast("Por favor marca el casilla de Declaración de Responsabilidad (Consentimiento) al final del formulario antes de enviar a aprobación.", "error");
        const el = document.getElementById('consent-disclaimer-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }`;

if (content.includes(oldValidationToast)) {
  content = content.replace(oldValidationToast, newValidationToast);
  console.log('✅ Updated handleSaveWithValidation disclaimer toast and auto-scroll in InitiativeForm.tsx');
} else {
  console.error('❌ Could not find oldValidationToast in InitiativeForm.tsx');
}

fs.writeFileSync(formPath, content, 'utf8');
