const path = require('path');
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();

function extractProposalFromHistory(history) {
  if (!history || !Array.isArray(history)) return {};
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === 'model' && msg.text) {
      const text = msg.text;
      const tMatch = text.match(/Título\s*[-:]\s*['"“]?([^'"”]+?)['"”]?\s*(?:,\s*Objetivo|\s+Objetivo)/i) || text.match(/Título\s*[-:]\s*['"“]?([^'"”]+)/i);
      const oMatch = text.match(/Objetivo\s*[-:]\s*['"“]?([^'"”]+?)(?:['"”]?\s*\.|\?|$)/i);
      if (tMatch || oMatch) {
        return {
          titulo: tMatch ? tMatch[1].trim() : undefined,
          objetivo: oMatch ? oMatch[1].trim() : undefined,
        };
      }
    }
  }
  return {};
}

function testFlow() {
  const assistantProposal = "Basándome en la información proporcionada, te propongo el siguiente título y objetivo para tu iniciativa: Título - 'Implementar un proceso de depuración de la base de contactos para mejorar la calidad de la información', Objetivo - 'Mejorar la efectividad de las campañas outbound mediante la eliminación de números inalcanzables en UPN'. ¿Estás de acuerdo con esta propuesta o deseas realizar algún ajuste?";
  
  const history = [
    { role: 'user', text: 'Queremos depurar la base de datos de UPN que tiene 35% de números inalcanzables.' },
    { role: 'model', text: assistantProposal }
  ];

  const userMessage = "Sí, estoy de acuerdo";

  const isUserAcceptance = /^\s*(sí|si|de acuerdo|estoy de acuerdo|acepto|conforme|ok|perfecto|adelante|excelente)/i.test(userMessage);

  console.log('Is Acceptance:', isUserAcceptance);

  if (isUserAcceptance) {
    const extracted = extractProposalFromHistory(history);
    console.log('Extracted Proposal:', extracted);
    if (extracted.titulo && extracted.objetivo) {
      console.log('SUCCESS: Title and Objective extracted and closed!');
    } else {
      console.error('FAILED to extract!');
    }
  }
}

testFlow();
