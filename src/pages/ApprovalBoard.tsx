import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Filter, Eye, ChevronRight } from "lucide-react";
import { Initiative } from "@/src/types";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

// ─── Status config ────────────────────────────────────────────────────────────
type TabKey = "nueva" | "subsanacion" | "aprobada" | "borrador" | "desestimada";

const STATUS_MAP: Record<string, TabKey> = {
  "Pendiente de aprobación": "nueva",
  "Observada": "subsanacion",
  "En demanda": "aprobada",
  "Borrador": "borrador",
  "Desestimada": "desestimada",
};

const TABS: { key: TabKey; label: string; color: string; dot: string }[] = [
  { key: "nueva",       label: "Pendientes de aprobación", color: "text-[#4F5AF5] bg-[#EEF2FF]",   dot: "bg-[#4F5AF5]" },
  { key: "subsanacion", label: "Observadas",               color: "text-amber-700 bg-amber-50",    dot: "bg-amber-500" },
  { key: "aprobada",    label: "En demanda",               color: "text-emerald-700 bg-emerald-50", dot: "bg-emerald-500" },
  { key: "borrador",    label: "Borradores",               color: "text-[#64748B] bg-[#F1F5F9]",  dot: "bg-[#94A3B8]" },
  { key: "desestimada", label: "Desestimadas",             color: "text-slate-700 bg-slate-50",    dot: "bg-slate-500" },
];

const STATUS_BADGE: Record<TabKey, string> = {
  nueva:       "bg-[#EEF2FF] text-[#4F5AF5]",
  subsanacion: "bg-amber-50 text-amber-700",
  aprobada:    "bg-emerald-50 text-emerald-700",
  borrador:    "bg-[#F1F5F9] text-[#64748B]",
  desestimada: "bg-slate-100 text-slate-700",
};

