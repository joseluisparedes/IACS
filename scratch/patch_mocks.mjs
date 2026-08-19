import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'server.ts');
let content = readFileSync(filePath, 'utf8');

// Replace getMockChatResponse
const oldMockChat = `function getMockChatResponse(history: any[], initialData: any, message: string): string {
  if (message === "[INICIALIZAR_CHAT]" || history.length === 0) {
    return \`¡Hola! Para poder estructurar tu iniciativa, por favor, describe la necesidad o el problema que deseas abordar en tus propias palabras. Así podré entender mejor el contexto y ayudarte a definir los siguientes pasos.\`;
  }
  const cleanHistory = history.filter(h => h.role === "user" && h.text !== "[INICIALIZAR_CHAT]");
  const hasLast = cleanHistory.some(h => h.text === message);
  const fullHistory = hasLast ? cleanHistory : [...cleanHistory, { role: "user", text: message }];
  const count = fullHistory.length;

  if (count === 1) return \`Entendido. ¿Cuál es el objetivo principal o resultado esperado?\`;
  if (count === 2) return \`¿Qué usuarios o áreas estarán involucrados en el uso diario?\`;
  if (count === 3) return \`¿Qué sistemas o aplicaciones actuales se verían impactados?\`;
  if (count === 4) return \`¿Identificas algún riesgo, dependencia técnica o limitación clave?\`;
  if (count === 5) return \`¿Tienen alguna fecha objetivo o plazo estimado para el lanzamiento?\`;
  return \`Excelente, he recopilado toda la información. Procederé a generar el resumen ejecutivo. [INFORMACION_COMPLETA]\`;
}`;

const newMockChat = `function getMockChatResponse(history: any[], initialData: any, message: string): string {
  if (message === "[INICIALIZAR_CHAT]") {
    return \`¡Hola! Soy Teo, Analista de Negocio Senior. Para poder estructurar tu iniciativa, por favor describe la necesidad o el problema que deseas abordar en tus propias palabras.\`;
  }
  const cleanHistory = history.filter(h => h.role === "user" && h.text !== "[INICIALIZAR_CHAT]");
  const hasLast = cleanHistory.some(h => h.text === message);
  const fullHistory = hasLast ? cleanHistory : [...cleanHistory, { role: "user", text: message }];
  const count = fullHistory.length;

  if (count === 1) {
    return \`Basándome en lo que me cuentas, te propongo la siguiente estructura para tu iniciativa:\\n\\n**Título:** Implementar un proceso escalable de depuración e integración API con e-Contact para la base de contactos de UPN\\n\\n**Objetivo:** Optimizar el rendimiento de las campañas comerciales outbound mediante la eliminación automatizada de números inalcanzables, reduciendo costos operativos y mejorando la efectividad.\\n\\n¿Estás de acuerdo con esta propuesta o deseas realizar algún ajuste?\`;
  }
  if (count === 2) return \`¡Excelente! Título y Objetivo quedan registrados. ¿Para cuándo se requiere tener implementada esta solución en producción?\`;
  if (count === 3) return \`Registrado. ¿Cuál sería el impacto en las operaciones si no se cuenta con la solución en esa fecha?\`;
  if (count === 4) return \`¿Es un proceso completamente nuevo o una mejora a un proceso existente?\`;
  if (count === 5) return \`¿Cuáles son los procesos y áreas directamente impactadas?\`;
  if (count === 6) return \`¿A qué pilar estratégico se alinea esta iniciativa?\`;
  if (count === 7) return \`¿Cuál es el beneficio cuantitativo anual estimado?\`;
  return \`Excelente, he recopilado toda la información necesaria. Procederé a generar el resumen ejecutivo. [INFORMACION_COMPLETA]\`;
}`;

// Replace getMockOptions
const oldMockOptions = `function getMockOptions(history: any[], message: string): string[] {
  if (message === "[INICIALIZAR_CHAT]" || history.length === 0) return [];
  const cleanHistory = history.filter(h => h.role === "user" && h.text !== "[INICIALIZAR_CHAT]");
  const hasLast = cleanHistory.some(h => h.text === message);
  const fullHistory = hasLast ? cleanHistory : [...cleanHistory, { role: "user", text: message }];
  const count = fullHistory.length;

  if (count === 1) return ["Ahorrar tiempo operativo", "Tener trazabilidad y reportes", "Reducir errores de digitación"];
  if (count === 2) return ["El equipo comercial y TI", "Operaciones y Back Office", "Toda la organización"];
  if (count === 3) return ["No impacta otros sistemas", "Se conecta con el CRM/ERP", "Usa integraciones por API"];
  if (count === 4) return ["No identifico riesgos críticos", "Dependencia del área de TI", "Requiere capacitación de usuarios"];
  if (count === 5) return ["Lo antes posible", "Próximo mes", "Para fin de año"];
  return ["Generar resumen"];
}`;

const newMockOptions = `function getMockOptions(history: any[], message: string): string[] {
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
}`;

// Replace getMockSummaryResponse
const oldMockSummary = `function getMockSummaryResponse(initialData: any) {
  const area = Object.values(initialData)[0] || "la organización";
  return {
    titulo: \`Implementación de barrido de contactos inalcanzables en \${area}\`,
    objetivo: \`Depurar la base de contactos mediante e-Contact y API para reducir números inalcanzables e incrementar efectividad outbound.\`,
    descripcion_de_la_necesidad: \`La base de contactos contiene un 30%-35% de números inalcanzables (SIP 480), reduciendo la efectividad outbound e incrementando costos operativos.\`,
    descripcion_del_problema_o_desafio_situacion_actual: \`Actualmente entre el 30% y 35% de la base de contactos de 2 millones de registros corresponden a números inalcanzables (SIP 480).\`,
    fecha_requerida: "31/12/2026",
    que_pasa_si_no_lo_tenemos_en_esta_fecha: "No podremos tener claridad del tipo de leads contactados y se mantendrán altos costos por intentos fallidos.",
    es_un_proceso_nuevo: "No",
    proceso_y_areas_impactadas: \`\${area}, Operaciones, TI, Call Center, Control de Gestión\`,
    usuarios_beneficiados: ["Operaciones", "TI"],
    pilar_estrategico: "Excelencia operativa",
    beneficio_cuantitativo_anual: "Entre S/100,000.00 y S/500,000.00",
    beneficio_cualitativo: "Mayor visibilidad y trazabilidad de los procesos. Decisiones más oportunas basadas en datos confiables.",
    es_proyecto_spo: "No",
    que_escenarios_de_pruebas_debemos_considerar: "Pruebas de integración API con e-Contact, validación de SIP 480 y barrido de base de 2M registros."
  };
}`;

const newMockSummary = `function getMockSummaryResponse(initialData: any) {
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
}`;

if (content.includes(oldMockChat)) {
  content = content.replace(oldMockChat, newMockChat);
  console.log('✅ Updated getMockChatResponse');
} else {
  console.log('⚠️ Could not find exact oldMockChat, attempting partial replace');
}

if (content.includes(oldMockOptions)) {
  content = content.replace(oldMockOptions, newMockOptions);
  console.log('✅ Updated getMockOptions');
}

if (content.includes(oldMockSummary)) {
  content = content.replace(oldMockSummary, newMockSummary);
  console.log('✅ Updated getMockSummaryResponse');
}

writeFileSync(filePath, content, 'utf8');
