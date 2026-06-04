import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Input, Select } from "@/src/components/ui/forms";
import { Initiative } from "@/src/types";

export default function ApprovalBoard() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [filterState, setFilterState] = useState("");

  useEffect(() => {
    fetch('/api/initiatives')
      .then(r => r.json())
      .then(data => setInitiatives(data));
  }, []);

  const filtered = initiatives.filter(i => filterState ? i.status === filterState : true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Bandeja de Aprobación</h2>
        <p className="text-slate-400">Revisa y gestiona las iniciativas registradas.</p>
      </div>

      <div className="flex gap-4">
        <div className="w-full md:w-1/3">
          <Select value={filterState} onChange={(e) => setFilterState(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="Pendiente de Aprobación">Pendiente</option>
            <option value="Aprobada">Aprobada</option>
            <option value="Rechazada">Rechazada</option>
          </Select>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-slate-700 shadow-sm overflow-hidden text-sm">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <span className="font-semibold text-sm text-white">Listado de Iniciativas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-transparent border-b border-slate-700 text-slate-500 font-medium uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">Área</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Prioridad</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-slate-300">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-white">{i.id}</td>
                  <td className="px-6 py-4">{i.area}</td>
                  <td className="px-6 py-4">{i.type}</td>
                  <td className="px-6 py-4">
                    <Badge variant={i.priority === 'Alta' ? 'destructive' : i.priority === 'Media' ? 'warning' : 'outline'}>
                      {i.priority === 'Alta' ? '● Alta' : i.priority === 'Media' ? '● Media' : '○ Baja'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={i.status === 'Aprobada' ? 'success' : i.status === 'Rechazada' ? 'destructive' : 'default'}>
                      {i.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/iniciativa/${i.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium text-xs uppercase tracking-wider">
                      Revisar
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No hay iniciativas que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
