import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(filePath, 'utf8');

const startIdx = content.indexOf('function buildSystemPrompt(');
const endIdx = content.indexOf('// ─── Server ───────────────────────────────────────────────────');

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find markers');
  process.exit(1);
}

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

const replacement = `function buildSystemPrompt(training: any[]): string {
  const DEFAULT_IDENTITY = \`Eres un Analista de Negocio Senior de TI. Tu tarea es ayudar a los colaboradores a aterrizar y estructurar sus iniciativas o requerimientos de negocio mediante una conversación fluida y profesional. Tu tono es cercano pero formal. Haz preguntas concretas, de una en una, para recopilar toda la información necesaria. No termines la conversación hasta tener respuestas claras para todos los campos requeridos.\`;

  const identity = training.find(t => t.layer === "identity")?.content ?? DEFAULT_IDENTITY;

  const contextItems = training.filter(t => t.layer === "context");
  const contextSection = contextItems.length > 0
    ? \`\\n## Contexto Institucional\\n\${contextItems.map(t => \`### \${t.title}\\n\${t.content}\`).join("\\n\\n")}\`
    : "";

  const exampleItems = training.filter(t => t.layer === "examples");
  const examplesSection = exampleItems.length > 0
    ? \`\\n## Ejemplos de Conversación Ideal\\n\${exampleItems.map(t => \`Usuario: "\${t.title}"\\nAgente: "\${t.content}"\`).join("\\n\\n")}\`
    : "";

  const guardrailItems = training.filter(t => t.layer === "guardrails");
  const guardrailsSection = guardrailItems.length > 0
    ? \`\\n## Restricciones Absolutas (DEBES cumplir siempre)\\n\${guardrailItems.map(t => \`- \${t.content}\`).join("\\n")}\`
    : "";

  return \`\${identity}\${contextSection}\${examplesSection}\${guardrailsSection}\`.trim();
}

function isApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return !!key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "";
}

function getMockChatResponse(history: any[], initialData: any, message: string): string {
  if (message === "[INICIALIZAR_CHAT]") {
    return \`¡Hola! Soy Teo, Analista de Negocio Senior. Para poder estructurar tu iniciativa, por favor describe la necesidad o el problema que deseas abordar en tus propias palabras.\`;
  }
  const cleanHistory = history.filter(h => h.role === "user" && h.text !== "[INICIALIZAR_CHAT]");
  const hasLast = cleanHistory.some(h => h.text === message);
  const fullHistory = hasLast ? cleanHistory : [...cleanHistory, { role: "user", text: message }];
  const count = fullHistory.length;

  if (count === 1) {
    const inst = initialData?.institucion || "la organización";
    return \`Basándome en la necesidad planteada, te propongo el siguiente Título y Objetivo para tu iniciativa:\\n\\n**Título:** Implementar un proceso escalable de depuración e integración API con e-Contact para la base de contactos de \${inst}\\n\\n**Objetivo:** Optimizar el rendimiento de las campañas comerciales outbound mediante la eliminación automatizada de números inalcanzables, reduciendo costos operativos y mejorando la tasa de contacto efectivo.\\n\\n¿Estás de acuerdo con esta propuesta o deseas realizar algún ajuste?\`;
  }
  if (count === 2) return \`¡Excelente! Título y Objetivo quedan registrados. ¿Para cuándo se requiere tener implementada esta solución en producción?\`;
  if (count === 3) return \`Registrado. ¿Cuál sería el impacto en las operaciones si no se cuenta con la solución en esa fecha?\`;
  if (count === 4) return \`¿Es un proceso completamente nuevo o una mejora a un proceso existente?\`;
  if (count === 5) return \`¿Cuáles son los procesos y áreas directamente impactadas por esta iniciativa?\`;
  if (count === 6) return \`¿A qué pilar estratégico se alinea esta iniciativa?\`;
  if (count === 7) return \`¿Cuál es el beneficio cuantitativo anual estimado?\`;
  return \`Excelente, he recopilado toda la información necesaria. Procederé a generar el resumen ejecutivo. [INFORMACION_COMPLETA]\`;
}

function getMockOptions(history: any[], message: string): string[] {
  if (message === "[INICIALIZAR_CHAT]") return [];
  const cleanHistory = history.filter(h => h.role === "user" && h.text !== "[INICIALIZAR_CHAT]");
  const hasLast = cleanHistory.some(h => h.text === message);
  const fullHistory = hasLast ? cleanHistory : [...cleanHistory, { role: "user", text: message }];
  const count = fullHistory.length;

  if (count === 1) return ["Sí, estoy de acuerdo", "Quiero ajustarlo"];
  if (count === 2) return ["Inmediatamente", "Próximo mes", "Dentro de los próximos 3 meses", "Para fin de año"];
  if (count === 3) return ["Impacto en metas comerciales", "Pérdida de ingresos por admisión", "Aumento de costos operativos"];
  if (count === 4) return ["Sí, es un proceso nuevo", "No, es una mejora a un proceso existente"];
  if (count === 5) return ["Central de Admisión y Telemarketing Outbound", "TI y Operaciones", "Toda la organización"];
  if (count === 6) return ["Excelencia operativa", "Crecimiento escalable", "Experiencia"];
  if (count === 7) return ["Entre S/100,000.00 y S/500,000.00", "Mayor a S/500,000.00", "No cuantificado o S/0"];
  return ["Generar resumen"];
}

function getMockSummaryResponse(initialData: any) {
  const inst = initialData?.institucion || "UPN";
  return {
    titulo: \`Implementar un proceso escalable de depuración e integración API con e-Contact para la base de contactos de \${inst}\`,
    objetivo: \`Optimizar el rendimiento de las campañas comerciales outbound mediante la eliminación automatizada de números inalcanzables, reduciendo costos operativos y mejorando la efectividad.\`,
    descripcion_de_la_necesidad: \`La base de contactos contiene aproximadamente 2 millones de registros, de los cuales entre el 30% y 35% corresponden a números inalcanzables (SIP 480), reduciendo la efectividad outbound e incrementando costos operativos.\`,
    descripcin_del_problema_o_desafo_situacin_actual: \`La base de contactos actual contiene un alto porcentaje de números inalcanzables (SIP 480/404), afectando negativamente el rendimiento del equipo comercial y generando sobrecostos por intentos fallidos.\`,
    fecha_requerida: "31/12/2026",
    qu_pasa_si_no_lo_tenemos_en_esta_fecha: "Impacto directo en metas de admisión y sobrecostos operativos por marcación inútil.",
    es_un_proceso_nuevo: "Sí",
    proceso_y_areas_impactadas: "Central de Admisión, Telemarketing Outbound, TI y Omnicanalidad",
    usuarios_beneficiados: "Administrativos",
    pilar_estratgico: "Excelencia operativa",
    beneficio_cuantitativo_anual: "Entre S/100,000.00 y S/500,000.00",
    beneficio_cualitativo: "Mejora sustancial en la calidad de la información, mayor motivación del equipo comercial y optimización de recursos.",
    es_proyecto_spo: "No",
    qu_escenarios_de_pruebas_debemos_considerar: "Pruebas de integración API en sandbox con e-Contact, marcación de flags en CRM, pruebas de carga y conciliación de reportes."
  };
}

`;

fs.writeFileSync(filePath, before + replacement + after, 'utf8');
console.log('✅ Cleanly replaced mock functions in server.ts');
