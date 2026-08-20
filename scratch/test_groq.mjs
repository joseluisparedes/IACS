import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();
const Groq = require(path.join(process.cwd(), 'node_modules', 'groq-sdk'));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'groq/compound'];
  for (const m of models) {
    try {
      const res = await groq.chat.completions.create({
        model: m,
        messages: [
          { role: 'system', content: 'Eres Teo, un analista de negocio senior. Responde en JSON.' },
          { role: 'user', content: 'Hola Teo, queremos mejorar el proceso de matricula. Responde JSON con campos text y options.' }
        ],
        response_format: { type: 'json_object' }
      });
      console.log('✅ GROQ SUCCESS for model:', m, '->\n', res.choices[0]?.message?.content);
      break;
    } catch (e) {
      console.log('❌ GROQ FAILED for model:', m, '->', e.message);
    }
  }
}

test();
