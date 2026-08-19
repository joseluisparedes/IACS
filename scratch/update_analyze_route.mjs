import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

const oldCallChunk = `      const rawText = await callAIForJSON(prompt);

      console.log("[AI Analyze] Raw AI response:", rawText);
      const parsed = parseAIJSON(rawText);
      console.log("[AI Analyze] Parsed response:", JSON.stringify(parsed, null, 2));
      
      await updateAgentTask(tOrqId, 100, 'completed', { action: "Delegando a agentes especializados", input_length: text.length });
      await updateAgentTask(tPoId, 100, 'completed', { action: "Extracción de entidades y mapeo", prompt_preview: prompt.substring(0, 300) + "...", ai_response: parsed });
      await updateAgentTask(tRegId, 100, 'completed', { action: "Análisis de seguridad", model: "gemini-2.0-flash", status: "Seguro" });
      await updateAgentTask(tDocId, 100, 'completed', { action: "Corrección ortográfica y de estilo", warnings: parsed.warnings });

      res.json(parsed);
    } catch (e: any) {
      console.error("Error al analizar texto estructurado:", e.message);
      await updateAgentTask(tOrqId, 100, 'completed', { error: e.message });
      await updateAgentTask(tPoId, 100, 'completed', { error: e.message });
      res.status(500).json({ error: "Error al procesar el texto con la IA: " + e.message });
    }`;

const newCallChunk = `      let rawText = "";
      try {
        rawText = await callAIForJSON(prompt);
      } catch (e: any) {
        console.warn("[AI Analyze] callAIForJSON error:", e.message);
      }

      console.log("[AI Analyze] Raw AI response:", rawText);
      let parsed: any = null;
      if (rawText && rawText.trim() !== "{}" && rawText.trim() !== "") {
        try { parsed = parseAIJSON(rawText); } catch (e) { console.warn("[AI Analyze] parseAIJSON error:", e); }
      }

      if (!parsed || !parsed.values) {
        console.log("[AI Analyze] Remote AI unavailable/saturated. Executing local smart extraction fallback.");
        parsed = extractLocalUnstructured(text, fields, vps, dirs);
      }

      await updateAgentTask(tOrqId, 100, 'completed', { action: "Delegando a agentes especializados", input_length: text.length });
      await updateAgentTask(tPoId, 100, 'completed', { action: "Extracción de entidades y mapeo", prompt_preview: prompt.substring(0, 300) + "...", ai_response: parsed });
      await updateAgentTask(tRegId, 100, 'completed', { action: "Análisis de seguridad", model: "multi-model-fallback", status: "Seguro" });
      await updateAgentTask(tDocId, 100, 'completed', { action: "Corrección ortográfica y de estilo", warnings: parsed.warnings });

      res.json(parsed);
    } catch (e: any) {
      console.error("Error al analizar texto estructurado, fallback a extracción local:", e.message);
      const fallbackParsed = extractLocalUnstructured(text, [], [], []);
      res.json(fallbackParsed);
    }`;

if (serverContent.includes(oldCallChunk)) {
  serverContent = serverContent.replace(oldCallChunk, newCallChunk);
  fs.writeFileSync(serverPath, serverContent, 'utf8');
  console.log('✅ Updated analyze-unstructured route with zero-error fallback strategy!');
} else {
  console.error('❌ Could not find oldCallChunk in server.ts');
}
