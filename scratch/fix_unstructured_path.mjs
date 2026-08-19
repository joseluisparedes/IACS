import fs from 'fs';
import path from 'path';

const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

const oldAnalyzeFunc = `      setFormData(prev => {
        const next = { ...prev };
        Object.entries(data.values || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") {
            next[k] = v as string;
          }
        });
        return next;
      });

      setAiWarnings(data.warnings || {});
      setStep(2);`;

const newAnalyzeFunc = `      let updatedFormData = { ...formData };
      Object.entries(data.values || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          updatedFormData[k] = v as string;
        }
      });

      setFormData(updatedFormData);
      setAiWarnings(data.warnings || {});

      // Build summary object for Step 3
      const summaryObj = {
        titulo: updatedFormData.titulo || updatedFormData.titulo_de_la_necesidad || "Iniciativa de TI",
        objetivo: updatedFormData.objetivo || "Optimizar procesos de negocio",
        descripcion_de_la_necesidad: updatedFormData.descripcion_de_la_necesidad || unstructuredText,
        fecha_requerida: updatedFormData.fecha_requerida || "",
        vicepresidencia: updatedFormData.vicepresidencia || "",
        direccion: updatedFormData.direccion || "",
        ...data.values
      };
      setSummary(summaryObj);

      // Transition directly to Step 3 (Resumen y Envío a Aprobación)
      setStep(3);
      autoSave([], summaryObj, updatedFormData);`;

if (formContent.includes(oldAnalyzeFunc)) {
  formContent = formContent.replace(oldAnalyzeFunc, newAnalyzeFunc);
  fs.writeFileSync(formPath, formContent, 'utf8');
  console.log('✅ Updated handleAnalyzeText to navigate directly to Step 3 with summary in InitiativeForm.tsx');
} else {
  console.error('❌ Could not find oldAnalyzeFunc in InitiativeForm.tsx');
}
