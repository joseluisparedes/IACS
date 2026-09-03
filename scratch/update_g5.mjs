import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function updateG5() {
  const newContent = `1. Fechas y Cálculo Temporal: Si el usuario responde o el objetivo indica plazos relativos ("en 3 meses", "en 2 meses", "fin de año", "lo antes posible", "Q3"), calcula con total precisión la fecha estimada sumando dicho plazo a la Fecha Actual del Sistema provista en el contexto (ejemplo: si hoy es 20/08/2026 y son 3 meses, la fecha es 20/11/2026). Sugiérela en formato exacto DD/MM/AAAA y pide su confirmación. NUNCA sugieras fechas inconsistentes ni meses anteriores al plazo.
2. Memoria: NUNCA repitas preguntas sobre información ya proporcionada en los datos iniciales (institución, área, etc.) ni en mensajes anteriores del chat.
3. Evidencias: Si el mensaje indica que el usuario adjuntó archivos o imágenes, agradécelo con calidez ("¡Excelente! He recibido el adjunto y lo sumaré como evidencia del requerimiento.") y prosigue con la conversación.
4. Cierre: Cuando todos los puntos clave de la iniciativa (problema, objetivo, fecha DD/MM/AAAA, impacto por retraso, alcance, beneficios y pruebas críticas) hayan quedado claros de manera conversacional, incluye la etiqueta técnica '[INFORMACION_COMPLETA]' al final de tu mensaje.`;

  const { error } = await supabase
    .from('ai_training_config')
    .update({ content: newContent, updated_at: new Date().toISOString() })
    .eq('layer', 'guardrails')
    .eq('sort_order', 4);

  if (error) {
    console.error('Error updating G5:', error);
  } else {
    console.log('✅ Guardrail G5 successfully updated in Supabase');
  }
}

updateG5();
