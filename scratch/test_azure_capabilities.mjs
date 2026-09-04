import "dotenv/config";
const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://otros-project-resource.cognitiveservices.azure.com/";
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5.1-pruebas";
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
const apiKey = process.env.AZURE_OPENAI_API_KEY || "";
const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

async function callAzure(messages, options = {}) {
  const body = {
    messages,
    max_completion_tokens: options.maxTokens || 1000,
    temperature: options.temperature ?? 0.2,
  };
  if (options.jsonFormat) {
    body.response_format = { type: "json_object" };
  }

  const start = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const duration = Date.now() - start;
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Azure API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    durationMs: duration,
    content: data.choices?.[0]?.message?.content,
    model: data.model,
    tokens: data.usage
  };
}

async function runTests() {
  console.log("=== INICIANDO BANCO DE PRUEBAS DE CAPACIDADES: AZURE OPENAI GPT-5.1 ===\n");

  // TEST 1: Diálogo de Teo (Acompañar y cuestionar en la necesidad con JSON)
  console.log("▶ TEST 1: Rol de Teo (Acompañar y cuestionar necesidad con JSON)");
  try {
    const messages = [
      {
        role: "system",
        content: `Eres Teo, Analista de Negocio Senior de TI en Laureate Perú. Tu misión es guiar al solicitante para madurar su iniciativa tecnológica.
Debes interrogar constructivamente sobre volumen de usuarios, impacto y ROI.
IMPORTANTE: Responde SIEMPRE en formato JSON estricto con:
{
  "text": "Tu respuesta analítica y cuestionadora",
  "options": ["Opción 1", "Opción 2"]
}`
      },
      {
        role: "user",
        content: "Hola Teo, quiero crear un sistema para que los profesores de UPN puedan registrar notas de alumnos desde sus celulares."
      }
    ];

    const res1 = await callAzure(messages, { jsonFormat: true });
    console.log(`✓ Tiempo: ${res1.durationMs}ms`);
    console.log(`✓ Tokens: ${res1.tokens.total_tokens}`);
    const parsed = JSON.parse(res1.content);
    console.log("✓ Respuesta de Teo generada exitosamente:");
    console.log("  Texto:", parsed.text.slice(0, 150) + "...");
    console.log("  Opciones sugeridas:", parsed.options);
    console.log("--------------------------------------------------\n");
  } catch (err) {
    console.error("✗ TEST 1 FALLÓ:", err.message);
  }

  // TEST 2: Segmentación y Estructuración de Documentos para Base de Conocimiento
  console.log("▶ TEST 2: Lectura y estructuración de políticas para Base de Conocimiento");
  try {
    const docText = `
    POLÍTICA INSTITUCIONAL DE SERVICIOS EN LA NUBE
    Toda nueva iniciativa que requiera servidores o bases de datos debe alojarse exclusivamente en Microsoft Azure bajo la suscripción corporativa centralizada.
    Regla: Se prohíbe contratar AWS o Google Cloud sin excepción del CISO.
    Cuestionamiento TEO: Si el usuario menciona hosting externo, advertir la exclusividad de Azure.

    POLÍTICA DE RETENCIÓN DE DATOS ACADÉMICOS
    Los registros de evaluaciones deben conservarse por un periodo mínimo de 5 años según la normativa SUNEDU.
    Regla: No se permite purgar bases de datos históricas de notas.
    `;

    const messages = [
      {
        role: "system",
        content: `Eres un Arquitecto de Información de TI. Divide el siguiente texto en Fichas de Conocimiento autónomas.
NUNCA cortes una regla por la mitad. Responde en JSON con:
{
  "chunks": [
    { "title": "Título descriptivo", "content": "Contenido completo" }
  ]
}`
      },
      { role: "user", content: docText }
    ];

    const res2 = await callAzure(messages, { jsonFormat: true });
    console.log(`✓ Tiempo: ${res2.durationMs}ms`);
    const parsedDoc = JSON.parse(res2.content);
    console.log(`✓ Fichas extraídas: ${parsedDoc.chunks?.length}`);
    parsedDoc.chunks?.forEach((c, idx) => {
      console.log(`  Ficha ${idx + 1}: "${c.title}" (${c.content.length} caracteres)`);
    });
    console.log("--------------------------------------------------\n");
  } catch (err) {
    console.error("✗ TEST 2 FALLÓ:", err.message);
  }

  // TEST 3: Comprensión Visual de Diagramas (Visión Multimodal)
  console.log("▶ TEST 3: Comprensión e interpretación de Diagramas (Visión Multimodal)");
  try {
    // Generar un pequeño diagrama SVG en base64 de un flujo de arquitectura simple
    // Cliente Web -> API Gateway -> Microservicio Pagos -> BD Oracle
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200" viewBox="0 0 600 200">
      <rect width="600" height="200" fill="#f8fafc"/>
      <rect x="20" y="70" width="100" height="60" rx="8" fill="#3b82f6"/>
      <text x="70" y="105" fill="white" font-family="Arial" font-size="12" text-anchor="middle">Portal Web</text>
      <line x1="120" y1="100" x2="180" y2="100" stroke="#64748b" stroke-width="2"/>
      <rect x="180" y="70" width="110" height="60" rx="8" fill="#6366f1"/>
      <text x="235" y="105" fill="white" font-family="Arial" font-size="12" text-anchor="middle">API Gateway WSO2</text>
      <line x1="290" y1="100" x2="350" y2="100" stroke="#64748b" stroke-width="2"/>
      <rect x="350" y="70" width="110" height="60" rx="8" fill="#10b981"/>
      <text x="405" y="105" fill="white" font-family="Arial" font-size="12" text-anchor="middle">Service Pagos</text>
      <line x1="460" y1="100" x2="520" y2="100" stroke="#64748b" stroke-width="2"/>
      <rect x="520" y="70" width="70" height="60" rx="8" fill="#f59e0b"/>
      <text x="555" y="105" fill="white" font-family="Arial" font-size="12" text-anchor="middle">DB Oracle</text>
    </svg>`;
    const svgBase64 = Buffer.from(svg).toString("base64");

    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analiza este diagrama de arquitectura como un Arquitecto de Soluciones de TI. Describe los componentes que ves y explica el flujo de datos paso a paso."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/svg+xml;base64,${svgBase64}`
            }
          }
        ]
      }
    ];

    const res3 = await callAzure(messages);
    console.log(`✓ Tiempo: ${res3.durationMs}ms`);
    console.log("✓ Análisis visual del diagrama completado:");
    console.log(res3.content.slice(0, 300) + "...\n");
    console.log("--------------------------------------------------\n");
  } catch (err) {
    console.error("✗ TEST 3 FALLÓ:", err.message);
  }

  // TEST 4: Evaluación de Reglas y Lógica de Negocio (Workflow Simulator)
  console.log("▶ TEST 4: Evaluación de Reglas de Negocio para Workflows");
  try {
    const messages = [
      {
        role: "system",
        content: "Eres el motor de reglas de IACS. Evalúa si la iniciativa requiere aprobación del Comité de Arquitectura según la regla: 'Si involucra cambios en Banner, requiere aprobación de Arquitectura'."
      },
      {
        role: "user",
        content: "Iniciativa: 'Sincronización automática de notas de Canvas a Banner 9'. ¿Aplica la compuerta de aprobación de Arquitectura? Responde en JSON con: { 'requiereAprobacion': boolean, 'justificacion': string }"
      }
    ];

    const res4 = await callAzure(messages, { jsonFormat: true });
    console.log(`✓ Tiempo: ${res4.durationMs}ms`);
    const parsedRule = JSON.parse(res4.content);
    console.log("✓ Evaluación de regla:", parsedRule);
    console.log("--------------------------------------------------\n");
  } catch (err) {
    console.error("✗ TEST 4 FALLÓ:", err.message);
  }

  console.log("=== CONCLUSIÓN DE TODAS LAS PRUEBAS ===");
}

runTests();
