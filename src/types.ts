export type Role = 'Solicitante' | 'Aprobador' | 'Administrador';

export type Status = 
  | 'Borrador' 
  | 'Pendiente de aprobación' 
  | 'Observada' 
  | 'Desestimada' 
  | 'En demanda';

export type FieldType = 'text' | 'date' | 'select' | 'file';

export interface FieldDefinition {
  id: string;
  label: string;
  key: string;
  field_type: FieldType;
  options: any;
  is_visible: boolean;
  is_required: boolean;
  sort_order: number;
  section?: 'form' | 'ai';
  depends_on?: string;
  options_map?: Record<string, string[]>;
  ai_instructions?: string;
  allow_multiple?: boolean;
  help_text?: string;
  requires_confirmation?: boolean;
  created_at?: string;
}

export interface Initiative {
  id: string;
  created_at: string;
  status: Status;
  form_data: Record<string, string>;
  chat_history: ChatMessage[];
  summary?: AI_Summary;
  rejection_reason?: string;
  user_id?: string;
  confirmed_fields?: Record<string, boolean>;
  unstructured_text?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AI_Summary = Record<string, any>;

// ─── Workflow Engine Types ──────────────────────────────────────────────────
export type WorkflowNodeType = 'state' | 'gateway' | 'ai_agent' | 'ai_text' | 'human_task' | 'start' | 'end';

export interface WorkflowNodeRole {
  role_name: string;
  can_edit: boolean;
  can_approve: boolean;
  can_reject: boolean;
  required_fields?: string[];
}

export interface WorkflowNodeData {
  label: string;
  nodeType: WorkflowNodeType;
  description?: string;
  roles?: WorkflowNodeRole[];
  requiredFields?: string[];
  aiConfig?: { promptTemplate?: string; outputFields?: string[] };
  [key: string]: unknown;
}

export interface WorkflowTransitionConfig {
  edge_id: string;
  label: string;
  source_node_id: string;
  target_node_id: string;
  condition_type: 'always' | 'field_required' | 'vobo_check' | 'role_only';
  condition_config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  graph_json: { nodes: any[]; edges: any[] };
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  workflow_node_roles?: any[];
  workflow_transitions?: any[];
}

export interface WorkflowTransitionResult {
  allowed: boolean;
  reason?: string;
  missing_fields?: string[];
  next_node_id?: string;
  next_node_label?: string;
}
