import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

const startCallAI = content.indexOf('function withTimeout<T>(');
const endCallAI = content.indexOf('// ─── Robust AI JSON Parser', startCallAI);

if (startCallAI === -1 || endCallAI === -1) {
  console.error("Could not find callAIForJSON boundaries");
  process.exit(1);
}

const newCallAISystem = `let _geminiCooldownUntil = 0;
let _groqCooldownUntil = 0;

function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(\`AI Call Timeout (\${ms}ms)\`)), ms);
    promise
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

async function callAIForJSON(prompt: string): Promise<string> {
  const now = Date.now();

  // 1. Try Gemini models cascade (if not in 60s rate-limit cooldown)
  if (now > _geminiCooldownUntil) {
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
          3000
        );
        if (response && response.text) return response.text;
      } catch (geminiErr: any) {
        const msg = geminiErr?.message || String(geminiErr);
        console.warn(\`[AI Call] Gemini model \${model} failed:\`, msg.substring(0, 120));
        if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
          _geminiCooldownUntil = Date.now() + 60000; // 60 seconds cooldown
          console.warn("[AI Cooldown] Gemini rate-limited. Setting 60s cooldown.");
          break;
        }
      }
    }
  } else {
    console.log("[AI Call] Skipping Gemini (Rate-limit 60s cooldown active).");
  }

  // 2. Try Groq multi-model cascade (if not in 60s rate-limit cooldown)
  if (now > _groqCooldownUntil) {
    const groq = getGroq();
    if (groq) {
      const groqModels = ["llama-3.3-70b-versatile"];
      const jsonPrompt = prompt.includes("JSON") ? prompt : \`\${prompt}\\nResponde estrictamente en formato JSON.\`;
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
            3000
          );
          const content = completion.choices[0]?.message?.content;
          if (content && content.trim()) return content;
        } catch (groqErr: any) {
          const msg = groqErr?.message || String(groqErr);
          console.warn(\`[AI Fallback] Groq model \${model} failed:\`, msg.substring(0, 120));
          if (msg.includes("429") || msg.includes("Rate limit")) {
            _groqCooldownUntil = Date.now() + 60000; // 60 seconds cooldown
            console.warn("[AI Cooldown] Groq rate-limited. Setting 60s cooldown.");
            break;
          }
        }
      }
    }
  } else {
    console.log("[AI Call] Skipping Groq (Rate-limit 60s cooldown active).");
  }

  console.warn("[AI Call] All remote AI services rate limited or timed out. Returning empty JSON for instant local fallback.");
  return "{}";
}

`;

content = content.substring(0, startCallAI) + newCallAISystem + content.substring(endCallAI);
fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Applied instant rate-limit cooldown system to callAIForJSON in server.ts');
