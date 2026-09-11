import React from 'react';
import { 
  Layers, 
  GitFork, 
  BrainCircuit, 
  FileText, 
  PlayCircle, 
  CheckCircle2, 
  AlertTriangle,
  Archive,
  Plus,
  GripVertical,
  Sparkles
} from 'lucide-react';
import { useWorkflowStore } from '../../lib/workflowStore';
import type { WorkflowNodeType, WorkflowNodeRole } from '../../types';

interface WorkflowToolbarProps {
  onAutoLayout?: () => void;
}

export interface NodeTypeOption {
  id: string;
  type: WorkflowNodeType;
  stateSubtype?: 'standard' | 'observada' | 'demanda' | 'desestimada';
  label: string;
  defaultLabel: string;
  desc: string;
  defaultDesc?: string;
  icon: React.ReactNode;
  borderClass: string;
  bgClass: string;
  defaultRoles?: WorkflowNodeRole[];
}

interface ComponentSection {
  title: string;
  items: NodeTypeOption[];
}

const SECTIONS: ComponentSection[] = [
  {
    title: 'Estados del Flujo (Gobernanza)',
    items: [
      {
        id: 'state_standard',
        type: 'state',
        stateSubtype: 'standard',
        label: 'Estado Estándar',
        defaultLabel: 'Nuevo Estado',
        desc: 'Etapa intermedia configurable',
        defaultDesc: 'Etapa intermedia de gestión con roles y permisos.',
        icon: <Layers className="w-4 h-4 text-[#4F5AF5]" />,
        borderClass: 'border-slate-200 hover:border-[#4F5AF5]',
        bgClass: 'bg-slate-50/70',
      },
      {
        id: 'state_observada',
        type: 'state',
        stateSubtype: 'observada',
        label: 'Estado: Observada',
        defaultLabel: 'Observada',
        desc: 'Reproceso y corrección por Key User',
        defaultDesc: 'BP TI solicitó correcciones. Key user puede editar y reenviar.',
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        borderClass: 'border-amber-200 hover:border-amber-400',
        bgClass: 'bg-amber-50/60',
        defaultRoles: [
          { role_name: 'registrador', can_edit: true, can_approve: false, can_reject: false, required_fields: [] },
          { role_name: 'bp_ti', can_edit: true, can_approve: true, can_reject: false, required_fields: [] },
        ],
      },
      {
        id: 'state_demanda',
        type: 'state',
        stateSubtype: 'demanda',
        label: 'Estado: En demanda',
        defaultLabel: 'En demanda',
        desc: 'Aprobación final y pase al backlog TI',
        defaultDesc: 'Aprobada. Solo lectura para todos. Registrada en backlog de TI.',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        borderClass: 'border-emerald-200 hover:border-emerald-400',
        bgClass: 'bg-emerald-50/60',
        defaultRoles: [
          { role_name: 'invitado', can_edit: false, can_approve: false, can_reject: false, required_fields: [] },
        ],
      },
      {
        id: 'state_desestimada',
        type: 'state',
        stateSubtype: 'desestimada',
        label: 'Estado: Desestimada',
        defaultLabel: 'Desestimada',
        desc: 'Archivo lógico y rescates',
        defaultDesc: 'Archivada lógicamente. Rescatable por BP TI o Admin.',
        icon: <Archive className="w-4 h-4 text-red-600" />,
        borderClass: 'border-red-200 hover:border-red-400',
        bgClass: 'bg-red-50/60',
        defaultRoles: [
          { role_name: 'bp_ti', can_edit: false, can_approve: true, can_reject: false, required_fields: [] },
          { role_name: 'admin', can_edit: false, can_approve: true, can_reject: false, required_fields: [] },
        ],
      },
    ],
  },
  {
    title: 'Control y Decisiones',
    items: [
      {
        id: 'gateway',
        type: 'gateway',
        label: 'Compuerta',
        defaultLabel: '¿Condición?',
        desc: 'Bifurcación condicional',
        icon: <GitFork className="w-4 h-4 text-amber-600" />,
        borderClass: 'border-amber-200 hover:border-amber-400',
        bgClass: 'bg-amber-50/60',
      },
      {
        id: 'start',
        type: 'start',
        label: 'Inicio',
        defaultLabel: 'Inicio',
        desc: 'Punto de entrada del flujo',
        icon: <PlayCircle className="w-4 h-4 text-emerald-600" />,
        borderClass: 'border-emerald-200 hover:border-emerald-400',
        bgClass: 'bg-emerald-50/60',
      },
      {
        id: 'end',
        type: 'end',
        label: 'Fin',
        defaultLabel: 'Fin',
        desc: 'Conclusión del flujo',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        borderClass: 'border-emerald-200 hover:border-emerald-400',
        bgClass: 'bg-emerald-50/60',
      },
    ],
  },
  {
    title: 'Automatización e IA (TEO)',
    items: [
      {
        id: 'ai_agent',
        type: 'ai_agent',
        label: 'Agente IA (Chat)',
        defaultLabel: 'Asistente IA (Chat)',
        desc: 'Asistente interactivo guiado',
        icon: <BrainCircuit className="w-4 h-4 text-violet-600" />,
        borderClass: 'border-violet-200 hover:border-violet-400',
        bgClass: 'bg-violet-50/60',
      },
      {
        id: 'ai_text',
        type: 'ai_text',
        label: 'Parser IA (Texto)',
        defaultLabel: 'Parser IA (Texto)',
        desc: 'Extracción de texto no estructurado',
        icon: <FileText className="w-4 h-4 text-purple-600" />,
        borderClass: 'border-purple-200 hover:border-purple-400',
        bgClass: 'bg-purple-50/60',
      },
    ],
  },
];

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({ onAutoLayout }) => {
  const addNode = useWorkflowStore((state) => state.addNode);

  const handleDragStart = (e: React.DragEvent, item: NodeTypeOption) => {
    e.dataTransfer.setData('application/reactflow-type', item.type);
    e.dataTransfer.setData(
      'application/reactflow-payload',
      JSON.stringify({
        label: item.defaultLabel || item.label,
        description: item.defaultDesc || item.desc,
        stateSubtype: item.stateSubtype,
        roles: item.defaultRoles || [],
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuickAdd = (item: NodeTypeOption) => {
    const randomOffset = () => Math.floor(Math.random() * 60) - 30;
    addNode(
      item.type,
      { x: 350 + randomOffset(), y: 200 + randomOffset() },
      item.defaultLabel || item.label,
      item.defaultDesc || item.desc,
      item.stateSubtype,
      item.defaultRoles
    );
  };

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      {onAutoLayout && (
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onAutoLayout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-[#4F5AF5] border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Reorganiza automáticamente todas las cajas y flechas sin sobreposiciones"
          >
            <Sparkles className="w-4 h-4 text-[#4F5AF5]" />
            <span>Organizar Diagrama</span>
          </button>
        </div>
      )}

      <div className="p-3 border-b border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Componentes</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">Arrastra o haz clic para añadir al lienzo</p>
      </div>

      <div className="p-2 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
        {SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              {section.title}
            </h4>
            <div className="space-y-1.5">
              {section.items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => handleQuickAdd(item)}
                  className={`group p-2 rounded-xl border text-left cursor-grab active:cursor-grabbing transition-all duration-150 ${item.bgClass} ${item.borderClass} hover:shadow-sm`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
                      <div className="shrink-0">{item.icon}</div>
                      <span className="text-xs font-semibold text-slate-800 truncate">{item.label}</span>
                    </div>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded-lg transition-opacity shrink-0 ml-1"
                      title="Añadir al canvas"
                    >
                      <Plus className="w-3 h-3 text-slate-600" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 pl-5 leading-tight line-clamp-2">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
