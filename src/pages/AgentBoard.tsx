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
  MoreHorizontal,
  Gauge
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  progress?: number;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  trafficLight?: 'green' | 'yellow' | 'red';
  tasks: Task[];
}

const AGENT_TEMPLATES: Omit<Agent, 'tasks'>[] = [
  { id: '1', name: 'PO Men', role: 'Product Owner', icon: Compass, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { id: '2', name: 'Seguridad TI', role: 'Seguridad', icon: ShieldCheck, color: 'text-red-600', bg: 'bg-red-100' },
  { id: '3', name: 'Arqui', role: 'Arquitecto Frontend', icon: LayoutTemplate, color: 'text-pink-600', bg: 'bg-pink-100' },
  { id: '4', name: 'Programador', role: 'Ingeniero Backend', icon: ServerCog, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { id: '5', name: 'QA', role: 'Tester', icon: Bug, color: 'text-amber-600', bg: 'bg-amber-100' },
  { id: '6', name: 'Documentador', role: 'Investigador', icon: BookOpenText, color: 'text-sky-600', bg: 'bg-sky-100' },
  { id: '7', name: 'Líder técnico', role: 'Orquestador', icon: TerminalSquare, color: 'text-violet-600', bg: 'bg-violet-100' },
  { id: '8', name: 'Auditor IA', role: 'Regulador de Tokens', icon: Gauge, color: 'text-orange-600', bg: 'bg-orange-100', trafficLight: 'green' }
];

export default function AgentBoard() {
  const [agents, setAgents] = useState<Agent[]>(AGENT_TEMPLATES.map(a => ({ ...a, tasks: [] })));
  const [loading, setLoading] = useState(true);

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
            progress: log.progress
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-3">
            <Activity className="w-7 h-7 text-[#4F5AF5]" />
            Tablero de Agentes Autónomos
          </h1>
          <p className="text-[#64748B] mt-1 text-sm">
            Monitoreo en tiempo real del progreso e historial de tareas del escuadrón técnico. Los datos se leen directamente desde la base de datos permanente.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4F5AF5] border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col">
              {/* Agent Header */}
              <div className={`p-5 border-b border-[#E2E8F0] flex items-center justify-between ${agent.bg} bg-opacity-30`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${agent.bg} flex items-center justify-center`}>
                    <agent.icon className={`w-5 h-5 ${agent.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
                      {agent.name}
                      {agent.trafficLight && (
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${agent.trafficLight === 'green' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${agent.trafficLight === 'green' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        </span>
                      )}
                    </h3>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${agent.color}`}>{agent.role}</p>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="p-4 flex-1 bg-[#F8FAFC]">
                {agent.tasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                      <Clock className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Sin tareas asignadas</p>
                    <p className="text-xs text-slate-400 mt-1">En espera de requerimientos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agent.tasks.map((task) => (
                      <div key={task.id} className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
                        <div className="flex items-start gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : task.status === 'in_progress' ? (
                            <div className="w-5 h-5 rounded-full border-2 border-[#4F5AF5] border-t-transparent animate-spin shrink-0 mt-0.5" />
                          ) : (
                            <MoreHorizontal className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1E293B] leading-tight mb-1">{task.title}</p>
                            
                            {task.status === 'in_progress' && task.progress !== undefined && (
                              <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[10px] font-semibold text-[#64748B]">
                                  <span>Progreso</span>
                                  <span>{task.progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-[#4F5AF5] rounded-full transition-all duration-500"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
