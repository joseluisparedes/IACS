import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Sparkles, Wand2 } from 'lucide-react';
import type { WorkflowNodeData } from '../../../types';

export const AITextNode = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData = (data || {}) as WorkflowNodeData;
  const label = nodeData.label || 'Extracción de Texto IA';

  return (
    <div
      className={`relative min-w-[210px] max-w-[250px] rounded-xl bg-purple-50/90 border transition-all duration-150 group ${
        selected ? 'ring-2 ring-purple-500 border-purple-500 shadow-md' : 'border-purple-300 hover:border-purple-400'
      }`}
    >
      {/* Top Handle - Universal */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-5 !h-5 !bg-purple-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Left Handle - Universal */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-5 !h-5 !bg-purple-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-purple-200/70 bg-purple-100/60 rounded-t-xl">
        <FileText className="w-4 h-4 text-purple-700" />
        <span className="font-semibold text-xs text-purple-900 truncate flex-1">{label}</span>
        <span className="text-[9px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full border border-purple-300 font-medium flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" /> Parser
        </span>
      </div>

      {/* Body */}
      <div className="p-2.5 text-[11px] text-purple-900 space-y-1">
        <p className="text-purple-700/90 line-clamp-2 leading-tight">
          {nodeData.description || 'Extrae y mapea campos a partir de bloques de texto.'}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-purple-600 pt-0.5">
          <Wand2 className="w-3 h-3" />
          <span>Extracción estructurada</span>
        </div>
      </div>

      {/* Source handle on Right */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-5 !h-5 !bg-purple-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />

      {/* Source handle on Bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-5 !h-5 !bg-purple-600 !border-[3px] !border-white shadow-md hover:!scale-125 !transition-transform !cursor-crosshair z-30"
      />
    </div>
  );
});

AITextNode.displayName = 'AITextNode';
