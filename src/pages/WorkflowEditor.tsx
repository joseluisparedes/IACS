import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  Controls, 
  MiniMap, 
  Background, 
  BackgroundVariant,
  Panel,
  useReactFlow,
  ConnectionLineType,
  ConnectionMode,
  MarkerType
} from '@xyflow/react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  WorkflowVersionBar 
} from '../components/workflow/WorkflowVersionBar';
import { 
  WorkflowToolbar 
} from '../components/workflow/WorkflowToolbar';
import { 
  NodeConfigPanel 
} from '../components/workflow/NodeConfigPanel';
import { 
  RoleAssignmentTable 
} from '../components/workflow/RoleAssignmentTable';
import { StateNode } from '../components/workflow/nodes/StateNode';
import { GatewayNode } from '../components/workflow/nodes/GatewayNode';
import { AIAgentNode } from '../components/workflow/nodes/AIAgentNode';
import { AITextNode } from '../components/workflow/nodes/AITextNode';
import { HumanTaskNode } from '../components/workflow/nodes/HumanTaskNode';
import { WorkflowEdge } from '../components/workflow/WorkflowEdge';
import { useWorkflowStore } from '../lib/workflowStore';
import { supabase } from '../lib/supabase';
import { organizeWorkflowGraph } from '../lib/workflowLayout';
import { 
  Loader2, 
  Plus, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  Copy,
  Layers,
  Pin
} from 'lucide-react';
import type { WorkflowNodeType } from '../types';

const NODE_TYPES = {
  state: StateNode,
  gateway: GatewayNode,
  ai_agent: AIAgentNode,
  ai_text: AITextNode,
  human_task: HumanTaskNode,
  start: StateNode,
  end: StateNode,
};

const EDGE_TYPES = {
  workflow: WorkflowEdge,
  default: WorkflowEdge,
  smoothstep: WorkflowEdge,
};

