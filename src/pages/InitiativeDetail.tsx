import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/forms";
import { Button } from "@/src/components/ui/button";

export default function InitiativeDetail() {
  const { id } = useParams();
  const [initiative, setInitiative] = useState<any>(null);

  useEffect(() => {
    fetch('/api/initiatives')
      .then(r => r.json())
      .then(data => {
        const found = data.find((i: any) => i.id === id);
        setInitiative(found);
      });
  }, [id]);

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/initiatives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setInitiative({ ...initiative, status });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!initiative) return <div className="p-8 text-center text-slate-400">Cargando detalles...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/bandeja" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
              &larr; Volver
            </Link>
            <Badge variant="outline" className="font-mono">{initiative.id}</Badge>
            <Badge variant={initiative.status === 'Aprobada' ? 'success' : initiative.status === 'Rechazada' ? 'destructive' : 'default'}>
              {initiative.status}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
            {initiative.summary?.resumenEjecutivo?.substring(0, 60) || 'Detalle de Iniciativa'}...
          </h2>
          <p className="text-slate-400">
            Área: {initiative.area} • Prioridad: {initiative.priority}
          </p>
        </div>
        <div className="flex gap-2">
          {initiative.status === 'Pendiente de Aprobación' && (
            <>
              <Button variant="destructive" onClick={() => updateStatus('Rechazada')}>Rechazar</Button>
              <Button variant="default" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => updateStatus('Aprobada')}>Aprobar</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-700 bg-slate-800/50">
              <CardTitle className="text-lg text-white">Resumen Ejecutivo</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h4 className="font-semibold text-white mb-2">Problema Actual</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{initiative.summary?.problemaActual}</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Solución Esperada</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{initiative.summary?.solucionEsperada}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-2">Sistemas Impactados</h4>
                  <ul className="list-disc pl-5 text-slate-300 text-sm space-y-1">
                    {initiative.summary?.sistemasImpactados?.map((s: string, i: number) => <li key={i}>{s}</li>) || <li>Ninguno</li>}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Beneficios</h4>
                  <ul className="list-disc pl-5 text-slate-300 text-sm space-y-1">
                    {initiative.summary?.beneficios?.map((b: string, i: number) => <li key={i}>{b}</li>) || <li>-</li>}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-700 bg-slate-800/50">
              <CardTitle className="text-base text-white">Clasificación IA</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                <span className="text-slate-400">Complejidad</span>
                <span className="font-medium text-white">{initiative.summary?.complejidad}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                <span className="text-slate-400">Riesgo</span>
                <span className="font-medium text-white">{initiative.summary?.riesgo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Prioridad Sugerida</span>
                <span className="font-medium text-white">{initiative.summary?.prioridadRecomendada}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-700 bg-slate-800/50">
              <CardTitle className="text-base text-white">Datos Iniciales</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3 text-sm">
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Tipo de Necesidad</span>
                <span className="text-slate-300">{initiative.type}</span>
              </div>
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Impacto Esperado</span>
                <span className="text-slate-300">{initiative.impact}</span>
              </div>
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Fecha Registro</span>
                <span className="text-slate-300">{new Date(initiative.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
