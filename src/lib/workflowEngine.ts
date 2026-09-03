import { supabase } from './supabase';
import type { WorkflowTransitionResult, WorkflowDefinition } from '../types';

let cachedWorkflow: (WorkflowDefinition & { workflow_node_roles?: any[]; workflow_transitions?: any[] }) | null = null;
let cacheExpiry = 0;

export async function getActiveWorkflow(): Promise<(WorkflowDefinition & { workflow_node_roles?: any[]; workflow_transitions?: any[] }) | null> {
  if (cachedWorkflow && Date.now() < cacheExpiry) return cachedWorkflow;
  try {
    const { data, error } = await supabase
      .from('workflow_definitions')
      .select('*, workflow_node_roles(*), workflow_transitions(*)')
      .eq('status', 'published')
      .maybeSingle();

    if (error) {
      console.error('Error fetching active workflow:', error);
      return null;
    }
    cachedWorkflow = data as any;
    cacheExpiry = Date.now() + 60_000;
    return cachedWorkflow;
  } catch (err) {
    console.error('Exception fetching active workflow:', err);
    return null;
  }
}

export async function validateTransition(params: {
  workflowId?: string | null;
  currentNodeId: string | null;
  userRole: string;
  formData: Record<string, string>;
  transitionLabel: string;
}): Promise<WorkflowTransitionResult> {
  const workflow = await getActiveWorkflow();
  if (!workflow || !params.currentNodeId) {
    // Modo legacy: permitir todas las transiciones (la logica hardcodeada existente aplica)
    return { allowed: true };
  }

  const transition = workflow.workflow_transitions?.find(
    (t: any) => t.source_node_id === params.currentNodeId && (t.label === params.transitionLabel || t.label?.toLowerCase() === params.transitionLabel?.toLowerCase())
  );
  if (!transition) {
    return { allowed: false, reason: `Transicion '${params.transitionLabel}' no definida desde el nodo actual en el flujo activo` };
  }

  const nodeRole = workflow.workflow_node_roles?.find(
    (r: any) => r.node_id === params.currentNodeId && r.role_name?.toLowerCase() === params.userRole?.toLowerCase()
  );

  // Permitir acciones de guardado estandar siempre si tiene permiso de edicion
  if (params.transitionLabel === 'Guardar' || params.transitionLabel === 'Borrador') {
    if (nodeRole && !nodeRole.can_edit) {
      return { allowed: false, reason: `El rol '${params.userRole}' no tiene permiso de edicion en este nodo` };
    }
    return { allowed: true, next_node_id: params.currentNodeId };
  }

  if (nodeRole && !nodeRole.can_approve && !nodeRole.can_reject) {
    return { allowed: false, reason: `El rol '${params.userRole}' no tiene permisos para realizar '${params.transitionLabel}' en este nodo` };
  }

  if (transition.condition_type === 'field_required') {
    const required: string[] = Array.isArray(nodeRole?.required_fields) ? nodeRole.required_fields : [];
    const missing = required.filter(f => !params.formData[f]?.trim());
    if (missing.length > 0) {
      return { allowed: false, reason: 'Faltan campos obligatorios para avanzar', missing_fields: missing };
    }
  }

  if (transition.condition_type === 'vobo_check') {
    if (params.formData._vobo_status && params.formData._vobo_status !== 'correcto') {
      return { allowed: false, reason: 'El VoBo VP debe estar validado como correcto' };
    }
  }

  const targetNode = workflow.graph_json?.nodes?.find((n: any) => n.id === transition.target_node_id);
  return {
    allowed: true,
    next_node_id: transition.target_node_id,
    next_node_label: targetNode?.data?.label || transition.target_node_id
  };
}

export function invalidateWorkflowCache() {
  cachedWorkflow = null;
  cacheExpiry = 0;
}
