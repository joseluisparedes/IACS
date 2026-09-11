import type { Node, Edge } from '@xyflow/react';

/**
 * Organiza las posiciones de los nodos y handles de las aristas
 * de forma limpia, jerárquica y sin solapamientos.
 */
export function organizeWorkflowGraph(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  // Mapa de coordenadas estándar probadas para el ciclo oficial de 7 macro-fases y 12 estados
  const KNOWN_COORDINATES: Record<string, { x: number; y: number }> = {
    start: { x: 50, y: 195 },
    borrador: { x: 270, y: 150 },
    ai_chat: { x: 270, y: 350 },
    eval_bp: { x: 570, y: 150 },
    aprob_bo: { x: 870, y: 150 },
    aprob_vp: { x: 1170, y: 150 },
    asig_demanda: { x: 1470, y: 150 },
    ventana_est: { x: 1770, y: 150 },
    gw_presupuesto: { x: 2070, y: 150 },
    est_con_presupuesto: { x: 2360, y: 50 },
    est_sin_presupuesto: { x: 2360, y: 260 },
    val_est_bp: { x: 2670, y: 150 },
    vobo_est_bo: { x: 2970, y: 150 },
    plan_fechas: { x: 3270, y: 150 },
    val_plan_bp: { x: 3570, y: 150 },
    aprob_plan_bo: { x: 3870, y: 150 },
    planificacion: { x: 4170, y: 150 },
    end: { x: 4460, y: 195 },
    // Canal inferior para observaciones y descarte (sin cruces con el flujo principal)
    observada: { x: 1770, y: 480 },
    desestimada: { x: 2070, y: 480 },
  };

  // Posicionar nodos
  let customIndex = 0;
  const newNodes = nodes.map((node) => {
    let position = KNOWN_COORDINATES[node.id];

    if (!position) {
      // Posicionamiento dinámico para nodos adicionales creados por el usuario
      const subtype = (node.data as any)?.stateSubtype;
      const isObservada = subtype === 'observada' || node.id.includes('obs');
      const isDesestimada = subtype === 'desestimada' || node.id.includes('desest');

      if (isObservada || isDesestimada) {
        position = {
          x: 2370 + customIndex * 280,
          y: 480,
        };
      } else {
        position = {
          x: 4460 + (customIndex + 1) * 280,
          y: 150,
        };
      }
      customIndex++;
    }

    return {
      ...node,
      position: { ...position },
    };
  });

  const nodeMap = new Map<string, Node>();
  newNodes.forEach((n) => nodeMap.set(n.id, n));

  // Ajustar aristas con handles inteligentes según la geometría de origen y destino
  const newEdges = edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    let sourceHandle = edge.sourceHandle || 'right';
    let targetHandle = edge.targetHandle || 'left';

    if (sourceNode && targetNode) {
      const dx = targetNode.position.x - sourceNode.position.x;
      const dy = targetNode.position.y - sourceNode.position.y;

      // Si el destino es observada (hacia abajo)
      if (targetNode.id === 'observada') {
        sourceHandle = 'bottom';
        targetHandle = 'top';
      }
      // Si el origen es observada (hacia arriba o hacia la izquierda)
      else if (sourceNode.id === 'observada') {
        if (targetNode.id === 'desestimada') {
          sourceHandle = 'right';
          targetHandle = 'left';
        } else {
          sourceHandle = 'top';
          targetHandle = 'bottom';
        }
      }
      // Gateway a ramas superior e inferior
      else if (sourceNode.id === 'gw_presupuesto') {
        if (dy < -30) {
          sourceHandle = 'top';
          targetHandle = 'left';
        } else if (dy > 30) {
          sourceHandle = 'bottom';
          targetHandle = 'left';
        } else {
          sourceHandle = 'right';
          targetHandle = 'left';
        }
      }
      // Ramas convergiendo a val_est_bp
      else if (sourceNode.id === 'est_con_presupuesto' || sourceNode.id === 'est_sin_presupuesto') {
        sourceHandle = 'right';
        targetHandle = 'left';
      }
      // Avance estándar de izquierda a derecha
      else if (dx > 40) {
        sourceHandle = 'right';
        targetHandle = 'left';
      }
      // Retorno (de derecha a izquierda)
      else if (dx < -40) {
        sourceHandle = 'bottom';
        targetHandle = 'bottom';
      }
    }

    return {
      ...edge,
      type: 'workflow',
      sourceHandle,
      targetHandle,
    };
  });

  return { nodes: newNodes, edges: newEdges };
}
