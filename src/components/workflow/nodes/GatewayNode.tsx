import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitFork, ArrowRight, AlertTriangle } from 'lucide-react';
import type { WorkflowNodeData, GatewayConfig, GatewayBranchRule } from '../../../types';
import { useWorkflowStore } from '../../../lib/workflowStore';

export const GatewayNode = memo(({ id, data, selected }: NodeProps<any>) => {
  const nodeData = (data || {}) as WorkflowNodeData;
  const label = nodeData.label || 'Compuerta de Decisión';
  const { edges, nodes } = useWorkflowStore();

  const gatewayConfig = nodeData.gatewayConfig as GatewayConfig | undefined;
  const variable = gatewayConfig?.variable || (id === 'gw_presupuesto' ? 'requiere_presupuesto' : '');

  const outgoingEdges = edges.filter((e) => e.source === id);
  const rules: GatewayBranchRule[] = gatewayConfig?.rules || [];

  return (
    <div
      className={`relative min-w-[240px] max-w-[280px] rounded-2xl bg-amber-50/95 border transition-all duration-150 group shadow-xs ${
        selected ? 'ring-2 ring-amber-500 border-amber-500 shadow-md' : 'border-amber-300 hover:border-amber-400'
      }`}
    >
      {/* Top Handle - Universal */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-5 !h-5 !bg-amber-500 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Left Handle - Universal */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-5 !h-5 !bg-amber-500 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-amber-200/80 bg-gradient-to-r from-amber-100/90 to-orange-100/60 rounded-t-2xl">
        <div className="w-5 h-5 rounded-md bg-amber-200/80 flex items-center justify-center text-amber-800 shrink-0">
          <GitFork className="w-3.5 h-3.5 text-amber-800 shrink-0" />
        </div>
        <span className="font-bold text-xs text-amber-950 truncate flex-1" title={label}>{label}</span>
        <span className="text-[9px] bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 font-bold shrink-0">
          Decisión
        </span>
      </div>

      {/* Body: Lógica dinámica de bifurcación */}
      <div className="p-3 space-y-2 text-[10px] text-amber-900">
        {/* Variable */}
        <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 text-[10px]">
          <span className="text-amber-800 font-medium">Variable:</span>
          {variable ? (
            <span
              className="bg-white px-2 py-0.5 rounded-md border border-amber-300/80 font-mono font-bold text-amber-950 truncate max-w-[150px] shadow-2xs"
              title={variable}
            >
              {variable}
            </span>
          ) : (
            <span className="bg-amber-100/80 text-amber-700 px-1.5 py-0.5 rounded text-[9px] italic border border-dashed border-amber-300">
              Seleccionar en panel
            </span>
          )}
        </div>

        {/* Ramas dinámicas */}
        {outgoingEdges.length > 0 ? (
          <div className="space-y-1.5 pt-0.5">
            {outgoingEdges.map((edge, idx) => {
              const targetNode = nodes.find((n) => n.id === edge.target);
              const targetLabel = String(targetNode?.data?.label || edge.target);

              // Buscar regla asociada por edgeId o por targetNodeId
              const rule = rules.find((r) => r.edgeId === edge.id || r.targetNodeId === edge.target);

              let conditionDisplay = '';
              let badgeColor = 'bg-white border-slate-200 text-slate-700';

              if (rule) {
                if (rule.isDefault) {
                  conditionDisplay = '★ Otro (Else)';
                  badgeColor = 'bg-slate-100 border-slate-300 text-slate-700';
                } else {
                  const op = rule.operator === 'not_equals' ? '≠' : rule.operator === 'greater_than' ? '>' : rule.operator === 'less_than' ? '<' : '=';
                  conditionDisplay = `${op} ${rule.value}`;
                  if (rule.value.toLowerCase() === 'sí' || rule.value.toLowerCase() === 'si' || rule.value.toLowerCase() === 'true') {
                    badgeColor = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                  } else if (rule.value.toLowerCase() === 'no' || rule.value.toLowerCase() === 'false') {
                    badgeColor = 'bg-blue-50 border-blue-200 text-blue-700';
                  } else {
                    badgeColor = 'bg-violet-50 border-violet-200 text-violet-700';
                  }
                }
              } else {
                // Fallback inteligente si aún no se ha guardado una regla explícita
                const edgeLabel = String(edge.label || '').trim();
                const isYes = /s[íi]/i.test(edgeLabel) || idx === 0;
                const isNo = /no/i.test(edgeLabel);
                
                if (isYes && !isNo) {
                  conditionDisplay = '= SÍ';
                  badgeColor = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                } else if (isNo) {
                  conditionDisplay = '= NO';
                  badgeColor = 'bg-blue-50 border-blue-200 text-blue-700';
                } else {
                  conditionDisplay = edgeLabel ? `→ ${edgeLabel}` : `Rama ${idx + 1}`;
                  badgeColor = 'bg-amber-100/60 border-amber-200 text-amber-800';
                }
              }

              return (
                <div
                  key={edge.id}
                  className="flex items-center justify-between bg-white/90 px-2.5 py-1.5 rounded-lg border border-amber-200/90 shadow-2xs text-[10px]"
                >
                  <span className={`font-bold px-1.5 py-0.5 rounded border text-[9px] truncate max-w-[90px] ${badgeColor}`}>
                    {conditionDisplay}
                  </span>
                  <div className="flex items-center gap-1 text-slate-600 truncate ml-1 text-[9px] font-medium" title={targetLabel}>
                    <ArrowRight className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                    <span className="truncate">{targetLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[9px] text-amber-700/80 italic text-center py-1">
            Conecta flechas de salida para configurar ramas
          </div>
        )}

        {outgoingEdges.some((e) => ((e.data as any)?.allowed_roles || []).length > 0) && (
          <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-[9px] text-rose-700 flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Alerta: Salidas de compuerta deben ser automáticas por datos (sin roles)</span>
          </div>
        )}
      </div>

      {/* Source handle on Right */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-5 !h-5 !bg-amber-500 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Source handle on Bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-5 !h-5 !bg-amber-500 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />
    </div>
  );
});

GatewayNode.displayName = 'GatewayNode';
