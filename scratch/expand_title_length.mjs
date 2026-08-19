import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

const oldTitleExtract = `  // 1. TÍTULO inteligente (con verbo en infinitivo, máx 85 caracteres)
  const words = cleanText.split(/\\s+/);
  const firstVerb = words.find(w => w.match(/^(implementar|automatizar|integrar|optimizar|desarrollar|crear|gestionar|mejorar)/i));
  let titulo = "";
  if (firstVerb) {
    const startIdx = cleanText.toLowerCase().indexOf(firstVerb.toLowerCase());
    titulo = cleanText.substring(startIdx, startIdx + 85).replace(/[\\r\\n.]/g, ' ').trim();
  } else {
    const brief = cleanText.substring(0, 65).replace(/[\\r\\n.]/g, ' ').trim();
    titulo = \`Implementar solución para \${brief}\`;
  }`;

const newTitleExtract = `  // 1. TÍTULO inteligente (con verbo en infinitivo, completo sin cortar palabras)
  const words = cleanText.split(/\\s+/);
  const firstVerb = words.find(w => w.match(/^(implementar|automatizar|integrar|optimizar|desarrollar|crear|gestionar|mejorar)/i));
  let titulo = "";
  if (firstVerb) {
    const startIdx = cleanText.toLowerCase().indexOf(firstVerb.toLowerCase());
    const rawSub = cleanText.substring(startIdx, startIdx + 250);
    const periodIdx = rawSub.indexOf('.');
    const lineIdx = rawSub.indexOf('\\n');
    let cutIdx = rawSub.length;
    if (periodIdx > 15) cutIdx = Math.min(cutIdx, periodIdx);
    if (lineIdx > 15) cutIdx = Math.min(cutIdx, lineIdx);
    let extracted = rawSub.substring(0, cutIdx).replace(/[\\r\\n]/g, ' ').trim();
    if (cutIdx === 250 && extracted.lastIndexOf(' ') > 20) {
      extracted = extracted.substring(0, extracted.lastIndexOf(' ')).trim();
    }
    titulo = extracted;
  } else {
    const periodIdx = cleanText.indexOf('.');
    const lineIdx = cleanText.indexOf('\\n');
    let cutIdx = 200;
    if (periodIdx > 15) cutIdx = Math.min(cutIdx, periodIdx);
    if (lineIdx > 15) cutIdx = Math.min(cutIdx, lineIdx);
    let brief = cleanText.substring(0, cutIdx).replace(/[\\r\\n]/g, ' ').trim();
    if (cutIdx === 200 && brief.lastIndexOf(' ') > 20) {
      brief = brief.substring(0, brief.lastIndexOf(' ')).trim();
    }
    titulo = \`Implementar solución para \${brief}\`;
  }`;

if (content.includes(oldTitleExtract)) {
  content = content.replace(oldTitleExtract, newTitleExtract);
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('✅ Expanded title extraction limit to 250 chars with clean word boundary cutting in server.ts');
} else {
  console.error('❌ Could not find oldTitleExtract in server.ts');
}
