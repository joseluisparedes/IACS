import React, { useState } from 'react';
import { 
  Save, 
  Send, 
  Play, 
  FileText, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  Check,
  Undo2,
  Redo2
} from 'lucide-react';
import { useWorkflowStore } from '../../lib/workflowStore';
import { Link } from 'react-router-dom';

interface WorkflowVersionBarProps {
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
  onOpenRolesModal?: () => void;
}

export const WorkflowVersionBar: React.FC<WorkflowVersionBarProps> = ({
  onSave,
  onPublish,
  onOpenRolesModal,
}) => {
  const { activeWorkflow, isDirty, isSaving, lastSavedAt, undo, redo, past, future } = useWorkflowStore();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const status = activeWorkflow?.status || 'draft';
  const version = activeWorkflow?.version || 1;
  const name = activeWorkflow?.name || 'Nuevo Flujo de Trabajo';

  const handleConfirmPublish = async () => {
    try {
      setPublishing(true);
      await onPublish();
      setShowPublishModal(false);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-10 select-none">
        {/* Left: Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-800 truncate max-w-xs md:max-w-md">{name}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
              v{version}
            </span>
          </div>

          {/* Status Badge */}
          {status === 'published' ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Publicado Activo
            </span>
          ) : status === 'archived' ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-300">
              Archivado
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              Borrador en Edición
            </span>
          )}

          {/* Autosave Status */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 pl-2">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-[#4F5AF5]" />
                <span>Guardando...</span>
              </>
            ) : isDirty ? (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Cambios sin guardar
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                Guardado
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo buttons */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={undo}
              disabled={past.length === 0}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Deshacer (Ctrl + Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={future.length === 0}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Rehacer (Ctrl + Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {onOpenRolesModal && (
            <button
              type="button"
              onClick={onOpenRolesModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Asignación de Roles</span>
            </button>
          )}

          <Link
            to="/admin/workflow-simulator"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-[#4F5AF5]" />
            <span className="hidden md:inline">Simular</span>
          </Link>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Guardar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#4F5AF5] hover:bg-[#3D47E0] rounded-xl shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publicar Flujo</span>
          </button>
        </div>
      </header>

      {/* Modal de Publicación */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-2">¿Publicar este Flujo de Trabajo?</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Al publicar, este flujo se convertirá en el <strong>modelo activo del sistema</strong>. Las nuevas iniciativas seguirán este esquema de estados, roles, validaciones e IA. El flujo activo anterior pasará a estado archivado automáticamente.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mb-5 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Las iniciativas que ya se encuentran en curso continuarán con su flujo histórico sin verse afectadas.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                disabled={publishing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={publishing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#4F5AF5] hover:bg-[#3D47E0] rounded-xl transition-colors shadow-xs"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirmar y Publicar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
