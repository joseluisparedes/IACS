import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Pencil, Save, Send, X, Ban, Clock, Paperclip, FileText, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

const STATUS_STYLE: Record<string, string> = {
  "Pendiente de Aprobación": "bg-[#EEF2FF] text-[#4F5AF5]",
  "Aprobada": "bg-emerald-50 text-emerald-700",
  "Desestimada": "bg-slate-100 text-slate-700",
  "Observada": "bg-amber-50 text-amber-700",
  "Borrador": "bg-[#F1F5F9] text-[#64748B]",
  "En Ejecución": "bg-blue-50 text-blue-700",
};

const LABEL_MAP: Record<string, string> = {
  "direccion": "Dirección",
  "institucion": "Institución",
  "descripcion_de_la_necesidad": "Descripción de la Necesidad",
  "proceso_y_areas_impactadas": "Proceso y Áreas Impactadas",
  "beneficio_cuantitativo_anual": "Beneficio Cuantitativo Anual",
  "es_necesidad_spo": "Es Necesidad SPO",
  "registrador": "Registrador",
  "fecha_requerida": "Fecha Requerida",
  "vicepresidencia": "Vicepresidencia"
};

function formatLabel(k: string, fieldsMap: Record<string, string> = {}) {
  const normalizedKey = k.toLowerCase();
  if (fieldsMap && fieldsMap[normalizedKey]) {
    return fieldsMap[normalizedKey];
  }
  if (LABEL_MAP[normalizedKey]) {
    return LABEL_MAP[normalizedKey];
  }
  if (k === k.toUpperCase() || k.includes('_')) {
    return k.replace(/_/g, ' ');
  }
  return k.replace(/([A-Z])/g, ' $1').trim();
}

