import 'dotenv/config';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function getDateContextSection() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const todayStr = `${d}/${m}/${y}`;

  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const todayReadable = `${now.getDate()} de ${monthNames[now.getMonth()]} de ${y}`;

  const addSafeMonths = (baseDate, months) => {
    const target = new Date(baseDate.getFullYear(), baseDate.getMonth() + months, 1);
    const maxDays = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(baseDate.getDate(), maxDays));
    const td = String(target.getDate()).padStart(2, '0');
    const tm = String(target.getMonth() + 1).padStart(2, '0');
    const ty = target.getFullYear();
    return `${td}/${tm}/${ty}`;
  };

  const endOfMonth = (monthsAhead = 0) => {
    const target = new Date(now.getFullYear(), now.getMonth() + monthsAhead + 1, 0);
    const td = String(target.getDate()).padStart(2, '0');
    const tm = String(target.getMonth() + 1).padStart(2, '0');
    const ty = target.getFullYear();
    return `${td}/${tm}/${ty}`;
  };

  const endOfYear = `31/12/${y}`;

  return `
## Contexto Temporal del Sistema (CRÍTICO PARA CÁLCULO DE FECHAS)
- **Fecha actual del sistema (HOY)**: ${todayStr} (${todayReadable})
- **Año actual**: ${y}
- **Referencias precalculadas de plazos exactos desde hoy (${todayStr})**:
  * En 1 mes: ${addSafeMonths(now, 1)} (o fin de mes: ${endOfMonth(1)})
  * En 2 meses: ${addSafeMonths(now, 2)}
  * En 3 meses: ${addSafeMonths(now, 3)}
  * En 4 meses: ${addSafeMonths(now, 4)}
  * En 6 meses: ${addSafeMonths(now, 6)}
  * Fin de este mes: ${endOfMonth(0)}
  * Fin de año actual: ${endOfYear}
- **REGLAS ESTRICTAS PARA EL CÁLCULO Y SUGERENCIA DE FECHAS**:
  1. Si el usuario o el objetivo menciona un plazo relativo (ej. "en los próximos 3 meses", "en 2 meses", "el próximo mes", "en 60 días", "a fin de año"), DEBES calcular la fecha tentativa sumando exactamente dicho plazo a la **Fecha actual de hoy (${todayStr})**.
  2. NUNCA calcules una fecha en el pasado o en un mes menor al plazo mencionado (ejemplo: si hoy es ${todayStr}, "en 3 meses" es **${addSafeMonths(now, 3)}**, NUNCA sugieras fechas erróneas como un mes antes o pocos días después).
  3. Propón siempre la fecha estimada en formato **DD/MM/AAAA** para que el usuario la valide o confirme.
`.trim();
}

async function main() {
  const { data: training } = await supabase
    .from('ai_training_config')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const DEFAULT_IDENTITY = 'Eres un Analista de Negocio Senior de TI...';
  const identity = training.find(t => t.layer === 'identity')?.content ?? DEFAULT_IDENTITY;
  const dateSection = '\n\n' + getDateContextSection();
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
      text: 'Necesitamos depurar la base de contactos inalcanzables en los próximos 3 meses para mejorar la tasa de conversión en Admisiones.'
    },
    {
      role: 'model',
      text: 'Entiendo perfectamente la necesidad. Te propongo:\n\n**Título:** Implementar depuración de base de contactos inalcanzables\n\n**Objetivo:** Optimizar la base de prospectos de Admisiones en los próximos 3 meses para aumentar la tasa de conversión y reducir tiempos de contacto fallido.\n\n¿Estás de acuerdo con esta propuesta o prefieres que ajustemos algo?'
    }
  ];

  const sanitizedInitialData = {
    institucion: 'UPN',
    vicepresidencia: 'Admisiones',
    titulo: 'Implementar depuración de base de contactos inalcanzables',
    objetivo: 'Optimizar la base de prospectos de Admisiones en los próximos 3 meses para aumentar la tasa de conversión y reducir tiempos de contacto fallido.'
  };

  const message = 'Sí, estoy de acuerdo';

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
  const res = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: 'Eres un asistente de IA experto en análisis de procesos y negocios de TI. Responde estrictamente en formato JSON.' },
      { role: 'user', content: chatPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2
  });
  console.log('Result with Date Context:\n', JSON.stringify(JSON.parse(res.choices[0]?.message?.content), null, 2));
}

main();
