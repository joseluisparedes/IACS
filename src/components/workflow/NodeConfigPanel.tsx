import React, { useState, useEffect } from 'react';
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
  Plus
} from 'lucide-react';
import { useWorkflowStore } from '../../lib/workflowStore';
import type { WorkflowNodeRole, WorkflowNodeData } from '../../types';

const AVAILABLE_ROLES = ['registrador', 'bp_ti', 'admin'];

export const NodeConfigPanel: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    updateNodeData,
    updateEdgeData,
    deleteSelected,
  } = useWorkflowStore();

  const [activeTab, setActiveTab] = useState<'props' | 'roles' | 'fields' | 'ai'>('props');
  const [availableFields, setAvailableFields] = useState<Array<{ key: string; label: string }>>([
    { key: 'descripcion', label: 'Descripción' },
    { key: 'pilar_estrategico', label: 'Pilar Estratégico' },
    { key: 'institucion', label: 'Institución / Empresa' },
    { key: 'vp', label: 'Vicepresidencia' },
    { key: 'direccion', label: 'Dirección' },
    { key: 'impacto_negocio', label: 'Impacto en el Negocio' },
    { key: 'presupuesto_estimado', label: 'Presupuesto Estimado' },
    { key: 'fecha_estimada', label: 'Fecha Estimada' },
  ]);

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
            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar transición"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Etiqueta de la Acción
            </label>
            <input
              type="text"
              value={currentLabel}
              onChange={(e) => updateEdgeData(selectedEdge.id, e.target.value, conditionType)}
              placeholder="Ej: Enviar a aprobación, Aprobar, Observar..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tipo de Condición
            </label>
            <select
              value={conditionType}
              onChange={(e) => updateEdgeData(selectedEdge.id, currentLabel, e.target.value)}
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
              <span className="truncate max-w-[90px] font-mono text-[10px]">{selectedEdge.source}</span>
              <ArrowRight className="w-3 h-3 text-[#4F5AF5]" />
              <span className="truncate max-w-[90px] font-mono text-[10px]">{selectedEdge.target}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={deleteSelected}
            className="w-full mt-2 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar esta Conexión</span>
          </button>
        </div>
      </aside>
    );
  }

  // ── Configuración de Nodo ──────────────────────────────────────────────────
  const nodeData = (selectedNode!.data || {}) as WorkflowNodeData;
  const roles = nodeData.roles || [];
  const requiredFields = nodeData.requiredFields || [];
  const isAINode = nodeData.nodeType === 'ai_agent' || nodeData.nodeType === 'ai_text';

  const handleRoleToggle = (roleName: string) => {
    const exists = roles.find((r) => r.role_name === roleName);
    let newRoles: WorkflowNodeRole[];
    if (exists) {
      newRoles = roles.filter((r) => r.role_name !== roleName);
    } else {
      newRoles = [
        ...roles,
        {
          role_name: roleName,
          can_edit: roleName === 'registrador' || roleName === 'admin',
          can_approve: roleName === 'bp_ti' || roleName === 'admin',
          can_reject: roleName === 'bp_ti' || roleName === 'admin',
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

  return (
    <aside className="w-72 bg-white border-l border-slate-200 flex flex-col h-full">
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
          className={`flex-1 py-1 px-1.5 rounded-md font-medium transition-colors ${
            activeTab === 'roles' ? 'bg-white text-[#4F5AF5] shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Roles
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
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] text-xs"
              />
            </div>

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
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500">
              Define qué roles pueden interactuar o aprobar iniciativas en este estado.
            </p>

            <div className="space-y-2">
              {AVAILABLE_ROLES.map((roleName) => {
                const assigned = roles.find((r) => r.role_name === roleName);
                return (
                  <div
                    key={roleName}
                    className={`p-2.5 rounded-xl border transition-all ${
                      assigned ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!assigned}
                          onChange={() => handleRoleToggle(roleName)}
                          className="rounded text-[#4F5AF5] focus:ring-[#4F5AF5]"
                        />
                        <span className="font-bold text-xs capitalize text-slate-800">{roleName}</span>
                      </label>
                    </div>

                    {assigned && (
                      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-indigo-100 text-[10px]">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assigned.can_edit}
                            onChange={(e) =>
                              handleRolePermissionChange(roleName, 'can_edit', e.target.checked)
                            }
                            className="rounded text-[#4F5AF5]"
                          />
                          <span>Editar</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assigned.can_approve}
                            onChange={(e) =>
                              handleRolePermissionChange(roleName, 'can_approve', e.target.checked)
                            }
                            className="rounded text-emerald-600"
                          />
                          <span>Aprobar</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assigned.can_reject}
                            onChange={(e) =>
                              handleRolePermissionChange(roleName, 'can_reject', e.target.checked)
                            }
                            className="rounded text-red-600"
                          />
                          <span>Rechazar</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
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
