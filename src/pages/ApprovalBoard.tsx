import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Filter, Eye, ChevronRight, User, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, X, FileText, MessageSquare, Paperclip, Building2 } from "lucide-react";
import { Initiative } from "@/src/types";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import { ExecutiveReportPDF } from "../components/ExecutiveReportPDF";
import { useReactToPrint } from "react-to-print";

interface SearchableFilterDropdownProps {
  label: string;
  options: { label: string; value: string }[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

function SearchableFilterDropdown({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Buscar..."
}: SearchableFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      opt => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const selectedCount = selectedValues.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
          selectedCount > 0
            ? "bg-[#EEF2FF] text-[#4F5AF5] border-[#4F5AF5] shadow-xs"
            : "bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
        }`}
      >
        <span className="truncate">{label}</span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedCount > 0 && (
            <span className="bg-[#4F5AF5] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {selectedCount}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180 text-[#4F5AF5]" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5] focus:outline-none placeholder-[#94A3B8]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
            {filteredOptions.length === 0 ? (
              <div className="text-[11px] text-[#94A3B8] p-2 text-center">Sin resultados</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-[#F8FAFC] cursor-pointer text-[#1E293B]"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-[#4F5AF5] border-[#4F5AF5] text-white"
                          : "border-[#CBD5E1] bg-white"
                      }`}
                    >
                      {isSelected && <span className="text-[9px] font-bold">✓</span>}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type TabKey = "nueva" | "observada" | "demand" | "draft" | "rejected";

const TABS: { key: TabKey; label: string; dot: string }[] = [
  { key: "nueva", label: "Pendientes de aprobación", dot: "bg-[#4F5AF5]" },
  { key: "observada", label: "Observadas", dot: "bg-amber-500" },
  { key: "demand", label: "En demanda", dot: "bg-emerald-500" },
  { key: "draft", label: "Borradores", dot: "bg-slate-400" },
  { key: "rejected", label: "Desestimadas", dot: "bg-red-500" },
];

const STATUS_MAP: Record<string, TabKey> = {
  "Pendiente de aprobación": "nueva",
  Observada: "observada",
  "En demanda": "demand",
  Borrador: "draft",
  Desestimada: "rejected",
};

const STATUS_BADGE: Record<TabKey, string> = {
  nueva: "bg-[#EEF2FF] text-[#4F5AF5]",
  observada: "bg-amber-50 text-amber-700",
  demand: "bg-emerald-50 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  rejected: "bg-red-50 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  "Pendiente de aprobación": "Pendiente de aprobación",
  Observada: "Observada",
  "En demanda": "En demanda",
  Borrador: "Borrador",
  Desestimada: "Desestimada",
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

  // PDF Generation State
  const [pdfInitiative, setPdfInitiative] = useState<any>(null);
  const [pdfTemplate, setPdfTemplate] = useState<string>("");
  const [chatViewInitiative, setChatViewInitiative] = useState<any | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: pdfRef,
    documentTitle: pdfInitiative ? `Informe_Ejecutivo_${pdfInitiative.summary?.id_corta || pdfInitiative.id}` : 'Informe_Ejecutivo',
  });

  const handleGeneratePdf = (init: any) => {
    setPdfInitiative(init);
    setTimeout(() => {
      handlePrint();
    }, 150);
  };

  const { profile } = useAuth();
  const [direccionesMap, setDireccionesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const slowTimer = setTimeout(() => setSlowLoad(true), 4000);

    // Cargar plantilla PDF configurada
    supabase.from('site_settings').select('pdf_template').eq('id', 1).single().then(({ data }) => {
      if (data?.pdf_template) {
        setPdfTemplate(data.pdf_template);
      }
    });

    supabase.from('direcciones').select('id, name').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(d => map[d.id] = d.name);
        setDireccionesMap(map);
      }
    });

    fetch('/api/initiatives')
      .then(async res => {
        if (!res.ok) throw new Error(`API status ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid format");
        return data;
      })
      .catch(async () => {
        const { data: inits } = await supabase.from('initiatives').select('*').order('created_at', { ascending: false });
        return inits || [];
      })
      .then(data => {
        setInitiatives(Array.isArray(data) ? data : []);
        setLoading(false);
        clearTimeout(slowTimer);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        clearTimeout(slowTimer);
      });
  }, []);

  const handleStatusChange = async (initiativeId: string, newStatus: string) => {
    try {
      const currentInit = initiatives.find(i => i.id === initiativeId);
      if (!currentInit) return;

      const currentFormData = currentInit.form_data || {};
      const history = currentFormData._observation_history || [];
      const newHistoryEntry = {
        date: new Date().toISOString(),
        author: profile?.name || "Sistema",
        action: `Cambio de Estado`,
        details: `Se cambió el estado de '${currentInit.status}' a '${newStatus}' desde la bandeja de revisión.`,
      };

      const updatedFormData = {
        ...currentFormData,
        _observation_history: [...history, newHistoryEntry]
      };

      let updated = false;
      try {
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
        if (response.ok) {
          const updatedData = await response.json();
          setInitiatives(prev => prev.map(i => i.id === initiativeId ? { ...i, status: updatedData.status, form_data: updatedData.form_data } : i));
          updated = true;
        }
      } catch (apiErr) {
        console.warn("API status update failed, attempting Supabase direct fallback:", apiErr);
      }

      if (!updated) {
        // Direct Supabase update fallback
        const { data: dbUpdated, error: sbErr } = await supabase
          .from('initiatives')
          .update({ status: newStatus, form_data: updatedFormData })
          .eq('id', initiativeId)
          .select()
          .single();
        if (!sbErr && dbUpdated) {
          setInitiatives(prev => prev.map(i => i.id === initiativeId ? dbUpdated : i));
          updated = true;
        }
      }

      if (!updated) {
        alert("No se pudo actualizar el estado de la iniciativa.");
      }
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

    const isMine = i.user_id === profile?.id || i.form_data?.registrador === profile?.name;

    if (STATUS_MAP[i.status] === "draft") {
      return isMine;
    }

    if (isMine) return true;

    if (isBP) {
      const initDir = i.form_data?.direccion;
      if (initDir && bpAllowedDirNames.has(initDir)) return true;
    }

    if (isRegistrador) {
      const initDir = i.form_data?.direccion;
      if (initDir && userAllowedDirNames.has(initDir)) return true;
    }

    return false;
  });

  const registradoresOptions = useMemo(() => {
    const set = new Set<string>();
    roleFilteredInitiatives.forEach(i => {
      const r = i.form_data?.registrador || i.form_data?.solicitante;
      if (r) set.add(r);
    });
    return Array.from(set).sort().map(val => ({ label: val, value: val }));
  }, [roleFilteredInitiatives]);

  const direccionesOptions = useMemo(() => {
    const set = new Set<string>();
    roleFilteredInitiatives.forEach(i => {
      const d = i.form_data?.direccion;
      if (d) set.add(d);
    });
    return Array.from(set).sort().map(val => ({ label: val, value: val }));
  }, [roleFilteredInitiatives]);

  const bpsOptions = useMemo(() => {
    const set = new Set<string>();
    roleFilteredInitiatives.forEach(i => {
      const bp = i.form_data?.bp_ti_asignado;
      if (bp) set.add(bp);
    });
    return Array.from(set).sort().map(val => ({ label: val, value: val }));
  }, [roleFilteredInitiatives]);

  const vicepresidenciasOptions = useMemo(() => {
    const set = new Set<string>();
    roleFilteredInitiatives.forEach(i => {
      const vp = i.form_data?.vicepresidencia;
      if (vp) set.add(vp);
    });
    return Array.from(set).sort().map(val => ({ label: val, value: val }));
  }, [roleFilteredInitiatives]);

  const filteredInitiatives = useMemo(() => {
    return roleFilteredInitiatives.filter(i => {
      if (showOnlyMine && (i.user_id !== profile?.id && i.form_data?.registrador !== profile?.name)) {
        return false;
      }
      if (selectedRegistradores.length > 0) {
        const r = i.form_data?.registrador || i.form_data?.solicitante;
        if (!r || !selectedRegistradores.includes(r)) return false;
      }
      if (selectedDirecciones.length > 0) {
        const d = i.form_data?.direccion;
        if (!d || !selectedDirecciones.includes(d)) return false;
      }
      if (selectedBPs.length > 0) {
        const bp = i.form_data?.bp_ti_asignado;
        if (!bp || !selectedBPs.includes(bp)) return false;
      }
      if (selectedVicepresidencias.length > 0) {
        const vp = i.form_data?.vicepresidencia;
        if (!vp || !selectedVicepresidencias.includes(vp)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (i.summary?.titulo ?? Object.values(i.form_data ?? {})[0] ?? "").toString().toLowerCase();
        const obj = (i.form_data?.descripcion_de_la_necesidad ?? "").toString().toLowerCase();
        const id = i.id.toLowerCase();
        if (!title.includes(q) && !obj.includes(q) && !id.includes(q)) return false;
      }
      return true;
    });
  }, [roleFilteredInitiatives, selectedRegistradores, selectedDirecciones, selectedBPs, selectedVicepresidencias, showOnlyMine, searchQuery, profile]);

  const countByTab = (tabKey: TabKey) =>
    filteredInitiatives.filter(i => (STATUS_MAP[i.status] ?? "nueva") === tabKey).length;

  const byTab = (tabKey: TabKey) =>
    filteredInitiatives.filter(i => (STATUS_MAP[i.status] ?? "nueva") === tabKey);

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
          <h2 className="text-2xl font-bold text-[#1E293B]">Bandeja de Revisión y Aprobación</h2>
          <p className="text-sm text-[#64748B]">Gestión, evaluación y seguimiento de solicitudes de necesidades de TI.</p>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#F1F5F9]">
          <h3 className="font-bold text-xs text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          <div className="relative md:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por título, objetivo, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-[#E2E8F0] focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5] focus:outline-none placeholder-[#94A3B8] bg-white font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={`md:col-span-2 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
              showOnlyMine
                ? "bg-[#EEF2FF] text-[#4F5AF5] border-[#4F5AF5] shadow-xs"
                : "bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ver solo mías</span>
          </button>

          <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <SearchableFilterDropdown
              label="Vicepresidencia"
              options={vicepresidenciasOptions}
              selectedValues={selectedVicepresidencias}
              onChange={setSelectedVicepresidencias}
              placeholder="Buscar VP..."
            />
            <SearchableFilterDropdown
              label="Key user"
              options={registradoresOptions}
              selectedValues={selectedRegistradores}
              onChange={setSelectedRegistradores}
              placeholder="Buscar Key user..."
            />
            <SearchableFilterDropdown
              label="Dirección"
              options={direccionesOptions}
              selectedValues={selectedDirecciones}
              onChange={setSelectedDirecciones}
              placeholder="Buscar dirección..."
            />
            <SearchableFilterDropdown
              label="BP TI"
              options={bpsOptions}
              selectedValues={selectedBPs}
              onChange={setSelectedBPs}
              placeholder="Buscar BP..."
            />
          </div>
        </div>
      </div>

      {/* Main Board Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        {/* Tabs navigation */}
        <div className="border-b border-[#F1F5F9] px-6 pt-4 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const count = countByTab(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-[#4F5AF5] text-[#4F5AF5]"
                    : "border-transparent text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? "bg-[#EEF2FF] text-[#4F5AF5]"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table content */}
        <div className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-[#64748B] text-sm">
              Cargando solicitudes...
              {slowLoad && (
                <p className="text-xs text-[#94A3B8] mt-2 font-medium">
                  ⏳ Conectando con la base de datos... gracias por la paciencia.
                </p>
              )}
            </div>
          ) : sortedAndFiltered.length === 0 ? (
            <div className="p-12 text-center text-[#64748B] text-sm">
              No hay solicitudes en esta sección.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th 
                    onClick={() => handleSort("solicitud")}
                    className="px-6 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Solicitud</span>
                      {sortConfig?.field === "solicitud" ? (
                        sortConfig.order === "asc" ? <ArrowUp className="w-3 h-3 text-[#4F5AF5]" /> : <ArrowDown className="w-3 h-3 text-[#4F5AF5]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("fecha")}
                    className="px-6 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Fecha</span>
                      {sortConfig?.field === "fecha" ? (
                        sortConfig.order === "asc" ? <ArrowUp className="w-3 h-3 text-[#4F5AF5]" /> : <ArrowDown className="w-3 h-3 text-[#4F5AF5]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("key_user")}
                    className="px-6 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Key User</span>
                      {sortConfig?.field === "key_user" ? (
                        sortConfig.order === "asc" ? <ArrowUp className="w-3 h-3 text-[#4F5AF5]" /> : <ArrowDown className="w-3 h-3 text-[#4F5AF5]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("bp")}
                    className="px-6 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>IT Business Partner</span>
                      {sortConfig?.field === "bp" ? (
                        sortConfig.order === "asc" ? <ArrowUp className="w-3 h-3 text-[#4F5AF5]" /> : <ArrowDown className="w-3 h-3 text-[#4F5AF5]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("estado")}
                    className="px-6 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Estado</span>
                      {sortConfig?.field === "estado" ? (
                        sortConfig.order === "asc" ? <ArrowUp className="w-3 h-3 text-[#4F5AF5]" /> : <ArrowDown className="w-3 h-3 text-[#4F5AF5]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {sortedAndFiltered.map((i) => {
                  const title = i.summary?.titulo ?? Object.values(i.form_data ?? {})[0] ?? i.id;
                  const registrador = i.form_data?.registrador || i.form_data?.solicitante || "Sin registrador";
                  const initials = registrador.split(" ").map((n: string) => n[0]).join("").substring(0, 2);
                  const tabKey = STATUS_MAP[i.status] ?? "nueva";

                  return (
                    <tr key={i.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1E293B] text-sm leading-snug max-w-[300px] truncate">{title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-mono text-[#94A3B8] bg-[#F1F5F9] px-1.5 py-0.5 rounded font-medium">{i.id}</span>
                          {i.form_data?.vicepresidencia && (
                            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100/60 px-1.5 py-0.5 rounded truncate max-w-[140px]" title={`VP: ${i.form_data.vicepresidencia}`}>
                              VP: {i.form_data.vicepresidencia}
                            </span>
                          )}
                          {i.form_data?.direccion && (
                            <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[140px]" title={`Dirección: ${i.form_data.direccion}`}>
                              {i.form_data.direccion}
                            </span>
                          )}
                        </div>
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
                          <div className="min-w-0">
                            <p className="text-sm text-[#1E293B] font-medium truncate" title={registrador}>{registrador}</p>
                            {i.form_data?.institucion && (
                              <p className="text-[10px] text-[#64748B] font-medium truncate">
                                {Array.isArray(i.form_data.institucion) ? i.form_data.institucion.join(", ") : i.form_data.institucion}
                              </p>
                            )}
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
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/iniciativa/${i.id}`}
                            className="inline-flex items-center gap-1.5 text-[#4F5AF5] hover:text-[#3F49E0] text-xs font-semibold transition-colors whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Revisar
                          </Link>

                          {((Array.isArray(i.chat_history) && i.chat_history.length > 0) || i.unstructured_text || (Array.isArray(i.form_data?.chat_history) && i.form_data.chat_history.length > 0)) && (
                            <button
                              type="button"
                              onClick={() => setChatViewInitiative(i)}
                              className="inline-flex items-center gap-1 text-[#4F5AF5] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-2 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                              title="Ver conversación con Teo / Texto inicial"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Chat IA
                            </button>
                          )}

                          {/* Botón Generar PDF (Disponible para solicitudes En demanda) */}
                          {(tabKey === "demand" || i.status === "En demanda") && (
                            <button
                              type="button"
                              onClick={() => handleGeneratePdf(i)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-semibold text-xs transition-colors whitespace-nowrap cursor-pointer"
                              title="Generar e imprimir informe ejecutivo PDF"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-600" />
                              PDF
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Read-only Chat History Modal */}
      {chatViewInitiative && (() => {
        const hist = (Array.isArray(chatViewInitiative.chat_history) && chatViewInitiative.chat_history.length > 0)
          ? chatViewInitiative.chat_history
          : (Array.isArray(chatViewInitiative.form_data?.chat_history) ? chatViewInitiative.form_data.chat_history : []);
        const rawText = chatViewInitiative.unstructured_text || chatViewInitiative.form_data?.unstructured_text || "";
        const regName = chatViewInitiative.form_data?.registrador || chatViewInitiative.form_data?.solicitante || "Key user";

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setChatViewInitiative(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                    <span className="text-[#4F5AF5] text-sm">💬</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Historial de Conversación con IA</h3>
                    <p className="text-[10px] text-[#94A3B8]">Iniciativa: {chatViewInitiative.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setChatViewInitiative(null)} 
                  className="text-[#94A3B8] hover:text-[#475569] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Conversations */}
              <div className="p-6 overflow-y-auto space-y-4 bg-slate-50 flex-grow">
                {hist.length === 0 && (!rawText || rawText.trim() === "") ? (
                  <div className="text-center py-10 text-[#94A3B8]">
                    No hay mensajes ni texto registrados en esta conversación.
                  </div>
                ) : hist.length === 0 && rawText ? (
                  <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-2">
                    <span className="text-[11px] font-bold text-[#4F5AF5] uppercase tracking-wider block">Texto original ingresado por el solicitante:</span>
                    <p className="text-xs text-[#334155] leading-relaxed whitespace-pre-wrap">{rawText}</p>
                  </div>
                ) : (
                  hist.map((msg: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col max-w-[85%] ${
                        msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <span className="text-[10px] font-semibold text-[#94A3B8] mb-1 px-1">
                        {msg.role === 'user' ? regName : 'Teo (IA)'}
                      </span>
                      <div 
                        className={`p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-[#4F5AF5] text-white rounded-tr-none' 
                            : 'bg-white text-[#334155] border border-[#E2E8F0] rounded-tl-none'
                        }`}
                      >
                        {msg.attachment && (
                          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold mb-2 w-fit ${
                            msg.role === 'user' 
                              ? 'bg-white/20 text-white' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>Archivo adjunto: {msg.attachment.name}</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-between items-center">
                <Link
                  to={`/iniciativa/${chatViewInitiative.id}`}
                  onClick={() => setChatViewInitiative(null)}
                  className="text-xs font-semibold text-[#4F5AF5] hover:underline"
                >
                  Abrir expediente completo →
                </Link>
                <button
                  onClick={() => setChatViewInitiative(null)}
                  className="bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Componente Oculto para Generación e Impresión PDF */}
      <div className="hidden">
        <ExecutiveReportPDF ref={pdfRef} initiative={pdfInitiative} template={pdfTemplate} />
      </div>
    </div>
  );
}
