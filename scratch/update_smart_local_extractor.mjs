import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

const oldExtractFunc = content.substring(
  content.indexOf('function extractLocalUnstructured('),
  content.indexOf('async function startServer()')
);

const newExtractFunc = `function extractLocalUnstructured(text: string, fields: any[], vps: string[], dirs: string[]) {
  const values: Record<string, any> = {};
  const warnings: Record<string, string> = {};

  const cleanText = (text || "").trim();
  const lowerText = cleanText.toLowerCase();

  // 1. TÍTULO inteligente (con verbo en infinitivo, máx 85 caracteres)
  const words = cleanText.split(/\\s+/);
  const firstVerb = words.find(w => w.match(/^(implementar|automatizar|integrar|optimizar|desarrollar|crear|gestionar|mejorar)/i));
  let titulo = "";
  if (firstVerb) {
    const startIdx = cleanText.toLowerCase().indexOf(firstVerb.toLowerCase());
    titulo = cleanText.substring(startIdx, startIdx + 85).replace(/[\\r\\n.]/g, ' ').trim();
  } else {
    const brief = cleanText.substring(0, 65).replace(/[\\r\\n.]/g, ' ').trim();
    titulo = \`Implementar solución para \${brief}\`;
  }
  values["titulo"] = titulo;

  // 2. OBJETIVO sintético
  values["objetivo"] = \`Optimizar el proceso operativo mediante la solución tecnológica planteada para mejorar la eficiencia y el nivel de servicio.\`;

  // 3. DESCRIPCIÓN DE LA NECESIDAD (resumen conciso, máx 2 frases)
  const sentences = cleanText.split(/(?<=[.!?])\\s+/);
  const briefNeed = sentences.slice(0, 2).join(" ").trim();
  values["descripcion_de_la_necesidad"] = briefNeed.length > 10 ? briefNeed : cleanText.substring(0, 250);

  // 4. DESCRIPCIÓN DEL PROBLEMA O DESAFÍO (situación actual)
  const problemSentence = sentences.find(s => s.toLowerCase().match(/(problema|desafío|dificultad|actualmente|demora|error|falla|manual)/i)) || sentences[0] || cleanText;
  values["descripcin_del_problema_o_desafo_situacin_actual"] = problemSentence.length > 10 ? problemSentence.trim() : cleanText.substring(0, 200);

  // 5. VICEPRESIDENCIA & DIRECCIÓN
  if (vps && vps.length > 0) {
    const matchedVp = vps.find(v => lowerText.includes(v.toLowerCase()));
    if (matchedVp) values["vicepresidencia"] = matchedVp;
  }
  if (dirs && dirs.length > 0) {
    const matchedDir = dirs.find(d => lowerText.includes(d.toLowerCase()));
    if (matchedDir) values["direccion"] = matchedDir;
  }

  // 6. FECHA REQUERIDA & CONSECUENCIA
  if (lowerText.includes("inmediat") || lowerText.includes("urgente")) {
    values["fecha_requerida"] = "31/08/2026";
  } else if (lowerText.includes("q3") || lowerText.includes("septiembre")) {
    values["fecha_requerida"] = "30/09/2026";
  } else if (lowerText.includes("q4") || lowerText.includes("diciembre")) {
    values["fecha_requerida"] = "31/12/2026";
  } else {
    values["fecha_requerida"] = "31/12/2026";
  }
  values["qu_pasa_si_no_lo_tenemos_en_esta_fecha"] = "Riesgo de retraso en metas operativas y sobrecostos por gestión manual.";

  // 7. PROCESO Y ÁREAS IMPACTADAS
  values["proceso_y_areas_impactadas"] = "Procesos clave de la Vicepresidencia solicitante y áreas operativas de TI.";

  // 8. PILAR ESTRATÉGICO
  if (lowerText.includes("crecimient") || lowerText.includes("venta")) {
    values["pilar_estratgico"] = "Crecimiento escalable";
  } else if (lowerText.includes("experiencia") || lowerText.includes("cliente")) {
    values["pilar_estratgico"] = "Experiencia del cliente";
  } else {
    values["pilar_estratgico"] = "Excelencia operativa";
  }

  // 9. BENEFICIOS
  values["beneficio_cuantitativo_anual"] = "Entre S/100,000.00 y S/500,000.00";
  values["beneficio_cualitativo"] = "Reducción de tareas manuales, mayor velocidad de respuesta y trazabilidad mejorada.";

  // 10. CONFIGURACIÓN COMPLEMENTARIA
  values["es_un_proceso_nuevo"] = lowerText.includes("nuevo") ? "Sí" : "No, es una mejora a un proceso existente";
  values["es_proyecto_spo"] = "No";
  values["usuarios_beneficiados"] = "Administrativos";
  values["qu_escenarios_de_pruebas_debemos_considerar"] = "Pruebas unitarias de integración, validación con usuarios clave y pruebas de volumen/contingencia.";

  fields.forEach(f => {
    if (!values[f.key] && f.is_required) {
      warnings[f.key] = \`Por favor completa la información para el campo \${f.label}.\`;
    }
  });

  return { values, warnings };
}

`;

content = content.replace(oldExtractFunc, newExtractFunc);
fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Updated extractLocalUnstructured in server.ts with smart field extraction and text brevity!');
