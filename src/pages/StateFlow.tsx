import React, { useState } from 'react';
import { 
  GitBranch, User, CheckCircle2, Info, ArrowRight, ArrowDown,
  Shield, CheckCircle, Ban, AlertTriangle, ChevronRight, ChevronDown,
  FileText, CheckSquare, Settings, Play, RefreshCw, XCircle, HelpCircle, Layers
} from 'lucide-react';

interface SubActivity {
  name: string;
  responsible: string;
  description: string;
  inputs?: string[];
  outputs?: string[];
  rules?: string[];
}

interface GatewayInfo {
  question: string;
  branches: {
    condition: string;
    targetState: string;
    description: string;
  }[];
}

interface MacroPhase {
  id: string;
  number: string;
  name: string;
  shortDesc: string;
  color: string;
  bg: string;
  border: string;
  accentBg: string;
  responsibleRoles: string[];
  activities: SubActivity[];
  gateways?: GatewayInfo[];
}

export default function StateFlow() {
  const [expandedPhase, setExpandedPhase] = useState<string | null>('evaluacion');
  const [selectedSubActivity, setSelectedSubActivity] = useState<string | null>(null);

  const macroPhases: MacroPhase[] = [
    {
      id: 'registro',
      number: 'Fase 01',
      name: 'Registro y Ajustes de la Iniciativa',
      shortDesc: 'Creación de propuestas preliminares y subsanación de campos observados por el solicitante.',
      color: 'text-slate-800',
      bg: 'bg-[#F8FAFC]',
      border: 'border-slate-350',
      accentBg: 'bg-slate-100 text-slate-705',
      responsibleRoles: ['Registrador (Solicitante)', 'BP TI (soporte de edición)'],
      activities: [
        {
          name: '1. Creación de Borrador',
          responsible: 'Registrador (Solicitante)',
          description: 'El solicitante ingresa la información básica, pilar estratégico, justificación técnica y carga el archivo de Visto Bueno (VoBo VP) si ya lo posee.',
          inputs: ['Formulario de Iniciativa (Descripción, Pilar, Institución, etc.)', 'Adjunto de VoBo VP (Opcional en esta etapa)'],
          outputs: ['Registro en base de datos con estado "Borrador"', 'Visibilidad exclusiva para el creador y administradores'],
          rules: [
            'Los borradores no gatillan correos electrónicos.',
            'Se pueden editar todos los campos tantas veces como sea necesario antes del envío.'
          ]
        },
        {
          name: '2. Subsanación de Observaciones',
          responsible: 'Registrador / BP TI (en caso de ausencia)',
          description: 'Si la iniciativa es observada, el registrador visualiza los campos sugeridos destacados y procede a corregirlos o aceptar sugerencias del BP.',
          inputs: ['Campos observados', 'Objeto de cambios sugeridos (_suggested_changes)', 'Historial de observaciones'],
          outputs: ['Campos corregidos', 'Cambios sugeridos vaciados tras el reenvío'],
          rules: [
            'Si solo tiene rol de Registrador, solo el creador original (isMine) puede editar u operar transiciones.',
            'Si está fuera de oficina, el rol de BP TI asignado a sus direcciones puede editar y regresar la iniciativa al flujo.'
          ]
        }
      ],
      gateways: [
        {
          question: '¿Campos obligatorios completos al enviar?',
          branches: [
            {
              condition: 'Sí',
              targetState: 'Pendiente de aprobación',
              description: 'La iniciativa pasa a la bandeja principal de evaluación y es visible por el BP TI.'
            },
            {
              condition: 'No',
              targetState: 'Borrador / Observada',
              description: 'El sistema bloquea la transición indicando qué campos falta completar.'
            }
          ]
        }
      ]
    },
    {
      id: 'evaluacion',
      number: 'Fase 02',
      name: 'Evaluación y Aprobación de TI',
      shortDesc: 'Control de firmas del Visto Bueno, asignación de BP TI por dirección y decisión final del requerimiento.',
      color: 'text-indigo-800',
      bg: 'bg-[#F5F7FF]',
      border: 'border-indigo-200',
      accentBg: 'bg-[#EEF2FF] text-[#4F5AF5]',
      responsibleRoles: ['Business Partner TI (BP TI)', 'Administrador de Sistema'],
      activities: [
        {
          name: '1. Asignación de BP TI',
          responsible: 'BP TI / Administrador',
          description: 'La iniciativa ingresada se vincula a un Business Partner de TI específico según las direcciones a las que pertenece el requerimiento.',
          inputs: ['Iniciativa en estado "Pendiente de aprobación"', 'Dirección solicitante'],
          outputs: ['Campo bp_ti_asignado configurado con el usuario correspondiente'],
          rules: [
            'Solo los BPs de TI asignados a la dirección de la iniciativa (o administradores) pueden interactuar con el flujo formal.'
          ]
        },
        {
          name: '2. Evaluación de Visto Bueno (VoBo VP)',
          responsible: 'Business Partner TI (BP TI)',
          description: 'El BP analiza la firma o documento adjunto de aprobación del Vicepresidente. Marca el documento como "Correcto" o "Incorrecto" según corresponda.',
          inputs: ['Archivo adjunto aprobacin_de_director'],
          outputs: ['Estado de VoBo actualizado en el registro (_vobo_status)'],
          rules: [
            'Si existe un VoBo cargado, no se habilitará la aprobación definitiva hasta que el estado del VoBo sea validado como "Correcto".',
            'Si se marca como "Incorrecto" con observaciones, la iniciativa se mueve automáticamente a "Observada" alertando al registrador.'
          ]
        },
        {
          name: '3. Resolución de la Iniciativa',
          responsible: 'BP TI / Administrador',
          description: 'El BP TI toma la decisión sobre la propuesta basándose en los criterios del negocio y factibilidad técnica.',
          inputs: ['Iniciativa con VoBo validado (si aplica)', 'Campos completados'],
          outputs: ['Transición a estado final: "En demanda" o "Desestimada"'],
          rules: [
            'Aprobar: Requiere VoBo Correcto. Genera estado "En demanda".',
            'Observar: Requiere al menos un cambio sugerido. Genera estado "Observada" y notifica al originador.',
            'Desestimar: Requiere comentario de rechazo. Genera estado "Desestimada".'
          ]
        }
      ],
      gateways: [
        {
          question: '¿Cuenta con Visto Bueno de VP?',
          branches: [
            {
              condition: 'No adjuntó archivo',
              targetState: 'Aprobar directamente',
              description: 'Se permite la aprobación sin módulo de VoBo obligatorio.'
            },
            {
              condition: 'Adjuntó archivo & VoBo Correcto',
              targetState: 'Habilitado para Aprobar',
              description: 'Se valida la firma de manera conforme y se habilita la transición a demanda.'
            },
            {
              condition: 'Adjuntó archivo & VoBo Incorrecto',
              targetState: 'Observada',
              description: 'Devuelve automáticamente la iniciativa a subsanación del originador.'
            }
          ]
        }
      ]
    },
    {
      id: 'backlog',
      number: 'Fase 03',
      name: 'Paso a Demanda (Backlog)',
      shortDesc: 'Aprobación definitiva del requerimiento e incorporación a la cola formal de desarrollo.',
      color: 'text-emerald-800',
      bg: 'bg-[#F4FBF7]',
      border: 'border-emerald-250',
      accentBg: 'bg-emerald-50 text-emerald-700',
      responsibleRoles: ['Equipo Técnico', 'BP TI', 'Administrador'],
      activities: [
        {
          name: '1. Registro en Cola de Demandas',
          responsible: 'Sistema / BP TI',
          description: 'La iniciativa entra al backlog oficial de TI. Se congela la edición de datos para preservar el requerimiento aprobado.',
          inputs: ['Iniciativa aprobada en estado "En demanda"'],
          outputs: ['Iniciativa en modo de solo lectura para todos los roles'],
          rules: [
            'Los campos no pueden ser modificados por ningún usuario en este estado.',
            'Se notifica a los interesados del ingreso al backlog.'
          ]
        }
      ]
    },
    {
      id: 'rescate',
      number: 'Fase 04',
      name: 'Archivo Lógico y Rescate de Iniciativas',
      shortDesc: 'Gestión de propuestas desestimadas y flujo extraordinario de reactivación.',
      color: 'text-red-800',
      bg: 'bg-[#FFF5F5]',
      border: 'border-red-200',
      accentBg: 'bg-red-50 text-red-700',
      responsibleRoles: ['Administrador de Sistema', 'BP TI'],
      activities: [
        {
          name: '1. Desestimación',
          responsible: 'BP TI / Administrador',
          description: 'Iniciativas canceladas o cuya prioridad ya no es viable se archivan lógicamente conservando su histórico.',
          inputs: ['Comentario de desestimación'],
          outputs: ['Registro en estado "Desestimada"'],
          rules: [
            'Mantiene visible el motivo de desestimación en el historial de revisiones.'
          ]
        },
        {
          name: '2. Reactivación Extraordinaria',
          responsible: 'Administrador / BP TI asignado',
          description: 'Permite revivir una iniciativa archivada sin necesidad de que el Registrador tenga que registrarla de nuevo.',
          inputs: ['Acción manual del evaluador'],
          outputs: ['Transición a "Pendiente de aprobación" (Mover a nueva) o "En demanda" (Mover a demanda)'],
          rules: [
            'Mover a Nueva: Devuelve la iniciativa al flujo formal para re-evaluación.',
            'Mover a Demanda: Aprueba directamente la iniciativa desestimada.'
          ]
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-[#4F5AF5]" />
            Journey y Mapa de Procesos BPMN
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Explora las fases del ciclo de vida en niveles jerárquicos. Haz clic en una fase para abrir su diagrama BPMN detallado, reglas de negocio y transiciones lógicas.
          </p>
        </div>
      </div>

      {/* BPMN Nivel 1: Macro-Proceso (Horizontal) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm overflow-hidden">
        <h2 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#64748B]" />
          BPMN Nivel 1: Mapa del Macro-Proceso General
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {macroPhases.map((phase, idx) => {
            const isSelected = expandedPhase === phase.id;
            return (
              <div key={phase.id} className="relative flex flex-col md:flex-row items-center gap-2">
                <div 
                  onClick={() => setExpandedPhase(isSelected ? null : phase.id)}
                  className={`w-full p-4 rounded-xl border text-left cursor-pointer transition-all ${phase.bg} ${
                    isSelected 
                      ? `border-[#4F5AF5] shadow-md ring-2 ring-indigo-50 border-t-4` 
                      : 'border-[#E2E8F0] hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${phase.accentBg}`}>{phase.number}</span>
                    <span className="text-[10px] text-slate-400 italic font-medium">Clic para expandir</span>
                  </div>
                  <h3 className={`text-sm font-extrabold text-[#1E293B] truncate`}>{phase.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{phase.shortDesc}</p>
                  
                  <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex flex-wrap gap-1">
                    {phase.responsibleRoles.slice(0, 1).map((r, i) => (
                      <span key={i} className="text-[9px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                        <User className="w-2.5 h-2.5 text-slate-400" /> {r}
                      </span>
                    ))}
                    {phase.responsibleRoles.length > 1 && (
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono font-bold">+{phase.responsibleRoles.length - 1}</span>
                    )}
                  </div>
                </div>
                {idx !== 3 && (
                  <div className="hidden md:flex text-slate-350 pointer-events-none absolute right-[-10px] z-10 shrink-0">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BPMN Nivel 2: Detalle de la Fase Expandida */}
      {expandedPhase && (() => {
        const phase = macroPhases.find(p => p.id === expandedPhase)!;
        return (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fadeIn">
            
            {/* Diagrama BPMN Interactivo */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b pb-3 mb-6">
                  <div>
                    <span className="text-[10px] text-[#4F5AF5] font-extrabold uppercase tracking-widest">{phase.number} • Sub-proceso BPMN</span>
                    <h2 className="text-base font-extrabold text-[#1E293B] mt-0.5">{phase.name}</h2>
                  </div>
                  <button 
                    onClick={() => setExpandedPhase(null)}
                    className="text-xs font-bold text-[#64748B] hover:text-[#1E293B] bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]"
                  >
                    Contraer
                  </button>
                </div>

                {/* Swimlanes o Flujo Visual de Actividades */}
                <div className="space-y-6">
                  <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-extrabold uppercase text-[#64748B] tracking-wider mb-2 flex items-center gap-1">
                      <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                      Flujo de Actividades y Tareas en Serie
                    </h3>
                    
                    <div className="flex flex-col md:flex-row items-stretch gap-4 justify-between">
                      {phase.activities.map((act, actIdx) => {
                        const isSubSelected = selectedSubActivity === act.name;
                        return (
                          <React.Fragment key={act.name}>
                            <div 
                              onClick={() => setSelectedSubActivity(isSubSelected ? null : act.name)}
                              className={`flex-1 p-4 rounded-xl border text-left cursor-pointer transition-all ${
                                isSubSelected 
                                  ? 'bg-[#EEF2FF] border-[#4F5AF5] shadow-sm ring-2 ring-indigo-50' 
                                  : 'bg-white border-[#E2E8F0] hover:border-slate-400'
                              }`}
                            >
                              <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{act.responsible}</span>
                              <h4 className="text-xs font-extrabold text-slate-800 mt-2">{act.name}</h4>
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-3 leading-relaxed">{act.description}</p>
                              <div className="mt-3 flex justify-between items-center text-[10px] font-bold text-[#4F5AF5]">
                                <span>Ver reglas y E/S</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            {actIdx !== phase.activities.length - 1 && (
                              <div className="flex md:hidden items-center justify-center text-slate-350 py-2">
                                <ArrowDown className="w-5 h-5" />
                              </div>
                            )}
                            {actIdx !== phase.activities.length - 1 && (
                              <div className="hidden md:flex items-center justify-center text-slate-300 shrink-0">
                                <ArrowRight className="w-5 h-5" />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gateways y Criterios Lógicos (BPMN Gateways) */}
                  {phase.gateways && phase.gateways.length > 0 && (
                    <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rotate-45 border-2 border-amber-500 bg-white flex items-center justify-center shrink-0">
                          <span className="-rotate-45 text-[10px] font-bold text-amber-600">?</span>
                        </div>
                        <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                          Gateway Lógico BPMN: {phase.gateways[0].question}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {phase.gateways[0].branches.map((br, bIdx) => (
                          <div key={bIdx} className="bg-white border border-amber-100 rounded-lg p-3 shadow-sm">
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-extrabold font-mono uppercase">{br.condition}</span>
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="text-[11px] text-slate-500">Mueve a:</span>
                              <span className="text-[10px] font-bold bg-[#EEF2FF] text-[#4F5AF5] px-1.5 py-0.5 rounded font-mono border border-indigo-100">{br.targetState}</span>
                            </div>
                            <p className="text-[10px] text-[#64748B] mt-1.5 leading-relaxed">{br.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón de cierre o contraer */}
              <div className="mt-6 pt-4 border-t border-slate-200/50 flex justify-end">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#4F5AF5]" />
                  Selecciona una actividad para ver detalles de Entradas/Salidas y Reglas Operativas.
                </span>
              </div>
            </div>

            {/* Ficha Técnica de la Actividad Seleccionada */}
            <div className={`bg-white rounded-2xl border ${selectedSubActivity ? 'border-[#4F5AF5]' : 'border-[#E2E8F0]'} p-6 shadow-sm flex flex-col justify-between transition-all`}>
              {(() => {
                const activity = phase.activities.find(a => a.name === selectedSubActivity);
                if (!activity) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-[#94A3B8] h-full space-y-3">
                      <HelpCircle className="w-10 h-10 text-slate-300" />
                      <div>
                        <p className="font-bold text-slate-500 text-sm">Ficha Técnica de Actividad</p>
                        <p className="text-xs text-slate-400 max-w-[200px] mt-1">Haz clic en cualquier actividad del diagrama para inspeccionar sus datos.</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="space-y-6">
                    <div className="border-b pb-4">
                      <span className="text-[9px] text-[#4F5AF5] font-extrabold uppercase tracking-wider block">Ficha de Actividad</span>
                      <h3 className="text-sm font-extrabold text-slate-800 mt-1">{activity.name}</h3>
                      <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 mt-2">
                        <User className="w-3 h-3 text-slate-400" /> {activity.responsible}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">Entradas (Inputs)</h4>
                      <div className="space-y-1.5">
                        {activity.inputs?.map((inp, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#4F5AF5] shrink-0" />
                            {inp}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">Salidas (Outputs)</h4>
                      <div className="space-y-1.5">
                        {activity.outputs?.map((out, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            {out}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">Reglas de Negocio Aplicadas</h4>
                      <ul className="space-y-2">
                        {activity.rules?.map((rule, idx) => (
                          <li key={idx} className="text-xs text-[#64748B] flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 bg-[#4F5AF5] rounded-full mt-1.5 shrink-0" />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        );
      })()}
      
      {/* Matriz y Reglas Adicionales */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-bold text-[#1E293B] mb-1 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-[#64748B]" />
            Resumen Lógico de Transiciones del Sistema
          </h2>
          <p className="text-xs text-[#64748B]">Detalle técnico de los disparadores y cambios en base de datos para todas las transiciones lógicas del software.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <th className="p-3">Estado Origen</th>
                <th className="p-3">Acción Disparadora</th>
                <th className="p-3">Estado Destino</th>
                <th className="p-3">Responsable</th>
                <th className="p-3">Condiciones de Validación & Campo DB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[#475569]">
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-800">Borrador</td>
                <td className="p-3 font-semibold text-[#4F5AF5]">Enviar a aprobación</td>
                <td className="p-3 font-bold text-[#4F5AF5]">Pendiente de aprobación</td>
                <td className="p-3">Registrador</td>
                <td className="p-3">Valida que se ingresen campos mínimos obligatorios. Modifica campo `status` a "Pendiente de aprobación".</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-800">Pendiente de aprobación</td>
                <td className="p-3 font-semibold text-emerald-600">Aprobar</td>
                <td className="p-3 font-bold text-emerald-700">En demanda</td>
                <td className="p-3">BP TI, Admin</td>
                <td className="p-3">Si hay VoBo VP (`aprobacin_de_director`), requiere que esté validado como "correcto" (`_vobo_status === "correcto"`).</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-800">Pendiente de aprobación</td>
                <td className="p-3 font-semibold text-amber-600">Observar</td>
                <td className="p-3 font-bold text-amber-700">Observada</td>
                <td className="p-3">BP TI, Admin</td>
                <td className="p-3">Requiere ingresar cambios sugeridos en los campos. Los valores se almacenan temporalmente en `_suggested_changes`.</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-800">Pendiente de aprobación</td>
                <td className="p-3 font-semibold text-red-600">Desestimar</td>
                <td className="p-3 font-bold text-red-700">Desestimada</td>
                <td className="p-3">BP TI, Admin</td>
                <td className="p-3">Requiere ingresar comentario de desestimación en el historial. Modifica `status` a "Desestimada".</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-800">Observada</td>
                <td className="p-3 font-semibold text-[#4F5AF5]">Reenviar a aprobación</td>
                <td className="p-3 font-bold text-[#4F5AF5]">Pendiente de aprobación</td>
                <td className="p-3">Registrador</td>
                <td className="p-3">Aplica correcciones, limpia `_suggested_changes` y añade snapshot del estado del formulario en `_observation_history`.</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-800">Desestimada</td>
                <td className="p-3 font-semibold text-[#4F5AF5]">Mover a Nueva (Rescate)</td>
                <td className="p-3 font-bold text-[#4F5AF5]">Pendiente de aprobación</td>
                <td className="p-3">BP TI, Admin</td>
                <td className="p-3">Reactiva el requerimiento moviéndolo de regreso a la bandeja de pendientes.</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-800">Desestimada</td>
                <td className="p-3 font-semibold text-emerald-600">Mover a En demanda</td>
                <td className="p-3 font-bold text-emerald-700">En demanda</td>
                <td className="p-3">BP TI, Admin</td>
                <td className="p-3">Aprueba y rescata directamente la propuesta desestimada, registrándola en la cola técnica.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
