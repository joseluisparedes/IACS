import type { Node, Edge } from '@xyflow/react';

// Mapa de coordenadas estándar maestras oficiales de IACS
export const DEFAULT_MASTER_COORDINATES: Record<string, { x: number; y: number }> = {
  start: { x: 60, y: 180 },
  borrador: { x: 240, y: 140 },
  ai_chat: { x: 240, y: 340 },
  eval_bp: { x: 520, y: 140 },
  aprob_bo: { x: 800, y: 140 },
  aprob_vp: { x: 1080, y: 140 },
  asig_demanda: { x: 1360, y: 140 },
  ventana_est: { x: 1640, y: 140 },
  gw_presupuesto: { x: 1920, y: 140 },
  est_con_presupuesto: { x: 2180, y: 40 },
  est_sin_presupuesto: { x: 2180, y: 240 },
  val_est_bp: { x: 2480, y: 140 },
  vobo_est_bo: { x: 2760, y: 140 },
  plan_fechas: { x: 3040, y: 140 },
  val_plan_bp: { x: 3320, y: 140 },
  aprob_plan_bo: { x: 3600, y: 140 },
  planificacion: { x: 3880, y: 140 },
  end: { x: 4140, y: 180 },
  // Canal inferior para observaciones y descarte
  observada: { x: 1640, y: 440 },
  desestimada: { x: 1920, y: 440 },
};

/**
 * Organiza EXCLUSIVAMENTE las posiciones (x, y) de los nodos según las coordenadas
 * maestras predeterminadas (o las coordenadas personalizadas configuradas en el flujo).
 * NO modifica flechas, nombres, handles ni conexiones del flujo.
 */
export function organizeWorkflowGraph(
  nodes: Node[],
  edges: Edge[],
  customMasterCoords?: Record<string, { x: number; y: number }>
): { nodes: Node[]; edges: Edge[] } {
  const coordinatesMap = {
    ...DEFAULT_MASTER_COORDINATES,
    ...(customMasterCoords || {}),
  };

  let customIndex = 0;
  const newNodes = nodes.map((node) => {
    let position = coordinatesMap[node.id];

    if (!position) {
      // Posicionamiento dinámico para nodos adicionales creados posteriormente por el usuario
      const subtype = (node.data as any)?.stateSubtype;
      const isObservada = subtype === 'observada' || node.id.includes('obs');
      const isDesestimada = subtype === 'desestimada' || node.id.includes('desest');

      if (isObservada || isDesestimada) {
        position = {
          x: 2200 + customIndex * 280,
          y: 440,
        };
      } else {
        position = {
          x: 4140 + (customIndex + 1) * 280,
          y: 140,
        };
      }
      customIndex++;
    }

    return {
      ...node,
      position: { ...position },
    };
  });

  // Retornar nodos con posiciones ajustadas y aristas completamente INTACTAS
  return { nodes: newNodes, edges };
}
