import React, { useState, useMemo } from 'react';
import { 
  Layers, Users, Server, Database, Brain, Mail, FileText, 
  ArrowRight, ArrowDown, ArrowUpRight, GitBranch, Settings, Info, 
  CheckCircle2, Shield, ShieldCheck, Zap, Activity, Cpu, Lock, 
  Network, Search, ExternalLink, HardDrive, RefreshCw, Key, 
  FileCheck, HelpCircle, ChevronRight, Eye, AlertTriangle, Cloud
} from 'lucide-react';

type C4Level = 'context' | 'container' | 'component' | 'dependencies';

interface ComponentDetail {
  id: string;
  name: string;
  category: 'actor' | 'frontend' | 'backend' | 'database' | 'ai' | 'storage' | 'external';
  tech: string;
  level: 'L1' | 'L2' | 'L3';
  summary: string;
  responsibilities: string[];
  dependsOn: string[];
  dependedBy: string[];
  protocol: string;
  criticality: 'Crítica' | 'Alta' | 'Media';
  resilienceStrategy: string;
}

const ARCHITECTURE_DATA: Record<string, ComponentDetail> = {
  // ── L1: ACTORES Y CONTEXTO ──────────────────────────────────────────────
  'user-solicitante': {
    id: 'user-solicitante',
    name: 'Key User (Solicitante / Líder de Área)',
    category: 'actor',
    tech: 'Persona (Directores de Área, Jefes de Operaciones, VPs)',
    level: 'L1',
    summary: 'Ejecutivo o líder de negocio que detecta una oportunidad operativa y redacta o dialoga con Teo para proponer una iniciativa.',
    responsibilities: [
      'Iniciar requerimientos mediante chat guiado por IA o formulario directo',
      'Adjuntar evidencias y sustentos técnicos (PDF, DOCX, diagramas)',
      'Subsanar observaciones formuladas por los Business Partners de TI',
      'Firmar/Confirmar el VoBo de la Vicepresidencia correspondiente'
    ],
    dependsOn: ['container-spa'],
    dependedBy: [],
    protocol: 'HTTPS / Web UI',
    criticality: 'Crítica',
    resilienceStrategy: 'Acceso multicanal desde navegador web con persistencia automática de borradores en Supabase.'
  },
  'user-bp': {
    id: 'user-bp',
    name: 'Business Partner de TI (BP TI)',
    category: 'actor',
    tech: 'Persona (Evaluador Técnico y Funcional de TI)',
    level: 'L1',
    summary: 'Evaluador de TI asignado a una Vicepresidencia/Dirección que valida la viabilidad técnica, arquitectura y prioridad del proyecto.',
    responsibilities: [
      'Revisar la justificación y calidad técnica de iniciativas asignadas',
      'Emitir observaciones formales con registro inmutable en historial',
      'Aprobar iniciativas pasando a estado "En demanda" con VoBo formal',
      'Desestimar con motivo justificado si la iniciativa no es viable'
    ],
    dependsOn: ['container-spa'],
    dependedBy: [],
    protocol: 'HTTPS / Web UI',
    criticality: 'Crítica',
    resilienceStrategy: 'Alertas automáticas por correo y bandeja centralizada de aprobaciones.'
  },
  'user-admin': {
    id: 'user-admin',
    name: 'Administrador / TI Governance',
    category: 'actor',
    tech: 'Persona (Superusuario TI & Gobierno de Datos)',
    level: 'L1',
    summary: 'Responsable del gobierno del sistema, gestión de usuarios/roles, personalización de campos dinámicos y entrenamiento de la IA.',
    responsibilities: [
      'Gestionar altas, bajas y matriz de roles (RBAC) por Vicepresidencia',
      'Configurar campos dinámicos del formulario sin programar código',
      'Entrenar capas de identidad, contexto y guardarrieles de Teo',
      'Auditar bitácoras de correo, logs de agentes y cargas masivas'
    ],
    dependsOn: ['container-spa'],
    dependedBy: [],
    protocol: 'HTTPS / Web UI (Protegido por AdminRoute)',
    criticality: 'Alta',
    resilienceStrategy: 'Autenticación estricta con doble factor y políticas de auditoría.'
  },
  'system-iacs': {
    id: 'system-iacs',
    name: 'Plataforma IACS Core System',
    category: 'backend',
    tech: 'React 18 + Node.js Express + Supabase Cloud',
    level: 'L1',
    summary: 'Sistema empresarial integral que digitaliza, asiste con IA y gobierna el ciclo de vida de iniciativas de desarrollo de software para Laureate Perú.',
    responsibilities: [
      'Asistir cognitivamente a los ejecutivos mediante el agente Teo',
      'Orquestar el flujo de estados (Borrador -> Pendiente -> Observada -> En demanda / Desestimada)',
      'Garantizar el aislamiento de datos por Vicepresidencia (RBAC & RLS)',
      'Generar resúmenes ejecutivos y fichas PDF de aprobación'
    ],
    dependsOn: ['ext-supabase-db', 'ext-supabase-auth', 'ext-supabase-storage', 'ext-gemini', 'ext-groq', 'ext-smtp'],
    dependedBy: ['user-solicitante', 'user-bp', 'user-admin'],
    protocol: 'HTTPS / REST / WebSocket',
    criticality: 'Crítica',
    resilienceStrategy: 'Arquitectura desacoplada en contenedores con failover automático de IA y respaldo continuo en Supabase.'
  },

  // ── L2: CONTENEDORES PRINCIPALES ────────────────────────────────────────
  'container-spa': {
    id: 'container-spa',
    name: 'Frontend Web SPA (Single Page Application)',
    category: 'frontend',
    tech: 'React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons',
    level: 'L2',
    summary: 'Interfaz de usuario moderna y reactiva ejecutada en el navegador web del ejecutivo. Renderiza formularios dinámicos, chat conversacional y tableros kanban.',
    responsibilities: [
      'Renderizar vistas adaptadas al rol del usuario (Key User, BP TI, Admin)',
      'Manejar interacción fluida de chat con Teo y reconocimiento de voz (STT)',
      'Validar consistencia de campos en tiempo real antes de enviar al servidor',
      'Gestionar navegación protegida mediante guardias AuthRoute y AdminRoute'
    ],
    dependsOn: ['container-api', 'ext-supabase-auth', 'ext-supabase-db'],
    dependedBy: ['user-solicitante', 'user-bp', 'user-admin'],
    protocol: 'HTTPS / WSS (Realtime)',
    criticality: 'Crítica',
    resilienceStrategy: 'Compilación optimizada en Vite, fallback automático a localStorage en caso de pérdida momentánea de conexión.'
  },
  'container-api': {
    id: 'container-api',
    name: 'Backend API Gateway & Agent Server',
    category: 'backend',
    tech: 'Node.js, Express, TypeScript, Multer, Mammoth, pdf-parse',
    level: 'L2',
    summary: 'Servidor de backend que aloja la lógica de negocio protegida, ejecuta los guardarrieles de IA, procesa adjuntos y sirve como proxy seguro ante los LLMs.',
    responsibilities: [
      'Exponer endpoints protegidos con autenticación JWT Bearer y control RBAC',
      'Ejecutar la cascada de modelos de IA (Gemini 2.0 -> Groq LLaMA-3.3-70B -> Fallback local)',
      'Extraer y sanitizar texto de archivos adjuntos (PDF/DOCX/TXT) previniendo Prompt Injection',
      'Despachar notificaciones transaccionales y registrar trazas de auditoría'
    ],
    dependsOn: ['ext-supabase-db', 'ext-supabase-storage', 'ext-gemini', 'ext-groq', 'ext-smtp'],
    dependedBy: ['container-spa'],
    protocol: 'HTTPS REST / JSON',
    criticality: 'Crítica',
    resilienceStrategy: 'Cascada multi-modelo con timeout estricto de 3s y fallback estructurado libre de caídas.'
  },
  'ext-supabase-db': {
    id: 'ext-supabase-db',
    name: 'Base de Datos Relacional PostgreSQL (Supabase)',
    category: 'database',
    tech: 'PostgreSQL 15+, Row-Level Security (RLS), Supabase PostgREST',
    level: 'L2',
    summary: 'Capa de persistencia principal que almacena iniciativas, configuraciones de campos, guardarrieles de IA, perfiles y bitácoras de auditoría.',
    responsibilities: [
      'Almacenar de forma consistente el modelo relacional de iniciativas y catálogos',
      'Ejecutar políticas de Row-Level Security (RLS) para aislamiento por VP',
      'Emitir eventos en tiempo real (Supabase Realtime) para actualizaciones en vivo',
      'Respaldos automáticos en la nube y alta disponibilidad transaccional'
    ],
    dependsOn: [],
    dependedBy: ['container-api', 'container-spa'],
    protocol: 'PostgreSQL / TLS / PostgREST API',
    criticality: 'Crítica',
    resilienceStrategy: 'Clúster administrado con réplicas y políticas de backup continuo point-in-time.'
  },
  'ext-supabase-auth': {
    id: 'ext-supabase-auth',
    name: 'Servicio de Autenticación & JWT (Supabase Auth)',
    category: 'external',
    tech: 'GoTrue / OAuth2 / JWT Tokens (HS256)',
    level: 'L2',
    summary: 'Gestor de identidad y sesiones de usuario que emite tokens JWT y gestiona el ciclo de vida de autenticación de ejecutivos.',
    responsibilities: [
      'Verificar credenciales de acceso institucional',
      'Emitir y renovar tokens de sesión JWT con expiración segura',
      'Vincular usuarios autenticados con su perfil en la tabla `profiles`'
    ],
    dependsOn: [],
    dependedBy: ['container-spa', 'container-api'],
    protocol: 'HTTPS / OAuth2 / JWT',
    criticality: 'Crítica',
    resilienceStrategy: 'Infraestructura de autenticación de alta disponibilidad con tokens firmados.'
  },
  'ext-supabase-storage': {
    id: 'ext-supabase-storage',
    name: 'Almacenamiento de Objetos (`iacs-attachments`)',
    category: 'storage',
    tech: 'Supabase Storage Bucket (S3 Compatible)',
    level: 'L2',
    summary: 'Repositorio seguro en la nube para documentos PDF, DOCX, diagramas técnicos y firmas de visto bueno de las iniciativas.',
    responsibilities: [
      'Almacenar archivos binarios pesados con identificador único no colisionable',
      'Validar tipo MIME y tamaño máximo configurado por el Administrador',
      'Entregar enlaces seguros de descarga a usuarios autorizados'
    ],
    dependsOn: [],
    dependedBy: ['container-api', 'container-spa'],
    protocol: 'HTTPS S3 REST API',
    criticality: 'Alta',
    resilienceStrategy: 'Almacenamiento distribuido redundante con fallback a Base64 en contingencia.'
  },
  'ext-gemini': {
    id: 'ext-gemini',
    name: 'Motor Primario de IA Cognitiva (Google Gemini API)',
    category: 'ai',
    tech: 'Google GenAI SDK (Gemini 2.0 Flash / Gemini 1.5 Flash)',
    level: 'L2',
    summary: 'Proveedor primario de procesamiento de lenguaje natural para el diálogo con Teo, estructuración de objetivos y síntesis de iniciativas.',
    responsibilities: [
      'Mantener conversación contextual en lenguaje de negocio con el solicitante',
      'Redactar títulos formales en infinitivo y objetivos alineados a metas estratégicas',
      'Sintetizar la iniciativa completa en JSON estructurado al finalizar el levantamiento'
    ],
    dependsOn: [],
    dependedBy: ['container-api'],
    protocol: 'HTTPS / Google API v1beta',
    criticality: 'Alta',
    resilienceStrategy: 'Conmutación instantánea a Groq en caso de timeout (>3000ms) o saturación de cuota (HTTP 429).'
  },
  'ext-groq': {
    id: 'ext-groq',
    name: 'Motor Secundario de IA (Groq Cloud LLaMA 3.3)',
    category: 'ai',
    tech: 'Groq LPU Inference (LLaMA-3.3-70B-Versatile / 8B-Instant)',
    level: 'L2',
    summary: 'Acelerador de inferencia de respaldo ultra-rápido que asume la carga cognitiva si el proveedor primario presenta lentitud.',
    responsibilities: [
      'Procesar chats y resúmenes con latencia sub-segundo en modo fallback',
      'Ejecutar las mismas reglas de negocio y guardarrieles que el motor primario'
    ],
    dependsOn: [],
    dependedBy: ['container-api'],
    protocol: 'HTTPS / Groq OpenAI-Compatible API',
    criticality: 'Alta',
    resilienceStrategy: 'Hardware LPU ultra-rápido de alta disponibilidad.'
  },
  'ext-smtp': {
    id: 'ext-smtp',
    name: 'Servicio de Correos Corporativos (Nodemailer / SMTP)',
    category: 'external',
    tech: 'SMTP Laureate Perú / Microsoft 365 Exchange Relay',
    level: 'L2',
    summary: 'Canal de notificaciones por correo que despacha alertas de asignación de BP, avisos de observación y actas de aprobación.',
    responsibilities: [
      'Enviar correos transaccionales formateados en HTML Laureate',
      'Registrar traza inalterable en la tabla `email_logs` con estado de entrega'
    ],
    dependsOn: [],
    dependedBy: ['container-api'],
    protocol: 'SMTP / TLS (Port 587)',
    criticality: 'Media',
    resilienceStrategy: 'Cola asíncrona no bloqueante con registro de fallas en bitácora para reintentos.'
  },

  // ── L3: COMPONENTES INTERNOS ────────────────────────────────────────────
  'comp-teo-chat': {
    id: 'comp-teo-chat',
    name: 'Módulo de Asistencia Cognitiva (Teo AI Assistant)',
    category: 'ai',
    tech: 'Conversational LLM Handler + Guardrails Engine (`server.ts`)',
    level: 'L3',
    summary: 'Componente que orquesta el diálogo paso a paso con el solicitante, guiándolo mediante preguntas clave sin abrumarlo.',
    responsibilities: [
      'Inyectar capas dinámicas de identidad, contexto y ejemplos desde `ai_training_config`',
      'Aplicar Guardarriel 15 (Agradecimiento de evidencias) y Guardarriel 16 (No repetición)',
      'Detectar `[INFORMACION_COMPLETA]` para disparar el consolidado automático'
    ],
    dependsOn: ['ext-gemini', 'ext-groq', 'ext-supabase-db'],
    dependedBy: ['container-spa'],
    protocol: 'POST /api/chat',
    criticality: 'Crítica',
    resilienceStrategy: 'Motor de contingencia local que sintetiza respuestas basadas en la necesidad real si la red falla.'
  },
  'comp-summarize': {
    id: 'comp-summarize',
    name: 'Generador de Resumen Estructurado (/api/summarize)',
    category: 'ai',
    tech: 'JSON Mode LLM Synthesizer + Data Sanitizer (`server.ts`)',
    level: 'L3',
    summary: 'Componente que convierte todo el diálogo conversacional en un objeto JSON con todos los campos normalizados del formulario.',
    responsibilities: [
      'Asignar 100% de prioridad a la conversación sobre borradores previos (Cero contaminación)',
      'Normalizar fechas relativas a formato estricto `DD/MM/AAAA`',
      'Generar título profesional con verbo en infinitivo y objetivo cuantitativo'
    ],
    dependsOn: ['ext-gemini', 'ext-groq'],
    dependedBy: ['container-spa'],
    protocol: 'POST /api/summarize',
    criticality: 'Crítica',
    resilienceStrategy: 'Fallback dinámico inteligente context-aware que analiza el texto del usuario sin textos estáticos.'
  },
  'comp-unstructured': {
    id: 'comp-unstructured',
    name: 'Extractor No Estructurado (/api/fields/analyze-unstructured)',
    category: 'ai',
    tech: 'NLP Parser + Field Mapper (`server.ts`)',
    level: 'L3',
    summary: 'Componente que permite a un ejecutivo pegar un correo o texto libre y extrae automáticamente los 15 campos del formulario.',
    responsibilities: [
      'Parsear texto libre de cualquier longitud',
      'Mapear información a las opciones exactas de los selectores configurados',
      'Generar advertencias amigables si faltan campos obligatorios'
    ],
    dependsOn: ['ext-gemini', 'ext-groq', 'ext-supabase-db'],
    dependedBy: ['container-spa'],
    protocol: 'POST /api/fields/analyze-unstructured',
    criticality: 'Alta',
    resilienceStrategy: 'Algoritmo heurístico local de extracción basado en reglas sintácticas.'
  },
  'comp-approval-engine': {
    id: 'comp-approval-engine',
    name: 'Motor de Gobierno y Aprobaciones (Approval Board Engine)',
    category: 'backend',
    tech: 'State Machine Handler (`ApprovalBoard.tsx` & `InitiativeDetail.tsx`)',
    level: 'L3',
    summary: 'Gestiona la máquina de estados del flujo de aprobación, asignación de BPs y control de cambios sobre iniciativas.',
    responsibilities: [
      'Validar transiciones válidas: Borrador -> Pendiente -> Observada -> En demanda / Desestimada',
      'Registrar en `_observation_history` cada observación con timestamp, autor y rol',
      'Gestionar la matriz de visto bueno (VoBo Director / VoBo VP)'
    ],
    dependsOn: ['ext-supabase-db', 'ext-smtp'],
    dependedBy: ['container-spa'],
    protocol: 'PostgreSQL Direct Queries + RLS',
    criticality: 'Crítica',
    resilienceStrategy: 'Validación en dos capas (Frontend UI + Políticas RLS en base de datos).'
  },
  'comp-dynamic-fields': {
    id: 'comp-dynamic-fields',
    name: 'Motor de Esquema y Campos Dinámicos (Dynamic Schema Engine)',
    category: 'backend',
    tech: 'Postgres Schema Mapper (`initiative_fields` + `AdminFields.tsx`)',
    level: 'L3',
    summary: 'Permite modificar la estructura de datos del formulario en tiempo de ejecución sin requerir despliegues de código.',
    responsibilities: [
      'Servir catálogo ordenado de campos (`GET /api/fields`)',
      'Permitir a los administradores agregar campos con reglas de obligatoriedad y visibilidad',
      'Mapear selectores dependientes (ej: Dirección depende de Vicepresidencia)'
    ],
    dependsOn: ['ext-supabase-db'],
    dependedBy: ['container-spa', 'comp-teo-chat'],
    protocol: 'REST API / PostgreSQL',
    criticality: 'Alta',
    resilienceStrategy: 'Caché local en memoria y ordenamiento batch transaccional.'
  },
  'comp-rbac-guard': {
    id: 'comp-rbac-guard',
    name: 'Módulo de Seguridad y Control de Acceso (RBAC & Auth Guard)',
    category: 'backend',
    tech: 'AuthContext + AdminRoute + JWT Middlewares (`server.ts`)',
    level: 'L3',
    summary: 'Garantiza que cada usuario solo acceda a los datos y funciones que le corresponden según su rol asignado.',
    responsibilities: [
      'Filtrar iniciativas por Vicepresidencia asignada en `profile_roles`',
      'Bloquear acceso a rutas `/admin/*` para usuarios no administradores',
      'Exigir Bearer JWT válido en endpoints mutables del backend'
    ],
    dependsOn: ['ext-supabase-auth', 'ext-supabase-db'],
    dependedBy: ['container-spa', 'container-api'],
    protocol: 'JWT Bearer / RLS Security Rules',
    criticality: 'Crítica',
    resilienceStrategy: 'Validación en tiempo de compilación y en tiempo de ejecución con redirección a `/dashboard`.'
  }
};

