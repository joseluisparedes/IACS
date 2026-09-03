import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { UserCheck, ShieldCheck, Edit3 } from 'lucide-react';
import type { WorkflowNodeData } from '../../../types';

export const HumanTaskNode = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData = (data || {}) as WorkflowNodeData;
  const label = nodeData.label || 'Aprobación Humana';

  return (
    <div
      className={`relative min-w-[210px] max-w-[250px] rounded-xl bg-blue-50/90 border transition-all duration-150 group ${
        selected ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' : 'border-blue-300 hover:border-blue-400'
      }`}
    >
      {/* Top Handle - Universal */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-5 !h-5 !bg-blue-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Left Handle - Universal */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-5 !h-5 !bg-blue-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-blue-200/70 bg-blue-100/60 rounded-t-xl">
        <UserCheck className="w-4 h-4 text-blue-700" />
        <span className="font-semibold text-xs text-blue-900 truncate flex-1">{label}</span>
        <span className="text-[9px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full border border-blue-300 font-medium">
          Revisión
        </span>
      </div>

      {/* Body */}
      <div className="p-2.5 text-[11px] text-blue-900 space-y-1.5">
        <p className="text-blue-700/90 line-clamp-2 leading-tight">
          {nodeData.description || 'Revisión y toma de decisión por un usuario autorizado.'}
        </p>

        {/* Roles configured */}
        {Array.isArray(nodeData.roles) && nodeData.roles.length > 0 ? (
          <div className="space-y-1 pt-1 border-t border-blue-200/60">
            {nodeData.roles.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-[9px] bg-white/80 px-1.5 py-0.5 rounded border border-blue-200">
                <span className="font-medium text-slate-700">{r.role_name}</span>
                <div className="flex items-center gap-1 text-slate-500">
                  {r.can_approve && <span title="Aprobar"><ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /></span>}
                  {r.can_edit && <span title="Editar"><Edit3 className="w-2.5 h-2.5 text-blue-600" /></span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-[10px] text-amber-700 italic block">Sin roles asignados</span>
        )}
      </div>

      {/* Source handle on Right */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-5 !h-5 !bg-blue-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Source handle on Bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-5 !h-5 !bg-blue-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />
    </div>
  );
});

HumanTaskNode.displayName = 'HumanTaskNode';
