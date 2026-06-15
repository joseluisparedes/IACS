import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// ─── Supabase Client (backend - service role) ────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ─── Gemini Client ────────────────────────────────────────────────────────────
let aiClient: GoogleGenAI | null = null;

function isApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return !!key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "";
}

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY environment variable is required");
    aiClient = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
  }
  return aiClient;
}

// ─── Mock fallbacks ───────────────────────────────────────────────────────────
function getMockChatResponse(history: any[], initialData: any, _message: string): string {
  const userMessages = history.filter((h) => h.role === "user");
  const count = userMessages.length;
  if (count === 0) return `¡Hola! Soy tu asistente de análisis de negocio. Veo que deseas registrar una iniciativa. Para comenzar, ¿podrías describirme cuál es el problema actual que buscas resolver?`;
  if (count === 1) return `Entendido. ¿Cuál es el objetivo principal o resultado esperado?`;
  if (count === 2) return `¿Qué usuarios o áreas estarán involucrados en el uso diario?`;
  if (count === 3) return `¿Qué sistemas o aplicaciones actuales se verían impactados?`;
  if (count === 4) return `¿Identificas algún riesgo, dependencia técnica o limitación clave?`;
  if (count === 5) return `¿Tienen alguna fecha objetivo o plazo estimado para el lanzamiento?`;
  return `Excelente, he recopilado toda la información. Procederé a generar el resumen ejecutivo. [INFORMACION_COMPLETA]`;
}

function getMockSummaryResponse(initialData: any) {
  const area = Object.values(initialData)[0] || "la organización";
  return {
    titulo: `Mejora del proceso de ${area}`,
    objetivo: `Implementar una solución digital que optimice el flujo de trabajo del área de ${area}, reduciendo tiempos y errores manuales.`,
    tipoIniciativa: "Automatización de procesos",
    descripcionProblema: "El proceso actual es manual, lento y propenso a errores, lo que genera reprocesos y baja visibilidad en tiempo real de los indicadores clave.",
    situacionDeseada: "Contar con una plataforma integrada que automatice el flujo de trabajo, notifique en tiempo real y genere reportes automáticos para la toma de decisiones.",
    procesosImpactados: `${area}, Back Office, Reportería, Control de Gestión`,
    usuariosBeneficiados: "Analistas operativos, supervisores y gerencia del área. Aproximadamente 25 usuarios directos.",
    beneficiosCuantitativos: "Reducción del 40% en tiempo de procesamiento. Ahorro estimado de 15 horas semanales en validaciones manuales.",
    beneficiosCualitativos: [
      "Mayor visibilidad y trazabilidad de los procesos.",
      "Decisiones más oportunas basadas en datos confiables.",
      "Reducción de errores y reprocesos en un 60%.",
      "Mejor experiencia para los usuarios internos.",
    ],
    complejidad: "Media" as const,
    riesgo: "Bajo" as const,
    prioridadRecomendada: "Alta" as const,
  };
}


