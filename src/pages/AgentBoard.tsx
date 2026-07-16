import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  ShieldCheck, 
  LayoutTemplate, 
  ServerCog, 
  Bug, 
  BookOpenText, 
  TerminalSquare,
  Activity,
  CheckCircle2,
  Clock,
  Gauge,
  History,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  progress?: number;
  created_at: string;
  details?: any;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  trafficLight?: 'green' | 'yellow' | 'red';
  tasks: Task[];
}

const AGENT_TEMPLATES: Omit<Agent, 'tasks'>[] = [
  { id: '1', name: 'PO Men', role: 'Product Owner', description: 'Define requerimientos y prioriza tareas', icon: Compass, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { id: '2', name: 'Seguridad TI', role: 'Seguridad', description: 'Analiza vulnerabilidades y aplica políticas', icon: ShieldCheck, color: 'text-red-600', bg: 'bg-red-100' },
  { id: '3', name: 'Arqui', role: 'Arquitecto Frontend', description: 'Diseña la estructura y UI/UX', icon: LayoutTemplate, color: 'text-pink-600', bg: 'bg-pink-100' },
  { id: '4', name: 'Programador', role: 'Ingeniero Backend', description: 'Implementa lógica y bases de datos', icon: ServerCog, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { id: '5', name: 'QA', role: 'Tester', description: 'Verifica calidad y busca bugs', icon: Bug, color: 'text-amber-600', bg: 'bg-amber-100' },
  { id: '6', name: 'Documentador', role: 'Investigador', description: 'Redacta guías y manuales técnicos', icon: BookOpenText, color: 'text-sky-600', bg: 'bg-sky-100' },
  { id: '7', name: 'Líder técnico', role: 'Orquestador', description: 'Supervisa el flujo y toma decisiones', icon: TerminalSquare, color: 'text-violet-600', bg: 'bg-violet-100' },
  { id: '8', name: 'Auditor IA', role: 'Regulador de Tokens', description: 'Monitorea el uso de recursos IA', icon: Gauge, color: 'text-orange-600', bg: 'bg-orange-100', trafficLight: 'green' }
];

export default function AgentBoard() {
  const [agents, setAgents] = useState<Agent[]>(AGENT_TEMPLATES.map(a => ({ ...a, tasks: [] })));
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchLogs();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase.channel('agent_logs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_logs' },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('agent_logs')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Agrupar las tareas por el rol del agente
      const newAgents = AGENT_TEMPLATES.map(template => {
        const agentTasks = data
          .filter(log => log.agent_role === template.role)
          .map(log => ({
            id: log.id,
            title: log.task_title,
            status: log.status as 'completed' | 'in_progress' | 'pending',
            progress: log.progress,
            created_at: log.created_at,
            details: log.details
          }));
        
        return {
          ...template,
          tasks: agentTasks
        };
      });

      setAgents(newAgents);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-3">
            <Activity className="w-7 h-7 text-[#4F5AF5]" />
            Tablero de Agentes Autónomos
          </h1>
          <p className="text-[#64748B] mt-2 text-sm max-w-3xl leading-relaxed">
            Monitorea el estado del escuadrón técnico IA en tiempo real. Observa su <strong>actividad actual</strong> y el <strong>historial reciente</strong> de sus ejecuciones.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4F5AF5] border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const inProgressTasks = agent.tasks.filter(t => t.status === 'in_progress');
            const completedTasks = agent.tasks.filter(t => t.status === 'completed').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            // Usamos la última tarea in_progress si existe
            const currentTask = inProgressTasks.length > 0 ? inProgressTasks[inProgressTasks.length - 1] : null;
            const isIdle = !currentTask;

            return (
              <div key={agent.id} className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col transition-all hover:shadow-md">
                {/* Agent Header */}
                <div className={`p-5 border-b border-[#E2E8F0] flex flex-col gap-3 ${agent.bg} bg-opacity-30 relative`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${agent.bg} flex items-center justify-center shadow-sm`}>
                        <agent.icon className={`w-6 h-6 ${agent.color}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1E293B] text-lg flex items-center gap-2">
                          {agent.name}
                          {agent.trafficLight && (
                            <span className="flex h-2.5 w-2.5 relative">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${agent.trafficLight === 'green' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${agent.trafficLight === 'green' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            </span>
                          )}
                        </h3>
                        <p className={`text-xs font-bold uppercase tracking-wider ${agent.color}`}>{agent.role}</p>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-1">
                      {isIdle ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Inactivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          Trabajando
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{agent.description}</p>
                </div>

                {/* Current Activity */}
                <div className="p-5 flex-1 bg-white flex flex-col">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Actividad Actual</h4>
                  {currentTask ? (
                    <div 
                      onClick={() => setSelectedTask(currentTask)}
                      className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-blue-900 leading-tight mb-2">{currentTask.title}</p>
                          <div className="space-y-1.5 mt-3">
                            <div className="flex justify-between text-xs font-medium text-blue-700">
                              <span>Progreso</span>
                              <span>{currentTask.progress || 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-blue-200/50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${currentTask.progress || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 border-dashed p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 py-6">
                      <Clock className="w-6 h-6 text-slate-300" />
                      <span className="text-sm font-medium">Esperando requerimientos...</span>
                    </div>
                  )}

                  {/* History Section */}
                  <div className="mt-6 flex-1 flex flex-col">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Historial Reciente ({completedTasks.length})
                    </h4>
                    
                    {completedTasks.length > 0 ? (
                      <div className="space-y-2 flex-1 overflow-y-auto pr-1" style={{ maxHeight: '160px' }}>
                        {completedTasks.slice(0, 5).map(task => (
                          <div 
                            key={task.id} 
                            onClick={() => setSelectedTask(task)}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity" />
                            <p className="text-sm text-slate-600 leading-tight group-hover:text-slate-900 transition-colors">{task.title}</p>
                          </div>
                        ))}
                        {completedTasks.length > 5 && (
                          <div className="text-center pt-2">
                            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                              +{completedTasks.length - 5} tareas adicionales
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-xs text-slate-400 italic">No hay tareas completadas aún.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalles Técnicos */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">{selectedTask.title}</h3>
                <p className="text-xs text-slate-500 mt-1">Estado: {selectedTask.status === 'in_progress' ? 'En progreso' : 'Completado'} • Creado: {new Date(selectedTask.created_at).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-slate-800 text-slate-300 text-sm font-mono custom-scrollbar">
              {selectedTask.details ? (
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(selectedTask.details, null, 2)}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-32 text-slate-500 italic">
                  No hay detalles técnicos registrados para esta tarea.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
