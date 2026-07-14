import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
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

// ─── Gemini AI Client ──────────────────────────────────────────────────────
let _genAI: GoogleGenAI | null = null;
function getGenAI() {
  if (!_genAI) _genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return _genAI;
}

// ─── Groq AI Client (fallback) ────────────────────────────────────────────
let _groq: Groq | null = null;
function getGroq(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

// ─── Unified AI JSON Call with Auto-Fallback ─────────────────────────────
// Tries Gemini first. If quota is exceeded (429) or model not found (404),
// automatically switches to Groq (llama-3.3-70b-versatile) at no cost.
async function callAIForJSON(prompt: string): Promise<string> {
  // 1. Try Gemini first
  try {
    const response = await getGenAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    return response.text;
  } catch (geminiErr: any) {
    const errBody = geminiErr?.message ? JSON.parse(geminiErr.message.includes('{') ? geminiErr.message : '{}') : {};
    const code = errBody?.error?.code ?? geminiErr?.status ?? 0;
    const isQuotaOrNotFound = code === 429 || code === 404 || code === 503;
    if (!isQuotaOrNotFound) throw geminiErr; // Re-throw non-quota errors

    // 2. Fallback to Groq
    const groq = getGroq();
    if (!groq) throw new Error("Gemini quota exceeded and no GROQ_API_KEY configured. Please add a Groq API key to .env");

    console.log("[AI Fallback] Gemini quota/unavailable, switching to Groq...");
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    return completion.choices[0]?.message?.content ?? "{}";
  }
}

// ─── Robust AI JSON Parser ───────────────────────────────────────────────────
// Strips markdown code fences (```json ... ```) that some models add before
// calling JSON.parse, preventing spurious parse errors and mock fallbacks.
function parseAIJSON(raw: string): any {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned);
}



const startAgentTask = async (role: string, title: string) => {
  try {
    const { data, error } = await supabase
      .from("agent_logs")
      .insert({
        agent_role: role,
        task_title: title,
        status: 'in_progress',
        progress: 10
      })
      .select('id')
      .single();
    if (!error && data) return (data as any).id;
  } catch (err) {
    console.error("Error starting agent task:", err);
  }
  return null;
};

const updateAgentTask = async (id: string | null, progress: number, status: 'completed' | 'in_progress') => {
  if (!id) return;
  try {
    await supabase
      .from("agent_logs")
      .update({ progress, status })
      .eq("id", id);
  } catch (err) {
    console.error("Error updating agent task:", err);
  }
};

// ─── Multer (in-memory storage for document uploads) ──────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── AI Training Config Cache (5 min TTL) ────────────────────────────────────
let trainingCache: any[] | null = null;
let trainingCacheTime = 0;
const TRAINING_CACHE_TTL = 2 * 1000; // 2 seconds TTL for instant admin updates

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

// ─── Gemini Client ─────────────────────────────────────────────────────────
// (initialized via getGenAI() and getGroq() at top of file)

function isApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return !!key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "";
}

// ─── Mock fallbacks ───────────────────────────────────────────────────────────
function getMockChatResponse(history: any[], initialData: any, message: string): string {
  const hasLast = history.some(h => h.role === "user" && h.text === message);
  const fullHistory = hasLast ? history : [...history, { role: "user", text: message }];
  const userMessages = fullHistory.filter((h) => h.role === "user");
  const count = userMessages.length;
  if (count === 0) return `¡Hola! Soy tu asistente de análisis de negocio. Veo que deseas registrar una iniciativa. Para comenzar, ¿podrías describirme cuál es el problema actual que buscas resolver?`;
  if (count === 1) return `Entendido. ¿Cuál es el objetivo principal o resultado esperado?`;
  if (count === 2) return `¿Qué usuarios o áreas estarán involucrados en el uso diario?`;
  if (count === 3) return `¿Qué sistemas o aplicaciones actuales se verían impactados?`;
  if (count === 4) return `¿Identificas algún riesgo, dependencia técnica o limitación clave?`;
  if (count === 5) return `¿Tienen alguna fecha objetivo o plazo estimado para el lanzamiento?`;
  return `Excelente, he recopilado toda la información. Procederé a generar el resumen ejecutivo. [INFORMACION_COMPLETA]`;
}

