import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Layers, PlayCircle, CheckCircle2, AlertTriangle, Archive } from 'lucide-react';
import type { WorkflowNodeData } from '../../../types';

export const StateNode = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData = (data || {}) as WorkflowNodeData;
  const isStart = nodeData.nodeType === 'start';
  const isEnd = nodeData.nodeType === 'end';
  const label = nodeData.label || (isStart ? 'Inicio' : isEnd ? 'Fin' : 'Estado');
  const isDemanda = label.toLowerCase().includes('demanda');
  const isDesestimada = label.toLowerCase().includes('desestimada');
  const isObservada = label.toLowerCase().includes('observada');

  const getBadgeStyle = () => {
    if (isStart) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (isEnd || isDemanda) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (isDesestimada) return 'bg-red-100 text-red-800 border-red-300';
    if (isObservada) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const getIcon = () => {
    if (isStart) return <PlayCircle className="w-4 h-4 text-emerald-600" />;
    if (isEnd || isDemanda) return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (isDesestimada) return <Archive className="w-4 h-4 text-red-600" />;
    if (isObservada) return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    return <Layers className="w-4 h-4 text-[#4F5AF5]" />;
  };

  return (
    <div
      className={`relative min-w-[200px] max-w-[240px] rounded-xl bg-white shadow-sm border transition-all duration-150 group ${
        selected ? 'ring-2 ring-[#4F5AF5] border-[#4F5AF5] shadow-md' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Handle - Universal */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-5 !h-5 !bg-[#4F5AF5] !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Left Handle - Universal */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-5 !h-5 !bg-[#4F5AF5] !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
        {getIcon()}
        <span className="font-semibold text-xs text-slate-800 truncate flex-1">{label}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${getBadgeStyle()}`}>
          {isStart ? 'Inicio' : isEnd ? 'Fin' : 'Estado'}
        </span>
      </div>

      {/* Body */}
      <div className="p-2.5 text-[11px] text-slate-600 space-y-1.5">
        {nodeData.description && (
          <p className="text-slate-500 line-clamp-2 leading-tight">{nodeData.description}</p>
        )}

        {/* Roles list */}
        {Array.isArray(nodeData.roles) && nodeData.roles.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {nodeData.roles.map((r, i) => (
              <span
                key={i}
                className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                title={`Edición: ${r.can_edit ? 'Sí' : 'No'}, Aprobación: ${r.can_approve ? 'Sí' : 'No'}`}
              >
                {r.role_name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Source handle on Right */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-5 !h-5 !bg-[#4F5AF5] !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Source handle on Bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-5 !h-5 !bg-[#4F5AF5] !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />
    </div>
  );
});

StateNode.displayName = 'StateNode';
