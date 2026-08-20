import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require(path.join(process.cwd(), 'node_modules', 'dotenv')).config();

async function testChat() {
  console.log('🧪 Probando respuesta del BOT Teo ante un pedido real de usuario...\n');

  const payload = {
    message: "Hola Teo, en el área de admisión los asesores pierden muchísimo tiempo validando manualmente los comprobantes de pago de los alumnos que quieren matricularse para el nuevo ciclo. Muchos alumnos se quejan porque tardan hasta 2 días en confirmarles la vacante.",
    history: [],
    initialData: {
      institucion: "UPN",
      vicepresidencia: "Operaciones",
      direccion: "Admisiones",
      registrador: "Juan Pérez"
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
    console.log('=== RESPUESTA DE TEO ===');
    console.log('Texto:\n', data.text);
    console.log('\nOpciones interactivas:\n', data.options);
    console.log('\nCampos extraídos:', data.extractedFields);
  } catch (err) {
    console.error('Error al probar chat:', err.message);
  }
}

testChat();
