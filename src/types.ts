export type Role = 'Solicitante' | 'Aprobador' | 'Administrador';

export type Status = 
  | 'Borrador' 
  | 'En Elaboración' 
  | 'Pendiente de Aprobación' 
  | 'Observada' 
  | 'Aprobada' 
  | 'Rechazada' 
  | 'En Ejecución' 
  | 'Cerrada';

export interface Initiative {
  id: string;
  createdAt: string;
  status: Status;
  area: string;
  type: string;
  priority: 'Alta' | 'Media' | 'Baja';
  impact: string;
  country: string;
  chatHistory: ChatMessage[];
  summary?: AI_Summary;
  rejectionReason?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AI_Summary {
  resumenEjecutivo: string;
  problemaActual: string;
  solucionEsperada: string;
  beneficios: string[];
  sistemasImpactados: string[];
  complejidad: 'Baja' | 'Media' | 'Alta';
  riesgo: 'Bajo' | 'Medio' | 'Alto';
  prioridadRecomendada: 'Baja' | 'Media' | 'Alta';
}
