import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();
const https = require('https');

const API_URL = process.env.VITE_API_URL || 'https://iacs-3v3f.onrender.com';

function callAPI(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL('/api/chat', API_URL);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

const initialData = { institucion: 'UPN', vicepresidencia: 'Comercial', direccion: 'Central de Admision' };
const aiFields = [];

console.log('🔍 PRUEBA 1: Primer mensaje real con historial vacío (caso de la presentación)...');
const r1 = await callAPI({
  history: [],
  message: 'Tenemos un problema grave: nuestra base de 2 millones de contactos de UPN tiene entre 30-35% de números inválidos (SIP 480/404). Los ejecutivos pierden el 30% de su tiempo marcando números que nunca responden. Necesitamos automatizar la depuración usando e-Contact.',
  initialData,
  aiFields
});
const isGreeting1 = r1.text?.toLowerCase().includes('describe la necesidad') || r1.text?.toLowerCase().includes('cuéntame') && r1.text?.toLowerCase().includes('hola');
console.log('Respuesta Teo:', r1.text?.substring(0, 200));
console.log('Options:', JSON.stringify(r1.options));
const tituloEnOptions = r1.options?.some(o => o.length > 40);
console.log(isGreeting1 ? '❌ FALLO: Teo saludó en lugar de analizar' : '✅ OK: Teo analizó el mensaje');
console.log(tituloEnOptions ? '❌ FALLO: Título/Objetivo están en options como botones largos' : '✅ OK: Options son botones cortos');

console.log('\n🔍 PRUEBA 2: Usuario acepta propuesta de título y objetivo...');
const r2 = await callAPI({
  history: [
    { role: 'user', text: 'Tenemos un problema con la base de contactos de UPN, muchos números inválidos SIP 480.' },
    { role: 'model', text: r1.text, options: r1.options }
  ],
  message: 'Sí, estoy de acuerdo',
  initialData,
  aiFields
});
const stillProposing = r2.text?.toLowerCase().includes('título') && r2.text?.toLowerCase().includes('objetivo') && r2.options?.some(o => o.length > 40);
console.log('Respuesta Teo:', r2.text?.substring(0, 200));
console.log(stillProposing ? '❌ FALLO: Sigue proponiendo en lugar de avanzar' : '✅ OK: Avanzó al siguiente campo');

console.log('\n===== RESUMEN =====');
const allOk = !isGreeting1 && !tituloEnOptions && !stillProposing;
console.log(allOk ? '✅ TODAS LAS PRUEBAS PASARON - Puedes usar la app' : '❌ HAY FALLOS - Revisar antes de usar');
