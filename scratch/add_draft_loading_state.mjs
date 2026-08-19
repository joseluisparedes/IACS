import fs from 'fs';
import path from 'path';

const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let content = fs.readFileSync(formPath, 'utf8');

const targetReturn = `  return (
    <div className="max-w-3xl mx-auto">`;

const newReturn = `  if (id && loadingFields) {
    return (
      <div className="max-w-3xl mx-auto py-20 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] border border-[#E0E7FF] flex items-center justify-center text-[#4F5AF5] shadow-sm">
          <div className="w-6 h-6 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#1E293B]">Cargando borrador...</h3>
          <p className="text-xs text-[#64748B] mt-1">Recuperando la información y el estado de la iniciativa</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">`;

if (content.includes(targetReturn)) {
  content = content.replace(targetReturn, newReturn);
  fs.writeFileSync(formPath, content, 'utf8');
  console.log('✅ Added draft loading screen in InitiativeForm.tsx');
} else {
  console.error('❌ Could not find targetReturn in InitiativeForm.tsx');
}
