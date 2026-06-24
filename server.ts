import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import mammoth from "mammoth";
import { createRequire } from "module";
// @ts-ignore
const localRequire = typeof require !== "undefined" ? require : createRequire(import.meta.url);
const pdfParse = localRequire("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
import "dotenv/config";
import { processEmailNotifications } from "./src/lib/emailService";
import XLSX from "xlsx";

// ─── Supabase Client (backend - service role) ────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ─── Multer (in-memory storage for document uploads) ──────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── AI Training Config Cache (5 min TTL) ────────────────────────────────────
let trainingCache: any[] | null = null;
let trainingCacheTime = 0;
const TRAINING_CACHE_TTL = 5 * 60 * 1000;

async function getTrainingConfig() {
  const now = Date.now();
  if (trainingCache && now - trainingCacheTime < TRAINING_CACHE_TTL) return trainingCache;
  const { data } = await supabase
    .from("ai_training_config")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  trainingCache = data ?? [];
  trainingCacheTime = now;
  return trainingCache;
}

function invalidateTrainingCache() {
  trainingCache = null;
  trainingCacheTime = 0;
}

function buildSystemPrompt(training: any[]): string {
  const DEFAULT_IDENTITY = `Eres un Analista de Negocio Senior de TI. Tu tarea es ayudar a los colaboradores a aterrizar y estructurar sus iniciativas o requerimientos de negocio mediante una conversación fluida y profesional. Tu tono es cercano pero formal. Haz preguntas concretas, de una en una, para recopilar toda la información necesaria. No termines la conversación hasta tener respuestas claras para todos los campos requeridos.`;

  const identity = training.find(t => t.layer === "identity")?.content ?? DEFAULT_IDENTITY;

  const contextItems = training.filter(t => t.layer === "context");
  const contextSection = contextItems.length > 0
    ? `\n## Contexto Institucional\n${contextItems.map(t => `### ${t.title}\n${t.content}`).join("\n\n")}`
    : "";

  const exampleItems = training.filter(t => t.layer === "examples");
  const examplesSection = exampleItems.length > 0
    ? `\n## Ejemplos de Conversación Ideal\n${exampleItems.map(t => `Usuario: "${t.title}"\nAgente: "${t.content}"`).join("\n\n")}`
    : "";

  const guardrailItems = training.filter(t => t.layer === "guardrails");
  const guardrailsSection = guardrailItems.length > 0
    ? `\n## Restricciones Absolutas (DEBES cumplir siempre)\n${guardrailItems.map(t => `- ${t.content}`).join("\n")}`
    : "";

  return `${identity}${contextSection}${examplesSection}${guardrailsSection}`.trim();
}

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
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.use(express.json());

  // CORS middleware for client access from GitHub Pages in production
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });



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

  // ─── AI Chat ──────────────────────────────────────────────────────────────────
  async function notifyBPs(initiativeId: string, status: string, formData: any, summary: any) {
    if (status !== "Pendiente de aprobación") return;
    try {
      const existingNotifs = await supabase.from('notifications').select('id').eq('initiative_id', initiativeId).limit(1);
      if (existingNotifs.data && existingNotifs.data.length > 0) return;

      if (formData && formData.vicepresidencia && formData.direccion) {
        const vpRes = await supabase.from('vps').select('id').eq('name', formData.vicepresidencia).single();
        const dirRes = await supabase.from('direcciones').select('id').eq('name', formData.direccion).eq('vp_id', vpRes.data?.id).single();
        
        if (vpRes.data && dirRes.data) {
          const vpId = vpRes.data.id;
          const dirId = dirRes.data.id;
          
          const usersRes = await supabase.from('allowed_users').select('id, name, user_roles_whitelist(*)');
          if (usersRes.data) {
            const eligibleBPs = usersRes.data.filter((u: any) => 
              u.user_roles_whitelist?.some((r: any) => 
                r.role === 'bp_ti' && 
                r.vp_id === vpId && 
                (r.direcciones_ids?.length === 0 || r.direcciones_ids?.includes(dirId))
              )
            );
            
            const title = summary?.titulo || Object.values(formData)[0] || 'Nueva Iniciativa';
            const notifications = eligibleBPs.map((bp: any) => ({
               user_id: bp.id,
               initiative_id: initiativeId,
               message: `Nueva iniciativa creada: ${title} en ${formData.direccion}`,
            }));
            
            if (notifications.length > 0) {
               await supabase.from('notifications').insert(notifications);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error creating notifications", e);
    }
  }

  app.post("/api/initiatives", async (req, res) => {
    const id =
      "INIT-" +
      Date.now().toString(36).toUpperCase() +
      Math.floor(Math.random() * 1000).toString(36).toUpperCase();
    const record = {
      id,
      status: req.body.status || "Pendiente de aprobación",
      form_data: req.body.form_data ?? req.body,
      chat_history: req.body.chatHistory ?? req.body.chat_history ?? [],
      summary: req.body.summary ?? null,
    };
    const { data, error } = await supabase.from("initiatives").insert([record]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await notifyBPs(data.id, data.status, record.form_data, record.summary);
    await processEmailNotifications(data.id, 'Borrador', data.status, record.form_data, record.summary);
    res.json(data);
  });

  app.post("/api/initiatives/draft", async (req, res) => {
    if (!req.body.id) return res.status(400).json({ error: "id is required for draft" });
    const record = {
      id: req.body.id,
      status: req.body.status || "Borrador",
      form_data: req.body.form_data ?? req.body,
      chat_history: req.body.chatHistory ?? req.body.chat_history ?? [],
      summary: req.body.summary ?? null,
      updated_at: new Date().toISOString()
    };
    
    // Fetch old status before upserting to check for transitions
    const { data: oldData } = await supabase.from("initiatives").select("status").eq("id", record.id).single();
    const oldStatus = oldData ? oldData.status : 'Borrador';

    const { data, error } = await supabase.from("initiatives").upsert([record], { onConflict: 'id' }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await notifyBPs(data.id, data.status, record.form_data, record.summary);
    await processEmailNotifications(data.id, oldStatus, data.status, record.form_data, record.summary);
    res.json(data);
  });

  app.patch("/api/initiatives/:id", async (req, res) => {
    const { id } = req.params;
    
    // Fetch current initiative to know old status, creator, and current data
    const { data: currentInit } = await supabase.from("initiatives").select("*").eq("id", id).single();
    const oldStatus = currentInit ? currentInit.status : 'Borrador';

    const { data, error } = await supabase
      .from("initiatives")
      .update(req.body)
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    if (currentInit) {
      await processEmailNotifications(
        data.id,
        oldStatus,
        data.status,
        data.form_data,
        data.summary,
        currentInit.form_data?.registrador_email
      );
    }
    
    res.json(data);
  });

  // ── Email Logs ──────────────────────────────────────────────────────────────
  app.get("/api/admin/email-logs", async (req, res) => {
    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ── Chat Speech-to-Text (MediaRecorder → Gemini) ─────────────────────────────
  app.post("/api/chat/speech-to-text", upload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No audio received" });
    if (!isApiKeyConfigured()) {
      return res.status(400).json({ error: "GEMINI_API_KEY no configurada. Configura tu API key para usar el micrófono." });
    }
    try {
      const base64Audio = req.file.buffer.toString("base64");
      // Determine mime type — MediaRecorder typically sends audio/webm or audio/ogg
      const mime = req.file.mimetype?.startsWith("audio/") ? req.file.mimetype : "audio/webm";

      const response = await getGenAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType: mime, data: base64Audio } },
            { text: "Transcribe exactamente lo que se dice en este audio en español. Devuelve únicamente el texto transcripto, sin explicaciones, sin comillas, sin puntuación adicional si no la hay en el habla." },
          ],
        }],
      });

      const text = response.text?.trim() ?? "";
      res.json({ text });
    } catch (e: any) {
      console.error("STT error:", e.message);
      res.status(500).json({ error: "Error al transcribir el audio: " + e.message });
    }
  });

  // ── Chat File Attachment ──────────────────────────────────────────────────────
  app.post("/api/chat/attach-file", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const { data: configData } = await supabase.from("ai_training_config").select("*").eq("layer", "settings");
      const mime = req.file.mimetype;
      const name = req.file.originalname.toLowerCase();

      let typeKey = "txt";
      if (mime === "application/pdf" || name.endsWith(".pdf")) typeKey = "pdf";
      else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) typeKey = "docx";
      else if (mime.startsWith("image/")) typeKey = "image";

      const enabledItem = configData?.find(e => e.title === `enable_${typeKey}`);
      const isEnabled = enabledItem ? enabledItem.content !== "false" : true;
      if (!isEnabled) {
        return res.status(400).json({ error: `La subida de archivos de tipo ${typeKey.toUpperCase()} está deshabilitada.` });
      }

      const configItem = configData?.find(e => e.title === `max_size_${typeKey}`);
      const maxMb = configItem ? parseFloat(configItem.content) : 1.0;
      const maxSize = maxMb * 1024 * 1024;

      if (req.file.size > maxSize) {
        return res.status(400).json({ error: `El archivo supera el límite permitido de ${maxMb} MB para este tipo.` });
      }

      let content = "";

      // Text-based documents
      if (mime === "application/pdf" || name.endsWith(".pdf")) {
        const parsed = await pdfParse(req.file.buffer);
        content = parsed.text.trim();
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        name.endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        content = result.value.trim();
      } else if (mime === "text/plain" || name.endsWith(".txt")) {
        content = req.file.buffer.toString("utf-8").trim();
      } else if (mime.startsWith("image/")) {
        // Use Gemini vision to describe the image
        if (!isApiKeyConfigured()) {
          content = "[Imagen adjunta — descripción no disponible sin API key configurada]";
        } else {
          const base64 = req.file.buffer.toString("base64");
          const response = await getGenAI().models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
              role: "user",
              parts: [
                { inlineData: { mimeType: mime, data: base64 } },
                { text: "Describe el contenido de esta imagen en detalle, especialmente si contiene texto, diagramas, tablas o información relevante para una iniciativa de TI. Responde en español." },
              ],
            }],
          });
          content = response.text.trim();
        }
      } else {
        return res.status(400).json({ error: "Formato no soportado. Usa PDF, DOCX, TXT o imagen (JPG/PNG/WEBP)." });
      }

      if (!content) {
        return res.status(400).json({ error: "No se pudo extraer contenido del archivo. Verifica que no esté protegido." });
      }

      res.json({ content, filename: req.file.originalname, type: mime });
    } catch (e: any) {
      console.error("Chat attach-file error:", e.message);
      res.status(500).json({ error: "Error al procesar el archivo: " + e.message });
    }
  });

  // ── AI Chat ──────────────────────────────────────────────────────────────────
  app.post("/api/chat", async (req, res) => {
    const { history, message, initialData, aiFields } = req.body;

    const fieldsListStr = aiFields && aiFields.length > 0
      ? aiFields.map((f: any) => `- ${f.label}${f.ai_instructions ? ` (Instrucciones: ${f.ai_instructions})` : ''}`).join("\n")
      : `- Usuarios involucrados.\n- Proceso actual.\n- Proceso deseado.\n- Sistemas impactados.\n- Frecuencia de uso.\n- Beneficios esperados.`;

    if (!isApiKeyConfigured()) {
      return res.json({ text: getMockChatResponse(history, initialData, message), options: ["No estoy seguro", "Explícame mejor", "Sí, continuemos"] });
    }

    try {
      const training = await getTrainingConfig();
      const systemPrompt = buildSystemPrompt(training);

      const response = await getGenAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt}

Datos iniciales proporcionados por el usuario:
${Object.entries(initialData || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}

Asegúrate de recolectar al menos la siguiente información (si no está en los datos iniciales). Es VITAL que no existan campos en blanco ni respuestas vacías. Si falta información para alguno de estos campos, haz preguntas específicas y directas para obtenerla. No termines la conversación ni devuelvas "[INFORMACION_COMPLETA]" en el texto hasta tener respuestas concretas para TODOS los puntos:
${fieldsListStr}

Historial de conversación:
${history.map((h: any) => `${h.role}: ${h.text}`).join("\n")}

Usuario: ${message}

IMPORTANTE: Responde SIEMPRE en formato JSON estricto con la siguiente estructura:
{
  "text": "Tu respuesta amigable y concisa (en formato Markdown si deseas enfatizar o listar algo). Si consideras que ya tienes TODA la información, finaliza incluyendo la etiqueta exacta '[INFORMACION_COMPLETA]' en tu texto.",
  "options": ["Opción sugerida 1", "Opción sugerida 2"] // (Opcional) Array de hasta 3 respuestas rápidas que el usuario podría seleccionar. Útil cuando el usuario es impreciso o necesitas ofrecerle alternativas claras. Si no aplica, déjalo vacío [].
}`,
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json" },
      });
      const parsed = JSON.parse(response.text.trim());
      res.json({ text: parsed.text, options: parsed.options || [] });
    } catch (e: any) {
      console.error("Gemini API error, falling back to mock:", e.message);
      res.json({ text: getMockChatResponse(history, initialData, message), options: ["Continuar"] });
    }
  });

  // ── Feature Config (Mic & Attachments Toggles) ──────────────────────────────
  app.get("/api/config/features", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from("ai_training_config")
        .select("*")
        .eq("layer", "settings");
      if (error) throw error;
      
      const useMic = data?.find(e => e.title === "use_mic")?.content !== "false";
      const useAttachments = data?.find(e => e.title === "use_attachments")?.content !== "false";
      
      const fileTypes = {
        pdf: {
          enabled: data?.find(e => e.title === "enable_pdf")?.content !== "false",
          maxMb: parseFloat(data?.find(e => e.title === "max_size_pdf")?.content || "1.0"),
        },
        docx: {
          enabled: data?.find(e => e.title === "enable_docx")?.content !== "false",
          maxMb: parseFloat(data?.find(e => e.title === "max_size_docx")?.content || "1.0"),
        },
        txt: {
          enabled: data?.find(e => e.title === "enable_txt")?.content !== "false",
          maxMb: parseFloat(data?.find(e => e.title === "max_size_txt")?.content || "1.0"),
        },
        image: {
          enabled: data?.find(e => e.title === "enable_image")?.content !== "false",
          maxMb: parseFloat(data?.find(e => e.title === "max_size_image")?.content || "1.0"),
        }
      };

      res.json({ useMic, useAttachments, fileTypes });
    } catch (e: any) {
      console.error("Error loading feature configs:", e.message);
      res.json({ 
        useMic: true, 
        useAttachments: true, 
        fileTypes: {
          pdf: { enabled: true, maxMb: 1.0 },
          docx: { enabled: true, maxMb: 1.0 },
          txt: { enabled: true, maxMb: 1.0 },
          image: { enabled: true, maxMb: 1.0 }
        } 
      });
    }
  });

  // ── AI Training CRUD ─────────────────────────────────────────────────────────
  app.get("/api/ai-training", async (_req, res) => {
    const { data, error } = await supabase
      .from("ai_training_config")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/ai-training", async (req, res) => {
    const { layer, title, content, is_active, sort_order, source } = req.body;
    const { data, error } = await supabase
      .from("ai_training_config")
      .insert([{ layer, title, content, is_active: is_active ?? true, sort_order: sort_order ?? 0, source: source ?? "manual", updated_at: new Date().toISOString() }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    invalidateTrainingCache();
    res.json(data);
  });

  app.patch("/api/ai-training/:id", async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("ai_training_config")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    invalidateTrainingCache();
    res.json(data);
  });

  app.delete("/api/ai-training/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from("ai_training_config").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    invalidateTrainingCache();
    res.json({ success: true });
  });

  app.post("/api/ai-training/reorder", async (req, res) => {
    const { orderedIds } = req.body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
    const updates = orderedIds.map((id, index) =>
      supabase.from("ai_training_config").update({ sort_order: index, updated_at: new Date().toISOString() }).eq("id", id)
    );
    await Promise.all(updates);
    invalidateTrainingCache();
    res.json({ success: true });
  });

  // ── AI Training Preview Chat ──────────────────────────────────────────────────
  app.post("/api/ai-training/preview-chat", async (req, res) => {
    const { history, message } = req.body;
    if (!isApiKeyConfigured()) {
      return res.json({ text: "[Demo] API de Gemini no configurada. Conecta tu GEMINI_API_KEY para probar el agente real.", options: [] });
    }
    try {
      const training = await getTrainingConfig();
      const systemPrompt = buildSystemPrompt(training);
      const response = await getGenAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{
            text: `${systemPrompt}\n\nHistorial:\n${(history || []).map((h: any) => `${h.role}: ${h.text}`).join("\n")}\n\nUsuario: ${message}\n\nResponde en JSON: {"text": "...", "options": []}`,
          }],
        }],
        config: { responseMimeType: "application/json" },
      });
      const parsed = JSON.parse(response.text.trim());
      res.json({ text: parsed.text, options: parsed.options || [] });
    } catch (e: any) {
      console.error("Preview chat error:", e.message);
      res.json({ text: "Error al conectar con el agente. Verifica tu API key.", options: [] });
    }
  });

  // ── AI Training Upload Document ───────────────────────────────────────────────
  app.post("/api/ai-training/upload-document", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const { data: configData } = await supabase.from("ai_training_config").select("*").eq("layer", "settings");
      const mime = req.file.mimetype;
      const originalName = req.file.originalname.toLowerCase();

      let typeKey = "txt";
      if (mime === "application/pdf" || originalName.endsWith(".pdf")) typeKey = "pdf";
      else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || originalName.endsWith(".docx")) typeKey = "docx";
      else if (mime.startsWith("image/")) typeKey = "image";

      const enabledItem = configData?.find(e => e.title === `enable_${typeKey}`);
      const isEnabled = enabledItem ? enabledItem.content !== "false" : true;
      if (!isEnabled) {
        return res.status(400).json({ error: `La subida de archivos de tipo ${typeKey.toUpperCase()} está deshabilitada.` });
      }

      const configItem = configData?.find(e => e.title === `max_size_${typeKey}`);
      const maxMb = configItem ? parseFloat(configItem.content) : 1.0;
      const maxSize = maxMb * 1024 * 1024;

      if (req.file.size > maxSize) {
        return res.status(400).json({ error: `El archivo supera el límite permitido de ${maxMb} MB para este tipo.` });
      }

      let fullText = "";

      if (mime === "application/pdf" || originalName.endsWith(".pdf")) {
        const parsed = await pdfParse(req.file.buffer);
        fullText = parsed.text;
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        originalName.endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        fullText = result.value;
      } else if (mime === "text/plain" || originalName.endsWith(".txt")) {
        fullText = req.file.buffer.toString("utf-8");
      } else {
        return res.status(400).json({ error: "Formato no soportado. Usa PDF, DOCX o TXT." });
      }

      // Split into chunks of ~500 words
      const paragraphs = fullText.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 50);
      const chunks: { title: string; content: string }[] = [];
      let current = "";
      let chunkIndex = 1;

      for (const para of paragraphs) {
        const combined = current ? current + "\n\n" + para : para;
        const wordCount = combined.split(/\s+/).length;
        if (wordCount > 500 && current) {
          chunks.push({ title: `${req.file.originalname} — Sección ${chunkIndex++}`, content: current });
          current = para;
        } else {
          current = combined;
        }
      }
      if (current) chunks.push({ title: `${req.file.originalname} — Sección ${chunkIndex}`, content: current });

      res.json({ chunks, totalChunks: chunks.length });
    } catch (e: any) {
      console.error("Document extraction error:", e.message);
      res.status(500).json({ error: "Error al extraer texto del documento" });
    }
  });

  // ── AI Feedback ──────────────────────────────────────────────────────────────
  app.get("/api/ai-feedback", async (_req, res) => {
    const { data, error } = await supabase
      .from("ai_feedback")
      .select("*")
      .eq("admin_approved", false)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/ai-feedback", async (req, res) => {
    const { initiative_id, message_index, user_message, agent_response, rating } = req.body;
    const { data, error } = await supabase
      .from("ai_feedback")
      .insert([{ initiative_id, message_index, user_message, agent_response, rating }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/ai-feedback/:id/approve", async (req, res) => {
    const { id } = req.params;
    const { ideal_response } = req.body;
    // Get original feedback
    const { data: fb, error: fbErr } = await supabase.from("ai_feedback").select("*").eq("id", id).single();
    if (fbErr || !fb) return res.status(404).json({ error: "Feedback not found" });
    // Create training example
    const { error: insertErr } = await supabase.from("ai_training_config").insert([{
      layer: "examples",
      title: fb.user_message,
      content: ideal_response || fb.agent_response,
      is_active: true,
      sort_order: 0,
      source: "feedback",
      updated_at: new Date().toISOString(),
    }]);
    if (insertErr) return res.status(500).json({ error: insertErr.message });
    // Mark as approved
    await supabase.from("ai_feedback").update({ admin_approved: true }).eq("id", id);
    invalidateTrainingCache();
    res.json({ success: true });
  });

  app.delete("/api/ai-feedback/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from("ai_feedback").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
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

  // ── Carga Masiva de Usuarios y Estructura ────────────────────────────────────
  async function processExcelData(jsonData: any[]) {
    const logs: string[] = [];
    let stats = {
      vpsCreated: 0,
      vpsUpdated: 0,
      direccionesCreated: 0,
      direccionesUpdated: 0,
      usersCreated: 0,
      rolesAssigned: 0,
      rowsProcessed: 0,
    };

    // 1. Fetch current data from DB to cache
    const { data: allVPs } = await supabase.from("vps").select("*");
    const { data: allDirs } = await supabase.from("direcciones").select("*");
    const { data: allUsers } = await supabase.from("allowed_users").select("*");
    const { data: allWhitelists } = await supabase.from("user_roles_whitelist").select("*");
    const { data: allProfiles } = await supabase.from("profiles").select("*");
    const { data: allProfileRoles } = await supabase.from("profile_roles").select("*");

    const vpMap = new Map((allVPs || []).map(v => [v.name.toLowerCase().trim(), v]));
    const dirMap = new Map((allDirs || []).map(d => [`${d.vp_id}_${d.name.toLowerCase().trim()}`, d]));
    const userMap = new Map((allUsers || []).map(u => [u.email.toLowerCase().trim(), u]));
    const profileMap = new Map((allProfiles || []).map(p => [p.email.toLowerCase().trim(), p]));

    // Cache user whitelist roles to avoid multiple queries
    // Key: `${allowed_user_id}_${role}_${vp_id}` -> record
    const whitelistMap = new Map(
      (allWhitelists || []).map(w => [`${w.allowed_user_id}_${w.role}_${w.vp_id}`, w])
    );
    // Key: `${profile_id}_${role}_${vp_id}` -> record
    const profileRolesMap = new Map(
      (allProfileRoles || []).map(pr => [`${pr.profile_id}_${pr.role}_${pr.vp_id}`, pr])
    );

    // Helper to get or create allowed user
    const getOrCreateUser = async (email: string, name: string) => {
      const cleanEmail = email.toLowerCase().trim();
      if (userMap.has(cleanEmail)) {
        const existingUser = userMap.get(cleanEmail)!;
        if (name && existingUser.name !== name.trim()) {
          const { error } = await supabase
            .from("allowed_users")
            .update({ name: name.trim() })
            .eq("id", existingUser.id);
          if (!error) {
            existingUser.name = name.trim();
            userMap.set(cleanEmail, existingUser);
            logs.push(`Usuario modificado: Nombre de ${cleanEmail} actualizado a "${name.trim()}"`);
            
            // Sync name in profile if it exists
            if (profileMap.has(cleanEmail)) {
              const profile = profileMap.get(cleanEmail)!;
              await supabase.from("profiles").update({ name: name.trim() }).eq("id", profile.id);
              profile.name = name.trim();
              profileMap.set(cleanEmail, profile);
            }
          }
        }
        return existingUser;
      }

      const { data: newUser, error } = await supabase
        .from("allowed_users")
        .insert([{ email: cleanEmail, name: name.trim() }])
        .select()
        .single();

      if (error) {
        throw new Error(`Error al crear usuario ${cleanEmail}: ${error.message}`);
      }

      userMap.set(cleanEmail, newUser);
      stats.usersCreated++;
      logs.push(`Usuario creado en lista blanca: ${name.trim()} (${cleanEmail})`);
      return newUser;
    };

    // Helper to assign role and directions
    const assignUserRole = async (userId: string, email: string, name: string, role: string, vpId: string, vpName: string, dirId: string, dirName: string) => {
      const cleanEmail = email.toLowerCase().trim();
      const whitelistKey = `${userId}_${role}_${vpId}`;
      
      if (whitelistMap.has(whitelistKey)) {
        const record = whitelistMap.get(whitelistKey)!;
        const dirs = record.direcciones_ids || [];
        if (!dirs.includes(dirId)) {
          const updatedDirs = [...dirs, dirId];
          const { error } = await supabase
            .from("user_roles_whitelist")
            .update({ direcciones_ids: updatedDirs })
            .eq("id", record.id);
          if (error) throw new Error(`Error actualizando rol de whitelist para ${cleanEmail}: ${error.message}`);
          
          record.direcciones_ids = updatedDirs;
          whitelistMap.set(whitelistKey, record);
          stats.rolesAssigned++;
          logs.push(`Rol Whitelist: Se añadió la dirección "${dirName}" al rol "${role}" de ${name} (${cleanEmail}) en VP "${vpName}"`);
        }
      } else {
        const { data: newRecord, error } = await supabase
          .from("user_roles_whitelist")
          .insert([{ allowed_user_id: userId, role, vp_id: vpId, direcciones_ids: [dirId] }])
          .select()
          .single();
        if (error) throw new Error(`Error insertando rol de whitelist para ${cleanEmail}: ${error.message}`);

        whitelistMap.set(whitelistKey, newRecord);
        stats.rolesAssigned++;
        logs.push(`Rol Whitelist: Se asignó rol "${role}" a ${name} (${cleanEmail}) para la dirección "${dirName}" de la VP "${vpName}"`);
      }

      // Sync to profiles & profile_roles
      if (profileMap.has(cleanEmail)) {
        const profile = profileMap.get(cleanEmail)!;
        const profileRoleKey = `${profile.id}_${role}_${vpId}`;
        if (profileRolesMap.has(profileRoleKey)) {
          const record = profileRolesMap.get(profileRoleKey)!;
          const dirs = record.direcciones_ids || [];
          if (!dirs.includes(dirId)) {
            const updatedDirs = [...dirs, dirId];
            await supabase
              .from("profile_roles")
              .update({ direcciones_ids: updatedDirs })
              .eq("id", record.id);
            record.direcciones_ids = updatedDirs;
            profileRolesMap.set(profileRoleKey, record);
            logs.push(`Rol Perfil: Sincronizada dirección "${dirName}" para perfil de ${cleanEmail}`);
          }
        } else {
          const { data: newRecord, error } = await supabase
            .from("profile_roles")
            .insert([{ profile_id: profile.id, role, vp_id: vpId, direcciones_ids: [dirId] }])
            .select()
            .single();
          if (!error && newRecord) {
            profileRolesMap.set(profileRoleKey, newRecord);
            logs.push(`Rol Perfil: Sincronizado rol "${role}" para perfil de ${cleanEmail}`);
          }
        }
      }
    };

    for (const item of jsonData) {
      const vpNameVal = item["Vice Presidencia"]?.toString().trim();
      const vpVPNameVal = item["Vicepresidente"]?.toString().trim();
      const vpEmailVal = item["Correo de VP"]?.toString().trim();
      
      const dirNameVal = item["Dirección"]?.toString().trim();
      const dirDirectorVal = item["Director"]?.toString().trim();
      const dirEmailVal = item["Correo del director"]?.toString().trim();
      
      const kuNameVal = item["Key Users"]?.toString().trim();
      const kuEmailVal = item["Correo electrónico"]?.toString().trim();
      
      const bp1NameVal = item["Business Partner 1"]?.toString().trim();
      const bp1EmailVal = item["Correo BP 1"]?.toString().trim();
      
      const bp2NameVal = item["Business Partner 2"]?.toString().trim();
      const bp2EmailVal = item["Correo BP 2"]?.toString().trim();

      if (!vpNameVal || !dirNameVal) {
        continue;
      }

      stats.rowsProcessed++;

      // 1. VP Get or Create
      const cleanVpName = vpNameVal.toLowerCase().trim();
      let vpRecord = vpMap.get(cleanVpName);
      if (!vpRecord) {
        const { data: newVp, error } = await supabase
          .from("vps")
          .insert([{ name: vpNameVal, bp_name: vpVPNameVal || null, email: vpEmailVal || null }])
          .select()
          .single();
        if (error) throw new Error(`Error al crear VP ${vpNameVal}: ${error.message}`);
        
        vpRecord = newVp;
        vpMap.set(cleanVpName, vpRecord);
        stats.vpsCreated++;
        logs.push(`VP Creada: "${vpNameVal}" con Vicepresidente "${vpVPNameVal || 'No asignado'}"`);
      } else {
        const needsUpdate = 
          (vpVPNameVal && vpRecord.bp_name !== vpVPNameVal) || 
          (vpEmailVal && vpRecord.email !== vpEmailVal);
        if (needsUpdate) {
          const updatedFields = {
            bp_name: vpVPNameVal || vpRecord.bp_name,
            email: vpEmailVal || vpRecord.email
          };
          const { error } = await supabase
            .from("vps")
            .update(updatedFields)
            .eq("id", vpRecord.id);
          if (!error) {
            vpRecord.bp_name = updatedFields.bp_name;
            vpRecord.email = updatedFields.email;
            vpMap.set(cleanVpName, vpRecord);
            stats.vpsUpdated++;
            logs.push(`VP Actualizada: "${vpNameVal}"`);
          }
        }
      }

      // 2. Dirección Get or Create
      const cleanDirName = dirNameVal.toLowerCase().trim();
      const dirMapKey = `${vpRecord.id}_${cleanDirName}`;
      let dirRecord = dirMap.get(dirMapKey);
      if (!dirRecord) {
        const { data: newDir, error } = await supabase
          .from("direcciones")
          .insert([{ name: dirNameVal, vp_id: vpRecord.id, director_name: dirDirectorVal || null, email: dirEmailVal || null }])
          .select()
          .single();
        if (error) throw new Error(`Error al crear Dirección ${dirNameVal}: ${error.message}`);

        dirRecord = newDir;
        dirMap.set(dirMapKey, dirRecord);
        stats.direccionesCreated++;
        logs.push(`Dirección Creada: "${dirNameVal}" bajo la VP "${vpNameVal}" con Director "${dirDirectorVal || 'No asignado'}"`);
      } else {
        const needsUpdate = 
          (dirDirectorVal && dirRecord.director_name !== dirDirectorVal) || 
          (dirEmailVal && dirRecord.email !== dirEmailVal);
        if (needsUpdate) {
          const updatedFields = {
            director_name: dirDirectorVal || dirRecord.director_name,
            email: dirEmailVal || dirRecord.email
          };
          const { error } = await supabase
            .from("direcciones")
            .update(updatedFields)
            .eq("id", dirRecord.id);
          if (!error) {
            dirRecord.director_name = updatedFields.director_name;
            dirRecord.email = updatedFields.email;
            dirMap.set(dirMapKey, dirRecord);
            stats.direccionesUpdated++;
            logs.push(`Dirección Actualizada: "${dirNameVal}"`);
          }
        }
      }

      // 3. VP role assignment
      if (vpEmailVal && vpVPNameVal) {
        const user = await getOrCreateUser(vpEmailVal, vpVPNameVal);
        await assignUserRole(user.id, vpEmailVal, vpVPNameVal, "registrador", vpRecord.id, vpNameVal, dirRecord.id, dirNameVal);
      }

      // 4. Director role assignment
      if (dirEmailVal && dirDirectorVal) {
        const user = await getOrCreateUser(dirEmailVal, dirDirectorVal);
        await assignUserRole(user.id, dirEmailVal, dirDirectorVal, "registrador", vpRecord.id, vpNameVal, dirRecord.id, dirNameVal);
      }

      // 5. Key User role assignment
      if (kuEmailVal && kuNameVal) {
        const user = await getOrCreateUser(kuEmailVal, kuNameVal);
        await assignUserRole(user.id, kuEmailVal, kuNameVal, "registrador", vpRecord.id, vpNameVal, dirRecord.id, dirNameVal);
      }

      // 6. BP 1 role assignment
      if (bp1EmailVal && bp1NameVal) {
        const user = await getOrCreateUser(bp1EmailVal, bp1NameVal);
        await assignUserRole(user.id, bp1EmailVal, bp1NameVal, "registrador", vpRecord.id, vpNameVal, dirRecord.id, dirNameVal);
        await assignUserRole(user.id, bp1EmailVal, bp1NameVal, "bp_ti", vpRecord.id, vpNameVal, dirRecord.id, dirNameVal);
      }

      // 7. BP 2 role assignment
      if (bp2EmailVal && bp2NameVal) {
        const user = await getOrCreateUser(bp2EmailVal, bp2NameVal);
        await assignUserRole(user.id, bp2EmailVal, bp2NameVal, "registrador", vpRecord.id, vpNameVal, dirRecord.id, dirNameVal);
        await assignUserRole(user.id, bp2EmailVal, bp2NameVal, "bp_ti", vpRecord.id, vpNameVal, dirRecord.id, dirNameVal);
      }
    }

    return { stats, logs };
  }



  app.post("/api/admin/bulk-upload-custom", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const result = await processExcelData(data);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Bulk upload custom error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });


  // ── Vite / Static ────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
