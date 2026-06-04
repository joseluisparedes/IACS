import { useState, useRef, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { Input, Select, Label } from "@/src/components/ui/forms";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/src/components/ui/card";
import { Send, Bot, User, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function InitiativeForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    area: 'Tecnología',
    type: 'Automatización',
    priority: 'Media',
    impact: 'Mejora Operativa',
    country: 'Perú'
  });

  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiTyping]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    setIsAiTyping(true);
    // Initial silent message to start the flow
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: [], message: 'Hola, quiero registrar una nueva iniciativa.', initialData: formData })
      });
      const data = await res.json();
      setChatHistory([{ role: 'model', text: data.text }]);
    } catch (error) {
      console.error(error);
      setChatHistory([{ role: 'model', text: 'Error al conectar con el asistente.' }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    const userText = currentMessage;
    const newHistory = [...chatHistory, { role: 'user' as const, text: userText }];
    setChatHistory(newHistory);
    setCurrentMessage('');
    setIsAiTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory, message: userText, initialData: formData })
      });
      const data = await res.json();
      
      let aiResponseText = data.text;
      
      if (aiResponseText.includes('[INFORMACION_COMPLETA]')) {
        aiResponseText = aiResponseText.replace('[INFORMACION_COMPLETA]', '').trim();
        if (aiResponseText) {
           setChatHistory([...newHistory, { role: 'model', text: aiResponseText }]);
        }
        await generateSummary([...newHistory, { role: 'model', text: aiResponseText }]);
      } else {
        setChatHistory([...newHistory, { role: 'model', text: aiResponseText }]);
      }
    } catch (error) {
       console.error(error);
    } finally {
      setIsAiTyping(false);
    }
  };

  const generateSummary = async (fullHistory: any[]) => {
    setIsAiTyping(true);
    setStep(3); // Loading summary state
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: fullHistory, initialData: formData })
      });
      const data = await res.json();
      setSummary(data);
      setStep(4);
    } catch(e) {
      console.error(e);
      alert("Error al generar resumen.");
      setStep(2);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleConfirm = async () => {
    try {
      const res = await fetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
          ...formData,
          chatHistory,
          summary
        })
      });
      if (res.ok) {
        navigate('/bandeja');
      }
    } catch(e) {
       console.error(e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Registro de Iniciativa</h2>
          <p className="text-slate-400">Asistente guiado por IA para levantamiento de requerimientos.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span className={step >= 1 ? "text-indigo-400" : ""}>Datos Iniciales</span>
          <span className="text-slate-600">&gt;</span>
          <span className={step >= 2 ? "text-indigo-400" : ""}>Entrevista</span>
          <span className="text-slate-600">&gt;</span>
          <span className={step >= 4 ? "text-indigo-400" : ""}>Confirmación</span>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <form onSubmit={handleStartChat}>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Área Solicitante</Label>
                  <Select value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
                    {['Comercial', 'Marketing', 'Operaciones', 'Finanzas', 'Recursos Humanos', 'Tecnología', 'Otros'].map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Necesidad</Label>
                  <Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    {['Automatización', 'Integración', 'Reportería', 'Nuevo Desarrollo', 'Mejora de Sistema', 'Infraestructura', 'Inteligencia Artificial'].map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridad Inicial</Label>
                  <Select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    {['Baja', 'Media', 'Alta'].map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Impacto Esperado</Label>
                  <Select value={formData.impact} onChange={e => setFormData({...formData, impact: e.target.value})}>
                    {['Incremento de Ventas', 'Reducción de Costos', 'Cumplimiento Regulatorio', 'Mejora Operativa', 'Experiencia del Cliente'].map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-800/50 p-4 border-t border-slate-700 flex justify-end">
              <Button type="submit">Iniciar Entrevista con IA</Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {step === 2 && (
        <Card className="flex flex-col h-[600px] border border-slate-700 shadow-2xl p-0">
          <div className="p-4 bg-indigo-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white font-semibold text-sm">Entrevista Inteligente</span>
            </div>
            <span className="text-[10px] text-indigo-200 uppercase tracking-widest">Analista Senior IA</span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-900/40">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end ml-auto max-w-[85%]' : 'max-w-[85%]'}`}>
                <div className={`p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 rounded-2xl rounded-tr-none text-white' : 'bg-slate-700 rounded-2xl rounded-tl-none text-slate-200'}`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-500 px-2">{msg.role === 'user' ? 'Tú' : 'AI'}</span>
              </div>
            ))}
            {isAiTyping && (
              <div className="flex flex-col gap-1 max-w-[85%]">
                <div className="bg-slate-700 p-3 rounded-2xl rounded-tl-none text-sm leading-relaxed flex items-center gap-1.5 h-[44px]">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-[10px] text-indigo-400 px-2">IA está analizando...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-slate-700 bg-slate-800">
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center bg-slate-900 border border-slate-600 rounded-lg p-2 w-full">
              <input 
                type="text"
                value={currentMessage} 
                onChange={e => setCurrentMessage(e.target.value)}
                placeholder="Escribe tu respuesta..." 
                disabled={isAiTyping}
                className="bg-transparent flex-1 outline-none text-sm px-2 text-white placeholder-slate-500"
              />
              <button 
                type="submit" 
                disabled={!currentMessage.trim() || isAiTyping}
                className="w-8 h-8 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 rounded flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
              </button>
            </form>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
          <Bot className="w-12 h-12 text-indigo-500 animate-bounce" />
          <h3 className="text-xl font-semibold text-white">Generando Resumen Ejecutivo...</h3>
          <p className="text-slate-400">La IA está estructurando todos los datos recopilados.</p>
        </Card>
      )}

      {step === 4 && summary && (
        <Card>
          <CardHeader className="border-b border-slate-700 bg-emerald-500/10">
            <CardTitle className="text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Resumen Generado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-sm">
            <div>
              <h4 className="font-semibold text-white mb-1">Resumen Ejecutivo</h4>
              <p className="text-slate-300">{summary.resumenEjecutivo}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-white mb-1">Problema Actual</h4>
                <p className="text-slate-300">{summary.problemaActual}</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Solución Esperada</h4>
                <p className="text-slate-300">{summary.solucionEsperada}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">Beneficios Esperados</h4>
              <ul className="list-disc pl-5 text-slate-300 space-y-1">
                {summary.beneficios?.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Sistemas Impactados</span>
                <span className="font-medium text-slate-200">{summary.sistemasImpactados?.join(', ') || 'Ninguno'}</span>
              </div>
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Complejidad</span>
                <span className="font-medium text-slate-200">{summary.complejidad}</span>
              </div>
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Riesgo</span>
                <span className="font-medium text-slate-200">{summary.riesgo}</span>
              </div>
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Prioridad Recomendada</span>
                <span className="font-medium text-slate-200">{summary.prioridadRecomendada}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-800/50 flex justify-end gap-3">
            <Button variant="outline" onClick={() => generateSummary(chatHistory)}>Regenerar Resumen</Button>
            <Button onClick={handleConfirm}>Confirmar y Enviar</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
