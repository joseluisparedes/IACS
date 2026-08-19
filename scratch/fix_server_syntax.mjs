import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

const badPart = `      res.json(fallbackParsed);
    }});
      await updateAgentTask(tPoId, 100, 'completed', { error: e.message });
      res.status(500).json({ error: "Error al procesar el texto con la IA: " + e.message });
    }
  });`;

const goodPart = `      res.json(fallbackParsed);
    }
  });`;

if (content.includes(badPart)) {
  content = content.replace(badPart, goodPart);
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('✅ Cleaned up extra syntax in server.ts');
} else {
  console.error('❌ badPart not found');
}
