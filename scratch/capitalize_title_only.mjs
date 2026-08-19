import fs from 'fs';
import path from 'path';

// 1. Update server.ts extractLocalUnstructured
const serverPath = path.join(process.cwd(), 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

const oldServerTitle = `  values["titulo"] = titulo;`;
const newServerTitle = `  if (titulo) {
    titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);
  }
  values["titulo"] = titulo;`;

if (serverContent.includes(oldServerTitle)) {
  serverContent = serverContent.replace(oldServerTitle, newServerTitle);
  fs.writeFileSync(serverPath, serverContent, 'utf8');
  console.log('✅ Updated server.ts to capitalize first letter of title');
}

// 2. Update InitiativeForm.tsx when merging values
const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

const oldFormTitleMerge = `        if (v !== undefined && v !== null && v !== "") {
          updatedFormData[k] = v as string;
        }`;

const newFormTitleMerge = `        if (v !== undefined && v !== null && v !== "") {
          let valStr = v as string;
          if (k === 'titulo' && typeof valStr === 'string' && valStr.trim()) {
            valStr = valStr.trim().charAt(0).toUpperCase() + valStr.trim().slice(1);
          }
          updatedFormData[k] = valStr;
        }`;

if (formContent.includes(oldFormTitleMerge)) {
  formContent = formContent.replace(oldFormTitleMerge, newFormTitleMerge);
  fs.writeFileSync(formPath, formContent, 'utf8');
  console.log('✅ Updated InitiativeForm.tsx to capitalize first letter of title');
}
