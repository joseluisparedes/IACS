import { useEffect, useState, useMemo, useRef } from "react";
import {
  Activity, CheckCircle, Clock, TrendingUp, Ban, AlertTriangle,
  FileText, Filter, X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  ExternalLink, Building2, Users, BarChart3,
  ArrowUpRight, Search, RefreshCw, Eye, Briefcase, Layers, UserCheck,
  FolderKanban, LayoutGrid, CheckSquare, Sparkles, PieChart, ShieldCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatDateDDMMYYYY } from "../lib/utils";

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

type PerspectiveTab = "vp" | "direccion" | "bpti" | "ld" | "estado" | "tabla";

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  "Borrador",
  "Pendiente de aprobación",
  "Observada",
  "Desestimada",
  "En demanda",
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; bar: string; dot: string; border: string }> = {
  "Borrador":                 { color: "text-slate-600",   bg: "bg-slate-100",   bar: "bg-slate-400",   dot: "bg-slate-400",   border: "border-slate-200" },
  "Pendiente de aprobación":  { color: "text-[#4F5AF5]",   bg: "bg-[#EEF2FF]",  bar: "bg-[#4F5AF5]",  dot: "bg-[#4F5AF5]",  border: "border-[#C7D2FE]" },
  "Observada":                { color: "text-amber-700",   bg: "bg-amber-50",    bar: "bg-amber-500",   dot: "bg-amber-500",   border: "border-amber-200" },
  "Desestimada":              { color: "text-red-700",     bg: "bg-red-50",      bar: "bg-red-500",     dot: "bg-red-500",     border: "border-red-200" },
  "En demanda":               { color: "text-emerald-700", bg: "bg-emerald-50",  bar: "bg-emerald-500", dot: "bg-emerald-500", border: "border-emerald-200" },
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

function getBPTI(initiative: Initiative): string {
  const fd = initiative.form_data ?? {};
  return (
    fd.bp_ti_asignado ||
    fd.bp_ti ||
    fd.bp ||
    ""
  );
}

function getLD(initiative: Initiative): string {
  const fd = initiative.form_data ?? {};
  return (
    fd.lider_de_dominio_responsable ||
    fd.lider_dominio ||
    fd.ld_asignado ||
    fd.lider_de_dominio ||
    ""
  );
}

function formatDate(iso: string) {
  return formatDateDDMMYYYY(iso);
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ initiative, onClose }: { initiative: Initiative; onClose: () => void }) {
  const cfg = STATUS_CONFIG[initiative.status] ?? STATUS_CONFIG["Borrador"];
  const title = getTitle(initiative);
  const s = initiative.summary ?? {};
  const fd = initiative.form_data ?? {};
  const bpTi = getBPTI(initiative);
  const ld = getLD(initiative);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const complejidadColor: Record<string, string> = {
    "Alta": "text-red-600 bg-red-50 border-red-200", 
    "Media": "text-amber-600 bg-amber-50 border-amber-200", 
    "Baja": "text-emerald-600 bg-emerald-50 border-emerald-200"
  };
  const riesgoColor: Record<string, string> = {
    "Alto": "text-red-600 bg-red-50 border-red-200", 
    "Medio": "text-amber-600 bg-amber-50 border-amber-200", 
    "Bajo": "text-emerald-600 bg-emerald-50 border-emerald-200"
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-start justify-between gap-4 shrink-0 bg-gradient-to-r from-slate-50 to-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {initiative.status}
              </span>
              <span className="text-xs text-[#94A3B8] font-mono">#{s.id_corta || initiative.id.slice(0, 8)}</span>
            </div>
            <h3 className="text-base font-bold text-[#1E293B] leading-snug line-clamp-2">
              {String(title)}
            </h3>
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
          {/* Asignaciones Clave de TI y Negocio */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#4F5AF5]" />
              Gobernanza y Asignación
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Business Partner TI (BP TI)</p>
                <p className={`text-sm font-semibold ${bpTi ? 'text-slate-800' : 'text-amber-600'}`}>
                  {bpTi || "Pendiente de Asignación"}
                </p>
              </div>
              <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Líder de Dominio (LD)</p>
                <p className={`text-sm font-semibold ${ld ? 'text-indigo-700' : 'text-slate-500 italic'}`}>
                  {ld || "Sin Asignar (Etapa de Demanda TI)"}
                </p>
              </div>
            </div>
          </section>

          {/* Datos de Registro */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Estructura Organizacional
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Vicepresidencia", value: fd.vicepresidencia },
                { label: "Dirección", value: fd.direccion },
                { label: "Key user / Solicitante", value: fd.registrador },
                { label: "Fecha de Registro", value: formatDate(initiative.created_at) },
                { label: "Institución", value: fd.institucion },
                { label: "Fecha Requerida", value: fd.fecha_requerida },
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">{r.label}</p>
                  <p className="text-sm font-medium text-[#1E293B]">{r.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Resumen Ejecutivo IA */}
          {s.objetivo && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Resumen Ejecutivo IA (Teo)
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
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1.5">Problema que resuelve</p>
                    <p className="text-sm text-[#334155] leading-relaxed">{s.descripcionProblema}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {s.complejidad && (
                    <div className={`rounded-xl p-3 text-center border ${complejidadColor[s.complejidad] ?? "text-slate-600 bg-slate-50 border-slate-200"}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-75 mb-0.5">Complejidad</p>
                      <p className="text-sm font-bold">{s.complejidad}</p>
                    </div>
                  )}
                  {s.riesgo && (
                    <div className={`rounded-xl p-3 text-center border ${riesgoColor[s.riesgo] ?? "text-slate-600 bg-slate-50 border-slate-200"}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-75 mb-0.5">Riesgo Operativo</p>
                      <p className="text-sm font-bold">{s.riesgo}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Observaciones o Rechazo */}
          {initiative.rejection_reason && (
            <section>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Observación / Dictamen
                </p>
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
            className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            Abrir Expediente Completo
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
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
        className="w-full flex items-center justify-between px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] outline-none hover:bg-white focus:border-[#4F5AF5] focus:bg-white transition-all text-[#1E293B] cursor-pointer text-left font-medium shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
      >
        <span className="truncate pr-2">{getDisplayText()}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 py-2 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="px-3 py-1.5 border-b border-[#F1F5F9] mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{label}</span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[10px] font-semibold text-[#4F5AF5] hover:text-[#3F49E0] transition-colors cursor-pointer"
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
  const [slowLoad, setSlowLoad] = useState(false);

  // Active Perspective Tab
  const [activeTab, setActiveTab] = useState<PerspectiveTab>("vp");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Filters
  const [filterBP, setFilterBP] = useState<string[]>([]);
  const [filterVP, setFilterVP] = useState<string[]>([]);
  const [filterDir, setFilterDir] = useState<string[]>([]);
  const [filterBPTI, setFilterBPTI] = useState<string[]>([]);
  const [filterLD, setFilterLD] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  // Pagination for Table view
  const [page, setPage] = useState(1);

  // Modal
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    setSlowLoad(false);
    const slowTimer = setTimeout(() => setSlowLoad(true), 4000);
    const [initRes, vpRes, dirRes] = await Promise.all([
      fetch("/api/initiatives")
        .then(async r => {
          if (!r.ok) throw new Error(`API status ${r.status}`);
          const json = await r.json();
          if (!Array.isArray(json)) throw new Error("Invalid format");
          return json;
        })
        .catch(async () => {
          const { data: inits } = await supabase.from("initiatives").select("*").order("created_at", { ascending: false });
          return inits || [];
        }),
      supabase.from("vps").select("*").order("name"),
      supabase.from("direcciones").select("*").order("name"),
    ]);
    clearTimeout(slowTimer);
    if (Array.isArray(initRes)) setInitiatives(initRes);
    if (vpRes.data) setVps(vpRes.data);
    if (dirRes.data) setDirecciones(dirRes.data);
    setLoading(false);
    setSlowLoad(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Derived filter options ─────────────────────────────────────────────────

  // Unique BPs (Vicepresidentes de Negocio)
  const bpOptions = useMemo(() => {
    const names = initiatives.map(ini => {
      const vpName = ini.form_data?.vicepresidencia;
      const vp = vps.find(v => v.name === vpName);
      return vp?.bp_name;
    }).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort();
  }, [initiatives, vps]);

  // Unique VPs
  const vpOptions = useMemo(() => {
    const names = initiatives.map(ini => ini.form_data?.vicepresidencia).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort();
  }, [initiatives]);

  // Unique Direcciones
  const dirOptions = useMemo(() => {
    const names = initiatives.map(ini => ini.form_data?.direccion).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort();
  }, [initiatives]);

  // Unique BP TI (bp_ti_asignado)
  const bpTiOptions = useMemo(() => {
    const names = initiatives.map(i => getBPTI(i)).filter(Boolean) as string[];
    const list = Array.from(new Set(names)).sort();
    if (initiatives.some(i => !getBPTI(i))) {
      list.push("Sin asignar");
    }
    return list;
  }, [initiatives]);

  // Unique Líderes de Dominio (LD)
  const ldOptions = useMemo(() => {
    const names = initiatives.map(i => getLD(i)).filter(Boolean) as string[];
    const list = Array.from(new Set(names)).sort();
    if (initiatives.some(i => !getLD(i))) {
      list.push("Sin asignar");
    }
    return list;
  }, [initiatives]);

  // Unique Statuses
  const statusOptions = useMemo(() => {
    const statuses = initiatives.map(i => i.status).filter(Boolean) as string[];
    return Array.from(new Set(statuses)).sort();
  }, [initiatives]);

  const handleBPChange = (val: string[]) => { setFilterBP(val); setPage(1); };
  const handleVPChange = (val: string[]) => { setFilterVP(val); setPage(1); };
  const handleDirChange = (val: string[]) => { setFilterDir(val); setPage(1); };
  const handleBPTIChange = (val: string[]) => { setFilterBPTI(val); setPage(1); };
  const handleLDChange = (val: string[]) => { setFilterLD(val); setPage(1); };
  const handleStatusChange = (val: string[]) => { setFilterStatus(val); setPage(1); };

  const clearFilters = () => {
    setFilterBP([]);
    setFilterVP([]);
    setFilterDir([]);
    setFilterBPTI([]);
    setFilterLD([]);
    setFilterStatus([]);
    setSearchText("");
    setPage(1);
  };

  const hasActiveFilters =
    filterBP.length > 0 || filterVP.length > 0 ||
    filterDir.length > 0 || filterBPTI.length > 0 ||
    filterLD.length > 0 || filterStatus.length > 0 ||
    searchText !== "";

  // ── Filtered initiatives ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return initiatives.filter(ini => {
      const fd = ini.form_data ?? {};
      const vpName = fd.vicepresidencia ?? "";
      const dirName = fd.direccion ?? "";
      const bpTi = getBPTI(ini);
      const ld = getLD(ini);

      // BP filter (Vicepresidente de Negocio)
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
        if (!bpTi) {
          if (!filterBPTI.includes("Sin asignar")) return false;
        } else {
          if (!filterBPTI.includes(bpTi)) return false;
        }
      }
      // LD filter
      if (filterLD.length > 0) {
        if (!ld) {
          if (!filterLD.includes("Sin asignar")) return false;
        } else {
          if (!filterLD.includes(ld)) return false;
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
        if (
          !title.includes(q) &&
          !ini.id.toLowerCase().includes(q) &&
          !vpName.toLowerCase().includes(q) &&
          !dirName.toLowerCase().includes(q) &&
          !bpTi.toLowerCase().includes(q) &&
          !ld.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [initiatives, vps, filterBP, filterVP, filterDir, filterBPTI, filterLD, filterStatus, searchText]);

  // ── Global KPIs ────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_STATUSES.forEach(s => { counts[s] = 0; });
    filtered.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });
    return {
      total: filtered.length,
      enDemanda: counts["En demanda"] ?? 0,
      pendientes: counts["Pendiente de aprobación"] ?? 0,
      observadas: counts["Observada"] ?? 0,
      desestimadas: counts["Desestimada"] ?? 0,
      borradores: counts["Borrador"] ?? 0,
      porEstado: counts,
    };
  }, [filtered]);

  // ── Groupings for the 5 Perspectives ───────────────────────────────────────

  // 1. Group by VP
  const vpGroups = useMemo(() => {
    const map = new Map<string, Initiative[]>();
    filtered.forEach(i => {
      const key = i.form_data?.vicepresidencia || "Sin Vicepresidencia";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return Array.from(map.entries()).map(([name, inits]) => {
      const vpObj = vps.find(v => v.name === name);
      const statusCount: Record<string, number> = {};
      inits.forEach(i => { statusCount[i.status] = (statusCount[i.status] ?? 0) + 1; });
      return {
        key: name,
        title: name,
        subtitle: vpObj?.bp_name ? `Vicepresidente: ${vpObj.bp_name}` : undefined,
        total: inits.length,
        statusCount,
        inits,
        pct: filtered.length > 0 ? Math.round((inits.length / filtered.length) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);
  }, [filtered, vps]);

  // 2. Group by Dirección
  const dirGroups = useMemo(() => {
    const map = new Map<string, Initiative[]>();
    filtered.forEach(i => {
      const key = i.form_data?.direccion || "Sin Dirección Asignada";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return Array.from(map.entries()).map(([name, inits]) => {
      const parentVP = inits[0]?.form_data?.vicepresidencia || "Vicepresidencia no especificada";
      const statusCount: Record<string, number> = {};
      inits.forEach(i => { statusCount[i.status] = (statusCount[i.status] ?? 0) + 1; });
      return {
        key: name,
        title: name,
        subtitle: `Vicepresidencia: ${parentVP}`,
        total: inits.length,
        statusCount,
        inits,
        pct: filtered.length > 0 ? Math.round((inits.length / filtered.length) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // 3. Group by BP TI
  const bptiGroups = useMemo(() => {
    const map = new Map<string, Initiative[]>();
    filtered.forEach(i => {
      const bp = getBPTI(i);
      const key = bp ? bp : "Pendiente de Asignación BP TI";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return Array.from(map.entries()).map(([name, inits]) => {
      const statusCount: Record<string, number> = {};
      inits.forEach(i => { statusCount[i.status] = (statusCount[i.status] ?? 0) + 1; });
      const isUnassigned = name.includes("Pendiente");
      return {
        key: name,
        title: name,
        subtitle: isUnassigned ? "Iniciativas en espera de asignación de Business Partner TI" : "Business Partner de TI Responsable",
        total: inits.length,
        statusCount,
        inits,
        isUnassigned,
        pct: filtered.length > 0 ? Math.round((inits.length / filtered.length) * 100) : 0,
      };
    }).sort((a, b) => {
      if (a.isUnassigned) return -1;
      if (b.isUnassigned) return 1;
      return b.total - a.total;
    });
  }, [filtered]);

  // 4. Group by Líder de Dominio (LD)
  const ldGroups = useMemo(() => {
    const map = new Map<string, Initiative[]>();
    filtered.forEach(i => {
      const ld = getLD(i);
      const key = ld ? ld : "Sin Asignar / Pendiente de LD";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return Array.from(map.entries()).map(([name, inits]) => {
      const statusCount: Record<string, number> = {};
      inits.forEach(i => { statusCount[i.status] = (statusCount[i.status] ?? 0) + 1; });
      const isUnassigned = name.includes("Sin Asignar");
      return {
        key: name,
        title: name,
        subtitle: isUnassigned ? "Iniciativas en etapa de Demanda TI sin Líder de Dominio designado" : "Líder Técnico de Dominio Asignado",
        total: inits.length,
        statusCount,
        inits,
        isUnassigned,
        pct: filtered.length > 0 ? Math.round((inits.length / filtered.length) * 100) : 0,
      };
    }).sort((a, b) => {
      if (a.isUnassigned) return -1;
      if (b.isUnassigned) return 1;
      return b.total - a.total;
    });
  }, [filtered]);

  // 5. Group by Estado (Lifecycle Pipeline)
  const estadoGroups = useMemo(() => {
    return ALL_STATUSES.map(status => {
      const inits = filtered.filter(i => i.status === status);
      const statusCount: Record<string, number> = { [status]: inits.length };
      return {
        key: status,
        title: status,
        subtitle: `Etapa del ciclo de vida en IACS`,
        total: inits.length,
        statusCount,
        inits,
        pct: filtered.length > 0 ? Math.round((inits.length / filtered.length) * 100) : 0,
      };
    });
  }, [filtered]);

  // ── Pagination for Table tab ───────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpiCards = [
    {
      label: "Total Iniciativas", value: kpis.total, icon: Activity,
      color: "text-[#4F5AF5]", bg: "bg-[#EEF2FF]", border: "border-[#C7D2FE]",
      gradient: "from-[#4F5AF5]/10 to-transparent"
    },
    {
      label: "En demanda", value: kpis.enDemanda, icon: CheckCircle,
      color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",
      gradient: "from-emerald-500/10 to-transparent"
    },
    {
      label: "Pendientes de aprobación", value: kpis.pendientes, icon: Clock,
      color: "text-[#4F5AF5]", bg: "bg-[#EEF2FF]", border: "border-[#C7D2FE]",
      gradient: "from-[#4F5AF5]/10 to-transparent"
    },
    {
      label: "Observadas", value: kpis.observadas, icon: AlertTriangle,
      color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200",
      gradient: "from-amber-500/10 to-transparent"
    },
    {
      label: "Desestimadas", value: kpis.desestimadas, icon: Ban,
      color: "text-red-600", bg: "bg-red-50", border: "border-red-200",
      gradient: "from-red-500/10 to-transparent"
    },
    {
      label: "Borradores", value: kpis.borradores, icon: FileText,
      color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200",
      gradient: "from-slate-500/10 to-transparent"
    },
  ];

  // Helper to toggle accordion
  const toggleGroup = (key: string) => {
    setExpandedGroup(prev => prev === key ? null : key);
  };

  // ── Render Group Card Component ────────────────────────────────────────────
  const renderPerspectiveGroup = (group: any, icon: any) => {
    const Icon = icon;
    const isExpanded = expandedGroup === group.key;

    return (
      <div
        key={group.key}
        className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
          group.isUnassigned
            ? "border-amber-300 bg-amber-50/20"
            : isExpanded
            ? "border-[#4F5AF5]/50 ring-1 ring-[#4F5AF5]/20 shadow-md"
            : "border-[#E2E8F0] hover:border-[#CBD5E1]"
        }`}
      >
        {/* Group Header */}
        <div
          onClick={() => toggleGroup(group.key)}
          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none transition-colors hover:bg-slate-50/60"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              group.isUnassigned ? "bg-amber-100 text-amber-700" : "bg-indigo-50 text-[#4F5AF5]"
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-[#1E293B] truncate leading-tight">
                  {group.title}
                </h4>
                {group.isUnassigned && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md">
                    Atención Requerida
                  </span>
                )}
              </div>
              {group.subtitle && (
                <p className="text-xs text-[#64748B] mt-0.5 truncate">{group.subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
            <div className="text-right">
              <div className="flex items-baseline gap-1.5 justify-end">
                <span className="text-xl font-black text-[#1E293B]">{group.total}</span>
                <span className="text-xs font-semibold text-[#94A3B8]">
                  ({group.pct}%)
                </span>
              </div>
              <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">Iniciativas</p>
            </div>

            <button
              type="button"
              className={`w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-transform duration-200 ${
                isExpanded ? "rotate-180 bg-indigo-50 text-[#4F5AF5] border-indigo-200" : ""
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Distribution Pills */}
        <div className="px-5 pb-3.5 pt-1 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap bg-slate-50/40">
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(group.statusCount as Record<string, number>).map(([st, cnt]) => {
              const cfg = STATUS_CONFIG[st] ?? STATUS_CONFIG["Borrador"];
              return (
                <span
                  key={st}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {Number(cnt)} {st}
                </span>
              );
            })}
          </div>

          <span className="text-[11px] font-semibold text-[#4F5AF5] hover:text-[#3F49E0] transition-colors cursor-pointer" onClick={() => toggleGroup(group.key)}>
            {isExpanded ? "Ocultar iniciativas ↑" : `Ver ${group.total} iniciativas ↓`}
          </span>
        </div>

        {/* Accordion Initiatives List */}
        {isExpanded && (
          <div className="border-t border-slate-200 bg-white p-4 space-y-2 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 divide-y divide-slate-100">
              {group.inits.map((ini: Initiative) => {
                const title = getTitle(ini);
                const cfg = STATUS_CONFIG[ini.status] ?? STATUS_CONFIG["Borrador"];
                const bp = getBPTI(ini);
                const ld = getLD(ini);

                return (
                  <div
                    key={ini.id}
                    className="py-3 px-3 hover:bg-slate-50/80 rounded-xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {ini.status}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">#{ini.summary?.id_corta || ini.id.slice(0, 8)}</span>
                        <span className="text-xs text-slate-400">• {formatDate(ini.created_at)}</span>
                      </div>
                      <h5 
                        onClick={() => setSelectedInitiative(ini)}
                        className="text-sm font-semibold text-slate-800 hover:text-[#4F5AF5] transition-colors cursor-pointer line-clamp-1"
                      >
                        {String(title)}
                      </h5>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                        {ini.form_data?.vicepresidencia && (
                          <span>VP: <strong className="text-slate-700">{ini.form_data.vicepresidencia}</strong></span>
                        )}
                        {ini.form_data?.direccion && (
                          <span>Dir: <strong className="text-slate-700">{ini.form_data.direccion}</strong></span>
                        )}
                        <span>BP TI: <strong className={bp ? "text-slate-700" : "text-amber-600"}>{bp || "Sin Asignar"}</strong></span>
                        <span>LD: <strong className={ld ? "text-indigo-700" : "text-slate-400 italic"}>{ld || "Sin Asignar"}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedInitiative(ini)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-[#4F5AF5] transition-colors cursor-pointer"
                        title="Ver vista previa rápida"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Vista rápida
                      </button>
                      <Link
                        to={`/iniciativa/${ini.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#4F5AF5] hover:bg-[#3F49E0] text-xs font-semibold text-white transition-colors cursor-pointer shadow-2xs"
                      >
                        Abrir
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 text-[#4F5AF5] border border-indigo-100">
              Centro de Control Estratégico
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">• 5 Perspectivas Ejecutivas</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1E293B]">Dashboard Ejecutivo</h2>
          <p className="text-[#64748B] text-sm mt-0.5">
            Gobernanza y trazabilidad estratégica de iniciativas por Vicepresidencia, Dirección, BP TI, Líder de Dominio y Estados.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar datos
          </button>
          <Link
            to="/bandeja"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F5AF5] hover:bg-[#3F49E0] rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Bandeja
          </Link>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.04)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#4F5AF5]" />
            <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Filtros Cruzados</span>
            <span className="text-[11px] text-slate-400 font-medium">({filtered.length} iniciativas filtradas)</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchText}
              onChange={e => { setSearchText(e.target.value); setPage(1); }}
              placeholder="Buscar por texto..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] outline-none focus:border-[#4F5AF5] focus:bg-white transition-colors text-slate-800"
            />
          </div>

          {/* Vicepresidente de Negocio */}
          <MultiSelect
            label="Vicepresidente Negocio"
            placeholder="Todos los Sponsors"
            options={bpOptions}
            selected={filterBP}
            onChange={handleBPChange}
          />

          {/* VP */}
          <MultiSelect
            label="Vicepresidencia"
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
            label="BP TI Asignado"
            placeholder="Todos los BP TI"
            options={bpTiOptions}
            selected={filterBPTI}
            onChange={handleBPTIChange}
          />

          {/* Líder de Dominio (LD) */}
          <MultiSelect
            label="Líder de Dominio (LD)"
            placeholder="Todos los LDs"
            options={ldOptions}
            selected={filterLD}
            onChange={handleLDChange}
          />

          {/* Estado */}
          <MultiSelect
            label="Estado del Ciclo"
            placeholder="Todos los Estados"
            options={statusOptions}
            selected={filterStatus}
            onChange={handleStatusChange}
          />
        </div>

        {hasActiveFilters && (
          <div className="pt-2 border-t border-[#F1F5F9] flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mr-1">Activos:</span>
            {filterBP.map(bp => (
              <span key={bp} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[#4F5AF5] text-[11px] font-semibold">
                Sponsor: {bp}
                <button onClick={() => handleBPChange(filterBP.filter(x => x !== bp))} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filterVP.map(vp => (
              <span key={vp} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[#4F5AF5] text-[11px] font-semibold">
                VP: {vp}
                <button onClick={() => handleVPChange(filterVP.filter(x => x !== vp))} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filterDir.map(dir => (
              <span key={dir} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[#4F5AF5] text-[11px] font-semibold">
                Dir: {dir}
                <button onClick={() => handleDirChange(filterDir.filter(x => x !== dir))} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filterBPTI.map(bp => (
              <span key={bp} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[#4F5AF5] text-[11px] font-semibold">
                BP TI: {bp}
                <button onClick={() => handleBPTIChange(filterBPTI.filter(x => x !== bp))} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filterLD.map(ld => (
              <span key={ld} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[#4F5AF5] text-[11px] font-semibold">
                LD: {ld}
                <button onClick={() => handleLDChange(filterLD.filter(x => x !== ld))} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filterStatus.map(st => (
              <span key={st} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
                Estado: {st}
                <button onClick={() => handleStatusChange(filterStatus.filter(x => x !== st))} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-[#E2E8F0] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map(k => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className={`bg-white rounded-xl border ${k.border} shadow-[0_1px_3px_rgba(0,0,0,.04)] p-4 relative overflow-hidden group hover:shadow-md transition-all`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${k.gradient} opacity-60`} />
                <div className="relative">
                  <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-2.5`}>
                    <Icon className={`w-4 h-4 ${k.color}`} />
                  </div>
                  <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mt-0.5 leading-tight">{k.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Navigation Tabs: 5 Executive Perspectives + Matriz General ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.04)] p-1.5 flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => { setActiveTab("vp"); setExpandedGroup(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "vp"
              ? "bg-[#4F5AF5] text-white shadow-sm"
              : "text-slate-600 hover:text-[#4F5AF5] hover:bg-slate-50"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Por Vicepresidencia
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === "vp" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"}`}>
            {vpGroups.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("direccion"); setExpandedGroup(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "direccion"
              ? "bg-[#4F5AF5] text-white shadow-sm"
              : "text-slate-600 hover:text-[#4F5AF5] hover:bg-slate-50"
          }`}
        >
          <Layers className="w-4 h-4" />
          Por Dirección
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === "direccion" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"}`}>
            {dirGroups.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("bpti"); setExpandedGroup(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "bpti"
              ? "bg-[#4F5AF5] text-white shadow-sm"
              : "text-slate-600 hover:text-[#4F5AF5] hover:bg-slate-50"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Por BP TI Asignado
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === "bpti" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"}`}>
            {bptiGroups.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("ld"); setExpandedGroup(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "ld"
              ? "bg-[#4F5AF5] text-white shadow-sm"
              : "text-slate-600 hover:text-[#4F5AF5] hover:bg-slate-50"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Por Líder de Dominio (LD)
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === "ld" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"}`}>
            {ldGroups.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("estado"); setExpandedGroup(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "estado"
              ? "bg-[#4F5AF5] text-white shadow-sm"
              : "text-slate-600 hover:text-[#4F5AF5] hover:bg-slate-50"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Por Estados (Ciclo)
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === "estado" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"}`}>
            {ALL_STATUSES.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("tabla"); setExpandedGroup(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ml-auto ${
            activeTab === "tabla"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Matriz Completa
        </button>
      </div>

      {/* ── Perspective Content ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <Activity className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <h4 className="text-base font-bold text-slate-700">No hay iniciativas para los filtros seleccionados</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Intenta cambiar los parámetros en la barra superior o limpiar los filtros activos.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-[#4F5AF5] text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tab 1: Por Vicepresidencia */}
          {activeTab === "vp" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-500 font-medium">
                  Mostrando <strong>{vpGroups.length}</strong> Vicepresidencias con iniciativas activas
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedGroup(expandedGroup ? null : (vpGroups[0]?.key || null))}
                  className="text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold cursor-pointer"
                >
                  {expandedGroup ? "Colapsar todo" : "Desplegar primera VP"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3.5">
                {vpGroups.map(grp => renderPerspectiveGroup(grp, Building2))}
              </div>
            </div>
          )}

          {/* Tab 2: Por Dirección */}
          {activeTab === "direccion" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-500 font-medium">
                  Mostrando <strong>{dirGroups.length}</strong> Direcciones organizacionales
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedGroup(expandedGroup ? null : (dirGroups[0]?.key || null))}
                  className="text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold cursor-pointer"
                >
                  {expandedGroup ? "Colapsar todo" : "Desplegar primera Dirección"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3.5">
                {dirGroups.map(grp => renderPerspectiveGroup(grp, Layers))}
              </div>
            </div>
          )}

          {/* Tab 3: Por Asignación BP TI */}
          {activeTab === "bpti" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-500 font-medium">
                  Balance de carga de trabajo por <strong>{bptiGroups.length}</strong> Business Partners de TI
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedGroup(expandedGroup ? null : (bptiGroups[0]?.key || null))}
                  className="text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold cursor-pointer"
                >
                  {expandedGroup ? "Colapsar todo" : "Desplegar primer grupo"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3.5">
                {bptiGroups.map(grp => renderPerspectiveGroup(grp, Briefcase))}
              </div>
            </div>
          )}

          {/* Tab 4: Por Líder de Dominio (LD) */}
          {activeTab === "ld" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-500 font-medium">
                  Cartera técnica asignada a <strong>{ldGroups.length}</strong> Líderes de Dominio (LD)
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedGroup(expandedGroup ? null : (ldGroups[0]?.key || null))}
                  className="text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold cursor-pointer"
                >
                  {expandedGroup ? "Colapsar todo" : "Desplegar primer grupo"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3.5">
                {ldGroups.map(grp => renderPerspectiveGroup(grp, UserCheck))}
              </div>
            </div>
          )}

          {/* Tab 5: Por Estados (Ciclo de Vida) */}
          {activeTab === "estado" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-500 font-medium">
                  Distribución en los <strong>{estadoGroups.length}</strong> estados del ciclo corporativo
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedGroup(expandedGroup ? null : (estadoGroups[0]?.key || null))}
                  className="text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold cursor-pointer"
                >
                  {expandedGroup ? "Colapsar todo" : "Desplegar primer estado"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3.5">
                {estadoGroups.map(grp => renderPerspectiveGroup(grp, BarChart3))}
              </div>
            </div>
          )}

          {/* Tab 6: Matriz General / Tabla */}
          {activeTab === "tabla" && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.06)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#4F5AF5]" />
                  <h3 className="text-sm font-bold text-[#1E293B]">
                    Iniciativas Consolidadas
                    <span className="ml-2 text-xs font-normal text-[#94A3B8]">
                      ({filtered.length} total{filtered.length !== 1 ? "es" : ""})
                    </span>
                  </h3>
                </div>
                <Link
                  to="/bandeja"
                  className="flex items-center gap-1 text-xs font-semibold text-[#4F5AF5] hover:text-[#3F49E0] transition-colors cursor-pointer"
                >
                  Abrir en Bandeja de Aprobación <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_130px_130px_130px_130px_130px_90px_80px] gap-3 px-6 py-3 bg-[#F8FAFC] border-b border-[#F1F5F9] text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                <span>Título</span>
                <span>Vicepresidencia</span>
                <span>Dirección</span>
                <span>BP TI</span>
                <span>Líder Dominio</span>
                <span>Estado</span>
                <span>Fecha</span>
                <span className="text-center">Detalle</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#F8FAFC]">
                {paginated.map(ini => {
                  const cfg = STATUS_CONFIG[ini.status] ?? STATUS_CONFIG["Borrador"];
                  const title = getTitle(ini);
                  const fd = ini.form_data ?? {};
                  const bp = getBPTI(ini);
                  const ld = getLD(ini);

                  return (
                    <div
                      key={ini.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_130px_130px_130px_130px_130px_90px_80px] gap-2 md:gap-3 px-6 py-3.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer group items-center"
                      onClick={() => setSelectedInitiative(ini)}
                    >
                      {/* Title */}
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-semibold text-[#1E293B] truncate group-hover:text-[#4F5AF5] transition-colors">
                          {String(title)}
                        </p>
                        <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">#{ini.summary?.id_corta || ini.id.slice(0, 8)}</p>
                      </div>

                      {/* VP */}
                      <div className="min-w-0">
                        <p className="text-xs text-[#334155] truncate font-medium" title={fd.vicepresidencia}>
                          {fd.vicepresidencia || <span className="text-[#CBD5E1]">—</span>}
                        </p>
                      </div>

                      {/* Dirección */}
                      <div className="min-w-0">
                        <p className="text-xs text-[#334155] truncate font-medium" title={fd.direccion}>
                          {fd.direccion || <span className="text-[#CBD5E1]">—</span>}
                        </p>
                      </div>

                      {/* BP TI */}
                      <div className="min-w-0">
                        <p className={`text-xs truncate font-medium ${bp ? 'text-slate-700' : 'text-amber-600 italic'}`} title={bp}>
                          {bp || "Pendiente"}
                        </p>
                      </div>

                      {/* LD */}
                      <div className="min-w-0">
                        <p className={`text-xs truncate font-medium ${ld ? 'text-indigo-700 font-semibold' : 'text-slate-400 italic'}`} title={ld}>
                          {ld || "Sin Asignar"}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="min-w-0">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border} truncate max-w-full`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className="truncate">{ini.status}</span>
                        </span>
                      </div>

                      {/* Date */}
                      <div className="min-w-0">
                        <p className="text-xs text-[#94A3B8]">{formatDate(ini.created_at)}</p>
                      </div>

                      {/* Action */}
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setSelectedInitiative(ini); }}
                          className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:bg-[#EEF2FF] hover:text-[#4F5AF5] hover:border-[#C7D2FE] transition-colors cursor-pointer"
                          title="Ver detalle rápido"
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
                      className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
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
                      className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
