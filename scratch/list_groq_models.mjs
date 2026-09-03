import 'dotenv/config';
import Groq from 'groq-sdk';

async function main() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const list = await groq.models.list();
  console.log('Available Groq models:', list.data.map(m => m.id));
}

main();
