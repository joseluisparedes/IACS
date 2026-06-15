import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Bot, ChevronRight, Pencil, Save, Send, RotateCcw } from "lucide-react";
import { FieldDefinition } from "@/src/types";

// ─── Input styles ─────────────────────────────────────────────────────────────
const inputCls = "w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2.5 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] focus:border-[#4F5AF5] transition-colors";
const labelCls = "block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5";

// ─── Dynamic field ────────────────────────────────────────────────────────────
function DynamicField({ field, value, onChange, parentValue }: {
  field: FieldDefinition; value: string; onChange: (v: string) => void; parentValue?: string;
}) {
  if (field.field_type === "date")
    return <input type="date" value={value} onChange={e => onChange(e.target.value)} required={field.is_required} className={inputCls} />;
  if (field.field_type === "select") {
    let options = field.options;
    if (field.depends_on && field.options_map && parentValue) {
      options = field.options_map[parentValue] || [];
    } else if (field.depends_on) {
      options = []; // Hide options if parent is not selected
    }
    return (
      <select value={value} onChange={e => onChange(e.target.value)} required={field.is_required} className={inputCls} disabled={field.depends_on ? !parentValue : false}>
        <option value="" disabled>Selecciona...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} required={field.is_required} placeholder={`Ingresa ${field.label.toLowerCase()}...`} className={inputCls} />;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function StatusBadge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{label}</span>;
}

// ─── Summary row ──────────────────────────────────────────────────────────────
function SummaryRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3 border-b border-[#F1F5F9] last:border-0">
      <div className="w-6 shrink-0 text-[#4F5AF5] text-base mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-0.5">{label}</p>
        <div className="text-sm text-[#1E293B]">{value}</div>
      </div>
    </div>
  );
}

