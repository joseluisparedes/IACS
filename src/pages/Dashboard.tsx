import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { BarChart3, Activity, CheckCircle, Clock } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    fetch('/api/initiatives')
      .then(r => r.json())
      .then(data => {
        const s = { total: data.length, pending: 0, approved: 0, rejected: 0 };
        data.forEach((d: any) => {
          if (d.status === 'Pegndiente de Aprobación') s.pending++;
          else if (d.status === 'Aprobada') s.approved++;
          else if (d.status === 'Rechazada') s.rejected++;
        });
        setStats(s);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Dashboard Ejecutivo</h2>
        <p className="text-slate-400">Vista general de las iniciativas de negocio.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs uppercase text-slate-400 tracking-wider">Total Iniciativas</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs uppercase text-slate-400 tracking-wider">Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs uppercase text-slate-400 tracking-wider">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs uppercase text-slate-400 tracking-wider">Rechazadas</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="pt-6">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 text-center py-10">Aquí se mostrará un gráfico de iniciativas pronto.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
