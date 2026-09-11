import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, 
  Shield, 
  ListPlus, 
  CheckSquare, 
  Settings2, 
  ArrowRight,
  Info,
  Sparkles,
  Layers,
  Plus,
  Lock,
  UserCheck,
  Check,
  Pencil,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Archive,
  Inbox,
  Search,
  X,
  SlidersHorizontal,
  UserCog,
  FileCheck2,
  ShieldCheck,
  ExternalLink,
  GitFork,
  Send
} from 'lucide-react';
import { useWorkflowStore } from '../../lib/workflowStore';
import { supabase } from '../../lib/supabase';
import type { WorkflowNodeRole, WorkflowNodeData, StageForm, StageConsent, GatewayConfig, GatewayBranchRule } from '../../types';


interface DynamicRole {
  id?: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  is_system?: boolean;
}

const DEFAULT_ROLES: DynamicRole[] = [
  { code: 'registrador', name: 'Key user', color: 'blue', is_system: true },
  { code: 'bp_ti', name: 'Business Partner (BP)', color: 'indigo', is_system: true },
  { code: 'admin', name: 'Administrador', color: 'rose', is_system: true },
  { code: 'invitado', name: 'Invitado (Solo lectura)', color: 'slate', is_system: true },
];

const ROLE_SWATCHES: Record<string, { swatch: string; bg: string; text: string; border: string }> = {
  indigo: { swatch: '#6366F1', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  blue: { swatch: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  emerald: { swatch: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  violet: { swatch: '#8B5CF6', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  amber: { swatch: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  rose: { swatch: '#F43F5E', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  cyan: { swatch: '#06B6D4', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  slate: { swatch: '#64748B', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

export const NodeConfigPanel: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    updateNodeData,
    updateEdgeData,
    deleteSelected,
    setSelectedNodeId,
    setSelectedEdgeId,
  } = useWorkflowStore();

  const [activeTab, setActiveTab] = useState<'props' | 'roles' | 'custody' | 'fields' | 'ai'>('props');
  const [availableRoles, setAvailableRoles] = useState<DynamicRole[]>(DEFAULT_ROLES);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'assigned'>('all');
  const [availableStageForms, setAvailableStageForms] = useState<StageForm[]>([]);
  const [availableStageConsents, setAvailableStageConsents] = useState<StageConsent[]>([]);
  const [availableFields, setAvailableFields] = useState<Array<{ key: string; label: string }>>([
    { key: 'requiere_presupuesto', label: '¿Requiere Presupuesto? (requiere_presupuesto)' },
    { key: 'tipo_solucion', label: 'Tipo de Solución (tipo_solucion)' },
    { key: 'prioridad_area', label: 'Prioridad del Área (prioridad_area)' },
    { key: 'presupuesto_estimado_usd', label: 'Presupuesto Estimado USD (presupuesto_estimado_usd)' },
    { key: 'es_proyecto_spo', label: '¿Es Proyecto SPO? (es_proyecto_spo)' },
    { key: 'es_un_proceso_nuevo', label: '¿Es Proceso Nuevo? (es_un_proceso_nuevo)' },
    { key: 'institucion', label: 'Institución / Empresa (institucion)' },
    { key: 'vicepresidencia', label: 'Vicepresidencia (vicepresidencia)' },
    { key: 'direccion', label: 'Dirección (direccion)' },
    { key: 'pilar_estratgico', label: 'Pilar Estratégico (pilar_estratgico)' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'impacto_negocio', label: 'Impacto en el Negocio' },
    { key: 'presupuesto_estimado', label: 'Presupuesto Estimado' },
    { key: 'fecha_estimada', label: 'Fecha Estimada' },
  ]);

  // Cargar formularios y consentimientos de etapa para asignación en flujos
  useEffect(() => {
    let isMounted = true;
    const loadStageCatalogs = async () => {
      try {
        // Forms
        try {
          const resF = await fetch('/api/stage-forms');
          if (resF.ok) {
            const jsonF = await resF.json();
            if (isMounted) setAvailableStageForms(jsonF.data || []);
          } else {
            throw new Error('Fallback forms');
          }
        } catch {
          const { data } = await supabase.from('stage_forms').select('*').order('name', { ascending: true });
          if (isMounted && data) setAvailableStageForms(data as StageForm[]);
        }

        // Consents
        try {
          const resC = await fetch('/api/stage-consents');
          if (resC.ok) {
            const jsonC = await resC.json();
            if (isMounted) setAvailableStageConsents(jsonC.data || []);
          } else {
            throw new Error('Fallback consents');
          }
        } catch {
          const { data } = await supabase.from('stage_consents').select('*').order('title', { ascending: true });
          if (isMounted && data) setAvailableStageConsents(data as StageConsent[]);
        }
      } catch (err) {
        console.warn('Error loading stage catalogs in NodeConfigPanel:', err);
      }
    };
    loadStageCatalogs();
    return () => { isMounted = false; };
  }, []);

  // Cargar catálogo dinámico de roles de IACS
  useEffect(() => {
    let isMounted = true;
    const loadRoles = async () => {
      try {
        setLoadingRoles(true);
        const res = await fetch('/api/roles');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && isMounted) {
            const active = data.filter((r: any) => r.is_active !== false);
            if (active.length > 0) {
              setAvailableRoles(active);
              return;
            }
          }
        }
        throw new Error('API fallback');
      } catch {
        // Fallback Supabase (The Architect)
        try {
          const { data } = await supabase
            .from('app_roles')
            .select('*')
            .eq('is_active', true)
            .order('is_system', { ascending: false });
          if (data && data.length > 0 && isMounted) {
            setAvailableRoles(data);
          }
        } catch {
          // Mantener DEFAULT_ROLES
        }
      } finally {
        if (isMounted) setLoadingRoles(false);
      }
    };
    loadRoles();
    return () => { isMounted = false; };
  }, []);

  // Cargar campos de la API de IACS
  useEffect(() => {
    fetch('/api/fields')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableFields(
            data.map((f: any) => ({ key: f.key, label: f.label || f.key }))
          );
        }
      })
      .catch(() => {});
  }, []);


  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  const nodeData = (selectedNode?.data || {}) as WorkflowNodeData;
  const rawRoles = nodeData.roles || [];

  // Normalizar y filtrar roles asignados válidos contra el catálogo oficial (evita roles fantasmas en el contador)
  // DEBE estar antes de cualquier return condicional según las Reglas de Hooks de React
  const roles = useMemo(() => {
    if (!availableRoles || availableRoles.length === 0) return rawRoles;
    return rawRoles.filter((r) => availableRoles.some((ar) => ar.code === r.role_name));
  }, [rawRoles, availableRoles]);

  if (!selectedNode && !selectedEdge) {
    return (
      <aside className="w-72 bg-white border-l border-slate-200 p-4 flex flex-col justify-between select-none">
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Propiedades</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Selecciona un elemento para editar</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <Info className="w-4 h-4 text-[#4F5AF5]" />
              <span>Resumen del Diagrama</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Total Nodos</span>
                <span className="text-base font-bold text-slate-800">{nodes.length}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Transiciones</span>
                <span className="text-base font-bold text-slate-800">{edges.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 text-center leading-relaxed">
          Haz clic en cualquier caja o flecha del canvas para configurar sus reglas, roles y condiciones.
        </div>
      </aside>
    );
  }

  // ── Configuración de Transición (Edge) ──────────────────────────────────────
  if (selectedEdge) {
    const currentLabel = (selectedEdge.label as string) || '';
    const edgeData = (selectedEdge.data || {}) as any;
    const conditionType = edgeData.condition_type || 'always';
    const currentAllowedRoles: string[] = Array.isArray(edgeData.allowed_roles) ? edgeData.allowed_roles : [];

    const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
    const targetNode = nodes.find((n) => n.id === selectedEdge.target);
    const isSourceGateway = sourceNode?.type === 'gateway' || sourceNode?.data?.nodeType === 'gateway' || selectedEdge.source.startsWith('gw_');

    return (
      <aside className="w-72 bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ArrowRight className="w-4 h-4 text-[#4F5AF5]" />
            <h3 className="text-xs font-bold text-slate-800">Configurar Transición</h3>
          </div>
          <button
            type="button"
            onClick={deleteSelected}
            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Eliminar transición"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3 space-y-4 text-xs">
          {/* Label de la Flecha */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Etiqueta de la Flecha (Nombre del Botón)
            </label>
            <input
              type="text"
              value={currentLabel}
              onChange={(e) => updateEdgeData(selectedEdge.id, e.target.value, conditionType, edgeData.condition_config, isSourceGateway ? [] : currentAllowedRoles)}
              placeholder={isSourceGateway ? "Ej: SÍ requiere presupuesto, No..." : "Ej: Asignar Líder, Solicitar VoBo, Aprobar..."}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] text-xs font-medium"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {isSourceGateway 
                ? "Nombre descriptivo de la bifurcación lógica en el diagrama."
                : "Este texto será exactamente el nombre del botón que verá el usuario en la iniciativa."}
            </p>
          </div>

          {/* ESCENARIO COMPUERTA (GATEWAY): ALERTA Y BLOQUEO DE ROLES */}
          {isSourceGateway ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Salida de Compuerta Automática</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                Esta flecha parte de una <strong>Compuerta de Decisión ({String(sourceNode?.data?.label || selectedEdge.source)})</strong>.
              </p>
              <div className="text-[10.5px] text-amber-900/90 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-200 space-y-1">
                <span className="font-bold text-amber-950 block">
                  ¿Por qué no tiene roles?
                </span>
                <p>
                  Las bifurcaciones de compuerta son evaluadas <strong>automáticamente por el motor según los datos del formulario</strong> (ej. <em>¿Requiere Presupuesto? = Sí</em>).
                </p>
                <p className="text-slate-600">
                  No dependen de la intervención humana ni corresponden a un botón manual de usuario, por lo que los roles están desactivados para este tipo de conexión.
                </p>
              </div>
            </div>
          ) : (
            /* ESCENARIO ESTADO NORMAL: ROLES AUTORIZADOS PARA ESTA ACCIÓN */
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Roles Autorizados (Transition RBAC)
                  </label>
                  <span className="text-[10px] font-bold text-[#4F5AF5] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {currentAllowedRoles.length} {currentAllowedRoles.length === 1 ? 'rol' : 'roles'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2 leading-tight">
                  Solo los usuarios con al menos uno de los roles seleccionados verán el botón de acción para esta transición.
                </p>

                <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/60">
                  {availableRoles.map((r) => {
                    const isChecked = currentAllowedRoles.includes(r.code);
                    return (
                      <label
                        key={r.code}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const nextRoles = e.target.checked
                              ? [...currentAllowedRoles, r.code]
                              : currentAllowedRoles.filter((code) => code !== r.code);
                            updateEdgeData(selectedEdge.id, currentLabel, conditionType, edgeData.condition_config, nextRoles);
                          }}
                          className="rounded text-[#4F5AF5] focus:ring-[#4F5AF5]"
                        />
                        <span className="truncate flex-1">{r.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{r.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Vista Previa en Vivo del Botón */}
              <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-white to-slate-50 rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                  Vista Previa en Requerimiento
                </span>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-[#4F5AF5] text-white font-bold text-xs shadow-xs flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    <span>{currentLabel || 'Avanzar'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {currentAllowedRoles.length > 0 ? (
                    <>Visible para: <strong className="text-slate-800">{currentAllowedRoles.join(', ')}</strong></>
                  ) : (
                    <span className="text-amber-600 font-semibold">⚠️ Sin roles específicos: heredará el rol asignado al estado origen.</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Condición Extra */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tipo de Condición
            </label>
            <select
              value={conditionType}
              onChange={(e) => updateEdgeData(selectedEdge.id, currentLabel, e.target.value, edgeData.condition_config, isSourceGateway ? [] : currentAllowedRoles)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] text-xs bg-white"
            >
              <option value="always">Siempre permitida (Sin condición extra)</option>
              <option value="field_required">Validar campos obligatorios</option>
              <option value="vobo_check">Verificar VoBo de Vicepresidencia</option>
              <option value="role_only">Restringida a roles con permiso</option>
            </select>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
            <span className="font-semibold block text-slate-700 mb-1">Conexión:</span>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="truncate max-w-[90px] font-mono text-[10px]" title={String(sourceNode?.data?.label || selectedEdge.source)}>
                {String(sourceNode?.data?.label || selectedEdge.source)}
              </span>
              <ArrowRight className="w-3 h-3 text-[#4F5AF5] shrink-0" />
              <span className="truncate max-w-[90px] font-mono text-[10px]" title={String(targetNode?.data?.label || selectedEdge.target)}>
                {String(targetNode?.data?.label || selectedEdge.target)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={deleteSelected}
            className="w-full mt-2 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar esta Conexión</span>
          </button>
        </div>
      </aside>
    );
  }

  // ── Configuración de Nodo ──────────────────────────────────────────────────
  const requiredFields = nodeData.requiredFields || [];
  const isAINode = nodeData.nodeType === 'ai_agent' || nodeData.nodeType === 'ai_text';

  const handleRoleToggle = (roleCode: string) => {
    const exists = roles.find((r) => r.role_name === roleCode);
    let newRoles: WorkflowNodeRole[];
    if (exists) {
      newRoles = roles.filter((r) => r.role_name !== roleCode);
    } else {
      newRoles = [
        ...roles,
        {
          role_name: roleCode,
          can_edit: roleCode === 'registrador' || roleCode === 'admin',
          can_approve: true,
          can_reject: true,
        },
      ];
    }
    updateNodeData(selectedNode!.id, { roles: newRoles });
  };

  const handleRolePermissionChange = (
    roleName: string,
    perm: 'can_edit' | 'can_approve' | 'can_reject',
    value: boolean
  ) => {
    const newRoles = roles.map((r) => {
      if (r.role_name === roleName) {
        return { ...r, [perm]: value };
      }
      return r;
    });
    updateNodeData(selectedNode!.id, { roles: newRoles });
  };

  const handleFieldToggle = (fieldKey: string) => {
    let newFields: string[];
    if (requiredFields.includes(fieldKey)) {
      newFields = requiredFields.filter((k) => k !== fieldKey);
    } else {
      newFields = [...requiredFields, fieldKey];
    }
    updateNodeData(selectedNode!.id, { requiredFields: newFields });
  };

  // ── Configuración Específica para Compuertas de Decisión (Gateway) ──────────
  if (nodeData.nodeType === 'gateway') {
    const outgoingEdges = edges.filter((e) => e.source === selectedNode!.id);
    const incomingEdges = edges.filter((e) => e.target === selectedNode!.id);

    // 1. Estados de entrada conectados a esta compuerta
    const incomingNodes = incomingEdges
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter(Boolean);

    // 2. Extraer campos de los formularios de las etapas que alimentan esta compuerta
    const inputStageFields: Array<{
      key: string;
      label: string;
      stageName: string;
      options?: string[];
      type?: string;
    }> = [];

    incomingNodes.forEach((srcNode) => {
      const formId = srcNode?.data?.form_id;
      const stageName = String(srcNode?.data?.label || srcNode?.id);
      if (formId) {
        const stageForm = availableStageForms.find(
          (sf) => sf.id === formId || sf.code === formId
        );
        if (stageForm && Array.isArray(stageForm.fields)) {
          stageForm.fields.forEach((f) => {
            if (!inputStageFields.some((existing) => existing.key === f.key)) {
              inputStageFields.push({
                key: f.key,
                label: f.label || f.key,
                stageName,
                options: f.options,
                type: f.type,
              });
            }
          });
        }
      }
    });

    // 3. Campos de otros formularios de etapa existentes
    const otherStageFields: Array<{
      key: string;
      label: string;
      formName: string;
      options?: string[];
    }> = [];

    availableStageForms.forEach((sf) => {
      if (Array.isArray(sf.fields)) {
        sf.fields.forEach((f) => {
          if (
            !inputStageFields.some((inp) => inp.key === f.key) &&
            !otherStageFields.some((oth) => oth.key === f.key)
          ) {
            otherStageFields.push({
              key: f.key,
              label: f.label || f.key,
              formName: sf.name,
              options: f.options,
            });
          }
        });
      }
    });

    const currentGwConfig: GatewayConfig = (nodeData.gatewayConfig as GatewayConfig) || {
      variable: selectedNode!.id === 'gw_presupuesto' ? 'requiere_presupuesto' : '',
      rules: [],
    };

    // Metadata del campo actualmente seleccionado
    const selectedFieldMeta =
      inputStageFields.find((f) => f.key === currentGwConfig.variable) ||
      otherStageFields.find((f) => f.key === currentGwConfig.variable);

    const updateGatewayConfig = (updates: Partial<GatewayConfig>) => {
      updateNodeData(selectedNode!.id, {
        gatewayConfig: { ...currentGwConfig, ...updates },
      });
    };

    const updateBranchRule = (edgeId: string, targetNodeId: string, updates: Partial<GatewayBranchRule>) => {
      const existingRules = currentGwConfig.rules || [];
      const index = existingRules.findIndex((r) => r.edgeId === edgeId || r.targetNodeId === targetNodeId);
      let nextRules: GatewayBranchRule[];

      if (index >= 0) {
        nextRules = existingRules.map((r, i) => (i === index ? { ...r, ...updates } : r));
      } else {
        nextRules = [
          ...existingRules,
          { edgeId, targetNodeId, operator: 'equals', value: 'Sí', ...updates },
        ];
      }
      updateGatewayConfig({ rules: nextRules });
    };

    return (
      <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="p-3 border-b border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-xs">
              <GitFork className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-xs font-bold text-slate-900 truncate">
                {nodeData.label || 'Compuerta de Decisión'}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                  Compuerta Lógica
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{selectedNode!.id}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={deleteSelected}
            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Eliminar compuerta"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-4 text-xs">
          {/* Nombre */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Nombre de la Decisión
            </label>
            <input
              type="text"
              value={nodeData.label || ''}
              onChange={(e) => updateNodeData(selectedNode!.id, { label: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium bg-white"
              placeholder="Ej: ¿Requiere Presupuesto? o ¿Tipo de Solución?"
            />
          </div>

          {/* Selector Dinámico de Variable */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
                <span>Variable a Evaluar</span>
              </div>
              <span className="text-[9px] font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded border border-amber-300">
                Condición
              </span>
            </div>

            <p className="text-[11px] text-amber-900 leading-relaxed">
              Selecciona qué campo de los formularios se evaluará para bifurcar automáticamente el flujo.
            </p>

            {inputStageFields.length > 0 && (
              <div className="p-2 bg-amber-100/60 border border-amber-300/80 rounded-lg text-[10px] text-amber-950 flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  Campos del estado previo: <strong>{incomingNodes.map((n) => n?.data?.label).filter(Boolean).join(', ')}</strong>
                </span>
              </div>
            )}

            <div className="space-y-1.5 pt-0.5">
              <label className="block text-[10px] font-semibold text-slate-600">
                Campo del formulario:
              </label>
              <select
                value={currentGwConfig.variable || ''}
                onChange={(e) => {
                  const selKey = e.target.value;
                  const foundMeta =
                    inputStageFields.find((f) => f.key === selKey) ||
                    otherStageFields.find((f) => f.key === selKey) ||
                    availableFields.find((f) => f.key === selKey);
                  updateGatewayConfig({
                    variable: selKey,
                    variableLabel: foundMeta?.label || selKey,
                  });
                }}
                className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Seleccionar campo --</option>
                {inputStageFields.length > 0 && (
                  <optgroup label={`⚡ Campos de Etapa Previa (${incomingNodes.map((n) => n?.data?.label || n?.id).join(', ')})`}>
                    {inputStageFields.map((f) => (
                      <option key={`inp_${f.key}`} value={f.key}>
                        ⭐ {f.label} ({f.key})
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherStageFields.length > 0 && (
                  <optgroup label="📋 Campos de Otros Formularios de Etapa">
                    {otherStageFields.map((f) => (
                      <option key={`oth_${f.key}`} value={f.key}>
                        {f.label} ({f.key}) — {f.formName}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="🏛️ Campos Generales de la Iniciativa">
                  {availableFields.map((f) => (
                    <option key={`gen_${f.key}`} value={f.key}>
                      {f.label} ({f.key})
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* Opción de campo personalizado */}
              <div className="pt-1">
                <label className="block text-[10px] text-slate-500 mb-0.5">
                  O escribe una clave de variable personalizada:
                </label>
                <input
                  type="text"
                  placeholder="ej: requiere_presupuesto, tipo_solucion"
                  value={currentGwConfig.variable || ''}
                  onChange={(e) =>
                    updateGatewayConfig({
                      variable: e.target.value.trim(),
                      variableLabel: e.target.value.trim(),
                    })
                  }
                  className="w-full px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-[11px] font-mono font-medium focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Bifurcaciones Salientes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <span>Ramas y Reglas de Salida</span>
                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full text-[10px] font-bold border border-amber-200">
                  {outgoingEdges.length} {outgoingEdges.length === 1 ? 'rama' : 'ramas'}
                </span>
              </label>
            </div>

            {outgoingEdges.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[11px] space-y-1">
                <p>No hay flechas salientes conectadas.</p>
                <p className="text-[10px]">Arrastra desde los conectores de esta compuerta hacia los estados de destino en el lienzo.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {outgoingEdges.map((edge, idx) => {
                  const targetNode = nodes.find((n) => n.id === edge.target);
                  const targetName = String(targetNode?.data?.label || edge.target);

                  const rule = (currentGwConfig.rules || []).find(
                    (r) => r.edgeId === edge.id || r.targetNodeId === edge.target
                  ) || {
                    edgeId: edge.id,
                    targetNodeId: edge.target,
                    operator: 'equals' as const,
                    value: idx === 0 ? 'Sí' : 'No',
                    isDefault: false,
                  };

                  const isDefault = Boolean(rule.isDefault);

                  return (
                    <div
                      key={edge.id}
                      className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-amber-300 transition-all space-y-2.5 shadow-2xs"
                    >
                      {/* Cabecera de la Rama */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 text-[11px] truncate">
                            Hacia: {targetName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNodeId(null);
                            setSelectedEdgeId(edge.id);
                          }}
                          className="text-[10px] text-[#4F5AF5] hover:text-indigo-800 font-semibold flex items-center gap-0.5 hover:underline shrink-0 cursor-pointer"
                        >
                          <span>Editar flecha</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Etiqueta de la flecha */}
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                          Etiqueta de la flecha:
                        </span>
                        <input
                          type="text"
                          value={(edge.label as string) || ''}
                          onChange={(e) =>
                            updateEdgeData(
                              edge.id,
                              e.target.value,
                              (edge.data?.condition_type as string) || 'always'
                            )
                          }
                          placeholder="Ej: SÍ requiere presupuesto, NO requiere presupuesto..."
                          className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>

                      {/* Regla Condicional */}
                      {!isDefault ? (
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                              Operador:
                            </span>
                            <select
                              value={rule.operator || 'equals'}
                              onChange={(e) =>
                                updateBranchRule(edge.id, edge.target, {
                                  operator: e.target.value as any,
                                })
                              }
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
                            >
                              <option value="equals">Es igual a (=)</option>
                              <option value="not_equals">Diferente de (≠)</option>
                              <option value="contains">Contiene texto</option>
                              <option value="greater_than">Mayor que (&gt;)</option>
                              <option value="less_than">Menor que (&lt;)</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                              Valor esperado:
                            </span>
                            <input
                              type="text"
                              value={rule.value || ''}
                              onChange={(e) =>
                                updateBranchRule(edge.id, edge.target, {
                                  value: e.target.value,
                                })
                              }
                              placeholder="Ej: Sí, No, 50000"
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-100 rounded-lg text-[11px] text-slate-600 font-medium text-center">
                          ★ Esta rama se activará si ninguna otra condición coincide (Else).
                        </div>
                      )}

                      {/* Sugerencias Rápidas de Valores y Toggle Default */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                        {!isDefault ? (
                          selectedFieldMeta?.options && selectedFieldMeta.options.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[9px] text-slate-400 font-semibold">Opciones:</span>
                              {selectedFieldMeta.options.map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => updateBranchRule(edge.id, edge.target, { value: opt })}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold cursor-pointer border transition-colors ${
                                    rule.value === opt
                                      ? 'bg-amber-500 text-white border-amber-600'
                                      : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-400 font-semibold">Rápido:</span>
                              <button
                                type="button"
                                onClick={() => updateBranchRule(edge.id, edge.target, { value: 'Sí' })}
                                className="px-1.5 py-0.2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold cursor-pointer"
                              >
                                Sí
                              </button>
                              <button
                                type="button"
                                onClick={() => updateBranchRule(edge.id, edge.target, { value: 'No' })}
                                className="px-1.5 py-0.2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[9px] font-bold cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          )
                        ) : <div />}

                        <label className="flex items-center gap-1 text-[10px] text-slate-600 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isDefault}
                            onChange={(e) =>
                              updateBranchRule(edge.id, edge.target, {
                                isDefault: e.target.checked,
                              })
                            }
                            className="w-3 h-3 text-amber-600 rounded cursor-pointer"
                          />
                          <span>Rama por defecto</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Flujo de Entrada */}
          {incomingEdges.length > 0 && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1">
              <span className="font-semibold text-slate-600 block">Flujo de Entrada:</span>
              <div className="space-y-1">
                {incomingEdges.map((e) => {
                  const sourceNode = nodes.find((n) => n.id === e.source);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-1.5 text-slate-700 bg-white px-2 py-1 rounded border border-slate-200"
                    >
                      <ArrowRight className="w-3 h-3 text-[#4F5AF5] shrink-0" />
                      <span className="truncate font-medium">
                        {String(sourceNode?.data?.label || e.source)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[330px] bg-white border-l border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <Settings2 className="w-4 h-4 text-[#4F5AF5]" />
          <h3 className="text-xs font-bold text-slate-800 truncate">
            {nodeData.label || 'Configurar Nodo'}
          </h3>
        </div>
        <button
          type="button"
          onClick={deleteSelected}
          className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar nodo"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/70 p-1 gap-1 text-[11px]">
        <button
          type="button"
          onClick={() => setActiveTab('props')}
          className={`flex-1 py-1 px-1.5 rounded-md font-medium transition-colors ${
            activeTab === 'props' ? 'bg-white text-[#4F5AF5] shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          General
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`flex-1 py-1 px-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'roles' ? 'bg-white text-[#4F5AF5] shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Roles</span>
          {roles.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
              activeTab === 'roles' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {roles.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custody')}
          className={`flex-1 py-1 px-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'custody' ? 'bg-white text-[#4F5AF5] shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Dictamen</span>
          {(nodeData.form_id || nodeData.consent_id) && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fields')}
          className={`flex-1 py-1 px-1.5 rounded-md font-medium transition-colors ${
            activeTab === 'fields' ? 'bg-white text-[#4F5AF5] shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Campos
        </button>
        {isAINode && (
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-1 px-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'ai' ? 'bg-white text-violet-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            IA
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="p-3 space-y-4 overflow-y-auto flex-1 text-xs">
        {activeTab === 'props' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Nombre del Nodo / Estado
              </label>
              <input
                type="text"
                value={nodeData.label || ''}
                onChange={(e) => updateNodeData(selectedNode!.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] text-xs font-medium"
              />
            </div>

            {/* Texto del Botón de Acción (Transición hacia este estado) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Nombre del Botón de Acción
                </label>
                <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.2 rounded">
                  Transición
                </span>
              </div>
              <input
                type="text"
                value={(nodeData.action_label as string) || ''}
                onChange={(e) => updateNodeData(selectedNode!.id, { action_label: e.target.value })}
                placeholder={`Ej: Mover a ${nodeData.label || 'este estado'}`}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] text-xs bg-white text-slate-800 placeholder-slate-400 font-medium shadow-2xs"
              />
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                Texto visible en el botón que moverá la iniciativa hacia esta etapa (ej: <em>"Enviar a aprobación de Business Partner"</em>).
              </p>
            </div>

            {nodeData.nodeType === 'state' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Perfil y Semántica del Estado
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateNodeData(selectedNode!.id, { stateSubtype: 'standard' })}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      (!nodeData.stateSubtype || nodeData.stateSubtype === 'standard')
                        ? 'bg-indigo-50 border-[#4F5AF5] text-[#4F5AF5] font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] truncate">Estándar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateNodeData(selectedNode!.id, { stateSubtype: 'observada' })}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      nodeData.stateSubtype === 'observada'
                        ? 'bg-amber-50 border-amber-400 text-amber-800 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span className="text-[11px] truncate">Observada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateNodeData(selectedNode!.id, { stateSubtype: 'demanda' })}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      nodeData.stateSubtype === 'demanda'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span className="text-[11px] truncate">En demanda</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateNodeData(selectedNode!.id, { stateSubtype: 'desestimada' })}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      nodeData.stateSubtype === 'desestimada'
                        ? 'bg-red-50 border-red-400 text-red-800 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5 shrink-0 text-red-600" />
                    <span className="text-[11px] truncate">Desestimada</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Define el ícono, coloración y reglas de transición de este estado.
                </p>
              </div>
            )}

            {nodeData.nodeType === 'state' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Mecanismo de Despacho / Asignación
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateNodeData(selectedNode!.id, { dispatchMode: 'general_inbox' })}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      (!nodeData.dispatchMode || nodeData.dispatchMode === 'general_inbox')
                        ? 'bg-blue-50 border-blue-400 text-blue-800 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                    <span className="text-[11px] truncate">Bandeja General</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateNodeData(selectedNode!.id, { dispatchMode: 'select_person' })}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      nodeData.dispatchMode === 'select_person'
                        ? 'bg-violet-50 border-violet-400 text-violet-800 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 shrink-0 text-violet-600" />
                    <span className="text-[11px] truncate">Persona Obligatoria</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {nodeData.dispatchMode === 'select_person'
                    ? 'Quien aprueba debe seleccionar obligatoriamente con nombre a la persona destino.'
                    : 'La iniciativa pasa a la bandeja común de todos los usuarios con este rol en la Dirección.'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Descripción / Instrucciones
              </label>
              <textarea
                rows={3}
                value={nodeData.description || ''}
                onChange={(e) => updateNodeData(selectedNode!.id, { description: e.target.value })}
                placeholder="Instrucciones para el usuario en esta etapa..."
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] text-xs resize-none"
              />
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Tipo:</span>
                <span className="font-semibold text-slate-700">{nodeData.nodeType}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>ID interno:</span>
                <span className="font-mono text-[10px] text-slate-600">{selectedNode!.id}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-2.5">
            {/* Header / Buscador de Roles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Permisos por Rol
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {roles.length} {roles.length === 1 ? 'asignado' : 'asignados'}
                </span>
              </div>

              {/* Input de Búsqueda Rápida */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Buscar rol por nombre o slug..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#4F5AF5] focus:bg-white text-slate-800 placeholder:text-slate-400 transition-colors"
                />
                {roleSearch && (
                  <button
                    type="button"
                    onClick={() => setRoleSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filtros Segmentados: Todos vs Asignados */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`flex-1 py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    roleFilter === 'all'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>Todos</span>
                  <span className="text-[9px] px-1 py-0.1 rounded-full bg-slate-200 text-slate-600">
                    {availableRoles.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('assigned')}
                  className={`flex-1 py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    roleFilter === 'assigned'
                      ? 'bg-white text-[#4F5AF5] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>Asignados</span>
                  <span className="text-[9px] px-1 py-0.1 rounded-full bg-indigo-50 text-indigo-700">
                    {roles.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Lista de Roles */}
            <div className="space-y-2 pt-1">
              {(() => {
                const filtered = availableRoles
                  .filter((r) => {
                    const matchesSearch =
                      !roleSearch ||
                      r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
                      r.code.toLowerCase().includes(roleSearch.toLowerCase());
                    const isAssigned = roles.some((assigned) => assigned.role_name === r.code);
                    if (roleFilter === 'assigned') return matchesSearch && isAssigned;
                    return matchesSearch;
                  })
                  .sort((a, b) => {
                    const aAssigned = roles.some((assigned) => assigned.role_name === a.code);
                    const bAssigned = roles.some((assigned) => assigned.role_name === b.code);
                    if (aAssigned && !bAssigned) return -1;
                    if (!aAssigned && bAssigned) return 1;
                    return 0;
                  });

                if (loadingRoles) {
                  return (
                    <div className="py-8 text-center text-slate-400 text-xs animate-pulse">
                      Cargando catálogo de roles...
                    </div>
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-3">
                      <p className="text-xs font-semibold text-slate-600">No se encontraron roles</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {roleFilter === 'assigned'
                          ? 'No hay roles asignados a este nodo aún.'
                          : 'Prueba con otro término de búsqueda.'}
                      </p>
                    </div>
                  );
                }

                return filtered.map((roleItem) => {
                  const roleCode = roleItem.code;
                  const assigned = roles.find((r) => r.role_name === roleCode);
                  const swatchCfg = ROLE_SWATCHES[roleItem.color || ''] || ROLE_SWATCHES.slate;

                  // ── ROL ASIGNADO (TARJETA COMPLETA CON PILLS DE ACCIÓN) ──
                  if (assigned) {
                    return (
                      <div
                        key={roleCode}
                        className="relative bg-white rounded-xl border border-indigo-200/90 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
                      >
                        {/* Borde izquierdo con el color temático del rol */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: swatchCfg.swatch }}
                        />

                        <div className="pl-3 pr-2.5 py-2.5">
                          {/* Fila superior: Identidad + Switch */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="font-bold text-xs text-slate-900 leading-tight truncate max-w-[170px]"
                                  title={roleItem.name}
                                >
                                  {roleItem.name}
                                </span>
                                {roleItem.is_system ? (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                                    Base
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-700 bg-violet-50 px-1 py-0.2 rounded shrink-0">
                                    <Sparkles className="w-2.5 h-2.5 text-violet-500" />
                                    Custom
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-slate-400 block truncate">
                                {roleCode}
                              </span>
                            </div>

                            {/* Switch interactivo ON */}
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(roleCode)}
                              className="relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-[#4F5AF5]"
                              title="Clic para desasignar rol de este nodo"
                            >
                              <span className="translate-x-3 pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out" />
                            </button>
                          </div>

                          {/* Permiso de Modificación de Datos (Solo Editar) */}
                          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                              <Pencil className="w-3 h-3 text-slate-400" />
                              <span>Modificar datos previos</span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleRolePermissionChange(roleCode, 'can_edit', !assigned.can_edit)
                              }
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                assigned.can_edit
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                              }`}
                              title="Habilitar para permitir que este rol modifique información registrada previamente en la iniciativa"
                            >
                              <Pencil className={`w-2.5 h-2.5 ${assigned.can_edit ? 'text-indigo-600' : 'text-slate-400'}`} />
                              <span>{assigned.can_edit ? 'Editar: Activado' : 'Solo Lectura'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ── ROL DISPONIBLE NO ASIGNADO (FILA COMPACTA CON BOTÓN RÁPIDO) ──
                  return (
                    <div
                      key={roleCode}
                      className="p-2 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-2 group shadow-2xs"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: swatchCfg.swatch }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-slate-700 truncate block">
                              {roleItem.name}
                            </span>
                            {roleItem.is_system ? (
                              <span className="text-[9px] text-slate-400 font-bold shrink-0">· Base</span>
                            ) : (
                              <span className="text-[9px] text-violet-600 font-bold shrink-0">· Custom</span>
                            )}
                          </div>
                          <span className="font-mono text-[9px] text-slate-400 block truncate">
                            {roleCode}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRoleToggle(roleCode)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600 hover:text-[#4F5AF5] bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all shrink-0 cursor-pointer shadow-2xs"
                      >
                        + Habilitar
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {activeTab === 'custody' && (
          <div className="space-y-4">
            <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 flex items-start gap-2">
              <FileCheck2 className="w-4 h-4 text-[#4F5AF5] shrink-0 mt-0.5" />
              <p>
                Asocia un <strong>Formulario</strong> y una <strong>Declaración de Consentimiento</strong> obligatorios para este estado. El evaluador deberá completarlos antes de aprobar.
              </p>
            </div>

            {/* Selector de Formulario de Etapa */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Formulario de Etapa
              </label>
              <select
                value={nodeData.form_id || ''}
                onChange={(e) => updateNodeData(selectedNode!.id, { form_id: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]"
              >
                <option value="">Ninguno (Sin formulario adicional)</option>
                {availableStageForms.map((sf) => (
                  <option key={sf.id} value={sf.id}>
                    {sf.name} ({(sf.fields || []).length} campos)
                  </option>
                ))}
              </select>

              {nodeData.form_id && (() => {
                const selForm = availableStageForms.find((f) => f.id === nodeData.form_id);
                if (!selForm) return null;
                return (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{selForm.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">{selForm.code}</span>
                    </div>
                    {selForm.description && (
                      <p className="text-[10px] text-slate-500">{selForm.description}</p>
                    )}
                    <div className="pt-1 flex flex-wrap gap-1">
                      {(selForm.fields || []).map((f) => (
                        <span key={f.id} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] text-slate-600">
                          {f.label} {f.required && '*'}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Selector de Consentimiento */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Consentimiento / Declaración
              </label>
              <select
                value={nodeData.consent_id || ''}
                onChange={(e) => updateNodeData(selectedNode!.id, { consent_id: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]"
              >
                <option value="">Ninguno (Sin consentimiento requerido)</option>
                {availableStageConsents.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.title} (v{sc.version})
                  </option>
                ))}
              </select>

              {nodeData.consent_id && (() => {
                const selConsent = availableStageConsents.find((c) => c.id === nodeData.consent_id);
                if (!selConsent) return null;
                return (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{selConsent.title}</span>
                      <span className="font-mono text-[10px] text-indigo-600 font-bold">v{selConsent.version}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 italic line-clamp-3">
                      "{selConsent.statement}"
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <a
                href="/admin/formularios-consentimientos"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4F5AF5] hover:text-indigo-700 hover:underline"
              >
                <span>Administrar catálogo de formularios & consentimientos</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {activeTab === 'fields' && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500">
              Campos que deben completarse obligatoriamente para poder avanzar desde este nodo:
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {availableFields.map((f) => {
                const isSelected = requiredFields.includes(f.key);
                return (
                  <label
                    key={f.key}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{f.label}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleFieldToggle(f.key)}
                      className="rounded text-[#4F5AF5] focus:ring-[#4F5AF5]"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'ai' && isAINode && (
          <div className="space-y-3">
            <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-xl text-[11px] text-violet-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
              <span>Conectado al motor de Gemini / Groq de IACS</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Prompt / Instrucción Base
              </label>
              <textarea
                rows={4}
                value={nodeData.aiConfig?.promptTemplate || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode!.id, {
                    aiConfig: {
                      ...nodeData.aiConfig,
                      promptTemplate: e.target.value,
                    },
                  })
                }
                placeholder="Instrucciones específicas para el modelo de lenguaje en este paso..."
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