function Row({ 
  label, 
  value, 
  isEditMode, 
  editValue, 
  onChange, 
  fieldConfig,
  suggestedValue,
  onAccept,
  onReject
}: any) {
  const [showFilePreview, setShowFilePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isList = Array.isArray(value);

  // Parse if it's a file JSON string
  let fileObj: { name: string; content?: string } | null = null;
  if (typeof value === "string" && value.startsWith('{"name":')) {
    try {
      fileObj = JSON.parse(value);
    } catch (e) {}
  }

  let editFileObj: { name: string; content?: string } | null = null;
  if (typeof editValue === "string" && editValue.startsWith('{"name":')) {
    try {
      editFileObj = JSON.parse(editValue);
    } catch (e) {}
  }

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);

    let typeKey: 'pdf' | 'docx' | 'txt' | 'image' = 'txt';
    const name = file.name.toLowerCase();
    const mime = file.type;

    if (mime === 'application/pdf' || name.endsWith('.pdf')) typeKey = 'pdf';
    else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) typeKey = 'docx';
    else if (mime.startsWith('image/')) typeKey = 'image';

    const fileTypes = fieldConfig?.options?.fileTypes || {
      pdf: { enabled: true, maxMb: 1.0 },
      docx: { enabled: true, maxMb: 1.0 },
      txt: { enabled: true, maxMb: 1.0 },
      image: { enabled: true, maxMb: 1.0 }
    };

    const config = fileTypes[typeKey] || { enabled: true, maxMb: 1.0 };
    if (!config.enabled) {
      setUploadError(`La subida de archivos de tipo ${typeKey.toUpperCase()} está deshabilitada.`);
      return;
    }

    const limitBytes = config.maxMb * 1024 * 1024;
    if (file.size > limitBytes) {
      setUploadError(`El archivo supera el límite permitido de ${config.maxMb} MB.`);
      return;
    }

    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|jpg|jpeg|png|webp)$/i)) {
      setUploadError('Formato no soportado. Usa PDF, DOCX, TXT o imágenes.');
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/chat/attach-file', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      onChange(JSON.stringify({ name: file.originalname || file.name, content: data.content }));
    } catch (err: any) {
      setUploadError('Error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUploadError(null);
  };

  const displayValue = fileObj ? (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-1.5 w-fit">
        {fileObj.name.toLowerCase().endsWith('.png') || fileObj.name.toLowerCase().endsWith('.jpg') || fileObj.name.toLowerCase().endsWith('.jpeg') || fileObj.name.toLowerCase().endsWith('.webp') ? (
          <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
        )}
        <span className="text-xs font-semibold text-[#334155]">{fileObj.name}</span>
        {fileObj.content && (
          <button 
            type="button" 
            onClick={() => setShowFilePreview(!showFilePreview)}
            className="text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold ml-2 underline underline-offset-2"
          >
            {showFilePreview ? "Ocultar contenido" : "Ver contenido"}
          </button>
        )}
      </div>
      {showFilePreview && fileObj.content && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-xs text-[#475569] font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed shadow-inner">
          {fileObj.content}
        </div>
      )}
    </div>
  ) : isList ? (
    <ul className="space-y-2">
      {value.map((v: any, i: number) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-[#4F5AF5] mt-0.5 shrink-0">•</span>
          {v}
        </li>
      ))}
    </ul>
  ) : (
    value || <span className="text-[#CBD5E1]">—</span>
  );

  let displaySuggestedValue = suggestedValue;
  if (typeof suggestedValue === "string" && suggestedValue.startsWith('{"name":')) {
    try {
      const parsed = JSON.parse(suggestedValue);
      displaySuggestedValue = `📎 ${parsed.name}`;
    } catch (e) {}
  }

  let displayPastValue = isList ? displayValue : String(value);
  if (typeof value === "string" && value.startsWith('{"name":')) {
    try {
      const parsed = JSON.parse(value);
      displayPastValue = `📎 ${parsed.name}`;
    } catch (e) {}
  }

  return (
    <div className="flex gap-4 py-3 border-b border-[#F8FAFC] last:border-0 flex-col sm:flex-row">
      <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider w-full sm:w-40 shrink-0 mt-0.5 break-words">
        {label}
      </p>
      <div className="flex-1 space-y-3">
        {isEditMode ? (
          fieldConfig?.field_type === "file" ? (
            <div className="space-y-2">
              <input 
                ref={fileInputRef} 
                type="file" 
                accept={[
                  fieldConfig.options?.fileTypes?.pdf?.enabled !== false && '.pdf',
                  fieldConfig.options?.fileTypes?.docx?.enabled !== false && '.docx',
                  fieldConfig.options?.fileTypes?.txt?.enabled !== false && '.txt',
                  fieldConfig.options?.fileTypes?.image?.enabled !== false && '.jpg,.jpeg,.png,.webp'
                ].filter(Boolean).join(',')} 
                className="hidden" 
                onChange={handleFileAttach} 
              />
              
              {editFileObj ? (
                <div className="flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-3 py-2 w-full max-w-md">
                  {editFileObj.name.toLowerCase().endsWith('.png') || editFileObj.name.toLowerCase().endsWith('.jpg') || editFileObj.name.toLowerCase().endsWith('.jpeg') || editFileObj.name.toLowerCase().endsWith('.webp') ? (
                    <ImageIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-[#4F5AF5] flex-1 truncate">{editFileObj.name}</span>
                  <button 
                    type="button" 
                    onClick={handleRemove} 
                    className="text-[#94A3B8] hover:text-red-500 transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`flex items-center gap-2 w-full max-w-md border border-dashed border-[#CBD5E1] hover:border-[#4F5AF5] bg-slate-50 hover:bg-[#EEF2FF]/30 text-[#64748B] hover:text-[#4F5AF5] px-4 py-3 rounded-lg text-sm font-semibold transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 text-[#4F5AF5] animate-spin" />
                      <span>Procesando archivo...</span>
                    </>
                  ) : (
                    <>
                      <Paperclip className="w-4 h-4" />
                      <span>Subir archivo...</span>
                    </>
                  )}
                </button>
              )}

              {uploadError && (
                <div className="flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-100 max-w-md">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          ) : fieldConfig?.field_type === "select" ? (
            <select 
              value={editValue || ""} 
              onChange={e => onChange(e.target.value)}
              className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white outline-none focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5]"
            >
              <option value="">Seleccione...</option>
              {fieldConfig.options?.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : isList ? (
            <textarea
              value={Array.isArray(editValue) ? editValue.join('\n') : (editValue || "")}
              onChange={e => onChange(e.target.value.split('\n'))}
              className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white min-h-[100px] outline-none focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5]"
              placeholder="Un elemento por línea"
            />
          ) : (
            <textarea
              value={editValue || ""}
              onChange={e => onChange(e.target.value)}
              className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white min-h-[40px] outline-none focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5]"
              rows={typeof editValue === 'string' && editValue.length > 80 ? 4 : 1}
            />
          )
        ) : (
          <div className="text-sm text-[#1E293B] break-words">
            {displayValue}
          </div>
        )}

        {suggestedValue !== undefined && !isEditMode && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Sugerencia de cambio (BP)
            </p>
            <div className="mb-3">
              <span className="line-through text-red-400 mr-2 text-xs">{typeof value === "string" && value.startsWith('{"name":') ? displayPastValue : (isList ? displayValue : String(value))}</span>
              <span className="text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded font-medium text-sm">
                {Array.isArray(displaySuggestedValue) ? (
                   <ul className="pl-4 mt-1 space-y-1 list-disc">
                     {displaySuggestedValue.map((v, i) => <li key={i}>{v}</li>)}
                   </ul>
                ) : String(displaySuggestedValue)}
              </span>
            </div>
            {onAccept && (
              <div className="flex gap-2">
                <button onClick={onAccept} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 transition-colors text-white rounded text-xs font-semibold">Aceptar cambio</button>
                <button onClick={onReject} className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-[#64748B] rounded text-xs font-semibold">Descartar</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffModal({ snapshot, currentData, onClose, fieldsMap }: any) {
  const pastForm = snapshot.form_data || {};
  const pastSumm = snapshot.summary || {};
  const currForm = currentData.form_data || {};
  const currSumm = currentData.summary || {};

  const changedFormKeys = Object.keys(currForm).filter(k => 
    k !== "_suggested_changes" && k !== "_observation_history" &&
    JSON.stringify(pastForm[k]) !== JSON.stringify(currForm[k])
  );
  
  const changedSummKeys = Object.keys(currSumm).filter(k => 
    JSON.stringify(pastSumm[k]) !== JSON.stringify(currSumm[k])
  );

  const hasChanges = changedFormKeys.length > 0 || changedSummKeys.length > 0;

  const renderValue = (val: any) => {
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "string" && val.startsWith('{"name":')) {
      try {
        const parsed = JSON.parse(val);
        return `📎 ${parsed.name}`;
      } catch (e) {}
    }
    return val || "—";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-[#1E293B]">Comparar Versiones</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-white flex-1 space-y-6">
          {!hasChanges ? (
            <p className="text-center text-slate-500 py-10">No hay diferencias entre esta versión pasada y la actual.</p>
          ) : (
            <>
              {changedFormKeys.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">Datos del Formulario</h3>
                  <div className="space-y-4">
                    {changedFormKeys.map(k => (
                      <div key={k} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{fieldsMap[k] || k}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-red-500 font-semibold mb-1 uppercase tracking-wider">Versión Pasada</p>
                            <div className="text-sm text-red-700 bg-red-50/50 p-3 rounded-lg border border-red-100 line-through">
                              {renderValue(pastForm[k])}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600 font-semibold mb-1 uppercase tracking-wider">Versión Actual</p>
                            <div className="text-sm text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                              {renderValue(currForm[k])}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {changedSummKeys.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">Resumen y Clasificación</h3>
                  <div className="space-y-4">
                    {changedSummKeys.map(k => (
                      <div key={k} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{fieldsMap[k] || k}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-red-500 font-semibold mb-1 uppercase tracking-wider">Versión Pasada</p>
                            <div className="text-sm text-red-700 bg-red-50/50 p-3 rounded-lg border border-red-100 line-through">
                              {renderValue(pastSumm[k])}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600 font-semibold mb-1 uppercase tracking-wider">Versión Actual</p>
                            <div className="text-sm text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                              {renderValue(currSumm[k])}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InitiativeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [initiative, setInitiative] = useState<any>(null);
  const [fieldsMap, setFieldsMap] = useState<Record<string, string>>({});
  const [fieldsConfig, setFieldsConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reference data for selects
  const [dbVps, setDbVps] = useState<any[]>([]);
  const [dbDirecciones, setDbDirecciones] = useState<any[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  // Edit Mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedFormData, setEditedFormData] = useState<any>({});
  const [editedSummary, setEditedSummary] = useState<any>({});
  
  // Compare state
  const [compareSnapshot, setCompareSnapshot] = useState<any>(null);
  
  // Asignar BP state
  const [selectedBP, setSelectedBP] = useState("");
  const [isEditingBP, setIsEditingBP] = useState(false);
  const [showDesestimarModal, setShowDesestimarModal] = useState(false);
  const [desestimarComment, setDesestimarComment] = useState("");

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    confirmText?: string;
    confirmStyle?: string;
    icon?: any;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const confirmAction = (title: string, message: React.ReactNode, confirmText: string, confirmStyle: string, icon: any, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, confirmText, confirmStyle, icon, onConfirm });
  };

  const isAdmin = profile?.profile_roles?.some((r: any) => r.role === 'admin');
  const isBP = profile?.profile_roles?.some((r: any) => r.role === 'bp_ti');
  const registradorRoles = profile?.profile_roles?.filter((r: any) => r.role === 'registrador') || [];
  const isRegistrador = registradorRoles.length > 0;

  useEffect(() => {
    Promise.all([
      fetch("/api/initiatives").then(r => r.json()),
      fetch("/api/fields").then(r => r.json()),
      supabase.from('vps').select('id, name'),
      supabase.from('direcciones').select('id, name, vp_id'),
      supabase.from('allowed_users').select('name, user_roles_whitelist(*)')
    ])
      .then(([data, fieldsData, vpsRes, dirRes, usersRes]) => {
        const found = Array.isArray(data) ? data.find((i: any) => i.id === id) : null;
        setInitiative(found ?? null);

        if (Array.isArray(fieldsData)) {
          setFieldsConfig(fieldsData);
          const map: Record<string, string> = {};
          fieldsData.forEach(f => map[f.key.toLowerCase()] = f.label);
          setFieldsMap(map);
        }

        if (vpsRes.data) setDbVps(vpsRes.data);
        if (dirRes.data) setDbDirecciones(dirRes.data);
        if (usersRes.data) setDbUsers(usersRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const updateInitiativeData = async (status: string, extraUpdates: any = {}) => {
    try {
      const payload = { status, ...extraUpdates };
      const res = await fetch(`/api/initiatives/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setInitiative((prev: any) => ({ ...prev, ...payload }));
        setIsEditMode(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleAssignBP = () => {
    if (!selectedBP) return;
    const newFormData = { ...initiative.form_data, bp_ti_asignado: selectedBP };
    updateInitiativeData(initiative.status, { form_data: newFormData });
    setIsEditingBP(false);
  };

  const startEditMode = () => {
    setEditedFormData({ ...(initiative.form_data || {}) });
    setEditedSummary({ ...(initiative.summary || {}) });
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
  };

  const handleObserve = () => {
    if (!isEditMode) return updateInitiativeData("Observada");

    // We are in edit mode, so save suggested_changes inside form_data
    const currentFormData = initiative.form_data || {};
    const currentSummary = initiative.summary || {};
    
    // Find what changed
    const changes: any = { form_data: {}, summary: {} };
    let hasChanges = false;
    
    Object.keys(editedFormData).forEach(k => {
      if (JSON.stringify(editedFormData[k]) !== JSON.stringify(currentFormData[k])) {
        changes.form_data[k] = editedFormData[k];
        hasChanges = true;
      }
    });
    Object.keys(editedSummary).forEach(k => {
      if (JSON.stringify(editedSummary[k]) !== JSON.stringify(currentSummary[k])) {
        changes.summary[k] = editedSummary[k];
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      setConfirmDialog({
        isOpen: true,
        title: "¡Hola!",
        message: "Para poder observar esta iniciativa, por favor ingresa al menos un cambio sugerido en los campos del formulario. Así el Registrador sabrá exactamente qué ajustar. 😊",
        confirmText: "Entendido",
        onConfirm: () => {},
        confirmStyle: "bg-amber-500 hover:bg-amber-600",
        icon: <AlertTriangle className="w-6 h-6 text-amber-500" />
      });
      return;
    }

    confirmAction(
      "Observar Iniciativa",
      (
        <div className="space-y-4">
          <p>¿Estás seguro de que deseas observar esta iniciativa y enviar los cambios sugeridos al Registrador?</p>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2 text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="font-semibold text-sm">Al confirmar, declaras que esta acción se realiza bajo tu revisión y consentimiento.</span>
          </div>
        </div>
      ),
      "Sí, Observar",
      "bg-amber-600 hover:bg-amber-500",
      <AlertTriangle className="w-6 h-6 text-amber-500" />,
      () => {
        const newHistoryEntry = {
          date: new Date().toISOString(),
          user_name: profile?.name || 'Desconocido',
          user_role: 'BP TI',
          action: 'Observada',
          details: 'Observó la iniciativa con cambios sugeridos.',
          snapshot: {
            form_data: { ...currentFormData },
            summary: { ...currentSummary }
          }
        };

        const newFormData = { 
          ...currentFormData, 
          _suggested_changes: changes,
          _observation_history: [...(currentFormData._observation_history || []), newHistoryEntry]
        };
        updateInitiativeData("Observada", { form_data: newFormData });
      }
    );
  };

  const handleApprove = () => {
    confirmAction(
      "Aprobar Iniciativa",
      (
        <div className="space-y-4">
          <p>¿Estás seguro de que deseas aprobar esta iniciativa?</p>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex gap-2 text-emerald-800">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="font-semibold text-sm">Al confirmar, declaras que esta acción se realiza bajo tu total revisión y consentimiento.</span>
          </div>
        </div>
      ),
      "Sí, Aprobar",
      "bg-emerald-600 hover:bg-emerald-500",
      <CheckCircle className="w-6 h-6 text-emerald-500" />,
      () => {
        const newHistoryEntry = {
          date: new Date().toISOString(),
          user: profile?.name || "Usuario Desconocido",
          role: isAdmin ? "Admin" : (isBP ? "Business Partner TI" : "Registrador"),
          action: "Aprobada",
          comment: isEditMode ? "Se aprobaron los cambios realizados." : "Aprobada directamente sin cambios."
        };

        if (!isEditMode) {
          const currentFormData = initiative.form_data || {};
          const newFormData = { ...currentFormData };
          newFormData._observation_history = [...(newFormData._observation_history || []), newHistoryEntry];
          return updateInitiativeData("Aprobada", { form_data: newFormData });
        }
        
        // Approve WITH changes applied directly
        const currentFormData = initiative.form_data || {};
        const newFormData = { ...editedFormData };
        delete newFormData._suggested_changes;
        newFormData._observation_history = [...(currentFormData._observation_history || []), newHistoryEntry];

        updateInitiativeData("Aprobada", { 
          form_data: newFormData,
          summary: editedSummary
        });
      }
    );
  };

  const handleAcceptChange = (type: 'form_data' | 'summary', key: string, val: any) => {
    const currentFormData = { ...initiative.form_data };
    const suggested = JSON.parse(JSON.stringify(currentFormData._suggested_changes || { form_data: {}, summary: {} }));
    
    // Apply change
    if (type === 'form_data') {
      currentFormData[key] = val;
    }
    const currentSummary = { ...initiative.summary };
    if (type === 'summary') {
      currentSummary[key] = val;
    }

    // Remove from suggestions
    delete suggested[type][key];
    
    updateInitiativeData(initiative.status, {
      form_data: { ...currentFormData, _suggested_changes: suggested },
      summary: currentSummary
    });
  };

  const handleRejectChange = (type: 'form_data' | 'summary', key: string) => {
    const currentFormData = { ...initiative.form_data };
    const suggested = JSON.parse(JSON.stringify(currentFormData._suggested_changes || { form_data: {}, summary: {} }));
    
    delete suggested[type][key];
    
    updateInitiativeData(initiative.status, {
      form_data: { ...currentFormData, _suggested_changes: suggested }
    });
  };

  const handleAcceptAllChanges = () => {
    const currentFormData = { ...initiative.form_data };
    const currentSummary = { ...initiative.summary };
    const suggested = currentFormData._suggested_changes || { form_data: {}, summary: {} };
    
    Object.entries(suggested.form_data || {}).forEach(([k, v]) => {
      currentFormData[k] = v;
    });
    Object.entries(suggested.summary || {}).forEach(([k, v]) => {
      currentSummary[k] = v;
    });

    delete currentFormData._suggested_changes;
    
    updateInitiativeData(initiative.status, {
      form_data: currentFormData,
      summary: currentSummary
    });
  };

  const openDesestimarModal = () => {
    setDesestimarComment("");
    setShowDesestimarModal(true);
  };

  const handleDesestimarConfirm = () => {
    if (!desestimarComment.trim()) {
      alert("Debes ingresar un motivo.");
      return;
    }

    const currentFormData = initiative.form_data || {};
    const newHistoryEntry = {
      date: new Date().toISOString(),
      user_name: profile?.name || 'Desconocido',
      user_role: profile?.profile_roles?.[0]?.role || 'Desconocido',
      action: 'Desestimada',
      details: desestimarComment.trim()
    };

    const newFormData = { 
      ...currentFormData, 
      _observation_history: [...(currentFormData._observation_history || []), newHistoryEntry]
    };
    updateInitiativeData("Desestimada", { form_data: newFormData });
    setShowDesestimarModal(false);
  };

  const handleReenviar = () => {
    confirmAction(
      "Reenviar a Aprobación",
      (
        <div className="space-y-4">
          <p>¿Estás seguro de reenviar esta iniciativa para su aprobación?</p>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex gap-2 text-blue-800">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="font-semibold text-sm">Al confirmar, declaras que las subsanaciones fueron hechas bajo tu revisión y consentimiento.</span>
          </div>
        </div>
      ),
      "Sí, Reenviar",
      "bg-[#4F5AF5] hover:bg-[#3F49E0]",
      <Send className="w-6 h-6 text-[#4F5AF5]" />,
      () => {
        const currentFormData = initiative.form_data || {};
        const currentSummary = initiative.summary || {};

        const newHistoryEntry = {
          date: new Date().toISOString(),
          user_name: profile?.name || 'Desconocido',
          user_role: 'Registrador',
          action: 'Reenviada a Aprobación',
          details: 'Subsanó la iniciativa y la reenvió para su revisión.',
          snapshot: {
            form_data: { ...currentFormData },
            summary: { ...currentSummary }
          }
        };

        // Clear any remaining suggested changes and set back to Pending
        const newFormData = { ...initiative.form_data };
        delete newFormData._suggested_changes;
        newFormData._observation_history = [...(newFormData._observation_history || []), newHistoryEntry];
        
        updateInitiativeData("Pendiente de Aprobación", { form_data: newFormData });
      }
    );
  };

  const handleFieldChange = (type: 'form_data'|'summary', key: string, val: any) => {
    if (type === 'form_data') {
      const newForm = { ...editedFormData, [key]: val };
      if (key === 'vicepresidencia') {
        newForm.direccion = "";
        newForm.registrador = "";
      }
      if (key === 'direccion') {
        newForm.registrador = "";
      }
      setEditedFormData(newForm);
    } else {
      setEditedSummary({ ...editedSummary, [key]: val });
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center gap-3 py-20 text-[#94A3B8]">
      <div className="w-5 h-5 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
      Cargando detalle...
    </div>
  );

  if (!initiative) return (
    <div className="text-center py-20">
      <p className="text-[#94A3B8] mb-3">No se encontró la iniciativa.</p>
      <Link to="/bandeja" className="text-[#4F5AF5] font-semibold hover:text-[#3F49E0]">← Volver a la bandeja</Link>
    </div>
  );

  const s = initiative.summary ?? {};
  const fd = initiative.form_data ?? {};
  const title = s.titulo ?? Object.values(fd)[0] ?? initiative.id;
  const statusStyle = STATUS_STYLE[initiative.status] ?? "bg-[#F1F5F9] text-[#64748B]";
  const isPending = initiative.status === "Pendiente de Aprobación";
  const isObserved = initiative.status === "Observada";
  
  const suggestedChanges = fd._suggested_changes || { form_data: {}, summary: {} };
  const hasSuggestedChanges = Object.keys(suggestedChanges.form_data).length > 0 || Object.keys(suggestedChanges.summary).length > 0;

  const getFieldConfig = (key: string) => {
    const lowerKey = key.toLowerCase();
    
    if (lowerKey === 'vicepresidencia') {
       return { field_type: 'select', options: dbVps.map(v => v.name) };
    }
    if (lowerKey === 'direccion') {
       const vpName = isEditMode ? editedFormData.vicepresidencia : (initiative?.form_data?.vicepresidencia);
       const vpId = dbVps.find(v => v.name === vpName)?.id;
       const dirs = dbDirecciones.filter(d => d.vp_id === vpId);
       return { field_type: 'select', options: dirs.map(d => d.name) };
    }
    if (lowerKey === 'registrador') {
       const vpName = isEditMode ? editedFormData.vicepresidencia : (initiative?.form_data?.vicepresidencia);
       const dirName = isEditMode ? editedFormData.direccion : (initiative?.form_data?.direccion);
       const vpId = dbVps.find(v => v.name === vpName)?.id;
       const dirId = dbDirecciones.find(d => d.name === dirName && d.vp_id === vpId)?.id;
       
       let availableUsers = dbUsers;
       if (vpId && dirId) {
          availableUsers = dbUsers.filter(u => 
             u.user_roles_whitelist?.some((r: any) => 
               r.role === 'registrador' && 
               r.vp_id === vpId && 
               (r.direcciones_ids?.length === 0 || r.direcciones_ids?.includes(dirId))
             )
          );
       }
       const names = Array.from(new Set(availableUsers.map(u => u.name))).sort();
       return { field_type: 'select', options: names };
    }

    return fieldsConfig.find(f => f.key.toLowerCase() === lowerKey);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Back + header */}
      <div>
        <Link to="/bandeja" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#1E293B] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver a la Bandeja
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-md">{initiative.id}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle}`}>
                {initiative.status}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#1E293B]">{String(title)}</h2>
            {s.tipoIniciativa && (
              <p className="text-sm text-[#64748B] mt-1">{s.tipoIniciativa}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {isPending && (isAdmin || isBP) && !isEditMode && (
              <>
                <button
                  onClick={startEditMode}
                  className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Modo Edición
                </button>
                <button
                  onClick={openDesestimarModal}
                  className="flex items-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  Desestimar
                </button>
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprobar
                </button>
              </>
            )}

            {initiative?.status === 'Aprobada' && (isAdmin || isBP) && (
              <button
                onClick={openDesestimarModal}
                className="flex items-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Ban className="w-4 h-4" />
                Desestimar
              </button>
            )}

            {initiative?.status === 'Desestimada' && (isAdmin || isBP) && (
              <>
                <button
                  onClick={() => confirmAction(
                    "Mover a Nueva",
                    (
                      <div className="space-y-4">
                        <p>¿Estás seguro de regresar esta iniciativa a 'Nueva para revisión'?</p>
                        <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 flex gap-2 text-slate-800">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <span className="font-semibold text-sm">Al confirmar, declaras que esta acción se realiza bajo tu revisión y consentimiento.</span>
                        </div>
                      </div>
                    ),
                    "Sí, Mover a Nueva",
                    "bg-[#4F5AF5] hover:bg-[#3F49E0]",
                    <Clock className="w-6 h-6 text-[#4F5AF5]" />,
                    () => updateInitiativeData("Pendiente de Aprobación")
                  )}
                  className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Mover a Nueva
                </button>
                <button
                  onClick={() => confirmAction(
                    "Mover a Aprobada",
                    (
                      <div className="space-y-4">
                        <p>¿Estás seguro de mover esta iniciativa directamente a 'Aprobada'?</p>
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex gap-2 text-emerald-800">
                          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <span className="font-semibold text-sm">Al confirmar, declaras que esta acción se realiza bajo tu total revisión y consentimiento.</span>
                        </div>
                      </div>
                    ),
                    "Sí, Aprobar",
                    "bg-emerald-600 hover:bg-emerald-500",
                    <CheckCircle className="w-6 h-6 text-emerald-500" />,
                    () => updateInitiativeData("Aprobada")
                  )}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mover a Aprobada
                </button>
              </>
            )}

            {isEditMode && (
              <>
                <button
                  onClick={cancelEditMode}
                  className="px-4 py-2.5 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleObserve}
                  className="flex items-center gap-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Observar con Cambios
                </button>
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprobar con Cambios
                </button>
              </>
            )}
            
            {isRegistrador && isObserved && (
              <button
                onClick={handleReenviar}
                className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
              >
                <Send className="w-4 h-4" />
                Reenviar a Aprobación
              </button>
            )}

            {isRegistrador && initiative.status === "Borrador" && (
              <Link
                to={`/nueva/${id}`}
                className="flex items-center gap-2 border border-[#4F5AF5] text-[#4F5AF5] hover:bg-[#EEF2FF] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Editar Borrador
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-5">
          {isRegistrador && isObserved && hasSuggestedChanges && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 shadow-sm items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-amber-800 text-sm mb-1">Cambios Sugeridos</h4>
                <p className="text-amber-700 text-sm leading-relaxed mb-3">
                  El aprobador ha observado esta iniciativa y dejado sugerencias de cambio. Por favor revisa los campos abajo, acepta las sugerencias o aplica tus propias correcciones, y luego haz clic en "Reenviar a Aprobación".
                </p>
                <button
                  onClick={handleAcceptAllChanges}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 transition-colors text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Aceptar todos los cambios
                </button>
              </div>
            </div>
          )}

          {isEditMode && (
             <div className="bg-[#EEF2FF] border border-[#4F5AF5]/20 rounded-xl p-4 flex gap-3 shadow-sm">
               <Pencil className="w-5 h-5 text-[#4F5AF5] shrink-0 mt-0.5" />
               <div>
                 <h4 className="font-bold text-[#4F5AF5] text-sm mb-1">Modo Edición Activado</h4>
                 <p className="text-[#4F5AF5]/80 text-sm leading-relaxed">
                   Puedes editar directamente los campos a continuación. Luego elige "Aprobar con Cambios" para aplicar todo de forma definitiva, u "Observar con Cambios" para enviar estas sugerencias al Registrador.
                 </p>
               </div>
             </div>
          )}

          {/* Summary card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#1E293B]">Resumen del Requerimiento</h3>
            </div>
            <div className="px-6 py-2">
              {Object.entries(s)
                .filter(([k]) => !["titulo", "complejidad", "riesgo", "prioridadRecomendada", "beneficiosCualitativos"].includes(k))
                .map(([k, v]) => (
                  <Row 
                    key={k} 
                    label={formatLabel(k, fieldsMap)} 
                    value={v}
                    isEditMode={isEditMode}
                    editValue={editedSummary[k]}
                    onChange={(val: any) => handleFieldChange('summary', k, val)}
                    fieldConfig={getFieldConfig(k)}
                    suggestedValue={suggestedChanges.summary[k]}
                    onAccept={isRegistrador && isObserved && suggestedChanges.summary[k] !== undefined ? () => handleAcceptChange('summary', k, suggestedChanges.summary[k]) : undefined}
                    onReject={isRegistrador && isObserved && suggestedChanges.summary[k] !== undefined ? () => handleRejectChange('summary', k) : undefined}
                  />
                ))}
            </div>
          </div>

          {/* Qualitative benefits */}
          {s.beneficiosCualitativos?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F1F5F9]">
                <h3 className="text-sm font-bold text-[#1E293B]">Beneficios Cualitativos</h3>
              </div>
              <div className="px-6 py-2">
                <Row
                  label="Beneficios Cualitativos"
                  value={s.beneficiosCualitativos}
                  isEditMode={isEditMode}
                  editValue={editedSummary.beneficiosCualitativos}
                  onChange={(val: any) => handleFieldChange('summary', 'beneficiosCualitativos', val)}
                  suggestedValue={suggestedChanges.summary.beneficiosCualitativos}
                  onAccept={isRegistrador && isObserved && suggestedChanges.summary.beneficiosCualitativos ? () => handleAcceptChange('summary', 'beneficiosCualitativos', suggestedChanges.summary.beneficiosCualitativos) : undefined}
                  onReject={isRegistrador && isObserved && suggestedChanges.summary.beneficiosCualitativos ? () => handleRejectChange('summary', 'beneficiosCualitativos') : undefined}
                />
              </div>
            </div>
          )}

          {/* Form data */}
          {fd && Object.keys(fd).filter(k => k !== "_suggested_changes" && k !== "_observation_history").length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F1F5F9]">
                <h3 className="text-sm font-bold text-[#1E293B]">Datos del Formulario</h3>
              </div>
              <div className="px-6 py-2">
                {Object.entries(fd).filter(([k]) => k !== "_suggested_changes" && k !== "_observation_history").map(([k, v]) => (
                  <Row 
                    key={k} 
                    label={formatLabel(k, fieldsMap)} 
                    value={v}
                    isEditMode={isEditMode}
                    editValue={editedFormData[k]}
                    onChange={(val: any) => handleFieldChange('form_data', k, val)}
                    fieldConfig={getFieldConfig(k)}
                    suggestedValue={suggestedChanges.form_data[k]}
                    onAccept={isRegistrador && isObserved && suggestedChanges.form_data[k] !== undefined ? () => handleAcceptChange('form_data', k, suggestedChanges.form_data[k]) : undefined}
                    onReject={isRegistrador && isObserved && suggestedChanges.form_data[k] !== undefined ? () => handleRejectChange('form_data', k) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Observation History */}
          {fd._observation_history && fd._observation_history.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F1F5F9]">
                <h3 className="text-sm font-bold text-[#1E293B]">Historial de Revisiones</h3>
              </div>
              <div className="px-6 py-4 space-y-6">
                {fd._observation_history.map((h: any, i: number) => (
                  <div key={i} className="flex gap-4 relative">
                    {/* Vertical line connector */}
                    {i !== fd._observation_history.length - 1 && (
                      <div className="absolute top-8 left-[13px] bottom-[-24px] w-0.5 bg-[#E2E8F0]" />
                    )}
                    <div className="w-7 h-7 shrink-0 rounded-full bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-center relative z-10">
                       <span className="text-[10px] font-bold text-[#64748B]">{h.user_name.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider mb-1">
                        {new Date(h.date).toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-[#1E293B]">
                            <span className="font-bold">{h.user_name}</span> <span className="text-[#64748B] text-xs">({h.user_role})</span>
                          </p>
                          <p className="text-xs text-[#4F5AF5] font-semibold mt-0.5">{h.action}</p>
                          {h.details && <p className="text-sm text-[#475569] mt-1">{h.details}</p>}
                        </div>
                        {h.snapshot && (
                          <button onClick={() => setCompareSnapshot(h.snapshot)} className="text-[10px] font-bold text-[#4F5AF5] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-2 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 border border-[#C7D2FE]">
                            Comparar vs Actual
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* BP Asignado */}
          {(fd.bp_ti_asignado && !isEditingBP) ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F1F5F9] flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#1E293B]">BP Asignado</h3>
                {isBP && (
                  <button onClick={() => {
                    setSelectedBP(fd.bp_ti_asignado);
                    setIsEditingBP(true);
                  }} className="text-[#94A3B8] hover:text-[#4F5AF5] transition-colors" title="Editar BP">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="p-5">
                <span className="font-semibold text-[#4F5AF5]">{fd.bp_ti_asignado}</span>
              </div>
            </div>
          ) : isBP ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F1F5F9] flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#1E293B]">Asignar BP</h3>
                {fd.bp_ti_asignado && (
                  <button onClick={() => setIsEditingBP(false)} className="text-[#94A3B8] hover:text-[#EF4444] transition-colors" title="Cancelar">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="p-5 space-y-3">
                <select 
                  value={selectedBP} 
                  onChange={e => setSelectedBP(e.target.value)}
                  className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white outline-none focus:border-[#4F5AF5]"
                >
                  <option value="">Seleccione un BP...</option>
                  {(() => {
                    const vpId = dbVps.find(v => v.name === fd.vicepresidencia)?.id;
                    const dirId = dbDirecciones.find(d => d.name === fd.direccion && d.vp_id === vpId)?.id;
                    let eligibleBPs: any[] = [];
                    if (vpId && dirId) {
                      eligibleBPs = dbUsers.filter(u => 
                        u.user_roles_whitelist?.some((r: any) => 
                          r.role === 'bp_ti' && 
                          r.vp_id === vpId && 
                          (r.direcciones_ids?.length === 0 || r.direcciones_ids?.includes(dirId))
                        )
                      );
                    }
                    return Array.from(new Set(eligibleBPs.map(u => u.name))).sort().map(name => (
                      <option key={name} value={name}>{name}</option>
                    ));
                  })()}
                </select>
                <button 
                  onClick={handleAssignBP}
                  disabled={!selectedBP}
                  className="w-full bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:bg-slate-300 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Guardar Asignación
                </button>
              </div>
            </div>
          ) : null}

          {/* AI Classification */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#1E293B]">Clasificación IA</h3>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                { label: "Complejidad", value: s.complejidad },
                { label: "Riesgo", value: s.riesgo },
                { label: "Prioridad sugerida", value: s.prioridadRecomendada },
              ].map(item => (
                <div key={item.label} className="flex flex-col py-2 border-b border-[#F8FAFC] last:border-0">
                  <span className="text-[#64748B] text-xs uppercase tracking-wider font-semibold mb-1">{item.label}</span>
                  <span className="font-medium text-[#1E293B]">{item.value ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#1E293B]">Información</h3>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div>
                <span className="block text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider mb-1">Fecha de registro</span>
                <span className="text-[#1E293B]">
                  {initiative.created_at
                    ? new Date(initiative.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })
                    : "—"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider mb-1">ID</span>
                <span className="text-[#1E293B] font-mono text-xs">{initiative.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {compareSnapshot && (
        <DiffModal 
          snapshot={compareSnapshot} 
          currentData={initiative} 
          onClose={() => setCompareSnapshot(null)} 
          fieldsMap={fieldsMap}
        />
      )}

      {/* Desestimar Modal */}
      {showDesestimarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[#1E293B]">Motivo para Desestimar</h3>
              <button onClick={() => setShowDesestimarModal(false)} className="text-[#94A3B8] hover:text-[#1E293B] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#64748B] mb-4">
                Por favor, ingresa el motivo por el cual se desestima esta iniciativa. Este comentario quedará registrado en el historial.
              </p>
              <textarea
                value={desestimarComment}
                onChange={(e) => setDesestimarComment(e.target.value)}
                placeholder="Ej. El proyecto ya no está alineado a la estrategia actual..."
                className="w-full h-32 p-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] focus:border-transparent resize-none text-sm"
              />
            </div>
            <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end gap-3">
              <button
                onClick={() => setShowDesestimarModal(false)}
                className="px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDesestimarConfirm}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-[#F1F5F9] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
                {confirmDialog.icon}
                {confirmDialog.title}
              </h3>
              <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="text-[#94A3B8] hover:text-[#1E293B] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-sm text-[#64748B] leading-relaxed">
              {confirmDialog.message}
            </div>
            <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all shadow-sm flex items-center gap-2 ${confirmDialog.confirmStyle || "bg-slate-700 hover:bg-slate-800"}`}
              >
                {confirmDialog.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
