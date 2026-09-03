import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BrainCircuit, Sparkles, MessageSquare } from 'lucide-react';
import type { WorkflowNodeData } from '../../../types';

export const AIAgentNode = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData = (data || {}) as WorkflowNodeData;
  const label = nodeData.label || 'Asistente IA (Chat)';

  return (
    <div
      className={`relative min-w-[210px] max-w-[250px] rounded-xl bg-violet-50/90 border transition-all duration-150 group ${
        selected ? 'ring-2 ring-violet-500 border-violet-500 shadow-md' : 'border-violet-300 hover:border-violet-400'
      }`}
    >
      {/* Top Handle - Universal */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-5 !h-5 !bg-violet-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Left Handle - Universal */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-5 !h-5 !bg-violet-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-violet-200/70 bg-violet-100/60 rounded-t-xl">
        <BrainCircuit className="w-4 h-4 text-violet-700" />
        <span className="font-semibold text-xs text-violet-900 truncate flex-1">{label}</span>
        <span className="text-[9px] bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full border border-violet-300 font-medium flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" /> IA
        </span>
      </div>

      {/* Body */}
      <div className="p-2.5 text-[11px] text-violet-900 space-y-1">
        <p className="text-violet-700/90 line-clamp-2 leading-tight">
          {nodeData.description || 'Entrevista interactiva para auto-completar formulario.'}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-violet-600 pt-0.5">
          <MessageSquare className="w-3 h-3" />
          <span>Chat conversacional activo</span>
        </div>
      </div>

      {/* Source handle on Right */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-5 !h-5 !bg-violet-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Source handle on Bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-5 !h-5 !bg-violet-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />
    </div>
  );
});

AIAgentNode.displayName = 'AIAgentNode';
