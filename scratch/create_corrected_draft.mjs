import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();
const { createClient } = require(path.join(process.cwd(), 'node_modules', '@supabase/supabase-js'));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Primero eliminar el borrador anterior mal creado
await supabase.from('initiatives').delete().eq('id', 'INIT-UPN-MSCO1ZTP');
console.log('🧹 Borrador previo mal creado eliminado.');

const userId = '07ef0edb-06c6-4945-bfdc-08572d199117'; // contacto.intrusosgamers@gmail.com
const initiativeId = 'INIT-REAL-' + Date.now().toString(36).toUpperCase();

// form_data con las CLAVES EXACTAS de la tabla initiative_fields
const formData = {
  // Campos de cabecera (Paso 1)
  institucion: 'UPN',
  vicepresidencia: 'Comercial',
  direccion: 'Central de Admisión',
  registrador: 'Usuario registrador de pruebas',
  solicitante: 'Gerente de la Central de Admisión Ciclos 2026 - UPN Lima Norte',

  // Campos completados por el chat con Teo (Paso 2) — claves exactas del DB
  titulo: 'Implementar un proceso escalable de depuración e integración API con e-Contact para erradicar números inalcanzables en la base de contactos de UPN',

  objetivo: 'Optimizar el rendimiento de las campañas comerciales outbound mediante la identificación y eliminación automatizada de números con respuesta SIP 480 y 404 en la base de datos de 2.1 millones de contactos de UPN, reduciendo costos operativos en al menos un 20% y mejorando la tasa de contacto efectivo de la fuerza de admisión en al menos un 18%.',

  descripcion_de_la_necesidad: 'La Central de Admisión de UPN ejecuta diariamente campañas outbound de telemarketing dirigidas a prospectos, postulantes y alumnos de continuidad. La base de contactos activa cuenta con aproximadamente 2.1 millones de registros distribuidos entre las 6 sedes de Lima y provincias. Análisis de tráfico de los últimos 3 ciclos académicos muestran que entre el 30% y el 35% de los números marcados devuelven errores SIP 480 (Temporarily Unavailable) y SIP 404 (Not Found), lo que equivale a más de 700,000 registros inútiles que están siendo marcados en vano. Esto genera un impacto directo en la eficiencia del equipo (más de 120 ejecutivos), un desperdicio estimado en S/ 185,000 anuales en costos de telefonía SIP, saturación de los discadores automáticos de la plataforma e-Contact, distorsión en los reportes de conversión de leads y frustración del equipo comercial al no poder cumplir sus cuotas de contacto. Se requiere implementar urgentemente una solución de limpieza y depuración masiva de la base de contactos mediante integración API directa con la plataforma e-Contact, que permita identificar en tiempo real los números inválidos y marcarlos automáticamente para su exclusión de las campañas.',

  descripcin_del_problema_o_desafo_situacin_actual: 'El problema central radica en que la base de datos de contactos de UPN carece de un mecanismo automatizado de validación y depuración. Actualmente, los ejecutivos de ventas realizan entre 80 y 100 llamadas diarias, de las cuales entre 24 y 35 terminan en error SIP sin conexión real con el prospecto. Esta situación impacta directamente en: (1) La moral y productividad del equipo de admisión, que desperdicia entre el 30% y 35% de su tiempo de marcación en registros inválidos. (2) El costo de telefonía SIP que se incrementa cada ciclo porque los minutos fallidos igual se contabilizan como intentos de contacto. (3) La calidad del dato en el CRM, que acumula historial de llamadas sobre números inexistentes distorsionando métricas de conversión. (4) La capacidad de e-Contact para procesar colas de marcación de forma eficiente, ya que el discador no descarta automáticamente los registros SIP 480/404 entre campañas.',

  fecha_requerida: '2026-12-31',

  qu_pasa_si_no_lo_tenemos_en_esta_fecha: 'No contar con esta solución para el cierre del año académico 2026 implicará que las campañas del ciclo de admisión 2027-1 (que inician en octubre de 2026) continúen operando con la misma base contaminada. Esto representaría perder la ventana crítica de captación de nuevos alumnos para el primer semestre 2027, con un impacto estimado en ingreso matriculado de entre S/ 800,000 y S/ 1,200,000, además de no poder cumplir la cuota de eficiencia operativa comprometida con la Vicepresidencia Comercial para el cierre del año fiscal 2026.',

  es_un_proceso_nuevo: 'Sí',

  proceso_y_areas_impactadas: 'Directamente impactados: Central de Admisión (todas las sedes), Telemarketing Outbound, Gestión de Canales Digitales. Indirectamente impactados: Business Intelligence y Planeamiento (reportes de conversión de leads), Innovación Comercial y Tecnología (configuración de e-Contact), TI Operaciones (mantenimiento del CRM y base de datos), Operaciones y Soporte Comercial (auditoría de calidad de campañas).',

  usuarios_beneficiados: 'Administrativos',

  pilar_estratgico: 'Excelencia operativa',

  beneficio_cuantitativo_anual: 'Entre S/100,000.00 y S/500,000.00',

  beneficio_cualitativo: 'Mejora sustancial en la precisión y confiabilidad de la base de datos de contactos de UPN. Incremento de la productividad y motivación del equipo de admisión al reducir el tiempo desperdiciado en números inválidos. Mejora en la experiencia del prospecto al no recibir llamadas de números desconectados o rebotados. Optimización de la capacidad de procesamiento del discador e-Contact. Reportes de conversión de leads más precisos y accionables para la toma de decisiones comerciales estratégicas. Reducción del churn operativo del equipo de ventas por objetivos de llamadas más alcanzables.',

  es_proyecto_spo: 'No',

  qu_escenarios_de_pruebas_debemos_considerar: 'Escenario 1 - Prueba de Integración API en Sandbox: Configurar ambiente de prueba con e-Contact e integrar el endpoint de validación de números sobre un lote controlado de 10,000 contactos de la base real, verificando que los números con respuesta SIP 480 y SIP 404 sean identificados, etiquetados y excluidos correctamente de las colas de marcación activas.\n\nEscenario 2 - Prueba de Marcado Automático de Flags en CRM: Verificar que por cada número identificado como inválido, el CRM actualice automáticamente el campo de estado del contacto a "INALCANZABLE" y excluya el registro de todas las listas de distribución activas sin requerir intervención manual del operador.\n\nEscenario 3 - Prueba de Carga y Volumen: Ejecutar la depuración sobre un lote de 100,000 registros en un período de 2 horas, midiendo el rendimiento de la API, la latencia de respuesta, el consumo de recursos en el servidor y la estabilidad del servicio sin degradación del discador automático en producción.\n\nEscenario 4 - Prueba de Conciliación de Reportes: Validar que los reportes de tasa de contacto efectivo generados en e-Contact y en el CRM reflejen correctamente el incremento en la tasa de conexión efectiva y la reducción de intentos fallidos, comparando métricas de una campaña piloto antes y después de la depuración.',
};

