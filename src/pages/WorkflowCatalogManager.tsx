import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCheck2, 
  ShieldCheck, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Copy, 
  Eye, 
  Check, 
  X, 
  Sparkles, 
  ChevronRight, 
  ArrowUp, 
  ArrowDown, 
  Sliders, 
  Layers, 
  HelpCircle, 
  AlertCircle,
  Clock,
  Lock,
  Workflow,
  CheckCircle2,
  Calendar,
  FileText,
  Paperclip,
  Image as ImageIcon,
  ArrowUpDown,
  UserCheck,
  ListPlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { StageForm, StageConsent, StageFormField, StageFormFieldType } from '../types';

interface FieldOptionsEditorProps {
  options: string[] | undefined;
  onChange: (options: string[]) => void;
}

const FieldOptionsEditor: React.FC<FieldOptionsEditorProps> = ({ options = [], onChange }) => {
  const [newOption, setNewOption] = useState('');

  const handleAdd = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;

    // Si el usuario escribe o pega varias opciones separadas por coma o salto de línea, procesarlas
    const itemsToAdd = trimmed
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (itemsToAdd.length === 0) return;

    const updated = [...options];
    for (const item of itemsToAdd) {
      if (!updated.includes(item)) {
        updated.push(item);
      }
    }
    onChange(updated);
    setNewOption('');
  };

  const handleRemove = (indexToRemove: number) => {
    const updated = options.filter((_, i) => i !== indexToRemove);
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;
    const copy = [...options];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onChange(copy);
  };

  return (
    <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
          <ListPlus className="w-3.5 h-3.5 text-indigo-600" />
          Opciones Disponibles
        </label>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          {options.length} {options.length === 1 ? 'opción' : 'opciones'}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Escribe una opción (o pega una lista) y presiona Agregar..."
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newOption.trim()}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>

      {options.length > 0 ? (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {options.map((opt, optIdx) => (
            <div
              key={`${opt}-${optIdx}`}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg group hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full shrink-0">
                  {optIdx + 1}
                </span>
                <span className="text-xs text-slate-700 font-medium truncate" title={opt}>
                  {opt}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  title="Subir opción"
                  disabled={optIdx === 0}
                  onClick={() => handleMove(optIdx, 'up')}
                  className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:text-slate-400 rounded transition-colors"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Bajar opción"
                  disabled={optIdx === options.length - 1}
                  onClick={() => handleMove(optIdx, 'down')}
                  className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:text-slate-400 rounded transition-colors"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Eliminar opción"
                  onClick={() => handleRemove(optIdx)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 text-center border border-dashed border-slate-200 rounded-lg bg-white/50">
          <p className="text-xs text-slate-400">
            No hay opciones configuradas. Escribe un valor arriba y presiona <strong>Enter</strong> o <strong>Agregar</strong>.
          </p>
        </div>
      )}
    </div>
  );
};

export const WorkflowCatalogManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'forms' | 'consents'>('forms');
  const [loading, setLoading] = useState<boolean>(true);

  // Data lists
  const [forms, setForms] = useState<StageForm[]>([]);
  const [consents, setConsents] = useState<StageConsent[]>([]);
  const [workflowNodes, setWorkflowNodes] = useState<any[]>([]);
  const [appRoles, setAppRoles] = useState<any[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'workflow_asc' | 'workflow_desc' | 'name_asc' | 'name_desc' | 'fields_count'>('workflow_asc');

  // Drawer / Modals
  const [editingForm, setEditingForm] = useState<StageForm | null>(null);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [editingConsent, setEditingConsent] = useState<StageConsent | null>(null);
  const [isConsentDrawerOpen, setIsConsentDrawerOpen] = useState(false);

  // Field editor state inside form drawer
  const [activeFieldEditIndex, setActiveFieldEditIndex] = useState<number | null>(null);

  // Quick live preview modal
  const [previewForm, setPreviewForm] = useState<StageForm | null>(null);
  const [previewConsent, setPreviewConsent] = useState<StageConsent | null>(null);

  // Notification / Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ── Fetch Catalogs ──────────────────────────────────────────────────────────
  const loadCatalogs = async () => {
    setLoading(true);
    try {
      // 1. Load Forms
      let fetchedForms: StageForm[] = [];
      try {
        const res = await fetch('/api/stage-forms');
        if (res.ok) {
          const json = await res.json();
          fetchedForms = json.data || [];
        } else {
          throw new Error('Fallback to Supabase');
        }
      } catch {
        const { data, error } = await supabase
          .from('stage_forms')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data) fetchedForms = data as StageForm[];
      }
      setForms(fetchedForms);

      // 2. Load Consents
      let fetchedConsents: StageConsent[] = [];
      try {
        const res = await fetch('/api/stage-consents');
        if (res.ok) {
          const json = await res.json();
          fetchedConsents = json.data || [];
        } else {
          throw new Error('Fallback to Supabase');
        }
      } catch {
        const { data, error } = await supabase
          .from('stage_consents')
          .select('*')
          .order('title', { ascending: true });
        if (!error && data) fetchedConsents = data as StageConsent[];
      }
      setConsents(fetchedConsents);

      // 3. Load Active Workflow to find associated states
      try {
        const { data: dbWf } = await supabase
          .from('workflow_definitions')
          .select('id, name, graph_json')
          .eq('status', 'published')
          .maybeSingle();
        if (dbWf?.graph_json?.nodes) {
          setWorkflowNodes(dbWf.graph_json.nodes);
        }
      } catch (wfErr) {
        console.warn('Error fetching workflow nodes for stage associations:', wfErr);
      }

      // 4. Load System Roles
      try {
        const { data: rolesData } = await supabase.from('app_roles').select('*').order('name');
        if (rolesData) setAppRoles(rolesData);
      } catch (rErr) {
        console.warn('Error fetching app_roles:', rErr);
      }
    } catch (err: any) {
      console.error('Error loading catalogs:', err);
      showNotification('error', 'Error al sincronizar catálogos.');
    } finally {
      setLoading(false);
    }
  };

  const getAssociatedNodesForForm = (formId?: string, formCode?: string) => {
    if (!formId && !formCode) return [];
    return (workflowNodes || []).filter(
      (n: any) =>
        (formId && n.data?.form_id === formId) ||
        (formCode && n.data?.form_id === formCode)
    );
  };

  const getAssociatedNodesForConsent = (consentId?: string, consentCode?: string) => {
    if (!consentId && !consentCode) return [];
    return (workflowNodes || []).filter(
      (n: any) =>
        (consentId && n.data?.consent_id === consentId) ||
        (consentCode && n.data?.consent_id === consentCode)
    );
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  // Orden de los estados en la secuencia oficial del flujo de trabajo (1 -> 12)
  const NODE_FLOW_ORDER: Record<string, number> = {
    'start': 0,
    'borrador': 1,
    'ai_chat': 1.5,
    'eval_bp': 2,
    'aprob_bo': 3,
    'aprob_vp': 4,
    'asig_demanda': 5,
    'ventana_est': 6,
    'gw_presupuesto': 6.5,
    'est_con_presupuesto': 7.1,
    'est_sin_presupuesto': 7.2,
    'val_est_bp': 8.1,
    'vobo_est_bo': 8.2,
    'plan_fechas': 9,
    'val_plan_bp': 10,
    'aprob_plan_bo': 11,
    'planificacion': 12,
    'observada': 20,
    'desestimada': 30,
    'end': 99
  };

  const getWorkflowRankForNodes = (nodes: any[]): number => {
    if (!nodes || nodes.length === 0) return 999;
    let minRank = 999;
    for (const node of nodes) {
      if (NODE_FLOW_ORDER[node.id] !== undefined) {
        minRank = Math.min(minRank, NODE_FLOW_ORDER[node.id]);
        continue;
      }
      const match = (node.data?.label || '').match(/^(\d+)([a-zA-Z]?)/);
      if (match) {
        const num = parseInt(match[1], 10);
        const sub = match[2] ? (match[2].toLowerCase().charCodeAt(0) - 96) * 0.1 : 0;
        minRank = Math.min(minRank, num + sub);
      } else {
        minRank = Math.min(minRank, 500);
      }
    }
    return minRank;
  };

  // ── Form Filtered & Sorted ──────────────────────────────────────────────────
  const filteredForms = useMemo(() => {
    const list = forms.filter((f) => {
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? f.is_active : !f.is_active;
      return matchSearch && matchStatus;
    });

    return list.sort((a, b) => {
      if (sortBy === 'workflow_asc' || sortBy === 'workflow_desc') {
        const rankA = getWorkflowRankForNodes(getAssociatedNodesForForm(a.id, a.code));
        const rankB = getWorkflowRankForNodes(getAssociatedNodesForForm(b.id, b.code));
        if (rankA !== rankB) {
          return sortBy === 'workflow_asc' ? rankA - rankB : rankB - rankA;
        }
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'fields_count') return (b.fields || []).length - (a.fields || []).length;
      return 0;
    });
  }, [forms, searchTerm, statusFilter, sortBy, workflowNodes]);

  // ── Consent Filtered & Sorted ───────────────────────────────────────────────
  const filteredConsents = useMemo(() => {
    const list = consents.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.statement.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? c.is_active : !c.is_active;
      return matchSearch && matchStatus;
    });

    return list.sort((a, b) => {
      if (sortBy === 'workflow_asc' || sortBy === 'workflow_desc') {
        const rankA = getWorkflowRankForNodes(getAssociatedNodesForConsent(a.id, a.code));
        const rankB = getWorkflowRankForNodes(getAssociatedNodesForConsent(b.id, b.code));
        if (rankA !== rankB) {
          return sortBy === 'workflow_asc' ? rankA - rankB : rankB - rankA;
        }
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'name_desc') return b.title.localeCompare(a.title);
      return 0;
    });
  }, [consents, searchTerm, statusFilter, sortBy, workflowNodes]);

  // ── Form Actions ────────────────────────────────────────────────────────────
  const handleOpenNewForm = () => {
    setEditingForm({
      id: '',
      code: '',
      name: '',
      description: '',
      fields: [
        {
          id: 'f1',
          key: 'dictamen_estado',
          label: 'Dictamen de Viabilidad',
          type: 'select',
          required: true,
          options: ['Viable sin observaciones', 'Viable con condiciones', 'No viable'],
          helpText: 'Seleccione el dictamen formal para esta etapa',
        },
        {
          id: 'f2',
          key: 'observaciones_tecnicas',
          label: 'Observaciones y Sustento',
          type: 'textarea',
          required: true,
          placeholder: 'Detalle el sustento de su evaluación...',
        },
      ],
      is_active: true,
    });
    setActiveFieldEditIndex(null);
    setIsFormDrawerOpen(true);
  };

  const handleEditForm = (form: StageForm) => {
    setEditingForm(JSON.parse(JSON.stringify(form)));
    setActiveFieldEditIndex(null);
    setIsFormDrawerOpen(true);
  };

  const handleDuplicateForm = (form: StageForm) => {
    const duplicated: StageForm = {
      ...JSON.parse(JSON.stringify(form)),
      id: '',
      code: `${form.code}_copia_${Date.now().toString(36).slice(-4)}`,
      name: `${form.name} (Copia)`,
    };
    setEditingForm(duplicated);
    setActiveFieldEditIndex(null);
    setIsFormDrawerOpen(true);
  };

  const handleDeleteForm = async (form: StageForm) => {
    if (!window.confirm(`¿Estás seguro de eliminar el formulario "${form.name}"?`)) return;
    try {
      let ok = false;
      try {
        const res = await fetch(`/api/stage-forms/${form.id}`, { method: 'DELETE' });
        if (res.ok) ok = true;
      } catch {}
      if (!ok) {
        const { error } = await supabase.from('stage_forms').delete().eq('id', form.id);
        if (error) throw error;
      }
      setForms((prev) => prev.filter((f) => f.id !== form.id));
      showNotification('success', 'Formulario eliminado exitosamente.');
    } catch (err: any) {
      showNotification('error', `Error al eliminar formulario: ${err.message}`);
    }
  };

  const handleSaveForm = async () => {
    if (!editingForm) return;
    if (!editingForm.name.trim() || !editingForm.code.trim()) {
      alert('Por favor especifica un nombre y un código único para el formulario.');
      return;
    }

    try {
      const payload = {
        code: editingForm.code.trim().toLowerCase().replace(/\s+/g, '_'),
        name: editingForm.name.trim(),
        description: editingForm.description?.trim() || null,
        fields: editingForm.fields || [],
        is_active: editingForm.is_active !== false,
      };

      let savedData: StageForm | null = null;
      if (editingForm.id) {
        // Update
        try {
          const res = await fetch(`/api/stage-forms/${editingForm.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const json = await res.json();
            savedData = json.data;
          }
        } catch {}

        if (!savedData) {
          const { data, error } = await supabase
            .from('stage_forms')
            .update(payload)
            .eq('id', editingForm.id)
            .select()
            .single();
          if (error) throw error;
          savedData = data as StageForm;
        }

        setForms((prev) => prev.map((f) => (f.id === editingForm.id ? savedData! : f)));
        showNotification('success', 'Formulario actualizado correctamente.');
      } else {
        // Create
        try {
          const res = await fetch('/api/stage-forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const json = await res.json();
            savedData = json.data;
          }
        } catch {}

        if (!savedData) {
          const { data, error } = await supabase
            .from('stage_forms')
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          savedData = data as StageForm;
        }

        setForms((prev) => [savedData!, ...prev]);
        showNotification('success', 'Nuevo formulario creado correctamente.');
      }

      setIsFormDrawerOpen(false);
      setEditingForm(null);
    } catch (err: any) {
      showNotification('error', `Error al guardar formulario: ${err.message}`);
    }
  };

  // ── Form Field Operations ───────────────────────────────────────────────────
  const handleAddField = () => {
    if (!editingForm) return;
    const newField: StageFormField = {
      id: `f_${Date.now().toString(36)}`,
      key: `campo_${(editingForm.fields.length + 1)}`,
      label: `Nuevo Campo ${editingForm.fields.length + 1}`,
      type: 'text',
      required: false,
      placeholder: '',
      helpText: '',
      ask_in_initial_form: false,
    };
    const updated = [...editingForm.fields, newField];
    setEditingForm({ ...editingForm, fields: updated });
    setActiveFieldEditIndex(updated.length - 1);
  };

  const handleUpdateField = (index: number, updates: Partial<StageFormField>) => {
    if (!editingForm) return;
    const fields = [...editingForm.fields];
    fields[index] = { ...fields[index], ...updates };
    setEditingForm({ ...editingForm, fields });
  };

  const handleRemoveField = (index: number) => {
    if (!editingForm) return;
    const fields = editingForm.fields.filter((_, i) => i !== index);
    setEditingForm({ ...editingForm, fields });
    if (activeFieldEditIndex === index) setActiveFieldEditIndex(null);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (!editingForm) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= editingForm.fields.length) return;
    const fields = [...editingForm.fields];
    const temp = fields[index];
    fields[index] = fields[targetIdx];
    fields[targetIdx] = temp;
    setEditingForm({ ...editingForm, fields });
    setActiveFieldEditIndex(targetIdx);
  };

  // ── Consent Actions ─────────────────────────────────────────────────────────
  const handleOpenNewConsent = () => {
    setEditingConsent({
      id: '',
      code: '',
      title: '',
      statement: 'Yo, en mi calidad de [Rol Responsable], declaro bajo responsabilidad que he revisado de manera íntegra y exhaustiva los antecedentes técnicos, operativos y de negocio de esta iniciativa, otorgando mi conformidad formal para su prosecución en la cadena de demanda TI.',
      version: 1,
      is_active: true,
    });
    setIsConsentDrawerOpen(true);
  };

  const handleEditConsent = (consent: StageConsent) => {
    setEditingConsent(JSON.parse(JSON.stringify(consent)));
    setIsConsentDrawerOpen(true);
  };

  const handleDuplicateConsent = (consent: StageConsent) => {
    const duplicated: StageConsent = {
      ...JSON.parse(JSON.stringify(consent)),
      id: '',
      code: `${consent.code}_v${consent.version + 1}`,
      title: `${consent.title} (Copia)`,
      version: consent.version + 1,
    };
    setEditingConsent(duplicated);
    setIsConsentDrawerOpen(true);
  };

  const handleDeleteConsent = async (consent: StageConsent) => {
    if (!window.confirm(`¿Estás seguro de eliminar el consentimiento "${consent.title}"?`)) return;
    try {
      let ok = false;
      try {
        const res = await fetch(`/api/stage-consents/${consent.id}`, { method: 'DELETE' });
        if (res.ok) ok = true;
      } catch {}
      if (!ok) {
        const { error } = await supabase.from('stage_consents').delete().eq('id', consent.id);
        if (error) throw error;
      }
      setConsents((prev) => prev.filter((c) => c.id !== consent.id));
      showNotification('success', 'Consentimiento eliminado exitosamente.');
    } catch (err: any) {
      showNotification('error', `Error al eliminar consentimiento: ${err.message}`);
    }
  };

  const handleSaveConsent = async () => {
    if (!editingConsent) return;
    if (!editingConsent.title.trim() || !editingConsent.code.trim() || !editingConsent.statement.trim()) {
      alert('Por favor completa el código, título y la declaración formal del consentimiento.');
      return;
    }

    try {
      const payload = {
        code: editingConsent.code.trim().toLowerCase().replace(/\s+/g, '_'),
        title: editingConsent.title.trim(),
        statement: editingConsent.statement.trim(),
        version: Number(editingConsent.version) || 1,
        is_active: editingConsent.is_active !== false,
      };

      let savedData: StageConsent | null = null;
      if (editingConsent.id) {
        // Update
        try {
          const res = await fetch(`/api/stage-consents/${editingConsent.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const json = await res.json();
            savedData = json.data;
          }
        } catch {}

        if (!savedData) {
          const { data, error } = await supabase
            .from('stage_consents')
            .update(payload)
            .eq('id', editingConsent.id)
            .select()
            .single();
          if (error) throw error;
          savedData = data as StageConsent;
        }

        setConsents((prev) => prev.map((c) => (c.id === editingConsent.id ? savedData! : c)));
        showNotification('success', 'Consentimiento actualizado correctamente.');
      } else {
        // Create
        try {
          const res = await fetch('/api/stage-consents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const json = await res.json();
            savedData = json.data;
          }
        } catch {}

        if (!savedData) {
          const { data, error } = await supabase
            .from('stage_consents')
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          savedData = data as StageConsent;
        }

        setConsents((prev) => [savedData!, ...prev]);
        showNotification('success', 'Nuevo consentimiento registrado correctamente.');
      }

      setIsConsentDrawerOpen(false);
      setEditingConsent(null);
    } catch (err: any) {
      showNotification('error', `Error al guardar consentimiento: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Top Hero Header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4F5AF5] to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Gestor de Formularios & Consentimientos
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-[#4F5AF5] border border-indigo-100">
                    Cadena de Custodia
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Diseña formularios dinámicos y declaraciones legales requeridas en cada etapa de aprobación del flujo IACS.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={activeTab === 'forms' ? handleOpenNewForm : handleOpenNewConsent}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#4F5AF5] to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/25 transition-all transform active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{activeTab === 'forms' ? 'Nuevo Formulario' : 'Nuevo Consentimiento'}</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-6 border-b border-slate-100">
            <button
              type="button"
              onClick={() => { setActiveTab('forms'); setSearchTerm(''); }}
              className={`flex items-center gap-2.5 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'forms'
                  ? 'border-[#4F5AF5] text-[#4F5AF5]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Formularios de Etapa</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'forms' ? 'bg-indigo-100 text-[#4F5AF5]' : 'bg-slate-100 text-slate-600'
              }`}>
                {forms.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('consents'); setSearchTerm(''); }}
              className={`flex items-center gap-2.5 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'consents'
                  ? 'border-[#4F5AF5] text-[#4F5AF5]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Consentimientos & Declaraciones</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'consents' ? 'bg-indigo-100 text-[#4F5AF5]' : 'bg-slate-100 text-slate-600'
              }`}>
                {consents.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Notification Toast ───────────────────────────────────────────────── */}
      {feedback && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div
            className={`p-3 rounded-xl flex items-center justify-between text-sm font-medium border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Controls: Search & Filter ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'forms' ? 'Buscar formulario por nombre, código...' : 'Buscar consentimiento...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Selector de Ordenamiento por Flujo / Nombre */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#4F5AF5] shrink-0" />
              <span className="text-slate-500 font-medium">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer pr-1 text-xs"
              >
                <option value="workflow_asc">⚡ Secuencia del Flujo (Borrador ➔ Fin)</option>
                <option value="workflow_desc">🔄 Secuencia del Flujo (Fin ➔ Borrador)</option>
                <option value="name_asc">🔤 Nombre (A ➔ Z)</option>
                <option value="name_desc">🔤 Nombre (Z ➔ A)</option>
                {activeTab === 'forms' && (
                  <option value="fields_count">📊 Cantidad de campos</option>
                )}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400">Estado:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    statusFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Activos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    statusFilter === 'inactive' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Inactivos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Catalog Grid ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-3 border-[#4F5AF5] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium">Cargando catálogos de custodia...</p>
          </div>
        ) : activeTab === 'forms' ? (
          /* ── Forms List ── */
          filteredForms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No se encontraron formularios</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {searchTerm
                  ? 'No hay formularios que coincidan con los criterios de búsqueda.'
                  : 'Crea tu primer formulario de etapa para asociarlo a los nodos del editor de flujos.'}
              </p>
              <button
                type="button"
                onClick={handleOpenNewForm}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F5AF5] hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Formulario</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredForms.map((form) => {
                const fields = form.fields || [];
                const associatedNodes = getAssociatedNodesForForm(form.id, form.code);
                return (
                  <div
                    key={form.id}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {associatedNodes.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-[#4F5AF5] border border-indigo-200">
                              Etapa {associatedNodes[0].data?.label?.split('.')[0]?.trim()}
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {form.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              form.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {form.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewForm(form)}
                            title="Vista previa del formulario"
                            className="p-1.5 text-slate-400 hover:text-[#4F5AF5] hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateForm(form)}
                            title="Duplicar formulario"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditForm(form)}
                            title="Editar formulario"
                            className="p-1.5 text-slate-400 hover:text-[#4F5AF5] hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteForm(form)}
                            title="Eliminar formulario"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#4F5AF5] transition-colors leading-snug">
                        {form.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                        {form.description || 'Sin descripción detallada.'}
                      </p>

                      {/* Fields Pills Preview */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="font-semibold text-slate-600 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-[#4F5AF5]" />
                            {fields.length} {fields.length === 1 ? 'campo configurado' : 'campos configurados'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                          {fields.slice(0, 4).map((f) => (
                            <span
                              key={f.id}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200"
                            >
                              {f.label} {f.required && <strong className="text-rose-500">*</strong>}
                            </span>
                          ))}
                          {fields.length > 4 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700">
                              +{fields.length - 4} más
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Estado Asociado en Flujo Oficial */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-500 flex items-center gap-1">
                          <Workflow className="w-3.5 h-3.5 text-[#4F5AF5]" />
                          <span>Asociado a:</span>
                        </span>
                        {(() => {
                          const associated = getAssociatedNodesForForm(form.id, form.code);
                          if (associated.length === 0) {
                            return (
                              <span className="text-[10px] text-slate-400 italic">
                                Sin asociar
                              </span>
                            );
                          }
                          return (
                            <div className="flex flex-wrap gap-1 justify-end max-w-[65%]">
                              {associated.map((n: any) => (
                                <span
                                  key={n.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="truncate max-w-[130px]">{n.data?.label || n.id}</span>
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setPreviewForm(form)}
                        className="text-xs font-bold text-[#4F5AF5] hover:text-indigo-700 flex items-center gap-1"
                      >
                        <span>Probar en vivo</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditForm(form)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Configurar campos
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Consents List ── */
          filteredConsents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No se encontraron declaraciones de consentimiento</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {searchTerm
                  ? 'No hay consentimientos que coincidan con la búsqueda.'
                  : 'Crea tu primera declaración de consentimiento legal para asignarla a las etapas de aprobación.'}
              </p>
              <button
                type="button"
                onClick={handleOpenNewConsent}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F5AF5] hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Consentimiento</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredConsents.map((consent) => {
                const associatedConsents = getAssociatedNodesForConsent(consent.id, consent.code);
                return (
                  <div
                    key={consent.id}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {associatedConsents.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-[#4F5AF5] border border-indigo-200">
                              Etapa {associatedConsents[0].data?.label?.split('.')[0]?.trim()}
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {consent.code}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            v{consent.version}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              consent.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {consent.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewConsent(consent)}
                          title="Vista previa del consentimiento"
                          className="p-1.5 text-slate-400 hover:text-[#4F5AF5] hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateConsent(consent)}
                          title="Duplicar consentimiento"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditConsent(consent)}
                          title="Editar consentimiento"
                          className="p-1.5 text-slate-400 hover:text-[#4F5AF5] hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConsent(consent)}
                          title="Eliminar consentimiento"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#4F5AF5] transition-colors leading-snug">
                      {consent.title}
                    </h3>

                    {/* Statement Preview with legal frame */}
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 line-clamp-4 leading-relaxed font-sans italic">
                      "{consent.statement}"
                    </div>

                    {/* Estado(s) Asociado(s) en Flujo Oficial */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-500 flex items-center gap-1">
                        <Workflow className="w-3.5 h-3.5 text-[#4F5AF5]" />
                        <span>Asociado a:</span>
                      </span>
                      {(() => {
                        const associated = getAssociatedNodesForConsent(consent.id, consent.code);
                        if (associated.length === 0) {
                          return (
                            <span className="text-[10px] text-slate-400 italic">
                              Sin asociar
                            </span>
                          );
                        }
                        return (
                          <div className="flex flex-wrap gap-1 justify-end max-w-[65%]">
                            {associated.map((n: any) => (
                              <span
                                key={n.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="truncate max-w-[130px]">{n.data?.label || n.id}</span>
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPreviewConsent(consent)}
                      className="text-xs font-bold text-[#4F5AF5] hover:text-indigo-700 flex items-center gap-1"
                    >
                      <span>Simular firma</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Obligatorio al aprobar
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
          )
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── FORM DRAWER (BUILDER) ───────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isFormDrawerOpen && editingForm && (
        <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#4F5AF5]/10 text-[#4F5AF5] flex items-center justify-center font-bold">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingForm.id ? 'Editar Formulario de Etapa' : 'Nuevo Formulario de Etapa'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Define los campos que el responsable de etapa debe completar formalmente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsFormDrawerOpen(false); setEditingForm(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Estado Asociado en Flujo Oficial Banner */}
              {(() => {
                const associated = getAssociatedNodesForForm(editingForm.id, editingForm.code);
                return (
                  <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 to-blue-50/70 border border-indigo-200/90 rounded-2xl space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Workflow className="w-4 h-4 text-[#4F5AF5]" />
                        <span>Asociación en el Flujo Oficial (IACS)</span>
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                        {associated.length > 0 ? `${associated.length} ${associated.length === 1 ? 'estado asignado' : 'estados asignados'}` : 'Sin asignación'}
                      </span>
                    </div>
                    {associated.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {associated.map((n: any) => (
                          <span
                            key={n.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-indigo-900 border border-indigo-200 shadow-2xs"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{n.data?.label || n.id}</span>
                            <span className="text-[10px] font-mono text-slate-400">({n.id})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Este formulario no está asignado a ningún estado actualmente. Puedes asignarlo desde el{' '}
                        <a href="/admin/workflow-editor" className="text-indigo-600 font-bold hover:underline" target="_blank" rel="noreferrer">
                          Editor de Flujos
                        </a>{' '}
                        (Pestaña <em>Dictamen</em> de la tarjeta deseada).
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Form Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Código Identificador <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ej: form_bp_viabilidad"
                    value={editingForm.code}
                    onChange={(e) => setEditingForm({ ...editingForm, code: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5] focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Identificador único en minúsculas y sin espacios.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Estado del Formulario
                  </label>
                  <div className="flex items-center gap-2 pt-1.5">
                    <input
                      type="checkbox"
                      id="form_is_active"
                      checked={editingForm.is_active}
                      onChange={(e) => setEditingForm({ ...editingForm, is_active: e.target.checked })}
                      className="w-4 h-4 rounded-md text-[#4F5AF5] focus:ring-[#4F5AF5] cursor-pointer"
                    />
                    <label htmlFor="form_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Activo para asociar en flujos
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre del Formulario <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ej: Evaluación y Viabilidad Técnica (BP TI)"
                    value={editingForm.name}
                    onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5] focus:outline-none font-semibold text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Descripción / Propósito
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Explica a los evaluadores el objetivo de esta ficha técnica..."
                    value={editingForm.description || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5] focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Field Builder */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#4F5AF5]" />
                      Campos de Dictamen ({editingForm.fields.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Arrastra o reordena los campos requeridos en esta evaluación.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-[#4F5AF5] hover:bg-indigo-100 border border-indigo-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Campo</span>
                  </button>
                </div>

                {/* Fields List */}
                <div className="space-y-3">
                  {editingForm.fields.map((field, idx) => {
                    const isExpanded = activeFieldEditIndex === idx;
                    return (
                      <div
                        key={field.id || idx}
                        className={`border rounded-2xl transition-all ${
                          isExpanded
                            ? 'border-indigo-300 bg-indigo-50/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Field Header Summary */}
                        <div className="p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {field.label || 'Campo sin etiqueta'}
                                </span>
                                {field.required && (
                                  <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.2 rounded-sm">
                                    Obligatorio
                                  </span>
                                )}
                                {field.ask_in_initial_form ? (
                                  <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-sm border border-blue-200">
                                    Paso 1 Previo
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded-sm border border-purple-200">
                                    Conversación IA
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">
                                {field.key} • {field.type}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveField(idx, 'up')}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              title="Subir"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === editingForm.fields.length - 1}
                              onClick={() => handleMoveField(idx, 'down')}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              title="Bajar"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveFieldEditIndex(isExpanded ? null : idx)}
                              className="px-2.5 py-1 text-xs font-semibold text-[#4F5AF5] hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              {isExpanded ? 'Listo' : 'Editar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveField(idx)}
                              className="p-1 text-slate-300 hover:text-rose-500 rounded-lg"
                              title="Eliminar campo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Field Edit Subform */}
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-indigo-100 mt-2 space-y-3 bg-white rounded-b-2xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Etiqueta Visible
                                </label>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Clave (Key) en el JSON
                                </label>
                                <input
                                  type="text"
                                  value={field.key}
                                  onChange={(e) =>
                                    handleUpdateField(idx, {
                                      key: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                                    })
                                  }
                                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Tipo de Control
                                </label>
                                <select
                                  value={field.type}
                                  onChange={(e) =>
                                    handleUpdateField(idx, { type: e.target.value as StageFormFieldType })
                                  }
                                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                                >
                                  <option value="text">Texto corto (Input)</option>
                                  <option value="textarea">Texto largo (Textarea)</option>
                                  <option value="select">Lista de opciones (Select)</option>
                                  <option value="multiselect">Selección múltiple (Chips)</option>
                                  <option value="number">Numérico / Presupuesto</option>
                                  <option value="date">Fecha (DD/MM/AAAA)</option>
                                  <option value="checkbox">Casilla de verificación (Sí / No)</option>
                                  <option value="file">Multimedia / Archivos adjuntos (PDF, Excel, Word, etc.)</option>
                                  <option value="role_user">Responsable por Rol (Usuario asignado)</option>
                                </select>
                              </div>

                              <div className="flex items-center gap-2 pt-5">
                                <input
                                  type="checkbox"
                                  id={`req_${idx}`}
                                  checked={field.required}
                                  onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                                  className="w-4 h-4 rounded-md text-[#4F5AF5] focus:ring-[#4F5AF5] cursor-pointer"
                                />
                                <label htmlFor={`req_${idx}`} className="text-xs font-bold text-slate-700 cursor-pointer">
                                  Campo obligatorio para aprobar
                                </label>
                              </div>

                              <div className="flex items-start gap-2 pt-3 border-t border-slate-100 mt-2">
                                <input
                                  type="checkbox"
                                  id={`init_form_${idx}`}
                                  checked={field.ask_in_initial_form === true}
                                  onChange={(e) => handleUpdateField(idx, { ask_in_initial_form: e.target.checked })}
                                  className="w-4 h-4 mt-0.5 rounded-md text-[#4F5AF5] focus:ring-[#4F5AF5] cursor-pointer"
                                />
                                <div>
                                  <label htmlFor={`init_form_${idx}`} className="text-xs font-bold text-slate-700 cursor-pointer block">
                                    Solicitar en Formulario Previo (Paso 1)
                                  </label>
                                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                    Si se desmarca, este campo no aparecerá al inicio y la IA (TEO) lo preguntará y completará durante el chat.
                                  </p>
                                </div>
                              </div>

                              {field.type === 'file' && (() => {
                                const currentOptions = field.fileOptions || {
                                  allowMultiple: true,
                                  maxFiles: 5,
                                  fileTypes: {
                                    pdf: { enabled: true, maxMb: 10 },
                                    docx: { enabled: true, maxMb: 10 },
                                    xlsx: { enabled: true, maxMb: 10 },
                                    image: { enabled: true, maxMb: 5 },
                                    txt: { enabled: true, maxMb: 2 },
                                  },
                                };

                                const updateFileConfig = (key: 'pdf' | 'docx' | 'xlsx' | 'image' | 'txt', updates: Partial<{ enabled: boolean; maxMb: number }>) => {
                                  const prevTypes = currentOptions.fileTypes || {};
                                  const curr = prevTypes[key] || { enabled: true, maxMb: 10 };
                                  const nextOptions = {
                                    ...currentOptions,
                                    fileTypes: {
                                      ...prevTypes,
                                      [key]: { ...curr, ...updates },
                                    },
                                  };
                                  handleUpdateField(idx, { fileOptions: nextOptions });
                                };

                                const toggleMultiple = (allow: boolean) => {
                                  handleUpdateField(idx, {
                                    fileOptions: { ...currentOptions, allowMultiple: allow },
                                  });
                                };

                                const updateMaxFiles = (count: number) => {
                                  handleUpdateField(idx, {
                                    fileOptions: { ...currentOptions, maxFiles: count },
                                  });
                                };

                                const fileTypeDefinitions: Array<{
                                  key: 'pdf' | 'docx' | 'xlsx' | 'image' | 'txt';
                                  label: string;
                                  ext: string;
                                  badgeColor: string;
                                }> = [
                                  { key: 'pdf', label: 'Archivos PDF', ext: '.pdf', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
                                  { key: 'docx', label: 'Documentos Word', ext: '.docx', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
                                  { key: 'xlsx', label: 'Hojas de Cálculo Excel', ext: '.xlsx, .xls', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                                  { key: 'image', label: 'Imágenes / Diagramas', ext: '.jpg, .png, .webp', badgeColor: 'bg-violet-50 text-violet-700 border-violet-200' },
                                  { key: 'txt', label: 'Archivos de Texto Plano', ext: '.txt', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
                                ];

                                return (
                                  <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                                      <div>
                                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                          <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                                          Parametrización de Archivos y Multimedia
                                        </h4>
                                        <p className="text-[10px] text-slate-500">
                                          Formatos autorizados y límite en MB por archivo (máx 25 MB).
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={currentOptions.allowMultiple !== false}
                                            onChange={(e) => toggleMultiple(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                          />
                                          <span>Múltiples archivos</span>
                                        </label>
                                        {currentOptions.allowMultiple !== false && (
                                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                            <span>(máx</span>
                                            <input
                                              type="number"
                                              min={1}
                                              max={10}
                                              value={currentOptions.maxFiles || 5}
                                              onChange={(e) => updateMaxFiles(Math.max(1, parseInt(e.target.value) || 1))}
                                              className="w-10 px-1 py-0.5 text-center text-xs bg-white border border-slate-200 rounded font-bold"
                                            />
                                            <span>archivos)</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {fileTypeDefinitions.map((item) => {
                                        const cfg = currentOptions.fileTypes?.[item.key] || { enabled: true, maxMb: 10 };
                                        return (
                                          <div
                                            key={item.key}
                                            className={`p-2 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                                              cfg.enabled ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-100/60 border-slate-200/50 opacity-60'
                                            }`}
                                          >
                                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                              <input
                                                type="checkbox"
                                                checked={cfg.enabled}
                                                onChange={(e) => updateFileConfig(item.key, { enabled: e.target.checked })}
                                                className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                              />
                                              <div className="truncate">
                                                <span className="text-[11px] font-bold text-slate-800 block truncate">{item.label}</span>
                                                <span className={`inline-block px-1 py-0.2 rounded text-[9px] font-mono border ${item.badgeColor}`}>
                                                  {item.ext}
                                                </span>
                                              </div>
                                            </label>

                                            <div className="flex items-center gap-1 shrink-0">
                                              <input
                                                type="number"
                                                min={0.5}
                                                max={25}
                                                step={0.5}
                                                disabled={!cfg.enabled}
                                                value={cfg.maxMb}
                                                onChange={(e) =>
                                                  updateFileConfig(item.key, {
                                                    maxMb: Math.min(25, Math.max(0.5, parseFloat(e.target.value) || 1)),
                                                  })
                                                }
                                                className="w-12 px-1.5 py-0.5 text-xs text-right bg-slate-50 border border-slate-200 rounded font-bold text-slate-700 disabled:opacity-40"
                                              />
                                              <span className="text-[10px] font-semibold text-slate-400">MB</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}

                              {(field.type === 'select' || field.type === 'multiselect') && (
                                <FieldOptionsEditor
                                  options={field.options}
                                  onChange={(newOpts) => handleUpdateField(idx, { options: newOpts })}
                                />
                              )}

                              {field.type === 'role_user' && (
                                <div className="sm:col-span-2 p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                      Rol del Sistema Requerido
                                    </label>
                                    <select
                                      value={field.target_role || 'bp_ti'}
                                      onChange={(e) => handleUpdateField(idx, { target_role: e.target.value })}
                                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                                    >
                                      {appRoles && appRoles.length > 0 ? (
                                        appRoles.map((r: any) => {
                                          const roleVal = r.code || r.role_key || r.id;
                                          return (
                                            <option key={r.id || roleVal} value={roleVal}>
                                              {r.name} ({roleVal})
                                            </option>
                                          );
                                        })
                                      ) : (
                                        <>
                                          <option value="bp_ti">Business Partner de TI (BP TI)</option>
                                          <option value="business_owner">Business Owner (Líder Solicitante)</option>
                                          <option value="vicepresidente_del_negocio">Vicepresidente del Negocio</option>
                                          <option value="gestor_de_la_demanda">Gestor de la Demanda TI</option>
                                          <option value="lider_de_dominio">Líder de Dominio de Arquitectura</option>
                                          <option value="registrador">Registrador de Iniciativas</option>
                                          <option value="admin">Administrador General</option>
                                        </>
                                      )}
                                    </select>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                      Solo se listarán las personas dadas de alta en el sistema con este rol.
                                    </p>
                                  </div>

                                  <div className="flex items-start gap-2 pt-2.5 border-t border-indigo-100">
                                    <input
                                      type="checkbox"
                                      id={`scope_${idx}`}
                                      checked={field.filter_by_scope !== false}
                                      onChange={(e) => handleUpdateField(idx, { filter_by_scope: e.target.checked })}
                                      className="w-4 h-4 mt-0.5 rounded-md text-[#4F5AF5] focus:ring-[#4F5AF5] cursor-pointer"
                                    />
                                    <div>
                                      <label htmlFor={`scope_${idx}`} className="text-xs font-bold text-slate-700 cursor-pointer block">
                                        Filtrar por Vicepresidencia y Dirección de la iniciativa
                                      </label>
                                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                        Si está marcado, solo se mostrarán personas con permisos sobre la VP/Dirección solicitante (o alcance transversal). Si solo existe 1 persona, el campo se bloqueará automáticamente con esa persona.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Placeholder sugerido
                                </label>
                                <input
                                  type="text"
                                  value={field.placeholder || ''}
                                  onChange={(e) => handleUpdateField(idx, { placeholder: e.target.value })}
                                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Texto de ayuda o criterio
                                </label>
                                <input
                                  type="text"
                                  value={field.helpText || ''}
                                  onChange={(e) => handleUpdateField(idx, { helpText: e.target.value })}
                                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-white shadow-xl shrink-0 sticky bottom-0 z-20 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setIsFormDrawerOpen(false); setEditingForm(null); }}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveForm}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold bg-gradient-to-r from-[#4F5AF5] to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Guardar Formulario</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── CONSENT DRAWER (STATEMENT EDITOR) ────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isConsentDrawerOpen && editingConsent && (
        <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#4F5AF5] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingConsent.id ? 'Editar Consentimiento' : 'Nueva Declaración de Consentimiento'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Texto legal de aceptación que el evaluador debe certificar obligatoriamente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsConsentDrawerOpen(false); setEditingConsent(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Estado Asociado en Flujo Oficial Banner */}
              {(() => {
                const associated = getAssociatedNodesForConsent(editingConsent.id, editingConsent.code);
                return (
                  <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 to-blue-50/70 border border-indigo-200/90 rounded-2xl space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Workflow className="w-4 h-4 text-[#4F5AF5]" />
                        <span>Asociación en el Flujo Oficial (IACS)</span>
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                        {associated.length > 0 ? `${associated.length} ${associated.length === 1 ? 'estado asignado' : 'estados asignados'}` : 'Sin asignación'}
                      </span>
                    </div>
                    {associated.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {associated.map((n: any) => (
                          <span
                            key={n.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-indigo-900 border border-indigo-200 shadow-2xs"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{n.data?.label || n.id}</span>
                            <span className="text-[10px] font-mono text-slate-400">({n.id})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Este consentimiento no está asignado a ningún estado actualmente. Puedes asignarlo desde el{' '}
                        <a href="/admin/workflow-editor" className="text-indigo-600 font-bold hover:underline" target="_blank" rel="noreferrer">
                          Editor de Flujos
                        </a>{' '}
                        (Pestaña <em>Dictamen</em> de la tarjeta deseada).
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Código Identificador <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ej: consent_bp_ti"
                    value={editingConsent.code}
                    onChange={(e) => setEditingConsent({ ...editingConsent, code: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5] focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Identificador unívoco en minúsculas.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Versión
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingConsent.version}
                    onChange={(e) => setEditingConsent({ ...editingConsent, version: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Título de la Declaración <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ej: Conformidad y Viabilidad Técnica del Business Partner TI"
                    value={editingConsent.title}
                    onChange={(e) => setEditingConsent({ ...editingConsent, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5] focus:outline-none font-semibold text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Texto Legal / Declaración Jurada <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {editingConsent.statement.length} caracteres
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Escribe el texto de la declaración que se mostrará junto al checkbox de aceptación..."
                    value={editingConsent.statement}
                    onChange={(e) => setEditingConsent({ ...editingConsent, statement: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5] focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="consent_is_active"
                      checked={editingConsent.is_active}
                      onChange={(e) => setEditingConsent({ ...editingConsent, is_active: e.target.checked })}
                      className="w-4 h-4 rounded-md text-[#4F5AF5] focus:ring-[#4F5AF5] cursor-pointer"
                    />
                    <label htmlFor="consent_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Consentimiento activo para uso en flujos
                    </label>
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="pt-4 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#4F5AF5]" />
                  Vista previa de firma digital en etapa:
                </span>
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={false}
                      readOnly
                      className="mt-0.5 w-4 h-4 rounded-md text-[#4F5AF5] border-indigo-300"
                    />
                    <div className="text-xs text-slate-700 leading-relaxed font-sans">
                      <span className="font-bold text-slate-900 block mb-1">
                        {editingConsent.title || 'Declaración de Conformidad'}
                      </span>
                      {editingConsent.statement || 'Texto de la declaración...'}
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-indigo-100 flex items-center justify-between text-[10px] text-indigo-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Certificación de custodia IACS
                    </span>
                    <span>v{editingConsent.version}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-white shadow-xl shrink-0 sticky bottom-0 z-20 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setIsConsentDrawerOpen(false); setEditingConsent(null); }}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveConsent}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold bg-gradient-to-r from-[#4F5AF5] to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Guardar Consentimiento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── LIVE PREVIEW MODAL (FORM SIMULATION) ────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {previewForm && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#4F5AF5]" />
                <h3 className="font-black text-slate-900 text-base">{previewForm.name}</h3>
              </div>
              <button onClick={() => setPreviewForm(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-4">
              {previewForm.description || 'Simulación interactiva de los campos del formulario de etapa.'}
            </p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {(previewForm.fields || []).map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      placeholder={field.placeholder || 'Escriba aquí...'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  ) : field.type === 'select' ? (
                    <select className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none">
                      <option value="">Seleccione una opción...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input type="checkbox" className="w-4 h-4 rounded-md text-[#4F5AF5]" />
                      <span className="text-xs text-slate-600">{field.placeholder || 'Confirmar verificación'}</span>
                    </div>
                  ) : field.type === 'file' ? (
                    <div className="p-4 border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 group hover:bg-indigo-50/70 transition-colors cursor-pointer">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {field.placeholder || 'Arrastra o haz clic para adjuntar archivos'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {(() => {
                            const ft = field.fileOptions?.fileTypes;
                            if (!ft) return 'PDF, Word, Excel, Imágenes (máx 10 MB)';
                            const enabled = Object.entries(ft)
                              .filter(([_, c]) => c.enabled)
                              .map(([k, c]) => `${k.toUpperCase()} (máx ${c.maxMb}MB)`);
                            return enabled.length > 0 ? enabled.join(' · ') : 'Sin formatos habilitados';
                          })()}
                        </p>
                      </div>
                    </div>
                  ) : field.type === 'role_user' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 px-3 py-2 text-xs bg-indigo-50/50 border border-indigo-200 rounded-xl text-indigo-800 font-semibold">
                        <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Responsable con rol: {field.target_role || 'bp_ti'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {field.filter_by_scope !== false ? 'Filtrado por VP y Dirección de la iniciativa (auto-bloqueo si es 1)' : 'Todos los usuarios con este rol'}
                      </span>
                    </div>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      placeholder={field.placeholder || ''}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  )}
                  {field.helpText && (
                    <p className="text-[10px] text-slate-400">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setPreviewForm(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cerrar Simulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE PREVIEW MODAL (CONSENT SIMULATION) ─────────────────────────── */}
      {previewConsent && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">{previewConsent.title}</h3>
              </div>
              <button onClick={() => setPreviewConsent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="preview_check"
                  className="mt-1 w-4 h-4 rounded-md text-[#4F5AF5] border-indigo-300 cursor-pointer"
                />
                <label htmlFor="preview_check" className="text-xs text-slate-800 leading-relaxed cursor-pointer font-sans select-none">
                  {previewConsent.statement}
                </label>
              </div>

              <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-[11px] text-indigo-700 font-semibold">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Firma de consentimiento digital en IACS
                </span>
                <span className="font-mono">v{previewConsent.version}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setPreviewConsent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cerrar Simulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
