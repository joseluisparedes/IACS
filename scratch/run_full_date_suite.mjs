import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function addSafeMonths(baseDate, months) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  const target = new Date(year, month + months, 1);
  const maxDays = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, maxDays));
  return target;
}

function normalizeDateStr(val) {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }

  const ymd = trimmed.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
  if (ymd) return `${ymd[3].padStart(2, '0')}/${ymd[2].padStart(2, '0')}/${ymd[1]}`;

  const cleanStr = trimmed.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const qMatch = cleanStr.match(/(?:Q([1-4])|([1-4])T)[^\d]*(\d{4})/i);
  if (qMatch) {
    const q = parseInt(qMatch[1] || qMatch[2], 10);
    const year = qMatch[3];
    const quarterEnds = { 1: '31/03/' + year, 2: '30/06/' + year, 3: '30/09/' + year, 4: '31/12/' + year };
    return quarterEnds[q] || trimmed;
  }

  const months = {
    ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06',
    JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12'
  };
  for (const [mName, mNum] of Object.entries(months)) {
    if (cleanStr.includes(mName)) {
      const yMatch = cleanStr.match(/\d{4}/);
      const year = yMatch ? yMatch[0] : new Date().getFullYear().toString();
      const dayMatch = cleanStr.match(new RegExp(`(?:^|[^\\d])(\\d{1,2})\\s*(?:DE\\s+)?${mName}`));
      if (dayMatch) {
        return `${dayMatch[1].padStart(2, '0')}/${mNum}/${year}`;
      }
      const lastDay = new Date(parseInt(year, 10), parseInt(mNum, 10), 0).getDate();
      return String(lastDay).padStart(2, '0') + '/' + mNum + '/' + year;
    }
  }

  const now = new Date();

  if (cleanStr.includes('INMEDIATAMENTE') || cleanStr.includes('HOY') || cleanStr.includes('ASAP') || cleanStr.includes('ANTES POSIBLE') || cleanStr.includes('URGENTE')) {
    return String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
  }

  if (cleanStr.includes('FIN DE ANO') || cleanStr.includes('CIERRE DE ANO')) {
    const yMatch = cleanStr.match(/\d{4}/);
    const year = yMatch ? yMatch[0] : now.getFullYear().toString();
    return '31/12/' + year;
  }

  if (cleanStr.includes('PROXIMO MES') || cleanStr.includes('MES SIGUIENTE')) {
    const targetDate = addSafeMonths(now, 1);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  if (cleanStr.includes('ESTE MES') || cleanStr.includes('FIN DE MES')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  const mMatch = cleanStr.match(/(?:DENTRO DE|EN|PROXIMOS)\s+(?:LOS\s+)?(\d{1,2})\s+MESES?/);
  if (mMatch) {
    const numMonths = parseInt(mMatch[1], 10);
    const targetDate = addSafeMonths(now, numMonths);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  const dMatch = cleanStr.match(/(?:DENTRO DE|EN)\s+(\d{1,3})\s+DIAS?/);
  if (dMatch) {
    const numDays = parseInt(dMatch[1], 10);
    const targetDate = new Date(now.valueOf() + numDays * 86400000);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  const fallback = addSafeMonths(now, 3);
  return String(fallback.getDate()).padStart(2, '0') + '/' + String(fallback.getMonth() + 1).padStart(2, '0') + '/' + fallback.getFullYear();
}

async function runTests() {
  console.log('====================================');
  console.log('🧪 SUITE DE PRUEBAS: CÁLCULO DE FECHAS');
  console.log('====================================\n');

  const now = new Date();
  const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  console.log(`Fecha actual de prueba: ${todayStr}\n`);

  // 1. Pruebas Unitarias de normalizeDateStr
  const testCases = [
    { input: "en los próximos 3 meses", expected: normalizeDateStr("3 meses") },
    { input: "dentro de 2 meses", expected: normalizeDateStr("2 meses") },
    { input: "el proximo mes", expected: normalizeDateStr("proximo mes") },
    { input: "15 de Septiembre 2026", expected: "15/09/2026" },
    { input: "30/09/2026", expected: "30/09/2026" },
    { input: "fin de año", expected: `31/12/${now.getFullYear()}` },
    { input: "urgente / inmediatamente", expected: todayStr },
    { input: "Q3 2026", expected: "30/09/2026" },
    { input: "Q4 2026", expected: "31/12/2026" }
  ];

  console.log('--- 1. Pruebas Unitarias de Normalización ---');
  let passCount = 0;
  for (const tc of testCases) {
    const res = normalizeDateStr(tc.input);
    const ok = res === tc.expected;
    if (ok) passCount++;
    console.log(`${ok ? '✅' : '❌'} [${tc.input}] -> Obtenido: "${res}" | Esperado: "${tc.expected}"`);
  }
  console.log(`Resultado: ${passCount}/${testCases.length} pruebas unitarias superadas.\n`);

  // 2. Prueba de Conversación Asistente Teo
  console.log('--- 2. Prueba Conversacional Asistente Teo (Simulación Screenshot) ---');
  const { data: training } = await supabase
    .from('ai_training_config')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const DEFAULT_IDENTITY = 'Eres un Analista de Negocio Senior de TI...';
  const identity = training.find(t => t.layer === 'identity')?.content ?? DEFAULT_IDENTITY;
  
  // Date context section
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const formatOffset = (mo) => {
    const target = addSafeMonths(now, mo);
    return `${String(target.getDate()).padStart(2, '0')}/${String(target.getMonth() + 1).padStart(2, '0')}/${target.getFullYear()}`;
  };
  const endOfMonth = (ahead = 0) => {
    const target = new Date(now.getFullYear(), now.getMonth() + ahead + 1, 0);
    return `${String(target.getDate()).padStart(2, '0')}/${String(target.getMonth() + 1).padStart(2, '0')}/${target.getFullYear()}`;
  };
  const dateSection = `\n\n## Contexto Temporal del Sistema (CRÍTICO PARA CÁLCULO DE FECHAS)
- **Fecha actual del sistema (HOY)**: ${todayStr}
- **Año actual**: ${y}
- **Referencias precalculadas de plazos exactos desde hoy (${todayStr})**:
  * En 1 mes: ${formatOffset(1)}
  * En 2 meses: ${formatOffset(2)}
  * En 3 meses: ${formatOffset(3)}
  * En 6 meses: ${formatOffset(6)}
  * Fin de este mes: ${endOfMonth(0)}
  * Fin de año actual: 31/12/${y}
- **REGLAS ESTRICTAS PARA EL CÁLCULO Y SUGERENCIA DE FECHAS**:
  1. Si el usuario o el objetivo menciona un plazo relativo (ej. "en los próximos 3 meses", "en 2 meses", "el próximo mes", "en 60 días", "a fin de año"), DEBES calcular la fecha tentativa sumando exactamente dicho plazo a la **Fecha actual de hoy (${todayStr})**.
  2. NUNCA calcules una fecha en el pasado o en un mes menor al plazo mencionado (ejemplo: si hoy es ${todayStr}, "en 3 meses" es **${formatOffset(3)}**, NUNCA sugieras fechas erróneas como un mes antes o pocos días después).
  3. Propón siempre la fecha estimada en formato **DD/MM/AAAA** para que el usuario la valide o confirme.`;

  const contextItems = training.filter(t => t.layer === 'context');
  const contextSection = contextItems.length > 0 ? '\n## Contexto Institucional\n' + contextItems.map(t => '### ' + t.title + '\n' + t.content).join('\n\n') : '';
  const exampleItems = training.filter(t => t.layer === 'examples');
  const examplesSection = exampleItems.length > 0 ? '\n## Ejemplos de Conversación Ideal\n' + exampleItems.map(t => 'Usuario: "' + t.title + '"\nAgente: "' + t.content + '"').join('\n\n') : '';
  const guardrailItems = training.filter(t => t.layer === 'guardrails');
  const guardrailsSection = guardrailItems.length > 0 ? '\n## Restricciones Absolutas (DEBES cumplir siempre)\n' + guardrailItems.map(t => '- ' + t.content).join('\n') : '';

  const systemPrompt = (identity + dateSection + contextSection + examplesSection + guardrailsSection).trim();

  const history = [
    {
      role: 'user',
      text: 'Queremos realizar una depuración de contactos inalcanzables en los próximos 3 meses para la Dirección de Admisiones de UPN.'
    },
    {
      role: 'model',
      text: 'Entiendo perfectamente la necesidad. Te propongo:\n\n**Título:** Implementar depuración de base de contactos inalcanzables\n\n**Objetivo:** Optimizar la base de prospectos de Admisiones en los próximos 3 meses para aumentar la tasa de conversión.\n\n¿Estás de acuerdo con esta propuesta o prefieres que ajustemos algo?'
    }
  ];

  const sanitizedInitialData = {
    institucion: 'UPN',
    vicepresidencia: 'Admisiones',
    titulo: 'Implementar depuración de base de contactos inalcanzables',
    objetivo: 'Optimizar la base de prospectos de Admisiones en los próximos 3 meses para aumentar la tasa de conversión.'
  };

  const message = 'Sí, de acuerdo';

  const chatPrompt = systemPrompt + '\n\nDatos iniciales proporcionados por el usuario:\n' +
    Object.entries(sanitizedInitialData || {}).map(([k, v]) => k + ': ' + v).join('\n') +
    '\n\nHistorial de conversación:\n' +
    history.map(h => (h.role === 'user' ? 'Usuario' : 'Asistente') + ': ' + h.text).join('\n') +
    '\n\nUsuario: ' + message +
    '\n\nREGLAS DINÁMICAS DE LA SESIÓN:\n' +
    '1. PROPUESTA DE TÍTULO Y OBJETIVO: Si el usuario acepta la propuesta de título y objetivo, confirma brevemente y pasa al siguiente campo.\n' +
    '2. ACEPTACIÓN DE PROPUESTA: El usuario YA ACEPTÓ la propuesta de Título ("' + sanitizedInitialData.titulo + '") y Objetivo ("' + sanitizedInitialData.objetivo + '"). Queda ESTRICTAMENTE PROHIBIDO volver a proponer el título y objetivo o preguntar si el usuario está de acuerdo. Avanza INMEDIATAMENTE a consultar el siguiente campo pendiente (por ejemplo: la fecha requerida de implementación).\n' +
    '3. FINALIZACIÓN: Avanza paso a paso.\n\nIMPORTANTE: Responde SIEMPRE en formato JSON estricto: {"text": "...", "options": []}';

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const comp = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: 'Eres un asistente de IA experto en análisis de procesos y negocios de TI. Responde estrictamente en formato JSON.' },
      { role: 'user', content: chatPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2
  });

  const parsed = JSON.parse(comp.choices[0]?.message?.content);
  console.log('Respuesta generada por Teo:');
  console.log('Texto:\n', parsed.text);
  console.log('\nOpciones:\n', parsed.options);

  const targetExpected3Months = formatOffset(3);
  const mentionsCorrectDate = parsed.text.includes(targetExpected3Months) || (parsed.options && parsed.options.some(o => o.includes(targetExpected3Months)));
  console.log(`\nValidación de Fecha Correcta (${targetExpected3Months}): ${mentionsCorrectDate ? '✅ CORRECTO' : '⚠️ REVISAR'}`);
}

runTests();
