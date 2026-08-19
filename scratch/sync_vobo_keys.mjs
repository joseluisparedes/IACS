import fs from 'fs';
import path from 'path';

const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

const oldOnChange = `                          onChange={v => {
                            setFormData(p => {
                              const newForm = { ...p, [field.key]: v };
                              // Reset any child fields that depend on this one
                              fields.filter(f => f.depends_on === field.key).forEach(child => {
                                newForm[child.key] = "";
                              });
                              return newForm;
                            });`;

const newOnChange = `                          onChange={v => {
                            setFormData(p => {
                              const isVobo = field.key === 'aprobacion_de_director' || field.key === 'aprobacin_de_director';
                              const newForm = { 
                                ...p, 
                                [field.key]: v,
                                ...(isVobo ? { aprobacion_de_director: v, aprobacin_de_director: v } : {})
                              };
                              // Reset any child fields that depend on this one
                              fields.filter(f => f.depends_on === field.key).forEach(child => {
                                newForm[child.key] = "";
                              });
                              return newForm;
                            });`;

if (formContent.includes(oldOnChange)) {
  formContent = formContent.replace(oldOnChange, newOnChange);
  fs.writeFileSync(formPath, formContent, 'utf8');
  console.log('✅ Synchronized aprobacion_de_director and aprobacin_de_director in InitiativeForm.tsx onChange handler');
}
