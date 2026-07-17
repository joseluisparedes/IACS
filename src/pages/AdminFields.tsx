import { useState, useEffect } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, EyeOff, Eye, Settings2, X, Save, Pencil, GripVertical, Bot, ListTodo, Paperclip, FileText, Image as ImageIcon, Lock, ShieldAlert } from "lucide-react";
import { FieldDefinition, FieldType } from "@/src/types";
import { supabase } from "@/src/lib/supabase";

type PanelMode = "create" | "edit";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto libre",
  date: "Fecha",
  select: "Selector",
  file: "Adjunto",
};

const FIELD_TYPE_COLORS: Record<FieldType, string> = {
  text: "bg-blue-50 text-blue-700 border-blue-100",
  date: "bg-amber-50 text-amber-700 border-amber-100",
  select: "bg-violet-50 text-violet-700 border-violet-100",
  file: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const SYSTEM_FIELDS = ["aprobacin_de_director"];

const defaultFileOptions = () => ({
  fileTypes: {
    pdf: { enabled: true, maxMb: 1.0 },
    docx: { enabled: true, maxMb: 1.0 },
    txt: { enabled: true, maxMb: 1.0 },
    image: { enabled: true, maxMb: 1.0 }
  }
});

const emptyForm = {
  label: "", key: "", field_type: "select" as FieldType,
  options: [] as string[], is_required: false, is_visible: true,
  depends_on: "", options_map: {} as Record<string, string[]>, ai_instructions: "",
  allow_multiple: false, help_text: "", requires_confirmation: false
};

// ─── Input/Label styles ───────────────────────────────────────────────────────
const inputCls = "w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2.5 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] focus:border-[#4F5AF5] transition-colors";
const labelCls = "block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5";

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, color = "bg-[#4F5AF5]" }: { checked: boolean; onChange: () => void; color?: string }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${checked ? color : "bg-[#E2E8F0]"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// ─── Sortable Row ─────────────────────────────────────────────────────────────
function SortableRow({ field, index, onToggleVisible, onEdit, onDelete, deletingId }: {
  field: FieldDefinition; index: number;
  onToggleVisible: (f: FieldDefinition) => void;
  onEdit: (f: FieldDefinition) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-5 py-3.5 transition-colors border-b border-[#F8FAFC] last:border-0 ${
        isDragging ? "bg-[#EEF2FF] shadow-lg rounded-xl" : "hover:bg-[#F8FAFC]"
      } ${!field.is_visible ? "opacity-50" : ""}`}
    >
      <button
        {...attributes} {...listeners}
        className="p-1 text-[#CBD5E1] hover:text-[#64748B] cursor-grab active:cursor-grabbing touch-none transition-colors"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#94A3B8] text-xs flex items-center justify-center font-mono shrink-0">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-[#1E293B] text-sm">{field.label}</p>
          {field.is_required && (
            <span className="text-[10px] text-red-600 border border-red-100 bg-red-50 px-1.5 py-0.5 rounded-full">Obligatorio</span>
          )}
        </div>
        <p className="text-xs text-[#94A3B8] font-mono mt-0.5">{field.key}</p>
        {field.field_type === "select" && field.options?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {field.options.slice(0, 4).map(o => (
              <span key={o} className="text-[10px] bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-full">{o}</span>
            ))}
            {field.options.length > 4 && <span className="text-[10px] text-[#94A3B8]">+{field.options.length - 4} más</span>}
          </div>
        )}
      </div>

      <span className={`text-xs border px-2.5 py-1 rounded-full shrink-0 hidden lg:block font-medium ${FIELD_TYPE_COLORS[field.field_type]}`}>
        {FIELD_TYPE_LABELS[field.field_type]}
      </span>

      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => onEdit(field)} title="Editar" className="p-2 rounded-lg text-[#94A3B8] hover:text-[#4F5AF5] hover:bg-[#EEF2FF] transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onToggleVisible(field)} title={field.is_visible ? "Ocultar" : "Mostrar"} className="p-2 rounded-lg text-[#94A3B8] hover:text-amber-600 hover:bg-amber-50 transition-colors">
          {field.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button 
          onClick={() => onDelete(field.id)} 
          disabled={deletingId === field.id || SYSTEM_FIELDS.includes(field.key)} 
          title={SYSTEM_FIELDS.includes(field.key) ? "Campo de sistema, no se puede eliminar" : "Eliminar"} 
          className={`p-2 rounded-lg transition-colors ${SYSTEM_FIELDS.includes(field.key) ? "text-gray-300 cursor-not-allowed" : "text-[#94A3B8] hover:text-red-600 hover:bg-red-50 disabled:opacity-40"}`}
        >
          {deletingId === field.id
            ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminFields() {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [optionInput, setOptionInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<"form" | "ai" | "system">("form");

  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);

  // Fetch Maintenance Mode
  useEffect(() => {
    const fetchMaintenance = async () => {
      const { data } = await supabase.from('site_settings').select('maintenance_mode').eq('id', 1).single();
      if (data) setIsMaintenanceMode(data.maintenance_mode);
      setLoadingMaintenance(false);
    };
    fetchMaintenance();
  }, []);

  const toggleMaintenanceMode = async () => {
    const newVal = !isMaintenanceMode;
    setIsMaintenanceMode(newVal);
    await supabase.from('site_settings').update({ maintenance_mode: newVal }).eq('id', 1);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchFields = async () => {
    setLoading(true);
    const res = await fetch("/api/fields");
    const data = await res.json();
    setFields(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchFields(); }, []);

  const openCreate = () => {
    setPanelMode("create"); setEditingId(null);
    setForm({ ...emptyForm }); setOptionInput(""); setError(""); setShowPanel(true);
  };

  const openEdit = (field: FieldDefinition) => {
    setPanelMode("edit"); setEditingId(field.id);
    const initialOptions = field.field_type === "file"
      ? (field.options && typeof field.options === "object" && !Array.isArray(field.options) ? { ...field.options } : defaultFileOptions())
      : [...(field.options ?? [])];
    setForm({
      label: field.label,
      key: field.key,
      field_type: field.field_type,
      options: initialOptions,
      is_required: field.is_required,
      is_visible: field.is_visible,
      depends_on: field.depends_on || "",
      options_map: field.options_map || {},
      ai_instructions: field.ai_instructions || "",
      allow_multiple: field.allow_multiple ?? false,
      help_text: field.help_text || "",
      requires_confirmation: field.requires_confirmation ?? false
    });
    setOptionInput(""); setError(""); setShowPanel(true);
  };

  const closePanel = () => { setShowPanel(false); setError(""); };

  const autoKey = (label: string) => label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const handleLabelChange = (v: string) => {
    setForm(f => ({ ...f, label: v, ...(panelMode === "create" ? { key: autoKey(v) } : {}) }));
  };

  const addOption = () => {
    const val = optionInput.trim();
    if (!val || form.options.includes(val)) return;
    setForm(f => ({ ...f, options: [...f.options, val] }));
    setOptionInput("");
  };

  const removeOption = (opt: string) => setForm(f => ({ ...f, options: f.options.filter(o => o !== opt) }));

  const handleSave = async () => {
    setError("");
    if (!form.label.trim()) return setError("El nombre del campo es obligatorio.");
    if (!form.key.trim()) return setError("La clave es obligatoria.");
    
    let payloadOptions = form.options;
    if (form.field_type === "select") {
      payloadOptions = form.depends_on 
        ? Array.from(new Set(Object.values(form.options_map).flat()))
        : form.options;
      if (payloadOptions.length < 2) return setError("Un selector debe tener al menos 2 opciones en total.");
    } else if (form.field_type === "file") {
      if (!payloadOptions || typeof payloadOptions !== 'object' || Array.isArray(payloadOptions) || !payloadOptions.fileTypes) {
        payloadOptions = defaultFileOptions();
      }
    }
    
    setSaving(true);
    try {
      if (panelMode === "create") {
        const sectionFields = fields.filter(f => {
          const s = f.section || "form";
          if (activeSection === "system") return SYSTEM_FIELDS.includes(f.key);
          if (activeSection === "form") return s === "form" && !SYSTEM_FIELDS.includes(f.key);
          return s === activeSection && !SYSTEM_FIELDS.includes(f.key);
        });
        const maxOrder = sectionFields.reduce((m, f) => Math.max(m, f.sort_order), -1);
        const payload = { ...form, options: payloadOptions, sort_order: maxOrder + 1, section: activeSection };
        const res = await fetch("/api/fields", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.json()).error ?? "Error al crear.");
      } else {
        const payload = {
          label: form.label,
          field_type: form.field_type,
          options: payloadOptions,
          is_required: form.is_required,
          is_visible: form.is_visible,
          depends_on: form.depends_on,
          options_map: form.options_map,
          ai_instructions: form.ai_instructions,
          allow_multiple: form.allow_multiple,
          help_text: form.help_text,
          requires_confirmation: form.requires_confirmation
        };
        const res = await fetch(`/api/fields/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.json()).error ?? "Error al actualizar.");
      }
      closePanel(); fetchFields();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const toggleVisible = async (field: FieldDefinition) => {
    await fetch(`/api/fields/${field.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_visible: !field.is_visible }) });
    fetchFields();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este campo? No se puede deshacer.")) return;
    setDeletingId(id);
    await fetch(`/api/fields/${id}`, { method: "DELETE" });
    setDeletingId(null); fetchFields();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sectionFields = fields
      .filter(f => {
        const s = f.section || "form";
        if (activeSection === "system") return SYSTEM_FIELDS.includes(f.key);
        if (activeSection === "form") return s === "form" && !SYSTEM_FIELDS.includes(f.key);
        return s === activeSection && !SYSTEM_FIELDS.includes(f.key);
      })
      .sort((a, b) => a.sort_order - b.sort_order);
    const oldIdx = sectionFields.findIndex(f => f.id === active.id);
    const newIdx = sectionFields.findIndex(f => f.id === over.id);
    const reorderedSection = arrayMove(sectionFields, oldIdx, newIdx);
    
    // Update local state by replacing the old section with the new sorted section
    const newFields = fields.map(f => {
      const reorderedMatch = reorderedSection.find(rs => rs.id === f.id);
      if (reorderedMatch) {
        // Find the new index in reorderedSection to serve as the new sort_order
        const newOrder = reorderedSection.findIndex(rs => rs.id === f.id);
        return { ...f, sort_order: newOrder };
      }
      return f;
    });

    setFields(newFields);
    await fetch("/api/fields/reorder-batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedIds: reorderedSection.map(f => f.id) }) });
  };

  const displayedFields = fields
    .filter(f => {
      const s = f.section || "form";
      if (activeSection === "system") return SYSTEM_FIELDS.includes(f.key);
      if (activeSection === "form") return s === "form" && !SYSTEM_FIELDS.includes(f.key);
      return s === activeSection && !SYSTEM_FIELDS.includes(f.key);
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B] flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-[#4F5AF5]" />
            Administración de Campos
          </h2>
          <p className="text-sm text-[#64748B] mt-1">Configura los datos iniciales y los que la IA solicitará luego.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white border border-[#E2E8F0] px-4 py-2 rounded-lg shadow-sm">
            <ShieldAlert className={`w-5 h-5 ${isMaintenanceMode ? 'text-red-500' : 'text-gray-400'}`} />
            <div>
              <p className="text-xs font-bold text-[#1E293B]">Modo Mantenimiento</p>
              <p className="text-[10px] text-[#64748B]">{isMaintenanceMode ? 'Activo (Bloquea accesos)' : 'Inactivo'}</p>
            </div>
            <div className="ml-2">
              {loadingMaintenance ? (
                <div className="w-8 h-4 bg-gray-200 rounded-full animate-pulse" />
              ) : (
                <Toggle checked={isMaintenanceMode} onChange={toggleMaintenanceMode} color="bg-red-500" />
              )}
            </div>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20 hover:-translate-y-px">
            <Plus className="w-4 h-4" />
            Nuevo Campo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E2E8F0] pb-px">
        <button
          onClick={() => setActiveSection("form")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeSection === "form" ? "border-[#4F5AF5] text-[#4F5AF5]" : "border-transparent text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          <ListTodo className="w-4 h-4" />
          Formulario Base
        </button>
        <button
          onClick={() => setActiveSection("ai")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeSection === "ai" ? "border-[#4F5AF5] text-[#4F5AF5]" : "border-transparent text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          <Bot className="w-4 h-4" />
          Preguntas IA (Resumen)
        </button>
        <button
          onClick={() => setActiveSection("system")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeSection === "system" ? "border-[#4F5AF5] text-[#4F5AF5]" : "border-transparent text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          <Lock className="w-4 h-4" />
          Campos de Sistema
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: displayedFields.length, color: "text-[#1E293B]" },
          { label: "Visibles", value: displayedFields.filter(f => f.is_visible).length, color: "text-emerald-600" },
          { label: "Ocultos", value: displayedFields.filter(f => !f.is_visible).length, color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
            <p className="text-[11px] text-[#94A3B8] uppercase font-semibold tracking-wider">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Fields table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
          <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            {activeSection === "form" ? "Campos Iniciales" : activeSection === "ai" ? "Campos a solicitar por IA" : "Campos Fijos de Sistema"}
          </h3>
          <p className="text-xs text-[#94A3B8]">Arrastra ⠿ para reordenar</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center gap-3 py-12 text-[#94A3B8]">
            <div className="w-5 h-5 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
            Cargando...
          </div>
        ) : displayedFields.length === 0 ? (
          <div className="py-12 text-center">
            <Settings2 className="w-8 h-8 mx-auto mb-3 text-[#E2E8F0]" />
            <p className="text-[#94A3B8] text-sm">No hay campos configurados para esta sección.</p>
            <button onClick={openCreate} className="mt-2 text-[#4F5AF5] hover:text-[#3F49E0] text-sm font-semibold underline underline-offset-2">
              Crear el primer campo
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayedFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <div>
                {displayedFields.map((field, idx) => (
                  <SortableRow key={field.id} field={field} index={idx} onToggleVisible={toggleVisible} onEdit={openEdit} onDelete={handleDelete} deletingId={deletingId} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Slide-in Panel */}
      {showPanel && (
        <div className="fixed inset-0 z-[80] flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-md bg-white border-l border-[#E2E8F0] flex flex-col shadow-2xl">

            <div className="px-6 py-5 border-b border-[#F1F5F9] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1E293B]">{panelMode === "create" ? "Nuevo Campo" : "Editar Campo"}</h3>
                {panelMode === "edit" && <p className="text-xs text-[#94A3B8] font-mono mt-0.5">{form.key}</p>}
              </div>
              <button onClick={closePanel} className="p-2 rounded-lg text-[#94A3B8] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Label */}
              <div>
                <label className={labelCls}>Nombre del campo <span className="text-red-500">*</span></label>
                <input type="text" value={form.label} onChange={e => handleLabelChange(e.target.value)} placeholder="Ej: Área Solicitante" className={inputCls} />
              </div>

              {/* Key */}
              <div>
                <label className={labelCls}>Clave interna</label>
                <input
                  type="text" value={form.key} readOnly={panelMode === "edit"}
                  onChange={e => panelMode === "create" && setForm(f => ({ ...f, key: e.target.value }))}
                  placeholder="area_solicitante"
                  className={`${inputCls} font-mono ${panelMode === "edit" ? "bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed" : ""}`}
                />
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {panelMode === "create" ? "Se genera automáticamente. Debe ser único." : "La clave no puede modificarse."}
                </p>
              </div>

              {/* Field type */}
              <div>
                <label className={labelCls}>Tipo de campo <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {(["text", "date", "select", "file"] as FieldType[]).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, field_type: t, options: t === "file" ? defaultFileOptions() : (t === "select" ? [] : f.options) }))}
                      className={`py-3 px-2 rounded-lg text-xs font-semibold border transition-all ${
                        form.field_type === t
                          ? "bg-[#4F5AF5] border-[#4F5AF5] text-white shadow-sm shadow-[#4F5AF5]/20"
                          : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#4F5AF5] hover:text-[#4F5AF5]"
                      }`}
                    >
                      {t === "text" ? "📝 Texto" : t === "date" ? "📅 Fecha" : t === "select" ? "🔽 Selector" : "📎 Adjunto"}
                    </button>
                  ))}
                </div>
              </div>

              {form.field_type === "select" && (
                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9]">
                  <div>
                    <p className="text-sm font-semibold text-[#1E293B]">Selección múltiple</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Permite seleccionar más de una opción.</p>
                  </div>
                  <Toggle checked={form.allow_multiple} onChange={() => setForm(f => ({ ...f, allow_multiple: !f.allow_multiple }))} />
                </div>
              )}

              {/* Options */}
              {form.field_type === "select" && !form.depends_on && (
                <div>
                  <label className={labelCls}>Opciones <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text" value={optionInput} onChange={e => setOptionInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                      placeholder="Escribe y presiona Enter" className={inputCls}
                    />
                    <button onClick={addOption} className="bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-3 py-2 rounded-lg transition-colors flex-shrink-0">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {form.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-[#F8FAFC] rounded-lg border border-[#F1F5F9] mt-2 min-h-[52px]">
                      {form.options.map(opt => (
                        <span key={opt} className="flex items-center gap-1 bg-white border border-[#E2E8F0] text-[#1E293B] text-xs px-2.5 py-1 rounded-full shadow-sm">
                          {opt}
                          <button onClick={() => removeOption(opt)} className="text-[#94A3B8] hover:text-red-500 transition-colors ml-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Options for file field (Adjunto) */}
              {form.field_type === "file" && (
                <div className="space-y-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#F1F5F9]">
                  <div>
                    <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">Configuración de Archivos</h3>
                    <p className="text-[11px] text-[#94A3B8] mb-3">Habilita formatos y define el tamaño máximo por archivo.</p>
                  </div>
                  {(["pdf", "docx", "txt", "image"] as const).map(typeKey => {
                    const typeLabels: Record<string, string> = {
                      pdf: "Archivos PDF (.pdf)",
                      docx: "Documentos Word (.docx)",
                      txt: "Archivos de Texto (.txt)",
                      image: "Imágenes (JPG, PNG, WEBP)"
                    };
                    const typeIcons: Record<string, any> = {
                      pdf: <FileText className="w-4 h-4 text-red-500" />,
                      docx: <FileText className="w-4 h-4 text-blue-500" />,
                      txt: <FileText className="w-4 h-4 text-slate-500" />,
                      image: <ImageIcon className="w-4 h-4 text-emerald-500" />
                    };
                    const fileTypes = form.options?.fileTypes || defaultFileOptions().fileTypes;
                    const config = fileTypes[typeKey] || { enabled: true, maxMb: 1.0 };
                    return (
                      <div key={typeKey} className={`flex flex-col bg-white border border-[#E2E8F0] rounded-xl p-3 space-y-3 transition-opacity ${!config.enabled ? 'opacity-65' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                            {typeIcons[typeKey]} {typeLabels[typeKey]}
                          </span>
                          <Toggle 
                            checked={config.enabled} 
                            onChange={() => {
                              const newFileTypes = { ...fileTypes };
                              newFileTypes[typeKey] = { ...config, enabled: !config.enabled };
                              setForm(f => ({ ...f, options: { ...f.options, fileTypes: newFileTypes } }));
                            }} 
                            color={typeKey === 'pdf' ? 'bg-red-500' : typeKey === 'docx' ? 'bg-blue-500' : typeKey === 'txt' ? 'bg-slate-500' : 'bg-emerald-500'}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-[#E2E8F0]">
                          <span className="text-[#64748B]">Tamaño máximo:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0.1"
                              max="10"
                              step="0.1"
                              disabled={!config.enabled}
                              value={config.maxMb}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0.1;
                                const newFileTypes = { ...fileTypes };
                                newFileTypes[typeKey] = { ...config, maxMb: val };
                                setForm(f => ({ ...f, options: { ...f.options, fileTypes: newFileTypes } }));
                              }}
                              className="w-16 bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#4F5AF5] text-right disabled:bg-slate-100 disabled:text-slate-400"
                            />
                            <span className="text-[#64748B] font-semibold">MB</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dependency */}
              {form.field_type === "select" && (
                <div>
                  <label className={labelCls}>Depende de (Opcional)</label>
                  <select
                    value={form.depends_on}
                    onChange={e => {
                      const parentId = e.target.value;
                      if (!parentId) {
                        setForm(f => ({ ...f, depends_on: "", options_map: {} }));
                      } else {
                        const parentField = fields.find(f => f.key === parentId);
                        const initialMap: Record<string, string[]> = {};
                        parentField?.options.forEach(o => {
                          initialMap[o] = form.options_map[o] || [];
                        });
                        setForm(f => ({ ...f, depends_on: parentId, options_map: initialMap }));
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="">Ninguno</option>
                    {fields.filter(f => f.field_type === "select" && f.key !== form.key).map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Options Map (if dependent) */}
              {form.field_type === "select" && form.depends_on && (
                <div className="space-y-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#F1F5F9]">
                  <p className="text-sm font-semibold text-[#1E293B]">Mapeo de opciones</p>
                  <p className="text-xs text-[#94A3B8]">Define qué opciones estarán disponibles según lo que se elija en el campo padre.</p>
                  
                  {Object.keys(form.options_map).map(parentVal => (
                    <div key={parentVal}>
                      <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Si selecciona: {parentVal}</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          id={`input-${parentVal}`}
                          placeholder="Nueva opción y presiona Enter"
                          className={inputCls}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const target = e.target as HTMLInputElement;
                              const val = target.value.trim();
                              if (val && !form.options_map[parentVal].includes(val)) {
                                setForm(f => ({
                                  ...f,
                                  options_map: {
                                    ...f.options_map,
                                    [parentVal]: [...f.options_map[parentVal], val]
                                  }
                                }));
                                target.value = "";
                              }
                            }
                          }}
                        />
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const input = document.getElementById(`input-${parentVal}`) as HTMLInputElement;
                            const val = input.value.trim();
                            if (val && !form.options_map[parentVal].includes(val)) {
                              setForm(f => ({
                                ...f,
                                options_map: {
                                  ...f.options_map,
                                  [parentVal]: [...f.options_map[parentVal], val]
                                }
                              }));
                              input.value = "";
                            }
                          }}
                          className="bg-[#4F5AF5] text-white px-3 py-2 rounded-lg flex-shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {form.options_map[parentVal]?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-[#E2E8F0]">
                          {form.options_map[parentVal].map(opt => (
                            <span key={opt} className="flex items-center gap-1 bg-[#F1F5F9] text-[#1E293B] text-xs px-2 py-1 rounded-full shadow-sm">
                              {opt}
                              <button onClick={(e) => {
                                e.preventDefault();
                                setForm(f => ({
                                  ...f,
                                  options_map: {
                                    ...f.options_map,
                                    [parentVal]: f.options_map[parentVal].filter(o => o !== opt)
                                  }
                                }));
                              }} className="text-[#94A3B8] hover:text-red-500 ml-0.5">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* AI Instructions */}
              {activeSection === "ai" && (
                <div>
                  <label className={labelCls}>Instrucciones para la IA (Prompt) <span className="text-gray-400 font-normal lowercase">- Opcional</span></label>
                  <textarea
                    value={form.ai_instructions}
                    onChange={e => setForm(f => ({ ...f, ai_instructions: e.target.value }))}
                    placeholder="Ej: Si selecciona 'Alto', preguntar obligatoriamente por el riesgo financiero asociado."
                    className={`${inputCls} min-h-[80px] resize-y`}
                  />
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Agrega reglas o contexto extra para que la IA sepa cómo obtener esta información.
                  </p>
                </div>
              )}

              {/* Help Text */}
              <div>
                <label className={labelCls}>Texto de ayuda (Tooltip) <span className="text-gray-400 font-normal lowercase">- Opcional</span></label>
                <textarea
                  value={form.help_text || ""}
                  onChange={e => setForm(f => ({ ...f, help_text: e.target.value }))}
                  placeholder="Ej: Describe la información o formato esperado para este campo."
                  className={`${inputCls} min-h-[60px] resize-y`}
                />
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Este texto se mostrará como una nubecita de ayuda junto a la etiqueta del campo.
                </p>
              </div>

              {/* Required */}
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9]">
                <div>
                  <p className="text-sm font-semibold text-[#1E293B]">Campo obligatorio</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">No se puede avanzar sin completar este campo.</p>
                </div>
                <Toggle checked={form.is_required} onChange={() => setForm(f => ({ ...f, is_required: !f.is_required }))} />
              </div>

              {/* Visible (edit only) */}
              {panelMode === "edit" && (
                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9]">
                  <div>
                    <p className="text-sm font-semibold text-[#1E293B]">Campo visible</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Si está oculto, no aparece.</p>
                  </div>
                  <Toggle checked={form.is_visible} onChange={() => setForm(f => ({ ...f, is_visible: !f.is_visible }))} color="bg-emerald-500" />
                </div>
              )}

              {/* Requires Confirmation */}
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9]">
                <div>
                  <p className="text-sm font-semibold text-[#1E293B]">Requiere confirmación del usuario</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">El usuario debe confirmar explícitamente el valor de este campo en el formulario.</p>
                </div>
                <Toggle checked={form.requires_confirmation || false} onChange={() => setForm(f => ({ ...f, requires_confirmation: !f.requires_confirmation }))} color="bg-amber-500" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
              )}
            </div>

            <div className="px-6 py-5 border-t border-[#F1F5F9] flex gap-3">
              <button onClick={closePanel} className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] text-sm font-semibold transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Save className="w-4 h-4" />{panelMode === "create" ? "Guardar Campo" : "Guardar Cambios"}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
