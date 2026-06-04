/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Inbox, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import InitiativeForm from './pages/InitiativeForm';
import ApprovalBoard from './pages/ApprovalBoard';
import InitiativeDetail from './pages/InitiativeDetail';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Nueva Iniciativa', path: '/nueva', icon: PlusCircle },
    { name: 'Bandeja de Aprobación', path: '/bandeja', icon: Inbox },
  ];

  return (
    <div className="flex flex-col min-h-screen md:flex-row bg-[#0f172a] text-slate-200 font-sans">
      <aside className="w-64 bg-[#1e293b] border-r border-slate-700 hidden md:flex md:flex-col shrink-0">
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="font-black text-slate-900 text-xs">IA</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">IniciativaIQ</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-slate-700/50 text-white" : "text-slate-400 hover:bg-slate-700/30 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">AM</div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">Alejandro Mendoza</p>
              <p className="text-xs text-slate-500 truncate">Solicitante Senior</p>
            </div>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col h-full min-h-screen md:h-screen md:overflow-y-auto">
        <header className="h-16 border-b border-slate-700 flex items-center justify-between px-8 bg-[#0f172a] shrink-0">
          <h2 className="text-xl font-semibold text-white">Panel Ejecutivo</h2>
          <div className="flex items-center gap-4">
            <div className="text-xs hidden sm:block bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
              IA Activa: Modelo GPT-3.1
            </div>
            <Link to="/nueva" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors hidden sm:block">
              + Nueva Solicitud
            </Link>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nueva" element={<InitiativeForm />} />
          <Route path="/bandeja" element={<ApprovalBoard />} />
          <Route path="/iniciativa/:id" element={<InitiativeDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