// Historial de conversación real y extenso que simula el chat con Teo turno a turno
const chatHistory = [
  {
    role: 'model',
    text: '¡Hola! Soy Teo, tu Analista de Negocio Senior. Estoy aquí para ayudarte a estructurar tu iniciativa de manera clara y completa. Por favor, describe en tus propias palabras cuál es la necesidad o el problema de negocio que deseas abordar. No te preocupes por el formato, cuéntamelo con toda la información que tengas.'
  },
  {
    role: 'user',
    text: 'Tenemos un problema grave en la Central de Admisión. Nuestra base de contactos de UPN tiene aproximadamente 2.1 millones de registros para campañas outbound, pero entre el 30 y 35 por ciento de esos números son inválidos y devuelven errores SIP. Nuestros más de 120 ejecutivos de ventas pierden entre el 30 y 35 por ciento de su tiempo de marcación en números que nunca van a responder. Esto nos cuesta aproximadamente S/ 185,000 anuales solo en telefonía desperdiciada, sin contar el impacto en motivación del equipo y en los reportes de conversión distorsionados. Necesitamos una solución para limpiar esa base usando la plataforma e-Contact que ya tenemos instalada.'
  },
  {
    role: 'model',
    text: 'Entiendo perfectamente la situación. Es un problema que afecta directamente la productividad del equipo comercial y la eficiencia del gasto operativo. Basándome en lo que describes, te propongo el siguiente Título y Objetivo para tu iniciativa:\n\nTítulo: "Implementar un proceso escalable de depuración e integración API con e-Contact para erradicar números inalcanzables en la base de contactos de UPN"\n\nObjetivo: "Optimizar el rendimiento de las campañas comerciales outbound mediante la identificación y eliminación automatizada de números con respuesta SIP 480 y 404 en la base de datos de 2.1 millones de contactos de UPN, reduciendo costos operativos en al menos un 20% y mejorando la tasa de contacto efectivo de la fuerza de admisión en al menos un 18%."\n\n¿Estás de acuerdo con esta propuesta o deseas realizar algún ajuste?',
    options: ['Sí, estoy de acuerdo', 'Deseo realizar algún ajuste']
  },
  {
    role: 'user',
    text: 'Sí, estoy de acuerdo'
  },
  {
    role: 'model',
    text: '¡Perfecto! Título y Objetivo quedan registrados. Ahora necesito profundizar en el problema para estructurarlo correctamente. ¿Puedes describirme con más detalle cuál es la situación actual que genera esta necesidad? Por ejemplo: ¿desde cuándo ocurre este problema, qué análisis se han hecho, cuáles son los sistemas involucrados?'
  },
  {
    role: 'user',
    text: 'El problema viene desde hace por lo menos 3 ciclos académicos. Tenemos el discador e-Contact que no descarta automáticamente los registros SIP 480/404 entre campañas, entonces los mismos números inválidos se marcan una y otra vez. El CRM tampoco actualiza el estado del contacto automáticamente cuando hay un fallo SIP. Los ejecutivos hacen entre 80 y 100 llamadas diarias y entre 24 y 35 de esas terminan en error sin contacto real. Además los reportes de conversión se distorsionan porque el CRM cuenta esos intentos fallidos como actividad comercial válida.'
  },
  {
    role: 'model',
    text: 'Muy claro, eso es exactamente lo que necesitaba. Queda registrada la descripción técnica del problema. Siguiente punto: ¿cuál es la fecha requerida para tener implementada esta solución, y qué consecuencias tendría no tenerla lista en esa fecha?'
  },
  {
    role: 'user',
    text: 'Necesitamos tenerlo listo antes del cierre del año 2026, específicamente para diciembre. Si no lo tenemos para esa fecha, las campañas de captación del ciclo 2027-1 que empiezan en octubre van a operar con la misma base contaminada. Eso representaría perder la ventana crítica de admisión del primer semestre 2027, con un impacto en ingreso matriculado de entre S/ 800,000 y S/ 1,200,000.'
  },
  {
    role: 'model',
    text: 'Registrado: fecha requerida diciembre 2026 con impacto estimado en S/ 800,000 a S/ 1,200,000 si no se cumple. Ahora bien, ¿este proceso de depuración automatizada con e-Contact es un proceso nuevo para UPN, o es una mejora sobre algo que ya existe?',
    options: ['Sí, es un proceso completamente nuevo', 'No, es una mejora a un proceso existente']
  },
  {
    role: 'user',
    text: 'Sí, es un proceso completamente nuevo. Actualmente la depuración se hace de forma manual y esporádica por el equipo de TI, no hay nada automatizado ni integrado con e-Contact.'
  },
  {
    role: 'model',
    text: 'Entendido, es un proceso nuevo. ¿Cuáles son los procesos y áreas que se verán impactadas por esta iniciativa, tanto directa como indirectamente?'
  },
  {
    role: 'user',
    text: 'Directamente: Central de Admisión en todas las sedes, Telemarketing Outbound y Gestión de Canales Digitales. Indirectamente: Business Intelligence y Planeamiento para los reportes de conversión, Innovación Comercial y Tecnología para la configuración de e-Contact, TI Operaciones para el mantenimiento del CRM, y Operaciones y Soporte Comercial para la auditoría de calidad de las campañas.'
  },
  {
    role: 'model',
    text: 'Perfecto, quedan registradas todas las áreas. ¿Cuál es el pilar estratégico con el que se alinea esta iniciativa?',
    options: ['Crecimiento escalable', 'Excelencia operativa', 'Excelencia académica', 'Experiencia', 'Student Success y Empleabilidad', 'Ninguno']
  },
  {
    role: 'user',
    text: 'Excelencia operativa'
  },
  {
    role: 'model',
    text: 'Muy bien. Ahora, respecto al beneficio cuantitativo anual estimado de esta iniciativa, ¿en qué rango se encuentra?',
    options: ['Mayor a S/500,000.00', 'Entre S/100,000.00 y S/500,000.00', 'Menor a S/100,000.00', 'No cuantificado o S/0']
  },
  {
    role: 'user',
    text: 'Entre S/100,000.00 y S/500,000.00, considerando el ahorro en telefonía más el impacto en ingresos.'
  },
  {
    role: 'model',
    text: 'Registrado. Además del beneficio económico, ¿cuáles son los beneficios cualitativos que esperas obtener con esta iniciativa?'
  },
  {
    role: 'user',
    text: 'Mejora sustancial en la calidad de la base de datos, incremento en la productividad y motivación del equipo de admisión al reducir el tiempo en llamadas inútiles, mejor experiencia del prospecto al no recibir llamadas rebotadas, optimización de la capacidad del discador e-Contact, reportes de conversión más precisos y accionables, y reducción del churn operativo del equipo de ventas porque sus objetivos de llamadas van a ser más alcanzables.'
  },
  {
    role: 'model',
    text: '¡Excelentes beneficios! ¿Esta iniciativa está dentro de un proyecto SPO ya registrado?',
    options: ['Sí', 'No']
  },
  {
    role: 'user',
    text: 'No, no está dentro de un proyecto SPO.'
  },
  {
    role: 'model',
    text: 'Entendido. Por último, ¿qué escenarios de prueba deberíamos considerar para validar que la solución funciona correctamente antes de salir a producción?'
  },
  {
    role: 'user',
    text: 'Cuatro escenarios: primero, una prueba de integración API en sandbox con e-Contact sobre un lote de 10,000 contactos reales para verificar que los SIP 480/404 se identifiquen y excluyan correctamente. Segundo, una prueba de marcado automático de flags en el CRM para validar que los contactos inválidos se etiqueten como INALCANZABLE y se excluyan de todas las listas activas. Tercero, una prueba de carga con 100,000 registros en 2 horas midiendo latencia, rendimiento de API y estabilidad del discador. Cuarto, una prueba de conciliación de reportes comparando métricas de una campaña piloto antes y después de la depuración.'
  },
  {
    role: 'model',
    text: '¡Perfecto! He recopilado toda la información necesaria de manera completa. Aquí tienes el resumen de tu iniciativa:\n\n✅ Título: Implementar un proceso escalable de depuración e integración API con e-Contact para erradicar números inalcanzables en la base de contactos de UPN\n✅ Objetivo: Reducción de costos operativos en 20% y mejora del 18% en tasa de contacto efectivo\n✅ Fecha: Diciembre 2026\n✅ Pilar Estratégico: Excelencia operativa\n✅ Beneficio Cuantitativo: Entre S/100,000.00 y S/500,000.00\n✅ 4 escenarios de prueba definidos\n\n[INFORMACION_COMPLETA]'
  }
];

