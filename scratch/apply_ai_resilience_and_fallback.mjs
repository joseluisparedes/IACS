import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Replace callAIForJSON with robust multi-model fallback cascade + system prompt for Groq
const oldCallAIForJSON = `async function callAIForJSON(prompt: string): Promise<string> {
  // 1. Try Gemini first
  try {
    const response = await getGenAI().models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    return response.text;
  } catch (geminiErr: any) {
    console.warn("[AI Call] Gemini attempt failed:", geminiErr?.message?.substring(0, 150) || geminiErr);
  }

  // 2. Fallback to Groq multi-model cascade
  const groq = getGroq();
  if (!groq) {
    throw new Error("No se pudo establecer conexión con los proveedores de IA. Por favor verifica las API Keys en el panel de control.");
  }

  const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  for (const model of groqModels) {
    try {
      console.log(\`[AI Fallback] Trying Groq model: \${model}...\`);
      const completion = await groq.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      return completion.choices[0]?.message?.content ?? "{}";
    } catch (groqErr: any) {
      console.warn(\`[AI Fallback] Groq model \${model} failed:\`, groqErr?.message?.substring(0, 150) || groqErr);
    }
  }

  throw new Error("Los servicios de IA se encuentran temporalmente saturados. Por favor reintenta en unos instantes.");
}`;

const newCallAIForJSON = `async function callAIForJSON(prompt: string): Promise<string> {
  // 1. Try Gemini models cascade
  const geminiModels = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
  for (const model of geminiModels) {
    try {
      console.log(\`[AI Call] Trying Gemini model: \${model}...\`);
      const response = await getGenAI().models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      if (response && response.text) return response.text;
    } catch (geminiErr: any) {
      console.warn(\`[AI Call] Gemini model \${model} failed:\`, geminiErr?.message?.substring(0, 150) || geminiErr);
    }
  }

  // 2. Fallback to Groq multi-model cascade
  const groq = getGroq();
  if (groq) {
    const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    const jsonPrompt = prompt.includes("JSON") ? prompt : \`\${prompt}\\nResponde estrictamente en formato JSON.\`;
    for (const model of groqModels) {
      try {
        console.log(\`[AI Fallback] Trying Groq model: \${model}...\`);
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: "Eres un asistente de IA experto en análisis de procesos y negocios de TI. Responde estrictamente en formato JSON." },
            { role: "user", content: jsonPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });
        const content = completion.choices[0]?.message?.content;
        if (content && content.trim()) return content;
      } catch (groqErr: any) {
        console.warn(\`[AI Fallback] Groq model \${model} failed:\`, groqErr?.message?.substring(0, 150) || groqErr);
      }
    }
  }

  console.warn("[AI Call] All remote AI services failed or were rate limited. Returning empty JSON for local fallback.");
  return "{}";
}`;

if (serverContent.includes(oldCallAIForJSON)) {
  serverContent = serverContent.replace(oldCallAIForJSON, newCallAIForJSON);
  console.log('✅ Updated callAIForJSON with Groq system prompt and resilient fallback cascade in server.ts');
}

// Add extractLocalUnstructured function & update analyze-unstructured endpoint to catch errors silently
const oldAnalyzeCall = `      const rawText = await callAIForJSON(prompt);

      console.log("[AI Analyze] Raw AI response:", rawText);
      const parsed = parseAIJSON(rawText);`;

const newAnalyzeCall = `      let rawText = "";
      try {
        rawText = await callAIForJSON(prompt);
      } catch (e: any) {
        console.warn("[AI Analyze] callAIForJSON threw error:", e.message);
      }

      console.log("[AI Analyze] Raw AI response:", rawText);
      let parsed: any = null;
      if (rawText && rawText.trim() !== "{}" && rawText.trim() !== "") {
        try { parsed = parseAIJSON(rawText); } catch (e) { console.warn("[AI Analyze] parseAIJSON failed:", e); }
      }

      if (!parsed || !parsed.values) {
        console.log("[AI Analyze] Falling back to smart local extraction");
        parsed = extractLocalUnstructured(text, fields, vps, dirs);
      }`;

if (serverContent.includes(oldAnalyzeCall)) {
  serverContent = serverContent.replace(oldAnalyzeCall, newAnalyzeCall);
  console.log('✅ Updated analyze-unstructured endpoint in server.ts with local extraction fallback');
}

// Add extractLocalUnstructured helper at top of server.ts if not present
if (!serverContent.includes('function extractLocalUnstructured(')) {
  const localExtractHelper = `
function extractLocalUnstructured(text: string, fields: any[], vps: string[], dirs: string[]) {
  const values: Record<string, any> = {};
  const warnings: Record<string, string> = {};

  // Infer Title
  const words = text.trim().split(/\\s+/);
  const firstVerb = words.find(w => w.match(/^(implementar|automatizar|integrar|optimizar|desarrollar|crear|gestionar|mejorar)/i));
  let titulo = "";
  if (firstVerb) {
    const startIdx = text.toLowerCase().indexOf(firstVerb.toLowerCase());
    titulo = text.substring(startIdx, startIdx + 80).replace(/[\\r\\n.]/g, ' ').trim();
  } else {
    titulo = \`Implementar solución para \${text.substring(0, 60).replace(/[\\r\\n.]/g, ' ').trim()}\`;
  }
  values["titulo"] = titulo;

  // Infer Description
  values["descripcion_de_la_necesidad"] = text.trim();
  values["descripcin_del_problema_o_desafo_situacin_actual"] = text.trim();

  // Match VP and Direction
  const lowerText = text.toLowerCase();
  const matchedVp = vps.find(v => lowerText.includes(v.toLowerCase()));
  if (matchedVp) values["vicepresidencia"] = matchedVp;

  const matchedDir = dirs.find(d => lowerText.includes(d.toLowerCase()));
  if (matchedDir) values["direccion"] = matchedDir;

  fields.forEach(f => {
    if (!values[f.key] && f.is_required) {
      warnings[f.key] = \`Por favor completa la información para el campo \${f.label}.\`;
    }
  });

  return { values, warnings };
}
`;
  serverContent = localExtractHelper + serverContent;
  console.log('✅ Added extractLocalUnstructured helper in server.ts');
}

fs.writeFileSync(serverPath, serverContent, 'utf8');