function getMockOptions(history: any[], message: string): string[] {
  const hasLast = history.some(h => h.role === "user" && h.text === message);
  const fullHistory = hasLast ? history : [...history, { role: "user", text: message }];
  const userMessages = fullHistory.filter((h) => h.role === "user");
  const count = userMessages.length;

  if (count === 1) return ["Ahorrar tiempo operativo", "Tener trazabilidad y reportes", "Reducir errores de digitación"];
  if (count === 2) return ["El equipo comercial y TI", "Operaciones y Back Office", "Toda la organización"];
  if (count === 3) return ["No impacta otros sistemas", "Se conecta con el CRM/ERP", "Usa integraciones por API"];
  if (count === 4) return ["No identifico riesgos críticos", "Dependencia del área de TI", "Requiere capacitación de usuarios"];
  if (count === 5) return ["Lo antes posible", "Próximo mes", "Para fin de año"];
  return ["Generar resumen"];
}

function getMockSummaryResponse(initialData: any) {
  const area = Object.values(initialData)[0] || "la organización";
  return {
    titulo: `Iniciativa de mejora para ${area}`,
    objetivo: `Implementar una solución digital que optimice el flujo de trabajo del área de ${area}, reduciendo tiempos y errores manuales.`,
    tipo_iniciativa: "Automatización de procesos",
    descripcion_de_la_necesidad: "El proceso actual es manual, lento y propenso a errores, lo que genera reprocesos y baja visibilidad en tiempo real de los indicadores clave.",
    situacion_deseada: "Contar con una plataforma integrada que automatice el flujo de trabajo, notifique en tiempo real y genere reportes automáticos para la toma de decisiones.",
    proceso_y_areas_impactadas: `${area}, Back Office, Reportería, Control de Gestión`,
    usuarios_beneficiados: ["Operaciones", "TI"],
    beneficio_cuantitativo_anual: "Reducción del 40% en tiempo de procesamiento. Ahorro estimado de 15 horas semanales en validaciones manuales.",
    beneficio_cualitativo: "Mayor visibilidad y trazabilidad de los procesos. Decisiones más oportunas basadas en datos confiables.",
    complejidad: "Media",
    riesgo: "Bajo",
    pilar_estratgico: "Excelencia operativa",
  };
}


