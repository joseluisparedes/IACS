import React, { useState, useEffect } from 'react';
import { Mail, Search, Eye, X, CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface EmailLog {
  id: string;
  initiative_id: string | null;
  recipient: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed';
  error_message: string | null;
  created_at: string;
}

export default function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/email-logs');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (e) {
      console.error('Error fetching email logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0] flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-3">
            <Mail className="w-7 h-7 text-[#4F5AF5]" />
            Bandeja de Auditoría de Correos
          </h1>
          <p className="text-[#64748B] mt-1 text-sm">
            Monitorea todas las notificaciones por correo enviadas y disparadas por reglas de negocio en la plataforma.
          </p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          className="flex items-center gap-2 border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-55"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por destinatario o asunto..." 
            className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5] transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:border-[#4F5AF5] text-[#475569] font-medium"
        >
          <option value="all">Todos los estados</option>
          <option value="sent">Enviados exitosamente</option>
          <option value="failed">Fallidos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                <th className="px-6 py-4">Destinatario</th>
                <th className="px-6 py-4">Asunto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha / Hora</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm text-[#334155]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex justify-center items-center gap-3 text-[#94A3B8]">
                      <div className="w-5 h-5 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
                      Cargando registros...
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#94A3B8] italic">
                    No se encontraron correos registrados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{log.recipient}</td>
                    <td className="px-6 py-4 truncate max-w-xs" title={log.subject}>{log.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        log.status === 'sent' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {log.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {log.status === 'sent' ? 'Enviado' : 'Fallo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#64748B]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedEmail(log)}
                        className="p-2 text-[#4F5AF5] hover:bg-[#EEF2FF] rounded-lg transition-all inline-flex items-center justify-center"
                        title="Ver contenido del correo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#F1F5F9] bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#1E293B] text-base">Detalle del Correo Enviado</h3>
                <p className="text-xs text-[#64748B] mt-0.5 font-mono">ID: {selectedEmail.id}</p>
              </div>
              <button 
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl">
                <div>
                  <span className="font-bold text-[#64748B] block uppercase tracking-wider">Destinatario:</span>
                  <span className="text-[#1E293B] text-sm font-semibold">{selectedEmail.recipient}</span>
                </div>
                <div>
                  <span className="font-bold text-[#64748B] block uppercase tracking-wider">Fecha de Envío:</span>
                  <span className="text-[#1E293B] text-sm font-semibold">{new Date(selectedEmail.created_at).toLocaleString()}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-bold text-[#64748B] block uppercase tracking-wider">Asunto:</span>
                  <span className="text-[#1E293B] text-sm font-semibold">{selectedEmail.subject}</span>
                </div>
                {selectedEmail.error_message && (
                  <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-xs">Error de Servidor SMTP:</span>
                      <span className="text-xs font-mono">{selectedEmail.error_message}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Iframe Preview */}
              <div>
                <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Vista Previa de la Plantilla HTML:</span>
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-inner">
                  <iframe 
                    title="Vista Previa de Correo"
                    src={`data:text/html;charset=utf-8,${encodeURIComponent(selectedEmail.body)}`}
                    className="w-full h-[380px] bg-white border-0"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#F1F5F9] bg-slate-50 flex justify-end">
              <button 
                onClick={() => setSelectedEmail(null)}
                className="bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
