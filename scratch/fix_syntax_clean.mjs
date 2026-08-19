import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

const catchIdx = content.indexOf('console.error("Error al analizar texto estructurado, fallback a extracción local:", e.message);');
const nextRouteIdx = content.indexOf('app.post("/api/fields/validate-field"', catchIdx);

if (catchIdx === -1 || nextRouteIdx === -1) {
  console.error('Could not find indices');
  process.exit(1);
}

const before = content.substring(0, catchIdx);
const after = content.substring(nextRouteIdx);

const newCatchBlock = `console.error("Error al analizar texto estructurado, fallback a extracción local:", e.message);
      const fallbackParsed = extractLocalUnstructured(text, [], [], []);
      res.json(fallbackParsed);
    }
  });

  `;

fs.writeFileSync(serverPath, before + newCatchBlock + after, 'utf8');
console.log('✅ Cleanly fixed route syntax in server.ts');
