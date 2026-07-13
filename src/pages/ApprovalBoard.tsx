import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Filter, Eye, ChevronRight, User, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
  const [slowLoad, setSlowLoad] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("nueva");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedRegistradores, setSelectedRegistradores] = useState<string[]>([]);
  const [selectedDirecciones, setSelectedDirecciones] = useState<string[]>([]);
  const [selectedBPs, setSelectedBPs] = useState<string[]>([]);
  const [selectedVicepresidencias, setSelectedVicepresidencias] = useState<string[]>([]);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ field: "solicitud" | "fecha" | "key_user" | "bp" | "estado"; order: "asc" | "desc" } | null>(null);

  const { profile } = useAuth();
  const [direccionesMap, setDireccionesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // Show a helpful message if loading takes more than 4 seconds (Render cold start)
    const slowTimer = setTimeout(() => setSlowLoad(true), 4000);

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
      .finally(() => { clearTimeout(slowTimer); setLoading(false); setSlowLoad(false); });

    return () => clearTimeout(slowTimer);
  }, []);

  const handleStatusChange = async (initiativeId: string, newStatus: string) => {
    try {
      const currentInit = initiatives.find(i => i.id === initiativeId);
      if (!currentInit) return;

      const currentFormData = (currentInit.form_data || {}) as any;
      const history = Array.isArray(currentFormData._observation_history)
        ? currentFormData._observation_history
        : [];

      let userRole = 'Sistema';
      if (isAdmin) userRole = 'Administrador';
      else if (isBP) userRole = 'BP TI';
      else if (profile?.profile_roles?.some((r: any) => r.role === 'registrador')) userRole = 'Key user';

      const newHistoryEntry = {
        date: new Date().toISOString(),
        user_name: profile?.name || 'Desconocido',
        user_role: userRole,
        action: `Cambio de estado`,
        details: `Se cambió el estado de '${currentInit.status}' a '${newStatus}' desde la bandeja de revisión.`,
      };

      const updatedFormData = {
        ...currentFormData,
        _observation_history: [...history, newHistoryEntry]
      };

      const response = await fetch(`/api/initiatives/${initiativeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: newStatus,
          form_data: updatedFormData
        }),
      });
      if (!response.ok) {
        throw new Error("Error al actualizar el estado");
      }
      const updatedData = await response.json();
      setInitiatives(prev => prev.map(i => i.id === initiativeId ? { ...i, status: updatedData.status, form_data: updatedData.form_data } : i));
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el estado de la iniciativa.");
    } finally {
      setEditingStatusId(null);
    }
  };

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

    // Check if the current user is the owner of the draft/initiative (legacy by name or new by user_id)
    const isMine = i.user_id === profile?.id || i.form_data?.registrador === profile?.name;

    // A user should always see their own drafts regardless of their other roles
    if (STATUS_MAP[i.status] === "borrador") {
      return isMine;
    }

    if (isBP) {
      const tab = STATUS_MAP[i.status];
      const dir = i.form_data?.direccion;
      const isMyDir = dir && bpAllowedDirNames.has(dir);
      // BPs see new, approved, observed or dismissed initiatives in their assigned directories, OR their own items
      return ((tab === "nueva" || tab === "aprobada" || tab === "subsanacion" || tab === "desestimada") && isMyDir) || isMine;
    }

    if (isRegistrador) {
      const tab = STATUS_MAP[i.status];
      if (tab === "desestimada") return isMine;
      const dir = i.form_data?.direccion;
      const isMyDir = dir && userAllowedDirNames.has(dir);
      return isMine || isMyDir;
    }
    return false;
  });

  const visibleTabs = TABS.filter(tab => {
    if (isAdmin || isInvitado) return true;
    
    // If the user has a registrador role, they can see the draft tab
    if (isRegistrador) return true;

    // If the user is only a BP, they don't see drafts unless they've created one (we'll show the tab if they have one, or if they have the role)
    if (isBP) {
      if (tab.key === "borrador") {
        // Only show draft tab for BP if they have at least one draft initiative
        return initiatives.some(i => i.status === "Borrador" && (i.user_id === profile?.id || i.form_data?.registrador === profile?.name));
      }
      return tab.key === "nueva" || tab.key === "aprobada" || tab.key === "desestimada" || tab.key === "subsanacion";
    }
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
    
    // 1. Filter by "Mis iniciativas"
    if (showOnlyMine) {
      const isMine = i.user_id === profile?.id || i.form_data?.registrador === profile?.name;
      if (!isMine) return false;
    }

    // 2. Filter by Search Query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      
      const idMatch = i.id.toLowerCase().includes(query);
      
      const summaryMatch = i.summary ? Object.values(i.summary).some(val => 
        String(val).toLowerCase().includes(query)
      ) : false;
      
      const formDataMatch = i.form_data ? Object.values(i.form_data).some(val => 
        String(val).toLowerCase().includes(query)
      ) : false;
      
      if (!idMatch && !summaryMatch && !formDataMatch) return false;
    }

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

  const sortedAndFiltered = useMemo(() => {
    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortConfig.field) {
        case "solicitud":
          valA = a.summary?.titulo ?? Object.values(a.form_data ?? {})[0] ?? a.id;
          valB = b.summary?.titulo ?? Object.values(b.form_data ?? {})[0] ?? b.id;
          break;
        case "fecha":
          valA = a.created_at || "";
          valB = b.created_at || "";
          break;
        case "key_user":
          valA = a.form_data?.registrador || a.form_data?.solicitante || "";
          valB = b.form_data?.registrador || b.form_data?.solicitante || "";
          break;
        case "bp":
          valA = a.form_data?.bp_ti_asignado || "";
          valB = b.form_data?.bp_ti_asignado || "";
          break;
        case "estado":
          valA = a.status || "";
          valB = b.status || "";
          break;
      }

      let comparison = 0;
      if (typeof valA === "string" && typeof valB === "string") {
        comparison = valA.localeCompare(valB, "es", { sensitivity: "base", numeric: true });
      } else {
        if (valA < valB) comparison = -1;
        if (valA > valB) comparison = 1;
      }

      return sortConfig.order === "asc" ? comparison : -comparison;
    });
  }, [filtered, sortConfig]);

  const handleSort = (field: "solicitud" | "fecha" | "key_user" | "bp" | "estado") => {
    setSortConfig(prev => {
      if (prev && prev.field === field) {
        if (prev.order === "asc") {
          return { field, order: "desc" };
        }
        return null;
      }
      return { field, order: "asc" };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B]">4. Revisión BP</h2>
          <p className="text-sm text-[#64748B]">El BP revisa la solicitud en esta pantalla dentro del mismo sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Visible Filters, Search and "Mis iniciativas" */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3 mb-2">
            <h3 className="font-bold text-sm text-[#1E293B] flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[#4F5AF5]" />
              Filtros y Búsqueda
            </h3>
            {(selectedRegistradores.length > 0 || selectedDirecciones.length > 0 || selectedBPs.length > 0 || selectedVicepresidencias.length > 0 || showOnlyMine || searchQuery !== "") && (
              <button 
                onClick={() => { 
                  setSelectedRegistradores([]); 
                  setSelectedDirecciones([]); 
                  setSelectedBPs([]); 
                  setSelectedVicepresidencias([]); 
                  setShowOnlyMine(false);
                  setSearchQuery("");
                }}
                className="text-xs font-semibold text-[#4F5AF5] hover:text-[#3F49E0] transition-colors"
              >
                Limpiar Todo
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Búsqueda de Contenido</label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por título, objetivo, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-[#E2E8F0] focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5] focus:outline-none placeholder-[#94A3B8] shadow-inner transition-all"
              />
            </div>
          </div>

          {/* "Mis iniciativas" Button */}
          <button
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
              showOnlyMine 
                ? "bg-[#4F5AF5] text-white border-[#4F5AF5] shadow-sm shadow-[#4F5AF5]/20" 
                : "bg-white text-[#4F5AF5] border-[#E2E8F0] hover:bg-[#F8FAFC]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {showOnlyMine ? "Viendo: Mis Iniciativas" : "Ver solo Mis Iniciativas"}
          </button>

          {/* Vicepresidencia */}
          <div className="space-y-1.5 pt-3 border-t">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Vicepresidencia</label>
            <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {vicepresidenciasOptions.map(vp => (
                <label key={vp} className="flex items-center gap-2.5 text-xs text-[#1E293B] hover:bg-[#F8FAFC] p-1 rounded cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedVicepresidencias.includes(vp)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedVicepresidencias(prev => [...prev, vp]);
                      else setSelectedVicepresidencias(prev => prev.filter(v => v !== vp));
                    }}
                    className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate leading-none">{vp}</span>
                </label>
              ))}
              {vicepresidenciasOptions.length === 0 && <p className="text-[10px] text-[#94A3B8] italic">Sin opciones</p>}
            </div>
          </div>

          {/* Key user */}
          <div className="space-y-1.5 pt-3 border-t">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Key user</label>
            <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {registradoresOptions.map(reg => (
                <label key={reg} className="flex items-center gap-2.5 text-xs text-[#1E293B] hover:bg-[#F8FAFC] p-1 rounded cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedRegistradores.includes(reg)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRegistradores(prev => [...prev, reg]);
                      else setSelectedRegistradores(prev => prev.filter(r => r !== reg));
                    }}
                    className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate leading-none">{reg}</span>
                </label>
              ))}
              {registradoresOptions.length === 0 && <p className="text-[10px] text-[#94A3B8] italic">Sin opciones</p>}
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-1.5 pt-3 border-t">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Dirección</label>
            <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {direccionesOptions.map(dir => (
                <label key={dir} className="flex items-center gap-2.5 text-xs text-[#1E293B] hover:bg-[#F8FAFC] p-1 rounded cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedDirecciones.includes(dir)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedDirecciones(prev => [...prev, dir]);
                      else setSelectedDirecciones(prev => prev.filter(d => d !== dir));
                    }}
                    className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate leading-none">{direccionesMap[dir] || dir}</span>
                </label>
              ))}
              {direccionesOptions.length === 0 && <p className="text-[10px] text-[#94A3B8] italic">Sin opciones</p>}
            </div>
          </div>

          {/* BP TI */}
          <div className="space-y-1.5 pt-3 border-t">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">BP TI</label>
            <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {bpsOptions.map(bp => (
                <label key={bp} className="flex items-center gap-2.5 text-xs text-[#1E293B] hover:bg-[#F8FAFC] p-1 rounded cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedBPs.includes(bp)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedBPs(prev => [...prev, bp]);
                      else setSelectedBPs(prev => prev.filter(b => b !== bp));
                    }}
                    className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate leading-none">{bp}</span>
                </label>
              ))}
              {bpsOptions.length === 0 && <p className="text-[10px] text-[#94A3B8] italic">Sin opciones</p>}
            </div>
          </div>
        </div>

        {/* Right Side: Status Tabs + Table */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
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
            <div className="flex flex-col justify-center items-center gap-3 py-16 text-[#94A3B8]">
              <div className="w-5 h-5 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
              <span>Cargando solicitudes...</span>
              {slowLoad && (
                <div className="mt-2 text-center max-w-xs">
                  <p className="text-xs text-amber-600 font-medium">⏳ El servidor está despertando...</p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">Esto puede tardar hasta 30 segundos en la primera carga del día. Por favor espera.</p>
                </div>
              )}
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
                  <th 
                    onClick={() => handleSort('solicitud')}
                    className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider cursor-pointer hover:bg-slate-50 hover:text-slate-700 select-none group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Solicitud
                      {sortConfig?.field === 'solicitud' ? (
                        sortConfig.order === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#4F5AF5]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#4F5AF5]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('fecha')}
                    className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider cursor-pointer hover:bg-slate-50 hover:text-slate-700 select-none group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Fecha
                      {sortConfig?.field === 'fecha' ? (
                        sortConfig.order === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#4F5AF5]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#4F5AF5]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('key_user')}
                    className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider cursor-pointer hover:bg-slate-50 hover:text-slate-700 select-none group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Key user
                      {sortConfig?.field === 'key_user' ? (
                        sortConfig.order === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#4F5AF5]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#4F5AF5]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('bp')}
                    className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider cursor-pointer hover:bg-slate-50 hover:text-slate-700 select-none group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      IT Business Partner
                      {sortConfig?.field === 'bp' ? (
                        sortConfig.order === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#4F5AF5]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#4F5AF5]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('estado')}
                    className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider cursor-pointer hover:bg-slate-50 hover:text-slate-700 select-none group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Estado
                      {sortConfig?.field === 'estado' ? (
                        sortConfig.order === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#4F5AF5]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#4F5AF5]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider select-none">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {sortedAndFiltered.map(i => {
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
                        {(isBP || isAdmin) && (i.status === "Pendiente de aprobación" || i.status === "Desestimada" || i.status === "En demanda") ? (
                          editingStatusId === i.id ? (
                            <select
                              value={i.status}
                              onChange={(e) => handleStatusChange(i.id, e.target.value)}
                              onBlur={() => setEditingStatusId(null)}
                              autoFocus
                              className="text-xs font-semibold bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#4F5AF5] text-[#1E293B]"
                            >
                              {i.status === "Pendiente de aprobación" && (
                                <>
                                  <option value="Pendiente de aprobación">Pendiente de aprobación</option>
                                  <option value="En demanda">En demanda</option>
                                  <option value="Desestimada">Desestimada</option>
                                </>
                              )}
                              {i.status === "Desestimada" && (
                                <>
                                  <option value="Desestimada">Desestimada</option>
                                  <option value="En demanda">En demanda</option>
                                  <option value="Pendiente de aprobación">Pendiente de aprobación</option>
                                </>
                              )}
                              {i.status === "En demanda" && (
                                <>
                                  <option value="En demanda">En demanda</option>
                                  <option value="Pendiente de aprobación">Pendiente de aprobación</option>
                                  <option value="Desestimada">Desestimada</option>
                                </>
                              )}
                            </select>
                          ) : (
                            <span 
                              onDoubleClick={() => setEditingStatusId(i.id)}
                              title="Doble clic para cambiar estado"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer select-none hover:opacity-80 transition-opacity ${STATUS_BADGE[tabKey]}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${TABS.find(t => t.key === tabKey)?.dot}`} />
                              {STATUS_LABEL[i.status] ?? i.status}
                            </span>
                          )
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[tabKey]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${TABS.find(t => t.key === tabKey)?.dot}`} />
                            {STATUS_LABEL[i.status] ?? i.status}
                          </span>
                        )}
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
