import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import "dotenv/config";

let aiClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory data store
  let initiatives = [];
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/initiatives", (req, res) => {
    res.json(initiatives);
  });

  app.post("/api/initiatives", (req, res) => {
    const init = {
      ...req.body,
      id: "INIT-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000).toString(36).toUpperCase(),
      createdAt: new Date().toISOString(),
      status: "Pendiente de Aprobación"
    };
    initiatives.push(init);
    res.json(init);
  });

  app.patch("/api/initiatives/:id", (req, res) => {
    const { id } = req.params;
    const index = initiatives.findIndex(i => i.id === id);
    if (index > -1) {
      initiatives[index] = { ...initiatives[index], ...req.body };
      res.json(initiatives[index]);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  // AI Chat Route
  app.post("/api/chat", async (req, res) => {
    const { history, message, initialData } = req.body;

    try {
      const response = await getGenAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: `Eres un Analista Funcional Senior. Estás entrevistando a un usuario para levantar una nueva iniciativa de negocio.
Datos iniciales proporcionados por el usuario:
Área: ${initialData.area}
Tipo de Necesidad: ${initialData.type}
Prioridad: ${initialData.priority}
Impacto Esperado: ${initialData.impact}
Unidad de Negocio: ${initialData.country}

Tu objetivo es obtener la siguiente información faltante haciendo preguntas detalladas y concisas (una o dos a la vez máximo):
- Problema actual.
- Objetivo esperado.
- Usuarios involucrados.
- Proceso actual.
- Proceso deseado.
- Sistemas impactados.
- Frecuencia de uso.
- Beneficios esperados.
- Riesgos.
- Dependencias.
- Fecha objetivo.

Historial de conversación:
${history.map(h => `${h.role}: ${h.text}`).join('\n')}

Usuario: ${message}

Responde de forma concisa y amigable indicando tu siguiente pregunta o confirmación. Si consideras que ya tienes TODA la información necesaria para crear el resumen, finaliza diciendo exactamente la frase: "[INFORMACION_COMPLETA]"` }] }
        ]
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to generate AI response." });
    }
  });

  app.post("/api/summarize", async (req, res) => {
    const { history, initialData } = req.body;
    
    try {
      const response = await getGenAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {role: "user", parts: [{text: `A partir del siguiente levantamiento de información, genera un resumen estructurado en formato JSON estrictamente.
Datos iniciales:
${JSON.stringify(initialData, null, 2)}

Conversación completa:
${history.map(h => `${h.role === 'user' ? 'Solicitante' : 'Business Analyst'}: ${h.text}`).join('\n')}

Debes devolver un JSON con esta estructura exacta:
{
  "resumenEjecutivo": "string",
  "problemaActual": "string",
  "solucionEsperada": "string",
  "beneficios": ["Beneficio 1", "Beneficio 2", "Beneficio 3"],
  "sistemasImpactados": ["Sistema A"],
  "complejidad": "Baja" | "Media" | "Alta",
  "riesgo": "Bajo" | "Medio" | "Alto",
  "prioridadRecomendada": "Baja" | "Media" | "Alta"
}`}]}
        ],
        config: {
          responseMimeType: "application/json"
        }
      });
      res.json(JSON.parse(response.text.trim()));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to generate AI summary." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
