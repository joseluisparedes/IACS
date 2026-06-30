/**
 * Test de conectividad con SharePoint via Microsoft Graph API
 * Ejecutar con: node test_sharepoint.mjs
 */

// ─── CREDENCIALES (rellenar con los datos de Azure AD) ────────────────────────
const TENANT_ID     = process.env.AZURE_TENANT_ID     || "TU_TENANT_ID";
const CLIENT_ID     = process.env.AZURE_CLIENT_ID     || "TU_CLIENT_ID";
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || "TU_CLIENT_SECRET";

// Info del SharePoint
const SHAREPOINT_HOST   = "educorpperu.sharepoint.com";
const SHAREPOINT_SITE   = "/sites/ITCS";              // Ruta del sitio
const UPLOAD_FOLDER     = "IACS-Test";                 // Carpeta de prueba a crear

// ─── UTILS ────────────────────────────────────────────────────────────────────
function ok(msg)   { console.log(`  OK: ${msg}`); }
function fail(msg) { console.error(`  FAIL: ${msg}`); }
function info(msg) { console.log(`  INFO: ${msg}`); }

// ─── PASO 1: Obtener token OAuth2 ─────────────────────────────────────────────
async function getAccessToken() {
  console.log("\n[Paso 1] Obteniendo token de acceso de Azure AD...");
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         "https://graph.microsoft.com/.default",
  });

  const res = await fetch(url, { method: "POST", body });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(`Token error: ${data.error_description || data.error || 'Unknown'}`);
  }
  ok(`Token obtenido. Expira en ${data.expires_in}s`);
  return data.access_token;
}

// ─── PASO 2: Obtener ID del sitio de SharePoint ───────────────────────────────
async function getSiteId(token) {
  console.log(`\n[Paso 2] Buscando sitio SharePoint: ${SHAREPOINT_HOST}${SHAREPOINT_SITE}...`);
  const url = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_HOST}:${SHAREPOINT_SITE}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(`Site error: ${JSON.stringify(data.error || data)}`);
  }
  ok(`Sitio encontrado: "${data.displayName}" (ID: ${data.id})`);
  return data.id;
}

// ─── PASO 3: Obtener el Drive (Document Library) ─────────────────────────────
async function getDriveId(token, siteId) {
  console.log(`\n[Paso 3] Obteniendo librería de documentos del sitio...`);
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(`Drive error: ${JSON.stringify(data.error || data)}`);
  }
  ok(`Drive encontrado: "${data.name}" (ID: ${data.id})`);
  return data.id;
}

// ─── PASO 4: Crear carpeta de prueba ─────────────────────────────────────────
async function createTestFolder(token, siteId, driveId) {
  console.log(`\n[Paso 4] Creando carpeta de prueba: "${UPLOAD_FOLDER}"...`);
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children`;
  const body = JSON.stringify({
    name: UPLOAD_FOLDER,
    folder: {},
    "@microsoft.graph.conflictBehavior": "rename",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(`Folder error: ${JSON.stringify(data.error || data)}`);
  }
  ok(`Carpeta creada/encontrada: "${data.name}" -> ${data.webUrl}`);
  return data.id;
}

// ─── PASO 5: Subir archivo de prueba ─────────────────────────────────────────
async function uploadTestFile(token, siteId, driveId) {
  const filename = `test-iacs-${Date.now()}.txt`;
  const content = `Prueba de conectividad IACS <-> SharePoint\nFecha: ${new Date().toISOString()}\nEste archivo puede eliminarse.`;

  console.log(`\n[Paso 5] Subiendo archivo de prueba: "${filename}"...`);
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${UPLOAD_FOLDER}/${filename}:/content`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: content,
  });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(`Upload error: ${JSON.stringify(data.error || data)}`);
  }
  ok(`Archivo subido exitosamente!`);
  info(`URL del archivo: ${data.webUrl}`);
  return data.webUrl;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("  TEST: Conectividad IACS -> SharePoint (Microsoft Graph API)");
  console.log("=".repeat(60));

  if (TENANT_ID === "TU_TENANT_ID" || CLIENT_ID === "TU_CLIENT_ID") {
    console.error("\nERROR: Faltan las credenciales. Ejecutar con:");
    console.error("   $env:AZURE_TENANT_ID='...'; $env:AZURE_CLIENT_ID='...'; $env:AZURE_CLIENT_SECRET='...'; node test_sharepoint.mjs");
    process.exit(1);
  }

  try {
    const token   = await getAccessToken();
    const siteId  = await getSiteId(token);
    const driveId = await getDriveId(token, siteId);
    await createTestFolder(token, siteId, driveId);
    await uploadTestFile(token, siteId, driveId);

    console.log("\n" + "=".repeat(60));
    console.log("  TODOS LOS PASOS EXITOSOS");
    console.log("  La integracion con SharePoint esta lista para implementar.");
    console.log("=".repeat(60) + "\n");
  } catch (err) {
    console.error("\n" + "=".repeat(60));
    console.error("  ERROR EN LA PRUEBA");
    console.error(`  ${err.message}`);
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  }
}

main();
