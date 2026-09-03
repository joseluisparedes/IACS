import { create } from 'zustand';
import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect, Connection } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge, reconnectEdge } from '@xyflow/react';
import type { WorkflowDefinition, WorkflowNodeData } from '../types';

interface WorkflowSnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface WorkflowStore {
  activeWorkflow: WorkflowDefinition | null;
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;

  // History (Undo / Redo)
  past: WorkflowSnapshot[];
  future: WorkflowSnapshot[];
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Actions
  setActiveWorkflow: (wf: WorkflowDefinition | null) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setLastSavedAt: (timestamp: string | null) => void;

  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  updateEdgeData: (edgeId: string, label: string, condition_type?: string, condition_config?: any) => void;
  addNode: (type: string, position: { x: number; y: number }, label?: string) => void;
  deleteSelected: () => void;
}

const cloneSnapshot = (nodes: Node[], edges: Edge[]): WorkflowSnapshot => ({
  nodes: JSON.parse(JSON.stringify(nodes)),
  edges: JSON.parse(JSON.stringify(edges)),
});

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  activeWorkflow: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  past: [],
  future: [],

  pushHistory: () => {
    const { nodes, edges, past } = get();
    const snapshot = cloneSnapshot(nodes, edges);
    set({
      past: [...past.slice(-29), snapshot],
      future: [],
    });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const current = cloneSnapshot(nodes, edges);

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: newPast,
      future: [current, ...future],
      isDirty: true,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);
    const current = cloneSnapshot(nodes, edges);

    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, current],
      future: newFuture,
      isDirty: true,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  setActiveWorkflow: (wf) => {
    if (!wf) {
      set({ activeWorkflow: null, nodes: [], edges: [], isDirty: false, selectedNodeId: null, selectedEdgeId: null });
      return;
    }
    const nodes: Node[] = (wf.graph_json?.nodes || []).map((n: any) => ({
      ...n,
      data: {
        ...(n.data || {}),
        roles: wf.workflow_node_roles?.filter((r: any) => r.node_id === n.id) || n.data?.roles || [],
      },
    }));
    const edges: Edge[] = (wf.graph_json?.edges || []).map((e: any) => ({
      ...e,
      type: e.type || 'workflow',
    }));
    set({
      activeWorkflow: wf,
      nodes,
      edges,
      isDirty: false,
      selectedNodeId: null,
      selectedEdgeId: null,
      lastSavedAt: wf.updated_at || null,
    });
  },

  setNodes: (nodes) => {
    get().pushHistory();
    set({ nodes, isDirty: true });
  },

  setEdges: (edges) => {
    get().pushHistory();
    set({ edges, isDirty: true });
  },

  onNodesChange: (changes) => {
    const hasFinishedDrag = changes.some((c: any) => c.type === 'position' && c.dragging === false);
    const hasRemoval = changes.some((c: any) => c.type === 'remove');
    if (hasFinishedDrag || hasRemoval) {
      get().pushHistory();
    }
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    const hasRemoval = changes.some((c: any) => c.type === 'remove');
    if (hasRemoval) {
      get().pushHistory();
    }
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection) => {
    if (!connection.source || !connection.target) return;
    get().pushHistory();
    const newEdge: Edge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}-${Date.now().toString(36)}`,
      label: 'Nueva Transición',
      type: 'workflow',
      data: { condition_type: 'always' },
    };
    set({
      edges: addEdge(newEdge, get().edges),
      isDirty: true,
    });
  },

  onReconnect: (oldEdge, newConnection) => {
    if (!newConnection.source || !newConnection.target) return;
    get().pushHistory();
    set({
      edges: get().edges.map((e) => {
        if (e.id === oldEdge.id) {
          return {
            ...e,
            source: newConnection.source,
            target: newConnection.target,
            sourceHandle: newConnection.sourceHandle,
            targetHandle: newConnection.targetHandle,
          };
        }
        return e;
      }),
      isDirty: true,
    });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setIsDirty: (isDirty) => set({ isDirty }),
  setIsSaving: (isSaving) => set({ isSaving }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),

  updateNodeData: (nodeId, partialData) => {
    get().pushHistory();
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...(node.data || {}),
              ...partialData,
            },
          };
        }
        return node;
      }),
      isDirty: true,
    });
  },

  updateEdgeData: (edgeId, label, condition_type, condition_config) => {
    get().pushHistory();
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            label,
            data: {
              ...(edge.data || {}),
              condition_type: condition_type || edge.data?.condition_type || 'always',
              condition_config: condition_config || edge.data?.condition_config || {},
            },
          };
        }
        return edge;
      }),
      isDirty: true,
    });
  },

  addNode: (type, position, label) => {
    get().pushHistory();
    const id = `node_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const defaultLabels: Record<string, string> = {
      state: 'Nuevo Estado',
      gateway: '¿Condición?',
      ai_agent: 'Asistente IA (Chat)',
      ai_text: 'Extracción de Texto IA',
      human_task: 'Aprobación / Revisión',
      start: 'Inicio',
      end: 'Fin',
    };

    const newNode: Node = {
      id,
      type,
      position,
      data: {
        label: label || defaultLabels[type] || 'Nuevo Nodo',
        nodeType: type,
        description: '',
        roles: [],
        requiredFields: [],
      },
    };

    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
      selectedEdgeId: null,
      isDirty: true,
    });
  },

  deleteSelected: () => {
    const { selectedNodeId, selectedEdgeId, nodes, edges } = get();
    if (selectedNodeId || selectedEdgeId) {
      get().pushHistory();
    }
    if (selectedNodeId) {
      set({
        nodes: nodes.filter((n) => n.id !== selectedNodeId),
        edges: edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId),
        selectedNodeId: null,
        isDirty: true,
      });
    } else if (selectedEdgeId) {
      set({
        edges: edges.filter((e) => e.id !== selectedEdgeId),
        selectedEdgeId: null,
        isDirty: true,
      });
    }
  },
}));
