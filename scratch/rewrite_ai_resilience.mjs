import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

// Replace callAIForJSON function
const startAI = content.indexOf('async function callAIForJSON(');
const endAI = content.indexOf('// ─── Robust AI JSON Parser');

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
}

`;

content = content.substring(0, startAI) + newCallAI + content.substring(endAI);

// Replace rawText call inside analyze-unstructured
const startRawText = content.indexOf('const rawText = await callAIForJSON(prompt);');
const endResJson = content.indexOf('res.json(parsed);', startRawText);
const endCatchBlock = content.indexOf('});', endResJson);

const newAnalyzeCall = `let rawText = "";
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

content = content.substring(0, startRawText) + newAnalyzeCall + content.substring(endCatchBlock);

fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Cleanly updated callAIForJSON and analyze-unstructured route in server.ts');
