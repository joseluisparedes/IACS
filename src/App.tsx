import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Inbox, Settings2, ChevronDown, Bell, Users, LogOut, ShieldAlert, MessageSquarePlus, BrainCircuit, Mail, Upload } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import InitiativeForm from './pages/InitiativeForm';
import ApprovalBoard from './pages/ApprovalBoard';
import InitiativeDetail from './pages/InitiativeDetail';
import AdminFields from './pages/AdminFields';
import AgentBoard from './pages/AgentBoard';
import UserManagement from './pages/UserManagement';
import VPManagement from './pages/VPManagement';
import Login from './pages/Login';
import AITraining from './pages/AITraining';
import EmailLogs from './pages/EmailLogs';
import BulkUpload from './pages/BulkUpload';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';

const ADMIN_PATHS = ['/admin', '/admin/agentes', '/admin/usuarios', '/admin/estructura', '/admin/ia-training', '/admin/correos', '/admin/cargas-masivas'];

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { profile } = useAuth();

  const [adminOpen, setAdminOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar_admin_open');
    if (saved !== null) return saved === 'true';
    return ADMIN_PATHS.includes(location.pathname);
  });

  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (ADMIN_PATHS.includes(location.pathname)) setAdminOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    if (profile?.name) {
      const fetchDrafts = async () => {
        const { data } = await supabase
          .from('initiatives')
          .select('id, form_data, created_at')
          .eq('status', 'Borrador')
          .order('created_at', { ascending: false });
        if (data) {
          const myDrafts = data.filter(d => d.form_data?.registrador === profile.name);
          setDrafts(myDrafts);
        }
      };
      fetchDrafts();

      const channel = supabase.channel('drafts_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'initiatives', filter: `status=eq.Borrador` }, fetchDrafts)
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [profile?.name]);

  useEffect(() => {
    if (profile?.id) {
      const fetchNotifications = async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        if (data) {
          setNotifications(data);
        }
      };
      fetchNotifications();

      const channel = supabase.channel('notifs_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, fetchNotifications)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, fetchNotifications)
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [profile?.id]);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
      setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
    }
    setNotificationsOpen(false);
  };

  const toggleAdmin = () => {
    setAdminOpen(prev => {
      localStorage.setItem('sidebar_admin_open', String(!prev));
      return !prev;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.profile_roles?.some((r: any) => r.role === 'admin');
  const isRegistrador = profile?.profile_roles?.some((r: any) => r.role === 'registrador');

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    ...(isAdmin || isRegistrador ? [{ name: 'Nueva Iniciativa', path: '/nueva', icon: PlusCircle }] : []),
    { name: 'Bandeja de Aprobación', path: '/bandeja', icon: Inbox },
  ];

  const adminItems = [
    { name: 'Estructura Organizativa', path: '/admin/estructura', icon: Settings2 },
    { name: 'Campos del Formulario', path: '/admin', icon: Settings2 },
    { name: 'Gestión de Usuarios', path: '/admin/usuarios', icon: ShieldAlert },
    { name: 'Tablero de Agentes', path: '/admin/agentes', icon: Users },
    { name: 'Entrenamiento IA', path: '/admin/ia-training', icon: BrainCircuit },
    { name: 'Bandeja de Correos', path: '/admin/correos', icon: Mail },
    { name: 'Cargas Masivas', path: '/admin/cargas-masivas', icon: Upload },
  ];

  const userName = profile?.name || 'Usuario';
  const roleNamesMap: Record<string, string> = {
    'registrador': 'Registrador',
    'bp_ti': 'Business Partner TI',
    'admin': 'Admin'
  };

  const showDraftsCounter = isAdmin || isRegistrador;
  
  const uniqueRoles = Array.from(new Set(profile?.profile_roles?.map((r: any) => r.role)));
  const formattedRoles = uniqueRoles.map((r: any) => roleNamesMap[r] || r);
  const userRoleStr = isAdmin ? 'Admin' : (formattedRoles.length > 0 ? formattedRoles.join(', ') : 'Invitado');
  const userInitials = userName.substring(0, 2).toUpperCase();

  const [showRolesModal, setShowRolesModal] = useState(false);
  const [rolesDetails, setRolesDetails] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.profile_roles && showRolesModal) {
      const fetchDetails = async () => {
        const { data: vps } = await supabase.from('vps').select('id, name');
        const { data: dirs } = await supabase.from('direcciones').select('id, name');
        
        if (vps && dirs) {
          const details = profile.profile_roles.filter((r: any) => r.role !== 'admin').map((r: any) => {
             const vp = vps.find(v => v.id === r.vp_id);
             const dirsForRole = r.direcciones_ids && r.direcciones_ids.length > 0
                ? dirs.filter(d => r.direcciones_ids.includes(d.id))
                : [];
             return {
                role: roleNamesMap[r.role] || r.role,
                vpName: vp?.name || 'Todas',
                direcciones: dirsForRole.map(d => d.name)
             };
          });
          setRolesDetails(details);
        }
      };
      fetchDetails();
    }
  }, [profile?.profile_roles, showRolesModal]);

  return (
    <div className="flex flex-col min-h-screen md:flex-row bg-[#F0F4FF] text-[#1E293B] font-sans">
      {/* Roles Modal */}
      {showRolesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowRolesModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC]">
              <h3 className="text-sm font-bold text-[#1E293B]">Detalle de tus Roles</h3>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {isAdmin && (
                <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-4 rounded-xl">
                  <p className="text-sm font-bold text-[#4F5AF5]">Admin</p>
                  <p className="text-xs text-[#64748B] mt-1">Acceso global a la administración del sistema.</p>
                </div>
              )}
              {rolesDetails.length === 0 && !isAdmin ? (
                <p className="text-xs text-[#94A3B8]">No tienes detalles específicos configurados.</p>
              ) : (
                rolesDetails.map((detail, idx) => (
                  <div key={idx} className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
                    <p className="text-sm font-bold text-[#1E293B] mb-2">{detail.role}</p>
                    <div className="space-y-1.5">
                      <p className="text-xs text-[#64748B]">
                        <strong className="text-[#1E293B]">VP:</strong> {detail.vpName}
                      </p>
                      <div>
                        <p className="text-xs font-semibold text-[#1E293B] mb-1">Direcciones:</p>
                        {detail.direcciones.length > 0 ? (
                          <ul className="text-xs text-[#64748B] list-disc pl-4 space-y-0.5">
                            {detail.direcciones.map((d: string, i: number) => <li key={i}>{d}</li>)}
                          </ul>
                        ) : (
                          <p className="text-xs text-[#94A3B8] italic">Todas las direcciones / No especificadas</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end">
              <button
                onClick={() => setShowRolesModal(false)}
                className="bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E2E8F0] hidden md:flex md:flex-col shrink-0 shadow-[1px_0_4px_rgba(0,0,0,.04)]">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#4F5AF5] rounded-lg flex items-center justify-center shadow-md shadow-[#4F5AF5]/30 shrink-0">
            <span className="font-black text-white text-xs">TI</span>
          </div>
          <span className="font-bold text-base tracking-tight text-[#1E293B] leading-snug">Gestión de necesidades TI</span>
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
          {isAdmin && (
            <div>
              <button
                onClick={toggleAdmin}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F8FAFC]"
              >
                <span className="text-[10px] uppercase tracking-widest font-semibold">Administración</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-200 ease-in-out ${adminOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pt-1 pl-2 space-y-1 pb-2">
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
          )}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4F5AF5] to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0 uppercase">
              {userInitials}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-[#1E293B] truncate">{userName}</p>
              {formattedRoles.length > 0 ? (
                <button 
                  onClick={() => setShowRolesModal(true)}
                  className="text-[10px] text-[#4F5AF5] hover:text-[#3F49E0] truncate uppercase text-left w-full block mt-0.5"
                  title="Ver detalles de los roles"
                >
                  <div className="flex flex-col gap-0.5">
                    {isAdmin ? (
                      <span className="underline">Admin</span>
                    ) : (
                      formattedRoles.map((r: any, idx: number) => (
                        <span key={idx} className="underline truncate leading-tight">{r}</span>
                      ))
                    )}
                  </div>
                </button>
              ) : (
                <p className="text-[10px] text-[#94A3B8] truncate uppercase mt-0.5">Invitado</p>
              )}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full min-h-screen md:h-screen md:overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-[#E2E8F0] flex items-center justify-between px-8 bg-white shrink-0 shadow-[0_1px_3px_rgba(0,0,0,.05)]">
          <h2 className="text-base font-semibold text-[#1E293B]">Panel Ejecutivo</h2>
          <div className="flex items-center gap-3 relative z-50">
            {showDraftsCounter && (
              <div className="relative z-50">
                <button 
                  onClick={() => {
                    setDraftsOpen(!draftsOpen);
                    setNotificationsOpen(false);
                  }}
                className="relative w-9 h-9 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
                title="Chats pendientes"
              >
                <MessageSquarePlus className="w-4 h-4" />
                {drafts.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {drafts.length}
                  </span>
                )}
              </button>

              {draftsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDraftsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-[#E2E8F0] z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                      <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Chats en curso</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {drafts.length === 0 ? (
                        <p className="text-xs text-[#94A3B8] text-center py-4">No hay chats pendientes.</p>
                      ) : (
                        drafts.map(d => (
                          <Link
                            key={d.id}
                            to={`/nueva/${d.id}`}
                            onClick={() => setDraftsOpen(false)}
                            className="block p-3 rounded-lg hover:bg-[#F8FAFC] transition-colors border border-transparent hover:border-[#E2E8F0] mb-1"
                          >
                            <p className="text-sm font-semibold text-[#1E293B] truncate">
                              {d.form_data?.titulo || "Sin título"}
                            </p>
                            <p className="text-[10px] text-[#94A3B8] mt-1">
                              Actualizado: {new Date(d.created_at).toLocaleDateString()} {new Date(d.created_at).toLocaleTimeString()}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
              </div>
            )}
            <div className="relative z-50">
              <button 
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setDraftsOpen(false);
                }}
                className="w-9 h-9 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {unreadNotifs}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-[#E2E8F0] z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                      <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Notificaciones</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-[#94A3B8] text-center py-4">No tienes notificaciones.</p>
                      ) : (
                        notifications.map(n => (
                          <Link
                            key={n.id}
                            to={`/iniciativa/${n.initiative_id}`}
                            onClick={() => handleNotificationClick(n)}
                            className={`block p-3 rounded-lg transition-colors border border-transparent mb-1 ${n.read ? 'hover:bg-[#F8FAFC]' : 'bg-[#EEF2FF] hover:border-[#C7D2FE]'}`}
                          >
                            <p className={`text-sm ${n.read ? 'text-[#64748B]' : 'font-semibold text-[#1E293B]'} leading-tight`}>
                              {n.message}
                            </p>
                            <p className="text-[10px] text-[#94A3B8] mt-1.5">
                              {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString()}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            {(isAdmin || isRegistrador) && (
              <Link
                to="/nueva"
                className="bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-[#4F5AF5]/20 hidden sm:flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Nueva Solicitud
              </Link>
            )}
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4FF]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4F5AF5] border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/nueva" element={<ProtectedRoute><InitiativeForm /></ProtectedRoute>} />
          <Route path="/nueva/:id" element={<ProtectedRoute><InitiativeForm /></ProtectedRoute>} />
          <Route path="/bandeja" element={<ProtectedRoute><ApprovalBoard /></ProtectedRoute>} />
          <Route path="/iniciativa/:id" element={<ProtectedRoute><InitiativeDetail /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminFields /></ProtectedRoute>} />
          <Route path="/admin/estructura" element={<ProtectedRoute><VPManagement /></ProtectedRoute>} />
          <Route path="/admin/agentes" element={<ProtectedRoute><AgentBoard /></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/ia-training" element={<ProtectedRoute><AITraining /></ProtectedRoute>} />
          <Route path="/admin/correos" element={<ProtectedRoute><EmailLogs /></ProtectedRoute>} />
          <Route path="/admin/cargas-masivas" element={<ProtectedRoute><BulkUpload /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
