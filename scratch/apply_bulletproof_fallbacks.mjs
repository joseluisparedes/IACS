import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Update /api/chat route to have bulletproof local mock response fallback if AI fails or returns empty
const oldChatRouteStart = content.indexOf('app.post("/api/chat", async (req, res) => {');
const oldChatRouteEnd = content.indexOf('app.get("/api/config/features"', oldChatRouteStart);

if (oldChatRouteStart === -1 || oldChatRouteEnd === -1) {
  console.error("Could not find /api/chat route boundaries");
  process.exit(1);
}

const newChatRoute = `app.post("/api/chat", async (req, res) => {
    const { history, message, initialData, aiFields } = req.body;
    const sanitizedInitialData = sanitizeInitialDataForAI(initialData);

    const isUserAcceptance = /^\\s*(sí|si|de acuerdo|estoy de acuerdo|acepto|conforme|ok|perfecto|adelante|excelente)/i.test(message || "");
    let extractedProposal: { titulo?: string; objetivo?: string } = {};

    if (isUserAcceptance) {
      extractedProposal = extractProposalFromHistory(history);
      if (extractedProposal.titulo && !sanitizedInitialData.titulo) {
        sanitizedInitialData.titulo = extractedProposal.titulo;
      }
      if (extractedProposal.objetivo && !sanitizedInitialData.objetivo) {
        sanitizedInitialData.objetivo = extractedProposal.objetivo;
      }
    }

    const fieldsListStr = aiFields && aiFields.length > 0
      ? aiFields.map((f: any) => \`- Clave: "\${f.key}", Campo: "\${f.label}" (\${f.field_type})\${f.field_type === 'select' && f.options && f.options.length > 0 ? \` [Opciones permitidas: \${f.options.join(', ')}]\` : ''}\${f.ai_instructions ? \` [Instrucciones: \${f.ai_instructions}]\` : ''}\`).join("\\n")
      : \`- Título de la iniciativa.\\n- Fecha requerida (y consecuencia de no tenerlo en fecha).\\n- Descripción del problema o desafío (Situación actual).\\n- ¿Es un proceso nuevo?\\n- Proceso y áreas impactadas.\\n- Usuarios beneficiados.\\n- Pilar estratégico.\\n- Beneficio cuantitativo (anual).\\n- Beneficio cualitativo.\\n- ¿Es proyecto SPO?\\n- ¿Qué escenarios de pruebas debemos considerar?\`;

    const tOrqId = await startAgentTask("Orquestador", "Procesando mensaje de chat");
    const tPoId = await startAgentTask("Product Owner", "Analizando respuestas de la iniciativa");

    if (!isApiKeyConfigured()) {
      await updateAgentTask(tOrqId, 100, 'completed');
      await updateAgentTask(tPoId, 100, 'completed');
      return res.json({
        text: getMockChatResponse(history, sanitizedInitialData, message),
        options: getMockOptions(history, message),
        extractedFields: extractedProposal
      });
    }

    try {
      await updateAgentTask(tOrqId, 40, 'in_progress');
      await updateAgentTask(tPoId, 60, 'in_progress');
      const training = await getTrainingConfig();
      const systemPrompt = buildSystemPrompt(training);

      const tRegId = await startAgentTask("Regulador de Tokens", "Validando seguridad y tokens");
      const isInitialGreeting = message === "[INICIALIZAR_CHAT]";
      const chatPrompt = isInitialGreeting
        ? \`\${systemPrompt}

Este es el INICIO de la conversación con el usuario. El usuario acaba de abrir la ventana del asistente Teo.
Saluda amablemente al usuario, preséntate como Teo (Analista de Negocio Senior) e invítalo a describir en sus propias palabras cuál es la necesidad o el problema de negocio que desea abordar. NO asumas que ya ha dado detalles ni hagas preguntas secundarias sobre objetivos todavía.

IMPORTANTE: Responde SIEMPRE en formato JSON estricto con la siguiente estructura:
{
  "text": "¡Hola! Para poder estructurar tu iniciativa, por favor, describe la necesidad o el problema que deseas abordar en tus propias palabras. Así podré entender mejor el contexto y ayudarte a definir los siguientes pasos.",
  "options": []
}\`
        : \`\${systemPrompt}

Datos iniciales proporcionados por el usuario:
\${Object.entries(sanitizedInitialData || {}).map(([k, v]) => \`\${k}: \${v}\`).join("\\n")}

Asegúrate de recolectar al menos la siguiente información (si no está en los datos iniciales). Es VITAL que no existan campos en blanco ni respuestas vacías al finalizar la iniciativa:
\${fieldsListStr}

Historial de conversación:
\${history.map((h: any) => \`\${h.role === 'user' ? 'Usuario' : 'Asistente'}: \${h.text}\`).join("\\n")}

Usuario: \${message}

REGLAS DE INTERACCIÓN (CUMPLE ESTRICTAMENTE LOS GUARDARRIELES CARGADOS EN EL SISTEMA):
1. DATOS EXISTENTES Y NO REPETICIÓN: NUNCA preguntes por datos que ya están en los 'Datos iniciales proporcionados por el usuario' (como institucion, vicepresidencia, direccion, etc.) ni en el 'Historial de conversación'. NUNCA repitas la misma pregunta que el Asistente formuló en el mensaje inmediatamente anterior. Si el usuario ya te dio una respuesta (ej. eligió una opción o escribió una palabra), procesa su respuesta y avanza directamente al siguiente campo pendiente.
2. PROPUESTA DE TÍTULO Y OBJETIVO: \${history.length === 0 && message.length > 80
  ? \`⚠️ ACCIÓN INMEDIATA: El mensaje del usuario YA contiene su descripción. Tu tarea ahora: analizar el mensaje y proponer un **Título** (verbo infinitivo: Implementar, Automatizar, Integrar, Optimizar...) y un **Objetivo** concretos. Preséntaselos con negritas markdown y pregunta si está de acuerdo. En "options" solo: ["Sí, estoy de acuerdo", "Quiero ajustarlo"].\`
  : \`Cuando el usuario te brinde la descripción de su necesidad por primera vez (y el título esté vacío), NO le pidas que redacte el título. Formula TÚ MISMO un Título (con verbo en infinitivo) y un Objetivo, y preséntaselos para su conformidad.\`}
3. ACEPTACIÓN DE PROPUESTA: \${
  isUserAcceptance && (sanitizedInitialData.titulo || extractedProposal.titulo)
    ? \`El usuario YA ACEPTÓ la propuesta de Título ("\${sanitizedInitialData.titulo || extractedProposal.titulo}") y Objetivo ("\${sanitizedInitialData.objetivo || extractedProposal.objetivo}"). Queda ESTRICTAMENTE PROHIBIDO volver a proponer el título y objetivo o preguntar si el usuario está de acuerdo. Avanza INMEDIATAMENTE a consultar el siguiente campo pendiente (por ejemplo: la fecha requerida de implementación).\`
    : 'Si el usuario acepta la propuesta de título y objetivo, confirma brevemente y pasa al siguiente campo.'
}
4. SEGUIMIENTO DE GUARDARRIELES: Aplica estrictamente los Guardarrieles configurados arriba en la base de datos (respuestas directas y acotadas, sin repetir bloques de texto que el usuario ya respondió, proponiendo las opciones sugeridas para campos de selección, y convirtiendo trimestres a fechas exactas).
5. CONTINUIDAD: Avanza paso a paso de forma fluida proponiendo o validando la información para los campos requeridos. Incluye la etiqueta '[INFORMACION_COMPLETA]' únicamente cuando se hayan recopilado o acordado los datos de todos los campos obligatorios.

IMPORTANTE: Responde SIEMPRE en formato JSON estricto con la siguiente estructura:
{
  "text": "Tu respuesta respetando los guardarrieles. Si ya se completaron todos los puntos, incluye '[INFORMACION_COMPLETA]'.",
  "options": ["Opción sugerida 1", "Opción sugerida 2"]
}\`;

      let rawChat = "";
      try {
        rawChat = await callAIForJSON(chatPrompt);
      } catch (e: any) {
        console.warn("[AI Chat] callAIForJSON exception:", e.message);
      }

      let parsed: any = null;
      if (rawChat && rawChat.trim() !== "{}" && rawChat.trim() !== "") {
        try { parsed = parseAIJSON(rawChat); } catch (e) { console.warn("[AI Chat] parseAIJSON exception:", e); }
      }

      if (!parsed || !parsed.text) {
        console.log("[AI Chat] Remote AI rate limited or unavailable. Executing local intelligent chat fallback.");
        parsed = {
          text: getMockChatResponse(history, sanitizedInitialData, message),
          options: getMockOptions(history, message)
        };
      }

      await updateAgentTask(tOrqId, 100, 'completed', { action: "Orquestación de la conversación", user_message: message });
      await updateAgentTask(tPoId, 100, 'completed', { action: "Análisis de contexto", ai_response: parsed });
      await updateAgentTask(tRegId, 100, 'completed', { action: "Validación de tokens usados" });

      res.json({
        text: parsed.text,
        options: parsed.options || [],
        extractedFields: extractedProposal
      });
    } catch (e: any) {
      console.error("Chat handler fallback to mock:", e.message);
      await updateAgentTask(tOrqId, 100, 'completed', { error: e.message });
      await updateAgentTask(tPoId, 100, 'completed', { error: e.message });
      res.json({
        text: getMockChatResponse(history, sanitizedInitialData, message),
        options: getMockOptions(history, message),
        extractedFields: extractedProposal
      });
    }
  });

  `;

content = content.substring(0, oldChatRouteStart) + newChatRoute + content.substring(oldChatRouteEnd);

// 2. Also check Groq models in callAIForJSON
content = content.replace('"llama-3.1-8b-instant"', '"llama-3.3-70b-versatile"');

fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Applied bulletproof fallback to /api/chat in server.ts');
