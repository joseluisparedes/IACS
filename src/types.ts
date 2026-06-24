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
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AI_Summary = Record<string, any>;
