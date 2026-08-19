import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();
const { createClient } = require(path.join(process.cwd(), 'node_modules', '@supabase/supabase-js'));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const content = `Cuando propongas el Título y Objetivo de la iniciativa, NUNCA los incluyas como items del array "options". Los options son ÚNICAMENTE botones de acción cortos que el usuario puede pulsar.

El formato CORRECTO y OBLIGATORIO es:

"text": "Basándome en lo que describes, propongo lo siguiente:\n\n**Título:** Implementar un proceso de depuración escalable...\n\n**Objetivo:** Optimizar el rendimiento de las campañas outbound...\n\n¿Estás de acuerdo con esta propuesta?"

"options": ["Sí, estoy de acuerdo", "Quiero ajustarlo"]

NUNCA hagas esto (PROHIBIDO):
"options": ["Implementar un proceso de...", "Automatizar la depuración de..."]

El título y objetivo van siempre dentro del campo "text" con formato markdown (negrita). Los "options" son solo etiquetas cortas de botones de respuesta.`;

const { data, error } = await supabase.from('ai_training_config').insert([{
  layer: 'guardrails',
  title: 'Formato correcto para propuesta de Título y Objetivo',
  content,
  sort_order: 14,
  is_active: true,
  source: 'manual'
}]).select().single();

if (error) console.error('ERROR:', error.message);
else console.log('✅ Guardarriel insertado:', data.title, '| ID:', data.id);
