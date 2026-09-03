import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useWorkflowStore } from '../../lib/workflowStore';

export const WorkflowEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  selected,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const { setSelectedEdgeId, edges, setEdges, setIsDirty } = useWorkflowStore();

  const conditionType = (data as any)?.condition_type;
  const isSelected = !!selected;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges(edges.filter((edge) => edge.id !== id));
    setIsDirty(true);
    setSelectedEdgeId(null);
  };

  const handleEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdgeId(id);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={isSelected ? 25 : 12}
        style={{
          ...style,
          stroke: isSelected ? '#4F5AF5' : style.stroke || '#94a3b8',
          strokeWidth: isSelected ? 3 : 2,
          zIndex: isSelected ? 50 : 1,
          transition: 'stroke 0.2s, stroke-width 0.2s',
          filter: isSelected ? 'drop-shadow(0 0 6px rgba(79, 90, 245, 0.7))' : undefined,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: isSelected ? 100 : 10,
          }}
          className="nodrag nopan"
          onClick={handleEdgeClick}
        >
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium border shadow-xs transition-all cursor-pointer select-none ${
              isSelected
                ? 'bg-white border-[#4F5AF5] text-[#4F5AF5] ring-2 ring-[#4F5AF5]/40 shadow-md scale-105'
                : 'bg-white/95 border-slate-300 text-slate-700 hover:border-[#4F5AF5] hover:bg-white hover:shadow-xs'
            }`}
          >
            <span className="truncate max-w-[150px] font-semibold">{label || 'Transición'}</span>

            {conditionType && conditionType !== 'always' && (
              <span className="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-mono">
                {conditionType === 'field_required' ? 'Req' : conditionType === 'vobo_check' ? 'VoBo' : 'Rol'}
              </span>
            )}

            {/* Botón interactivo de eliminación directa */}
            <button
              type="button"
              onClick={handleDelete}
              className={`p-1 rounded-full transition-all flex items-center justify-center ${
                isSelected
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-xs'
                  : 'bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white'
              }`}
              title="Eliminar esta conexión"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

WorkflowEdge.displayName = 'WorkflowEdge';
