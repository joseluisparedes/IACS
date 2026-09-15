import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Filter, Eye, ChevronRight, User, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, X, FileText, Building2, SlidersHorizontal, GripVertical, Copy, Check, RotateCcw } from "lucide-react";
import { Initiative } from "@/src/types";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import { ExecutiveReportPDF } from "../components/ExecutiveReportPDF";
import { useReactToPrint } from "react-to-print";
import { formatDateDDMMYYYY } from "../lib/utils";

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

export type TabKey = 
  | "todas"
  | "borrador"
  | "eval_bp"
  | "aprob_bo"
  | "aprob_vp"
  | "asig_demanda"
  | "estimacion"
  | "planificacion"
  | "observada"
  | "desestimada";

const TABS: { key: TabKey; label: string; dot: string }[] = [
  { key: "todas", label: "Todas", dot: "bg-[#4F5AF5]" },
  { key: "borrador", label: "1. Borrador", dot: "bg-slate-400" },
  { key: "eval_bp", label: "2. Viabilidad BP TI", dot: "bg-indigo-500" },
  { key: "aprob_bo", label: "3. Patrocinio BO", dot: "bg-blue-500" },
  { key: "aprob_vp", label: "4. Aprobación VP", dot: "bg-purple-500" },
  { key: "asig_demanda", label: "5. Demanda TI", dot: "bg-cyan-500" },
  { key: "estimacion", label: "6. Estimación", dot: "bg-amber-500" },
  { key: "planificacion", label: "7. Planificación", dot: "bg-emerald-500" },
  { key: "observada", label: "Observadas", dot: "bg-rose-500" },
  { key: "desestimada", label: "Desestimadas", dot: "bg-slate-500" },
];

const STATUS_BADGE: Record<TabKey, string> = {
  todas: "bg-slate-100 text-slate-700",
  borrador: "bg-slate-100 text-slate-600 border border-slate-200",
  eval_bp: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  aprob_bo: "bg-blue-50 text-blue-700 border border-blue-200",
  aprob_vp: "bg-purple-50 text-purple-700 border border-purple-200",
  asig_demanda: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  estimacion: "bg-amber-50 text-amber-700 border border-amber-200",
  planificacion: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  observada: "bg-rose-50 text-rose-700 border border-rose-200",
  desestimada: "bg-slate-100 text-slate-600 border border-slate-200",
};

const STATUS_TO_NODE: Record<string, string> = {
  'Borrador': 'borrador',
  '1. Borrador': 'borrador',
  'Pendiente de aprobación': 'eval_bp',
  '2. Evaluación BP TI': 'eval_bp',
  'En evaluación de BP TI': 'eval_bp',
  '3. Aprobación BO': 'aprob_bo',
  '4. Aprobación VP': 'aprob_vp',
  '5. Asignación Gestor Demanda': 'asig_demanda',
  '5. Asignación de Dominio': 'asig_demanda',
  '6. Ventana de Estimación': 'ventana_est',
  '6. Compromiso Estimación': 'ventana_est',
  '7A. Estimación con Presupuesto': 'est_con_presupuesto',
  '7B. Estimación sin Presupuesto': 'est_sin_presupuesto',
  '8A. Validación Estimación BP': 'val_est_bp',
  '8B. VoBo Estimación BO': 'vobo_est_bo',
  '9. Planificación de Fechas': 'plan_fechas',
  '10. Validación Planificación BP': 'val_plan_bp',
  '10. Validación Planificación': 'val_plan_bp',
  '11. Aprobación Final Fechas': 'aprob_plan_bo',
  '12. Planificación': 'planificacion',
  'Observada': 'observada',
  '⚠️ Observada (Hub BP TI)': 'observada',
  'En demanda': 'planificacion',
  'Desestimada': 'desestimada',
  '🗄️ Desestimada': 'desestimada',
};

