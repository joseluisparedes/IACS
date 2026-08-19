import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'server.ts');
let content = readFileSync(filePath, 'utf8');

const oldRule2 = `2. PROPUESTA DE TÍTULO Y OBJETIVO: Cuando el usuario te brinde la descripción de su necesidad o problema por primera vez (y el título aún esté vacío), NO le pidas que él redacte o invente un título. Analiza su mensaje y FORMULA TÚ MISMO una propuesta concreta de Título (que comience estrictamente con verbo en infinitivo como 'Implementar...', 'Automatizar...', 'Integrar...') y de Objetivo, presentándoselos para su conformidad (ej: \\"¿Estás de acuerdo con esta propuesta o deseas realizar algún ajuste?\\").`;

const newRule2 = `2. PROPUESTA DE TÍTULO Y OBJETIVO: \${history.length === 0 && message.length > 80
  ? \`⚠️ ACCIÓN INMEDIATA OBLIGATORIA: El mensaje del usuario YA contiene la descripción de su problema o necesidad. ESTÁ ABSOLUTAMENTE PROHIBIDO pedirle que lo describa de nuevo o que amplíe la información. Tu ÚNICA tarea en este turno es: analizar el mensaje actual y formular una propuesta de Título (comenzando con verbo en infinitivo: Implementar, Automatizar, Integrar, Optimizar, Desarrollar...) y un Objetivo concreto. Preséntalos en el campo "text" con negritas markdown (**Título:** ... \\\\n\\\\n**Objetivo:** ...) y pregunta si está de acuerdo. En "options" pon solo: ["Sí, estoy de acuerdo", "Quiero ajustarlo"].\`
  : \`Cuando el usuario te brinde la descripción de su necesidad o problema por primera vez (y el título aún esté vacío), NO le pidas que él redacte o invente un título. Analiza su mensaje y FORMULA TÚ MISMO una propuesta concreta de Título (que comience estrictamente con verbo en infinitivo como 'Implementar...', 'Automatizar...', 'Integrar...') y de Objetivo, presentándoselos para su conformidad (ej: "¿Estás de acuerdo con esta propuesta o deseas realizar algún ajuste?").\`}`;

if (content.includes(oldRule2)) {
  content = content.replace(oldRule2, newRule2);
  writeFileSync(filePath, content, 'utf8');
  console.log('✅ server.ts actualizado correctamente - Regla 2 con condición dinámica');
} else {
  console.error('❌ No se encontró el texto exacto de la Regla 2. Buscando aproximación...');
  const idx = content.indexOf('2. PROPUESTA DE TÍTULO Y OBJETIVO:');
  if (idx >= 0) {
    console.log('Encontrado en posición:', idx);
    console.log('Contexto:', content.substring(idx, idx + 200));
  }
}
