import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitFork, HelpCircle } from 'lucide-react';
import type { WorkflowNodeData } from '../../../types';

export const GatewayNode = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData = (data || {}) as WorkflowNodeData;
  const label = nodeData.label || 'Compuerta de Decisión';

  return (
    <div
      className={`relative min-w-[180px] max-w-[220px] rounded-xl bg-amber-50/90 border transition-all duration-150 group ${
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
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-amber-200/70 bg-amber-100/60 rounded-t-xl">
        <GitFork className="w-3.5 h-3.5 text-amber-700" />
        <span className="font-semibold text-xs text-amber-900 truncate flex-1">{label}</span>
        <span className="text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full border border-amber-300 font-medium">
          Gateway
        </span>
      </div>

      {/* Body */}
      <div className="p-2 text-[10px] text-amber-800 flex items-center gap-1">
        <HelpCircle className="w-3 h-3 text-amber-600 shrink-0" />
        <span className="leading-tight text-amber-700">Evalúa condiciones de salida</span>
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
