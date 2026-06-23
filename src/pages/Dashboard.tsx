import { useEffect, useState, useMemo, useRef } from "react";
import {
  Activity, CheckCircle, Clock, TrendingUp, Ban, Play,
  FileText, Filter, X, ChevronRight, ChevronLeft, ChevronDown,
  ExternalLink, Building2, Users, BarChart3,
  ArrowUpRight, Search, RefreshCw, Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VP {
  id: string;
  name: string;
  bp_name: string | null;
}

interface Direccion {
  id: string;
  name: string;
  vp_id: string;
}

interface Initiative {
  id: string;
  created_at: string;
  status: string;
  form_data: Record<string, string>;
  summary?: Record<string, any>;
  rejection_reason?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  "Borrador",
  "En Elaboración",
  "Pendiente de Aprobación",
  "Observada",
  "Aprobada",
  "En Ejecución",
  "Desestimada",
  "Cerrada",
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; bar: string; dot: string }> = {
  "Borrador":                 { color: "text-slate-500",   bg: "bg-slate-100",   bar: "bg-slate-400",   dot: "bg-slate-400" },
  "En Elaboración":           { color: "text-blue-600",    bg: "bg-blue-50",     bar: "bg-blue-400",    dot: "bg-blue-400" },
  "Pendiente de Aprobación":  { color: "text-[#4F5AF5]",   bg: "bg-[#EEF2FF]",  bar: "bg-[#4F5AF5]",  dot: "bg-[#4F5AF5]" },
  "Observada":                { color: "text-amber-600",   bg: "bg-amber-50",    bar: "bg-amber-400",   dot: "bg-amber-400" },
  "Aprobada":                 { color: "text-emerald-700", bg: "bg-emerald-50",  bar: "bg-emerald-500", dot: "bg-emerald-500" },
  "En Ejecución":             { color: "text-teal-700",    bg: "bg-teal-50",     bar: "bg-teal-500",    dot: "bg-teal-500" },
  "Desestimada":              { color: "text-red-600",     bg: "bg-red-50",      bar: "bg-red-400",     dot: "bg-red-400" },
  "Cerrada":                  { color: "text-gray-500",    bg: "bg-gray-100",    bar: "bg-gray-400",    dot: "bg-gray-400" },
};

const PAGE_SIZE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTitle(initiative: Initiative): string {
  return (
    initiative.summary?.titulo ||
    initiative.form_data?.titulo ||
    Object.values(initiative.form_data ?? {})[0] ||
    initiative.id
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ initiative, onClose }: { initiative: Initiative; onClose: () => void }) {
  const cfg = STATUS_CONFIG[initiative.status] ?? STATUS_CONFIG["Borrador"];
  const title = getTitle(initiative);
  const s = initiative.summary ?? {};
  const fd = initiative.form_data ?? {};

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const complejidadColor: Record<string, string> = {
    "Alta": "text-red-600 bg-red-50", "Media": "text-amber-600 bg-amber-50", "Baja": "text-emerald-600 bg-emerald-50"
  };
  const riesgoColor: Record<string, string> = {
    "Alto": "text-red-600 bg-red-50", "Medio": "text-amber-600 bg-amber-50", "Bajo": "text-emerald-600 bg-emerald-50"
  };
  const prioridadColor: Record<string, string> = {
    "Alta": "text-[#4F5AF5] bg-[#EEF2FF]", "Media": "text-amber-600 bg-amber-50", "Baja": "text-emerald-600 bg-emerald-50"
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ animation: "modalIn 0.18s cubic-bezier(.4,0,.2,1)" }}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#F1F5F9] flex items-start gap-4 shrink-0 bg-gradient-to-r from-[#F8FAFF] to-white">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-mono font-bold text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded">
                {initiative.id}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {initiative.status}
              </span>
            </div>
            <h3 className="text-base font-bold text-[#1E293B] leading-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Datos de Registro */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
              Datos de Registro
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Vicepresidencia", value: fd.vicepresidencia },
                { label: "Dirección", value: fd.direccion },
                { label: "Registrador", value: fd.registrador },
                { label: "Fecha", value: formatDate(initiative.created_at) },
                { label: "Institución", value: fd.institucion },
                { label: "Fecha Requerida", value: fd.fecha_requerida },
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="bg-[#F8FAFC] rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">{r.label}</p>
                  <p className="text-sm font-medium text-[#1E293B]">{r.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Resumen Ejecutivo IA */}
          {s.objetivo && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
                Resumen Ejecutivo IA
              </p>
              <div className="space-y-3">
                {s.objetivo && (
                  <div className="bg-[#F8FAFF] border border-[#EEF2FF] rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-[#4F5AF5] uppercase tracking-wider mb-1.5">Objetivo</p>
                    <p className="text-sm text-[#334155] leading-relaxed">{s.objetivo}</p>
                  </div>
                )}
                {s.descripcionProblema && (
                  <div className="bg-[#FFFBF5] border border-amber-100 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1.5">Problema</p>
                    <p className="text-sm text-[#334155] leading-relaxed">{s.descripcionProblema}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {s.complejidad && (
                    <div className={`rounded-xl p-3 text-center ${complejidadColor[s.complejidad] ?? "text-slate-600 bg-slate-50"}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1">Complejidad</p>
                      <p className="text-sm font-bold">{s.complejidad}</p>
                    </div>
                  )}
                  {s.riesgo && (
                    <div className={`rounded-xl p-3 text-center ${riesgoColor[s.riesgo] ?? "text-slate-600 bg-slate-50"}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1">Riesgo</p>
                      <p className="text-sm font-bold">{s.riesgo}</p>
                    </div>
                  )}
                  {s.prioridadRecomendada && (
                    <div className={`rounded-xl p-3 text-center ${prioridadColor[s.prioridadRecomendada] ?? "text-slate-600 bg-slate-50"}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1">Prioridad</p>
                      <p className="text-sm font-bold">{s.prioridadRecomendada}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Beneficios */}
          {(s.beneficiosCuantitativos || (Array.isArray(s.beneficiosCualitativos) && s.beneficiosCualitativos.length > 0)) && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
                Beneficios
              </p>
              <div className="space-y-2">
                {s.beneficiosCuantitativos && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Cuantitativos</p>
                    <p className="text-sm text-emerald-800 leading-relaxed">{s.beneficiosCuantitativos}</p>
                  </div>
                )}
                {Array.isArray(s.beneficiosCualitativos) && s.beneficiosCualitativos.length > 0 && (
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider mb-2">Cualitativos</p>
                    <ul className="space-y-1.5">
                      {s.beneficiosCualitativos.map((b: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-teal-800">
                          <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Rechazo */}
          {initiative.rejection_reason && (
            <section>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1.5">Motivo de Rechazo/Observación</p>
                <p className="text-sm text-red-800 leading-relaxed">{initiative.rejection_reason}</p>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex items-center justify-between shrink-0">
          <p className="text-xs text-[#94A3B8]">Registrado el {formatDate(initiative.created_at)}</p>
          <Link
            to={`/iniciativa/${initiative.id}`}
            onClick={onClose}
            className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Ver completo
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── MultiSelect Component ───────────────────────────────────────────────────
function MultiSelect({
  label,
  placeholder,
  options,
  selected,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === options.length) return `Todos (${options.length})`;
    if (selected.length === 1) return selected[0];
    return `${selected.length} seleccionados`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] outline-none hover:bg-white focus:border-[#4F5AF5] focus:bg-white transition-all text-[#1E293B] cursor-pointer text-left font-medium shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
      >
        <span className="truncate pr-2">{getDisplayText()}</span>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 py-2 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="px-3 py-1.5 border-b border-[#F1F5F9] mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{label}</span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[10px] font-semibold text-[#4F5AF5] hover:text-[#3F49E0] transition-colors"
            >
              {selected.length === options.length ? "Deseleccionar" : "Todos"}
            </button>
          </div>

          <div className="divide-y divide-[#F8FAFC]">
            {options.map(opt => {
              const isChecked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#334155] hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(opt)}
                    className="w-3.5 h-3.5 rounded border-[#E2E8F0] text-[#4F5AF5] focus:ring-[#4F5AF5] cursor-pointer"
                  />
                  <span className={`truncate ${isChecked ? 'font-semibold text-[#4F5AF5]' : ''}`}>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [vps, setVps] = useState<VP[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterBP, setFilterBP] = useState<string[]>([]);
  const [filterVP, setFilterVP] = useState<string[]>([]);
  const [filterDir, setFilterDir] = useState<string[]>([]);
  const [filterBPTI, setFilterBPTI] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);

  // Modal
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    const [initRes, vpRes, dirRes] = await Promise.all([
      fetch("/api/initiatives").then(r => r.json()),
      supabase.from("vps").select("*").order("name"),
      supabase.from("direcciones").select("*").order("name"),
    ]);

    if (Array.isArray(initRes)) setInitiatives(initRes);
    if (vpRes.data) setVps(vpRes.data);
    if (dirRes.data) setDirecciones(dirRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Derived filter options ─────────────────────────────────────────────────

  // Unique BPs (Vicepresidentes) present in initiatives
  const bpOptions = useMemo(() => {
    const names = initiatives.map(ini => {
      const vpName = ini.form_data?.vicepresidencia;
      const vp = vps.find(v => v.name === vpName);
      return vp?.bp_name;
    }).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort();
  }, [initiatives, vps]);

  // Unique VPs (Vicepresidencias) present in initiatives
  const vpOptions = useMemo(() => {
    const names = initiatives.map(ini => ini.form_data?.vicepresidencia).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort();
  }, [initiatives]);

  // Unique Direcciones present in initiatives
  const dirOptions = useMemo(() => {
    const names = initiatives.map(ini => ini.form_data?.direccion).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort();
  }, [initiatives]);

  // Unique BPs (bp_ti_asignado) present in initiatives
  const bpTiOptions = useMemo(() => {
    const names = initiatives.map(i => i.form_data?.bp_ti_asignado).filter(Boolean) as string[];
    const list = Array.from(new Set(names)).sort();
    if (initiatives.some(i => !i.form_data?.bp_ti_asignado)) {
      list.push("Sin asignar");
    }
    return list;
  }, [initiatives]);

  // Unique Statuses present in initiatives
  const statusOptions = useMemo(() => {
    const statuses = initiatives.map(i => i.status).filter(Boolean) as string[];
    return Array.from(new Set(statuses)).sort();
  }, [initiatives]);

  const handleBPChange = (val: string[]) => { setFilterBP(val); setPage(1); };
  const handleVPChange = (val: string[]) => { setFilterVP(val); setPage(1); };
  const handleDirChange = (val: string[]) => { setFilterDir(val); setPage(1); };
  const handleBPTIChange = (val: string[]) => { setFilterBPTI(val); setPage(1); };
  const handleStatusChange = (val: string[]) => { setFilterStatus(val); setPage(1); };

  const clearFilters = () => {
    setFilterBP([]);
    setFilterVP([]);
    setFilterDir([]);
    setFilterBPTI([]);
    setFilterStatus([]);
    setSearchText("");
    setPage(1);
  };

  const hasActiveFilters =
    filterBP.length > 0 || filterVP.length > 0 ||
    filterDir.length > 0 || filterBPTI.length > 0 ||
    filterStatus.length > 0 || searchText !== "";

  // ── Filtered initiatives ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return initiatives.filter(ini => {
      const fd = ini.form_data ?? {};
      const vpName = fd.vicepresidencia ?? "";
      const dirName = fd.direccion ?? "";

      // BP filter (Vicepresidente)
      if (filterBP.length > 0) {
        const vp = vps.find(v => v.name === vpName);
        const bpName = vp?.bp_name ?? "";
        if (!filterBP.includes(bpName)) return false;
      }
      // VP filter
      if (filterVP.length > 0) {
        if (!filterVP.includes(vpName)) return false;
      }
      // Dirección filter
      if (filterDir.length > 0) {
        if (!filterDir.includes(dirName)) return false;
      }
      // BP TI filter
      if (filterBPTI.length > 0) {
        const bp = fd.bp_ti_asignado;
        if (!bp) {
          if (!filterBPTI.includes("Sin asignar")) return false;
        } else {
          if (!filterBPTI.includes(bp)) return false;
        }
      }
      // Status filter
      if (filterStatus.length > 0) {
        if (!filterStatus.includes(ini.status)) return false;
      }

      // Search filter
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const title = getTitle(ini).toLowerCase();
        if (!title.includes(q) && !ini.id.toLowerCase().includes(q) &&
          !vpName.toLowerCase().includes(q) && !dirName.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [initiatives, vps, filterBP, filterVP, filterDir, filterStatus, filterBPTI, searchText]);

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_STATUSES.forEach(s => { counts[s] = 0; });
    filtered.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });
    return {
      total: filtered.length,
      aprobadas: (counts["Aprobada"] ?? 0) + (counts["En Ejecución"] ?? 0),
      pendientes: (counts["Pendiente de Aprobación"] ?? 0) + (counts["Observada"] ?? 0),
      enEjecucion: counts["En Ejecución"] ?? 0,
      desestimadas: counts["Desestimada"] ?? 0,
      borradores: (counts["Borrador"] ?? 0) + (counts["En Elaboración"] ?? 0),
      porEstado: counts,
    };
  }, [filtered]);

  // ── VP Summary blocks ──────────────────────────────────────────────────────

  const vpSummary = useMemo(() => {
    return vps.map(vp => {
      const vpInits = filtered.filter(i => i.form_data?.vicepresidencia === vp.name);
      const statusCount: Record<string, number> = {};
      vpInits.forEach(i => { statusCount[i.status] = (statusCount[i.status] ?? 0) + 1; });
      return { vp, total: vpInits.length, statusCount };
    }).filter(s => s.total > 0);
  }, [vps, filtered]);

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpiCards = [
    {
      label: "Total Iniciativas", value: kpis.total, icon: Activity,
      color: "text-[#4F5AF5]", bg: "bg-[#EEF2FF]", border: "border-[#C7D2FE]",
      gradient: "from-[#4F5AF5]/10 to-transparent"
    },
    {
      label: "Aprobadas / Ejecución", value: kpis.aprobadas, icon: CheckCircle,
      color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100",
      gradient: "from-emerald-500/10 to-transparent"
    },
    {
      label: "Pendientes / Observadas", value: kpis.pendientes, icon: Clock,
      color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100",
      gradient: "from-amber-500/10 to-transparent"
    },
    {
      label: "En Ejecución", value: kpis.enEjecucion, icon: Play,
      color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-100",
      gradient: "from-teal-500/10 to-transparent"
    },
    {
      label: "Desestimadas", value: kpis.desestimadas, icon: Ban,
      color: "text-red-600", bg: "bg-red-50", border: "border-red-100",
      gradient: "from-red-500/10 to-transparent"
    },
    {
      label: "Borradores", value: kpis.borradores, icon: FileText,
      color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200",
      gradient: "from-slate-500/10 to-transparent"
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1E293B]">Dashboard Ejecutivo</h2>
          <p className="text-[#64748B] mt-1 text-sm">
            Visibilidad estratégica de iniciativas por Vicepresidente, VP y Dirección.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.06)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#4F5AF5]" />
          <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Filtros</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchText}
              onChange={e => { setSearchText(e.target.value); setPage(1); }}
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] outline-none focus:border-[#4F5AF5] focus:bg-white transition-colors"
            />
          </div>

          {/* Vicepresidente */}
          <MultiSelect
            label="Vicepresidente"
            placeholder="Todos los Vicepresidentes"
            options={bpOptions}
            selected={filterBP}
            onChange={handleBPChange}
          />

          {/* VP */}
          <MultiSelect
            label="VP"
            placeholder="Todas las VPs"
            options={vpOptions}
            selected={filterVP}
            onChange={handleVPChange}
          />

          {/* Dirección */}
          <MultiSelect
            label="Dirección"
            placeholder="Todas las Direcciones"
            options={dirOptions}
            selected={filterDir}
            onChange={handleDirChange}
          />

          {/* BP TI */}
          <MultiSelect
            label="BP TI"
            placeholder="Todos los BPs"
            options={bpTiOptions}
            selected={filterBPTI}
            onChange={handleBPTIChange}
          />

          {/* Estado */}
          <MultiSelect
            label="Estado"
            placeholder="Todos los Estados"
            options={statusOptions}
            selected={filterStatus}
            onChange={handleStatusChange}
          />
        </div>

        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-[#94A3B8] font-semibold uppercase tracking-wider">Activos:</span>
            {filterBP.map(bp => (
              <span key={bp} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F5AF5] text-xs font-semibold animate-in zoom-in-95 duration-100">
                Vicepresidente: {bp}
                <button onClick={() => handleBPChange(filterBP.filter(x => x !== bp))}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filterVP.map(vp => (
              <span key={vp} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F5AF5] text-xs font-semibold animate-in zoom-in-95 duration-100">
                VP: {vp}
                <button onClick={() => handleVPChange(filterVP.filter(x => x !== vp))}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filterDir.map(dir => (
              <span key={dir} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F5AF5] text-xs font-semibold animate-in zoom-in-95 duration-100">
                Dir: {dir}
                <button onClick={() => handleDirChange(filterDir.filter(x => x !== dir))}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filterBPTI.map(bp => (
              <span key={bp} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F5AF5] text-xs font-semibold animate-in zoom-in-95 duration-100">
                BP: {bp}
                <button onClick={() => handleBPTIChange(filterBPTI.filter(x => x !== bp))}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filterStatus.map(st => (
              <span key={st} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F5AF5] text-xs font-semibold animate-in zoom-in-95 duration-100">
                Estado: {st}
                <button onClick={() => handleStatusChange(filterStatus.filter(x => x !== st))}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {searchText && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F5AF5] text-xs font-semibold">
                Buscar: "{searchText}"
                <button onClick={() => { setSearchText(""); setPage(1); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            <span className="ml-auto text-xs text-[#94A3B8]">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      {loading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
          {kpiCards.map(k => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className={`bg-white rounded-xl border ${k.border} shadow-[0_1px_3px_rgba(0,0,0,.05)] p-4 relative overflow-hidden group hover:shadow-md transition-shadow`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${k.gradient} opacity-60`} />
                <div className="relative">
                  <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${k.color}`} />
                  </div>
                  <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                  <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mt-1 leading-tight">{k.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom Row: Distribution + VP Blocks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Status Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.06)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#4F5AF5]" />
            <h3 className="text-sm font-bold text-[#1E293B]">Distribución por Estado</h3>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-[#F8FAFC] rounded-lg animate-pulse" />
            ))}</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[#94A3B8] text-center py-8">Sin datos para el filtro actual.</p>
          ) : (
            <div className="space-y-2.5">
              {ALL_STATUSES.map(status => {
                const count = kpis.porEstado[status] ?? 0;
                if (count === 0) return null;
                const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Borrador"];
                const isActive = filterStatus.includes(status);
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(isActive ? filterStatus.filter(x => x !== status) : [...filterStatus, status])}
                    className={`w-full text-left group rounded-lg px-2 py-1.5 transition-colors ${isActive ? "bg-[#F0F4FF]" : "hover:bg-[#F8FAFC]"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className="text-xs font-semibold text-[#334155]">{status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${cfg.color}`}>{count}</span>
                        <span className="text-[10px] text-[#94A3B8]">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* VP Summary Blocks */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.06)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-[#4F5AF5]" />
            <h3 className="text-sm font-bold text-[#1E293B]">Resumen por Vicepresidencia</h3>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#F8FAFC] rounded-xl animate-pulse" />
            ))}</div>
          ) : vpSummary.length === 0 ? (
            <p className="text-sm text-[#94A3B8] text-center py-8">Sin iniciativas en el filtro actual.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {vpSummary.map(({ vp, total, statusCount }) => {
                const isVPActive = filterVP.includes(vp.name);
                return (
                  <button
                    key={vp.id}
                    onClick={() => handleVPChange(isVPActive ? filterVP.filter(x => x !== vp.name) : [...filterVP, vp.name])}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isVPActive
                        ? "bg-[#EEF2FF] border-[#C7D2FE] shadow-sm"
                        : "bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#C7D2FE] hover:bg-[#F0F4FF]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className={`text-sm font-bold ${isVPActive ? "text-[#4F5AF5]" : "text-[#1E293B]"}`}>
                          {vp.name}
                        </p>
                        {vp.bp_name && (
                          <p className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3" /> Vicepresidente: {vp.bp_name}
                          </p>
                        )}
                      </div>
                      <span className={`text-lg font-black ${isVPActive ? "text-[#4F5AF5]" : "text-[#1E293B]"}`}>
                        {total}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(statusCount).map(([st, cnt]) => {
                        const cfg = STATUS_CONFIG[st] ?? STATUS_CONFIG["Borrador"];
                        return (
                          <span key={st} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                            {cnt} {st}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Initiatives Table ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#4F5AF5]" />
            <h3 className="text-sm font-bold text-[#1E293B]">
              Iniciativas
              {!loading && (
                <span className="ml-2 text-xs font-normal text-[#94A3B8]">
                  ({filtered.length} total{filtered.length !== 1 ? "es" : ""})
                </span>
              )}
            </h3>
          </div>
          <Link
            to="/bandeja"
            className="flex items-center gap-1 text-xs font-semibold text-[#4F5AF5] hover:text-[#3F49E0] transition-colors"
          >
            Ir a Bandeja <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#F8FAFC] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="w-10 h-10 mx-auto mb-3 text-[#E2E8F0]" />
            <p className="text-sm text-[#94A3B8]">No hay iniciativas que coincidan con los filtros.</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-[#4F5AF5] font-semibold hover:text-[#3F49E0]"
              >
                Limpiar filtros →
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_140px_140px_130px_140px_100px_80px] gap-4 px-6 py-2.5 bg-[#F8FAFC] border-b border-[#F1F5F9] text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              <span>Título</span>
              <span>Vicepresidencia</span>
              <span>Dirección</span>
              <span>BP TI</span>
              <span>Estado</span>
              <span>Registrado</span>
              <span className="text-center">Detalle</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#F8FAFC]">
              {paginated.map(ini => {
                const cfg = STATUS_CONFIG[ini.status] ?? STATUS_CONFIG["Borrador"];
                const title = getTitle(ini);
                const fd = ini.form_data ?? {};
                return (
                  <div
                    key={ini.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_130px_140px_100px_80px] gap-2 md:gap-4 px-6 py-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                    onClick={() => setSelectedInitiative(ini)}
                  >
                    {/* Title */}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1E293B] truncate group-hover:text-[#4F5AF5] transition-colors">
                        {String(title)}
                      </p>
                      <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{ini.id}</p>
                    </div>

                    {/* VP */}
                    <div className="flex items-center">
                      <p className="text-sm text-[#334155] truncate" title={fd.vicepresidencia}>
                        {fd.vicepresidencia || <span className="text-[#CBD5E1]">—</span>}
                      </p>
                    </div>

                    {/* Dirección */}
                    <div className="flex items-center">
                      <p className="text-sm text-[#334155] truncate" title={fd.direccion}>
                        {fd.direccion || <span className="text-[#CBD5E1]">—</span>}
                      </p>
                    </div>

                    {/* BP TI */}
                    <div className="flex items-center">
                      <p className="text-sm text-[#334155] truncate" title={fd.bp_ti_asignado}>
                        {fd.bp_ti_asignado || <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">Pendiente</span>}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {ini.status}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center">
                      <p className="text-xs text-[#94A3B8]">{formatDate(ini.created_at)}</p>
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedInitiative(ini); }}
                        className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:bg-[#EEF2FF] hover:text-[#4F5AF5] hover:border-[#C7D2FE] transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-[#F1F5F9] flex items-center justify-between">
                <p className="text-xs text-[#94A3B8]">
                  Página {page} de {totalPages} — {filtered.length} iniciativas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                          page === pageNum
                            ? "bg-[#4F5AF5] text-white"
                            : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedInitiative && (
        <DetailModal
          initiative={selectedInitiative}
          onClose={() => setSelectedInitiative(null)}
        />
      )}
    </div>
  );
}
