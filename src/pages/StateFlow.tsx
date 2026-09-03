import React, { useState, useEffect } from 'react';
import { 
  GitBranch, User, CheckCircle2, Info, ArrowRight, ArrowDown,
  Shield, CheckCircle, Ban, AlertTriangle, ChevronRight, ChevronDown,
  FileText, CheckSquare, Settings, Play, RefreshCw, XCircle, HelpCircle, Layers,
  ExternalLink, Edit, Sparkles, BrainCircuit
} from 'lucide-react';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  Controls, 
  MiniMap, 
  Background, 
  BackgroundVariant 
} from '@xyflow/react';
import { Link } from 'react-router-dom';
import { StateNode } from '../components/workflow/nodes/StateNode';
import { GatewayNode } from '../components/workflow/nodes/GatewayNode';
import { AIAgentNode } from '../components/workflow/nodes/AIAgentNode';
import { AITextNode } from '../components/workflow/nodes/AITextNode';
import { HumanTaskNode } from '../components/workflow/nodes/HumanTaskNode';
import { WorkflowEdge } from '../components/workflow/WorkflowEdge';
import type { WorkflowDefinition } from '../types';

const NODE_TYPES = {
  state: StateNode,
  gateway: GatewayNode,
  ai_agent: AIAgentNode,
  ai_text: AITextNode,
  human_task: HumanTaskNode,
  start: StateNode,
  end: StateNode,
};

