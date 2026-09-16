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
  targetNodeId?: string | null;
  gatewayNodeId?: string | null;
  userRole: string;
  formData: Record<string, string>;
  transitionLabel: string;
  isFreeJump?: boolean;
}): Promise<WorkflowTransitionResult> {
  const workflow = await getActiveWorkflow();
  if (!workflow || !params.currentNodeId) {
    // Modo legacy: permitir todas las transiciones (la logica hardcodeada existente aplica)
    return { allowed: true };
  }

  const rawRolesList = String(params.userRole || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const roleAliases: Record<string, string[]> = {
    vicepresidente: ['vicepresidente', 'vicepresidente_del_negocio', 'vp'],
    vicepresidente_del_negocio: ['vicepresidente', 'vicepresidente_del_negocio', 'vp'],
    gestor_demanda: ['gestor_demanda', 'gestor_de_la_demanda'],
    gestor_de_la_demanda: ['gestor_demanda', 'gestor_de_la_demanda'],
    lider_dominio: ['lider_dominio', 'lider_de_dominio'],
    lider_de_dominio: ['lider_dominio', 'lider_de_dominio'],
    business_owner: ['business_owner', 'bo'],
    registrador: ['registrador', 'key_user'],
    admin: ['admin', 'administrador', 'administrador_general'],
  };

  const userRolesList = Array.from(new Set(
    rawRolesList.flatMap(r => roleAliases[r] || [r])
  ));

  const hasAdmin = userRolesList.includes('admin') || userRolesList.includes('administrador');

  // Buscar coincidencia entre los roles del usuario y los roles autorizados en este nodo
  const nodeRole = workflow.workflow_node_roles?.find(
    (r: any) =>
      r.node_id === params.currentNodeId &&
      userRolesList.includes(r.role_name?.toLowerCase())
  );

  // 1. Acciones de guardado estandar (sin cambio de estado de etapa)
  if (params.transitionLabel === 'Guardar' || params.transitionLabel === 'Borrador' || (params.targetNodeId && params.targetNodeId === params.currentNodeId)) {
    if (!hasAdmin && nodeRole && !nodeRole.can_edit) {
      return { allowed: false, reason: `Ninguno de los roles asignados (${userRolesList.join(', ')}) cuenta con permiso de edición en este nodo` };
    }
    return { allowed: true, next_node_id: params.currentNodeId };
  }

  // 1b. Salto Libre / Reubicación Manual directa (Mover estado)
  if (params.transitionLabel === 'Salto Libre' || params.isFreeJump) {
    const currentNode = workflow.graph_json?.nodes?.find((n: any) => n.id === params.currentNodeId);
    if (currentNode?.data?.allowManualStateMove) {
      const allowedRole = (currentNode.data.manualStateMoveRole as string)?.trim().toLowerCase();
      if (allowedRole && !userRolesList.includes(allowedRole) && !hasAdmin) {
        return {
          allowed: false,
          reason: `Tu rol actual (${userRolesList.join(', ')}) no está autorizado para mover manualmente la iniciativa desde este estado (requiere rol: ${allowedRole})`
        };
      }
      return { allowed: true, next_node_id: params.targetNodeId || params.currentNodeId };
    }
    if (hasAdmin) {
      return { allowed: true, next_node_id: params.targetNodeId || params.currentNodeId };
    }
    return {
      allowed: false,
      reason: `El salto manual de estado ('Mover estado') no está habilitado para este estado en el flujo de trabajo.`
    };
  }

  // 2. Buscar transición directa por target_node_id O por label en workflow_transitions y en graph_json.edges
  let transition = workflow.workflow_transitions?.find(
    (t: any) => t.source_node_id === params.currentNodeId && (
      (params.targetNodeId && (t.target_node_id === params.targetNodeId || t.target === params.targetNodeId)) ||
      (params.transitionLabel && (t.label === params.transitionLabel || t.label?.toLowerCase() === params.transitionLabel?.toLowerCase()))
    )
  ) || workflow.graph_json?.edges?.find(
    (e: any) => e.source === params.currentNodeId && (
      (params.targetNodeId && e.target === params.targetNodeId) ||
      (params.transitionLabel && (e.label === params.transitionLabel || e.label?.toLowerCase() === params.transitionLabel?.toLowerCase()))
    )
  );

  let intermediateGatewayId: string | null = params.gatewayNodeId || null;

  // 2b. Si no hay transición directa, buscar si el nodo actual conecta a una compuerta (Gateway)
  if (!transition) {
    const outgoingFromCurrent = (workflow.graph_json?.edges || []).filter(
      (e: any) => e.source === params.currentNodeId
    );

    for (const outEdge of outgoingFromCurrent) {
      const gwNode = workflow.graph_json?.nodes?.find((n: any) => n.id === outEdge.target);
      const isGateway = gwNode?.data?.nodeType === 'gateway' || gwNode?.type === 'gateway' || String(outEdge.target).startsWith('gw_');

      if (isGateway) {
        const gwId = outEdge.target;
        const gwEdges = (workflow.graph_json?.edges || []).filter((ge: any) => ge.source === gwId);

        // ¿El targetNodeId es destino de la compuerta?
        const matchesTarget = Boolean(params.targetNodeId && gwEdges.some((ge: any) => ge.target === params.targetNodeId));

        // ¿El transitionLabel coincide con alguna rama o nodo destino de la compuerta?
        const matchesLabel = Boolean(params.transitionLabel && gwEdges.some((ge: any) => {
          const lbl = params.transitionLabel.trim().toLowerCase();
          if (ge.label?.trim().toLowerCase() === lbl) return true;
          if (ge.data?.action_label?.trim().toLowerCase() === lbl) return true;
          const targetNode = workflow.graph_json?.nodes?.find((n: any) => n.id === ge.target);
          if (targetNode?.data?.label?.trim().toLowerCase() === lbl) return true;
          if (targetNode?.data?.action_label?.trim().toLowerCase() === lbl) return true;
          return false;
        }));

        // ¿El transitionLabel coincide con la flecha que va a la compuerta (ej. "Concluye Ventana")?
        const matchesOutEdge = Boolean(params.transitionLabel && (
          outEdge.label?.trim().toLowerCase() === params.transitionLabel.trim().toLowerCase() ||
          outEdge.data?.action_label?.trim().toLowerCase() === params.transitionLabel.trim().toLowerCase()
        ));

        const isExplicitGw = Boolean(params.gatewayNodeId && params.gatewayNodeId === gwId);
        const isSingleGatewayExit = outgoingFromCurrent.length === 1;

        if (matchesTarget || matchesLabel || matchesOutEdge || isExplicitGw || isSingleGatewayExit) {
          transition = outEdge;
          intermediateGatewayId = gwId;
          break;
        }
      }
    }
  }

  if (!transition) {
    return { allowed: false, reason: `Transición '${params.transitionLabel}' no definida desde el nodo actual en el flujo activo` };
  }

  const targetNodeId = transition.target_node_id || transition.target;
  const isBorradorNode = params.currentNodeId === 'borrador';

  // Validación de roles en la flecha / transición (Edge-centric RBAC)
  const allowedRoles: string[] = transition.allowed_roles || (transition.data as any)?.allowed_roles || [];
  if (allowedRoles.length > 0) {
    const hasRoleForEdge = allowedRoles.some((r: string) => userRolesList.includes(r.toLowerCase()));
    if (!hasRoleForEdge) {
      return {
        allowed: false,
        reason: `Tu rol actual no está autorizado para ejecutar la transición '${params.transitionLabel || transition.label || 'Avanzar'}' (requiere rol: ${allowedRoles.join(', ')})`
      };
    }
  }

  if (!hasAdmin && !isBorradorNode && nodeRole && !nodeRole.can_approve && !nodeRole.can_reject) {
    return { allowed: false, reason: `Ninguno de los roles asignados (${userRolesList.join(', ')}) cuenta con permisos para '${params.transitionLabel}' en este nodo` };
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

  let finalTargetNodeId = (intermediateGatewayId && params.targetNodeId) ? params.targetNodeId : targetNodeId;
  let finalTargetNode = workflow.graph_json?.nodes?.find((n: any) => n.id === finalTargetNodeId);

  // Auto-enrutar compuertas dinámicas si el destino es un Gateway o si venimos a través de una compuerta intermedia
  const isGatewayDestination = finalTargetNode?.data?.nodeType === 'gateway' || finalTargetNodeId.startsWith('gw_') || intermediateGatewayId;

  if (isGatewayDestination) {
    const gwNodeId = intermediateGatewayId || (finalTargetNodeId.startsWith('gw_') ? finalTargetNodeId : null) || 'gw_presupuesto';
    const gwNode = workflow.graph_json?.nodes?.find((n: any) => n.id === gwNodeId) || finalTargetNode;
    const gwConfig = gwNode?.data?.gatewayConfig as any;
    const variable = gwConfig?.variable || (gwNodeId === 'gw_presupuesto' ? 'requiere_presupuesto' : '');
    const rawVal = params.formData ? String(params.formData[variable] ?? '').trim() : '';

    const gwEdges = workflow.graph_json?.edges?.filter((e: any) => e.source === gwNodeId) || [];
    const rules = gwConfig?.rules || [];

    let matchedEdge: any = null;

    for (const rule of rules) {
      if (rule.isDefault) continue;
      const ruleVal = String(rule.value || '').trim();
      const op = rule.operator || 'equals';

      let isMatch = false;
      if (op === 'equals') {
        isMatch = rawVal.toLowerCase() === ruleVal.toLowerCase();
        if (!isMatch && (/^(sí|si|true)$/i.test(rawVal) && /^(sí|si|true)$/i.test(ruleVal))) isMatch = true;
        if (!isMatch && (/^(no|false)$/i.test(rawVal) && /^(no|false)$/i.test(ruleVal))) isMatch = true;
      } else if (op === 'not_equals') {
        isMatch = rawVal.toLowerCase() !== ruleVal.toLowerCase();
      } else if (op === 'contains') {
        isMatch = rawVal.toLowerCase().includes(ruleVal.toLowerCase());
      } else if (op === 'greater_than') {
        isMatch = parseFloat(rawVal) > parseFloat(ruleVal);
      } else if (op === 'less_than') {
        isMatch = parseFloat(rawVal) < parseFloat(ruleVal);
      }

      if (isMatch) {
        matchedEdge = gwEdges.find((e: any) => e.id === rule.edgeId || e.target === rule.targetNodeId);
        if (matchedEdge) break;
      }
    }

    if (!matchedEdge) {
      const defaultRule = rules.find((r: any) => r.isDefault);
      if (defaultRule) {
        matchedEdge = gwEdges.find((e: any) => e.id === defaultRule.edgeId || e.target === defaultRule.targetNodeId);
      }
    }

    if (!matchedEdge && gwEdges.length > 0) {
      const isYes = /^(sí|si|true)$/i.test(rawVal);
      matchedEdge = isYes
        ? gwEdges.find((e: any) => e.target === 'est_con_presupuesto' || /s[ií]/i.test(e.label || ''))
        : gwEdges.find((e: any) => e.target === 'est_sin_presupuesto' || /no/i.test(e.label || ''));
      if (!matchedEdge) matchedEdge = gwEdges[0];
    }

    if (matchedEdge) {
      finalTargetNodeId = matchedEdge.target;
      finalTargetNode = workflow.graph_json?.nodes?.find((n: any) => n.id === finalTargetNodeId) || finalTargetNode;
    } else if (params.targetNodeId && gwEdges.some((e: any) => e.target === params.targetNodeId)) {
      finalTargetNodeId = params.targetNodeId;
      finalTargetNode = workflow.graph_json?.nodes?.find((n: any) => n.id === finalTargetNodeId) || finalTargetNode;
    }
  }

  return {
    allowed: true,
    next_node_id: finalTargetNodeId,
    next_node_label: finalTargetNode?.data?.label || finalTargetNodeId
  };
}

export function invalidateWorkflowCache() {
  cachedWorkflow = null;
  cacheExpiry = 0;
}