// ─── Server ───────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // ── Health ──────────────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  // ── Fields CRUD ─────────────────────────────────────────────────────────────
  app.get("/api/fields", async (_req, res) => {
    const { data, error } = await supabase
      .from("initiative_fields")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/fields", async (req, res) => {
    const { label, key, field_type, options, is_visible, is_required, sort_order, section, depends_on, options_map, ai_instructions } = req.body;
    const { data, error } = await supabase
      .from("initiative_fields")
      .insert([{ label, key, field_type, options: options ?? [], is_visible: is_visible ?? true, is_required: is_required ?? false, sort_order: sort_order ?? 0, section: section ?? 'form', depends_on: depends_on ?? null, options_map: options_map ?? null, ai_instructions: ai_instructions ?? null }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.patch("/api/fields/:id", async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("initiative_fields")
      .update(req.body)
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/fields/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from("initiative_fields").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Batch reorder: receives ordered array of IDs from drag-and-drop and updates sort_order for all
  app.post("/api/fields/reorder-batch", async (req, res) => {
    const { orderedIds } = req.body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
    const updates = orderedIds.map((id, index) =>
      supabase.from("initiative_fields").update({ sort_order: index }).eq("id", id)
    );
    await Promise.all(updates);
    res.json({ success: true });
  });

  // ── Initiatives CRUD ─────────────────────────────────────────────────────────
  app.get("/api/initiatives", async (_req, res) => {
    const { data, error } = await supabase
      .from("initiatives")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/initiatives", async (req, res) => {
    const id =
      "INIT-" +
      Date.now().toString(36).toUpperCase() +
      Math.floor(Math.random() * 1000).toString(36).toUpperCase();
    const record = {
      id,
      status: "Pendiente de Aprobación",
      form_data: req.body.form_data ?? req.body,
      chat_history: req.body.chatHistory ?? req.body.chat_history ?? [],
      summary: req.body.summary ?? null,
    };
    const { data, error } = await supabase.from("initiatives").insert([record]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.patch("/api/initiatives/:id", async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("initiatives")
      .update(req.body)
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ── AI Chat ──────────────────────────────────────────────────────────────────
  app.post("/api/chat", async (req, res) => {
    const { history, message, initialData, aiFields } = req.body;

    const fieldsListStr = aiFields && aiFields.length > 0
      ? aiFields.map((f: any) => `- ${f.label}${f.ai_instructions ? ` (Instrucciones: ${f.ai_instructions})` : ''}`).join("\n")
      : `- Usuarios involucrados.\n- Proceso actual.\n- Proceso deseado.\n- Sistemas impactados.\n- Frecuencia de uso.\n- Beneficios esperados.`;

    if (!isApiKeyConfigured()) {
      return res.json({ text: getMockChatResponse(history, initialData, message) });
    }

    try {
      const response = await getGenAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Eres un Analista de Negocio Senior de TI. Tu tarea es ayudar a los colaboradores a aterrizar y estructurar sus iniciativas o requerimientos de negocio mediante una conversación.

Datos iniciales proporcionados por el usuario:
${Object.entries(initialData || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}

Asegúrate de recolectar al menos la siguiente información (si no está en los datos iniciales). Es VITAL que no existan campos en blanco ni respuestas vacías. Si falta información para alguno de estos campos, haz preguntas específicas y directas para obtenerla. No termines la conversación ni devuelvas "[INFORMACION_COMPLETA]" hasta tener respuestas concretas para TODOS los puntos:
${fieldsListStr}

Historial de conversación:
${history.map((h: any) => `${h.role}: ${h.text}`).join("\n")}

Usuario: ${message}

Responde de forma concisa y amigable indicando tu siguiente pregunta o confirmación. Si consideras que ya tienes TODA la información necesaria para TODOS los campos requeridos, finaliza diciendo exactamente: "[INFORMACION_COMPLETA]"`,
              },
            ],
          },
        ],
      });
      res.json({ text: response.text });
    } catch (e: any) {
      console.error("Gemini API error, falling back to mock:", e.message);
      res.json({ text: getMockChatResponse(history, initialData, message) });
    }
  });

  // ── AI Summarize ─────────────────────────────────────────────────────────────
  app.post("/api/summarize", async (req, res) => {
    const { history, initialData, aiFields } = req.body;

    if (!isApiKeyConfigured()) {
      return res.json(getMockSummaryResponse(initialData));
    }

    const dynamicSchema = aiFields && aiFields.length > 0
      ? aiFields.map((f: any) => `  "${f.key}": "string - ${f.label}${f.field_type === 'select' && f.options?.length ? ` (Elige 1 de: ${f.options.join(', ')})` : ''}"`).join(",\n")
      : `  "titulo": "string - nombre corto descriptivo",\n  "objetivo": "string - objetivo principal"`;

    try {
      const response = await getGenAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Eres un Business Analyst Senior. A partir del siguiente levantamiento de información, genera un resumen estructurado en formato JSON estrictamente.
Datos iniciales del formulario:
${JSON.stringify(initialData, null, 2)}

Conversación completa con el solicitante:
${history.map((h: any) => `${h.role === "user" ? "Solicitante" : "Business Analyst"}: ${h.text}`).join("\n")}

Devuelve SOLO un JSON válido con esta estructura exacta (sin texto adicional). Asegúrate de llenar todos los campos solicitados en la estructura:
{
${dynamicSchema}
}`,
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json" },
      });
      res.json(JSON.parse(response.text.trim()));
    } catch (e: any) {
      console.error("Gemini summarize error, falling back to mock:", e.message);
      res.json(getMockSummaryResponse(initialData));
    }
  });


  // ── Vite / Static ────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