const EDGE_TYPES = {
  workflow: WorkflowEdge,
  default: WorkflowEdge,
  smoothstep: WorkflowEdge,
};

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
  const [activeTab, setActiveTab] = useState<'diagram' | 'doc'>('diagram');
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowDefinition | null>(null);
  const [loadingWorkflow, setLoadingWorkflow] = useState(true);

  const [expandedPhase, setExpandedPhase] = useState<string | null>('evaluacion');
  const [selectedSubActivity, setSelectedSubActivity] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/workflow/active')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setActiveWorkflow(res.data);
      })
      .catch(() => {})
      .finally(() => setLoadingWorkflow(false));
  }, []);

  const macroPhases: MacroPhase[] = [
    {
      id: 'registro',
      number: 'Fase 01',
      name: 'Registro y Ajustes de la Iniciativa',
      shortDesc: 'Creación de propuestas preliminares y subsanación de campos observados por el solicitante.',
      color: 'text-slate-800',
      bg: 'bg-[#F8FAFC]',
      border: 'border-slate-300',
      accentBg: 'bg-slate-100 text-slate-700',
      responsibleRoles: ['Key user (Solicitante)', 'BP TI (soporte de edición)'],
      activities: [
        {
          name: '1. Creación de Borrador',
          responsible: 'Key user (Solicitante)',
          description: 'El solicitante ingresa la información básica, pilar estratégico, justificación técnica y carga el archivo de Visto Bueno (VoBo VP) si ya lo posee.',
          inputs: ['Formulario de Iniciativa (Descripción, Pilar, Institución, etc.)', 'Adjunto de VoBo VP (Opcional en esta etapa)'],
          outputs: ['Registro en base de datos con status = "Borrador"'],
          rules: ['Solo visible y editable por el usuario creador y Administradores.', 'No se notifican correos al BP TI en esta etapa.']
        },
        {
          name: '2. Asistencia Inteligente (IA)',
          responsible: 'Asistente IA (Gemini / Groq)',
          description: 'Entrevista interactiva o extracción automática de documentos/texto libre para enriquecer la justificación y clasificar la iniciativa.',
          inputs: ['Chat conversacional', 'Texto no estructurado / Documento adjunto'],
          outputs: ['Campos del formulario auto-completados'],
          rules: ['La IA asiste al Key user pero no altera el estado del registro por sí sola.']
        },
        {
          name: '3. Enviar a Aprobación',
          responsible: 'Key user (Solicitante)',
          description: 'Acción formal para transferir la responsabilidad al Business Partner de TI correspondiente.',
          inputs: ['Campos obligatorios del formulario completos'],
          outputs: ['Status cambia a "Pendiente de aprobación"', 'Notificación por correo al BP TI asignado'],
          rules: ['El solicitante pierde permisos de edición directa mientras la iniciativa es evaluada.']
        }
      ]
    },
    {
      id: 'evaluacion',
      number: 'Fase 02',
      name: 'Evaluación Técnica por Business Partner TI',
      shortDesc: 'Revisión técnica, verificación del VoBo de Vicepresidencia y toma de decisión.',
      color: 'text-amber-900',
      bg: 'bg-amber-50/40',
      border: 'border-amber-200',
      accentBg: 'bg-amber-100 text-amber-900',
      responsibleRoles: ['Business Partner TI (BP TI)', 'Administrador'],
      activities: [
        {
          name: '1. Verificación del VoBo VP',
          responsible: 'BP TI / Admin',
          description: 'Si el campo "aprobacion_de_director" tiene un archivo cargado, el evaluador revisa el documento y marca el estado como "correcto" o "incorrecto".',
          inputs: ['Documento de VoBo adjunto', 'Herramienta de previsualización'],
          outputs: ['Flag _vobo_status actualizado ("correcto" o "incorrecto")'],
          rules: ['Para poder Aprobar directamente, el VoBo debe estar ausente (sin archivo) o validado como "correcto".']
        },
        {
          name: '2. Emisión de Observaciones',
          responsible: 'BP TI / Admin',
          description: 'Si el requerimiento requiere ajustes, el BP TI sugiere cambios específicos en los campos y devuelve la iniciativa.',
          inputs: ['Campos sugeridos (_suggested_changes)', 'Comentario explicativo'],
          outputs: ['Status cambia a "Observada"', 'Notificación por correo al Key user solicitante'],
          rules: ['El Key user puede editar y reenviar una vez subsanadas las observaciones.']
        }
      ],
      gateways: [
        {
          question: '¿Decisión del BP TI sobre la Iniciativa?',
          branches: [
            { condition: 'Aprobada (VoBo correcto o sin VoBo)', targetState: 'En demanda', description: 'Transfiere la iniciativa al catálogo de demanda de TI.' },
            { condition: 'Observada / VoBo incorrecto', targetState: 'Observada', description: 'Devuelve la iniciativa al solicitante con sugerencias de ajuste.' },
            { condition: 'Desestimada / No viable', targetState: 'Desestimada', description: 'Archiva la propuesta por falta de justificación o inviabilidad técnica.' }
          ]
        }
      ]
    },
    {
      id: 'aprobacion',
      number: 'Fase 03',
      name: 'Aprobación y Paso a Demanda de TI',
      shortDesc: 'Iniciativas aprobadas formalmente que ingresan al backlog y portafolio de TI.',
      color: 'text-emerald-900',
      bg: 'bg-emerald-50/40',
      border: 'border-emerald-200',
      accentBg: 'bg-emerald-100 text-emerald-900',
      responsibleRoles: ['BP TI', 'Equipo de Demanda TI', 'Admin'],
      activities: [
        {
          name: '1. Registro en Demanda',
          responsible: 'Sistema / BP TI',
          description: 'La iniciativa pasa a status "En demanda" y queda bloqueada para edición por parte de usuarios estándar.',
          inputs: ['Iniciativa aprobada con todos los campos y VoBo validados'],
          outputs: ['Status = "En demanda"', 'Generación de resumen ejecutivo descargable en PDF'],
          rules: ['Solo lectura para Key user y BP TI; modificaciones posteriores requieren permisos de Administrador.']
        }
      ]
    },
    {
      id: 'desestimacion',
      number: 'Fase 04',
      name: 'Desestimación y Mecanismo de Rescate',
      shortDesc: 'Iniciativas no aprobadas con opción de rescate directo o reactivación como propuesta nueva.',
      color: 'text-red-900',
      bg: 'bg-red-50/30',
      border: 'border-red-200',
      accentBg: 'bg-red-100 text-red-900',
      responsibleRoles: ['BP TI', 'Admin'],
      activities: [
        {
          name: '1. Rescate a Nueva Iniciativa',
          responsible: 'BP TI / Admin',
          description: 'Mueve una iniciativa desestimada de regreso a "Pendiente de aprobación" para reevaluación técnica.',
          inputs: ['Iniciativa en estado "Desestimada"'],
          outputs: ['Status = "Pendiente de aprobación"'],
          rules: ['Permite reconsiderar requerimientos ante nuevas condiciones del negocio.']
        },
        {
          name: '2. Rescate Directo a Demanda',
          responsible: 'BP TI / Admin',
          description: 'Aprueba y escala directamente la propuesta desestimada a "En demanda".',
          inputs: ['Iniciativa en estado "Desestimada"'],
          outputs: ['Status = "En demanda"'],
          rules: ['Requiere justificación explícita del BP TI.']
        }
      ]
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <GitBranch className="w-5 h-5 text-[#4F5AF5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Flujo de Trabajo y Estados de Iniciativas
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeWorkflow
                  ? `Flujo Activo: "${activeWorkflow.name}" (Versión ${activeWorkflow.version})`
                  : 'Diagrama y documentación formal del ciclo de vida de requerimientos'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switcher de Vista */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('diagram')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'diagram'
                  ? 'bg-white text-[#4F5AF5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Diagrama Canvas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('doc')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'doc'
                  ? 'bg-white text-[#4F5AF5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Documentación y Matriz
            </button>
          </div>

          <Link
            to="/admin/workflow-editor"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#4F5AF5] hover:bg-[#3D47E0] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Editar en Canvas</span>
          </Link>
        </div>
      </div>

      {/* Tab 1: Diagrama Canvas ReactFlow */}
      {activeTab === 'diagram' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                Esquema Topológico en Tiempo Real
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 font-semibold">
                ● Modelo Activo en Ejecución
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4F5AF5] inline-block" /> Estado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Gateway
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" /> Nodo IA
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Aprobación Humana
              </span>
            </div>
          </div>

          <div className="h-[520px] relative bg-slate-50/40">
            {activeWorkflow?.graph_json?.nodes ? (
              <ReactFlowProvider>
                <ReactFlow
                  nodes={activeWorkflow.graph_json.nodes}
                  edges={activeWorkflow.graph_json.edges}
                  nodeTypes={NODE_TYPES}
                  edgeTypes={EDGE_TYPES}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={true}
                  fitView
                >
                  <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-xl" />
                  <MiniMap className="!bg-white !border-slate-200 !shadow-sm !rounded-xl" />
                  <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
                </ReactFlow>
              </ReactFlowProvider>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Layers className="w-8 h-8 text-slate-300 mb-2" />
                <span>Cargando topología del flujo activo...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Documentación de Fases y Matriz */}
      {(activeTab === 'doc' || activeTab === 'diagram') && (
        <div className="space-y-6">
          {/* Fases Macro */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">
                Desglose por Fases Operativas del Ciclo de Vida
              </h2>
              <span className="text-xs text-slate-400">Haz clic en cada fase para ver sus actividades</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {macroPhases.map((phase) => {
                const isExpanded = expandedPhase === phase.id;
                return (
                  <div
                    key={phase.id}
                    className={`rounded-2xl border transition-all ${phase.border} ${phase.bg} overflow-hidden shadow-xs`}
                  >
                    {/* Header de Fase */}
                    <div
                      onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/40 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg ${phase.accentBg}`}>
                          {phase.number}
                        </span>
                        <div>
                          <h3 className={`text-sm font-bold ${phase.color}`}>{phase.name}</h3>
                          <p className="text-xs text-slate-600 mt-0.5">{phase.shortDesc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-1">
                          {phase.responsibleRoles.map((role, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-white/80 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Contenido Expandido */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-200/60 bg-white space-y-4 text-xs animate-in fade-in duration-150">
                        {/* Actividades */}
                        <div className="space-y-3">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Actividades y Reglas de la Fase
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {phase.activities.map((act, i) => (
                              <div
                                key={i}
                                className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800">{act.name}</span>
                                  <span className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                                    {act.responsible}
                                  </span>
                                </div>
                                <p className="text-slate-600 text-[11px] leading-relaxed">
                                  {act.description}
                                </p>

                                {act.rules && (
                                  <div className="pt-2 border-t border-slate-200/60 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                      Reglas:
                                    </span>
                                    <ul className="list-disc list-inside text-[10px] text-slate-600 space-y-0.5">
                                      {act.rules.map((r, ri) => (
                                        <li key={ri}>{r}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Compuertas si existen */}
                        {phase.gateways && phase.gateways.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                              <HelpCircle className="w-3.5 h-3.5" />
                              Compuertas de Decisión (Gateways)
                            </h4>
                            {phase.gateways.map((gw, gwi) => (
                              <div
                                key={gwi}
                                className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2"
                              >
                                <span className="font-bold text-slate-800 block text-xs">
                                  {gw.question}
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  {gw.branches.map((b, bi) => (
                                    <div
                                      key={bi}
                                      className="p-2 bg-white rounded-lg border border-amber-100 space-y-1"
                                    >
                                      <span className="font-semibold text-amber-900 block text-[11px]">
                                        {b.condition}
                                      </span>
                                      <span className="text-[10px] text-slate-500 block">
                                        Destino: <strong>{b.targetState}</strong>
                                      </span>
                                      <p className="text-[10px] text-slate-600">{b.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Matriz Lógica de Transición de Estados */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Matriz de Transición y Condiciones del Motor
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reglas ejecutadas por el <code>WorkflowEngine</code> al evaluar cada solicitud
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Estado Origen</th>
                    <th className="p-3">Acción / Transición</th>
                    <th className="p-3">Estado Destino</th>
                    <th className="p-3">Roles Autorizados</th>
                    <th className="p-3">Condición / Validación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800">Borrador</td>
                    <td className="p-3 font-semibold text-[#4F5AF5]">Enviar a aprobación</td>
                    <td className="p-3 font-bold text-[#4F5AF5]">Pendiente de aprobación</td>
                    <td className="p-3">Key user, Admin</td>
                    <td className="p-3">Requiere campos obligatorios del formulario (descripción, pilar, etc.)</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800">Pendiente de aprobación</td>
                    <td className="p-3 font-semibold text-emerald-600">Aprobar</td>
                    <td className="p-3 font-bold text-emerald-700">En demanda</td>
                    <td className="p-3">BP TI, Admin</td>
                    <td className="p-3">Si hay archivo VoBo VP, requiere que esté validado como "correcto".</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800">Pendiente de aprobación</td>
                    <td className="p-3 font-semibold text-amber-600">Observar</td>
                    <td className="p-3 font-bold text-amber-700">Observada</td>
                    <td className="p-3">BP TI, Admin</td>
                    <td className="p-3">Registra sugerencias de ajuste en <code>_suggested_changes</code>.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800">Pendiente de aprobación</td>
                    <td className="p-3 font-semibold text-red-600">Desestimar</td>
                    <td className="p-3 font-bold text-red-700">Desestimada</td>
                    <td className="p-3">BP TI, Admin</td>
                    <td className="p-3">Archiva la propuesta por falta de viabilidad técnica o justificación.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800">Observada</td>
                    <td className="p-3 font-semibold text-[#4F5AF5]">Reenviar (Key user)</td>
                    <td className="p-3 font-bold text-[#4F5AF5]">Pendiente de aprobación</td>
                    <td className="p-3">Key user, Admin</td>
                    <td className="p-3">Subsanación de observaciones y reenvío para evaluación de BP TI.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800">Desestimada</td>
                    <td className="p-3 font-semibold text-[#4F5AF5]">Rescatar → Nueva</td>
                    <td className="p-3 font-bold text-[#4F5AF5]">Pendiente de aprobación</td>
                    <td className="p-3">BP TI, Admin</td>
                    <td className="p-3">Reactiva el requerimiento en la bandeja de pendientes.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800">Desestimada</td>
                    <td className="p-3 font-semibold text-emerald-600">Rescatar → Demanda</td>
                    <td className="p-3 font-bold text-emerald-700">En demanda</td>
                    <td className="p-3">BP TI, Admin</td>
                    <td className="p-3">Aprueba y escala directamente la propuesta al portafolio de TI.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
