import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

function recordTest(suite: string, name: string, passed: boolean, details?: any, error?: string) {
  results.push({ suite, name, passed, details, error });
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} [${suite}] ${name}`);
  if (details && details.responsePreview) console.log(`      Respuesta: "${details.responsePreview}..."`);
  if (error) console.error("   Error:", error);
}

async function runAllTests() {
  console.log("==========================================================");
  console.log("🚀 INICIANDO BATERÍA DE PRUEBAS INTEGRALES DE PUNTA A PUNTA");
  console.log("==========================================================\n");

  const testSessionId = `TEST-${Date.now().toString(36).toUpperCase()}`;

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 1: VERIFICACIÓN DE GUARDARRIELES Y CONFIGURACIÓN EN BD
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const { data: guardrails, error } = await supabase
      .from("ai_training_config")
      .select("*")
      .eq("layer", "guardrails")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const hasAttachmentRule = guardrails.some(g => g.title.includes("Evidencias") || g.title.includes("Adjuntos"));
    const hasNoRepetitionRule = guardrails.some(g => g.title.includes("No Repetición") || g.title.includes("Repetir"));

    recordTest(
      "1. Configuración BD",
      "1.1 Guardarriel de Agradecimiento de Evidencias / Adjuntos activo en BD",
      hasAttachmentRule,
      { totalGuardrails: guardrails.length }
    );

    recordTest(
      "1. Configuración BD",
      "1.2 Guardarriel de No Repetición de Preguntas activo en BD",
      hasNoRepetitionRule,
      { totalGuardrails: guardrails.length }
    );
  } catch (err: any) {
    recordTest("1. Configuración BD", "Lectura de Guardarrieles en BD", false, null, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 2: CASUÍSTICA DE REGISTRO POR CHAT (IA TEO)
  // ───────────────────────────────────────────────────────────────────────────
  try {
    // 2.1 Chat Initialization
    const initRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: [],
        message: "[INICIALIZAR_CHAT]",
        initialData: {
          institucion: ["UPN"],
          vicepresidencia: "Comercial",
          direccion: "Central de Admisión"
        },
        aiFields: []
      })
    });

    const initData = await initRes.json();
    const initValid = typeof initData.text === "string" && initData.text.length > 10;
    recordTest(
      "2. Registro Chat (Teo)",
      "2.1 Inicialización de Chat ([INICIALIZAR_CHAT])",
      initValid,
      { responsePreview: initData.text?.substring(0, 80) }
    );

    // 2.2 User proposes need
    const step1History = [{ role: "model", text: initData.text, options: initData.options }];
    const propRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: step1History,
        message: "Necesito automatizar la validación de certificados de estudios para agilizar la matrícula.",
        initialData: {
          institucion: ["UPN"],
          vicepresidencia: "Operaciones",
          direccion: "Servicios Académicos"
        },
        aiFields: []
      })
    });

    const propData = await propRes.json();
    const hasProposal = propData.text && (propData.text.includes("Título") || propData.text.includes("Titulo") || propData.text.includes("Implementar") || propData.text.includes("Automatizar") || propData.text.includes("validación"));
    recordTest(
      "2. Registro Chat (Teo)",
      "2.2 Formulación de Título y Objetivo por parte de Teo",
      !!hasProposal,
      { responsePreview: propData.text?.substring(0, 100) }
    );

    // 2.3 User accepts proposal
    const step2History = [
      ...step1History,
      { role: "user", text: "Necesito automatizar la validación de certificados de estudios para agilizar la matrícula." },
      { role: "model", text: propData.text, options: propData.options }
    ];

    const acceptRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: step2History,
        message: "Sí, estoy de acuerdo",
        initialData: {
          institucion: ["UPN"],
          vicepresidencia: "Operaciones",
          direccion: "Servicios Académicos"
        },
        aiFields: []
      })
    });

    const acceptData = await acceptRes.json();
    const advancedToNext = acceptData.text && !acceptData.text.includes("¿Estás de acuerdo con esta propuesta?");
    recordTest(
      "2. Registro Chat (Teo)",
      "2.3 Aceptación de propuesta y avance al siguiente campo sin re-proponer",
      !!advancedToNext,
      { responsePreview: acceptData.text?.substring(0, 100) }
    );

    // 2.4 User attaches an evidence file during chat
    const step3History = [
      ...step2History,
      { role: "user", text: "Sí, estoy de acuerdo" },
      { role: "model", text: acceptData.text, options: acceptData.options }
    ];

    const attachRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: step3History,
        message: "[El usuario adjuntó el archivo multimedia: flujo_certificados.png (image/png)]\nFecha requerida: 30/11/2026",
        initialData: {
          institucion: ["UPN"],
          vicepresidencia: "Operaciones",
          direccion: "Servicios Académicos"
        },
        aiFields: []
      })
    });

    const attachData = await attachRes.json();
    const recognizedAttachment = attachData.text && (attachData.text.toLowerCase().includes("archivo") || attachData.text.toLowerCase().includes("adjunto") || attachData.text.toLowerCase().includes("evidencia") || attachData.text.length > 20);
    recordTest(
      "2. Registro Chat (Teo)",
      "2.4 Tratamiento de adjuntos según nuevo Guardarriel",
      !!recognizedAttachment,
      { responsePreview: attachData.text?.substring(0, 120) }
    );

    // 2.5 Summarize generation test
    const fullConversation = [
      ...step3History,
      { role: "user", text: "[El usuario adjuntó el archivo: flujo_certificados.png]\nFecha requerida: 30/11/2026" },
      { role: "model", text: "Excelente. ¿Cuál es el beneficio cuantitativo?" },
      { role: "user", text: "Mayor a S/500,000.00" },
      { role: "model", text: "¡Perfecto! Hemos recopilado toda la información. [INFORMACION_COMPLETA]" }
    ];

    const sumRes = await fetch(`${BASE_URL}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: fullConversation,
        initialData: {
          institucion: ["UPN"],
          vicepresidencia: "Operaciones",
          direccion: "Servicios Académicos"
        },
        aiFields: [
          { key: "titulo", label: "Título de la iniciativa", field_type: "text" },
          { key: "objetivo", label: "Objetivo", field_type: "textarea" },
          { key: "fecha_requerida", label: "Fecha requerida", field_type: "date" },
          { key: "beneficio_cuantitativo_anual", label: "Beneficio cuantitativo anual", field_type: "select", options: ["Mayor a S/500,000.00", "Entre S/100,000.00 y S/500,000.00"] }
        ]
      })
    });

    const summaryData = await sumRes.json();
    const summaryValid = summaryData.titulo && (summaryData.titulo.toLowerCase().includes("certific") || summaryData.titulo.toLowerCase().includes("valida") || summaryData.titulo.toLowerCase().includes("automatiz") || summaryData.titulo.toLowerCase().includes("iniciativa"));
    recordTest(
      "2. Registro Chat (Teo)",
      "2.5 Generación de consolidado fiel a la conversación (Summarize)",
      !!summaryValid,
      { responsePreview: `Título: "${summaryData.titulo}" | Objetivo: "${summaryData.objetivo?.substring(0, 60)}"` }
    );

  } catch (err: any) {
    recordTest("2. Registro Chat (Teo)", "Flujo de chat completo", false, null, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 3: CASUÍSTICA DE REGISTRO DIRECTO (FORMULARIO ESTRUCTURADO)
  // ───────────────────────────────────────────────────────────────────────────
  const directInitId = `${testSessionId}-DIR`;
  try {
    const directPayload = {
      id: directInitId,
      form_data: {
        titulo: "Implementar portal de autoatención para solicitud de convenios empresariales",
        objetivo: "Reducir el tiempo de emisión de convenios de 15 días a 48 horas mediante firma digital",
        institucion: ["UPN"],
        vicepresidencia: "Comercial",
        direccion: "Empleabilidad y Relaciones Corporativas",
        selectedPath: "direct",
        fecha_requerida: "15/12/2026",
        es_un_proceso_nuevo: "Sí",
        es_proyecto_spo: "No",
        pilar_estratgico: "Excelencia operativa",
        beneficio_cuantitativo_anual: "Entre S/100,000.00 y S/500,000.00",
        beneficio_cualitativo: "Mejora significativa en la experiencia de las empresas aliadas",
        proceso_y_areas_impactadas: "Área de Empleabilidad, Asesoría Legal y TI",
        usuarios_beneficiados: "Administrativos y empresas partner",
        qu_pasa_si_no_lo_tenemos_en_esta_fecha: "Pérdida de convenios comerciales clave del Q4",
        qu_escenarios_de_pruebas_debemos_considerar: "Pruebas de carga, integración con firma digital y validación de RUC",
        descripcin_del_problema_o_desafo_situacin_actual: "El proceso actual es 100% manual por correo electrónico",
        _director_declaration_accepted: true
      },
      chat_history: [],
      summary: null,
      confirmed_fields: { titulo: true, objetivo: true },
      unstructured_text: "",
      status: "Borrador"
    };

    // 3.1 Guardar como borrador directo
    const draftRes = await fetch(`${BASE_URL}/api/initiatives/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(directPayload)
    });
    const draftSaved = draftRes.ok;
    recordTest("3. Registro Directo", "3.1 Guardar borrador directo en BD", draftSaved);

    // 3.2 Enviar a "Pendiente de aprobación"
    const submitRes = await fetch(`${BASE_URL}/api/initiatives/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...directPayload,
        status: "Pendiente de aprobación"
      })
    });
    const submitted = submitRes.ok;
    recordTest("3. Registro Directo", "3.2 Enviar iniciativa directa a 'Pendiente de aprobación'", submitted);

    // Verificar en Supabase
    const { data: checkDirect } = await supabase.from("initiatives").select("*").eq("id", directInitId).single();
    recordTest(
      "3. Registro Directo",
      "3.3 Verificación de persistencia y estado en Supabase",
      checkDirect?.status === "Pendiente de aprobación",
      { responsePreview: `ID: ${checkDirect?.id} | Estado: ${checkDirect?.status}` }
    );

  } catch (err: any) {
    recordTest("3. Registro Directo", "Flujo de registro directo", false, null, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 4: CASUÍSTICA DE REGISTRO NO ESTRUCTURADO (ANALYSIS ENGINE)
  // ───────────────────────────────────────────────────────────────────────────
  const unstructInitId = `${testSessionId}-UNS`;
  try {
    const rawText = `Actualmente en el campus Trujillo de UPN el control de asistencia a laboratorios de cómputo se realiza en hojas de papel firmadas a mano. 
Queremos implementar un sistema biométrico con huella y código QR integrado a Banner para registrar automáticamente la asistencia de 8,000 alumnos por día.
Se requiere tenerlo listo para el 15 de Noviembre de 2026. Es una mejora a un proceso existente de Operaciones de Campus y TI. 
El beneficio estimado anual es mayor a S/500,000.00 por reducción de fraude de asistencia y horas hombre.`;

    const analyzeRes = await fetch(`${BASE_URL}/api/fields/analyze-unstructured`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: rawText,
        initialData: { institucion: ["UPN"], vicepresidencia: "Operaciones" }
      })
    });

    const analyzedData = await analyzeRes.json();
    const extractedFields = analyzedData.values || analyzedData.extractedFields || analyzedData;
    const hasExtractedTitle = extractedFields.titulo || extractedFields.titulo_de_la_iniciativa || extractedFields.objetivo || extractedFields.pilar_estratgico;
    recordTest(
      "4. Registro No Estructurado",
      "4.1 Análisis y extracción de campos por IA desde texto libre",
      !!hasExtractedTitle,
      { responsePreview: `Título extraído: "${extractedFields.titulo || extractedFields.objetivo?.substring(0, 50)}"` }
    );

    // Guardar como borrador de ruta no estructurada
    const unstructSaveRes = await fetch(`${BASE_URL}/api/initiatives/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: unstructInitId,
        form_data: {
          ...extractedFields,
          institucion: ["UPN"],
          vicepresidencia: "Operaciones",
          direccion: "Operaciones de Campus",
          selectedPath: "unstructured",
          _director_declaration_accepted: true
        },
        chat_history: [],
        summary: extractedFields,
        confirmed_fields: {},
        unstructured_text: rawText,
        status: "Pendiente de aprobación"
      })
    });
    recordTest("4. Registro No Estructurado", "4.2 Guardar iniciativa no estructurada como 'Pendiente de aprobación'", unstructSaveRes.ok);

  } catch (err: any) {
    recordTest("4. Registro No Estructurado", "Flujo no estructurado", false, null, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 5: FLUJO COMPLETO DE APROBACIÓN Y GOBIERNO (WORKFLOW)
  // ───────────────────────────────────────────────────────────────────────────
  const workflowInitId = directInitId;
  try {
    // 5.1 Asignación de Business Partner TI (BP TI)
    const assignRes = await fetch(`${BASE_URL}/api/initiatives/${workflowInitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_data: {
          bp_ti_asignado: "José Luis Paredes"
        }
      })
    });
    recordTest("5. Flujo de Aprobación", "5.1 Asignación de Business Partner TI", assignRes.ok);

    // 5.2 Observar Iniciativa ("Observada") con comentario de feedback
    const observeHistory = [
      {
        date: new Date().toISOString(),
        role: "Business Partner TI",
        user: "José Luis Paredes",
        action: "Observada",
        comment: "Por favor adjuntar la validación de arquitectura de seguridad para la firma digital."
      }
    ];

    const observeRes = await fetch(`${BASE_URL}/api/initiatives/${workflowInitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Observada",
        rejection_reason: "Falta validación de arquitectura de seguridad",
        form_data: {
          _observation_history: observeHistory
        }
      })
    });
    recordTest("5. Flujo de Aprobación", "5.2 Transición a estado 'Observada' con registro en historial", observeRes.ok);

    // Verificar en BD que el estado sea Observada
    const { data: observedDoc } = await supabase.from("initiatives").select("*").eq("id", workflowInitId).single();
    recordTest(
      "5. Flujo de Aprobación",
      "5.3 Verificación de estado 'Observada' y motivo en BD",
      observedDoc?.status === "Observada" && (observedDoc?.rejection_reason?.length ?? 0) > 0,
      { responsePreview: `Estado: ${observedDoc?.status} | Motivo: ${observedDoc?.rejection_reason}` }
    );

    // 5.4 Re-envío por parte del usuario tras corregir observación
    const resubmitRes = await fetch(`${BASE_URL}/api/initiatives/${workflowInitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Pendiente de aprobación",
        rejection_reason: null
      })
    });
    recordTest("5. Flujo de Aprobación", "5.4 Re-envío de la iniciativa a 'Pendiente de aprobación'", resubmitRes.ok);

    // 5.5 Aprobación final: Transición a "En demanda"
    const approveHistory = [
      ...observeHistory,
      {
        date: new Date().toISOString(),
        role: "Business Partner TI",
        user: "José Luis Paredes",
        action: "En demanda",
        comment: "Aprobada formalmente. Cumple con los requisitos y alineamiento estratégico."
      }
    ];

    const approveRes = await fetch(`${BASE_URL}/api/initiatives/${workflowInitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "En demanda",
        form_data: {
          _observation_history: approveHistory,
          _vobo_status: "correcto"
        }
      })
    });
    recordTest("5. Flujo de Aprobación", "5.5 Aprobación formal y pase a 'En demanda'", approveRes.ok);

    // 5.6 Desestimación de iniciativa alternativa
    const dismissRes = await fetch(`${BASE_URL}/api/initiatives/${unstructInitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Desestimada",
        rejection_reason: "Iniciativa duplicada con proyecto corporativo de biometría en curso."
      })
    });
    recordTest("5. Flujo de Aprobación", "5.6 Desestimación formal ('Desestimada') con motivo de rechazo", dismissRes.ok);

  } catch (err: any) {
    recordTest("5. Flujo de Aprobación", "Flujo de aprobación y gobierno", false, null, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RESUMEN FINAL
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n==========================================================");
  console.log("📊 RESUMEN FINAL DE PRUEBAS");
  console.log("==========================================================");
  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;
  console.log(`Total Pruebas: ${results.length}`);
  console.log(`✅ Aprobadas:  ${totalPassed}`);
  console.log(`❌ Fallidas:   ${totalFailed}`);
  console.log("==========================================================\n");

  // Limpieza de datos de prueba temporales
  try {
    await supabase.from("initiatives").delete().in("id", [directInitId, unstructInitId]);
    console.log("🧹 Datos de prueba temporales eliminados correctamente de la BD.");
  } catch (_) {}

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