function getInitiativeStatusInfo(i: any, activeWorkflow: any) {
  const nodes: any[] = activeWorkflow?.graph_json?.nodes || [];
  const currNodeId = String(i?.current_node_id || STATUS_TO_NODE[i?.status] || 'borrador').toLowerCase();
  const node = nodes.find((n: any) => String(n.id || '').toLowerCase() === currNodeId);

  // Latest status label from active workflow node, fallback to initiative.status
  const label = node?.data?.label || i?.status || "Sin estado";
  const lowerLabel = String(label).toLowerCase();
  const lowerStatus = String(i?.status || "").toLowerCase();

  let tabKey: TabKey = "eval_bp";

  if (currNodeId === "desestimada" || lowerLabel.includes("desestimad") || lowerStatus.includes("desestimad")) {
    tabKey = "desestimada";
  } else if (currNodeId === "observada" || lowerLabel.includes("observad") || lowerStatus.includes("observad")) {
    tabKey = "observada";
  } else if (currNodeId === "borrador" || lowerLabel.includes("borrador") || lowerStatus.includes("borrador")) {
    tabKey = "borrador";
  } else if (currNodeId === "eval_bp" || lowerLabel.includes("bp ti") || lowerStatus.includes("bp ti") || lowerStatus.includes("pendiente de aprobación")) {
    tabKey = "eval_bp";
  } else if (currNodeId === "aprob_bo" || lowerLabel.includes("bo") || lowerStatus.includes("bo") || lowerLabel.includes("patrocinio") || lowerStatus.includes("patrocinio")) {
    tabKey = "aprob_bo";
  } else if (currNodeId === "aprob_vp" || lowerLabel.includes("vp") || lowerStatus.includes("vp") || lowerLabel.includes("vicepresiden") || lowerStatus.includes("vicepresiden")) {
    tabKey = "aprob_vp";
  } else if (currNodeId === "asig_demanda" || lowerLabel.includes("dominio") || lowerStatus.includes("dominio") || lowerLabel.includes("demanda ti") || lowerStatus.includes("demanda ti")) {
    tabKey = "asig_demanda";
  } else if (['ventana_est', 'est_con_presupuesto', 'est_sin_presupuesto', 'val_est_bp', 'vobo_est_bo'].includes(currNodeId) || lowerLabel.includes("estimaci") || lowerStatus.includes("estimaci")) {
    tabKey = "estimacion";
  } else if (['plan_fechas', 'val_plan_bp', 'aprob_plan_bo', 'planificacion'].includes(currNodeId) || lowerLabel.includes("planificaci") || lowerStatus.includes("planificaci") || lowerLabel.includes("en demanda") || lowerStatus.includes("en demanda")) {
    tabKey = "planificacion";
  }

  return { label, tabKey, node };
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return formatDateDDMMYYYY(iso);
}

function formatTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-PE", { 
    timeZone: "America/Lima",
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

interface ColumnDef {
  id: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  canHide: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: "codigo", label: "Código ID", defaultWidth: 140, minWidth: 120, canHide: true },
  { id: "solicitud", label: "Solicitud", defaultWidth: 320, minWidth: 220, canHide: false },
  { id: "vicepresidencia", label: "Vicepresidencia", defaultWidth: 170, minWidth: 130, canHide: true },
  { id: "direccion", label: "Dirección", defaultWidth: 170, minWidth: 130, canHide: true },
  { id: "fecha", label: "Fecha", defaultWidth: 130, minWidth: 100, canHide: true },
  { id: "key_user", label: "Key User", defaultWidth: 180, minWidth: 140, canHide: true },
  { id: "bp", label: "IT Business Partner", defaultWidth: 170, minWidth: 130, canHide: true },
  { id: "estado", label: "Estado", defaultWidth: 170, minWidth: 130, canHide: true },
  { id: "acciones", label: "Acciones", defaultWidth: 165, minWidth: 150, canHide: false }
];

