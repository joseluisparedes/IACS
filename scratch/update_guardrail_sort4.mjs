import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();
const { createClient } = require(path.join(process.cwd(), 'node_modules', '@supabase/supabase-js'));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Actualizar guardarriel SORT 4 - "Proponer Título y Objetivo en lugar de pedirlos"
// El problema: Teo re-pedía descripción aunque el usuario ya la había dado en el mismo mensaje
const updatedContent = `REGLA CRÍTICA — Propuesta inmediata de Título y Objetivo:

CASO 1 — Usuario abre el chat sin haber escrito nada todavía:
Saluda cordialmente, preséntate como Teo y pídele que describa su necesidad o problema en sus propias palabras. No hagas preguntas adicionales todavía.

CASO 2 — El mensaje actual del usuario contiene una descripción del problema (aunque el historial esté vacío o sea el primer mensaje):
INMEDIATAMENTE analiza el contenido del mensaje y formula una propuesta de Título y Objetivo. NO vuelvas a pedir que describa el problema. El usuario ya te lo dijo. Proceder a proponer es OBLIGATORIO.

El Título DEBE comenzar con verbo en infinitivo: Implementar, Automatizar, Integrar, Optimizar, Desarrollar, Migrar, etc.

Formato de respuesta (OBLIGATORIO para propuesta de Título y Objetivo):
- En "text": presenta el título y objetivo con negritas markdown dentro del mensaje, seguido de "¿Estás de acuerdo con esta propuesta?"
- En "options": solo ["Sí, estoy de acuerdo", "Quiero ajustarlo"]
- NUNCA pongas el texto del título o del objetivo como botones en "options"

CASO 3 — El usuario dice "Sí, de acuerdo" o "Aceptar" o similar:
Registra el Título y Objetivo propuestos y avanza INMEDIATAMENTE al siguiente campo sin repetir la propuesta ni volver a preguntar por el título.`;

const { error } = await supabase
  .from('ai_training_config')
  .update({ content: updatedContent, updated_at: new Date().toISOString() })
  .eq('id', 'a0369422-31e1-4ad6-985f-7601d812ab0e');

if (error) console.error('❌ ERROR:', error.message);
else console.log('✅ Guardarriel SORT 4 actualizado correctamente');

// También actualizar el guardarriel de identidad (SORT 0 - identity) para reforzar la conducta
const { data: identity } = await supabase.from('ai_training_config').select('id, content').eq('layer', 'identity').single();
if (identity) {
  console.log('Identidad actual:', identity.content.substring(0, 100));
}

console.log('\nVerificando estado final de guardarrieles críticos...');
const { data: rails } = await supabase.from('ai_training_config')
  .select('sort_order, title, is_active')
  .eq('layer', 'guardrails')
  .order('sort_order');
rails.forEach(r => console.log(`  [${r.is_active ? '✅' : '❌'}] SORT ${r.sort_order}: ${r.title}`));
