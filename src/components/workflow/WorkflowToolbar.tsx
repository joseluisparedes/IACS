import React from 'react';
import { 
  Layers, 
  GitFork, 
  BrainCircuit, 
  FileText, 
  UserCheck, 
  PlayCircle, 
  CheckCircle2, 
  Plus,
  GripVertical
} from 'lucide-react';
import { useWorkflowStore } from '../../lib/workflowStore';
import type { WorkflowNodeType } from '../../types';

interface NodeTypeOption {
  type: WorkflowNodeType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  borderClass: string;
  bgClass: string;
}

const NODE_OPTIONS: NodeTypeOption[] = [
  {
    type: 'state',
    label: 'Estado',
    desc: 'Etapa del proceso con permisos',
    icon: <Layers className="w-4 h-4 text-[#4F5AF5]" />,
    borderClass: 'border-slate-200 hover:border-[#4F5AF5]',
    bgClass: 'bg-slate-50/70',
  },
  {
    type: 'gateway',
    label: 'Compuerta',
    desc: 'Bifurcación condicional',
    icon: <GitFork className="w-4 h-4 text-amber-600" />,
    borderClass: 'border-amber-200 hover:border-amber-400',
    bgClass: 'bg-amber-50/60',
  },
  {
    type: 'ai_agent',
    label: 'Agente IA (Chat)',
    desc: 'Asistente interactivo guiado',
    icon: <BrainCircuit className="w-4 h-4 text-violet-600" />,
    borderClass: 'border-violet-200 hover:border-violet-400',
    bgClass: 'bg-violet-50/60',
  },
  {
    type: 'ai_text',
    label: 'Parser IA (Texto)',
    desc: 'Extracción de texto no estructurado',
    icon: <FileText className="w-4 h-4 text-purple-600" />,
    borderClass: 'border-purple-200 hover:border-purple-400',
    bgClass: 'bg-purple-50/60',
  },
  {
    type: 'human_task',
    label: 'Aprobación Humana',
    desc: 'Revisión y VoBo por rol',
    icon: <UserCheck className="w-4 h-4 text-blue-600" />,
    borderClass: 'border-blue-200 hover:border-blue-400',
    bgClass: 'bg-blue-50/60',
  },
  {
    type: 'start',
    label: 'Inicio',
    desc: 'Punto de entrada del flujo',
    icon: <PlayCircle className="w-4 h-4 text-emerald-600" />,
    borderClass: 'border-emerald-200 hover:border-emerald-400',
    bgClass: 'bg-emerald-50/60',
  },
  {
    type: 'end',
    label: 'Fin',
    desc: 'Conclusión del flujo',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    borderClass: 'border-emerald-200 hover:border-emerald-400',
    bgClass: 'bg-emerald-50/60',
  },
];

export const WorkflowToolbar: React.FC = () => {
  const addNode = useWorkflowStore((state) => state.addNode);

  const handleDragStart = (e: React.DragEvent, type: WorkflowNodeType) => {
    e.dataTransfer.setData('application/reactflow-type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuickAdd = (type: WorkflowNodeType) => {
    const randomOffset = () => Math.floor(Math.random() * 60) - 30;
    addNode(type, { x: 350 + randomOffset(), y: 200 + randomOffset() });
  };

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      <div className="p-3 border-b border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Componentes</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">Arrastra o haz clic para añadir</p>
      </div>

      <div className="p-2 space-y-2 overflow-y-auto flex-1">
        {NODE_OPTIONS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            onClick={() => handleQuickAdd(item.type)}
            className={`group p-2 rounded-xl border text-left cursor-grab active:cursor-grabbing transition-all duration-150 ${item.bgClass} ${item.borderClass} hover:shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />
                {item.icon}
                <span className="text-xs font-semibold text-slate-800">{item.label}</span>
              </div>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded-lg transition-opacity"
                title="Añadir al canvas"
              >
                <Plus className="w-3 h-3 text-slate-600" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 pl-5 leading-tight">{item.desc}</p>
          </div>
        ))}
      </div>
    </aside>
  );
};
