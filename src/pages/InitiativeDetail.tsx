import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  "Pendiente de Aprobación": "bg-[#EEF2FF] text-[#4F5AF5]",
  "Aprobada": "bg-emerald-50 text-emerald-700",
  "Rechazada": "bg-red-50 text-red-600",
  "Observada": "bg-amber-50 text-amber-700",
  "Borrador": "bg-[#F1F5F9] text-[#64748B]",
  "En Ejecución": "bg-emerald-50 text-emerald-700",
};

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-4 py-3 border-b border-[#F8FAFC] last:border-0">
      <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider w-40 shrink-0 mt-0.5">{label}</p>
      <p className="text-sm text-[#1E293B] flex-1">{value || <span className="text-[#CBD5E1]">—</span>}</p>
    </div>
  );
}

export default function InitiativeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initiative, setInitiative] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/initiatives")
      .then(r => r.json())
      .then(data => {
        const found = Array.isArray(data) ? data.find((i: any) => i.id === id) : null;
        setInitiative(found ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/initiatives/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setInitiative((prev: any) => ({ ...prev, status }));
    } catch (e) { console.error(e); }
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
  const title = s.titulo ?? Object.values(initiative.form_data ?? {})[0] ?? initiative.id;
  const statusStyle = STATUS_STYLE[initiative.status] ?? "bg-[#F1F5F9] text-[#64748B]";
  const isPending = initiative.status === "Pendiente de Aprobación";

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Back + header */}
      <div>
        <Link to="/bandeja" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#1E293B] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver a Revisión BP
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
          {isPending && (
            <div className="flex gap-3">
              <button
                onClick={() => updateStatus("Observada")}
                className="flex items-center gap-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Observar
              </button>
              <button
                onClick={() => updateStatus("Rechazada")}
                className="flex items-center gap-2 border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Rechazar
              </button>
              <button
                onClick={() => updateStatus("Aprobada")}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20"
              >
                <CheckCircle className="w-4 h-4" />
                Aprobar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-5">
          {/* Summary card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#1E293B]">Resumen del Requerimiento</h3>
            </div>
            <div className="px-6 py-2">
              {Object.entries(s)
                .filter(([k]) => !["titulo", "complejidad", "riesgo", "prioridadRecomendada", "beneficiosCualitativos"].includes(k))
                .map(([k, v]) => (
                  <Row key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={String(v)} />
                ))}
            </div>
          </div>

          {/* Qualitative benefits */}
          {s.beneficiosCualitativos?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F1F5F9]">
                <h3 className="text-sm font-bold text-[#1E293B]">Beneficios Cualitativos</h3>
              </div>
              <ul className="px-6 py-4 space-y-2">
                {s.beneficiosCualitativos.map((b: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#1E293B]">
                    <span className="text-[#4F5AF5] mt-0.5 shrink-0">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Form data */}
          {initiative.form_data && Object.keys(initiative.form_data).length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F1F5F9]">
                <h3 className="text-sm font-bold text-[#1E293B]">Datos del Formulario</h3>
              </div>
              <div className="px-6 py-2">
                {Object.entries(initiative.form_data).map(([k, v]) => (
                  <Row key={k} label={k.replace(/_/g, " ")} value={String(v)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
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
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#F8FAFC] last:border-0">
                  <span className="text-[#64748B]">{item.label}</span>
                  <span className="font-semibold text-[#1E293B]">{item.value ?? "—"}</span>
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
              <div>
                <span className="block text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider mb-1">Estado actual</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle}`}>
                  {initiative.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
