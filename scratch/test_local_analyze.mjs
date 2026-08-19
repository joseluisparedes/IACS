import fetch from 'node-fetch';

async function testLocal() {
  try {
    const res = await fetch("http://localhost:3000/api/fields/analyze-unstructured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Necesitamos automatizar el proceso de facturación electrónica e integrar la firma digital para la Vicepresidencia Comercial."
      })
    });

    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Test error:", err);
  }
}

testLocal();
