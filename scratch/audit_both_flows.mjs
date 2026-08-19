import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function runAudit() {
  console.log("==================================================");
  console.log("🚀 STARTING COMPREHENSIVE AUDIT OF BOTH FLOWS");
  console.log("==================================================");

  // ─────────────────────────────────────────────────────────────
  // TEST 1: FLOW A - "Yo tengo todo claro" (/api/fields/analyze-unstructured)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- [TEST 1] Flow A: /api/fields/analyze-unstructured ---");
  try {
    const resA = await fetch(`${BASE_URL}/api/fields/analyze-unstructured`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Necesitamos automatizar el proceso de aprobación de créditos y reducir el tiempo de respuesta de 48h a 2h para la Vicepresidencia Comercial."
      })
    });
    console.log("Flow A Status:", resA.status);
    const dataA = await resA.json();
    console.log("Flow A Values:", JSON.stringify(dataA.values, null, 2));
    console.log("Flow A Warnings count:", Object.keys(dataA.warnings || {}).length);
    if (!dataA.values || !dataA.values.titulo) {
      console.error("❌ FAIL: Flow A did not extract title!");
    } else {
      console.log("✅ PASS: Flow A extracted title successfully.");
    }
  } catch (err) {
    console.error("❌ FAIL: Flow A exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 2: FLOW B - Step 1: Initializing Chat (/api/chat)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- [TEST 2] Flow B: Step 1 - Initializing Chat ---");
  try {
    const resB1 = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: [],
        message: "[INICIALIZAR_CHAT]",
        initialData: {
          institucion: "Laureate Perú",
          vicepresidencia: "Comercial",
          direccion: "Ventas"
        },
        aiFields: []
      })
    });
    console.log("Flow B1 Status:", resB1.status);
    const dataB1 = await resB1.json();
    console.log("Flow B1 Response Text:", dataB1.text);
    console.log("Flow B1 Options:", dataB1.options);
    if (!dataB1.text || dataB1.text.includes("Error")) {
      console.error("❌ FAIL: Flow B1 chat initialization failed!");
    } else {
      console.log("✅ PASS: Flow B1 chat initialized successfully.");
    }
  } catch (err) {
    console.error("❌ FAIL: Flow B1 exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 3: FLOW B - Step 2: User provides description
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- [TEST 3] Flow B: Step 2 - User description ---");
  let historyB = [];
  try {
    const userMsg = "Queremos implementar una plataforma web para la gestión automatizada de iniciativas de TI.";
    historyB.push({ role: "user", text: userMsg });

    const resB2 = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: [],
        message: userMsg,
        initialData: {
          institucion: "Laureate Perú",
          vicepresidencia: "Comercial",
          direccion: "Ventas"
        },
        aiFields: []
      })
    });
    console.log("Flow B2 Status:", resB2.status);
    const dataB2 = await resB2.json();
    console.log("Flow B2 Response Text:", dataB2.text);
    console.log("Flow B2 Options:", dataB2.options);
    console.log("Flow B2 Extracted Proposal:", dataB2.extractedFields);

    historyB.push({ role: "model", text: dataB2.text });
  } catch (err) {
    console.error("❌ FAIL: Flow B2 exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 4: FLOW B - Step 3: User accepts proposal
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- [TEST 4] Flow B: Step 3 - User acceptance ---");
  try {
    const userAcceptMsg = "Sí, estoy de acuerdo";

    const resB3 = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: historyB,
        message: userAcceptMsg,
        initialData: {
          institucion: "Laureate Perú",
          vicepresidencia: "Comercial",
          direccion: "Ventas",
          titulo: "Implementar plataforma web para gestión de iniciativas",
          objetivo: "Automatizar el flujo de registro y aprobación de iniciativas de TI"
        },
        aiFields: []
      })
    });
    console.log("Flow B3 Status:", resB3.status);
    const dataB3 = await resB3.json();
    console.log("Flow B3 Response Text:", dataB3.text);
    console.log("Flow B3 Options:", dataB3.options);
  } catch (err) {
    console.error("❌ FAIL: Flow B3 exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 5: FLOW B - Step 4: Summarize (/api/summarize)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- [TEST 5] Flow B: Step 4 - Summarize ---");
  try {
    const resSum = await fetch(`${BASE_URL}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: historyB,
        initialData: {
          institucion: "Laureate Perú",
          vicepresidencia: "Comercial",
          direccion: "Ventas"
        },
        aiFields: []
      })
    });
    console.log("Summarize Status:", resSum.status);
    const dataSum = await resSum.json();
    console.log("Summarized Result:", JSON.stringify(dataSum, null, 2));
  } catch (err) {
    console.error("❌ FAIL: Summarize exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Save Draft (/api/initiatives/draft)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- [TEST 6] Save Draft ---");
  try {
    const resDraft = await fetch(`${BASE_URL}/api/initiatives/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft: {
          form_data: {
            titulo: "Test Initiative Draft",
            vicepresidencia: "Comercial",
            direccion: "Ventas"
          },
          status: "Borrador"
        }
      })
    });
    console.log("Save Draft Status:", resDraft.status);
    const dataDraft = await resDraft.json();
    console.log("Save Draft Result:", dataDraft);
  } catch (err) {
    console.error("❌ FAIL: Save Draft exception:", err.message);
  }

  console.log("\n==================================================");
  console.log("🏁 AUDIT COMPLETED");
  console.log("==================================================");
}

runAudit();
