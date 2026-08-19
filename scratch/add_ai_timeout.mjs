import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

const oldCallAI = `async function callAIForJSON(prompt: string): Promise<string> {
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

const newCallAI = `function withTimeout<T>(promise: Promise<T>, ms: number = 7000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(\`AI Call Timeout (\${ms}ms)\`)), ms);
    promise
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

async function callAIForJSON(prompt: string): Promise<string> {
  // 1. Try Gemini models cascade with fast 7s timeout
  const geminiModels = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
  for (const model of geminiModels) {
    try {
      console.log(\`[AI Call] Trying Gemini model: \${model}...\`);
      const response = await withTimeout(
        getGenAI().models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseMimeType: "application/json" }
        }),
        7000
      );
      if (response && response.text) return response.text;
    } catch (geminiErr: any) {
      console.warn(\`[AI Call] Gemini model \${model} failed/timed out:\`, geminiErr?.message?.substring(0, 150) || geminiErr);
    }
  }

  // 2. Fallback to Groq multi-model cascade with fast 7s timeout
  const groq = getGroq();
  if (groq) {
    const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    const jsonPrompt = prompt.includes("JSON") ? prompt : \`\${prompt}\\nResponde strictly en formato JSON.\`;
    for (const model of groqModels) {
      try {
        console.log(\`[AI Fallback] Trying Groq model: \${model}...\`);
        const completion = await withTimeout(
          groq.chat.completions.create({
            model,
            messages: [
              { role: "system", content: "Eres un asistente de IA experto en análisis de procesos y negocios de TI. Responde estrictamente en formato JSON." },
              { role: "user", content: jsonPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
          7000
        );
        const content = completion.choices[0]?.message?.content;
        if (content && content.trim()) return content;
      } catch (groqErr: any) {
        console.warn(\`[AI Fallback] Groq model \${model} failed/timed out:\`, groqErr?.message?.substring(0, 150) || groqErr);
      }
    }
  }

  console.warn("[AI Call] All remote AI services failed or were rate limited. Returning empty JSON for local fallback.");
  return "{}";
}`;

if (content.includes(oldCallAI)) {
  content = content.replace(oldCallAI, newCallAI);
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('✅ Updated callAIForJSON with fast 7s timeout in server.ts');
} else {
  console.error('❌ Could not find oldCallAI in server.ts');
}
