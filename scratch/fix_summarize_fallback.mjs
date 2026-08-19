import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

const oldSummarizeBlock = `      const rawSummary = await callAIForJSON(summarizePrompt);
      const parsedSummary = parseAIJSON(rawSummary) || {};
      (aiFields || []).forEach((f: any) => {
        if (f.field_type === 'date' && parsedSummary[f.key]) {
          parsedSummary[f.key] = normalizeDateStr(parsedSummary[f.key]);
        }
      });
      if (parsedSummary.fecha_requerida) {
        parsedSummary.fecha_requerida = normalizeDateStr(parsedSummary.fecha_requerida);
      }
      res.json(parsedSummary);
    } catch (e: any) {
      console.error("Gemini summarize error, falling back to mock:", e.message);
      res.json(getMockSummaryResponse(initialData));
    }`;

const newSummarizeBlock = `      let rawSummary = "";
      try {
        rawSummary = await callAIForJSON(summarizePrompt);
      } catch (e: any) {
        console.warn("[AI Summarize] callAIForJSON error:", e.message);
      }

      let parsedSummary: any = null;
      if (rawSummary && rawSummary.trim() !== "{}" && rawSummary.trim() !== "") {
        try { parsedSummary = parseAIJSON(rawSummary); } catch (e) {}
      }

      if (!parsedSummary || !parsedSummary.titulo) {
        console.log("[AI Summarize] Remote AI unavailable/rate limited. Executing local summary response fallback.");
        parsedSummary = getMockSummaryResponse(sanitizedInitialData);
      }

      (aiFields || []).forEach((f: any) => {
        if (f.field_type === 'date' && parsedSummary[f.key]) {
          parsedSummary[f.key] = normalizeDateStr(parsedSummary[f.key]);
        }
      });
      if (parsedSummary.fecha_requerida) {
        parsedSummary.fecha_requerida = normalizeDateStr(parsedSummary.fecha_requerida);
      }
      res.json(parsedSummary);
    } catch (e: any) {
      console.error("Gemini summarize error, falling back to mock:", e.message);
      res.json(getMockSummaryResponse(initialData));
    }`;

if (content.includes(oldSummarizeBlock)) {
  content = content.replace(oldSummarizeBlock, newSummarizeBlock);
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('✅ Applied fallback to /api/summarize in server.ts');
} else {
  console.error('❌ Could not find oldSummarizeBlock in server.ts');
}
