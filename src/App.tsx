/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, PlusCircle, Inbox, Settings2, ChevronDown, Bell } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import InitiativeForm from './pages/InitiativeForm';
import ApprovalBoard from './pages/ApprovalBoard';
import InitiativeDetail from './pages/InitiativeDetail';
import AdminFields from './pages/AdminFields';

const ADMIN_PATHS = ['/admin'];

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const [adminOpen, setAdminOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar_admin_open');
    if (saved !== null) return saved === 'true';
    return ADMIN_PATHS.includes(location.pathname);
  });

  useEffect(() => {
    if (ADMIN_PATHS.includes(location.pathname)) setAdminOpen(true);
  }, [location.pathname]);

  const toggleAdmin = () => {
    setAdminOpen(prev => {
      localStorage.setItem('sidebar_admin_open', String(!prev));
      return !prev;
    });
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Nueva Iniciativa', path: '/nueva', icon: PlusCircle },
    { name: 'Bandeja de Aprobación', path: '/bandeja', icon: Inbox },
  ];

  const adminItems = [
    { name: 'Campos del Formulario', path: '/admin', icon: Settings2 },
  ];

  return (
    <div className="flex flex-col min-h-screen md:flex-row bg-[#F0F4FF] text-[#1E293B] font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E2E8F0] hidden md:flex md:flex-col shrink-0 shadow-[1px_0_4px_rgba(0,0,0,.04)]">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#4F5AF5] rounded-lg flex items-center justify-center shadow-md shadow-[#4F5AF5]/30">
            <span className="font-black text-white text-xs">IA</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-[#1E293B]">IniciativaIQ</span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-widest px-3 mb-2">Principal</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#EEF2FF] text-[#4F5AF5]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#4F5AF5]' : ''}`} />
                {item.name}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="pt-4 pb-1">
            <div className="border-t border-[#E2E8F0]" />
          </div>

          {/* Admin collapsible */}
          <div>
            <button
              onClick={toggleAdmin}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F8FAFC]"
            >
              <span className="text-[10px] uppercase tracking-widest font-semibold">Administración</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-200 ease-in-out ${adminOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="pt-1 pl-2 space-y-1">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-violet-50 text-violet-600'
                          : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4F5AF5] to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              AM
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-[#1E293B] truncate">Alejandro Mendoza</p>
              <p className="text-xs text-[#94A3B8] truncate">Solicitante Senior</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full min-h-screen md:h-screen md:overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-[#E2E8F0] flex items-center justify-between px-8 bg-white shrink-0 shadow-[0_1px_3px_rgba(0,0,0,.05)]">
          <h2 className="text-base font-semibold text-[#1E293B]">Panel Ejecutivo</h2>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <Link
              to="/nueva"
              className="bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-[#4F5AF5]/20 hidden sm:flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Nueva Solicitud
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
          <Route path="/admin" element={<AdminFields />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
