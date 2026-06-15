import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Eye, ChevronRight } from "lucide-react";
import { Initiative } from "@/src/types";

// ─── Status config ────────────────────────────────────────────────────────────
type TabKey = "nueva" | "subsanacion" | "aprobada" | "borrador" | "rechazada";

const STATUS_MAP: Record<string, TabKey> = {
  "Pendiente de Aprobación": "nueva",
  "Observada": "subsanacion",
  "Aprobada": "aprobada",
  "Borrador": "borrador",
  "Rechazada": "rechazada",
  "En Ejecución": "aprobada",
};

const TABS: { key: TabKey; label: string; color: string; dot: string }[] = [
  { key: "nueva",       label: "Nuevas para revisión",    color: "text-[#4F5AF5] bg-[#EEF2FF]",   dot: "bg-[#4F5AF5]" },
  { key: "subsanacion", label: "En subsanación",           color: "text-amber-700 bg-amber-50",    dot: "bg-amber-500" },
  { key: "aprobada",    label: "Aprobadas para ejecución", color: "text-emerald-700 bg-emerald-50", dot: "bg-emerald-500" },
  { key: "borrador",    label: "Borradores",               color: "text-[#64748B] bg-[#F1F5F9]",  dot: "bg-[#94A3B8]" },
  { key: "rechazada",   label: "Rechazadas",               color: "text-red-700 bg-red-50",        dot: "bg-red-500" },
];

const STATUS_BADGE: Record<TabKey, string> = {
  nueva:       "bg-[#EEF2FF] text-[#4F5AF5]",
  subsanacion: "bg-amber-50 text-amber-700",
  aprobada:    "bg-emerald-50 text-emerald-700",
  borrador:    "bg-[#F1F5F9] text-[#64748B]",
  rechazada:   "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  "Pendiente de Aprobación": "Nueva para revisión",
  "Observada": "En subsanación",
  "Aprobada": "Aprobada",
  "En Ejecución": "En ejecución",
  "Borrador": "Borrador",
  "Rechazada": "Rechazada",
};

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

export default function ApprovalBoard() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("nueva");

  useEffect(() => {
    fetch("/api/initiatives")
      .then(r => r.json())
      .then(data => { setInitiatives(Array.isArray(data) ? data : []); })
      .catch(() => setInitiatives([]))
      .finally(() => setLoading(false));
  }, []);

  const byTab = (tab: TabKey) => initiatives.filter(i => STATUS_MAP[i.status] === tab);
  const filtered = byTab(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B]">4. Revisión BP</h2>
          <p className="text-sm text-[#64748B]">El BP revisa la solicitud en esta pantalla dentro del mismo sistema.</p>
        </div>
        <button className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          <Filter className="w-4 h-4" />
          Filtrar
        </button>
      </div>

      {/* Status tabs */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1E293B]">Mis solicitudes para revisión</h3>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-[#F1F5F9] gap-1 px-6 pt-3">
          {TABS.map(tab => {
            const count = byTab(tab.key).length;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-lg border-b-2 transition-all ${
                  active
                    ? "border-[#4F5AF5] text-[#4F5AF5] bg-[#EEF2FF]/50"
                    : "border-transparent text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                {tab.label}
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  active ? tab.color : "bg-[#F1F5F9] text-[#94A3B8]"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center gap-3 py-16 text-[#94A3B8]">
              <div className="w-5 h-5 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
              Cargando solicitudes...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#94A3B8] text-sm">No hay solicitudes en esta categoría.</p>
              <Link to="/nueva" className="mt-3 inline-flex items-center gap-1.5 text-[#4F5AF5] hover:text-[#3F49E0] text-sm font-semibold">
                Crear nueva iniciativa <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#F1F5F9]">
                  <th className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Solicitud</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Solicitante</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {filtered.map(i => {
                  const tabKey = STATUS_MAP[i.status] ?? "nueva";
                  const title = i.summary?.titulo ?? Object.values(i.form_data ?? {})[0] ?? i.id;
                  return (
                    <tr key={i.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1E293B] text-sm leading-snug max-w-[280px] truncate">{title}</p>
                        <p className="text-[11px] font-mono text-[#94A3B8] mt-0.5">{i.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#1E293B]">{formatDate(i.created_at)}</p>
                        <p className="text-[11px] text-[#94A3B8]">{formatTime(i.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4F5AF5] to-violet-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            AM
                          </div>
                          <div>
                            <p className="text-sm text-[#1E293B] font-medium">Alejandro Mendoza</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[tabKey]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${TABS.find(t => t.key === tabKey)?.dot}`} />
                          {STATUS_LABEL[i.status] ?? i.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/iniciativa/${i.id}`}
                          className="inline-flex items-center gap-1.5 text-[#4F5AF5] hover:text-[#3F49E0] text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Revisar solicitud
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Flow reference footer */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl px-6 py-5 shadow-sm">
        <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">Flujo del proceso</p>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { icon: "📋", title: "Formulario inicial", desc: "Completa la información base" },
            { icon: "🤖", title: "Asistente IA", desc: "Responde preguntas clave" },
            { icon: "📄", title: "Resumen generado", desc: "La IA estructura el requerimiento" },
            { icon: "👥", title: "Revisión BP", desc: "El BP revisa la solicitud" },
          ].map((s, i, arr) => (
            <div key={s.title} className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-3 py-2 border border-[#F1F5F9]">
                <span className="text-lg">{s.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-[#1E293B]">{s.title}</p>
                  <p className="text-[10px] text-[#94A3B8]">{s.desc}</p>
                </div>
              </div>
              {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-[#CBD5E1] shrink-0" />}
            </div>
          ))}
          <div className="ml-auto hidden lg:flex items-center gap-2 text-[10px] text-[#94A3B8] max-w-[180px]">
            <span className="text-[#4F5AF5]">ℹ</span>
            El req aprobado por el BP debe ser enviado a la Gestión de la Demanda.
          </div>
        </div>
      </div>
    </div>
  );
}
