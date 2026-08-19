import fs from 'fs';
import path from 'path';

const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

// 1. Fix line 1945 main container condition
const oldContainerCond = `{((step === 1 && selectedPath === 'direct') || (step === 2 && selectedPath === 'unstructured') || (step === 3 && selectedPath === 'direct')) && !isAiTyping && (`;
const newContainerCond = `{((step === 1 && selectedPath === 'direct') || (step >= 2 && selectedPath === 'unstructured') || step === 3) && !isAiTyping && (`;

if (formContent.includes(oldContainerCond)) {
  formContent = formContent.replace(oldContainerCond, newContainerCond);
  console.log('✅ Replaced main form container condition in InitiativeForm.tsx');
} else {
  console.error('❌ Could not find oldContainerCond');
}

// 2. Fix line 1995 warning banner condition
const oldBannerCond = `{((selectedPath === 'unstructured' && step === 2) || (selectedPath === 'direct' && step === 3)) && (`;
const newBannerCond = `{((selectedPath === 'unstructured' && step >= 2) || (selectedPath === 'direct' && step === 3)) && (`;

if (formContent.includes(oldBannerCond)) {
  formContent = formContent.replace(oldBannerCond, newBannerCond);
  console.log('✅ Replaced warning banner condition in InitiativeForm.tsx');
} else {
  console.error('❌ Could not find oldBannerCond');
}

// 3. Fix line 1331 context check
const oldCtxCheck1 = `if (context === 'chat' && step === 2 && selectedPath === 'unstructured') {`;
const newCtxCheck1 = `if (context === 'chat' && step >= 2 && selectedPath === 'unstructured') {`;
if (formContent.includes(oldCtxCheck1)) {
  formContent = formContent.replace(oldCtxCheck1, newCtxCheck1);
  console.log('✅ Replaced ctxCheck1 in InitiativeForm.tsx');
}

// 4. Fix line 1353 context check
const oldCtxCheck2 = `const ctx = (step === 2 && selectedPath === 'unstructured') ? 'chat' : 'support';`;
const newCtxCheck2 = `const ctx = (step >= 2 && selectedPath === 'unstructured') ? 'chat' : 'support';`;
if (formContent.includes(oldCtxCheck2)) {
  formContent = formContent.replace(oldCtxCheck2, newCtxCheck2);
  console.log('✅ Replaced ctxCheck2 in InitiativeForm.tsx');
}

fs.writeFileSync(formPath, formContent, 'utf8');
