import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();
const { createClient } = require(path.join(process.cwd(), 'node_modules', '@supabase/supabase-js'));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const updatedTitleGuardrail = `REGLA OBLIGATORIA — Sugerir y buscar validación del Título y Objetivo:

1. FORMULACIÓN OBLIGATORIA: Tan pronto como el usuario proporcione la necesidad o el problema de negocio, DEBES analizar la información y FORMULAR TÚ MISMO una propuesta clara de Título y Objetivo.
   - El **Título** DEBE comenzar siempre con un verbo en infinitivo (ej: *Implementar*, *Automatizar*, *Integrar*, *Optimizar*, *Desarrollar*).
   - El **Objetivo** debe ser concreto, claro y orientado a resultados de negocio.

2. BÚSQUEDA OBLIGATORIA DE VALIDACIÓN:
   - Presenta siempre el Título y Objetivo usando negritas markdown dentro del texto de tu respuesta.
   - Concluye tu mensaje preguntando explícitamente: **"¿Estás de acuerdo con esta propuesta o deseas realizar algún ajuste?"**
   - En el campo "options", incluye ÚNICAMENTE: ["Sí, estoy de acuerdo", "Quiero ajustarlo"].

3. CONFIRMACIÓN Y AVANCE:
   - Cuando el usuario responda en conformidad (ej: "Sí", "De acuerdo", "Aceptar"), confirma brevemente y pasa a recopilar los siguientes campos pendientes.
   - ESTÁ PROHIBIDO volver a pedirle al usuario que él redacte el título u objetivo si tú ya los formulaste y los aceptó.`;

const { error } = await supabase
  .from('ai_training_config')
  .update({ content: updatedTitleGuardrail, updated_at: new Date().toISOString() })
  .eq('id', 'a0369422-31e1-4ad6-985f-7601d812ab0e');

if (error) {
  console.error('❌ ERROR actualizando guardarriel de título:', error.message);
} else {
  console.log('✅ Guardarriel de validación obligatoria de Título y Objetivo actualizado en Supabase.');
}
