import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'server.ts');
let content = readFileSync(filePath, 'utf8');

// Helper to add normalizeDateStr at the top of server.ts if not present
if (!content.includes('function normalizeDateStr(')) {
  const normFunc = `
function normalizeDateStr(val: any): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (/^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$/.test(trimmed)) return trimmed;

  const ymd = trimmed.match(/^(\\d{4})[\\/\\.-](\\d{1,2})[\\/\\.-](\\d{1,2})$/);
  if (ymd) return \`\${ymd[3].padStart(2, '0')}/\${ymd[2].padStart(2, '0')}/\${ymd[1]}\`;

  const cleanStr = trimmed.toUpperCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');

  const qMatch = cleanStr.match(/(?:Q([1-4])|([1-4])T)[^\\d]*(\\d{4})/i);
  if (qMatch) {
    const q = parseInt(qMatch[1] || qMatch[2], 10);
    const year = qMatch[3];
    const quarterEnds: Record<number, string> = { 1: '31/03/' + year, 2: '30/06/' + year, 3: '30/09/' + year, 4: '31/12/' + year };
    return quarterEnds[q] || trimmed;
  }

  const months: Record<string, string> = {
    ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06',
    JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12'
  };
  for (const [mName, mNum] of Object.entries(months)) {
    if (cleanStr.includes(mName)) {
      const yMatch = cleanStr.match(/\\d{4}/);
      const year = yMatch ? yMatch[0] : new Date().getFullYear().toString();
      const lastDay = new Date(parseInt(year, 10), parseInt(mNum, 10), 0).getDate();
      return String(lastDay).padStart(2, '0') + '/' + mNum + '/' + year;
    }
  }

  const now = new Date();

  if (cleanStr.includes('INMEDIATAMENTE') || cleanStr.includes('HOY') || cleanStr.includes('ASAP') || cleanStr.includes('ANTES POSIBLE')) {
    return String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
  }

  if (cleanStr.includes('FIN DE ANO') || cleanStr.includes('CIERRE DE ANO')) {
    const yMatch = cleanStr.match(/\\d{4}/);
    const year = yMatch ? yMatch[0] : now.getFullYear().toString();
    return '31/12/' + year;
  }

  if (cleanStr.includes('PROXIMO MES') || cleanStr.includes('MES SIGUIENTE')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  if (cleanStr.includes('ESTE MES') || cleanStr.includes('FIN DE MES')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  const mMatch = cleanStr.match(/(?:DENTRO DE|EN|PROXIMOS)\\s+(?:LOS\\s+)?(\\d{1,2})\\s+MESES?/);
  if (mMatch) {
    const numMonths = parseInt(mMatch[1], 10);
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1 + numMonths, 0);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  const dMatch = cleanStr.match(/(?:DENTRO DE|EN)\\s+(\\d{1,3})\\s+DIAS?/);
  if (dMatch) {
    const numDays = parseInt(dMatch[1], 10);
    const targetDate = new Date(now.valueOf() + numDays * 86400000);
    return String(targetDate.getDate()).padStart(2, '0') + '/' + String(targetDate.getMonth() + 1).padStart(2, '0') + '/' + targetDate.getFullYear();
  }

  const fallback = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  return String(fallback.getDate()).padStart(2, '0') + '/' + String(fallback.getMonth() + 1).padStart(2, '0') + '/' + fallback.getFullYear();
}
`;
  content = normFunc + content;
  console.log('✅ Added normalizeDateStr helper to server.ts');
}

// Update /api/summarize to enforce date formatting instructions and post-processing
const oldDynamicSchema = `const dynamicSchema = aiFields && aiFields.length > 0
      ? aiFields.map((f: any) => \`  "\${f.key}": "string - \${f.label}\${f.field_type === 'select' && f.options?.length ? \` (Elige 1 de: \${f.options.join(', ')})\` : ''}"\`).join(",\\n")
      : \`  "titulo": "string - nombre concreto, profesional y altamente descriptivo del proyecto o solución",\\n  "objetivo": "string - objetivo principal"\`;`;

const newDynamicSchema = `const dynamicSchema = aiFields && aiFields.length > 0
      ? aiFields.map((f: any) => \`  "\${f.key}": "string - \${f.label}\${f.field_type === 'date' ? ' (formato fecha DD/MM/AAAA exacto, NUNCA frases como Próximo mes)' : f.field_type === 'select' && f.options?.length ? \` (Elige 1 de: \${f.options.join(', ')})\` : ''}"\`).join(",\\n")
      : \`  "titulo": "string - nombre concreto, profesional y altamente descriptivo del proyecto o solución",\\n  "objetivo": "string - objetivo principal"\`;`;

if (content.includes(oldDynamicSchema)) {
  content = content.replace(oldDynamicSchema, newDynamicSchema);
  console.log('✅ Updated dynamicSchema in /api/summarize');
}

const oldSummarizeReturn = `res.json(parseAIJSON(rawSummary));`;
const newSummarizeReturn = `const parsedSummary = parseAIJSON(rawSummary) || {};
      (aiFields || []).forEach((f: any) => {
        if (f.field_type === 'date' && parsedSummary[f.key]) {
          parsedSummary[f.key] = normalizeDateStr(parsedSummary[f.key]);
        }
      });
      if (parsedSummary.fecha_requerida) {
        parsedSummary.fecha_requerida = normalizeDateStr(parsedSummary.fecha_requerida);
      }
      res.json(parsedSummary);`;

if (content.includes(oldSummarizeReturn)) {
  content = content.replace(oldSummarizeReturn, newSummarizeReturn);
  console.log('✅ Updated summarize response post-processing in server.ts');
}

writeFileSync(filePath, content, 'utf8');
