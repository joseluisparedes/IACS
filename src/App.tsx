import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Inbox, Settings2, ChevronDown, Bell, Users, LogOut, ShieldAlert, MessageSquarePlus, BrainCircuit, Mail, Upload, Menu, GitBranch, Layers, AlertTriangle, Trash2 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import InitiativeForm from './pages/InitiativeForm';
import ApprovalBoard from './pages/ApprovalBoard';
import InitiativeDetail from './pages/InitiativeDetail';
import AdminFields from './pages/AdminFields';
import AdminPDFTemplate from './pages/AdminPDFTemplate';
import ConfigFields from './pages/ConfigFields';
import AgentBoard from './pages/AgentBoard';
import UserManagement from './pages/UserManagement';
import VPManagement from './pages/VPManagement';
import Login from './pages/Login';
import AITraining from './pages/AITraining';
import EmailLogs from './pages/EmailLogs';
import BulkUpload from './pages/BulkUpload';
import StateFlow from './pages/StateFlow';
import C4Architecture from './pages/C4Architecture';
import MaintenanceScreen from './components/MaintenanceScreen';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';

const ADMIN_PATHS = ['/admin', '/admin/agentes', '/admin/usuarios', '/admin/estructura', '/admin/ia-training', '/admin/correos', '/admin/cargas-masivas', '/admin/flujo-estados', '/admin/arquitectura', '/admin/pdf-template'];

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showNavConfirmModal, setShowNavConfirmModal] = useState(false);
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return window.location.pathname === '/bandeja';
  });
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
    if (location.pathname === '/bandeja') {
      setSidebarCollapsed(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (profile?.id) {
      const fetchDrafts = async () => {
        const { data } = await supabase
          .from('initiatives')
          .select('id, form_data, created_at, updated_at, user_id')
          .eq('status', 'Borrador')
          .order('updated_at', { ascending: false, nullsFirst: false });
        if (data) {
          // Filter by user_id (new drafts) OR by registrador name (legacy drafts without user_id)
          const myDrafts = data.filter(d =>
            d.user_id === profile.id ||
            (!d.user_id && d.form_data?.registrador === profile.name)
          );
          setDrafts(myDrafts);
        }
      };
      fetchDrafts();

      const channel = supabase.channel('drafts_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'initiatives' }, fetchDrafts)
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [profile?.id, profile?.name, location.pathname]);

  const handleDeleteDraft = async (e: React.MouseEvent, draftId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraftToDelete(draftId);
  };

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    const draftId = draftToDelete;
    try {
      const { error } = await supabase
        .from('initiatives')
        .delete()
        .eq('id', draftId);
        
      if (error) {
        alert("Error al eliminar borrador: " + error.message);
      } else {
        setDrafts(prev => prev.filter(d => d.id !== draftId));
        if (location.pathname === `/nueva/${draftId}`) {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error("Delete draft error:", err);
      alert("Error de red al eliminar el borrador.");
    } finally {
      setDraftToDelete(null);
    }
  };

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
    ...(isRegistrador || isAdmin ? [{ name: 'Nueva necesidad', path: '/', icon: PlusCircle }] : []),
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Bandeja de Aprobación', path: '/bandeja', icon: Inbox },
  ];

  const adminGroups = [
    {
      name: 'Organización y Accesos',
      items: [
        { name: 'Estructura Organizativa', path: '/admin/estructura', icon: Settings2 },
        { name: 'Gestión de Usuarios', path: '/admin/usuarios', icon: ShieldAlert },
      ]
    },
    {
      name: 'Personalización de Datos',
      items: [
        { name: 'Flujo de Estados', path: '/admin/flujo-estados', icon: GitBranch },
        { name: 'Campos del Formulario', path: '/admin', icon: Settings2 },
        { name: 'Plantilla PDF', path: '/admin/pdf-template', icon: Layers },
        { name: 'Arquitectura C4', path: '/admin/arquitectura', icon: Layers },
      ]
    },
    {
      name: 'Centro de Agentes e IA',
      items: [
        { name: 'Tablero de Agentes', path: '/admin/agentes', icon: Users },
        { name: 'Entrenamiento IA', path: '/admin/ia-training', icon: BrainCircuit },
      ]
    },
    {
      name: 'Gestión de Datos',
      items: [
        { name: 'Cargas Masivas', path: '/admin/cargas-masivas', icon: Upload },
      ]
    },
    {
      name: 'Comunicaciones',
      items: [
        { name: 'Bandeja de Correos', path: '/admin/correos', icon: Mail },
      ]
    }
  ];

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    adminGroups.forEach(group => {
      const hasActiveChild = group.items.some(item => location.pathname === item.path);
      initial[group.name] = hasActiveChild;
    });
    return initial;
  });

  useEffect(() => {
    adminGroups.forEach(group => {
      const hasActiveChild = group.items.some(item => location.pathname === item.path);
      if (hasActiveChild) {
        setExpandedGroups(prev => ({ ...prev, [group.name]: true }));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const userName = profile?.name || 'Usuario';
  const roleNamesMap: Record<string, string> = {
    'registrador': 'Key user',
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#F0F4FF] text-[#1E293B] font-sans">
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

      {/* Header at the top (100% width) */}
      <header className="corp-header shrink-0 shadow-[0_2px_12px_rgba(13,67,108,.05)] relative z-[60]">
        <div className="corp-header-bg" />
        <div className="h-16 flex items-center justify-between px-8 relative z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              title="Colapsar / Desplegar menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">Laureate Perú</span>
              <span className="text-xs text-white/30">|</span>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-white/90">IT Needs Manager</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-50">
            {showDraftsCounter && (
              <div className="relative z-50">
                <button 
                  onClick={() => {
                    setDraftsOpen(!draftsOpen);
                    setNotificationsOpen(false);
                  }}
                  className="relative w-9 h-9 rounded-lg border border-white/20 flex items-center justify-center text-white/90 hover:bg-white/10 transition-colors"
                  title="Chats pendientes"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  {drafts.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#EB5F46] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                      {drafts.length}
                    </span>
                  )}
                </button>

                {draftsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDraftsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-[#e4e6ea] z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#e4e6ea] bg-[#f7f8fc]">
                        <h3 className="text-xs font-bold text-[#1a1a2e] uppercase tracking-wider">Chats en curso</h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {drafts.length === 0 ? (
                          <p className="text-xs text-[#9ca3af] text-center py-4">No hay chats pendientes.</p>
                        ) : (
                          drafts.map(d => (
                            <div
                              key={d.id}
                              className="group flex items-center justify-between p-2 rounded-lg hover:bg-[#f7f8fc] transition-colors border border-transparent hover:border-[#e4e6ea] mb-1"
                            >
                              <Link
                                to={d.form_data?.selectedPath === 'unstructured' ? `/iniciativa/${d.id}` : `/nueva/${d.id}`}
                                onClick={() => setDraftsOpen(false)}
                                className="flex-1 min-w-0 pr-2"
                              >
                                <p className="text-sm font-semibold text-[#1a1a2e] truncate" title={d.form_data?.titulo || "Sin título"}>
                                  {d.form_data?.titulo || "Sin título"}
                                </p>
                                <p className="text-[10px] text-[#9ca3af] mt-0.5">
                                  {new Date(d.updated_at || d.created_at).toLocaleDateString()} {new Date(d.updated_at || d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteDraft(e, d.id)}
                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors shrink-0"
                                title="Eliminar borrador"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
                className="w-9 h-9 rounded-lg border border-white/20 flex items-center justify-center text-white/90 hover:bg-white/10 transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#EB5F46] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {unreadNotifs}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-[#e4e6ea] z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#e4e6ea] bg-[#f7f8fc]">
                      <h3 className="text-xs font-bold text-[#1a1a2e] uppercase tracking-wider">Notificaciones</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-[#9ca3af] text-center py-4">No tienes notificaciones.</p>
                      ) : (
                        notifications.map(n => (
                          <Link
                            key={n.id}
                            to={`/iniciativa/${n.initiative_id}`}
                            onClick={() => handleNotificationClick(n)}
                            className={`block p-3 rounded-lg transition-colors border border-transparent mb-1 ${n.read ? 'hover:bg-[#f7f8fc]' : 'bg-[#fff0ed] hover:border-[#D7D9E8]'}`}
                          >
                            <p className={`text-sm ${n.read ? 'text-[#4a5568]' : 'font-semibold text-[#1a1a2e]'} leading-tight`}>
                              {n.message}
                            </p>
                            <p className="text-[10px] text-[#9ca3af] mt-1.5">
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
             {(isRegistrador || isAdmin) && (
              <Link
                to="/nueva"
                onClick={(e) => {
                  if ((window as any).isInitiativeProcessInProgress) {
                    e.preventDefault();
                    setPendingNavPath("/nueva");
                    setShowNavConfirmModal(true);
                  }
                }}
                className="bg-white hover:bg-white/90 text-[#EB5F46] px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm hidden sm:flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Nueva necesidad
              </Link>
             )}
          </div>
        </div>
        {/* Color Line Divider */}
        <div className="h-1 w-full bg-gradient-to-r from-[#EB5F46] via-[#007FB1] to-[#00B8B2]" />
      </header>

      {/* Main body area with Sidebar and main content area */}
      <div className="flex-grow flex flex-row overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`bg-white border-r border-[#e4e6ea] shadow-[1px_0_4px_rgba(13,67,108,.03)] transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-0 -translate-x-full overflow-hidden opacity-0' : 'w-64 translate-x-0 opacity-100'
        } flex flex-col h-full shrink-0`}>

          {/* Main nav */}
          <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
            <p className="text-[10px] uppercase font-bold text-[#9ca3af] tracking-widest px-3 mb-2">Principal</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={(e) => {
                    if ((item.path === '/' || item.path === '/nueva') && (window as any).isInitiativeProcessInProgress) {
                      e.preventDefault();
                      setPendingNavPath(item.path);
                      setShowNavConfirmModal(true);
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    active
                      ? 'bg-[#fff0ed] text-[#EB5F46] shadow-sm'
                      : 'text-[#4a5568] hover:bg-[#f7f8fc] hover:text-[#1a1a2e]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#EB5F46]' : ''}`} />
                  {item.name}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="pt-4 pb-1">
              <div className="border-t border-[#e4e6ea]" />
            </div>

            {/* Admin collapsible */}
            {isAdmin && (
              <div>
                <button
                  onClick={toggleAdmin}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-[#9ca3af] hover:text-[#4a5568] hover:bg-[#f7f8fc]"
                >
                  <span className="text-[10px] uppercase tracking-widest font-bold">Administración</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className={`overflow-hidden transition-all duration-200 ease-in-out ${adminOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pt-1 pl-2 space-y-3 pb-2">
                    {adminGroups.map((group) => {
                      const isExpanded = !!expandedGroups[group.name];
                      return (
                        <div key={group.name} className="space-y-1">
                          <button
                            onClick={() => toggleGroup(group.name)}
                            className="w-full flex items-center justify-between text-[9px] uppercase font-bold text-[#9ca3af] tracking-wider px-3 py-1.5 mt-1 hover:text-[#1a1a2e] transition-colors"
                          >
                            <span>{group.name}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="space-y-1 pl-1 py-1">
                              {group.items.map((item) => {
                                const Icon = item.icon;
                                const active = location.pathname === item.path;
                                return (
                                  <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                                      active
                                        ? 'bg-[#fff0ed] text-[#EB5F46] shadow-sm'
                                        : 'text-[#4a5568] hover:bg-[#f7f8fc] hover:text-[#1a1a2e]'
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
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-[#e4e6ea]">
            <div className="flex items-center gap-3 px-1 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EB5F46] to-[#0D436C] flex items-center justify-center text-xs font-bold text-white shrink-0 uppercase shadow-md shadow-[#EB5F46]/10">
                {userInitials}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold text-[#1a1a2e] truncate">{userName}</p>
                {formattedRoles.length > 0 ? (
                  <button 
                    onClick={() => setShowRolesModal(true)}
                    className="text-[10px] text-[#EB5F46] hover:text-[#c94a32] truncate uppercase text-left w-full block mt-0.5"
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
                  <p className="text-[10px] text-[#9ca3af] truncate uppercase mt-0.5">Invitado</p>
                )}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* Main content page area */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
          <div className="p-4 md:p-8 flex-grow">
            {children}
          </div>
        </main>
      </div>

      {/* Custom Navigation Guard Modal */}
      {showNavConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-sm w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">¿Iniciar nueva necesidad?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ¿Estás seguro de que deseas iniciar una nueva necesidad? Se perderán todos los cambios no guardados en el proceso actual.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowNavConfirmModal(false);
                  setPendingNavPath(null);
                }}
                className="flex-grow px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNavConfirmModal(false);
                  (window as any).isInitiativeProcessInProgress = false;
                  if (pendingNavPath) {
                    navigate(pendingNavPath);
                  }
                }}
                className="flex-grow flex items-center justify-center gap-2 bg-[#EB5F46] hover:bg-[#c94a32] text-white px-4 py-2 text-xs font-semibold rounded-lg transition-colors shadow-md shadow-[#EB5F46]/10"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Draft Confirmation Modal */}
      {draftToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-sm w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">¿Eliminar borrador?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ¿Estás seguro de que deseas eliminar este borrador de forma permanente? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setDraftToDelete(null)}
                className="flex-grow px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteDraft}
                className="flex-grow flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-semibold rounded-lg transition-colors shadow-md shadow-red-600/10"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer at the bottom (100% width) */}
      <footer className="bg-[#22223C] text-slate-400 text-center py-4 px-8 text-xs font-semibold tracking-wider border-t border-slate-800 shrink-0 relative z-50">
        © {new Date().getFullYear()} <strong>Laureate Perú</strong>. Todos los derechos reservados.
      </footer>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('maintenance_mode').eq('id', 1).single();
      if (data) {
        setIsMaintenanceMode(data.maintenance_mode);
      }
      setMaintenanceLoading(false);
    };
    fetchSettings();

    const channel = supabase.channel('settings_channel')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: 'id=eq.1' }, (payload) => {
        setIsMaintenanceMode(payload.new.maintenance_mode);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading || maintenanceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4FF]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4F5AF5] border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = profile?.profile_roles?.some((r: any) => r.role === 'admin');
  if (isMaintenanceMode && !isAdmin) {
    return <MaintenanceScreen />;
  }

  return <Layout>{children}</Layout>;
}

function RegistradorRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  const isRegistrador = profile?.profile_roles?.some((r: any) => r.role === 'registrador');
  const isAdmin = profile?.profile_roles?.some((r: any) => r.role === 'admin');
  if (!isRegistrador && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const basename = (import.meta as any).env.BASE_URL || '/';
  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><RegistradorRoute><InitiativeForm /></RegistradorRoute></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/nueva" element={<ProtectedRoute><RegistradorRoute><InitiativeForm /></RegistradorRoute></ProtectedRoute>} />
          <Route path="/nueva/:id" element={<ProtectedRoute><RegistradorRoute><InitiativeForm /></RegistradorRoute></ProtectedRoute>} />
          <Route path="/bandeja" element={<ProtectedRoute><ApprovalBoard /></ProtectedRoute>} />
          <Route path="/iniciativa/:id" element={<ProtectedRoute><InitiativeDetail /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminFields /></ProtectedRoute>} />
          <Route path="/admin/pdf-template" element={<ProtectedRoute><AdminPDFTemplate /></ProtectedRoute>} />
          <Route path="/admin/estructura" element={<ProtectedRoute><VPManagement /></ProtectedRoute>} />
          <Route path="/admin/agentes" element={<ProtectedRoute><AgentBoard /></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/ia-training" element={<ProtectedRoute><AITraining /></ProtectedRoute>} />
          <Route path="/admin/correos" element={<ProtectedRoute><EmailLogs /></ProtectedRoute>} />
          <Route path="/admin/cargas-masivas" element={<ProtectedRoute><BulkUpload /></ProtectedRoute>} />
          <Route path="/admin/flujo-estados" element={<ProtectedRoute><StateFlow /></ProtectedRoute>} />
          <Route path="/admin/arquitectura" element={<ProtectedRoute><C4Architecture /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
