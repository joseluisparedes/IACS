import { useState } from 'react';
import { 
  Layers, Users, Server, Database, Brain, Mail, FileText, 
  ArrowRight, ArrowDown, GitBranch, Settings, Info, CheckCircle
} from 'lucide-react';

type Level = 'context' | 'container' | 'component';

export default function C4Architecture() {
  const [activeLevel, setActiveLevel] = useState<Level>('context');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Data for Interactive Inspector
  const nodeDetails: Record<string, { title: string; tech?: string; desc: string; responsibilities?: string[] }> = {
    // Level 1: Context
    'user-solicitante': {
      title: 'Key user (Solicitante)',
      desc: 'Usuario final que propone iniciativas de desarrollo de software, completa el formulario dinámico, realiza observaciones e ingresa la justificación y documentos de VoBo (Visto Bueno).',
      responsibilities: ['Crear borradores', 'Subsanar observaciones de campos', 'Cargar VoBo VP', 'Enviar a aprobación']
    },
    'user-bp': {
      title: 'Business Partner (BP TI)',
      desc: 'Evaluador técnico y funcional de TI que revisa las iniciativas correspondientes a sus direcciones asignadas, pudiendo aprobarlas, rechazarlas o sugerir modificaciones.',
      responsibilities: ['Evaluar iniciativas asignadas', 'Aprobar/Desestimar', 'Registrar observaciones en campos específicos', 'Modificar o dar soporte si el key user no está']
    },
    'user-admin': {
      title: 'Administrador (Admin)',
      desc: 'Superusuario responsable de la configuración del sistema, gestión de roles de usuarios, asignación de VP/Direcciones, personalización del formulario y mantenimiento de los agentes de IA.',
      responsibilities: ['Gestionar estructura organizativa', 'Configurar campos dinámicos', 'Entrenar el modelo de IA', 'Monitorear bandeja de correos']
    },
    'system-iacs': {
      title: 'Plataforma IACS (Sistema de Gestión)',
      tech: 'React SPA + Express Server',
      desc: 'El software central que automatiza el flujo de aprobación de iniciativas, ofrece la personalización dinámica de campos de datos y asiste mediante Inteligencia Artificial.',
      responsibilities: ['Presentar interfaz interactiva', 'Validar campos dinámicos en tiempo real', 'Orquestar transiciones de estado', 'Conectarse a servicios externos']
    },
    'ext-supabase': {
      title: 'Supabase Cloud Services',
      tech: 'Backend-as-a-Service',
      desc: 'Plataforma externa que proporciona base de datos PostgreSQL, autenticación de usuarios (Supabase Auth) y políticas de seguridad RLS (Row Level Security).',
      responsibilities: ['Persistencia de datos', 'Autenticación y autorización', 'Envío de señales en tiempo real']
    },
    'ext-sharepoint': {
      title: 'SharePoint Online (MS Graph)',
      tech: 'Microsoft 365 Storage',
      desc: 'Repositorio corporativo de Laureate para el almacenamiento seguro de archivos adjuntos y actas de VoBo, manteniendo únicamente la referencia del enlace en base de datos.',
      responsibilities: ['Almacenar documentos pesados', 'Garantizar seguridad y compliance corporativo']
    },
    'ext-gemini': {
      title: 'IA Engine (Google Gemini API)',
      tech: 'Generative AI LLM',
      desc: 'Servicio de procesamiento de lenguaje natural utilizado para analizar el alcance de las iniciativas, generar resúmenes automáticos y apoyar el entrenamiento del agente.',
      responsibilities: ['Resumir la iniciativa', 'Sugerir clasificaciones de pilares', 'Validar la coherencia de la justificación']
    },
    'ext-smtp': {
      title: 'Servicio de Correo Corporativo',
      tech: 'SMTP / NodeMailer',
      desc: 'Sistema de notificaciones para alertar por correo electrónico a los involucrados cuando se requiere una acción (por ejemplo, nueva iniciativa pendiente para un BP).',
      responsibilities: ['Enviar correos de alertas de estado', 'Notificar asignación de tareas']
    },

    // Level 2: Containers
    'container-spa': {
      title: 'Aplicación Web Frontend (SPA)',
      tech: 'React, Vite, TypeScript, Tailwind CSS',
      desc: 'Contenedor del lado del cliente. Ofrece una experiencia de usuario responsiva, moderna y dinámica (Laureate Style). Carga dinámicamente el layout del formulario basado en las reglas del administrador.',
      responsibilities: ['Renderizar layouts dinámicos', 'Gestión de estado global y vistas', 'Validar formularios del lado del cliente']
    },
    'container-api': {
      title: 'Servidor Backend API',
      tech: 'Node.js, Express, TypeScript',
      desc: 'Contenedor que ejecuta el servidor backend. Maneja la lógica de negocio protegida, expone endpoints REST (`/api/*`), actúa como proxy seguro ante Supabase e integra las llamadas a la IA y SharePoint.',
      responsibilities: ['Endpoints CRUD y Batch', 'Orquestar flujos de integración', 'Middleware de logs de auditoría']
    },
    'container-db': {
      title: 'Base de Datos Relacional',
      tech: 'PostgreSQL (Supabase DB)',
      desc: 'Contenedor de almacenamiento relacional principal. Almacena las tablas de iniciativas, configuraciones de campos, registros de auditoría de correos, perfiles de usuario y relaciones VP-Direcciones.',
      responsibilities: ['Persistencia relacional', 'Ejecución de triggers de base de datos', 'Implementación de seguridad RLS']
    },

    // Level 3: Componentes de Personalización de Datos
    'comp-admin-fields': {
      title: 'Vista: Campos del Formulario (AdminFields.tsx)',
      tech: 'React Component (dnd-kit)',
      desc: 'Componente interactivo que permite al administrador crear, modificar, ocultar o eliminar campos del formulario de iniciativas de manera visual.',
      responsibilities: ['Gestionar tipo de campos (Texto, Fecha, Selector, Adjunto)', 'Definir reglas de obligatoriedad y visibilidad', 'Establecer dependencias entre selectores (options_map)', 'Configurar instrucciones de IA']
    },
    'comp-state-flow': {
      title: 'Vista: Flujo de Estados (StateFlow.tsx)',
      tech: 'React Component',
      desc: 'Componente interactivo que plasma de forma comprensible e interactiva las transiciones de estado, las reglas de negocio, los roles encargados y los entregables de cada macrofase.',
      responsibilities: ['Visualizar estados (Borrador, Pendiente, Observado, Desestimado, En demanda)', 'Mostrar condiciones de transición', 'Desplegar responsabilidades y reglas por rol']
    },
    'comp-fields-api': {
      title: 'Controlador de API de Campos (/api/fields)',
      tech: 'Express Router / server.ts',
      desc: 'Lógica del backend que expone los endpoints CRUD para la personalización de campos de las iniciativas y el reordenamiento batch.',
      responsibilities: ['GET `/api/fields` (Listar ordenados)', 'POST `/api/fields` (Insertar campo)', 'PATCH `/api/fields/:id` (Modificar)', 'POST `/api/fields/reorder-batch` (Reordenamiento masivo)']
    },
    'comp-fields-table': {
      title: 'Tabla Postgres: initiative_fields',
      tech: 'Supabase Table Schema',
      desc: 'Esquema relacional en base de datos que representa la configuración de los campos personalizados y sus metadatos.',
      responsibilities: ['Guardar tipo de campo, clave unica y orden de visualización', 'Almacenar mapas de dependencias y prompts específicos de IA']
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#EEF2FF] text-[#4F5AF5] rounded-xl shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Esquema de Arquitectura C4</h1>
            <p className="text-xs text-[#94A3B8] mt-1 font-medium max-w-2xl">
              Visualización estructurada de la arquitectura del sistema y del módulo de **Personalización de Datos** utilizando el modelo C4. Haz clic en los elementos para inspeccionarlos en detalle.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-[#F1F5F9] p-1 rounded-xl shrink-0 border border-[#E2E8F0] self-start md:self-center">
          <button
            onClick={() => { setActiveLevel('context'); setSelectedNode(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeLevel === 'context'
                ? 'bg-white text-[#4F5AF5] shadow-sm'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Nivel 1: Contexto
          </button>
          <button
            onClick={() => { setActiveLevel('container'); setSelectedNode(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeLevel === 'container'
                ? 'bg-white text-[#4F5AF5] shadow-sm'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Nivel 2: Contenedores
          </button>
          <button
            onClick={() => { setActiveLevel('component'); setSelectedNode(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeLevel === 'component'
                ? 'bg-white text-[#4F5AF5] shadow-sm'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Nivel 3: Componentes
          </button>
        </div>
      </div>

      {/* Main Grid: Diagram Area & Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Diagram Box */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm min-h-[500px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4 mb-4">
            <h2 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider">
              {activeLevel === 'context' && 'Contexto del Sistema (System Context)'}
              {activeLevel === 'container' && 'Diagrama de Contenedores (Containers)'}
              {activeLevel === 'component' && 'Componentes de Personalización de Datos'}
            </h2>
            <span className="text-[10px] bg-[#EEF2FF] text-[#4F5AF5] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
              C4 {activeLevel === 'context' ? 'L1' : activeLevel === 'container' ? 'L2' : 'L3'}
            </span>
          </div>

          {/* Render Diagrams using HTML nodes for rich interactions */}
          <div className="flex-grow flex items-center justify-center py-6 overflow-x-auto">
            {activeLevel === 'context' && (
              <div className="flex flex-col items-center gap-8 w-full max-w-xl">
                
                {/* Users Row */}
                <div className="flex justify-center gap-4 flex-wrap w-full">
                  <button
                    onClick={() => setSelectedNode('user-solicitante')}
                    className={`p-4 rounded-xl border transition-all text-center w-36 shadow-sm ${
                      selectedNode === 'user-solicitante'
                        ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                        : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-[#F8FAFC]'
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto text-[#64748B] mb-2" />
                    <span className="text-xs font-bold text-[#1E293B] block">Key user</span>
                    <span className="text-[9px] text-[#94A3B8] font-semibold mt-0.5 block">Persona (Interno)</span>
                  </button>

                  <button
                    onClick={() => setSelectedNode('user-bp')}
                    className={`p-4 rounded-xl border transition-all text-center w-36 shadow-sm ${
                      selectedNode === 'user-bp'
                        ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                        : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-[#F8FAFC]'
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto text-[#64748B] mb-2" />
                    <span className="text-xs font-bold text-[#1E293B] block">BP TI</span>
                    <span className="text-[9px] text-[#94A3B8] font-semibold mt-0.5 block">Persona (Interno)</span>
                  </button>

                  <button
                    onClick={() => setSelectedNode('user-admin')}
                    className={`p-4 rounded-xl border transition-all text-center w-36 shadow-sm ${
                      selectedNode === 'user-admin'
                        ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                        : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-[#F8FAFC]'
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto text-[#64748B] mb-2" />
                    <span className="text-xs font-bold text-[#1E293B] block">Admin</span>
                    <span className="text-[9px] text-[#94A3B8] font-semibold mt-0.5 block">Persona (Interno)</span>
                  </button>
                </div>

                {/* Arrow down to system */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-semibold text-[#94A3B8] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E2E8F0] mb-1">Interactúan</span>
                  <ArrowDown className="w-4 h-4 text-[#CBD5E1]" />
                </div>

                {/* Central System */}
                <button
                  onClick={() => setSelectedNode('system-iacs')}
                  className={`p-6 rounded-2xl border transition-all text-center w-64 shadow-md bg-gradient-to-br ${
                    selectedNode === 'system-iacs'
                      ? 'from-[#4F5AF5] to-[#3B46D9] text-white border-transparent ring-4 ring-[#4F5AF5]/20'
                      : 'from-[#1E293B] to-[#0F172A] text-white border-transparent hover:scale-105'
                  }`}
                >
                  <Layers className="w-6 h-6 mx-auto mb-2 text-[#EB5F46]" />
                  <span className="text-sm font-bold block">Plataforma IACS</span>
                  <span className="text-[10px] text-slate-350 block mt-1">Sistema de Gestión de Iniciativas</span>
                  <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full inline-block mt-2 font-mono">Software System</span>
                </button>

                {/* Arrow down to dependencies */}
                <div className="flex flex-col items-center">
                  <ArrowDown className="w-4 h-4 text-[#CBD5E1]" />
                  <span className="text-[10px] font-semibold text-[#94A3B8] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E2E8F0] mt-1">Consume / Integra</span>
                </div>

                {/* Dependencies Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                  <button
                    onClick={() => setSelectedNode('ext-supabase')}
                    className={`p-3 rounded-xl border transition-all text-center shadow-sm ${
                      selectedNode === 'ext-supabase'
                        ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                        : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-white'
                    }`}
                  >
                    <Database className="w-4 h-4 mx-auto text-[#00B8B2] mb-1.5" />
                    <span className="text-xs font-bold text-[#1E293B] block">Supabase</span>
                    <span className="text-[8px] text-[#94A3B8] font-bold block uppercase mt-0.5">DB & Auth</span>
                  </button>

                  <button
                    onClick={() => setSelectedNode('ext-sharepoint')}
                    className={`p-3 rounded-xl border transition-all text-center shadow-sm ${
                      selectedNode === 'ext-sharepoint'
                        ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                        : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-white'
                    }`}
                  >
                    <FileText className="w-4 h-4 mx-auto text-[#007FB1] mb-1.5" />
                    <span className="text-xs font-bold text-[#1E293B] block">SharePoint</span>
                    <span className="text-[8px] text-[#94A3B8] font-bold block uppercase mt-0.5">VoBo Files</span>
                  </button>

                  <button
                    onClick={() => setSelectedNode('ext-gemini')}
                    className={`p-3 rounded-xl border transition-all text-center shadow-sm ${
                      selectedNode === 'ext-gemini'
                        ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                        : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-white'
                    }`}
                  >
                    <Brain className="w-4 h-4 mx-auto text-[#4F5AF5] mb-1.5" />
                    <span className="text-xs font-bold text-[#1E293B] block">Gemini API</span>
                    <span className="text-[8px] text-[#94A3B8] font-bold block uppercase mt-0.5">IA Agent</span>
                  </button>

                  <button
                    onClick={() => setSelectedNode('ext-smtp')}
                    className={`p-3 rounded-xl border transition-all text-center shadow-sm ${
                      selectedNode === 'ext-smtp'
                        ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                        : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-white'
                    }`}
                  >
                    <Mail className="w-4 h-4 mx-auto text-[#EB5F46] mb-1.5" />
                    <span className="text-xs font-bold text-[#1E293B] block">Email Service</span>
                    <span className="text-[8px] text-[#94A3B8] font-bold block uppercase mt-0.5">SMTP</span>
                  </button>
                </div>
              </div>
            )}

            {activeLevel === 'container' && (
              <div className="flex flex-col items-center gap-6 w-full max-w-lg">
                
                {/* Browser / User access */}
                <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs font-semibold text-[#64748B]">
                  <Users className="w-4 h-4 text-[#4F5AF5]" />
                  Usuarios acceden por el navegador
                  <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1]" />
                </div>

                {/* React SPA Container */}
                <button
                  onClick={() => setSelectedNode('container-spa')}
                  className={`p-5 rounded-2xl border transition-all text-center w-full max-w-md shadow-sm ${
                    selectedNode === 'container-spa'
                      ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-3 ring-[#4F5AF5]/10'
                      : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] bg-[#E0F2FE] text-[#0369A1] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">React SPA Client</span>
                    <span className="text-[8px] text-[#94A3B8] font-mono">Container</span>
                  </div>
                  <span className="text-sm font-bold text-[#1E293B] block text-left">Aplicación Web Frontend (Vite)</span>
                  <p className="text-xs text-[#64748B] text-left mt-1">
                    Carga el dashboard, bandeja y los paneles de configuración administrativa. Envía peticiones API HTTP y maneja el estado de la UI.
                  </p>
                </button>

                {/* Bidirectional Arrow */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-[#94A3B8]">API Requests / JSON (HTTPS)</span>
                  <div className="flex gap-2">
                    <ArrowDown className="w-4 h-4 text-[#CBD5E1]" />
                  </div>
                </div>

                {/* Express Server Container */}
                <button
                  onClick={() => setSelectedNode('container-api')}
                  className={`p-5 rounded-2xl border transition-all text-center w-full max-w-md shadow-sm ${
                    selectedNode === 'container-api'
                      ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-3 ring-[#4F5AF5]/10'
                      : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] bg-[#FEE2E2] text-[#991B1B] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Node.js Express</span>
                    <span className="text-[8px] text-[#94A3B8] font-mono">Container</span>
                  </div>
                  <span className="text-sm font-bold text-[#1E293B] block text-left">Servidor Backend API</span>
                  <p className="text-xs text-[#64748B] text-left mt-1">
                    Procesa la lógica de negocio, valida autorizaciones de roles, y sirve como pasarela a Supabase, SharePoint y Gemini.
                  </p>
                </button>

                {/* Arrows to Database & Services */}
                <div className="grid grid-cols-2 gap-8 w-full max-w-md mt-2">
                  <div className="flex flex-col items-center">
                    <ArrowDown className="w-4 h-4 text-[#CBD5E1]" />
                    <button
                      onClick={() => setSelectedNode('container-db')}
                      className={`p-4 rounded-xl border transition-all text-center w-full mt-2 shadow-sm ${
                        selectedNode === 'container-db'
                          ? 'border-[#4F5AF5] bg-[#EEF2FF]'
                          : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-[#F8FAFC]'
                      }`}
                    >
                      <Database className="w-5 h-5 mx-auto text-[#00B8B2] mb-1" />
                      <span className="text-xs font-bold text-[#1E293B] block">Supabase DB</span>
                      <span className="text-[8px] text-[#94A3B8] font-mono block uppercase">PostgreSQL</span>
                    </button>
                  </div>

                  <div className="flex flex-col items-center">
                    <ArrowDown className="w-4 h-4 text-[#CBD5E1]" />
                    <div className="w-full bg-slate-50 border border-dashed border-[#E2E8F0] p-4 rounded-xl text-center mt-2 flex flex-col justify-center min-h-[92px]">
                      <Server className="w-4 h-4 mx-auto text-[#64748B] mb-1" />
                      <span className="text-xs font-bold text-[#64748B] block">Sistemas Externos</span>
                      <span className="text-[8px] text-[#94A3B8] uppercase block mt-0.5">Gemini, SharePoint, SMTP</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeLevel === 'component' && (
              <div className="flex flex-col items-center gap-6 w-full max-w-lg">
                <span className="text-xs font-semibold text-[#94A3B8] uppercase bg-slate-50 border border-[#E2E8F0] px-3 py-1 rounded-full">
                  Foco: Módulo de Personalización de Datos
                </span>

                {/* React Component Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  
                  <button
                    onClick={() => setSelectedNode('comp-admin-fields')}
                    className={`p-4 rounded-xl border transition-all text-left shadow-sm ${
                      selectedNode === 'comp-admin-fields'
                        ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                        : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-4 h-4 text-[#4F5AF5]" />
                      <span className="text-xs font-bold text-[#1E293B]">AdminFields.tsx</span>
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      Interfaz de creación y reordenamiento de campos de formulario.
                    </p>
                    <span className="text-[8px] bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full inline-block mt-2 font-mono">React Component</span>
                  </button>

                  <button
                    onClick={() => setSelectedNode('comp-state-flow')}
                    className={`p-4 rounded-xl border transition-all text-left shadow-sm ${
                      selectedNode === 'comp-state-flow'
                        ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                        : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="w-4 h-4 text-[#EB5F46]" />
                      <span className="text-xs font-bold text-[#1E293B]">StateFlow.tsx</span>
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      Visualizador de flujo de macrofases, roles y condiciones del sistema.
                    </p>
                    <span className="text-[8px] bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full inline-block mt-2 font-mono">React Component</span>
                  </button>
                </div>

                {/* HTTP Link */}
                <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] font-mono">
                  <ArrowDown className="w-3.5 h-3.5" />
                  Peticiones HTTP JSON
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>

                {/* API Controller Component */}
                <button
                  onClick={() => setSelectedNode('comp-fields-api')}
                  className={`p-4 rounded-xl border transition-all text-left w-full shadow-sm ${
                    selectedNode === 'comp-fields-api'
                      ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                      : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#1E293B]">Controlador de campos (/api/fields)</span>
                    <span className="text-[8px] bg-[#FEE2E2] text-[#991B1B] px-1.5 py-0.5 rounded-full font-mono">server.ts</span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Recibe peticiones HTTP, implementa la lógica de CRUD y reordenamiento por lotes y se conecta a Supabase.
                  </p>
                  <span className="text-[8px] bg-amber-50 border border-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full inline-block mt-2 font-mono">Express Endpoint Controller</span>
                </button>

                {/* DB Query Link */}
                <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] font-mono">
                  <ArrowDown className="w-3.5 h-3.5" />
                  Supabase client query
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>

                {/* Database Table Component */}
                <button
                  onClick={() => setSelectedNode('comp-fields-table')}
                  className={`p-4 rounded-xl border transition-all text-left w-full shadow-sm ${
                    selectedNode === 'comp-fields-table'
                      ? 'border-[#4F5AF5] bg-[#EEF2FF] ring-2 ring-[#4F5AF5]/20'
                      : 'border-[#E2E8F0] hover:border-[#4F5AF5] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-[#00B8B2]" />
                    <span className="text-xs font-bold text-[#1E293B]">Tabla: initiative_fields</span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Almacena la definición estructurada (clave, tipo, obligatoriedad, prompts de IA y dependencias).
                  </p>
                  <span className="text-[8px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full inline-block mt-2 font-mono">Supabase Table Schema</span>
                </button>
              </div>
            )}
          </div>

          <div className="text-[10px] text-[#94A3B8] border-t border-[#F1F5F9] pt-3 text-center font-semibold">
            Tip: Haz clic en cualquiera de las cajas para ver sus responsabilidades y tecnología en el inspector.
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-6 rounded-2xl shadow-sm flex flex-col min-h-[500px]">
          <div className="border-b border-[#E2E8F0] pb-4 mb-4">
            <h3 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-[#4F5AF5]" />
              Inspector de Nodos
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-medium">
              Detalles técnicos y funcionales del elemento seleccionado en el esquema C4.
            </p>
          </div>

          {selectedNode && nodeDetails[selectedNode] ? (
            <div className="space-y-4 flex-grow flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-[#1E293B]">{nodeDetails[selectedNode].title}</h4>
                  {nodeDetails[selectedNode].tech && (
                    <span className="inline-block bg-[#EEF2FF] text-[#4F5AF5] border border-[#C7D2FE] px-2 py-0.5 rounded text-[10px] font-mono mt-1 font-bold">
                      {nodeDetails[selectedNode].tech}
                    </span>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
                  <p className="text-xs text-[#4A5568] leading-relaxed">
                    {nodeDetails[selectedNode].desc}
                  </p>
                </div>

                {nodeDetails[selectedNode].responsibilities && (
                  <div>
                    <h5 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Responsabilidades:</h5>
                    <ul className="space-y-1.5">
                      {nodeDetails[selectedNode].responsibilities?.map((resp, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#1E293B]">
                          <CheckCircle className="w-3.5 h-3.5 text-[#00B8B2] shrink-0 mt-0.5" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="w-full bg-[#E2E8F0] hover:bg-[#CBD5E1] text-[#4A5568] py-2 rounded-xl text-xs font-bold transition-colors mt-4"
              >
                Cerrar Inspector
              </button>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#E2E8F0] rounded-xl bg-white">
              <Layers className="w-8 h-8 text-[#CBD5E1] mb-2" />
              <p className="text-xs font-bold text-[#64748B]">Ningún elemento seleccionado</p>
              <p className="text-[10px] text-[#94A3B8] max-w-[180px] mt-1 leading-normal">
                Haz clic en una de las cajas del diagrama C4 para inspeccionar sus responsabilidades y especificaciones técnicas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
