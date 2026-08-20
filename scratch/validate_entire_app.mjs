import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();
const { createClient } = require(path.join(process.cwd(), 'node_modules', '@supabase/supabase-js'));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const LOCAL_API = 'http://127.0.0.1:3000';
const RENDER_API = 'https://iacs-3v3f.onrender.com';

async function validateEntireApp() {
  console.log('🔍 =========================================================');
  console.log('🔍 INICIANDO VALIDACIÓN INTEGRAL DE TODO EL SISTEMA IACS');
  console.log('🔍 =========================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, ok, details = '') {
    if (ok) {
      console.log(`✅ [PASS] ${name} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? `-> ${details}` : ''}`);
      failed++;
    }
  }

  // 1. SUPABASE DATABASE TESTS
  console.log('--- 1. Base de Datos Supabase ---');
  try {
    const { data: fields, error: fErr } = await supabase.from('initiative_fields').select('*').order('sort_order');
    report('Tabla initiative_fields', !fErr && fields && fields.length > 0, `${fields?.length} campos cargados`);

    const { data: inits, error: iErr } = await supabase.from('initiatives').select('*');
    report('Tabla initiatives', !iErr && inits !== null, `${inits?.length} iniciativas registradas`);

    const { data: vps, error: vpErr } = await supabase.from('vps').select('*');
    report('Tabla vps (Vicepresidencias)', !vpErr && vps && vps.length > 0, `${vps?.length} VPs`);

    const { data: dirs, error: dErr } = await supabase.from('direcciones').select('*');
    report('Tabla direcciones', !dErr && dirs && dirs.length > 0, `${dirs?.length} Direcciones`);

    const { data: training, error: trErr } = await supabase.from('ai_training_config').select('*');
    const guardrails = training?.filter(t => t.layer === 'guardrails') || [];
    const identity = training?.find(t => t.layer === 'identity');
    report('Tabla ai_training_config (Guardarraíles)', !trErr && guardrails.length === 5, `${guardrails.length} guardarraíles consolidados`);
    report('Identidad Teo configurada', !!identity, identity?.title || 'OK');

    const { data: settings, error: sErr } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    report('Tabla site_settings', !sErr && !!settings, `Mantenimiento: ${settings?.maintenance_mode}`);
  } catch (e) {
    report('Supabase Connection Error', false, e.message);
  }

  // 2. BACKEND API ENDPOINTS & CORS TESTS
  console.log('\n--- 2. Endpoints Backend y Verificación CORS ---');
  const testOrigins = ['https://joseluisparedes.github.io', 'http://localhost:5173'];

  for (const origin of testOrigins) {
    try {
      const res = await fetch(`${LOCAL_API}/api/fields`, {
        method: 'GET',
        headers: { Origin: origin }
      });
      const corsHeader = res.headers.get('access-control-allow-origin');
      const isCorsOk = corsHeader === origin || corsHeader === '*';
      report(`CORS para origen ${origin} en /api/fields`, isCorsOk && res.ok, `Status: ${res.status}, Allow-Origin: ${corsHeader}`);
    } catch (e) {
      report(`CORS check para ${origin}`, false, e.message);
    }
  }

  // 3. API FUNCTIONAL TESTS
  console.log('\n--- 3. Pruebas Funcionales de Endpoints ---');
  const endpoints = [
    { url: '/api/health', method: 'GET' },
    { url: '/api/fields', method: 'GET' },
    { url: '/api/initiatives', method: 'GET' },
    { url: '/api/config/features', method: 'GET' },
    { url: '/api/ai-training', method: 'GET' },
    { url: '/api/ai-feedback', method: 'GET' },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${LOCAL_API}${ep.url}`, { method: ep.method });
      report(`Endpoint ${ep.method} ${ep.url}`, res.ok, `Status ${res.status}`);
    } catch (e) {
      report(`Endpoint ${ep.method} ${ep.url}`, false, e.message);
    }
  }

  // 4. AI CHAT & CONSULTATIVE QUESTIONING TEST
  console.log('\n--- 4. Inteligencia Artificial (Chat Consultivo y Opciones) ---');
  try {
    const chatRes = await fetch(`${LOCAL_API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "En admisiones demoramos 2 días validando pagos manuales y los alumnos se quejan.",
        history: [],
        initialData: { institucion: "UPN", vicepresidencia: "Operaciones" },
        aiFields: []
      })
    });
    const chatData = await chatRes.json();
    const hasTitle = chatData.text?.includes('**Título:**') || chatData.text?.includes('Título');
    const hasOptions = Array.isArray(chatData.options) && chatData.options.length > 0;
    report('AI Chat Turno 1 (Propuesta Título/Objetivo)', chatRes.ok && hasTitle, `Título generado: ${hasTitle}`);
    report('AI Chat Opciones Interactivas', hasOptions, `${chatData.options?.length} opciones generadas: [${chatData.options?.join(', ')}]`);
  } catch (e) {
    report('AI Chat Test', false, e.message);
  }

  // 5. UNSTRUCTURED TEXT ANALYZER TEST
  console.log('\n--- 5. Analizador de Texto No Estructurado ---');
  try {
    const anaRes = await fetch(`${LOCAL_API}/api/fields/analyze-unstructured`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: "Queremos implementar una pasarela automatizada de pagos para UPN en el área de Admisión para noviembre 2026. Beneficio estimado de 50000 soles."
      })
    });
    const anaData = await anaRes.json();
    const hasValues = anaData && anaData.values && Object.keys(anaData.values).length > 0;
    report('Analizador No Estructurado (/api/fields/analyze-unstructured)', anaRes.ok && hasValues, `${Object.keys(anaData.values || {}).length} campos extraídos`);
  } catch (e) {
    report('Analizador No Estructurado', false, e.message);
  }

  console.log('\n=========================================================');
  console.log(`🏁 RESULTADO FINAL: ${passed} pruebas exitosas, ${failed} fallidas.`);
  console.log('=========================================================\n');
}

validateEntireApp();
