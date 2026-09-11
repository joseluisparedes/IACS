import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  Controls, 
  MiniMap, 
  Background, 
  BackgroundVariant,
  useReactFlow
} from '@xyflow/react';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Loader2,
  FileSpreadsheet,
  History,
  Sparkles,
  HelpCircle,
  Users
} from 'lucide-react';
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

interface StepLog {
  id: string;
  fromNode: string;
  toNode: string;
  action: string;
  role: string;
  allowed: boolean;
  reason?: string;
  timestamp: string;
}

const STAGE_DEFAULT_ROLE: Record<string, { code: string; label: string }> = {
  borrador: { code: 'registrador', label: 'Key User (registrador)' },
  eval_bp: { code: 'bp_ti', label: 'Business Partner TI (bp_ti)' },
  aprob_bo: { code: 'business_owner', label: 'Business Owner (business_owner)' },
  aprob_vp: { code: 'vicepresidente_del_negocio', label: 'Vicepresidente del Negocio (vicepresidente_del_negocio)' },
  asig_demanda: { code: 'gestor_de_la_demanda', label: 'Gestor de la Demanda (gestor_de_la_demanda)' },
  ventana_est: { code: 'lider_de_dominio', label: 'Líder de Dominio (lider_de_dominio)' },
  est_con_presupuesto: { code: 'lider_de_dominio', label: 'Líder de Dominio (lider_de_dominio)' },
  est_sin_presupuesto: { code: 'lider_de_dominio', label: 'Líder de Dominio (lider_de_dominio)' },
  val_est_bp: { code: 'bp_ti', label: 'Business Partner TI (bp_ti)' },
  vobo_est_bo: { code: 'business_owner', label: 'Business Owner (business_owner)' },
  plan_fechas: { code: 'lider_de_dominio', label: 'Líder de Dominio (lider_de_dominio)' },
  val_plan_bp: { code: 'bp_ti', label: 'Business Partner TI (bp_ti)' },
  aprob_plan_bo: { code: 'business_owner', label: 'Business Owner (business_owner)' },
  observada: { code: 'bp_ti', label: 'Business Partner TI (bp_ti)' },
  desestimada: { code: 'bp_ti', label: 'Business Partner TI (bp_ti)' },
};