const WorkflowEditorContent: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const reactFlowInstance = useReactFlow();

  const {
    activeWorkflow,
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    isDirty,
    setActiveWorkflow,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    setSelectedNodeId,
    setSelectedEdgeId,
    setIsDirty,
    setIsSaving,
    addNode,
    deleteSelected,
    undo,
    redo,
  } = useWorkflowStore();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [workflowsList, setWorkflowsList] = useState<any[]>([]);

  // Safe Edge Reconnection Guard - Prevents edges from disappearing if drop is cancelled
  const edgeReconnectSuccessful = useRef(true);

  const handleReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const handleReconnect = useCallback(
    (oldEdge: any, newConnection: any) => {
      edgeReconnectSuccessful.current = true;
      onReconnect(oldEdge, newConnection);
      setIsDirty(true);
    },
    [onReconnect, setIsDirty]
  );

  const handleReconnectEnd = useCallback(
    (_: any, _edge: any) => {
      if (!edgeReconnectSuccessful.current) {
        // No se conectó a un nuevo punto: asegurar que la flecha NO desaparezca
        setEdges([...edges]);
      }
      edgeReconnectSuccessful.current = true;
    },
    [edges, setEdges]
  );

  // Global Keyboard Shortcuts (Ctrl+Z: Undo, Ctrl+Y / Ctrl+Shift+Z: Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Cargar flujo
  const loadWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Cargar lista general de flujos para selector
      fetch('/api/workflow/definitions')
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((res) => setWorkflowsList(res.data || []))
        .catch(() => {});

      let url = id ? `/api/workflow/definitions/${id}` : '/api/workflow/active';
      let workflowData: any = null;

      try {
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.data) workflowData = json.data;
        }
      } catch (apiErr) {
        console.warn('API load failed, trying direct Supabase fallback:', apiErr);
      }

      // Fallback directo a Supabase
      if (!workflowData) {
        let query = supabase
          .from('workflow_definitions')
          .select('*, workflow_node_roles(*), workflow_transitions(*)');
        
        if (id) {
          query = query.eq('id', id);
        } else {
          query = query.eq('status', 'published').order('version', { ascending: false }).limit(1);
        }

        const { data: sbWf } = await query.maybeSingle();
        if (sbWf) {
          workflowData = sbWf;
        }
      }

      if (workflowData) {
        setActiveWorkflow(workflowData);
      } else {
        if (id) throw new Error('No se encontró el flujo solicitado');
        // Si no hay activo ni en API ni en Supabase, crear borrador inicial
        const createRes = await fetch('/api/workflow/definitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Flujo de Iniciativas v1' }),
        });
        const createdData = await createRes.json();
        setActiveWorkflow(createdData.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando flujo');
    } finally {
      setLoading(false);
    }
  }, [id, setActiveWorkflow]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  // Auto-ajustar vista del lienzo para mostrar todo el flujo de forma ordenada
  useEffect(() => {
    if (!loading && nodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 400 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, activeWorkflow?.id, reactFlowInstance]);

  // Auto-organización inteligente del diagrama (Acomoda exclusivamente las posiciones sin alterar aristas)
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const masterCoords = (activeWorkflow?.graph_json as any)?.master_coordinates;
    const { nodes: organizedNodes, edges: organizedEdges } = organizeWorkflowGraph(nodes, edges, masterCoords);
    setNodes(organizedNodes);
    setEdges(organizedEdges);
    setIsDirty(true);
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.15, duration: 400 });
    }, 50);
    showToast('¡Posiciones acomodadas al estándar predeterminado! Presiona "Guardar" para conservar.');
  }, [nodes, edges, setNodes, setEdges, setIsDirty, reactFlowInstance, activeWorkflow]);

  // Fijar las posiciones actuales del diagrama como las coordenadas maestras predeterminadas
  const handleSaveAsMasterCoordinates = useCallback(() => {
    if (nodes.length === 0 || !activeWorkflow) return;
    const coordsMap: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      coordsMap[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
    });

    const updatedGraphJson = {
      nodes: activeWorkflow.graph_json?.nodes || nodes,
      edges: activeWorkflow.graph_json?.edges || edges,
      ...(activeWorkflow.graph_json || {}),
      master_coordinates: coordsMap,
    };

    setActiveWorkflow({
      ...activeWorkflow,
      graph_json: updatedGraphJson,
    });
    setIsDirty(true);
    showToast('¡Distribución actual fijada como coordenadas predeterminadas! Presiona "Guardar" para publicar el estándar.');
  }, [nodes, edges, activeWorkflow, setActiveWorkflow, setIsDirty, showToast]);

  // Guardar Borrador con tolerancia a fallos y fallback directo a Supabase
  const handleSave = async () => {
    if (!activeWorkflow) return;
    try {
      setIsSaving(true);

      // Preparar payload de nodos y transiciones
      const nodeRolesToSave: any[] = [];
      nodes.forEach((n) => {
        const nData = (n.data || {}) as any;
        if (Array.isArray(nData.roles)) {
          nData.roles.forEach((r: any) => {
            nodeRolesToSave.push({
              node_id: n.id,
              role_name: r.role_name,
              can_edit: !!r.can_edit,
              can_approve: !!r.can_approve,
              can_reject: !!r.can_reject,
              required_fields: Array.isArray(nData.requiredFields) ? nData.requiredFields : [],
            });
          });
        }
      });

      const transitionsToSave = edges.map((e) => ({
        edge_id: e.id,
        label: (e.label as string) || '',
        source_node_id: e.source,
        target_node_id: e.target,
        condition_type: (e.data as any)?.condition_type || 'always',
        condition_config: (e.data as any)?.condition_config || {},
      }));

      let saveSuccess = false;

      // Intento 1: API Express del Backend
      try {
        const masterCoordsToSave = (activeWorkflow?.graph_json as any)?.master_coordinates;
        const res = await fetch(`/api/workflow/definitions/${activeWorkflow.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            graph_json: { nodes, edges, ...(masterCoordsToSave ? { master_coordinates: masterCoordsToSave } : {}) },
            name: activeWorkflow.name,
            description: activeWorkflow.description,
            node_roles: nodeRolesToSave,
            transitions: transitionsToSave,
          }),
        });

        if (res.ok) {
          const savedJson = await res.json();
          if (savedJson.data) {
            setActiveWorkflow({
              ...savedJson.data,
              workflow_node_roles: nodeRolesToSave,
              workflow_transitions: transitionsToSave,
            });
            saveSuccess = true;
          }
        } else {
          console.warn('Backend API PATCH returned status', res.status);
        }
      } catch (apiErr) {
        console.warn('API save failed, attempting Supabase direct fallback:', apiErr);
      }

      // Intento 2: Fallback directo a Supabase (Gobernanza Cyber Neo / The Architect)
      if (!saveSuccess) {
        const masterCoordsToSave = (activeWorkflow?.graph_json as any)?.master_coordinates;
        const { data: updatedWf, error: sbErr } = await supabase
          .from('workflow_definitions')
          .update({
            graph_json: { nodes, edges, ...(masterCoordsToSave ? { master_coordinates: masterCoordsToSave } : {}) },
            name: activeWorkflow.name,
            description: activeWorkflow.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeWorkflow.id)
          .select()
          .single();

        if (sbErr) throw sbErr;

        // Sincronizar roles de nodos en Supabase
        await supabase.from('workflow_node_roles').delete().eq('workflow_id', activeWorkflow.id);
        if (nodeRolesToSave.length > 0) {
          const rolesPayload = nodeRolesToSave.map((r) => ({
            workflow_id: activeWorkflow.id,
            ...r,
          }));
          await supabase.from('workflow_node_roles').insert(rolesPayload);
        }

        // Sincronizar transiciones en Supabase
        await supabase.from('workflow_transitions').delete().eq('workflow_id', activeWorkflow.id);
        if (transitionsToSave.length > 0) {
          const transPayload = transitionsToSave.map((t) => ({
            workflow_id: activeWorkflow.id,
            edge_id: t.edge_id,
            label: t.label,
            source_node_id: t.source_node_id,
            target_node_id: t.target_node_id,
            condition_type: t.condition_type,
            condition_config: t.condition_config,
          }));
          await supabase.from('workflow_transitions').insert(transPayload);
        }

        if (updatedWf) {
          setActiveWorkflow({
            ...updatedWf,
            workflow_node_roles: nodeRolesToSave,
            workflow_transitions: transitionsToSave,
          });
        }
      }

      setIsDirty(false);
      showToast('¡Diseño del flujo guardado con éxito en la BD! ✓');
    } catch (err: any) {
      console.error('Error in handleSave:', err);
      showToast(err.message || 'Error al guardar en la BD', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Prevenir cierre accidental de pestaña si hay cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Publicar Flujo
  const handlePublish = async () => {
    if (!activeWorkflow) return;
    try {
      // Guardar primero
      await handleSave();

      const res = await fetch(`/api/workflow/definitions/${activeWorkflow.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al publicar el flujo');
      }

      const data = await res.json();
      if (data.data) {
        setActiveWorkflow(data.data);
      }
      setIsDirty(false);
      showToast('¡Flujo publicado y activado con éxito! 🚀');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Clonar como nuevo borrador
  const handleCloneAsNewDraft = async () => {
    if (!activeWorkflow) return;
    try {
      setLoading(true);
      const res = await fetch('/api/workflow/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${activeWorkflow.name} (Copia)`,
          description: activeWorkflow.description,
          clone_from: activeWorkflow.id,
        }),
      });
      const data = await res.json();
      if (data.data) {
        navigate(`/admin/workflow-editor/${data.data.id}`);
        showToast('Borrador creado a partir del flujo actual');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop nuevo nodo en canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow-type') as WorkflowNodeType;
      if (!type) return;

      let payload: any = {};
      try {
        const raw = event.dataTransfer.getData('application/reactflow-payload');
        if (raw) payload = JSON.parse(raw);
      } catch {
        // ignore JSON parse error
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(
        type, 
        position, 
        payload.label, 
        payload.description, 
        payload.stateSubtype, 
        payload.roles
      );
    },
    [reactFlowInstance, addNode]
  );

  // Priority sorting: Selected edge is rendered at the top of the SVG DOM stack
  const displayEdges = useMemo(() => {
    if (!selectedEdgeId) return edges;
    const unselected = edges.filter((e) => e.id !== selectedEdgeId);
    const selected = edges.filter((e) => e.id === selectedEdgeId).map((e) => ({
      ...e,
      selected: true,
      zIndex: 100,
    }));
    return [...unselected, ...selected];
  }, [edges, selectedEdgeId]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-[#4F5AF5] animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-600">Cargando motor de flujos...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-100 overflow-hidden relative">
      {/* Top Action Bar */}
      <WorkflowVersionBar
        onSave={handleSave}
        onPublish={handlePublish}
        onOpenRolesModal={() => setShowRolesModal(true)}
        onAutoLayout={handleAutoLayout}
      />

      {/* Main Canvas Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar */}
        <WorkflowToolbar onAutoLayout={handleAutoLayout} />

        {/* Center Canvas */}
        <div className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={displayEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnectStart={handleReconnectStart}
            onReconnect={handleReconnect}
            onReconnectEnd={handleReconnectEnd}
            edgesReconnectable={true}
            reconnectRadius={20}
            connectionRadius={30}
            autoPanOnConnect={true}
            connectionMode={ConnectionMode.Loose}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={{ stroke: '#4F5AF5', strokeWidth: 2 }}
            isValidConnection={(conn) => {
              if (!conn.source || !conn.target) return false;
              return !(conn.source === conn.target && conn.sourceHandle === conn.targetHandle);
            }}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            onNodesDelete={() => {
              setIsDirty(true);
              setSelectedNodeId(null);
            }}
            onEdgesDelete={() => {
              setIsDirty(true);
              setSelectedEdgeId(null);
            }}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              type: 'workflow',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 18,
                height: 18,
                color: '#94a3b8',
              },
            }}
          >
            <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-xl overflow-hidden" />
            <MiniMap
              nodeStrokeWidth={3}
              className="!bg-white !border-slate-200 !shadow-sm !rounded-xl overflow-hidden"
              zoomable
              pannable
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />

            {/* Quick Canvas Actions Floating Panel */}
            <Panel position="top-right" className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoLayout}
                className="px-3 py-1.5 bg-white/95 backdrop-blur-xs border border-indigo-200 text-[#4F5AF5] text-xs font-semibold rounded-xl shadow-xs hover:bg-indigo-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Alinear y acomodar todas las cajas a sus posiciones predeterminadas sin alterar flechas ni datos"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#4F5AF5]" />
                <span>Organizar Diagrama</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAsMasterCoordinates}
                className="px-3 py-1.5 bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-700 text-xs font-medium rounded-xl shadow-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Fijar la distribución actual como el nuevo estándar predeterminado para el botón Organizar"
              >
                <Pin className="w-3.5 h-3.5 text-indigo-500" />
                <span>Fijar como Default</span>
              </button>
              <button
                type="button"
                onClick={handleCloneAsNewDraft}
                className="px-3 py-1.5 bg-white/90 backdrop-blur-xs border border-slate-200 text-slate-700 text-xs font-medium rounded-xl shadow-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Crear un nuevo borrador a partir de este esquema"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Clonar Borrador</span>
              </button>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right Config Panel */}
        <NodeConfigPanel />
      </div>

      {/* Toast Notifications */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-medium animate-in slide-in-from-bottom duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-medium animate-in slide-in-from-bottom duration-150">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Modal de Asignación de Roles */}
      {showRolesModal && activeWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Asignación de Usuarios a Roles del Flujo
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gestiona los usuarios autorizados para cada rol en "{activeWorkflow.name}"
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRolesModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <RoleAssignmentTable workflowId={activeWorkflow.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent />
    </ReactFlowProvider>
  );
}
