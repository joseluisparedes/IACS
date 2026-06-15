import { useEffect, useState } from "react";
import { BarChart3, Activity, CheckCircle, Clock, TrendingUp, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, draft: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/initiatives")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const s = { total: data.length, pending: 0, approved: 0, rejected: 0, draft: 0 };
        data.forEach(d => {
          if (d.status === "Pendiente de Aprobación") s.pending++;
          else if (d.status === "Aprobada" || d.status === "En Ejecución") s.approved++;
          else if (d.status === "Rechazada") s.rejected++;
          else if (d.status === "Borrador") s.draft++;
        });
        setStats(s);
        setRecent(data.slice(0, 5));
      })
      .catch(console.error);
  }, []);

  const statCards = [
    { label: "Total Iniciativas", value: stats.total, icon: Activity, color: "text-[#4F5AF5]", bg: "bg-[#EEF2FF]" },
    { label: "Aprobadas", value: stats.approved, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pendientes", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Rechazadas", value: stats.rejected, icon: BarChart3, color: "text-red-600", bg: "bg-red-50" },
  ];

  const STATUS_STYLE: Record<string, string> = {
    "Pendiente de Aprobación": "bg-[#EEF2FF] text-[#4F5AF5]",
    "Aprobada": "bg-emerald-50 text-emerald-700",
    "Rechazada": "bg-red-50 text-red-600",
    "Observada": "bg-amber-50 text-amber-700",
    "Borrador": "bg-[#F1F5F9] text-[#64748B]",
    "En Ejecución": "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#1E293B]">Dashboard Ejecutivo</h2>
        <p className="text-[#64748B] mt-1">Vista general de las iniciativas de negocio.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">{s.label}</p>
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-[#94A3B8]" />
                <span className="text-xs text-[#94A3B8]">Total acumulado</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent initiatives */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1E293B]">Actividad Reciente</h3>
          <Link to="/bandeja" className="flex items-center gap-1 text-xs font-semibold text-[#4F5AF5] hover:text-[#3F49E0] transition-colors">
            Ver todas
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="py-14 text-center">
            <Activity className="w-8 h-8 mx-auto mb-3 text-[#E2E8F0]" />
            <p className="text-sm text-[#94A3B8]">No hay iniciativas registradas aún.</p>
            <Link to="/nueva" className="mt-2 inline-block text-sm text-[#4F5AF5] font-semibold hover:text-[#3F49E0]">
              Crear primera iniciativa →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#F8FAFC]">
            {recent.map(i => {
              const title = i.summary?.titulo ?? Object.values(i.form_data ?? {})[0] ?? i.id;
              const statusStyle = STATUS_STYLE[i.status] ?? "bg-[#F1F5F9] text-[#64748B]";
              return (
                <div key={i.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#F8FAFC] transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    <span className="text-[#4F5AF5] text-sm">📋</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1E293B] truncate">{String(title)}</p>
                    <p className="text-xs text-[#94A3B8] font-mono mt-0.5">{i.id}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${statusStyle}`}>
                    {i.status}
                  </span>
                  <Link to={`/iniciativa/${i.id}`} className="text-[#4F5AF5] hover:text-[#3F49E0] text-xs font-semibold shrink-0">
                    Ver →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