export default function C4Architecture() {
  const [activeLevel, setActiveLevel] = useState<C4Level>('context');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('system-iacs');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const selectedNode = ARCHITECTURE_DATA[selectedNodeId] || ARCHITECTURE_DATA['system-iacs'];

  // Dependents and Dependencies of the selected node
  const upstreamComponents = useMemo(() => {
    return (selectedNode.dependsOn || []).map(id => ARCHITECTURE_DATA[id]).filter(Boolean);
  }, [selectedNode]);

  const downstreamComponents = useMemo(() => {
    return Object.values(ARCHITECTURE_DATA).filter(item => (item.dependsOn || []).includes(selectedNode.id));
  }, [selectedNode]);

  // Filtered components for the Dependency Matrix
  const filteredComponents = useMemo(() => {
    return Object.values(ARCHITECTURE_DATA).filter(comp => {
      const matchesSearch = comp.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            comp.tech.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            comp.summary.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesCat = categoryFilter === 'all' || comp.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [searchFilter, categoryFilter]);

  const getCategoryBadge = (cat: ComponentDetail['category']) => {
    switch (cat) {
      case 'actor': return { label: 'Actor / Usuario', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Users };
      case 'frontend': return { label: 'Frontend UI', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Eye };
      case 'backend': return { label: 'Backend / Gateway', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Server };
      case 'database': return { label: 'Base de Datos', bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: Database };
      case 'ai': return { label: 'IA & Guardarrieles', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Brain };
      case 'storage': return { label: 'Almacenamiento', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: HardDrive };
      case 'external': return { label: 'Servicio Externo', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Cloud };
      default: return { label: 'Componente', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Cpu };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-md shadow-indigo-500/20 shrink-0">
            <Network className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Arquitectura C4 & Mapa de Dependencias</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                Framework The Architect
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium max-w-3xl leading-relaxed">
              Esquema técnico y ejecutivo formal del sistema **IACS**. Diseñado para dar visibilidad 360° al Directorio y al CEO sobre **qué hace cada componente, de qué depende y cómo se mitigan los riesgos operativos**.
            </p>
          </div>
        </div>

        {/* Level Selector Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0 overflow-x-auto self-start xl:self-center">
          {[
            { id: 'context', label: 'Nivel 1: Contexto', icon: Users },
            { id: 'container', label: 'Nivel 2: Contenedores', icon: Layers },
            { id: 'component', label: 'Nivel 3: Componentes', icon: Cpu },
            { id: 'dependencies', label: 'Matriz CEO', icon: Activity },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeLevel === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveLevel(tab.id as C4Level)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Executive KPI Ribbon (CEO Summary) ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg shrink-0">
            5
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Contenedores Core</span>
            <span className="text-[11px] text-slate-500 font-medium">SPA, Gateway, DB, Auth, Bucket</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-lg shrink-0">
            2
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Motores de IA Dual</span>
            <span className="text-[11px] text-slate-500 font-medium">Gemini 2.0 Flash + Groq LLaMA-3.3</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg shrink-0">
            3
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Capas de Seguridad</span>
            <span className="text-[11px] text-slate-500 font-medium">RBAC, PostgREST RLS, JWT Guard</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-lg shrink-0">
            0s
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Tolerancia a Caídas</span>
            <span className="text-[11px] text-slate-500 font-medium">Failover automático y offline fallback</span>
          </div>
        </div>
      </div>

      {/* ── Main Interactive Canvas & Inspector ────────────────────────────────── */}
      {activeLevel !== 'dependencies' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Visual Diagram Workspace (8 Cols) */}
          <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[580px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  {activeLevel === 'context' && 'C4 Nivel 1 — Vista de Contexto del Negocio'}
                  {activeLevel === 'container' && 'C4 Nivel 2 — Vista de Contenedores y Servicios'}
                  {activeLevel === 'component' && 'C4 Nivel 3 — Vista de Componentes Internos'}
                </span>
                <h2 className="text-base font-black text-slate-900 mt-2">
                  {activeLevel === 'context' && '¿Quiénes interactúan con IACS y qué sistemas externos se integran?'}
                  {activeLevel === 'container' && '¿Cómo se distribuyen las responsabilidades entre Frontend, Backend y Cloud?'}
                  {activeLevel === 'component' && '¿Qué módulos internos procesan la IA, los estados y la seguridad?'}
                </h2>
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline-block font-semibold">
                Haz clic en cualquier nodo para inspeccionar
              </span>
            </div>

            {/* Visual Interactive Schematics */}
            <div className="flex-grow flex items-center justify-center py-4 overflow-x-auto">
              
              {/* ── LEVEL 1: CONTEXT ── */}
              {activeLevel === 'context' && (
                <div className="flex flex-col items-center gap-7 w-full max-w-2xl">
                  {/* Users */}
                  <div className="grid grid-cols-3 gap-3 w-full">
                    {[
                      { id: 'user-solicitante', title: 'Key User', desc: 'Solicitante / Líder', icon: Users, color: 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50' },
                      { id: 'user-bp', title: 'Business Partner', desc: 'Evaluador TI', icon: Users, color: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50' },
                      { id: 'user-admin', title: 'Admin TI', desc: 'Gobierno & Config', icon: Shield, color: 'border-purple-200 bg-purple-50/50 hover:bg-purple-50' },
                    ].map(u => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedNodeId(u.id)}
                        className={`p-3.5 rounded-2xl border text-center transition-all ${u.color} ${
                          selectedNodeId === u.id ? 'ring-2 ring-indigo-500 shadow-md scale-102' : 'shadow-sm'
                        }`}
                      >
                        <u.icon className="w-5 h-5 mx-auto text-slate-700 mb-1.5" />
                        <span className="text-xs font-black text-slate-900 block">{u.title}</span>
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{u.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Interacts Down Arrow */}
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold">
                    <span className="h-px w-12 bg-slate-200"></span>
                    <span>HTTPS Web App</span>
                    <ArrowDown className="w-4 h-4 text-indigo-500 animate-bounce" />
                    <span className="h-px w-12 bg-slate-200"></span>
                  </div>

                  {/* Core System Node */}
                  <button
                    onClick={() => setSelectedNodeId('system-iacs')}
                    className={`w-full max-w-md p-6 rounded-3xl text-center transition-all bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl ${
                      selectedNodeId === 'system-iacs' ? 'ring-4 ring-indigo-400/30 scale-102' : 'hover:scale-101'
                    }`}
                  >
                    <div className="inline-flex p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl mb-2">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black tracking-tight">Plataforma IACS (Sistema Central)</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto font-normal leading-relaxed">
                      Gestor de Iniciativas de TI asistido por Inteligencia Artificial y Flujo de Aprobaciones
                    </p>
                    <div className="mt-3 flex justify-center gap-2">
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-white/10 rounded-full text-indigo-300">Software System</span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">Laureate Core</span>
                    </div>
                  </button>

                  {/* Consumes Down Arrow */}
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold">
                    <span className="h-px w-12 bg-slate-200"></span>
                    <span>Integración & Persistencia</span>
                    <ArrowDown className="w-4 h-4 text-indigo-500" />
                    <span className="h-px w-12 bg-slate-200"></span>
                  </div>

                  {/* External Satellites */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                    {[
                      { id: 'ext-supabase-db', name: 'Supabase DB', sub: 'PostgreSQL + RLS', icon: Database, color: 'text-teal-600' },
                      { id: 'ext-gemini', name: 'Gemini 2.0', sub: 'Motor IA Primario', icon: Brain, color: 'text-indigo-600' },
                      { id: 'ext-groq', name: 'Groq LLaMA', sub: 'Respaldo de IA', icon: Zap, color: 'text-purple-600' },
                      { id: 'ext-smtp', name: 'Servicio SMTP', sub: 'Alertas por Correo', icon: Mail, color: 'text-amber-600' },
                    ].map(ext => (
                      <button
                        key={ext.id}
                        onClick={() => setSelectedNodeId(ext.id)}
                        className={`p-3 rounded-2xl border text-center transition-all bg-white hover:border-indigo-300 ${
                          selectedNodeId === ext.id ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-400/20' : 'border-slate-200 shadow-sm'
                        }`}
                      >
                        <ext.icon className={`w-4 h-4 mx-auto ${ext.color} mb-1`} />
                        <span className="text-[11px] font-extrabold text-slate-900 block truncate">{ext.name}</span>
                        <span className="text-[9px] text-slate-500 font-medium block truncate">{ext.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── LEVEL 2: CONTAINERS ── */}
              {activeLevel === 'container' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
                  {/* Container: SPA */}
                  <button
                    onClick={() => setSelectedNodeId('container-spa')}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      selectedNodeId === 'container-spa' 
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-400/20 shadow-md' 
                        : 'border-slate-200 bg-white hover:border-indigo-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                        Frontend Container
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900">React 18 SPA (Web App)</h3>
                    <p className="text-xs text-slate-500 mt-1 font-normal leading-relaxed">
                      Interfaz de usuario responsiva con formularios dinámicos, chat de Teo y gestión de roles.
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Tech: Vite / Tailwind / TS</span>
                      <span className="font-bold text-indigo-600 flex items-center gap-1">Inspeccionar <ChevronRight className="w-3.5 h-3.5" /></span>
                    </div>
                  </button>

                  {/* Container: API */}
                  <button
                    onClick={() => setSelectedNodeId('container-api')}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      selectedNodeId === 'container-api' 
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-400/20 shadow-md' 
                        : 'border-slate-200 bg-white hover:border-indigo-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                        <Server className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                        Backend Gateway
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900">Express Server & Agent Runtime</h3>
                    <p className="text-xs text-slate-500 mt-1 font-normal leading-relaxed">
                      Orquestación de IA, sanitización de adjuntos, endpoints seguros y lógica de negocio.
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Tech: Node.js / Express / TS</span>
                      <span className="font-bold text-indigo-600 flex items-center gap-1">Inspeccionar <ChevronRight className="w-3.5 h-3.5" /></span>
                    </div>
                  </button>

                  {/* Container: Database */}
                  <button
                    onClick={() => setSelectedNodeId('ext-supabase-db')}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      selectedNodeId === 'ext-supabase-db' 
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-400/20 shadow-md' 
                        : 'border-slate-200 bg-white hover:border-indigo-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-teal-100 text-teal-600 rounded-xl">
                        <Database className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                        Database Container
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900">PostgreSQL (Supabase Relational DB)</h3>
                    <p className="text-xs text-slate-500 mt-1 font-normal leading-relaxed">
                      Almacenamiento de iniciativas, esquemas dinámicos, guardarrieles y políticas RLS.
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Tech: Postgres 15+ / RLS</span>
                      <span className="font-bold text-indigo-600 flex items-center gap-1">Inspeccionar <ChevronRight className="w-3.5 h-3.5" /></span>
                    </div>
                  </button>

                  {/* Container: Dual AI */}
                  <button
                    onClick={() => setSelectedNodeId('ext-gemini')}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      selectedNodeId === 'ext-gemini' || selectedNodeId === 'ext-groq'
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-400/20 shadow-md' 
                        : 'border-slate-200 bg-white hover:border-indigo-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                        <Brain className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                        Cognitive Engine
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900">Dual Model AI Ingestion</h3>
                    <p className="text-xs text-slate-500 mt-1 font-normal leading-relaxed">
                      Gemini 2.0 Flash + Groq LLaMA-3.3-70B con tolerancia a fallos y fallback local.
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Tech: Google GenAI / Groq SDK</span>
                      <span className="font-bold text-indigo-600 flex items-center gap-1">Inspeccionar <ChevronRight className="w-3.5 h-3.5" /></span>
                    </div>
                  </button>
                </div>
              )}

              {/* ── LEVEL 3: COMPONENTS ── */}
              {activeLevel === 'component' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
                  {[
                    { id: 'comp-teo-chat', title: 'Asistente Teo (AI Chat)', desc: 'Guía conversacional y propuesta de Título/Objetivo', icon: Brain, badge: 'IA Ingestion' },
                    { id: 'comp-summarize', title: 'Sintetizador (/api/summarize)', desc: 'Genera consolidado fiel en JSON sin datos residuales', icon: FileCheck, badge: 'Cognitive Synthesizer' },
                    { id: 'comp-unstructured', title: 'Extractor No Estructurado', desc: 'Mapea texto libre a los campos del formulario', icon: FileText, badge: 'NLP Extractor' },
                    { id: 'comp-approval-engine', title: 'Motor de Aprobaciones', desc: 'Flujo formal: Borrador -> Pendiente -> VoBo', icon: GitBranch, badge: 'Workflow State Machine' },
                    { id: 'comp-dynamic-fields', title: 'Gestor de Esquema Dinámico', desc: 'Configuración de campos y selectores dependientes', icon: Settings, badge: 'Data Architecture' },
                    { id: 'comp-rbac-guard', title: 'Seguridad RBAC & AdminRoute', desc: 'Aislamiento por VP y protección de endpoints backend', icon: ShieldCheck, badge: 'Security Guard' },
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedNodeId(c.id)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        selectedNodeId === c.id 
                          ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-400/20 shadow-md' 
                          : 'border-slate-200 bg-white hover:border-indigo-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <c.icon className="w-5 h-5 text-indigo-600" />
                        <span className="text-[9px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {c.badge}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900">{c.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 font-normal leading-relaxed">{c.desc}</p>
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* Bottom Help Tip */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-500" />
                Haz clic en la pestaña <strong>"Matriz CEO"</strong> para ver la tabla completa de dependencias y criticidad.
              </span>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                Seleccionado: {selectedNode.name}
              </span>
            </div>
          </div>

          {/* ── Component Detail Inspector (4 Cols) ──────────────────────────────── */}
          <div className="lg:col-span-4 bg-white p-6 md:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${getCategoryBadge(selectedNode.category).bg}`}>
                  {getCategoryBadge(selectedNode.category).label}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  selectedNode.criticality === 'Crítica' ? 'bg-red-50 text-red-600 border border-red-200' :
                  selectedNode.criticality === 'Alta' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                  'bg-slate-50 text-slate-600 border border-slate-200'
                }`}>
                  Criticidad: {selectedNode.criticality}
                </span>
              </div>

              {/* Title & Tech */}
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">{selectedNode.name}</h3>
                <span className="text-xs font-mono text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md inline-block mt-1">
                  {selectedNode.tech}
                </span>
              </div>

              {/* CEO Question: ¿Qué hace? */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                  🎯 ¿Qué hace este componente?
                </span>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {selectedNode.summary}
                </p>
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                  📋 Responsabilidades Clave:
                </span>
                <ul className="space-y-1.5">
                  {selectedNode.responsibilities.map((resp, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="font-medium">{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Dependency Links: ¿De qué depende? */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                  🔗 Dependencias Directas ({upstreamComponents.length}):
                </span>
                {upstreamComponents.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {upstreamComponents.map(up => (
                      <button
                        key={up.id}
                        onClick={() => setSelectedNodeId(up.id)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1 border border-indigo-100"
                      >
                        {up.name}
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No depende de otros componentes (Capa base o Actor externo).</p>
                )}
              </div>

              {/* Dependents: ¿Quién depende de él? */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                  👥 Componentes que dependen de este ({downstreamComponents.length}):
                </span>
                {downstreamComponents.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {downstreamComponents.map(down => (
                      <button
                        key={down.id}
                        onClick={() => setSelectedNodeId(down.id)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1 border border-slate-200"
                      >
                        {down.name}
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Componente terminal de consumo.</p>
                )}
              </div>
            </div>

            {/* Protocol & Resilience Footer */}
            <div className="pt-4 border-t border-slate-100 text-[11px] space-y-1.5 bg-slate-50 -mx-6 -mb-6 p-5 rounded-b-3xl">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Protocolo:</span>
                <span className="font-bold text-slate-800">{selectedNode.protocol}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-semibold shrink-0">Resiliencia:</span>
                <span className="font-medium text-slate-700 text-right">{selectedNode.resilienceStrategy}</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* ── LEVEL 4: MATRIZ DE DEPENDENCIAS EJECUTIVA (CEO VIEW) ────────────────── */
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Matriz de Componentes y Dependencias 360°</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Tabla consolidada para auditoría ejecutiva. Consulta el rol, tecnología, dependencias y nivel de resiliencia de cada módulo.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar componente o tecnología..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-56"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="all">Todas las Categorías</option>
                <option value="actor">Actores / Personas</option>
                <option value="frontend">Frontend SPA</option>
                <option value="backend">Backend Gateway</option>
                <option value="database">Base de Datos</option>
                <option value="ai">Inteligencia Artificial</option>
                <option value="storage">Almacenamiento</option>
                <option value="external">Servicios Cloud</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-3">Componente / Módulo</th>
                  <th className="py-3 px-3">Nivel C4</th>
                  <th className="py-3 px-3">Tecnología Base</th>
                  <th className="py-3 px-3">¿De qué depende?</th>
                  <th className="py-3 px-3">Criticidad</th>
                  <th className="py-3 px-3">Estrategia de Resiliencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredComponents.map(comp => (
                  <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 align-top min-w-[260px] max-w-sm">
                      <div className="font-extrabold text-slate-900 text-[13px]">{comp.name}</div>
                      <div className="text-xs text-slate-600 font-normal mt-1 leading-relaxed">{comp.summary}</div>
                    </td>
                    <td className="py-4 px-4 align-top whitespace-nowrap">
                      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                        {comp.level}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top font-mono text-[11px] text-indigo-700 min-w-[180px]">
                      {comp.tech}
                    </td>
                    <td className="py-4 px-4 align-top min-w-[220px]">
                      <div className="flex flex-wrap gap-1.5">
                        {comp.dependsOn.length > 0 ? (
                          comp.dependsOn.map(depId => (
                            <span key={depId} className="text-[10.5px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                              {ARCHITECTURE_DATA[depId]?.name || depId}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Ninguna (Capa Base)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top whitespace-nowrap">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        comp.criticality === 'Crítica' ? 'bg-red-50 text-red-600 border border-red-200' :
                        comp.criticality === 'Alta' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {comp.criticality}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top text-xs text-slate-600 font-medium min-w-[260px] leading-relaxed">
                      {comp.resilienceStrategy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