const DEFAULT_COLUMN_ORDER = ALL_COLUMNS.map(c => c.id);
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = ALL_COLUMNS.reduce(
  (acc, c) => ({ ...acc, [c.id]: c.defaultWidth }),
  {}
);
const DEFAULT_HIDDEN_COLUMNS: string[] = [];

export default function ApprovalBoard() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("todas");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedRegistradores, setSelectedRegistradores] = useState<string[]>([]);
  const [selectedDirecciones, setSelectedDirecciones] = useState<string[]>([]);
  const [selectedBPs, setSelectedBPs] = useState<string[]>([]);
  const [selectedVicepresidencias, setSelectedVicepresidencias] = useState<string[]>([]);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ 
    field: "codigo" | "solicitud" | "vicepresidencia" | "direccion" | "fecha" | "key_user" | "bp" | "estado"; 
    order: "asc" | "desc" 
  } | null>(null);

  // User Authentication & Preferences
  const { profile, user, session } = useAuth();
  const [activeWorkflow, setActiveWorkflow] = useState<any>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(DEFAULT_HIDDEN_COLUMNS);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<any>(null);
  const resizingColumnRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  const effectiveColumnOrder = useMemo(() => {
    const existing = columnOrder.filter(id => ALL_COLUMNS.some(c => c.id === id));
    const missing = ALL_COLUMNS.map(c => c.id).filter(id => !existing.includes(id));
    return [...existing, ...missing];
  }, [columnOrder]);

  const visibleColumns = useMemo(() => {
    return effectiveColumnOrder.filter(id => !hiddenColumns.includes(id));
  }, [effectiveColumnOrder, hiddenColumns]);

  const totalTableWidth = useMemo(() => {
    return visibleColumns.reduce((acc, colId) => {
      const colDef = ALL_COLUMNS.find(c => c.id === colId);
      return acc + (columnWidths[colId] || colDef?.defaultWidth || 150);
    }, 0);
  }, [visibleColumns, columnWidths]);

  // Load User Preferences
  useEffect(() => {
    const currentUserId = user?.id || profile?.id;
    if (!currentUserId) return;

    // 1. Fast local cache
    try {
      const cached = localStorage.getItem(`iacs_table_prefs_approval_board_${currentUserId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.column_order)) setColumnOrder(parsed.column_order);
        if (parsed.column_widths) setColumnWidths(parsed.column_widths);
        if (Array.isArray(parsed.hidden_columns)) setHiddenColumns(parsed.hidden_columns);
      }
    } catch {}

    // 2. Fetch remote
    (async () => {
      try {
        const token = session?.access_token;
        const res = await fetch(`/api/user-preferences/approval_board?user_id=${currentUserId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const json = await res.json();
          if (json.preferences) {
            const p = json.preferences;
            if (Array.isArray(p.column_order)) setColumnOrder(p.column_order);
            if (p.column_widths) setColumnWidths(p.column_widths);
            if (Array.isArray(p.hidden_columns)) setHiddenColumns(p.hidden_columns);
            localStorage.setItem(`iacs_table_prefs_approval_board_${currentUserId}`, JSON.stringify(p));
          }
        }
      } catch (err) {
        // Fallback to Supabase
        const { data } = await supabase
          .from("user_table_preferences")
          .select("preferences")
          .eq("user_id", currentUserId)
          .eq("table_id", "approval_board")
          .maybeSingle();
        if (data?.preferences) {
          const p = data.preferences as any;
          if (Array.isArray(p.column_order)) setColumnOrder(p.column_order);
          if (p.column_widths) setColumnWidths(p.column_widths);
          if (Array.isArray(p.hidden_columns)) setHiddenColumns(p.hidden_columns);
        }
      }
    })();
  }, [user?.id, profile?.id, session?.access_token]);

  // Save Preferences with Debounce
  const savePreferences = (newPrefs: {
    column_order: string[];
    column_widths: Record<string, number>;
    hidden_columns: string[];
  }) => {
    const currentUserId = user?.id || profile?.id;
    if (!currentUserId) return;

    try {
      localStorage.setItem(`iacs_table_prefs_approval_board_${currentUserId}`, JSON.stringify(newPrefs));
    } catch {}

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const token = session?.access_token;
        const res = await fetch("/api/user-preferences/approval_board", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            user_id: currentUserId,
            preferences: newPrefs
          })
        });
        if (!res.ok) throw new Error("API preference save failed");
      } catch {
        // Fallback to direct Supabase
        await supabase.from("user_table_preferences").upsert(
          [
            {
              user_id: currentUserId,
              table_id: "approval_board",
              preferences: newPrefs,
              updated_at: new Date().toISOString()
            }
          ],
          { onConflict: "user_id,table_id" }
        );
      }
    }, 400);
  };

  const handleToggleColumn = (colId: string) => {
    const colDef = ALL_COLUMNS.find(c => c.id === colId);
    if (!colDef?.canHide) return;

    const nextHidden = hiddenColumns.includes(colId)
      ? hiddenColumns.filter(id => id !== colId)
      : [...hiddenColumns, colId];

    setHiddenColumns(nextHidden);
    savePreferences({
      column_order: columnOrder,
      column_widths: columnWidths,
      hidden_columns: nextHidden
    });
  };

  const handleResetColumns = () => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    setHiddenColumns(DEFAULT_HIDDEN_COLUMNS);
    savePreferences({
      column_order: DEFAULT_COLUMN_ORDER,
      column_widths: DEFAULT_COLUMN_WIDTHS,
      hidden_columns: DEFAULT_HIDDEN_COLUMNS
    });
  };

  const handleMoveColumn = (colId: string, direction: 'up' | 'down') => {
    const currentOrder = [...effectiveColumnOrder];
    const idx = currentOrder.indexOf(colId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;

    const [moved] = currentOrder.splice(idx, 1);
    currentOrder.splice(targetIdx, 0, moved);
    setColumnOrder(currentOrder);
    savePreferences({
      column_order: currentOrder,
      column_widths: columnWidths,
      hidden_columns: hiddenColumns
    });
  };

  const handleResizeStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = columnWidths[colId] || ALL_COLUMNS.find(c => c.id === colId)?.defaultWidth || 150;
    resizingColumnRef.current = { colId, startX: e.clientX, startWidth: currentWidth };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColumnRef.current) return;
      const delta = moveEvent.clientX - resizingColumnRef.current.startX;
      const colDef = ALL_COLUMNS.find(c => c.id === resizingColumnRef.current!.colId);
      const minW = colDef?.minWidth || 90;
      const newWidth = Math.max(minW, resizingColumnRef.current.startWidth + delta);

      setColumnWidths(prev => ({
        ...prev,
        [resizingColumnRef.current!.colId]: newWidth
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (resizingColumnRef.current) {
        setColumnWidths(currentWidths => {
          savePreferences({
            column_order: columnOrder,
            column_widths: currentWidths,
            hidden_columns: hiddenColumns
          });
          return currentWidths;
        });
      }
      resizingColumnRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    if (colId === "acciones") return;
    e.dataTransfer.setData("text/plain", colId);
    setDraggedColId(colId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (colId !== "acciones" && draggedColId && draggedColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColId(null);
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId || targetColId === "acciones") {
      setDragOverColId(null);
      setDraggedColId(null);
      return;
    }

    const nextOrder = [...effectiveColumnOrder];
    const fromIdx = nextOrder.indexOf(draggedColId);
    const toIdx = nextOrder.indexOf(targetColId);

    if (fromIdx !== -1 && toIdx !== -1) {
      nextOrder.splice(fromIdx, 1);
      nextOrder.splice(toIdx, 0, draggedColId);
      setColumnOrder(nextOrder);
      savePreferences({
        column_order: nextOrder,
        column_widths: columnWidths,
        hidden_columns: hiddenColumns
      });
    }

    setDragOverColId(null);
    setDraggedColId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Close columns menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target as Node)) {
        setColumnsMenuOpen(false);
      }
    }
    if (columnsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [columnsMenuOpen]);

  // PDF Generation State
  const [pdfInitiative, setPdfInitiative] = useState<any>(null);
  const [pdfTemplate, setPdfTemplate] = useState<string>("");
  const [pdfVariant, setPdfVariant] = useState<'ld' | 'consolidado'>('consolidado');
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedInitForPdf, setSelectedInitForPdf] = useState<any>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: pdfRef,
    documentTitle: pdfInitiative ? `Informe_Ejecutivo_${pdfInitiative.summary?.id_corta || pdfInitiative.id}` : 'Informe_Ejecutivo',
  });

  const openPdfDialog = (init: any) => {
    setSelectedInitForPdf(init);
    setPdfModalOpen(true);
  };

  const handleGeneratePdf = (init: any, variant: 'ld' | 'consolidado' = 'consolidado') => {
    setPdfInitiative(init);
    setPdfVariant(variant);
    setPdfModalOpen(false);
    setTimeout(() => {
      handlePrint();
    }, 150);
  };

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

    fetch('/api/workflow/active')
      .then(async res => {
        if (res.ok) {
          const json = await res.json();
          if (json.data) setActiveWorkflow(json.data);
        }
      })
      .catch(() => {});

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
  const hasTransversalRole = profile?.profile_roles?.some((r: any) => r.is_transversal);
  const bpRoles = profile?.profile_roles?.filter((r: any) => r.role === 'bp_ti') || [];
  const isBP = bpRoles.length > 0;
  const registradorRoles = profile?.profile_roles?.filter((r: any) => r.role === 'registrador') || [];
  const isRegistrador = registradorRoles.length > 0;

  const bpAllowedDirNames = new Set(bpRoles.flatMap((r: any) => r.direcciones_ids || []).map((id: string) => direccionesMap[id]));
  const userAllowedDirNames = new Set(registradorRoles.flatMap((r: any) => r.direcciones_ids || []).map((id: string) => direccionesMap[id]));
  const anyAllowedDirNames = new Set(
    (profile?.profile_roles || [])
      .flatMap((r: any) => r.direcciones_ids || [])
      .map((id: string) => direccionesMap[id])
  );

  const roleFilteredInitiatives = initiatives.filter(i => {
    if (isAdmin || isInvitado) return true;

    const isMine = i.user_id === profile?.id || i.form_data?.registrador === profile?.name;

    const isDraft = String(i.status || '').toLowerCase().includes("borrador") || String((i as any).current_node_id || '').toLowerCase() === "borrador";
    if (isDraft) {
      return isMine;
    }

    if (isMine) return true;
    if (hasTransversalRole) return true;

    if (isBP) {
      const initDir = i.form_data?.direccion;
      if (initDir && bpAllowedDirNames.has(initDir)) return true;
    }

    if (isRegistrador) {
      const initDir = i.form_data?.direccion;
      if (initDir && userAllowedDirNames.has(initDir)) return true;
    }

    const initDir = i.form_data?.direccion;
    if (initDir && anyAllowedDirNames.has(initDir)) return true;

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

  const countByTab = (tabKey: TabKey) => {
    if (tabKey === "todas") return filteredInitiatives.length;
    return filteredInitiatives.filter(i => getInitiativeStatusInfo(i, activeWorkflow).tabKey === tabKey).length;
  };

  const byTab = (tabKey: TabKey) => {
    if (tabKey === "todas") return filteredInitiatives;
    return filteredInitiatives.filter(i => getInitiativeStatusInfo(i, activeWorkflow).tabKey === tabKey);
  };

  const filtered = byTab(activeTab);

  const sortedAndFiltered = useMemo(() => {
    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortConfig.field) {
        case "codigo":
          valA = a.id || "";
          valB = b.id || "";
          break;
        case "solicitud":
          valA = a.summary?.titulo ?? Object.values(a.form_data ?? {})[0] ?? a.id;
          valB = b.summary?.titulo ?? Object.values(b.form_data ?? {})[0] ?? b.id;
          break;
        case "vicepresidencia":
          valA = a.form_data?.vicepresidencia || "";
          valB = b.form_data?.vicepresidencia || "";
          break;
        case "direccion":
          valA = a.form_data?.direccion || "";
          valB = b.form_data?.direccion || "";
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
          valA = getInitiativeStatusInfo(a, activeWorkflow).label || "";
          valB = getInitiativeStatusInfo(b, activeWorkflow).label || "";
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

  const handleSort = (field: "codigo" | "solicitud" | "vicepresidencia" | "direccion" | "fecha" | "key_user" | "bp" | "estado") => {
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
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm relative">
        {/* Tabs navigation & Column Customizer Button */}
        <div className="border-b border-[#F1F5F9] px-6 pt-4 flex items-center justify-between gap-3 flex-wrap rounded-t-2xl bg-white relative z-20">
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
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

          {/* Column Customizer Button & Dropdown Menu */}
          <div className="relative mb-2.5 sm:mb-2" ref={columnsMenuRef}>
            <button
              type="button"
              onClick={() => setColumnsMenuOpen(!columnsMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#1E293B] shadow-xs transition-colors"
              title="Personalizar columnas visibles y orden"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#4F5AF5]" />
              <span>Columnas</span>
              <span className="text-[10px] font-bold bg-[#EEF2FF] text-[#4F5AF5] px-1.5 py-0.5 rounded-full">
                {visibleColumns.length}/{ALL_COLUMNS.length}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${columnsMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {columnsMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setColumnsMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-[#E2E8F0] shadow-2xl z-50 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#1E293B]">Columnas de la tabla</h4>
                      <p className="text-[10px] text-slate-400">Marca las visibles o reordénalas</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetColumns}
                      className="text-[11px] font-medium text-slate-500 hover:text-[#4F5AF5] flex items-center gap-1 transition-colors"
                      title="Restablecer columnas por defecto"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                    {effectiveColumnOrder.map((colId, index) => {
                      const colDef = ALL_COLUMNS.find(c => c.id === colId);
                      if (!colDef) return null;
                      const isVisible = !hiddenColumns.includes(colId);

                      return (
                        <div
                          key={colId}
                          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] text-xs transition-colors border border-transparent hover:border-slate-100"
                        >
                          <label className="flex items-center gap-2 cursor-pointer select-none min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              disabled={!colDef.canHide}
                              onChange={() => handleToggleColumn(colId)}
                              className="rounded border-slate-300 text-[#4F5AF5] focus:ring-[#4F5AF5] w-3.5 h-3.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className={`truncate font-medium ${isVisible ? "text-slate-800" : "text-slate-400 line-through"}`}>
                              {colDef.label}
                            </span>
                          </label>
                          <div className="flex items-center gap-0.5 shrink-0 ml-1">
                            <button
                              type="button"
                              onClick={() => handleMoveColumn(colId, 'up')}
                              disabled={index === 0}
                              className="p-1 text-slate-400 hover:text-[#4F5AF5] disabled:opacity-20 disabled:hover:text-slate-400"
                              title="Mover hacia arriba / izquierda"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveColumn(colId, 'down')}
                              disabled={index === effectiveColumnOrder.length - 1}
                              className="p-1 text-slate-400 hover:text-[#4F5AF5] disabled:opacity-20 disabled:hover:text-slate-400"
                              title="Mover hacia abajo / derecha"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table content */}
        <div className="p-0 overflow-x-auto rounded-b-2xl">
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
            <table className="w-full text-left border-collapse table-fixed" style={{ minWidth: `${Math.max(totalTableWidth, 1280)}px` }}>
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider relative">
                  {visibleColumns.map((colId) => {
                    const colDef = ALL_COLUMNS.find(c => c.id === colId);
                    if (!colDef) return null;
                    const isSortable = colId !== "acciones";
                    const width = columnWidths[colId] || colDef.defaultWidth;
                    const isOver = dragOverColId === colId;

                    return (
                      <th 
                        key={colId}
                        draggable={colId !== "acciones"}
                        onDragStart={(e) => handleDragStart(e, colId)}
                        onDragOver={(e) => handleDragOver(e, colId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, colId)}
                        style={{ width: `${width}px`, minWidth: `${colDef.minWidth}px` }}
                        className={`px-4 py-3 select-none relative transition-colors group ${
                          isOver ? "border-l-2 border-l-[#4F5AF5] bg-indigo-50/80" : ""
                        } ${draggedColId === colId ? "opacity-30" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div 
                            onClick={() => isSortable && handleSort(colId as any)}
                            className={`flex items-center gap-1.5 min-w-0 ${isSortable ? "cursor-pointer hover:text-[#4F5AF5]" : ""}`}
                            title={isSortable ? `Ordenar por ${colDef.label}` : colDef.label}
                          >
                            {colId !== "acciones" && (
                              <GripVertical className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0 transition-opacity" />
                            )}
                            <span className="truncate">{colDef.label}</span>
                            {isSortable && (
                              sortConfig?.field === colId ? (
                                sortConfig.order === "asc" ? (
                                  <ArrowUp className="w-3 h-3 text-[#4F5AF5] shrink-0" />
                                ) : (
                                  <ArrowDown className="w-3 h-3 text-[#4F5AF5] shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              )
                            )}
                          </div>
                        </div>

                        {/* Drag Handle to Resize Column */}
                        <div
                          onMouseDown={(e) => handleResizeStart(e, colId)}
                          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#4F5AF5]/40 active:bg-[#4F5AF5] group-hover:bg-slate-300/40 transition-colors z-20"
                          title="Arrastra para cambiar el ancho de la columna"
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {sortedAndFiltered.map((i) => {
                  const title = i.summary?.titulo ?? Object.values(i.form_data ?? {})[0] ?? i.id;
                  const registrador = i.form_data?.registrador || i.form_data?.solicitante || "Sin registrador";
                  const initials = registrador.split(" ").map((n: string) => n[0]).join("").substring(0, 2);
                  const { label: statusLabel, tabKey } = getInitiativeStatusInfo(i, activeWorkflow);

                  return (
                    <tr key={i.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {visibleColumns.map((colId) => {
                        switch (colId) {
                          case "codigo":
                            return (
                              <td key={colId} className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-mono font-semibold text-[#4F5AF5] bg-[#EEF2FF] px-2 py-1 rounded-md border border-[#4F5AF5]/20">
                                    {i.id}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(i.id)}
                                    className="p-1 text-slate-400 hover:text-[#4F5AF5] hover:bg-slate-100 rounded transition-colors"
                                    title="Copiar Código ID"
                                  >
                                    {copiedId === i.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>
                            );

                          case "solicitud":
                            return (
                              <td key={colId} className="px-4 py-4">
                                <Link
                                  to={`/iniciativa/${i.id}`}
                                  className="font-semibold text-[#1E293B] hover:text-[#4F5AF5] text-sm leading-snug line-clamp-2 transition-colors block"
                                  title={title}
                                >
                                  {title}
                                </Link>
                              </td>
                            );

                          case "vicepresidencia":
                            return (
                              <td key={colId} className="px-4 py-4">
                                {i.form_data?.vicepresidencia ? (
                                  <span 
                                    className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100/70 px-2.5 py-1 rounded-md inline-block max-w-[170px] truncate" 
                                    title={i.form_data.vicepresidencia}
                                  >
                                    {i.form_data.vicepresidencia}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">-</span>
                                )}
                              </td>
                            );

                          case "direccion":
                            return (
                              <td key={colId} className="px-4 py-4">
                                {i.form_data?.direccion ? (
                                  <span 
                                    className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200/70 px-2.5 py-1 rounded-md inline-block max-w-[170px] truncate" 
                                    title={i.form_data.direccion}
                                  >
                                    {i.form_data.direccion}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">-</span>
                                )}
                              </td>
                            );

                          case "fecha":
                            return (
                              <td key={colId} className="px-4 py-4 whitespace-nowrap">
                                <p className="text-sm text-[#1E293B] font-medium">{formatDate(i.created_at)}</p>
                                <p className="text-[11px] text-[#94A3B8]">{formatTime(i.created_at)}</p>
                              </td>
                            );

                          case "key_user":
                            return (
                              <td key={colId} className="px-4 py-4">
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
                            );

                          case "bp":
                            return (
                              <td key={colId} className="px-4 py-4">
                                <p className={`text-sm font-medium ${i.form_data?.bp_ti_asignado ? 'text-[#1E293B]' : 'text-amber-600'}`}>
                                  {i.form_data?.bp_ti_asignado || "Pendiente de TI BP"}
                                </p>
                              </td>
                            );

                          case "estado":
                            return (
                              <td key={colId} className="px-4 py-4 whitespace-nowrap">
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
                                      {statusLabel}
                                    </span>
                                  )
                                ) : (
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[tabKey]}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${TABS.find(t => t.key === tabKey)?.dot}`} />
                                    {statusLabel}
                                  </span>
                                )}
                              </td>
                            );

                          case "acciones":
                            return (
                              <td key={colId} className="px-4 py-4 whitespace-nowrap overflow-visible" style={{ width: `${columnWidths[colId] || 165}px` }}>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Link
                                    to={`/iniciativa/${i.id}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#4F5AF5] hover:text-[#3F49E0] text-xs font-semibold transition-colors shrink-0"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Revisar
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() => openPdfDialog(i)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-semibold text-xs transition-colors whitespace-nowrap cursor-pointer shrink-0"
                                    title="Generar e imprimir informe ejecutivo PDF"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                                    PDF
                                  </button>
                                </div>
                              </td>
                            );

                          default:
                            return null;
                        }
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Componente Oculto para Generación e Impresión PDF */}
      <div className="hidden">
        <ExecutiveReportPDF ref={pdfRef} initiative={pdfInitiative} template={pdfTemplate} variant={pdfVariant} />
      </div>

      {/* Modal de Selección de Versión de PDF */}
      {pdfModalOpen && selectedInitForPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                <FileText className="w-5 h-5 text-rose-600" />
                <span>Generar Informe PDF</span>
              </div>
              <button 
                onClick={() => setPdfModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Selecciona la versión del informe ejecutivo que deseas emitir para la iniciativa <strong className="text-slate-700 font-semibold">#{selectedInitForPdf.summary?.id_corta || selectedInitForPdf.id?.slice(0, 8)}</strong>:
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleGeneratePdf(selectedInitForPdf, 'ld')}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">Dictamen de Negocio (Líder de Dominio)</span>
                  <span className="text-[10px] uppercase font-semibold text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded">Etapa Inicial</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enfocado en el requerimiento del negocio, justificación, alcance, entregables y enlaces directos a archivos de soporte adjuntos.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleGeneratePdf(selectedInitForPdf, 'consolidado')}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Expediente Consolidado Ejecutivo</span>
                  <span className="text-[10px] uppercase font-semibold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded">Integral</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Expediente completo con requerimiento inicial, estimaciones técnicas de TI, cronograma estimado, presupuesto y firmas de aprobación.
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPdfModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
