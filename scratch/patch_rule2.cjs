const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Find the exact position of rule 2
const startMarker = '2. PROPUESTA DE TÍTULO Y OBJETIVO: Cuando el usuario te brinde la descripción de su necesidad o problema por primera vez (y el título aún esté vacío), NO le pidas que él redacte o invente un título. Analiza su mensaje y FORMULA TÚ MISMO una propuesta concreta de Título (que comience estrictamente con verbo en infinitivo como \'Implementar...\', \'Automatizar...\', \'Integrar...\') y de Objetivo, presentándoselos para su conformidad (ej: \\"¿Estás de acuerdo con esta propuesta o deseas realizar algún ajuste?\\").';

const idx = content.indexOf('2. PROPUESTA DE TÍTULO Y OBJETIVO:');
const endIdx = content.indexOf('\n3. ACEPTACIÓN DE PROPUESTA:');

if (idx === -1 || endIdx === -1) {
  console.error('No se encontró el bloque de Regla 2. idx=', idx, 'endIdx=', endIdx);
  process.exit(1);
}

const before = content.substring(0, idx);
const after = content.substring(endIdx);

const newRule2 = `2. PROPUESTA DE TÍTULO Y OBJETIVO: \${history.length === 0 && message.length > 80
  ? \`⚠️ ACCIÓN INMEDIATA: El mensaje del usuario YA contiene su descripción. PROHIBIDO pedirle que la repita. Tu única tarea ahora: analizar el mensaje y proponer un **Título** (verbo infinitivo: Implementar, Automatizar, Integrar, Optimizar...) y un **Objetivo** concretos. Preséntaselos con negritas markdown y pregunta si está de acuerdo. En "options" solo: ["Sí, estoy de acuerdo", "Quiero ajustarlo"].\`
  : \`Cuando el usuario te brinde la descripción de su necesidad por primera vez (y el título esté vacío), NO le pidas que redacte el título. Formula TÚ MISMO un Título (con verbo en infinitivo) y un Objetivo, y preséntaselos para su conformidad.\`}`;

content = before + newRule2 + after;
fs.writeFileSync('server.ts', content, 'utf8');
console.log('✅ Regla 2 actualizada correctamente en server.ts');

// Verify
const verify = fs.readFileSync('server.ts', 'utf8');
const newIdx = verify.indexOf('history.length === 0 && message.length > 80');
console.log('Verificación:', newIdx > 0 ? '✅ Expresión dinámica encontrada en server.ts' : '❌ No se encontró la expresión dinámica');
