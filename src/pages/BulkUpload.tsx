import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Play, RefreshCw, Database, Users, Building, ShieldAlert, Download } from 'lucide-react';

interface UploadStats {
  vpsCreated: number;
  vpsUpdated: number;
  direccionesCreated: number;
  direccionesUpdated: number;
  usersCreated: number;
  rolesAssigned: number;
  rowsProcessed: number;
}

export default function BulkUpload() {
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingCustom(true);
    setStats(null);
    setLogs([]);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/bulk-upload-custom', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ocurrió un error al procesar el archivo');
      }

      setStats(data.stats);
      setLogs(data.logs);
      setSuccessMsg(`¡Carga masiva personalizada completada! Se procesaron ${data.stats.rowsProcessed} filas.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión al cargar el archivo');
    } finally {
      setLoadingCustom(false);
      e.target.value = ''; // Reset input
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "Vice Presidencia",
      "Vicepresidente",
      "Correo de VP",
      "Dirección",
      "Director",
      "Correo del director",
      "Key Users",
      "Correo electrónico",
      "Business Partner 1",
      "Correo BP 1",
      "Business Partner 2",
      "Correo BP 2"
    ];
    const row = [
      "Comercial",
      "Iván Olivares",
      "ivan.olivares@laureate.pe",
      "Business Intelligence y Planeamiento",
      "Alvaro Alberto A. Verastegui Mendoza",
      "alvaro.verastegui@laureate.pe",
      "Juan D. Mina Arango",
      "juan.mina@laureate.pe",
      "Bruno Chiappe",
      "bruno.chiappe@laureate.pe",
      "José Luis Paredes",
      "jose.herbozo@laureate.pe"
    ];
    const csvContent = "\uFEFF" + [headers.join(","), row.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_cargas_masivas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
        <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-3">
          <Database className="w-7 h-7 text-[#4F5AF5]" />
          Administración de Cargas Masivas
        </h1>
        <p className="text-[#64748B] mt-1 text-sm">
          Crea estructuras de Vicepresidencias, Direcciones y asigna roles/accesos masivamente importando plantillas de Excel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Actions */}
        <div className="space-y-6">
          {/* Carga Personalizada */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0] hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-[#1E293B] flex items-center gap-2 mb-3">
              <UploadCloud className="w-5 h-5 text-emerald-500" />
              Cargar Archivo Excel
            </h2>
            <p className="text-sm text-[#64748B] mb-5 leading-relaxed">
              Sube tu archivo de Excel (<code className="text-xs">.xlsx</code>) con el formato correspondiente. El sistema detectará las VPs y Direcciones inexistentes y aplicará los roles de forma acumulativa.
            </p>

            <label
              className={`w-full py-4 px-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-slate-50 ${
                loadingCustom 
                  ? 'border-emerald-300 bg-emerald-50/20 cursor-not-allowed' 
                  : 'border-[#CBD5E1] hover:border-emerald-400'
              }`}
            >
              {loadingCustom ? (
                <div className="py-2 flex flex-col items-center gap-2 text-emerald-600">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="text-sm font-medium">Procesando archivo subido...</span>
                </div>
              ) : (
                <div className="text-center py-2">
                  <UploadCloud className="w-8 h-8 mx-auto text-[#94A3B8]" />
                  <span className="block text-sm font-semibold text-[#1E293B] mt-2">Seleccionar archivo Excel</span>
                  <span className="block text-xs text-[#94A3B8] mt-1">Formatos permitidos: .xlsx, .xls</span>
                </div>
              )}
              <input
                type="file"
                accept=".xlsx, .xls"
                disabled={loadingCustom}
                className="hidden"
                onChange={handleCustomUpload}
              />
            </label>
          </div>

          {/* Requisitos y Columnas */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              Formato Requerido de Columnas
            </h3>
            <p className="text-xs text-[#64748B] mb-3 leading-relaxed">
              El archivo Excel debe contener exactamente las siguientes columnas en su primera hoja:
            </p>
            
            <button
              onClick={downloadTemplate}
              className="mb-4 w-full bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#4F5AF5] font-semibold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Descargar Plantilla CSV con Ejemplo
            </button>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white text-[10px] font-mono text-slate-700 divide-y divide-slate-100">
              <div className="p-2 bg-slate-50 font-bold grid grid-cols-2"><span>Columna Excel</span> <span>Asociación</span></div>
              <div className="p-2 grid grid-cols-2"><span>Vice Presidencia</span> <span>Nombre de la VP (ej. Comercial)</span></div>
              <div className="p-2 grid grid-cols-2"><span>Vicepresidente</span> <span>Nombre del VP (Rol Key user)</span></div>
              <div className="p-2 grid grid-cols-2"><span>Correo de VP</span> <span>Email del VP</span></div>
              <div className="p-2 grid grid-cols-2"><span>Dirección</span> <span>Nombre de la Dirección</span></div>
              <div className="p-2 grid grid-cols-2"><span>Director</span> <span>Nombre del Director (Rol Key user)</span></div>
              <div className="p-2 grid grid-cols-2"><span>Correo del director</span> <span>Email del Director</span></div>
              <div className="p-2 grid grid-cols-2"><span>Key Users</span> <span>Nombre del Key User (Rol Key user)</span></div>
              <div className="p-2 grid grid-cols-2"><span>Correo electrónico</span> <span>Email del Key User</span></div>
              <div className="p-2 grid grid-cols-2"><span>Business Partner 1</span> <span>Nombre BP 1 (Rol Key user y Aprobador)</span></div>
              <div className="p-2 grid grid-cols-2"><span>Correo BP 1</span> <span>Email BP 1</span></div>
              <div className="p-2 grid grid-cols-2"><span>Business Partner 2</span> <span>Nombre BP 2 (Rol Key user y Aprobador)</span></div>
              <div className="p-2 grid grid-cols-2"><span>Correo BP 2</span> <span>Email BP 2</span></div>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Logs */}
        <div className="space-y-6 flex flex-col">
          {/* Feedback message */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex gap-3 items-start animate-fade-in">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Error en la carga masiva</h4>
                <p className="text-xs mt-1 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex gap-3 items-start animate-fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">¡Operación exitosa!</h4>
                <p className="text-xs mt-1 leading-relaxed">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Stats summary */}
          {stats && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                <span className="block text-xs font-semibold text-[#64748B]">Filas Leídas</span>
                <span className="text-2xl font-bold text-[#4F5AF5]">{stats.rowsProcessed}</span>
              </div>
              <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-center">
                <span className="block text-xs font-semibold text-[#64748B]">VPs Creadas/Act</span>
                <span className="text-2xl font-bold text-violet-600">
                  {stats.vpsCreated} <span className="text-xs font-normal text-slate-400">({stats.vpsUpdated})</span>
                </span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                <span className="block text-xs font-semibold text-[#64748B]">Dir. Creadas/Act</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {stats.direccionesCreated} <span className="text-xs font-normal text-slate-400">({stats.direccionesUpdated})</span>
                </span>
              </div>
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-center">
                <span className="block text-xs font-semibold text-[#64748B]">Usuarios Whitelist</span>
                <span className="text-2xl font-bold text-teal-600">{stats.usersCreated}</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center col-span-2 sm:col-span-2">
                <span className="block text-xs font-semibold text-[#64748B]">Permisos Asignados</span>
                <span className="text-2xl font-bold text-amber-600">{stats.rolesAssigned}</span>
              </div>
            </div>
          )}

          {/* Logs Terminal */}
          <div className="bg-[#1E293B] rounded-2xl shadow-lg border border-[#334155] overflow-hidden flex flex-col flex-1 min-h-[350px]">
            <div className="px-5 py-3.5 bg-[#0F172A] border-b border-[#334155] flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-slate-300 font-mono tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                BITÁCORA DE TRANSACCIONES (DB LOGS)
              </span>
              <button 
                onClick={() => { setLogs([]); setStats(null); }}
                className="text-[10px] font-bold text-[#94A3B8] hover:text-white hover:underline uppercase"
              >
                Limpiar
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed space-y-1.5 select-text selection:bg-indigo-500/30">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#64748B] italic">
                  Las transacciones del procesamiento se mostrarán aquí en tiempo real...
                </div>
              ) : (
                logs.map((log, index) => {
                  let badge = 'text-indigo-400';
                  if (log.includes('Creada') || log.includes('creado')) badge = 'text-emerald-400';
                  if (log.includes('modificado') || log.includes('Actualizada')) badge = 'text-amber-400';
                  
                  return (
                    <div key={index} className="flex gap-2 items-start py-0.5 border-b border-[#334155]/20">
                      <span className="text-[#64748B] select-none">[{index + 1}]</span>
                      <span className={badge}>{log}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