const SimulatorContent: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  const DEFAULT_ROLES = useMemo(() => [
    { code: 'registrador', name: 'Key User (registrador)' },
    { code: 'bp_ti', name: 'Business Partner TI (bp_ti)' },
    { code: 'business_owner', name: 'Business Owner (business_owner)' },
    { code: 'vicepresidente_del_negocio', name: 'Vicepresidente del Negocio (vicepresidente_del_negocio)' },
    { code: 'gestor_de_la_demanda', name: 'Gestor de la Demanda (gestor_de_la_demanda)' },
    { code: 'lider_de_dominio', name: 'Líder de Dominio (lider_de_dominio)' },
    { code: 'admin', name: 'Administrador (admin)' },
    { code: 'invitado', name: 'Invitado (invitado)' },
  ], []);

  // Simulation State
  const [currentNodeId, setCurrentNodeId] = useState<string>('borrador');
  const [simRole, setSimRole] = useState<string>('registrador');
  const [availableRoles, setAvailableRoles] = useState<Array<{ code: string; name: string }>>([
    { code: 'registrador', name: 'Key User (registrador)' },
    { code: 'bp_ti', name: 'Business Partner TI (bp_ti)' },
    { code: 'business_owner', name: 'Business Owner (business_owner)' },
    { code: 'vicepresidente_del_negocio', name: 'Vicepresidente del Negocio (vicepresidente_del_negocio)' },
    { code: 'gestor_de_la_demanda', name: 'Gestor de la Demanda (gestor_de_la_demanda)' },
    { code: 'lider_de_dominio', name: 'Líder de Dominio (lider_de_dominio)' },
    { code: 'admin', name: 'Administrador (admin)' },
    { code: 'invitado', name: 'Invitado (invitado)' },
  ]);
  const [simFormData, setSimFormData] = useState<Record<string, string>>({
    descripcion: 'Iniciativa de prueba para simulación de flujo',
    pilar_estrategico: 'Transformación Digital',
    institucion: 'Corporativo',
    _vobo_status: 'correcto',
    requiere_presupuesto: 'Sí',
  });

  const [history, setHistory] = useState<StepLog[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; allowed: boolean } | null>(null);

  // Cargar lista de flujos, roles y flujo activo
  useEffect(() => {
    fetch('/api/workflow/definitions')
      .then((r) => r.json())
      .then((res) => {
        const list = res.data || [];
        setWorkflows(list);
        const active = list.find((w: any) => w.status === 'published') || list[0];
        if (active) setSelectedWorkflowId(active.id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/roles')
      .then((r) => r.json())
      .then((res) => {
        const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (rawList.length > 0) {
          const mapRoles = rawList
            .filter((r: any) => r.is_active !== false)
            .map((r: any) => ({ code: r.code, name: `${r.name} (${r.code})` }));

          setAvailableRoles((prev) => {
            const merged = [...prev];
            mapRoles.forEach((mr: any) => {
              const idx = merged.findIndex((m) => m.code === mr.code);
              if (idx >= 0) {
                merged[idx] = mr;
              } else {
                merged.push(mr);
              }
            });
            return merged;
          });
        }
      })
      .catch(() => {});
  }, [DEFAULT_ROLES]);

  // Cargar detalle del flujo seleccionado
  useEffect(() => {
    if (!selectedWorkflowId) return;
    setLoading(true);
    fetch(`/api/workflow/definitions/${selectedWorkflowId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setWorkflow(res.data);
          const startNode =
            res.data.graph_json?.nodes?.find((n: any) => n.type === 'state' || n.type === 'start') ||
            res.data.graph_json?.nodes?.[0];
          if (startNode) setCurrentNodeId(startNode.id);
          setHistory([]);
          setFeedback(null);

          // Extraer roles presentes en los nodos del flujo para asegurar que aparezcan en el select
          const wfRoles = (res.data.workflow_node_roles || [])
            .map((nr: any) => nr.role_name)
            .filter(Boolean);
          if (wfRoles.length > 0) {
            setAvailableRoles((prev) => {
              const currentCodes = new Set(prev.map((p) => p.code));
              const additions: Array<{ code: string; name: string }> = [];
              wfRoles.forEach((rName: string) => {
                const norm = rName.toLowerCase();
                if (!currentCodes.has(norm)) {
                  currentCodes.add(norm);
                  additions.push({ code: norm, name: `${rName} (${norm})` });
                }
              });
              return additions.length > 0 ? [...prev, ...additions] : prev;
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedWorkflowId]);

  // Transiciones disponibles desde el nodo actual
  const availableTransitions = (workflow?.workflow_transitions || []).filter(
    (t: any) => t.source_node_id === currentNodeId
  );

  // Ejecutar transición en el simulador
  const handleTriggerTransition = async (transitionLabel: string) => {
    if (!workflow) return;
    try {
      setSimulating(true);
      setFeedback(null);

      const res = await fetch('/api/workflow/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: workflow.id,
          current_node_id: currentNodeId,
          user_role: simRole,
          form_data: simFormData,
          transition_label: transitionLabel,
        }),
      });

      const json = await res.json();
      const result = json.data;

      const newLog: StepLog = {
        id: Date.now().toString(),
        fromNode: currentNodeId,
        toNode: result.next_node_id || currentNodeId,
        action: transitionLabel,
        role: simRole,
        allowed: result.allowed,
        reason: result.reason,
        timestamp: new Date().toLocaleTimeString(),
      };

      setHistory((prev) => [newLog, ...prev]);

      if (result.allowed && result.next_node_id) {
        setCurrentNodeId(result.next_node_id);
        setFeedback({
          text: `Transición '${transitionLabel}' exitosa → Avanzó a nodo '${result.next_node_label || result.next_node_id}'`,
          allowed: true,
        });
      } else {
        setFeedback({
          text: result.reason || 'Transición bloqueada por las reglas del flujo.',
          allowed: false,
        });
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error en simulación', allowed: false });
    } finally {
      setSimulating(false);
    }
  };

  const handleResetSimulation = () => {
    const startNode =
      workflow?.graph_json?.nodes?.find((n: any) => n.id === 'borrador' || n.type === 'start') ||
      workflow?.graph_json?.nodes?.[0];
    if (startNode) setCurrentNodeId(startNode.id);
    setHistory([]);
    setFeedback(null);
  };

  // Nodos con estilo visual para el simulador (nodo actual destacado)
  const displayNodes = (workflow?.graph_json?.nodes || []).map((node: any) => {
    const isCurrent = node.id === currentNodeId;
    return {
      ...node,
      selected: isCurrent,
      style: isCurrent
        ? {
            filter: 'drop-shadow(0 0 10px rgba(79, 90, 245, 0.6))',
            transform: 'scale(1.05)',
            transition: 'all 0.3s ease',
          }
        : { opacity: 0.85 },
    };
  });

  const displayEdges = (workflow?.graph_json?.edges || []).map((edge: any) => {
    const isTraversed = history.some(
      (h) => h.allowed && h.fromNode === edge.source && h.toNode === edge.target
    );
    return {
      ...edge,
      style: isTraversed
        ? { stroke: '#10B981', strokeWidth: 3 }
        : { stroke: '#94a3b8', strokeWidth: 1.5 },
      animated: isTraversed,
    };
  });

  if (loading && !workflow) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-[#4F5AF5] animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-600">Cargando sandbox de simulación...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* Top Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-[#4F5AF5]" />
            <h1 className="text-sm font-bold text-slate-800">Simulador de Flujos (Sandbox)</h1>
          </div>

          <select
            value={selectedWorkflowId}
            onChange={(e) => setSelectedWorkflowId(e.target.value)}
            className="px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
          >
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} (v{w.version}) {w.status === 'published' ? '★ Activo' : `[${w.status}]`}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleResetSimulation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reiniciar Simulación</span>
        </button>
      </header>

      {/* Main Container: 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Simulation Controls */}
        <aside className="w-80 bg-white border-r border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Parámetros de Prueba
            </h3>
            <p className="text-[11px] text-slate-400">
              Modifica el rol y datos para evaluar el comportamiento
            </p>
          </div>

          {/* Current State Info Card */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">
              Estado Actual en Simulación
            </span>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#4F5AF5]" />
              <span className="text-sm font-bold text-slate-800 capitalize">{currentNodeId}</span>
            </div>
          </div>

            {/* Role selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Rol Simulado</label>
              <select
                value={simRole}
                onChange={(e) => setSimRole(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium"
              >
                {availableRoles.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>

              {(() => {
                const stageInfo = STAGE_DEFAULT_ROLE[currentNodeId.toLowerCase()];
                if (!stageInfo) return null;

                const isOperatingWithRole = simRole === stageInfo.code;

                return (
                  <div className="mt-2 p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-medium">Responsable de etapa:</span>
                      <span className="font-bold text-indigo-950 bg-indigo-100/90 px-2 py-0.5 rounded-md border border-indigo-200 text-[10px]">
                        {stageInfo.label}
                      </span>
                    </div>

                    {!isOperatingWithRole ? (
                      <button
                        type="button"
                        onClick={() => setSimRole(stageInfo.code)}
                        className="w-full py-1.5 px-3 bg-[#4F5AF5] hover:bg-[#3D47E0] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Asumir rol: {stageInfo.label.split('(')[0].trim()}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Estás operando con el rol requerido</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Mock Form Data */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Datos Simulados de Iniciativa
                </label>
                <p className="text-[10px] text-slate-400">
                  Valores de prueba precargados para validar las reglas del flujo sin tener que escribir.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block mb-0.5">1. Descripción:</span>
                  <input
                    type="text"
                    value={simFormData.descripcion}
                    onChange={(e) => setSimFormData({ ...simFormData, descripcion: e.target.value })}
                    placeholder="Descripción de la iniciativa..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F5AF5]"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-medium text-slate-500 block mb-0.5">2. Pilar Estratégico:</span>
                  <input
                    type="text"
                    value={simFormData.pilar_estrategico}
                    onChange={(e) =>
                      setSimFormData({ ...simFormData, pilar_estrategico: e.target.value })
                    }
                    placeholder="Pilar Estratégico..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F5AF5]"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-medium text-slate-500 block mb-0.5">3. Empresa / Institución:</span>
                  <input
                    type="text"
                    value={simFormData.institucion}
                    onChange={(e) => setSimFormData({ ...simFormData, institucion: e.target.value })}
                    placeholder="Institución / Empresa..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F5AF5]"
                  />
                </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-600">VoBo Vicepresidencia:</span>
                <select
                  value={simFormData._vobo_status}
                  onChange={(e) => setSimFormData({ ...simFormData, _vobo_status: e.target.value })}
                  className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5"
                >
                  <option value="correcto">Correcto ✓</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="observado">Observado</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-2 bg-amber-50/70 border border-amber-200 rounded-lg">
                <span className="text-[11px] font-semibold text-amber-900">¿Requiere Presupuesto?</span>
                <select
                  value={simFormData.requiere_presupuesto || 'Sí'}
                  onChange={(e) => setSimFormData({ ...simFormData, requiere_presupuesto: e.target.value })}
                  className="text-xs bg-white border border-amber-300 rounded px-1.5 py-0.5 font-bold text-amber-950"
                >
                  <option value="Sí">Sí (Bifurca a 7A)</option>
                  <option value="No">No (Bifurca a 7B)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Available Actions Buttons */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-[11px] font-bold text-slate-700">
              Acciones Disponibles ({availableTransitions.length})
            </label>

            {availableTransitions.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                No hay transiciones salientes desde este nodo (posible estado final).
              </p>
            ) : (
              <div className="space-y-2">
                {availableTransitions.map((t: any) => (
                  <button
                    key={t.id || t.edge_id}
                    type="button"
                    disabled={simulating}
                    onClick={() => handleTriggerTransition(t.label)}
                    className="w-full p-2.5 bg-white border border-slate-300 hover:border-[#4F5AF5] hover:bg-indigo-50/30 text-left rounded-xl shadow-xs transition-all flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-semibold text-xs text-slate-800 group-hover:text-[#4F5AF5] block">
                        {t.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Destino: {t.target_node_id} ({t.condition_type})
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#4F5AF5] transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 leading-relaxed animate-in fade-in duration-150 ${
                feedback.allowed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {feedback.allowed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </aside>

        {/* Center Canvas: Active state highlighted */}
        <main className="flex-1 h-full relative">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
          >
            <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-xl" />
            <MiniMap className="!bg-white !border-slate-200 !shadow-sm !rounded-xl" />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
          </ReactFlow>
        </main>

        {/* Right Panel: Step History Log */}
        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-800">Historial de Ejecución</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{history.length} pasos</span>
          </div>

          <div className="p-3 flex-1 overflow-y-auto space-y-2 text-xs">
            {history.length === 0 ? (
              <p className="text-center text-slate-400 py-10 text-[11px]">
                Ejecuta una acción en el panel izquierdo para registrar el paso aquí.
              </p>
            ) : (
              history.map((log) => (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                    log.allowed
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-red-50/60 border-red-200 text-red-950'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="truncate">{log.action}</span>
                    <span className="text-[9px] text-slate-400">{log.timestamp}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span>Rol: <strong>{log.role}</strong></span>
                    <span>•</span>
                    <span>{log.fromNode} → {log.toNode}</span>
                  </div>
                  {log.reason && (
                    <p className="text-[10px] text-red-700 italic leading-tight">{log.reason}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default function WorkflowSimulator() {
  return (
    <ReactFlowProvider>
      <SimulatorContent />
    </ReactFlowProvider>
  );
}