// ─── Server ───────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // CORS middleware — MUST be first, before express.json(), so CORS headers
  // are always present even on error responses (parse errors, 500s, etc.)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));



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
    const { label, key, field_type, options, is_visible, is_required, sort_order, section, depends_on, options_map, ai_instructions, allow_multiple, help_text } = req.body;
    const { data, error } = await supabase
      .from("initiative_fields")
      .insert([{ label, key, field_type, options: options ?? [], is_visible: is_visible ?? true, is_required: is_required ?? false, sort_order: sort_order ?? 0, section: section ?? 'form', depends_on: depends_on ?? null, options_map: options_map ?? null, ai_instructions: ai_instructions ?? null, allow_multiple: allow_multiple ?? false, help_text: help_text ?? null }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/fields/analyze-unstructured", async (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "El texto no puede estar vacío." });
    }

    const tOrqId = await startAgentTask("Orquestador", "Analizando propuesta de texto libre del usuario");
    const tPoId = await startAgentTask("Product Owner", "Mapeando propuesta a campos de la iniciativa");

    try {
      await updateAgentTask(tOrqId, 30, 'in_progress');
      await updateAgentTask(tPoId, 45, 'in_progress');
      const [fieldsRes, vpsRes, dirsRes, training] = await Promise.all([
        supabase
          .from("initiative_fields")
          .select("*")
          .eq("is_visible", true)
          .order("sort_order", { ascending: true }),
        supabase.from("vps").select("name"),
        supabase.from("direcciones").select("name"),
        getTrainingConfig()
      ]);
 
      if (fieldsRes.error) throw fieldsRes.error;
 
      const fields = fieldsRes.data;
      const vps = vpsRes.data?.map(v => v.name) || [];
      const dirs = dirsRes.data?.map(d => d.name) || [];
      const systemPrompt = buildSystemPrompt(training);
 
      let fieldsConfigDescription = [
        `- Campo: "Vicepresidencia" (Clave: "vicepresidencia", Tipo: "select"). [OBLIGATORIO]. Opciones válidas: ${JSON.stringify(vps)}.`,
        `- Campo: "Dirección" (Clave: "direccion", Tipo: "select"). [OBLIGATORIO]. Opciones válidas: ${JSON.stringify(dirs)}.`
      ].join("\n") + "\n";
 
      fieldsConfigDescription += fields.map((f: any) => {
        let details = `- Campo: "${f.label}" (Clave: "${f.key}", Tipo: "${f.field_type}")`;
        if (f.field_type === 'select') {
          details += `. Opciones válidas: ${JSON.stringify(f.options)}. Si no se puede mapear a una de estas opciones, déjalo vacío o usa la opción más cercana si es obvio.`;
        }
        if (f.is_required) {
          details += ` [OBLIGATORIO]`;
        }
        if (f.help_text) {
          details += `. Descripción/Ayuda del campo: ${f.help_text}`;
        }
        if (f.ai_instructions) {
          details += `. INSTRUCCIONES ESPECÍFICAS OBLIGATORIAS PARA ESTE CAMPO (Debes cumplirlas a rajatabla y tienen prioridad absoluta sobre cualquier otra regla general): ${f.ai_instructions}`;
        }
        return details;
      }).join("\n");
  
      const prompt = `${systemPrompt}

Analiza el siguiente texto escrito por un usuario que describe una necesidad o requerimiento de TI. Tu tarea es extraer la información relevante y mapearla a los campos del formulario definidos abajo.
 
Campos disponibles en el formulario:
${fieldsConfigDescription}
 
Texto del usuario a analizar:
"""
${text}
"""
 
Reglas OBLIGATORIAS y proceso de autocrítica (Debes ejecutar estos 3 pasos internamente antes de generar la respuesta final):
1. PASO 1 (Extracción Inicial): Extrae los datos del texto y mapéalos a las claves de campo indicadas. Si no se menciona un campo, déjalo vacío.
2. PASO 2 (Refinamiento y Auto-Corrección según Guardarrieles y Prompts de Campos):
   - Revisa el valor asignado a cada campo y contrástalo estrictamente contra sus "INSTRUCCIONES ESPECÍFICAS OBLIGATORIAS PARA ESTE CAMPO". Si el valor inicial no cumple con alguna regla (como la del campo "titulo" que exige empezar con verbo en infinitivo), DEBES reescribir el título inicial para que se alinee 100% con esa regla.
   - Si un campo tiene una advertencia ("warning") pero su información se puede deducir o inferir de manera obvia y lógica a partir del texto del usuario y las reglas de negocio, elimina la advertencia y autocompleta el valor.
   - Corrige la redacción, coherencia, ortografía y claridad de todos los campos de texto libre para que se presenten de manera impecable y profesional.
3. PASO 3 (Generación de Salida): Entrega ÚNICAMENTE el JSON final refinado y corregido, respetando los guardarrieles globales y los prompts específicos. No incluyas explicaciones adicionales fuera del JSON.
Responde estrictamente en formato JSON con la siguiente estructura:
{
  "values": {
    "clave_de_campo_1": "valor extraído (en caso de 'select' debe coincidir exactamente con una de sus opciones si es posible, en caso de 'date' debe estar en formato YYYY-MM-DD)",
    "clave_de_campo_2": ""
  },
  "warnings": {
    "clave_de_campo_2": "Falta información: Por favor, detalla ... para completar este campo."
  }
}`;
 
      console.log("[AI Analyze] Sending prompt to Gemini. Input text length:", text.length);
      const tRegId = await startAgentTask("Regulador de Tokens", "Auditando llamada a Gemini API y tokens usados");
      const tDocId = await startAgentTask("Documentador", "Refinando propuesta para mejorar redacción y autocompletados");
      
      await updateAgentTask(tOrqId, 50, 'in_progress');
      await updateAgentTask(tPoId, 70, 'in_progress');
      await updateAgentTask(tDocId, 85, 'in_progress');
 
      const rawText = await callAIForJSON(prompt);
 
      console.log("[AI Analyze] Raw AI response:", rawText);
      const parsed = parseAIJSON(rawText);
      console.log("[AI Analyze] Parsed response:", JSON.stringify(parsed, null, 2));
      
      await updateAgentTask(tOrqId, 100, 'completed');
      await updateAgentTask(tPoId, 100, 'completed');
      await updateAgentTask(tRegId, 100, 'completed');
      await updateAgentTask(tDocId, 100, 'completed');

      res.json(parsed);
    } catch (e: any) {
      console.error("Error al analizar texto estructurado:", e.message);
      await updateAgentTask(tOrqId, 100, 'completed');
      await updateAgentTask(tPoId, 100, 'completed');
      res.status(500).json({ error: "Error al procesar el texto con la IA: " + e.message });
    }
  });

  app.post("/api/fields/validate-field", async (req, res) => {
    const { fieldKey, value, label, context } = req.body;
    if (value === undefined || value === null || String(value).trim() === "") {
      return res.json({ warning: `Falta información: Por favor, completa este campo.` });
    }

    const tQAId = await startAgentTask("Tester", `Validando campo: ${label}`);

    try {
      const prompt = `Estás validando los datos de una iniciativa de TI en un formulario.
El usuario ha ingresado el siguiente valor para el campo "${label}" (Clave: "${fieldKey}"):
"${value}"

Contexto adicional de otros campos del formulario (si están disponibles):
${JSON.stringify(context, null, 2)}

Analiza si el valor ingresado tiene sentido para este campo en el contexto de una iniciativa de TI.
Si el valor tiene sentido, responde con una cadena vacía en la propiedad "warning".
Si el valor no tiene sentido o requiere mayor detalle, responde con una advertencia corta y amigable en español que le indique al usuario qué está mal o cómo mejorarlo (en la propiedad "warning").

Responde estrictamente en formato JSON:
{
  "warning": "tu advertencia aquí o una cadena vacía si está bien"
}`;

      const rawText = await callAIForJSON(prompt);
      const parsed = parseAIJSON(rawText);
      await updateAgentTask(tQAId, 100, 'completed');
      res.json(parsed);
    } catch (e: any) {
      console.error("Error al validar campo:", e.message);
      await updateAgentTask(tQAId, 100, 'completed');
      res.json({ warning: "" });
    }
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
      confirmed_fields: req.body.confirmed_fields ?? {},
      unstructured_text: req.body.unstructured_text ?? null,
    };
    const { data, error } = await supabase.from("initiatives").insert([record]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await notifyBPs(data.id, data.status, record.form_data, record.summary);
    await processEmailNotifications(data.id, 'Borrador', data.status, record.form_data, record.summary);
    res.json(data);
  });

  app.post("/api/initiatives/draft", async (req, res) => {
    if (!req.body.id) return res.status(400).json({ error: "id is required for draft" });
    const record: Record<string, any> = {
      id: req.body.id,
      status: req.body.status || "Borrador",
      form_data: req.body.form_data ?? req.body,
      chat_history: req.body.chatHistory ?? req.body.chat_history ?? [],
      summary: req.body.summary ?? null,
      confirmed_fields: req.body.confirmed_fields ?? {},
      unstructured_text: req.body.unstructured_text ?? null,
      updated_at: new Date().toISOString()
    };
    // Persist user_id when provided so drafts can be filtered by authenticated user
    if (req.body.user_id) {
      record.user_id = req.body.user_id;
    }
    
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

      // Text-based documents - extract text for AI context
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
        content = "[Imagen adjunta]";
      } else {
        return res.status(400).json({ error: "Formato no soportado. Usa PDF, DOCX, TXT o imagen (JPG/PNG/WEBP)." });
      }

      if (!content) {
        return res.status(400).json({ error: "No se pudo extraer contenido del archivo. Verifica que no esté protegido." });
      }

      // ── Upload to Supabase Storage (instead of Base64) ──────────────────────
      let fileUrl: string | null = null;
      const ext = req.file.originalname.split(".").pop() || "bin";
      const uniqueName = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("iacs-attachments")
        .upload(uniqueName, req.file.buffer, {
          contentType: mime,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError.message);
        // Fallback: if storage fails, use Base64 for images only so functionality is preserved
        if (mime.startsWith("image/") || mime === "application/pdf") {
          fileUrl = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
        }
      } else {
        const { data: publicData } = supabase.storage
          .from("iacs-attachments")
          .getPublicUrl(uniqueName);
        fileUrl = publicData?.publicUrl || null;
      }

      res.json({ content, filename: req.file.originalname, type: mime, url: fileUrl });
    } catch (e: any) {
      console.error("Chat attach-file error:", e.message);
      res.status(500).json({ error: "Error al procesar el archivo: " + e.message });
    }
  });

  function sanitizeInitialDataForAI(initialData: any): any {
    if (!initialData) return initialData;
    const sanitized = { ...initialData };
    for (const key of Object.keys(sanitized)) {
      const val = sanitized[key];
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (parsed && typeof parsed === 'object' && parsed.name) {
            sanitized[key] = `[Archivo adjunto: ${parsed.name}]`;
          }
        } catch (e) {
          // Not JSON
        }
      }
    }
    return sanitized;
  }

  // ── AI Chat ──────────────────────────────────────────────────────────────────
  app.post("/api/chat", async (req, res) => {
    const { history, message, initialData, aiFields } = req.body;
    const sanitizedInitialData = sanitizeInitialDataForAI(initialData);

    const fieldsListStr = aiFields && aiFields.length > 0
      ? aiFields.map((f: any) => `- ${f.label}${f.field_type === 'select' && f.options && f.options.length > 0 ? ` (Valores permitidos estrictos, elige 1 de: ${f.options.join(', ')})` : ''}${f.ai_instructions ? ` (Instrucciones: ${f.ai_instructions})` : ''}`).join("\n")
      : `- Usuarios involucrados.\n- Proceso actual.\n- Proceso deseado.\n- Sistemas impactados.\n- Frecuencia de uso.\n- Beneficios esperados.`;

    const tOrqId = await startAgentTask("Orquestador", "Procesando mensaje de chat");
    const tPoId = await startAgentTask("Product Owner", "Analizando respuestas de la iniciativa");

    if (!isApiKeyConfigured()) {
      await updateAgentTask(tOrqId, 100, 'completed');
      await updateAgentTask(tPoId, 100, 'completed');
      return res.json({
        text: getMockChatResponse(history, sanitizedInitialData, message),
        options: getMockOptions(history, message)
      });
    }

    try {
      await updateAgentTask(tOrqId, 40, 'in_progress');
      await updateAgentTask(tPoId, 60, 'in_progress');
      const training = await getTrainingConfig();
      const systemPrompt = buildSystemPrompt(training);

      const tRegId = await startAgentTask("Regulador de Tokens", "Validando seguridad y tokens");
      const chatPrompt = `${systemPrompt}

Datos iniciales proporcionados por el usuario:
${Object.entries(sanitizedInitialData || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}

Asegúrate de recolectar al menos la siguiente información (si no está en los datos iniciales). Es VITAL que no existan campos en blanco ni respuestas vacías. Si falta información para alguno de estos campos, haz preguntas específicas y directas para obtenerla. NO repitas una pregunta si el usuario ya la ha respondido (aunque sea de forma breve); acéptala y pasa al siguiente punto. No termines la conversación ni devuelvas "[INFORMACION_COMPLETA]" en el texto hasta tener respuestas concretas para TODOS los puntos:
${fieldsListStr}

Historial de conversación:
${history.map((h: any) => `${h.role === 'user' ? 'Usuario' : 'Asistente'}: ${h.text}`).join("\n")}

Usuario: ${message}

IMPORTANTE: Responde SIEMPRE en formato JSON estricto con la siguiente estructura:
{
  "text": "Tu respuesta amigable y concisa (en formato Markdown si deseas enfatizar o listar algo). Si consideras que ya tienes TODA la información, finaliza incluyendo la etiqueta exacta '[INFORMACION_COMPLETA]' en tu texto.",
  "options": ["Opción sugerida 1", "Opción sugerida 2"] // NUNCA devuelvas "Continuar". Si no tienes sugerencias verdaderamente útiles y contextuales, devuelve un array vacío [].
}`;
      const rawChat = await callAIForJSON(chatPrompt);
      const parsed = parseAIJSON(rawChat);
      await updateAgentTask(tOrqId, 100, 'completed');
      await updateAgentTask(tPoId, 100, 'completed');
      await updateAgentTask(tRegId, 100, 'completed');
      res.json({ text: parsed.text, options: parsed.options || [] });
    } catch (e: any) {
      console.error("Gemini API error, falling back to mock:", e.message);
      res.json({
        text: getMockChatResponse(history, initialData, message),
        options: getMockOptions(history, message)
      });
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
      const aiName = data?.find(e => e.title === "ai_name")?.content || "Asistente IA";
      const aiAvatar = data?.find(e => e.title === "ai_avatar")?.content || "";
      
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

      res.json({ useMic, useAttachments, aiName, aiAvatar, fileTypes });
    } catch (e: any) {
      console.error("Error loading feature configs:", e.message);
      res.json({ 
        useMic: true, 
        useAttachments: true, 
        aiName: "Asistente IA",
        aiAvatar: "",
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
      const previewPrompt = `${systemPrompt}\n\nHistorial:\n${(history || []).map((h: any) => `${h.role}: ${h.text}`).join("\n")}\n\nUsuario: ${message}\n\nResponde en JSON: {"text": "...", "options": []}`;
      const rawPreview = await callAIForJSON(previewPrompt);
      const parsed = parseAIJSON(rawPreview);
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

  // ── AI Training Upload Avatar ─────────────────────────────────────────────────
  app.post("/api/ai-training/upload-avatar", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const mime = req.file.mimetype;
      if (!mime.startsWith("image/")) {
        return res.status(400).json({ error: "Solo se permiten imágenes (JPG, PNG, WEBP, GIF, SVG)." });
      }

      const ext = req.file.originalname.split(".").pop() || "bin";
      const uniqueName = `avatars/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("iacs-attachments")
        .upload(uniqueName, req.file.buffer, {
          contentType: mime,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError.message);
        // Fallback to base64
        const base64Url = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
        return res.json({ url: base64Url });
      }

      const { data: publicData } = supabase.storage
        .from("iacs-attachments")
        .getPublicUrl(uniqueName);

      const fileUrl = publicData?.publicUrl || null;
      res.json({ url: fileUrl });
    } catch (e: any) {
      console.error("Avatar upload error:", e.message);
      res.status(500).json({ error: "Error al procesar el avatar: " + e.message });
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
    const sanitizedInitialData = sanitizeInitialDataForAI(initialData);

    if (!isApiKeyConfigured()) {
      return res.json(getMockSummaryResponse(sanitizedInitialData));
    }

    const dynamicSchema = aiFields && aiFields.length > 0
      ? aiFields.map((f: any) => `  "${f.key}": "string - ${f.label}${f.field_type === 'select' && f.options?.length ? ` (Elige 1 de: ${f.options.join(', ')})` : ''}"`).join(",\n")
      : `  "titulo": "string - nombre corto descriptivo",\n  "objetivo": "string - objetivo principal"`;

    try {
      const summarizePrompt = `Eres un Business Analyst Senior. A partir del siguiente levantamiento de información, genera un resumen estructurado en formato JSON estrictamente.
Datos iniciales del formulario:
${JSON.stringify(sanitizedInitialData, null, 2)}

Conversación completa con el solicitante:
${history.map((h: any) => `${h.role === "user" ? "Solicitante" : "Business Analyst"}: ${h.text}`).join("\n")}

Devuelve SOLO un JSON válido con esta estructura exacta (sin texto adicional). Asegúrate de llenar todos los campos solicitados en la estructura:
{
${dynamicSchema}
}`;
      const rawSummary = await callAIForJSON(summarizePrompt);
      res.json(parseAIJSON(rawSummary));
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
