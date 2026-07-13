import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Trash2, Mail, Building, Shield, UserCog, Briefcase, Pencil, X, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserRoleWhitelist {
  id?: string;
  role: string;
  vp_id: string;
  direcciones_ids: string[];
  vps?: { name: string };
}

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  user_roles_whitelist?: UserRoleWhitelist[];
}

interface VP {
  id: string;
  name: string;
}

interface Direccion {
  id: string;
  name: string;
  vp_id: string;
}

const ROLES_DISPONIBLES = [
  { value: 'registrador', label: 'Key user' },
  { value: 'bp_ti', label: 'Business Partner (BP)' },
  { value: 'invitado', label: 'Invitado (Solo lectura)' }
];

export default function UserManagement() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [vps, setVps] = useState<VP[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVPs, setSelectedVPs] = useState<string[]>([]);
  const [selectedDirs, setSelectedDirs] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedActivation, setSelectedActivation] = useState<'all' | 'active' | 'pending'>('all');

  // Estados de dropdowns
  const [vpDropdownOpen, setVpDropdownOpen] = useState(false);
  const [dirDropdownOpen, setDirDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [activationDropdownOpen, setActivationDropdownOpen] = useState(false);
  
  // Asignaciones colapsables
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  
  // Set de correos activados
  const [activatedEmails, setActivatedEmails] = useState<Set<string>>(new Set());

  // Formulario manual
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [assignments, setAssignments] = useState<UserRoleWhitelist[]>([{ role: 'registrador', vp_id: '', direcciones_ids: [] }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Estado de presencia online en tiempo real
  const [onlineEmails, setOnlineEmails] = useState<Set<string>>(new Set());
  const [selectedConnection, setSelectedConnection] = useState<'all' | 'online' | 'offline'>('all');
  const [connectionDropdownOpen, setConnectionDropdownOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const existingChannel = supabase.getChannels().find(c => c.topic === 'realtime:online-users');
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase.channel('online-users');

    const handleSync = () => {
      const state = channel.presenceState();
      const emails = new Set<string>();
      Object.keys(state).forEach((key) => {
        emails.add(key.toLowerCase().trim());
      });
      Object.values(state).forEach((presences: any) => {
        presences.forEach((p: any) => {
          if (p.email) {
            emails.add(p.email.toLowerCase().trim());
          }
        });
      });
      setOnlineEmails(emails);
    };

    channel
      .on('presence', { event: 'sync' }, handleSync)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [usersRes, profilesRes, vpsRes, dirRes] = await Promise.all([
      supabase.from('allowed_users').select('*, user_roles_whitelist(*, vps(name))').order('created_at', { ascending: false }),
      supabase.from('profiles').select('email'),
      supabase.from('vps').select('id, name').order('name'),
      supabase.from('direcciones').select('id, name, vp_id').order('name')
    ]);
      
    if (usersRes.data) setUsers(usersRes.data);
    if (profilesRes.data) {
      const activeEmailsSet = new Set(profilesRes.data.map(p => p.email?.toLowerCase().trim()).filter(Boolean));
      setActivatedEmails(activeEmailsSet);
    }
    if (vpsRes.data) setVps(vpsRes.data);
    if (dirRes.data) setDirecciones(dirRes.data);
    setLoading(false);
  };

  const handleAddAssignment = () => {
    setAssignments([...assignments, { role: 'registrador', vp_id: '', direcciones_ids: [] }]);
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const updateAssignment = (index: number, field: keyof UserRoleWhitelist, value: any) => {
    const newAssig = [...assignments];
    newAssig[index] = { ...newAssig[index], [field]: value };
    if (field === 'vp_id') {
      newAssig[index].direcciones_ids = [];
    }
    setAssignments(newAssig);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName || assignments.length === 0) return;
    
    if (assignments.some(a => !a.role || !a.vp_id || a.direcciones_ids.length === 0)) {
      alert('Por favor completa todos los campos en cada asignación de rol.');
      return;
    }

    setSaving(true);

    try {
      let userId = editingId;
      if (!userId) {
        const { data: userData, error: userError } = await supabase
          .from('allowed_users')
          .insert([{ email: newEmail.trim(), name: newName.trim() }])
          .select()
          .single();
        if (userError) throw userError;
        userId = userData.id;
      } else {
        const { error: userError } = await supabase
          .from('allowed_users')
          .update({ name: newName.trim() })
          .eq('id', userId);
        if (userError) throw userError;
      }

      await supabase.from('user_roles_whitelist').delete().eq('allowed_user_id', userId);

      const rolesToInsert = assignments.map(a => ({
        allowed_user_id: userId,
        role: a.role,
        vp_id: a.vp_id,
        direcciones_ids: a.direcciones_ids
      }));

      const { error: rolesError } = await supabase.from('user_roles_whitelist').insert(rolesToInsert);
      if (rolesError) throw rolesError;

      // Sync with profiles table if the user has already registered
      const { data: profileData } = await supabase.from('profiles').select('id').eq('email', newEmail.trim()).single();
      if (profileData) {
        await supabase.from('profiles').update({ name: newName.trim() }).eq('id', profileData.id);
        await supabase.from('profile_roles').delete().eq('profile_id', profileData.id);
        
        const profileRolesToInsert = assignments.map(a => ({
          profile_id: profileData.id,
          role: a.role,
          vp_id: a.vp_id,
          direcciones_ids: a.direcciones_ids
        }));
        await supabase.from('profile_roles').insert(profileRolesToInsert);
      }

      fetchData();
      
      setNewEmail('');
      setNewName('');
      setAssignments([{ role: 'registrador', vp_id: '', direcciones_ids: [] }]);
      setEditingId(null);
    } catch (err: any) {
      alert('Error al guardar: ' + (err.message || 'Correo duplicado'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: AllowedUser) => {
    setEditingId(user.id);
    setNewEmail(user.email);
    setNewName(user.name);
    setAssignments(user.user_roles_whitelist?.length ? user.user_roles_whitelist.map(r => ({
      role: r.role,
      vp_id: r.vp_id,
      direcciones_ids: r.direcciones_ids
    })) : [{ role: 'registrador', vp_id: '', direcciones_ids: [] }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este acceso completamente?')) return;
    const { error } = await supabase.from('allowed_users').delete().eq('id', id);
    if (!error) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'admin': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">ADMIN</span>;
      case 'bp_ti': return <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">BP TI</span>;
      case 'invitado': return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">INVITADO</span>;
      default: return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">KEY USER</span>;
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    const hasAssignments = user.user_roles_whitelist && user.user_roles_whitelist.length > 0;

    if (selectedVPs.length > 0) {
      if (!hasAssignments) return false;
      const matchesVP = user.user_roles_whitelist.some(r => r.vp_id && selectedVPs.includes(r.vp_id));
      if (!matchesVP) return false;
    }

    if (selectedDirs.length > 0) {
      if (!hasAssignments) return false;
      const matchesDir = user.user_roles_whitelist.some(r => 
        r.direcciones_ids && r.direcciones_ids.some(id => selectedDirs.includes(id))
      );
      if (!matchesDir) return false;
    }

    if (selectedRoles.length > 0) {
      if (!hasAssignments) return false;
      const matchesRole = user.user_roles_whitelist.some(r => selectedRoles.includes(r.role));
      if (!matchesRole) return false;
    }

    if (selectedActivation !== 'all') {
      const isActivated = activatedEmails.has(user.email.toLowerCase().trim());
      if (selectedActivation === 'active' && !isActivated) return false;
      if (selectedActivation === 'pending' && isActivated) return false;
    }

    if (selectedConnection !== 'all') {
      const isOnline = onlineEmails.has(user.email.toLowerCase().trim());
      if (selectedConnection === 'online' && !isOnline) return false;
      if (selectedConnection === 'offline' && isOnline) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-3">
            <Users className="w-7 h-7 text-[#4F5AF5]" />
            Gestión de Accesos y Roles Multi-Asignación
          </h1>
          <p className="text-[#64748B] mt-1 text-sm">
            Un usuario puede tener diferentes roles dependiendo de la Vicepresidencia y Dirección.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Formulario Manual */}
        <div className="space-y-6 xl:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
            <h2 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
              {editingId ? <Pencil className="w-5 h-5 text-[#4F5AF5]" /> : <Plus className="w-5 h-5 text-[#4F5AF5]" />}
              {editingId ? 'Editar Usuario' : 'Agregar Usuario (Manual)'}
            </h2>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Nombre Completo</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" placeholder="Ej: Maria Lopez" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Correo Electrónico</label>
                <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} disabled={!!editingId} className={`w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="maria@empresa.com" />
              </div>
              
              <div className="border-t border-[#E2E8F0] pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#1E293B]">Asignaciones de Rol</h3>
                  <button type="button" onClick={handleAddAssignment} className="text-xs font-bold text-[#4F5AF5] hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Añadir Bloque
                  </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {assignments.map((assig, index) => {
                    const availableDirecciones = direcciones.filter(d => d.vp_id === assig.vp_id);
                    return (
                      <div key={index} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl relative">
                        {assignments.length > 1 && (
                          <button type="button" onClick={() => handleRemoveAssignment(index)} className="absolute top-2 right-2 text-[#94A3B8] hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Rol</label>
                            <select required value={assig.role} onChange={e => updateAssignment(index, 'role', e.target.value)} className="w-full px-2 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                              {ROLES_DISPONIBLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Vicepresidencia</label>
                            <select required value={assig.vp_id} onChange={e => updateAssignment(index, 'vp_id', e.target.value)} className="w-full px-2 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                              <option value="">Selecciona VP</option>
                              {vps.map(vp => <option key={vp.id} value={vp.id}>{vp.name}</option>)}
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Dirección(es)</label>
                              {assig.vp_id && availableDirecciones.length > 0 && (
                                <button type="button" onClick={() => {
                                  if (assig.direcciones_ids.length === availableDirecciones.length) updateAssignment(index, 'direcciones_ids', []);
                                  else updateAssignment(index, 'direcciones_ids', availableDirecciones.map(d => d.id));
                                }} className="text-[10px] text-[#4F5AF5] font-bold hover:underline">
                                  {assig.direcciones_ids.length === availableDirecciones.length ? 'Desmarcar' : 'Marcar todas'}
                                </button>
                              )}
                            </div>
                            <div className={`w-full px-2 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs max-h-32 overflow-y-auto ${!assig.vp_id ? 'opacity-50 pointer-events-none' : ''}`}>
                              {!assig.vp_id ? <p className="text-slate-400 p-1">Selecciona VP</p> : (
                                <div className="space-y-2 py-1">
                                  {availableDirecciones.map(dir => (
                                    <label key={dir.id} className="flex items-start gap-2 cursor-pointer group">
                                      <input type="checkbox" checked={assig.direcciones_ids.includes(dir.id)} onChange={(e) => {
                                        if (e.target.checked) updateAssignment(index, 'direcciones_ids', [...assig.direcciones_ids, dir.id]);
                                        else updateAssignment(index, 'direcciones_ids', assig.direcciones_ids.filter(id => id !== dir.id));
                                      }} className="mt-0.5 rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5]" />
                                      <span className="text-[#1E293B] group-hover:text-[#4F5AF5] transition-colors">{dir.name}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-2 border-t border-[#E2E8F0]">
                {editingId && (
                  <button type="button" onClick={() => {
                    setEditingId(null); setNewEmail(''); setNewName(''); setAssignments([{ role: 'registrador', vp_id: '', direcciones_ids: [] }]);
                  }} className="flex-1 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] font-bold py-2 rounded-xl text-sm transition-colors">
                    Cancelar
                  </button>
                )}
                <button disabled={saving} type="submit" className="flex-[2] bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:opacity-50 text-white font-bold py-2 rounded-xl text-sm transition-colors">
                  {saving ? 'Guardando...' : (editingId ? 'Actualizar Usuario' : 'Guardar Usuario')}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Columna Derecha: Tabla de Usuarios */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col h-[800px]">
          <div className="p-6 border-b border-[#E2E8F0] flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#F8FAFC]">
            <h2 className="text-lg font-bold text-[#1E293B] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#64748B]" /> Lista Blanca Activa
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar usuario o correo..." 
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs outline-none focus:border-[#4F5AF5]" 
                />
              </div>

              {(selectedVPs.length > 0 || selectedDirs.length > 0 || selectedRoles.length > 0 || selectedActivation !== 'all' || selectedConnection !== 'all' || searchQuery !== '') && (
                <button 
                  onClick={() => {
                    setSelectedVPs([]);
                    setSelectedDirs([]);
                    setSelectedRoles([]);
                    setSelectedActivation('all');
                    setSelectedConnection('all');
                    setSearchQuery('');
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors shrink-0 text-center"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Filtros multiselectores */}
          <div className="px-6 py-3 border-b border-[#E2E8F0] bg-white flex flex-wrap gap-2 relative z-30">
            {/* Dropdown VP */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => {
                  setVpDropdownOpen(!vpDropdownOpen);
                  setDirDropdownOpen(false);
                  setRoleDropdownOpen(false);
                  setActivationDropdownOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedVPs.length > 0 ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                <span>VP {selectedVPs.length > 0 ? `(${selectedVPs.length})` : ''}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {vpDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setVpDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 p-2.5 max-h-60 overflow-y-auto">
                    <div className="space-y-1.5">
                      {vps.length === 0 ? <p className="text-[10px] text-slate-400 italic">No hay VPs</p> : vps.map(vp => (
                        <label key={vp.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50 text-xs text-[#1E293B]">
                          <input 
                            type="checkbox"
                            checked={selectedVPs.includes(vp.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedVPs([...selectedVPs, vp.id]);
                              else setSelectedVPs(selectedVPs.filter(id => id !== vp.id));
                            }}
                            className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-3.5 h-3.5"
                          />
                          <span>{vp.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dropdown Dirección */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => {
                  setDirDropdownOpen(!dirDropdownOpen);
                  setVpDropdownOpen(false);
                  setRoleDropdownOpen(false);
                  setActivationDropdownOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedDirs.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                <span>Dirección {selectedDirs.length > 0 ? `(${selectedDirs.length})` : ''}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {dirDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDirDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 p-2.5 max-h-60 overflow-y-auto">
                    <div className="space-y-1.5">
                      {direcciones.filter(d => selectedVPs.length === 0 || selectedVPs.includes(d.vp_id)).length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">No hay direcciones disponibles</p>
                      ) : direcciones.filter(d => selectedVPs.length === 0 || selectedVPs.includes(d.vp_id)).map(dir => {
                        const vpName = vps.find(v => v.id === dir.vp_id)?.name || '';
                        return (
                          <label key={dir.id} className="flex items-start gap-2 cursor-pointer p-1 rounded hover:bg-slate-50 text-xs text-[#1E293B]">
                            <input 
                              type="checkbox"
                              checked={selectedDirs.includes(dir.id)}
                              onChange={e => {
                                if (e.target.checked) setSelectedDirs([...selectedDirs, dir.id]);
                                  else setSelectedDirs(selectedDirs.filter(id => id !== dir.id));
                              }}
                              className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-3.5 h-3.5 mt-0.5"
                            />
                            <div className="flex flex-col">
                              <span>{dir.name}</span>
                              {selectedVPs.length === 0 && <span className="text-[9px] text-[#94A3B8] font-semibold">{vpName}</span>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dropdown Rol */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => {
                  setRoleDropdownOpen(!roleDropdownOpen);
                  setVpDropdownOpen(false);
                  setDirDropdownOpen(false);
                  setActivationDropdownOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedRoles.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                <span>Rol {selectedRoles.length > 0 ? `(${selectedRoles.length})` : ''}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {roleDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 p-2.5 max-h-60 overflow-y-auto">
                    <div className="space-y-1.5">
                      {ROLES_DISPONIBLES.map(r => (
                        <label key={r.value} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50 text-xs text-[#1E293B]">
                          <input 
                            type="checkbox"
                            checked={selectedRoles.includes(r.value)}
                            onChange={e => {
                              if (e.target.checked) setSelectedRoles([...selectedRoles, r.value]);
                              else setSelectedRoles(selectedRoles.filter(val => val !== r.value));
                            }}
                            className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-3.5 h-3.5"
                          />
                          <span>{r.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dropdown Activación */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => {
                  setActivationDropdownOpen(!activationDropdownOpen);
                  setVpDropdownOpen(false);
                  setDirDropdownOpen(false);
                  setRoleDropdownOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedActivation !== 'all' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                <span>Activación: {selectedActivation === 'all' ? 'Todos' : selectedActivation === 'active' ? 'Activos' : 'Pendientes'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {activationDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActivationDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 p-2">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => { setSelectedActivation('all'); setActivationDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors hover:bg-slate-50 ${selectedActivation === 'all' ? 'font-bold text-[#4F5AF5]' : 'text-[#1E293B]'}`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedActivation('active'); setActivationDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors hover:bg-slate-50 ${selectedActivation === 'active' ? 'font-bold text-[#4F5AF5]' : 'text-[#1E293B]'}`}
                      >
                        Activos (Cuenta activada)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedActivation('pending'); setActivationDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors hover:bg-slate-50 ${selectedActivation === 'pending' ? 'font-bold text-[#4F5AF5]' : 'text-[#1E293B]'}`}
                      >
                        Pendientes (No activada)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dropdown Conexión */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => {
                  setConnectionDropdownOpen(!connectionDropdownOpen);
                  setActivationDropdownOpen(false);
                  setVpDropdownOpen(false);
                  setDirDropdownOpen(false);
                  setRoleDropdownOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedConnection !== 'all' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                <span>Conexión: {selectedConnection === 'all' ? 'Todos' : selectedConnection === 'online' ? 'Online' : 'Offline'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {connectionDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setConnectionDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 p-2">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => { setSelectedConnection('all'); setConnectionDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors hover:bg-slate-50 ${selectedConnection === 'all' ? 'font-bold text-[#4F5AF5]' : 'text-[#1E293B]'}`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedConnection('online'); setConnectionDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors hover:bg-slate-50 ${selectedConnection === 'online' ? 'font-bold text-[#4F5AF5]' : 'text-[#1E293B]'}`}
                      >
                        Online (Conectados)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedConnection('offline'); setConnectionDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors hover:bg-slate-50 ${selectedConnection === 'offline' ? 'font-bold text-[#4F5AF5]' : 'text-[#1E293B]'}`}
                      >
                        Offline (Desconectados)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-0">
            {loading ? (
              <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#4F5AF5] border-t-transparent"></div></div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#94A3B8] p-6 text-center">
                <Users className="w-12 h-12 mb-3 text-[#E2E8F0]" />
                <p className="font-medium text-[#64748B]">Lista vacía</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 border-b border-[#E2E8F0] shadow-sm z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">Asignaciones (Rol, VP y Direcciones)</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs shrink-0">
                            {user.name.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-[#1E293B]">{user.name}</p>
                              {activatedEmails.has(user.email.toLowerCase().trim()) ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                  Pendiente
                                </span>
                              )}
                              {onlineEmails.has(user.email.toLowerCase().trim()) ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-green-50 text-green-700 border border-green-200 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-400 border border-slate-200 shrink-0">
                                  Offline
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#64748B] flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-2">
                          {user.user_roles_whitelist?.length === 0 ? (
                             <span className="text-xs text-red-500 italic">Sin roles asignados</span>
                          ) : (
                            <>
                              {user.user_roles_whitelist
                                ?.slice(0, expandedUsers[user.id] ? undefined : 2)
                                .map((r, idx) => (
                                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                      {getRoleBadge(r.role)}
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white text-slate-700 border border-slate-200">
                                        <Building className="w-2.5 h-2.5" /> {r.vps?.name || 'Sin VP'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 pl-1 border-l-2 border-slate-200 ml-1">
                                      {(() => {
                                        const userDirIds = r.direcciones_ids || [];
                                        const allDirsForVp = direcciones.filter(d => d.vp_id === r.vp_id);
                                        if (userDirIds.length === 0) return <span className="text-[10px] text-slate-400">Ninguna dirección</span>;
                                        if (allDirsForVp.length > 0 && userDirIds.length === allDirsForVp.length) {
                                          return <span className="text-[10px] text-[#4F5AF5] font-semibold flex items-center gap-1"><Briefcase className="w-2.5 h-2.5" /> Todas las Direcciones ({userDirIds.length})</span>;
                                        }
                                        return userDirIds.map(id => {
                                          const dName = direcciones.find(d => d.id === id)?.name || 'Desconocida';
                                          return <span key={id} className="text-[10px] text-[#64748B] flex items-center gap-1"><Briefcase className="w-2.5 h-2.5 text-slate-300" /> {dName}</span>;
                                        });
                                      })()}
                                    </div>
                                  </div>
                                ))}
                              {user.user_roles_whitelist && user.user_roles_whitelist.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedUsers(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                                  className="text-[11px] text-[#4F5AF5] hover:text-[#3F49E0] font-semibold transition-colors flex items-center gap-1 mt-1 cursor-pointer"
                                >
                                  {expandedUsers[user.id] ? 'Ver menos asignaciones' : `Ver ${user.user_roles_whitelist.length - 2} asignaciones más...`}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(user)} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(user.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* LEYENDA DE ROLES */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 shadow-sm mt-6">
        <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Niveles de Acceso y Funciones por Rol
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-blue-50 shadow-sm">
             <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold mb-2 inline-block">ADMIN</span>
             <ul className="text-xs text-[#64748B] leading-relaxed list-disc pl-4 space-y-1">
               <li>Control total de la plataforma.</li>
               <li>Configuración de formularios.</li>
               <li>Estructura organizacional y roles.</li>
               <li>Métricas globales.</li>
             </ul>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-50 shadow-sm">
             <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold mb-2 inline-block">BP TI</span>
             <ul className="text-xs text-[#64748B] leading-relaxed list-disc pl-4 space-y-1">
               <li>Aprobador (Business Partner).</li>
               <li>Edita iniciativas y sugerencias.</li>
               <li>Decide aprobar u observar.</li>
               <li>Gestión de Track Changes.</li>
             </ul>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-50 shadow-sm">
             <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold mb-2 inline-block">KEY USER</span>
             <ul className="text-xs text-[#64748B] leading-relaxed list-disc pl-4 space-y-1">
               <li>Crea iniciativas con IA.</li>
               <li>Gestiona iniciativas observadas.</li>
               <li>Acepta o rechaza cambios del BP.</li>
             </ul>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-50 shadow-sm">
             <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold mb-2 inline-block">INVITADO</span>
             <ul className="text-xs text-[#64748B] leading-relaxed list-disc pl-4 space-y-1">
               <li>Acceso de solo lectura.</li>
               <li>Métricas de visualización.</li>
               <li>Acceso a iniciativas finalizadas de su VP.</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
