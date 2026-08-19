import fs from 'fs';
import path from 'path';

const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

// Replace setStep(3) with setStep(2) inside handleAnalyzeText
const oldStep3 = `      // Transition directly to Step 3 (Resumen y Envío a Aprobación)
      setStep(3);`;

const newStep2 = `      // Transition to Step 2 (Revisión con IA y Envío a Aprobación)
      setStep(2);`;

if (formContent.includes(oldStep3)) {
  formContent = formContent.replace(oldStep3, newStep2);
  fs.writeFileSync(formPath, formContent, 'utf8');
  console.log('✅ Updated handleAnalyzeText to navigate to Step 2 for 2-step unstructured path');
} else {
  console.error('❌ Could not find oldStep3');
}
