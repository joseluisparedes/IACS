import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function main() {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const testModels = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  for (const m of testModels) {
    try {
      const res = await genAI.models.generateContent({
        model: m,
        contents: [{ role: 'user', parts: [{ text: 'Hola, di OK' }] }]
      });
      console.log('Model', m, 'SUCCESS:', res.text);
    } catch (e) {
      console.log('Model', m, 'FAILED:', e.message);
    }
  }
}

main();
