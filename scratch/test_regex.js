const text = "Basándome en la información proporcionada, te propongo el siguiente título y objetivo para tu iniciativa: Título - 'Implementar un proceso de depuración de la base de contactos para mejorar la calidad de la información y el rendimiento de las comunicaciones comerciales', Objetivo - 'Mejorar la efectividad de las campañas outbound y reducir los costos operativos mediante la eliminación de números inalcanzables en la base de contactos de UPN'. ¿Estás de acuerdo con esta propuesta o deseas realizar algún ajuste?";

function extractProposal(msg) {
  if (!msg) return {};
  const tMatch = msg.match(/Título\s*[-:]\s*['"“]?([^'"”]+?)['"”]?\s*(?:,\s*Objetivo|\s+Objetivo)/i) || msg.match(/Título\s*[-:]\s*['"“]?([^'"”]+)/i);
  const oMatch = msg.match(/Objetivo\s*[-:]\s*['"“]?([^'"”]+?)(?:['"”]?\s*\.|\?|$)/i);
  return {
    titulo: tMatch ? tMatch[1].trim() : null,
    objetivo: oMatch ? oMatch[1].trim() : null
  };
}

console.log('Extracted:', extractProposal(text));
