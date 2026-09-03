import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  Upload, 
  Trash2, 
  Plus, 
  UserPlus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RoleAssignment {
  id: string;
  workflow_id: string;
  user_id: string;
  role_name: string;
  created_at: string;
  profiles?: {
    id: string;
    name: string;
    email: string;
  };
}

interface RoleAssignmentTableProps {
  workflowId: string;
}

export const RoleAssignmentTable: React.FC<RoleAssignmentTableProps> = ({ workflowId }) => {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('registrador');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assRes, profRes] = await Promise.all([
        fetch(`/api/workflow/definitions/${workflowId}/assignments`),
        fetch('/api/users/list').catch(() => fetch('/api/admin/users')),
      ]);

      if (assRes.ok) {
        const json = await assRes.json();
        setAssignments(json.data || []);
      }

      if (profRes && profRes.ok) {
        const json = await profRes.json();
        setProfiles(Array.isArray(json) ? json : json.data || []);
      }
    } catch (err: any) {
      showStatus(err.message || 'Error cargando asignaciones', 'error');
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Asignar manualmente
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedRole) {
      showStatus('Selecciona un usuario y un rol', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/workflow/definitions/${workflowId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          role_name: selectedRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al asignar rol');
      }

      showStatus('Rol asignado correctamente ✓');
      setSelectedUserId('');
      await loadData();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Remover asignación
  const handleRemove = async (assignmentId: string) => {
    try {
      const res = await fetch(
        `/api/workflow/definitions/${workflowId}/assignments/${assignmentId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Error al remover asignación');
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      showStatus('Asignación eliminada');
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  };

  // Carga masiva Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingExcel(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/workflow/definitions/${workflowId}/assignments/bulk`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error procesando archivo');
      }

      const result = await res.json();
      showStatus(
        `Carga completada: ${result.inserted || 0} asignaciones agregadas, ${result.skipped || 0} omitidas.`
      );
      await loadData();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setUploadingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#4F5AF5] animate-spin mb-2" />
        <span className="text-xs text-slate-500">Cargando asignaciones de roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-xs">
      {statusMsg && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 font-medium ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Formulario de Asignación Manual */}
      <form
        onSubmit={handleAssign}
        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Usuario Registrado
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] text-xs"
          >
            <option value="">-- Seleccionar usuario --</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.email} ({p.email})
              </option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Rol en el Flujo</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] text-xs"
          >
            <option value="registrador">registrador (Key user)</option>
            <option value="bp_ti">bp_ti (Business Partner)</option>
            <option value="admin">admin (Administrador)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F5AF5] hover:bg-[#3D47E0] text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
          <span>Asignar</span>
        </button>

        {/* Botón de Excel */}
        <div className="ml-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {uploadingExcel ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Carga Masiva Excel</span>
          </button>
        </div>
      </form>

      {/* Tabla de Asignaciones Existentes */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <span className="font-bold text-slate-800">
              Usuarios Asignados ({assignments.length})
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Formato Excel: Columnas <code>email</code> y <code>role_name</code>
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            No hay asignaciones registradas para este flujo. Añade una arriba o usa la carga masiva.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Usuario / Nombre</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Rol Asignado</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {item.profiles?.name || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {item.profiles?.email || '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                        {item.role_name}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover asignación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
