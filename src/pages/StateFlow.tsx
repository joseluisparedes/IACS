import React, { useState } from 'react';
import { 
  GitBranch, HelpCircle, User, CheckCircle2, 
  Send, Info, Check, X, RefreshCcw, FileText, AlertCircle,
  TrendingUp, Compass, Table, Layers, ArrowRight, ArrowDown,
  CornerRightDown, RotateCcw, Shield, CheckCircle, Ban, AlertTriangle
} from 'lucide-react';

interface Transition {
  action: string;
  target: string;
  conditions: string[];
  role: string;
}

interface StateDetail {
  id: string;
  name: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  iconBg: string;
  roles: string[];
  actions: string[];
  transitions: Transition[];
  details: string[];
}

export default function StateFlow() {
  const [activeTab, setActiveTab] = useState<'flowchart' | 'journey' | 'matrix'>('flowchart');
  const [selectedState, setSelectedState] = useState<string>('Pendiente de aprobación');

  const statesData: Record<string, StateDetail> = {
    'Borrador': {
      id: 'Borrador',
      name: 'Borrador',
      description: 'Estado inicial cuando una iniciativa es creada por el Registrador. Aún no se ha enviado al flujo formal de revisión.',
      color: 'text-slate-700',
      bg: 'bg-slate-50',
      border: 'border-slate-300',
      iconBg: 'bg-slate-200 text-slate-700',
      roles: ['Registrador (Solicitante)'],
      actions: [
        'Crear iniciativa',
        'Guardar borrador con cambios temporales',
        'Cargar adjuntos preliminares'
      ],
      details: [
        'Los borradores sólo son visibles por el usuario creador (Registrador) o Administradores.',
        'No se gatillan correos de notificación en este estado.',
        'Se pueden realizar modificaciones ilimitadas a los campos.'
      ],
      transitions: [
        {
          action: 'Enviar a Aprobación',
          target: 'Pendiente de aprobación',
          conditions: ['Se validan los campos requeridos mínimos.', 'Cambia el estado para que sea visible en la bandeja del BP TI.'],
          role: 'Registrador'
        }
      ]
    },
    'Pendiente de aprobación': {
      id: 'Pendiente de aprobación',
      name: 'Pendiente de aprobación',
      description: 'La iniciativa ha sido enviada y está lista para ser evaluada por el equipo técnico o de negocio.',
      color: 'text-[#4F5AF5]',
      bg: 'bg-[#EEF2FF]',
      border: 'border-[#4F5AF5]',
      iconBg: 'bg-[#4F5AF5] text-white',
      roles: ['Business Partner TI (BP TI)', 'Administrador'],
      actions: [
        'Asignar Business Partner de TI específico (bp_ti_asignado)',
        'Activar Modo Edición (modificar campos directamente)',
        'Validación de Visto Bueno (VoBo VP)'
      ],
      details: [
        'Si la iniciativa adjunta un archivo en "Aprobación de Director", se activa el módulo de validación de VoBo.',
        'Si se marca VoBo como "Correcto", se habilita el botón de Aprobar.',
        'Si se marca VoBo como "Incorrecto" indicando motivo, la iniciativa pasa automáticamente a Observada.',
        'Si no posee archivo de aprobación de director, el botón de Aprobar está habilitado por defecto.'
      ],
      transitions: [
        {
          action: 'Aprobar Iniciativa',
          target: 'En demanda',
          conditions: ['Si hay VoBo, debe marcarse como "Correcto".', 'Se guarda el registro de aprobación en el historial.'],
          role: 'BP TI / Administrador'
        },
        {
          action: 'Observar Iniciativa',
          target: 'Observada',
          conditions: ['Requiere ingresar al menos un cambio sugerido en los campos.', 'Mantiene la iniciativa bajo revisión pero devuelta al originador.'],
          role: 'BP TI / Administrador'
        },
        {
          action: 'Desestimar Iniciativa',
          target: 'Desestimada',
          conditions: ['Requiere ingresar un comentario de justificación para descartar la iniciativa.'],
          role: 'BP TI / Administrador'
        }
      ]
    },
    'Observada': {
      id: 'Observada',
      name: 'Observada',
      description: 'La iniciativa contiene observaciones o cambios sugeridos que el Registrador debe subsanar.',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      iconBg: 'bg-amber-100 text-amber-700',
      roles: ['Registrador (Solicitante)'],
      actions: [
        'Ver historial de observaciones detallado',
        'Aceptar o rechazar cambios sugeridos uno a uno o de forma masiva',
        'Subsanar campos del formulario observados'
      ],
      details: [
        'Los cambios sugeridos se guardan en el campo interno `_suggested_changes`.',
        'El Registrador ve resaltados los campos que tienen observaciones específicas.'
      ],
      transitions: [
        {
          action: 'Reenviar a Aprobación',
          target: 'Pendiente de aprobación',
          conditions: ['Se vacía el listado de cambios sugeridos y se guarda un snapshot en el historial.', 'Vuelve a la bandeja de aprobación del BP TI.'],
          role: 'Registrador'
        }
      ]
    },
    'En demanda': {
      id: 'En demanda',
      name: 'En demanda',
      description: 'Estado final de aprobación. La iniciativa ha sido aceptada e ingresa formalmente al backlog de demandas para desarrollo o implementación.',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      iconBg: 'bg-emerald-100 text-emerald-700',
      roles: ['Business Partner TI (BP TI)', 'Administrador'],
      actions: [
        'Visualización de detalles aprobados',
        'Exportar datos',
        'Desestimar post-aprobación'
      ],
      details: [
        'Es el estado óptimo de finalización de flujo.',
        'La iniciativa ya no puede ser editada a menos que sea desestimada primero.'
      ],
      transitions: [
        {
          action: 'Desestimar Iniciativa',
          target: 'Desestimada',
          conditions: ['Permite descartar iniciativas que por cambios de prioridad de negocio ya no se realizarán.'],
          role: 'BP TI / Administrador'
        }
      ]
    },
    'Desestimada': {
      id: 'Desestimada',
      name: 'Desestimada',
      description: 'La iniciativa ha sido descartada. Este estado actúa como un archivo lógico de propuestas no viables.',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-300',
      iconBg: 'bg-red-100 text-red-700',
      roles: ['Business Partner TI (BP TI)', 'Administrador'],
      actions: [
        'Mover a Nueva (Reactivar)',
        'Mover a En demanda (Aprobar Directamente)'
      ],
      details: [
        'Mantiene el historial de por qué fue desestimada.',
        'Permite flexibilidad de recuperar la iniciativa sin necesidad de que el Registrador la digite de nuevo.'
      ],
      transitions: [
        {
          action: 'Mover a Nueva',
          target: 'Pendiente de aprobación',
          conditions: ['Devuelve la iniciativa para re-evaluación en la bandeja principal.'],
          role: 'BP TI / Administrador'
        },
        {
          action: 'Mover a En demanda',
          target: 'En demanda',
          conditions: ['Re-aprueba la iniciativa directamente sin pasar por filtros adicionales.'],
          role: 'BP TI / Administrador'
        }
      ]
    }
  };

  const activeState = statesData[selectedState];

  // Datos para el Journey Map
  const journeySteps = [
    {
      phase: '1. Ideación y Borrador',
      role: 'Registrador (Solicitante)',
      icon: <FileText className="w-5 h-5 text-slate-600" />,
      state: 'Borrador',
      description: 'El originador define los objetivos, costos estimados y beneficios de la iniciativa técnica.',
      action: 'Completa formulario inicial y sube el Visto Bueno (VoBo) si aplica.',
      exits: [
        { label: 'Guardar Borrador', target: 'Borrador', desc: 'Permite continuar editando después.' },
        { label: 'Enviar a Aprobación', target: 'Pendiente de aprobación', desc: 'Gatilla validaciones e ingresa a bandeja de TI.' }
      ]
    },
    {
      phase: '2. Ingreso y Asignación',
      role: 'Administrador / Sistema',
      icon: <Layers className="w-5 h-5 text-indigo-600" />,
      state: 'Pendiente de aprobación',
      description: 'La iniciativa ingresa a la bandeja central de TI y se asigna a un BP de TI según VP.',
      action: 'El Administrador o el sistema asigna la iniciativa a un BP TI responsable para evaluación técnica.',
      exits: [
        { label: 'Asignación de BP', target: 'Pendiente de aprobación', desc: 'Define quién evaluará la iniciativa.' }
      ]
    },
    {
      phase: '3. Evaluación y Filtros VoBo',
      role: 'BP TI / Administrador',
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      state: 'Pendiente de aprobación',
      description: 'Se valida la viabilidad técnica y las firmas de aprobación correspondientes.',
      action: 'El BP TI valida el archivo de VoBo de VP adjunto (si existe).',
      exits: [
        { label: 'VoBo VP Incorrecto', target: 'Observada', desc: 'Rechaza la firma y devuelve la iniciativa al Registrador.' },
        { label: 'VoBo VP Correcto', target: 'Pendiente de aprobación', desc: 'Habilita botón de aprobación definitiva.' }
      ]
    },
    {
      phase: '4. Hito de Decisión',
      role: 'BP TI / Administrador',
      icon: <Compass className="w-5 h-5 text-emerald-600" />,
      state: 'Pendiente de aprobación',
      description: 'Se emite la resolución de la propuesta de iniciativa.',
      action: 'Se selecciona una de las tres acciones de decisión final.',
      exits: [
        { label: 'Aprobar', target: 'En demanda', desc: 'Mueve la propuesta a la cola de demandas autorizadas (Estado Final).' },
        { label: 'Observar', target: 'Observada', desc: 'Se proponen cambios de campos y se regresa al originador para correcciones.' },
        { label: 'Desestimar', target: 'Desestimada', desc: 'Se cancela de manera definitiva o temporal la iniciativa (Estado Final).' }
      ]
    },
    {
      phase: '5. Retorno y Ciclo de Ajustes',
      role: 'Registrador / BP TI',
      icon: <RefreshCcw className="w-5 h-5 text-blue-600" />,
      state: 'Observada',
      description: 'Ciclo interactivo de corrección de observaciones por parte del Registrador.',
      action: 'El Registrador acepta o ajusta los campos sugeridos por TI.',
      exits: [
        { label: 'Reenviar', target: 'Pendiente de aprobación', desc: 'Limpia campos de sugerencia e ingresa a revisión nuevamente.' }
      ]
    },
    {
      phase: '6. Recuperación o Reactivación',
      role: 'BP TI / Administrador',
      icon: <RotateCcw className="w-5 h-5 text-red-600" />,
      state: 'Desestimada',
      description: 'Opción de rescate para iniciativas que fueron descartadas previamente.',
      action: 'El Administrador evalúa si las condiciones de negocio cambiaron.',
      exits: [
        { label: 'Mover a Nueva', target: 'Pendiente de aprobación', desc: 'Se vuelve a evaluar desde cero.' },
        { label: 'Mover a En demanda', target: 'En demanda', desc: 'Se aprueba directamente sin filtros adicionales.' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-2">
            <GitBranch className="w-7 h-7 text-[#4F5AF5]" />
            Journey y Flujos de la Iniciativa
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Visualiza quién opera cada estado, las reglas de negocio y cómo avanza el ciclo de vida de las propuestas.
          </p>
        </div>
        
        {/* Selector de Pestañas con Premium UX */}
        <div className="flex bg-[#F1F5F9] p-1.5 rounded-xl border border-slate-200 self-start md:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab('flowchart')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'flowchart' 
                ? 'bg-white text-[#4F5AF5] shadow-sm' 
                : 'text-[#64748B] hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Flujograma (Swimlanes)
          </button>
          <button
            onClick={() => setActiveTab('journey')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'journey' 
                ? 'bg-white text-[#4F5AF5] shadow-sm' 
                : 'text-[#64748B] hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Paso a Paso
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'matrix' 
                ? 'bg-white text-[#4F5AF5] shadow-sm' 
                : 'text-[#64748B] hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Matriz de Reglas
          </button>
        </div>
      </div>

      {/* RENDER SEGÚN TAB SELECCIONADA */}
      {activeTab === 'flowchart' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-fadeIn">
          
          {/* Panel Izquierdo/Centro: Swimlanes Flowchart */}
          <div className="xl:col-span-3 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm overflow-x-auto">
            <div className="min-w-[850px] space-y-6">
              
              {/* Cabeceras de Roles (Carriles/Swimlanes) */}
              <div className="grid grid-cols-3 gap-4 text-center border-b pb-3 border-slate-200">
                <div className="bg-slate-50 py-2 rounded-lg border border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-center gap-1.5">
                  <User className="w-4 h-4 text-slate-500" />
                  REGISTRADOR (SOLICITANTE)
                </div>
                <div className="bg-indigo-50 py-2 rounded-lg border border-indigo-150 font-bold text-xs text-indigo-800 flex items-center justify-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  BP TI / ADMINISTRADOR
                </div>
                <div className="bg-emerald-50 py-2 rounded-lg border border-emerald-150 font-bold text-xs text-emerald-800 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ESTADOS FINALIZADOS
                </div>
              </div>

              {/* Fila 1: Creación & Envío */}
              <div className="grid grid-cols-3 gap-4 items-center min-h-[100px]">
                {/* Carril Registrador */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setSelectedState('Borrador')}
                    className={`p-4 w-full rounded-xl border text-left transition-all ${
                      selectedState === 'Borrador' 
                        ? 'bg-slate-50 border-slate-500 shadow-md ring-2 ring-slate-100 font-bold' 
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">1. Borrador</span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Borrador</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">Iniciativa en edición preliminar por el originador.</p>
                  </button>
                </div>

                {/* Arrow to middle lane */}
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-1 text-[#4F5AF5] text-[10px] font-bold bg-[#EEF2FF] px-2.5 py-1 rounded-full border border-indigo-100 shadow-sm">
                    <span>Enviar a aprobación</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Carril Finalizado (Vacío en esta fila) */}
                <div className="text-center text-xs text-slate-300 italic">-</div>
              </div>

              {/* Fila 2: Revisión y Decisiones */}
              <div className="grid grid-cols-3 gap-4 items-center min-h-[140px] border-t border-dashed pt-4">
                {/* Carril Registrador: Observada */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setSelectedState('Observada')}
                    className={`p-4 w-full rounded-xl border text-left transition-all ${
                      selectedState === 'Observada' 
                        ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-100 font-bold' 
                        : 'bg-white border-slate-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-700">Observada</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">Observada</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">Tiene observaciones / cambios sugeridos. El Registrador debe ajustar y Reenviar.</p>
                  </button>

                  <div className="flex items-center gap-1 text-[#4F5AF5] text-[9px] font-bold mt-3">
                    <RefreshCcw className="w-3 h-3 animate-spin" />
                    <span>Reenviar vuelve a Revisión</span>
                  </div>
                </div>

                {/* Carril BP/Admin: Pendiente de aprobación */}
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => setSelectedState('Pendiente de aprobación')}
                    className={`p-4 w-full rounded-xl border text-left transition-all ${
                      selectedState === 'Pendiente de aprobación' 
                        ? 'bg-[#EEF2FF] border-[#4F5AF5] shadow-md ring-2 ring-indigo-100 font-bold' 
                        : 'bg-white border-slate-200 hover:border-[#4F5AF5]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#4F5AF5]">2. Pendiente de aprobación</span>
                      <span className="text-[9px] bg-[#EEF2FF] text-[#4F5AF5] px-1.5 py-0.5 rounded font-mono">Revisión</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">Evaluación de firmas de VoBo VP. Si hay VoBo, debe marcarse Correcto antes de aprobar.</p>
                  </button>

                  {/* Decision Tree Actions */}
                  <div className="flex flex-col gap-1.5 w-full bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block text-center mb-1">Acciones del Evaluador</span>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold text-center py-1 rounded border border-emerald-100">Aprobar</span>
                      <span className="bg-amber-50 text-amber-700 text-[8px] font-bold text-center py-1 rounded border border-amber-100">Observar</span>
                      <span className="bg-red-50 text-red-700 text-[8px] font-bold text-center py-1 rounded border border-red-100 font-medium">Desestimar</span>
                    </div>
                  </div>
                </div>

                {/* Carril Finalizado: En demanda o Desestimada */}
                <div className="space-y-4">
                  {/* Aprobado */}
                  <button
                    onClick={() => setSelectedState('En demanda')}
                    className={`p-4 w-full rounded-xl border text-left transition-all ${
                      selectedState === 'En demanda' 
                        ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-100 font-bold' 
                        : 'bg-white border-slate-200 hover:border-emerald-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-800">3A. En demanda</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">Aprobado</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">Iniciativa lista en el backlog. No se puede editar.</p>
                  </button>

                  {/* Desestimada */}
                  <button
                    onClick={() => setSelectedState('Desestimada')}
                    className={`p-4 w-full rounded-xl border text-left transition-all ${
                      selectedState === 'Desestimada' 
                        ? 'bg-red-50 border-red-500 shadow-md ring-2 ring-red-100 font-bold' 
                        : 'bg-white border-slate-200 hover:border-red-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-red-700">3B. Desestimada</span>
                      <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-mono">Descartado</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">Iniciativa descartada. Recuperable por el Administrador.</p>
                  </button>
                </div>
              </div>

              {/* Fila 3: Acciones de Recuperación (Administración) */}
              <div className="grid grid-cols-3 gap-4 items-center min-h-[80px] border-t border-dashed pt-4">
                {/* Carril Registrador (Vacío) */}
                <div className="text-center text-xs text-slate-300 italic">-</div>

                {/* Carril Admin (Rescate) */}
                <div className="flex justify-center">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center max-w-[240px] shadow-sm">
                    <span className="text-[9px] font-extrabold uppercase text-[#4F5AF5] block mb-1">Módulo de Rescate</span>
                    <p className="text-[10px] text-slate-500 mb-2 leading-none">Permite reactivar iniciativas desestimadas.</p>
                    <div className="flex justify-center gap-1.5">
                      <span className="bg-white border px-2 py-0.5 rounded text-[8px] font-semibold text-indigo-700">Mover a Nueva</span>
                      <span className="bg-white border px-2 py-0.5 rounded text-[8px] font-semibold text-emerald-700">Mover a Demanda</span>
                    </div>
                  </div>
                </div>

                {/* Carril Finalizado (Vacío) */}
                <div className="text-center text-xs text-slate-300 italic">-</div>
              </div>

            </div>
          </div>

          {/* Panel Derecho: Detalle del Estado Seleccionado */}
          <div className={`bg-white rounded-2xl border ${activeState.border} p-6 shadow-sm flex flex-col justify-between transition-all`}>
            <div className="space-y-6">
              
              {/* Header del Estado */}
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <span className="text-xs text-slate-400 font-mono tracking-wider uppercase">Detalle del Estado</span>
                  <h3 className={`text-lg font-bold ${activeState.color} mt-0.5`}>
                    {activeState.name}
                  </h3>
                </div>
                <div className={`p-2.5 rounded-xl ${activeState.iconBg}`}>
                  <GitBranch className="w-5 h-5" />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Descripción</h4>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  {activeState.description}
                </p>
              </div>

              {/* Roles con Permiso */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Roles con Permiso</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeState.roles.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-slate-50 text-slate-800 text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-200">
                      <User className="w-3 h-3 text-slate-400" />
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Acciones del Estado */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Acciones permitidas</h4>
                <ul className="space-y-1.5">
                  {activeState.actions.map((act, i) => (
                    <li key={i} className="text-xs text-[#64748B] flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Detalles Operativos */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Reglas de Negocio y Datos</h4>
                <ul className="space-y-1.5">
                  {activeState.details.map((det, i) => (
                    <li key={i} className="text-xs text-[#64748B] flex items-start gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <Info className="w-3.5 h-3.5 text-[#4F5AF5] shrink-0 mt-0.5" />
                      <span>{det}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}

      {activeTab === 'journey' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-8 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-[#1E293B] mb-1">User Journey del Proceso de Demandas</h2>
            <p className="text-xs text-[#64748B]">Mapa cronológico del ciclo de vida detallado, desde la idea inicial del Registrador hasta los estados de resolución finales.</p>
          </div>

          <div className="relative border-l-2 border-[#4F5AF5]/20 ml-4 pl-8 space-y-10">
            {journeySteps.map((step, idx) => (
              <div key={idx} className="relative">
                {/* Indicador de hito */}
                <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-full bg-white border-2 border-[#4F5AF5] flex items-center justify-center shadow-sm">
                  {step.icon}
                </div>
                
                {/* Card de la etapa */}
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-3">
                    <div>
                      <span className="text-xs text-[#4F5AF5] font-extrabold uppercase tracking-wide block">{step.phase}</span>
                      <h3 className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                        {step.description}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded">
                        Rol: {step.role}
                      </span>
                      <span className="bg-[#EEF2FF] text-[#4F5AF5] text-[10px] font-mono px-2.5 py-1 rounded border border-indigo-100">
                        Estado BD: {step.state}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Acción del paso */}
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-extrabold uppercase text-slate-400">Acción Requerida en esta fase</h4>
                      <p className="text-xs text-[#4F5AF5] font-medium bg-white p-3 rounded-lg border border-slate-100">
                        {step.action}
                      </p>
                    </div>

                    {/* Caminos de salida / Decisiones */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-extrabold uppercase text-slate-400">Posibles Salidas e Hitos</h4>
                      <div className="space-y-2">
                        {step.exits.map((ex, exIdx) => (
                          <div key={exIdx} className="bg-white border rounded-lg p-2.5 flex items-start gap-2">
                            <CornerRightDown className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-800">{ex.label}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                  {ex.target}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">{ex.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-[#1E293B] mb-1">Matriz de Reglas y Condiciones Técnicas</h2>
            <p className="text-xs text-[#64748B]">Mapa detallado de todas las transiciones del sistema, campos de base de datos alterados y condiciones lógicas.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Estado Origen</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Acción disparadora</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Estado Destino</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Condiciones Lógicas & Campos BD</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Operado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td className="p-3 font-semibold text-slate-600">Borrador</td>
                  <td className="p-3 font-semibold text-indigo-600">Enviar a Aprobación</td>
                  <td className="p-3"><span className="bg-[#EEF2FF] text-[#4F5AF5] px-2 py-0.5 rounded font-medium">Pendiente de aprobación</span></td>
                  <td className="p-3 text-slate-500">Valida que se ingresen campos mínimos requeridos en el formulario.</td>
                  <td className="p-3 text-slate-600">Registrador (Originador)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-600">Pendiente de aprobación</td>
                  <td className="p-3 font-semibold text-emerald-600">Aprobar</td>
                  <td className="p-3"><span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">En demanda</span></td>
                  <td className="p-3 text-slate-500">
                    Si el campo `aprobacin_de_director` contiene un VoBo adjunto, se requiere que la validación manual del BP sea `_vobo_status === "correcto"`.
                  </td>
                  <td className="p-3 text-slate-600">BP TI, Admin</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-600">Pendiente de aprobación</td>
                  <td className="p-3 font-semibold text-amber-600">Observar</td>
                  <td className="p-3"><span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">Observada</span></td>
                  <td className="p-3 text-slate-500">
                    El evaluador debe ingresar cambios sugeridos en los campos editables. Estos se almacenan en `_suggested_changes` para guiar al registrador.
                  </td>
                  <td className="p-3 text-slate-600">BP TI, Admin</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-600">Pendiente de aprobación</td>
                  <td className="p-3 font-semibold text-red-600">Desestimar</td>
                  <td className="p-3"><span className="bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium">Desestimada</span></td>
                  <td className="p-3 text-slate-500">
                    Requiere ingresar un motivo en `rejection_reason` o en el historial (`_observation_history`).
                  </td>
                  <td className="p-3 text-slate-600">BP TI, Admin</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-600">Observada</td>
                  <td className="p-3 font-semibold text-indigo-600">Reenviar a Aprobación</td>
                  <td className="p-3"><span className="bg-[#EEF2FF] text-[#4F5AF5] px-2 py-0.5 rounded font-medium">Pendiente de aprobación</span></td>
                  <td className="p-3 text-slate-500">
                    Limpia el objeto `_suggested_changes` de `form_data` y añade una entrada al historial del flujo (`_observation_history`).
                  </td>
                  <td className="p-3 text-slate-600">Registrador (Originador)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-600">En demanda</td>
                  <td className="p-3 font-semibold text-red-600">Desestimar</td>
                  <td className="p-3"><span className="bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium">Desestimada</span></td>
                  <td className="p-3 text-slate-500">
                    Mueve la iniciativa a archivado lógico. Se registra el cambio en el historial.
                  </td>
                  <td className="p-3 text-slate-600">BP TI, Admin</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-600">Desestimada</td>
                  <td className="p-3 font-semibold text-indigo-600">Mover a Nueva</td>
                  <td className="p-3"><span className="bg-[#EEF2FF] text-[#4F5AF5] px-2 py-0.5 rounded font-medium">Pendiente de aprobación</span></td>
                  <td className="p-3 text-slate-500">
                    Devuelve la iniciativa a la bandeja de pendientes. Útil si se decide reevaluarla después de descartada.
                  </td>
                  <td className="p-3 text-slate-600">BP TI, Admin</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-600">Desestimada</td>
                  <td className="p-3 font-semibold text-emerald-600">Mover a En demanda</td>
                  <td className="p-3"><span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">En demanda</span></td>
                  <td className="p-3 text-slate-500">
                    Rescata la iniciativa y la aprueba directamente, moviéndola al backlog técnico.
                  </td>
                  <td className="p-3 text-slate-600">BP TI, Admin</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
