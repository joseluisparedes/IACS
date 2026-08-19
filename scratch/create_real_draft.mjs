import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();
const { createClient } = require(path.join(process.cwd(), 'node_modules', '@supabase/supabase-js'));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function createDraftInitiative() {
  const userId = '07ef0edb-06c6-4945-bfdc-08572d199117'; // contacto.intrusosgamers@gmail.com
  const initiativeId = 'INIT-UPN-' + Date.now().toString(36).toUpperCase();

  const formData = {
    institucion: 'UPN',
    vicepresidencia: 'Comercial',
    direccion: 'Central de Admisión',
    registrador: 'Contacto Intrusos Gamers',
    solicitante: 'Gerente de Admisión y Canales Outbound UPN',
    titulo: 'Implementar un proceso escalable de depuración e integración API con e-Contact para la base de contactos inalcanzables',
    objetivo: 'Optimizar el rendimiento de las campañas comerciales outbound mediante la identificación y eliminación automatizada de números con respuesta SIP 480/404 en la base de datos de 2 millones de contactos de UPN, reduciendo costos operativos y mejorando la tasa de contacto efectivo.',
    descripcion_problema: 'Actualmente, la base de datos comercial de UPN cuenta con aproximadamente 2.1 millones de registros de contactos para campañas de admisión y fidelización. Los análisis de tráfico telefónico muestran que entre el 30% y 35% de los números marcados devuelven errores SIP 480 (Temporarily Unavailable) o SIP 404 (Not Found). Esta situación genera pérdidas financieras directas estimadas en S/ 180,000 anuales por minutos de telefonía desperdiciados, saturación ineficiente de los discadores automáticos del call center, desgaste de la fuerza de ventas outbound y distorsión en la analítica de conversión de leads. Se requiere urgentemente implementar una solución de limpieza masiva vía API conectada con la plataforma e-Contact.',
    fecha_requerida: '31/12/2026',
    consecuencia_no_fecha: 'Imposibilidad de cumplir con las metas de matriculación del ciclo 2026-2 y desperdicio presupuestal en campañas outbound durante el Q4.',
    es_proceso_nuevo: 'Sí',
    procesos_impactados: 'Central de Admisión, Telemarketing Outbound, Inteligencia de Negocios, Gestión de Canales Digitales y TI Operaciones.',
    usuarios_beneficiados: 'Más de 120 ejecutivos de ventas de la Central de Admisión de UPN, analistas de marketing comercial y supervisores de telemarketing.',
    pilar_estrategico: 'Excelencia Operativa y Eficiencia Comercial',
    beneficio_cuantitativo: 'Ahorro económico directo estimado de S/ 185,000 anuales en costos de telefonía y aumento del 18% en la tasa de contacto efectivo de la fuerza comercial.',
    beneficio_cualitativo: 'Mayor precisión de la información de contactos, incremento de la productividad del equipo de admisión, reportes de trazabilidad en tiempo real y mejor experiencia de interacción con postulantes.',
    es_proyecto_spo: 'No',
    escenarios_prueba: '1. Prueba de integración API en ambiente Sandbox con un lote controlado de 10,000 contactos.\n2. Validación de respuesta SIP 480/404 y marcado de flags en base de datos CRM.\n3. Prueba de carga con flujo continuo de 100,000 solicitudes por hora.\n4. Verificación de conciliación de reportes entre e-Contact y la Central de Admisión.'
  };

  const summary = {
    titulo: formData.titulo,
    objetivo: formData.objetivo,
    institucion: formData.institucion,
    vicepresidencia: formData.vicepresidencia,
    direccion: formData.direccion,
    beneficio_cuantitativo: formData.beneficio_cuantitativo
  };

  const history = [
    { role: 'model', text: '¡Hola! Para poder estructurar tu iniciativa, por favor, describe la necesidad o el problema que deseas abordar en tus propias palabras.' },
    { role: 'user', text: formData.descripcion_problema },
    { role: 'model', text: `Basándome en la información proporcionada, te propongo el siguiente título y objetivo para tu iniciativa: Título - '${formData.titulo}', Objetivo - '${formData.objetivo}'. ¿Estás de acuerdo con esta propuesta o deseas realizar algún ajuste?` },
    { role: 'user', text: 'Sí, estoy de acuerdo' },
    { role: 'model', text: '¡Excelente! He registrado el Título y Objetivo. He recopilado toda la información requerida de manera completa. [INFORMACION_COMPLETA]' }
  ];

  const draftRecord = {
    id: initiativeId,
    form_data: formData,
    summary: summary,
    chat_history: history,
    status: 'Borrador',
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('Creando Borrador en Supabase para:', userId);
  const { data, error } = await supabase.from('initiatives').insert([draftRecord]).select().single();

  if (error) {
    console.error('❌ ERROR AL CREAR BORRADOR:', error.message);
  } else {
    console.log('=================================================');
    console.log('✅ BORRADOR CREADO CON ÉXITO EN SUPABASE:');
    console.log('   - ID de Iniciativa:', data.id);
    console.log('   - Estado:', data.status);
    console.log('   - Usuario asignado:', userId, '(contacto.intrusosgamers@gmail.com)');
    console.log('   - VP:', data.form_data.vicepresidencia);
    console.log('   - Dirección:', data.form_data.direccion);
    console.log('   - Título:', data.form_data.titulo);
    console.log('=================================================');
  }
}

createDraftInitiative();
