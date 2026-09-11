import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Layers, PlayCircle, CheckCircle2, AlertTriangle, Archive } from 'lucide-react';
import type { WorkflowNodeData } from '../../../types';

export const StateNode = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData = (data || {}) as WorkflowNodeData;
  const isStart = nodeData.nodeType === 'start';
  const isEnd = nodeData.nodeType === 'end';
  const label = nodeData.label || (isStart ? 'Inicio' : isEnd ? 'Fin' : 'Estado');
  const subtype = (nodeData.stateSubtype as string) || '';
  const isDemanda = subtype === 'demanda' || label.toLowerCase().includes('demanda');
  const isDesestimada = subtype === 'desestimada' || label.toLowerCase().includes('desestimada');
  const isObservada = subtype === 'observada' || label.toLowerCase().includes('observada');

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

  const handleVisibleClass = selected
    ? 'opacity-100 scale-100 pointer-events-auto'
    : 'opacity-0 scale-50 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto';

  const mainHandleClass = `!w-5 !h-5 !bg-[#4F5AF5] !border-[3px] !border-white shadow-md hover:!scale-125 !transition-all !duration-150 !cursor-crosshair z-30 ${handleVisibleClass}`;
  const subHandleClass = `!w-3.5 !h-3.5 !bg-[#4F5AF5] !border-2 !border-white shadow-sm hover:!scale-150 !transition-all !duration-150 !cursor-crosshair z-30 ${handleVisibleClass}`;

  return (
    <div
      className={`relative min-w-[200px] max-w-[240px] rounded-xl bg-white shadow-sm border transition-all duration-150 group ${
        selected ? 'ring-2 ring-[#4F5AF5] border-[#4F5AF5] shadow-md' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Handles (Left 25%, Center 50% [Original], Right 75%) */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-left"
        style={{ left: '25%' }}
        className={subHandleClass}
        title="Conexión Superior Izquierda"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ left: '50%' }}
        className={mainHandleClass}
        title="Conexión Superior Centro (Principal)"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-right"
        style={{ left: '75%' }}
        className={subHandleClass}
        title="Conexión Superior Derecha"
      />

      {/* Left Handles (Top 25%, Center 50% [Original], Bottom 75%) */}
      <Handle
        type="source"
        position={Position.Left}
        id="left-top"
        style={{ top: '25%' }}
        className={subHandleClass}
        title="Conexión Lateral Izquierda Superior"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ top: '50%' }}
        className={mainHandleClass}
        title="Conexión Lateral Izquierda Centro (Principal)"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-bottom"
        style={{ top: '75%' }}
        className={subHandleClass}
        title="Conexión Lateral Izquierda Inferior"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
        {getIcon()}
        <span className="font-semibold text-xs text-slate-800 truncate flex-1">{label}</span>
        {nodeData.dispatchMode === 'select_person' ? (
          <span className="text-[9px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-full border border-violet-200 font-medium shrink-0" title="Asignación obligatoria a persona específica">
            👤 Persona
          </span>
        ) : nodeData.dispatchMode === 'general_inbox' ? (
          <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200 font-medium shrink-0" title="Bandeja general compartida del rol">
            📬 Bandeja
          </span>
        ) : null}
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${getBadgeStyle()}`}>
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
                className={`text-[9px] px-1.5 py-0.5 rounded border font-medium flex items-center gap-1 ${
                  r.can_edit
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title={`Rol: ${r.role_name} (${r.can_edit ? 'Edición Habilitada' : 'Solo Lectura'})`}
              >
                {r.role_name}
                {r.can_edit && <span className="text-[8px] text-indigo-500 font-bold">✏️</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right Handles (Top 25%, Center 50% [Original], Bottom 75%) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-top"
        style={{ top: '25%' }}
        className={subHandleClass}
        title="Conexión Lateral Derecha Superior"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ top: '50%' }}
        className={mainHandleClass}
        title="Conexión Lateral Derecha Centro (Principal)"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-bottom"
        style={{ top: '75%' }}
        className={subHandleClass}
        title="Conexión Lateral Derecha Inferior"
      />

      {/* Bottom Handles (Left 25%, Center 50% [Original], Right 75%) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-left"
        style={{ left: '25%' }}
        className={subHandleClass}
        title="Conexión Inferior Izquierda"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ left: '50%' }}
        className={mainHandleClass}
        title="Conexión Inferior Centro (Principal)"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right"
        style={{ left: '75%' }}
        className={subHandleClass}
        title="Conexión Inferior Derecha"
      />
    </div>
  );
});

StateNode.displayName = 'StateNode';