const STATUS_LABEL: Record<string, string> = {
  "Pendiente de aprobación": "Pendiente de aprobación",
  "Observada": "Observada",
  "En demanda": "En demanda",
  "Borrador": "Borrador",
  "Desestimada": "Desestimada",
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedRegistradores, setSelectedRegistradores] = useState<string[]>([]);
  const [selectedDirecciones, setSelectedDirecciones] = useState<string[]>([]);
  const [selectedBPs, setSelectedBPs] = useState<string[]>([]);
  const [selectedVicepresidencias, setSelectedVicepresidencias] = useState<string[]>([]);

  const { profile } = useAuth();
  const [direccionesMap, setDireccionesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from('direcciones').select('id, name').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(d => map[d.id] = d.name);
        setDireccionesMap(map);
      }
    });

    fetch("/api/initiatives")
      .then(r => r.json())
      .then(data => { setInitiatives(Array.isArray(data) ? data : []); })
      .catch(() => setInitiatives([]))
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = profile?.profile_roles?.some((r: any) => r.role === 'admin');
  const isInvitado = profile?.profile_roles?.some((r: any) => r.role === 'invitado');
  const bpRoles = profile?.profile_roles?.filter((r: any) => r.role === 'bp_ti') || [];
  const isBP = bpRoles.length > 0;
  const registradorRoles = profile?.profile_roles?.filter((r: any) => r.role === 'registrador') || [];
  const isRegistrador = registradorRoles.length > 0;

  const bpAllowedDirNames = new Set(bpRoles.flatMap((r: any) => r.direcciones_ids).map((id: string) => direccionesMap[id]));
  const userAllowedDirNames = new Set(registradorRoles.flatMap((r: any) => r.direcciones_ids).map((id: string) => direccionesMap[id]));

  const roleFilteredInitiatives = initiatives.filter(i => {
    if (isAdmin || isInvitado) return true;
    if (isBP) {
      const tab = STATUS_MAP[i.status];
      const dir = i.form_data?.direccion;
      const isMyDir = dir && bpAllowedDirNames.has(dir);
      return (tab === "nueva" || tab === "aprobada" || tab === "subsanacion") && isMyDir;
    }
    if (isRegistrador) {
      const tab = STATUS_MAP[i.status];
      if (tab === "desestimada") return false;
      const isMine = i.form_data?.registrador === profile?.name;
      const dir = i.form_data?.direccion;
      const isMyDir = dir && userAllowedDirNames.has(dir);
      return isMine || isMyDir;
    }
    return false;
  });

  const visibleTabs = TABS.filter(tab => {
    if (isAdmin || isInvitado) return true;
    if (isBP) return tab.key === "nueva" || tab.key === "aprobada" || tab.key === "desestimada" || tab.key === "subsanacion";
    if (isRegistrador) return true;
    return false;
  });

  // Default active tab fallback
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.key === activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  const registradoresOptions = useMemo(() => {
    return Array.from(new Set(roleFilteredInitiatives.map(i => i.form_data?.registrador || i.form_data?.solicitante).filter(Boolean))) as string[];
  }, [roleFilteredInitiatives]);

  const direccionesOptions = useMemo(() => {
    return Array.from(new Set(roleFilteredInitiatives.map(i => i.form_data?.direccion).filter(Boolean))) as string[];
  }, [roleFilteredInitiatives]);

  const bpsOptions = useMemo(() => {
    return Array.from(new Set(roleFilteredInitiatives.map(i => i.form_data?.bp_ti_asignado).filter(Boolean))) as string[];
  }, [roleFilteredInitiatives]);

  const vicepresidenciasOptions = useMemo(() => {
    return Array.from(new Set(roleFilteredInitiatives.map(i => i.form_data?.vicepresidencia).filter(Boolean))) as string[];
  }, [roleFilteredInitiatives]);

  const byTab = (tab: TabKey) => roleFilteredInitiatives.filter(i => {
    if (STATUS_MAP[i.status] !== tab) return false;
    
    const reg = i.form_data?.registrador || i.form_data?.solicitante;
    if (selectedRegistradores.length > 0 && (!reg || !selectedRegistradores.includes(reg))) return false;

    const dir = i.form_data?.direccion;
    if (selectedDirecciones.length > 0 && (!dir || !selectedDirecciones.includes(dir))) return false;

    const bp = i.form_data?.bp_ti_asignado;
    if (selectedBPs.length > 0 && (!bp || !selectedBPs.includes(bp))) return false;

    const vp = i.form_data?.vicepresidencia;
    if (selectedVicepresidencias.length > 0 && (!vp || !selectedVicepresidencias.includes(vp))) return false;

    return true;
  });

  const filtered = byTab(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B]">4. Revisión BP</h2>
          <p className="text-sm text-[#64748B]">El BP revisa la solicitud en esta pantalla dentro del mismo sistema.</p>
        </div>
        <div className="relative z-30">
          <button 
            onClick={() => setFilterOpen(!filterOpen)} 
            className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm relative"
          >
            <Filter className="w-4 h-4" />
            Filtrar
            {(selectedRegistradores.length > 0 || selectedDirecciones.length > 0 || selectedBPs.length > 0 || selectedVicepresidencias.length > 0) && (
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full absolute -top-1 -right-1 border-2 border-white" />
            )}
          </button>

          {filterOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] z-50 p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-[#1E293B]">Filtros</h4>
                  {(selectedRegistradores.length > 0 || selectedDirecciones.length > 0 || selectedBPs.length > 0 || selectedVicepresidencias.length > 0) && (
                    <button 
                      onClick={() => { 
                        setSelectedRegistradores([]); 
                        setSelectedDirecciones([]); 
                        setSelectedBPs([]); 
                        setSelectedVicepresidencias([]); 
                      }}
                      className="text-xs font-semibold text-[#4F5AF5] hover:text-[#3F49E0] transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                
                {/* Registradores */}
                <div className="mb-5">
                  <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2 block">Registrador</label>
                  <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                    {registradoresOptions.map(reg => (
                      <label key={reg} className="flex items-start gap-3 text-sm text-[#1E293B] hover:bg-[#F8FAFC] p-2 rounded-lg cursor-pointer transition-colors">
                        <div className="mt-0.5">
                          <input 
                            type="checkbox" 
                            checked={selectedRegistradores.includes(reg)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRegistradores(prev => [...prev, reg]);
                              else setSelectedRegistradores(prev => prev.filter(r => r !== reg));
                            }}
                            className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <span className="truncate leading-tight">{reg}</span>
                      </label>
                    ))}
                    {registradoresOptions.length === 0 && <p className="text-xs text-[#94A3B8] italic">Sin datos disponibles</p>}
                  </div>
                </div>

                {/* Direcciones */}
                <div className="mb-5">
                  <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2 block">Dirección</label>
                  <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                    {direccionesOptions.map(dir => (
                      <label key={dir} className="flex items-start gap-3 text-sm text-[#1E293B] hover:bg-[#F8FAFC] p-2 rounded-lg cursor-pointer transition-colors">
                        <div className="mt-0.5">
                          <input 
                            type="checkbox" 
                            checked={selectedDirecciones.includes(dir)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedDirecciones(prev => [...prev, dir]);
                              else setSelectedDirecciones(prev => prev.filter(d => d !== dir));
                            }}
                            className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <span className="truncate leading-tight">{direccionesMap[dir] || dir}</span>
                      </label>
                    ))}
                    {direccionesOptions.length === 0 && <p className="text-xs text-[#94A3B8] italic">Sin datos disponibles</p>}
                  </div>
                </div>

                {/* BP TI */}
                <div className="mb-5">
                  <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2 block">BP TI</label>
                  <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                    {bpsOptions.map(bp => (
                      <label key={bp} className="flex items-start gap-3 text-sm text-[#1E293B] hover:bg-[#F8FAFC] p-2 rounded-lg cursor-pointer transition-colors">
                        <div className="mt-0.5">
                          <input 
                            type="checkbox" 
                            checked={selectedBPs.includes(bp)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedBPs(prev => [...prev, bp]);
                              else setSelectedBPs(prev => prev.filter(b => b !== bp));
                            }}
                            className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <span className="truncate leading-tight">{bp}</span>
                      </label>
                    ))}
                    {bpsOptions.length === 0 && <p className="text-xs text-[#94A3B8] italic">Sin datos disponibles</p>}
                  </div>
                </div>

                {/* Vicepresidencia */}
                <div>
                  <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2 block">Vicepresidencia</label>
                  <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                    {vicepresidenciasOptions.map(vp => (
                      <label key={vp} className="flex items-start gap-3 text-sm text-[#1E293B] hover:bg-[#F8FAFC] p-2 rounded-lg cursor-pointer transition-colors">
                        <div className="mt-0.5">
                          <input 
                            type="checkbox" 
                            checked={selectedVicepresidencias.includes(vp)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedVicepresidencias(prev => [...prev, vp]);
                              else setSelectedVicepresidencias(prev => prev.filter(v => v !== vp));
                            }}
                            className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <span className="truncate leading-tight">{vp}</span>
                      </label>
                    ))}
                    {vicepresidenciasOptions.length === 0 && <p className="text-xs text-[#94A3B8] italic">Sin datos disponibles</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1E293B]">Mis solicitudes para revisión</h3>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-[#F1F5F9] gap-1 px-6 pt-3">
          {visibleTabs.map(tab => {
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
                  <th className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Registrador</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">IT Business Partner</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {filtered.map(i => {
                  const tabKey = STATUS_MAP[i.status] ?? "nueva";
                  const title = i.summary?.titulo ?? Object.values(i.form_data ?? {})[0] ?? i.id;
                  const registrador = i.form_data?.registrador || i.form_data?.solicitante || "Desconocido";
                  const initials = registrador.substring(0, 2).toUpperCase();
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
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4F5AF5] to-violet-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 uppercase">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm text-[#1E293B] font-medium">{registrador}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`text-sm font-medium ${i.form_data?.bp_ti_asignado ? 'text-[#1E293B]' : 'text-amber-600'}`}>
                          {i.form_data?.bp_ti_asignado || "Pendiente de TI BP"}
                        </p>
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
