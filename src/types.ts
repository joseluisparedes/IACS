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
  ask_in_initial_form?: boolean;
  fileOptions?: StageFileOptions;
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

export interface GatewayBranchRule {
  edgeId?: string;
  targetNodeId?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
  label?: string;
  isDefault?: boolean;
}

export interface GatewayConfig {
  variable: string;
  variableLabel?: string;
  dataType?: 'boolean' | 'string' | 'number';
  rules?: GatewayBranchRule[];
}

export interface WorkflowNodeData {
  label: string;
  nodeType: WorkflowNodeType;
  stateSubtype?: 'standard' | 'observada' | 'demanda' | 'desestimada';
  dispatchMode?: 'general_inbox' | 'select_person';
  targetAssigneeRole?: string;
  description?: string;
  roles?: WorkflowNodeRole[];
  requiredFields?: string[];
  form_id?: string;
  consent_id?: string;
  document_template_id?: string;
  action_label?: string;
  aiConfig?: { promptTemplate?: string; outputFields?: string[] };
  requireObservationComment?: boolean;
  allowObservationFiles?: boolean;
  observationCategories?: string[];
  observationFileOptions?: {
    allowMultiple?: boolean;
    maxFiles?: number;
    fileTypes?: {
      pdf?: { enabled: boolean; maxMb: number };
      docx?: { enabled: boolean; maxMb: number };
      xlsx?: { enabled: boolean; maxMb: number };
      image?: { enabled: boolean; maxMb: number };
      txt?: { enabled: boolean; maxMb: number };
    };
  };
  showNextApprovers?: boolean;
  includeAdminInApprovers?: boolean;
  nextApproversSource?: 'all_vps' | 'initiative_vp' | 'specific_vps' | 'target_stage_roles';
  nextApproversTitle?: string;
  nextApproversSelectedVps?: string[];
  allowManualStateMove?: boolean;
  manualStateMoveRole?: string;
  manualStateMoveUserId?: string;
  manualStateMoveUserEmail?: string;
  manualStateMoveUserName?: string;
  [key: string]: unknown;
}

export interface WorkflowTransitionConfig {
  edge_id: string;
  label: string;
  source_node_id: string;
  target_node_id: string;
  condition_type: 'always' | 'field_required' | 'vobo_check' | 'role_only';
  condition_config: Record<string, unknown>;
  allowed_roles?: string[];
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

// ─── Stage Forms & Consents (Cadena de Custodia & Dictámenes) ───────────────
export type StageFormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'file' | 'role_user';

export interface StageFileConfig {
  enabled: boolean;
  maxMb: number;
}

export interface StageFileOptions {
  allowMultiple?: boolean;
  maxFiles?: number;
  fileTypes?: {
    pdf?: StageFileConfig;
    docx?: StageFileConfig;
    xlsx?: StageFileConfig;
    txt?: StageFileConfig;
    image?: StageFileConfig;
  };
}

export interface StageFormField {
  id: string;
  key: string;
  label: string;
  type: StageFormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
  fileOptions?: StageFileOptions;
  ask_in_initial_form?: boolean;
  target_role?: string;
  filter_by_scope?: boolean;
}

export interface StageForm {
  id: string;
  code: string;
  name: string;
  description?: string;
  fields: StageFormField[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StageConsent {
  id: string;
  code: string;
  title: string;
  statement: string;
  version: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InitiativeStageRecord {
  id: string;
  initiative_id: string;
  node_id: string;
  stage_name: string;
  form_id?: string | null;
  consent_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  form_data: Record<string, any>;
  consent_accepted: boolean;
  consent_text_snapshot?: string | null;
  action_taken: string;
  submitted_at: string;
}

export interface DocumentTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  template_html: string;
  margins: { top: number; right: number; bottom: number; left: number };
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}