// ─── Step breadcrumb ──────────────────────────────────────────────────────────
const STEPS = [
  { n: "1", label: "Formulario inicial" },
  { n: "2", label: "Asistente IA" },
  { n: "3", label: "Resumen" },
  { n: "4", label: "Revisión BP" },
];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={s.n} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              active ? "bg-[#EEF2FF] text-[#4F5AF5]"
              : done ? "text-[#4F5AF5]"
              : "text-[#94A3B8]"
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                active ? "bg-[#4F5AF5] text-white"
                : done ? "bg-[#4F5AF5] text-white"
                : "bg-[#E2E8F0] text-[#94A3B8]"
              }`}>
                {done ? "✓" : s.n}
              </span>
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] mx-1 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InitiativeForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [aiFields, setAiFields] = useState<FieldDefinition[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/fields")
      .then(r => r.json())
      .then((data: FieldDefinition[]) => {
        const visibleFormFields = data.filter(f => f.is_visible && (f.section || 'form') === 'form');
        const visibleAiFields = data.filter(f => f.is_visible && f.section === 'ai');
        setFields(visibleFormFields);
        setAiFields(visibleAiFields);
        const initial: Record<string, string> = {};
        visibleFormFields.forEach(f => {
          initial[f.key] = f.field_type === "select" && f.options.length > 0 ? f.options[0] : "";
        });
        setFormData(initial);
      })
      .catch(console.error)
      .finally(() => setLoadingFields(false));
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isAiTyping]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    setIsAiTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: [], message: "Hola, quiero registrar una nueva iniciativa.", initialData: formData, aiFields }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChatHistory([{ role: "model", text: data.text }]);
    } catch { setChatHistory([{ role: "model", text: "Error al conectar con el asistente. Intenta de nuevo." }]); }
    finally { setIsAiTyping(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;
    const userText = currentMessage;
    const newHistory = [...chatHistory, { role: "user" as const, text: userText }];
    setChatHistory(newHistory);
    setCurrentMessage("");
    setIsAiTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newHistory, message: userText, initialData: formData, aiFields }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      let text = data.text as string;
      if (text.includes("[INFORMACION_COMPLETA]")) {
        text = text.replace("[INFORMACION_COMPLETA]", "").trim();
        if (text) setChatHistory([...newHistory, { role: "model", text }]);
        await generateSummary([...newHistory, { role: "model", text }]);
      } else {
        setChatHistory([...newHistory, { role: "model", text }]);
      }
    } catch { setChatHistory([...newHistory, { role: "model", text: "Error al enviar. Intenta de nuevo." }]); }
    finally { setIsAiTyping(false); }
  };

  const generateSummary = async (fullHistory: any[]) => {
    setIsAiTyping(true);
    setStep(3);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: fullHistory, initialData: formData, aiFields }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSummary(data);
    } catch { alert("Error al generar resumen."); setStep(2); }
    finally { setIsAiTyping(false); }
  };

  const handleSave = async (status: "Borrador" | "Pendiente de Aprobación") => {
    try {
      const res = await fetch("/api/initiatives", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_data: formData, chat_history: chatHistory, summary, status }),
      });
      if (res.ok) navigate("/bandeja");
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Stepper current={step} />

      {/* ── Step 1: Formulario inicial ──────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                <span className="text-[#4F5AF5] text-sm">📋</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">1. Formulario inicial</h2>
                <p className="text-xs text-[#94A3B8]">Completa la información base antes de conversar con la IA.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleStartChat}>
            <div className="px-8 py-6">
              {loadingFields ? (
                <div className="flex items-center justify-center py-10 text-[#94A3B8] gap-3">
                  <div className="w-5 h-5 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
                  Cargando campos...
                </div>
              ) : fields.length === 0 ? (
                <div className="text-center py-10 text-[#94A3B8]">
                  No hay campos configurados. Ve a <strong className="text-[#1E293B]">Administración</strong> para agregar campos.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {fields.map(field => (
                    <div key={field.key}>
                      <label className={labelCls}>
                        {field.label}
                        {field.is_required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <DynamicField 
                        field={field} 
                        value={formData[field.key] ?? ""} 
                        parentValue={field.depends_on ? formData[field.depends_on] : undefined}
                        onChange={v => {
                          setFormData(p => {
                            const newForm = { ...p, [field.key]: v };
                            // Reset any child fields that depend on this one
                            fields.filter(f => f.depends_on === field.key).forEach(child => {
                              newForm[child.key] = "";
                            });
                            return newForm;
                          });
                        }} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-8 py-5 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end">
              <button
                type="submit"
                disabled={loadingFields || fields.length === 0}
                className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
              >
                Continuar con asistente IA
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 2: Asistente IA ────────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden flex flex-col" style={{ height: 620 }}>
          {/* Chat header */}
          <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center gap-3 bg-[#4F5AF5]">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">2. Asistente IA</p>
              <p className="text-[10px] text-blue-200 uppercase tracking-widest">Analista de Negocio Senior</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-blue-100">En línea</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[#F8FAFC]">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-[#4F5AF5] text-white rounded-tr-sm"
                    : "bg-white text-[#1E293B] border border-[#E2E8F0] rounded-tl-sm"
                }`}>
                  {msg.text}
                  <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-blue-200 text-right" : "text-[#94A3B8]"}`}>
                    {msg.role === "user" ? "Tú" : "IA Analista"}
                  </p>
                </div>
              </div>
            ))}
            {isAiTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#E2E8F0] px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-11">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 border-t border-[#E2E8F0] bg-white">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                value={currentMessage}
                onChange={e => setCurrentMessage(e.target.value)}
                disabled={isAiTyping}
                placeholder="Escribe tu respuesta..."
                className="flex-1 border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] focus:border-[#4F5AF5] transition-colors"
              />
              <button
                type="submit"
                disabled={!currentMessage.trim() || isAiTyping}
                className="w-10 h-10 rounded-xl bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:bg-[#E2E8F0] flex items-center justify-center text-white transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Step 3: Generando ───────────────────────────────────────────── */}
      {step === 3 && isAiTyping && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-16 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center">
            <Bot className="w-7 h-7 text-[#4F5AF5] animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Generando Resumen del Requerimiento</h3>
          <p className="text-sm text-[#64748B]">La IA está estructurando toda la información recopilada...</p>
          <div className="flex gap-1.5 mt-2">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-1.5 h-6 rounded-full bg-[#4F5AF5]/20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: Resumen del requerimiento ──────────────────────────── */}
      {step === 3 && !isAiTyping && summary && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden">
          {/* Header */}
          <div className="px-8 py-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">3. Resumen del requerimiento</h2>
                <p className="text-xs text-[#94A3B8]">Revisa y confirma antes de enviarlo a revisión BP.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Listo para enviar al BP
            </span>
          </div>

          {/* Summary fields */}
          <div className="px-8 py-4">
            {aiFields.length > 0 ? (
              aiFields.map(f => {
                const val = summary[f.key];
                const displayVal = Array.isArray(val) ? (
                  <ul className="space-y-1 mt-1">
                    {val.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#4F5AF5] mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : val;

                return <SummaryRow key={f.key} icon="🔸" label={f.label} value={displayVal ?? <span className="text-slate-400">—</span>} />;
              })
            ) : (
              <>
                <SummaryRow icon="📌" label="Título" value={<strong>{summary.titulo}</strong>} />
                <SummaryRow icon="🎯" label="Objetivo" value={summary.objetivo} />
              </>
            )}

            {/* Meta badges */}
            <div className="flex flex-wrap gap-3 pt-4 mt-2 border-t border-[#F1F5F9]">
              {[
                { label: "Complejidad", value: summary.complejidad, color: summary.complejidad === "Alta" ? "bg-red-50 text-red-700 border border-red-100" : summary.complejidad === "Media" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100" },
                { label: "Riesgo", value: summary.riesgo, color: summary.riesgo === "Alto" ? "bg-red-50 text-red-700 border border-red-100" : summary.riesgo === "Medio" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100" },
                { label: "Prioridad", value: summary.prioridadRecomendada, color: "bg-[#EEF2FF] text-[#4F5AF5] border border-[#C7D2FE]" },
              ].map(b => (
                <span key={b.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${b.color}`}>
                  <span className="text-xs font-normal opacity-60">{b.label}:</span>
                  {b.value}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-5 border-t border-[#F1F5F9] bg-[#F8FAFC] flex flex-wrap gap-3 justify-between items-center">
            <button
              onClick={() => { setStep(2); setSummary(null); }}
              className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Editar respuestas
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => generateSummary(chatHistory)}
                className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Regenerar
              </button>
              <button
                onClick={() => handleSave("Borrador")}
                className="flex items-center gap-2 border border-[#4F5AF5] text-[#4F5AF5] hover:bg-[#EEF2FF] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar borrador
              </button>
              <button
                onClick={() => handleSave("Pendiente de Aprobación")}
                className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
              >
                <Send className="w-4 h-4" />
                Enviar a revisión BP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
