import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();

async function testTurn3() {
  console.log('🧪 Probando Turno 3 (Usuario selecciona fecha, Teo indaga impacto/riesgo)...\n');

  const payload = {
    message: "En 2 meses (20/10/2026)",
    history: [
      {
        role: "user",
        text: "Hola Teo, en el área de admisión los asesores pierden muchísimo tiempo validando manualmente los comprobantes de pago de los alumnos que quieren matricularse para el nuevo ciclo. Muchos alumnos se quejan porque tardan hasta 2 días en confirmarles la vacante."
      },
      {
        role: "assistant",
        text: "**Título:** Automatizar la validación de comprobantes de pago para acelerar la confirmación de vacantes\n\n**Objetivo:** Reducir el tiempo de validación de pagos de 2 días a menos de 15 minutos, mejorando la experiencia del estudiante y liberando tiempo del equipo de admisiones.\n\n¿Estás de acuerdo con esta propuesta o prefieres ajustarla?"
      },
      {
        role: "user",
        text: "Sí, estoy de acuerdo con el título y objetivo"
      },
      {
        role: "assistant",
        text: "Entiendo la urgencia de agilizar la confirmación de vacantes. Para poder planificar el proyecto, ¿qué fecha te parece adecuada para tener la solución operativa?"
      }
    ],
    initialData: {
      institucion: "UPN",
      vicepresidencia: "Operaciones",
      direccion: "Admisiones",
      registrador: "Juan Pérez",
      titulo: "Automatizar la validación de comprobantes de pago para acelerar la confirmación de vacantes",
      objetivo: "Reducir el tiempo de validación de pagos de 2 días a menos de 15 minutos, mejorando la experiencia del estudiante y liberando tiempo del equipo de admisiones."
    },
    aiFields: []
  };

  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('=== RESPUESTA DE TEO (TURNO 3) ===');
    console.log('Texto:\n', data.text);
    console.log('\nOpciones interactivas:\n', data.options);
  } catch (err) {
    console.error('Error al probar turno 3:', err.message);
  }
}

testTurn3();