const summary = {
  titulo: formData.titulo,
  objetivo: formData.objetivo,
  institucion: formData.institucion,
  vicepresidencia: formData.vicepresidencia,
  direccion: formData.direccion,
  beneficio_cuantitativo_anual: formData.beneficio_cuantitativo_anual,
  pilar_estratgico: formData.pilar_estratgico,
  fecha_requerida: formData.fecha_requerida,
};

const draftRecord = {
  id: initiativeId,
  form_data: formData,
  summary: summary,
  chat_history: chatHistory,
  status: 'Borrador',
  user_id: userId,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

console.log('Insertando borrador corregido para contacto.intrusosgamers@gmail.com...');
const { data, error } = await supabase.from('initiatives').insert([draftRecord]).select().single();

if (error) {
  console.error('❌ ERROR:', error.message);
} else {
  console.log('=================================================');
  console.log('✅ BORRADOR REAL CREADO EXITOSAMENTE EN SUPABASE:');
  console.log('   ID:', data.id);
  console.log('   Estado:', data.status);
  console.log('   Usuario:', userId);
  console.log('   VP:', data.form_data.vicepresidencia);
  console.log('   Dirección:', data.form_data.direccion);
  console.log('   Pilar:', data.form_data.pilar_estratgico);
  console.log('   Beneficio Cuant.:', data.form_data.beneficio_cuantitativo_anual);
  console.log('   Turns de chat:', chatHistory.length);
  console.log('=================================================');
}
