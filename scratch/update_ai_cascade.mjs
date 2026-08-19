import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

const startIdx = serverContent.indexOf('async function callAIForJSON(');
const endIdx = serverContent.indexOf('// ─── Robust AI JSON Parser');

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found');
  process.exit(1);
}

const before = serverContent.substring(0, startIdx);
const after = serverContent.substring(endIdx);

const replacement = `async function callAIForJSON(prompt: string): Promise<string> {
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

fs.writeFileSync(serverPath, before + replacement + after, 'utf8');
console.log('✅ Updated callAIForJSON in server.ts cleanly!');
