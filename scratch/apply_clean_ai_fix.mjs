import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Add extractLocalUnstructured function near top of file (above startServer)
const localExtractHelper = `
function extractLocalUnstructured(text: string, fields: any[], vps: string[], dirs: string[]) {
  const values: Record<string, any> = {};
  const warnings: Record<string, string> = {};

  const words = (text || "").trim().split(/\\s+/);
  const firstVerb = words.find(w => w.match(/^(implementar|automatizar|integrar|optimizar|desarrollar|crear|gestionar|mejorar)/i));
  let titulo = "";
  if (firstVerb) {
    const startIdx = text.toLowerCase().indexOf(firstVerb.toLowerCase());
    titulo = text.substring(startIdx, startIdx + 80).replace(/[\\r\\n.]/g, ' ').trim();
  } else {
    titulo = \`Implementar solución para \${text.substring(0, 60).replace(/[\\r\\n.]/g, ' ').trim()}\`;
  }
  values["titulo"] = titulo;
  values["descripcion_de_la_necesidad"] = text.trim();
  values["descripcin_del_problema_o_desafo_situacin_actual"] = text.trim();

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

const startServerIdx = content.indexOf('async function startServer()');
content = content.substring(0, startServerIdx) + localExtractHelper + content.substring(startServerIdx);

// 2. Replace callAIForJSON with resilient cascade
const oldCallAI = `async function callAIForJSON(prompt: string): Promise<string> {
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

const newCallAI = `async function callAIForJSON(prompt: string): Promise<string> {
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

if (content.includes(oldCallAI)) {
  content = content.replace(oldCallAI, newCallAI);
  console.log('✅ Replaced callAIForJSON in server.ts');
} else {
  console.error('❌ Could not match oldCallAI');
}

// 3. Replace analyze-unstructured endpoint call
const oldAnalyzeBlock = `      const rawText = await callAIForJSON(prompt);

      console.log("[AI Analyze] Raw AI response:", rawText);
      const parsed = parseAIJSON(rawText);
      console.log("[AI Analyze] Parsed response:", JSON.stringify(parsed, null, 2));
      
      await updateAgentTask(tOrqId, 100, 'completed', { action: "Delegando a agentes especializados", input_length: text.length });
      await updateAgentTask(tPoId, 100, 'completed', { action: "Extracción de entidades y mapeo", prompt_preview: prompt.substring(0, 300) + "...", ai_response: parsed });
      await updateAgentTask(tRegId, 100, 'completed', { action: "Análisis de seguridad", model: "gemini-2.0-flash", status: "Seguro" });
      await updateAgentTask(tDocId, 100, 'completed', { action: "Corrección ortográfica y de estilo", warnings: parsed.warnings });

      res.json(parsed);
    } catch (e: any) {
      console.error("Error al analizar texto estructurado:", e.message);
      await updateAgentTask(tOrqId, 100, 'completed', { error: e.message });
      await updateAgentTask(tPoId, 100, 'completed', { error: e.message });
      res.status(500).json({ error: "Error al procesar el texto con la IA: " + e.message });
    }`;

const newAnalyzeBlock = `      let rawText = "";
      try {
        rawText = await callAIForJSON(prompt);
      } catch (e: any) {
        console.warn("[AI Analyze] callAIForJSON error:", e.message);
      }

      console.log("[AI Analyze] Raw AI response:", rawText);
      let parsed: any = null;
      if (rawText && rawText.trim() !== "{}" && rawText.trim() !== "") {
        try { parsed = parseAIJSON(rawText); } catch (e) { console.warn("[AI Analyze] parseAIJSON error:", e); }
      }

      if (!parsed || !parsed.values) {
        console.log("[AI Analyze] Remote AI unavailable/saturated. Executing local smart extraction fallback.");
        parsed = extractLocalUnstructured(text, fields, vps, dirs);
      }

      await updateAgentTask(tOrqId, 100, 'completed', { action: "Delegando a agentes especializados", input_length: text.length });
      await updateAgentTask(tPoId, 100, 'completed', { action: "Extracción de entidades y mapeo", prompt_preview: prompt.substring(0, 300) + "...", ai_response: parsed });
      await updateAgentTask(tRegId, 100, 'completed', { action: "Análisis de seguridad", model: "multi-model-fallback", status: "Seguro" });
      await updateAgentTask(tDocId, 100, 'completed', { action: "Corrección ortográfica y de estilo", warnings: parsed.warnings || {} });

      res.json(parsed);
    } catch (e: any) {
      console.error("Error al analizar texto estructurado, fallback a extracción local:", e.message);
      const fallbackParsed = extractLocalUnstructured(text, [], [], []);
      res.json(fallbackParsed);
    }`;

if (content.includes(oldAnalyzeBlock)) {
  content = content.replace(oldAnalyzeBlock, newAnalyzeBlock);
  console.log('✅ Replaced analyze-unstructured route block in server.ts');
} else {
  console.error('❌ Could not match oldAnalyzeBlock');
}

fs.writeFileSync(serverPath, content, 'utf8');
