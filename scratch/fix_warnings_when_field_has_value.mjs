import fs from 'fs';
import path from 'path';

// 1. Update InitiativeForm.tsx to only show warning box if field value is EMPTY
const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

// Replace vicepresidencia warning render
const oldVpWarn = `                    {aiWarnings.vicepresidencia && (
                      <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{aiWarnings.vicepresidencia}</span>
                      </div>
                    )}`;

const newVpWarn = `                    {aiWarnings.vicepresidencia && (!formData.vicepresidencia || String(formData.vicepresidencia).trim() === "") && (
                      <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{aiWarnings.vicepresidencia}</span>
                      </div>
                    )}`;

if (formContent.includes(oldVpWarn)) {
  formContent = formContent.replace(oldVpWarn, newVpWarn);
  console.log('✅ Updated vicepresidencia warning rendering in InitiativeForm.tsx');
}

// Replace direccion warning render
const oldDirWarn = `                    {aiWarnings.direccion && (
                      <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{aiWarnings.direccion}</span>
                      </div>
                    )}`;

const newDirWarn = `                    {aiWarnings.direccion && (!formData.direccion || String(formData.direccion).trim() === "") && (
                      <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{aiWarnings.direccion}</span>
                      </div>
                    )}`;

if (formContent.includes(oldDirWarn)) {
  formContent = formContent.replace(oldDirWarn, newDirWarn);
  console.log('✅ Updated direccion warning rendering in InitiativeForm.tsx');
}

// Replace dynamic field warning render
const oldFieldWarn = `                        {aiWarnings[field.key] && (
                          <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{aiWarnings[field.key]}</span>
                          </div>
                        )}`;

const newFieldWarn = `                        {aiWarnings[field.key] && (!formData[field.key] || String(formData[field.key]).trim() === "" || (Array.isArray(formData[field.key]) && formData[field.key].length === 0)) && (
                          <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{aiWarnings[field.key]}</span>
                          </div>
                        )}`;

if (formContent.includes(oldFieldWarn)) {
  formContent = formContent.replace(oldFieldWarn, newFieldWarn);
  console.log('✅ Updated dynamic field warning rendering in InitiativeForm.tsx');
}

fs.writeFileSync(formPath, formContent, 'utf8');

// 2. Update server.ts to automatically purge warnings for any key with a non-empty value
const serverPath = path.join(process.cwd(), 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

const oldServerPurgeTarget = `      if (!parsed || !parsed.values) {
        console.log("[AI Analyze] Remote AI unavailable/saturated. Executing local smart extraction fallback.");
        parsed = extractLocalUnstructured(text, fields, vps, dirs);
      }`;

const newServerPurgeTarget = `      if (!parsed || !parsed.values) {
        console.log("[AI Analyze] Remote AI unavailable/saturated. Executing local smart extraction fallback.");
        parsed = extractLocalUnstructured(text, fields, vps, dirs);
      }

      // Automatically purge warnings for any field that has a valid value assigned
      if (parsed && parsed.values && parsed.warnings) {
        Object.keys(parsed.values).forEach(k => {
          const val = parsed.values[k];
          if (val !== undefined && val !== null && String(val).trim() !== "" && String(val) !== "null") {
            delete parsed.warnings[k];
          }
        });
      }`;

if (serverContent.includes(oldServerPurgeTarget)) {
  serverContent = serverContent.replace(oldServerPurgeTarget, newServerPurgeTarget);
  fs.writeFileSync(serverPath, serverContent, 'utf8');
  console.log('✅ Updated server.ts to auto-purge warnings for filled fields');
}
