import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Trash2, Mail, Building, Shield, UserCog, 
  Briefcase, Pencil, X, ChevronDown, Lock, Sparkles, Check, 
  AlertTriangle, Tag, Palette, Loader2, RefreshCw, Power,
  Copy, UserCheck, Eye, CheckCircle2, Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface AppRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  user_count?: number;
}

interface UserRoleWhitelist {
  id?: string;
  role: string;
  vp_id: string;
  direcciones_ids: string[];
  is_transversal?: boolean;
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

const ROLES_DISPONIBLES_FALLBACK = [
  { value: 'registrador', label: 'Key user', color: 'emerald' },
  { value: 'bp_ti', label: 'Business Partner (BP)', color: 'indigo' },
  { value: 'invitado', label: 'Invitado (Solo lectura)', color: 'slate' }
];

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; label: string; swatch: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', label: 'Índigo', swatch: '#6366F1' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Azul', swatch: '#3B82F6' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Esmeralda', swatch: '#10B981' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', label: 'Violeta', swatch: '#8B5CF6' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Ámbar', swatch: '#F59E0B' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', label: 'Rosa', swatch: '#F43F5E' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500', label: 'Cian', swatch: '#06B6D4' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500', label: 'Pizarra', swatch: '#64748B' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Rojo', swatch: '#EF4444' },
};

const toCleanSlug = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remueve acentos y tildes (á->a, é->e, í->i, etc.)
    .toLowerCase()
    .replace(/[\s\/-]+/g, '_') // Reemplaza espacios y barras por guión bajo
    .replace(/[^a-z0-9_]/g, '') // Remueve caracteres no alfanuméricos
    .replace(/_+/g, '_'); // Evita guiones bajos repetidos
};

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [vps, setVps] = useState<VP[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [loading, setLoading] = useState(true);

  // Catálogo de Roles Dinámicos
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleForm, setRoleForm] = useState({
    code: '',
    name: '',
    description: '',
    color: 'indigo',
    is_active: true,
  });

  const [roleFilterType, setRoleFilterType] = useState<'all' | 'system' | 'custom' | 'active'>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleCopySlug = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSlug(code);
    setTimeout(() => setCopiedSlug(null), 1800);
  };

  const getRoleIcon = (code: string, isSystem: boolean) => {
    switch (code) {
      case 'admin':
        return <Shield className="w-5 h-5 text-red-600" />;
      case 'bp_ti':
        return <Briefcase className="w-5 h-5 text-indigo-600" />;
      case 'registrador':
        return <UserCheck className="w-5 h-5 text-emerald-600" />;
      case 'invitado':
        return <Eye className="w-5 h-5 text-slate-600" />;
      default:
        return isSystem ? <Lock className="w-5 h-5 text-slate-600" /> : <Sparkles className="w-5 h-5 text-violet-600" />;
    }
  };

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVPs, setSelectedVPs] = useState<string[]>([]);
  const [selectedDirs, setSelectedDirs] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedActivation, setSelectedActivation] = useState<'all' | 'active' | 'pending'>('all');
  const [selectedTransversal, setSelectedTransversal] = useState<'all' | 'transversal' | 'specific'>('all');

  // Estados de dropdowns
  const [vpDropdownOpen, setVpDropdownOpen] = useState(false);
  const [dirDropdownOpen, setDirDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [activationDropdownOpen, setActivationDropdownOpen] = useState(false);
  const [transversalDropdownOpen, setTransversalDropdownOpen] = useState(false);
  
  // Asignaciones colapsables
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  
  // Set de correos activados
  const [activatedEmails, setActivatedEmails] = useState<Set<string>>(new Set());

  // Formulario manual
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [assignments, setAssignments] = useState<UserRoleWhitelist[]>([{ role: 'registrador', vp_id: '', direcciones_ids: [], is_transversal: false }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Estado de presencia online en tiempo real
  const [onlineEmails, setOnlineEmails] = useState<Set<string>>(new Set());
  const [selectedConnection, setSelectedConnection] = useState<'all' | 'online' | 'offline'>('all');
  const [connectionDropdownOpen, setConnectionDropdownOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRoles(data);
          return;
        }
      }
      // Fallback a Supabase si el backend en Render está en reposo
      const { data: sbRoles } = await supabase
        .from('app_roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });
      if (sbRoles) {
        setRoles(sbRoles);
      }
    } catch (err) {
      console.error('Error al cargar roles:', err);
      const { data: sbRoles } = await supabase
        .from('app_roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });
      if (sbRoles) {
        setRoles(sbRoles);
      }
    } finally {
      setRolesLoading(false);
    }
  };

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleForm({
      code: '',
      name: '',
      description: '',
      color: 'indigo',
      is_active: true,
    });
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: AppRole) => {
    setEditingRole(role);
    setRoleForm({
      code: role.code,
      name: role.name,
      description: role.description || '',
      color: role.color || 'indigo',
      is_active: role.is_active,
    });
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = toCleanSlug(roleForm.code).replace(/^_+|_+$/g, '');
    const cleanName = roleForm.name.trim();

    if (!cleanName || (!editingRole && !cleanCode)) {
      alert('Por favor completa el nombre y el código técnico del rol.');
      return;
    }

    setRoleSaving(true);
    try {
      if (editingRole) {
        const res = await fetch(`/api/roles/${editingRole.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            description: roleForm.description.trim() || null,
            color: roleForm.color,
            is_active: roleForm.is_active,
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          // Fallback a Supabase si el backend en la nube falla
          if (res.status >= 500 || !res.status) {
            const { error: sbErr } = await supabase
              .from('app_roles')
              .update({
                name: cleanName,
                description: roleForm.description.trim() || null,
                color: roleForm.color,
                is_active: roleForm.is_active,
                updated_at: new Date().toISOString(),
              })
              .eq('id', editingRole.id);
            if (sbErr) throw sbErr;
          } else {
            throw new Error(json.error || 'Error al actualizar rol');
          }
        }
      } else {
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: cleanCode,
            name: cleanName,
            description: roleForm.description.trim() || null,
            color: roleForm.color,
            is_active: roleForm.is_active,
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          // Fallback a Supabase si el backend en la nube falla
          if (res.status >= 500 || !res.status) {
            const { error: sbErr } = await supabase
              .from('app_roles')
              .insert([{
                code: cleanCode,
                name: cleanName,
                description: roleForm.description.trim() || null,
                color: roleForm.color,
                is_active: roleForm.is_active,
                is_system: false,
              }]);
            if (sbErr) throw sbErr;
          } else {
            throw new Error(json.error || 'Error al crear rol');
          }
        }
      }

      await fetchRoles();
      setRoleModalOpen(false);
      setEditingRole(null);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'No se pudo guardar el rol.'));
    } finally {
      setRoleSaving(false);
    }
  };

  const handleDeleteRole = async (role: AppRole) => {
    if (role.is_system) {
      alert('Los roles base del sistema están protegidos y no pueden ser eliminados.');
      return;
    }
    if ((role.user_count || 0) > 0) {
      alert(`No es posible eliminar el rol "${role.name}" porque tiene ${role.user_count} usuario(s) asignado(s). Reasigna a los usuarios antes de eliminarlo.`);
      return;
    }
    if (!confirm(`¿Confirmas la eliminación permanente del rol "${role.name}" (${role.code})? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status >= 500 || !res.status) {
          const { error: sbErr } = await supabase.from('app_roles').delete().eq('id', role.id);
          if (sbErr) throw sbErr;
        } else {
          throw new Error(json.error || 'Error al eliminar rol');
        }
      }
      await fetchRoles();
    } catch (err: any) {
      alert('Error al eliminar rol: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleToggleRoleStatus = async (role: AppRole) => {
    if (role.code === 'admin' && role.is_active) {
      alert('El rol Administrador debe permanecer siempre activo.');
      return;
    }

    const nextState = !role.is_active;
    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextState }),
      });
      if (!res.ok) {
        await supabase.from('app_roles').update({ is_active: nextState }).eq('id', role.id);
      }
      await fetchRoles();
    } catch (err: any) {
      alert('Error al cambiar estado del rol: ' + (err.message || ''));
    }
  };

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
    setAssignments([...assignments, { role: 'registrador', vp_id: '', direcciones_ids: [], is_transversal: false }]);
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const updateAssignment = (index: number, field: keyof UserRoleWhitelist, value: any) => {
    const newAssig = [...assignments];
    newAssig[index] = { ...newAssig[index], [field]: value };
    if (field === 'role' && value === 'admin') {
      newAssig[index].is_transversal = true;
      newAssig[index].vp_id = '';
      newAssig[index].direcciones_ids = [];
    }
    if (field === 'vp_id') {
      newAssig[index].direcciones_ids = [];
    }
    if (field === 'is_transversal' && value === true) {
      newAssig[index].vp_id = '';
      newAssig[index].direcciones_ids = [];
    }
    setAssignments(newAssig);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName || assignments.length === 0) return;
    
    if (assignments.some(a => !a.role || (!a.is_transversal && a.role !== 'admin' && (!a.vp_id || a.direcciones_ids.length === 0)))) {
      alert('Por favor completa la VP y Dirección(es) en cada asignación, o activa "Alcance Transversal".');
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

      const rolesToInsert = assignments.map(a => {
        const isTrans = !!a.is_transversal || a.role === 'admin';
        return {
          allowed_user_id: userId,
          role: a.role,
          vp_id: isTrans ? null : a.vp_id,
          direcciones_ids: isTrans ? [] : a.direcciones_ids,
          is_transversal: isTrans
        };
      });

      const { error: rolesError } = await supabase.from('user_roles_whitelist').insert(rolesToInsert);
      if (rolesError) throw rolesError;

      // Sync with profiles table if the user has already registered
      const { data: profileData } = await supabase.from('profiles').select('id').eq('email', newEmail.trim()).single();
      if (profileData) {
        await supabase.from('profiles').update({ name: newName.trim() }).eq('id', profileData.id);
        await supabase.from('profile_roles').delete().eq('profile_id', profileData.id);
        
        const profileRolesToInsert = assignments.map(a => {
          const isTrans = !!a.is_transversal || a.role === 'admin';
          return {
            profile_id: profileData.id,
            role: a.role,
            vp_id: isTrans ? null : a.vp_id,
            direcciones_ids: isTrans ? [] : a.direcciones_ids,
            is_transversal: isTrans
          };
        });
        await supabase.from('profile_roles').insert(profileRolesToInsert);
      }

      fetchData();
      
      setNewEmail('');
      setNewName('');
      setAssignments([{ role: 'registrador', vp_id: '', direcciones_ids: [], is_transversal: false }]);
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
      vp_id: r.vp_id || '',
      direcciones_ids: r.direcciones_ids || [],
      is_transversal: !!r.is_transversal || r.role === 'admin'
    })) : [{ role: 'registrador', vp_id: '', direcciones_ids: [], is_transversal: false }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este acceso completamente?')) return;
    const { error } = await supabase.from('allowed_users').delete().eq('id', id);
    if (!error) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const getRoleBadge = (roleCode: string) => {
    const found = roles.find(r => r.code === roleCode);
    if (found) {
      const colorScheme = ROLE_COLORS[found.color] || ROLE_COLORS.slate;
      return (
        <span className={`${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border} px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 inline-flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colorScheme.dot}`} />
          {found.name.toUpperCase()}
        </span>
      );
    }
    switch(roleCode) {
      case 'admin': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">ADMIN</span>;
      case 'bp_ti': return <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">BP TI</span>;
      case 'invitado': return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">INVITADO</span>;
      default: return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">{roleCode.toUpperCase()}</span>;
    }
  };

  const activeRolesList = roles.length > 0
    ? roles.filter(r => r.is_active || (editingId && assignments.some(a => a.role === r.code))).map(r => ({ value: r.code, label: r.name }))
    : ROLES_DISPONIBLES_FALLBACK;

  const roleFilterOptions = roles.length > 0
    ? roles.map(r => ({ value: r.code, label: r.name }))
    : ROLES_DISPONIBLES_FALLBACK;

  const filteredRolesCatalog = roles.filter(r => {
    if (roleFilterType === 'system' && !r.is_system) return false;
    if (roleFilterType === 'custom' && r.is_system) return false;
    if (roleFilterType === 'active' && !r.is_active) return false;

    if (!roleSearchQuery.trim()) return true;
    const rawQ = roleSearchQuery.toLowerCase().trim();
    const cleanQ = toCleanSlug(roleSearchQuery);
    return (
      r.name.toLowerCase().includes(rawQ) ||
      r.code.toLowerCase().includes(rawQ) ||
      (r.description && r.description.toLowerCase().includes(rawQ)) ||
      toCleanSlug(r.name).includes(cleanQ) ||
      toCleanSlug(r.code).includes(cleanQ)
    );
  });

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

    if (selectedTransversal !== 'all') {
      const hasTransversal = user.user_roles_whitelist?.some(r => !!r.is_transversal || r.role === 'admin');
      if (selectedTransversal === 'transversal' && !hasTransversal) return false;
      if (selectedTransversal === 'specific' && (!hasAssignments || hasTransversal)) return false;
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

      {/* Sub-tabs de Navegación */}
      <div className="bg-white p-2.5 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-slate-800 shadow-xs ring-1 ring-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-[#4F5AF5]" />
            <span>Usuarios y Accesos</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'users' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-white text-slate-800 shadow-xs ring-1 ring-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Catálogo de Roles</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'roles' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {roles.length}
            </span>
          </button>
        </div>

        {activeTab === 'roles' && (
          <button
            type="button"
            onClick={handleOpenCreateRole}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#4F5AF5] to-[#6366F1] hover:from-[#3D47E0] hover:to-[#4F5AF5] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer transform active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Rol</span>
          </button>
        )}
      </div>

      {activeTab === 'users' && (
        <>
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
                              {activeRolesList.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </div>
                          
                          {/* Opción Alcance Transversal */}
                          {(() => {
                            const isInherentlyTransversal = assig.role === 'admin';
                            const isTransversalActive = !!assig.is_transversal || isInherentlyTransversal;
                            return (
                              <>
                                <div 
                                  onClick={() => {
                                    if (isInherentlyTransversal) return;
                                    updateAssignment(index, 'is_transversal', !assig.is_transversal);
                                  }}
                                  className={`p-2.5 rounded-xl border transition-all select-none ${
                                    isInherentlyTransversal ? 'cursor-default' : 'cursor-pointer'
                                  } ${
                                    isTransversalActive 
                                      ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/10' 
                                      : 'bg-white border-[#E2E8F0] hover:border-indigo-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                      isTransversalActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      <Globe className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-[#1E293B]">Alcance Transversal</span>
                                        {isTransversalActive && (
                                          <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full">
                                            Global
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-[#64748B] block">
                                        {isInherentlyTransversal 
                                          ? 'El Administrador General opera siempre a nivel global en todo el sistema'
                                          : 'Aplica a todas las Vicepresidencias y Direcciones'}
                                      </span>
                                    </div>
                                  </div>
                                  <input 
                                    type="checkbox" 
                                    disabled={isInherentlyTransversal}
                                    checked={isTransversalActive} 
                                    onChange={(e) => {
                                      if (!isInherentlyTransversal) {
                                        updateAssignment(index, 'is_transversal', e.target.checked);
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] cursor-pointer disabled:opacity-70" 
                                  />
                                </div>

                                {isTransversalActive ? (
                                  <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 flex items-start gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                    <span className="leading-snug">
                                      {isInherentlyTransversal ? (
                                        <span>El <strong>Administrador General</strong> cuenta con acceso irrestricto y facultades plenas sobre todas las iniciativas y áreas del sistema.</span>
                                      ) : (
                                        <span>Permisos globales activos. Este usuario tendrá facultades para este rol sobre <strong>todas las iniciativas de la empresa</strong> sin restricción de dirección.</span>
                                      )}
                                    </span>
                                  </div>
                                ) : (
                                  <>
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
                                  </>
                                )}
                              </>
                            );
                          })()}
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

              {(selectedVPs.length > 0 || selectedDirs.length > 0 || selectedRoles.length > 0 || selectedActivation !== 'all' || selectedConnection !== 'all' || selectedTransversal !== 'all' || searchQuery !== '') && (
                <button 
                  onClick={() => {
                    setSelectedVPs([]);
                    setSelectedDirs([]);
                    setSelectedRoles([]);
                    setSelectedActivation('all');
                    setSelectedConnection('all');
                    setSelectedTransversal('all');
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
                  setTransversalDropdownOpen(false);
                  setActivationDropdownOpen(false);
                  setConnectionDropdownOpen(false);
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
                  setTransversalDropdownOpen(false);
                  setActivationDropdownOpen(false);
                  setConnectionDropdownOpen(false);
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
                  setTransversalDropdownOpen(false);
                  setActivationDropdownOpen(false);
                  setConnectionDropdownOpen(false);
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
                      {roleFilterOptions.map(r => (
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

            {/* Dropdown Alcance Transversal */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => {
                  setTransversalDropdownOpen(!transversalDropdownOpen);
                  setVpDropdownOpen(false);
                  setDirDropdownOpen(false);
                  setRoleDropdownOpen(false);
                  setActivationDropdownOpen(false);
                  setConnectionDropdownOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedTransversal !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>Alcance: {selectedTransversal === 'all' ? 'Todos' : selectedTransversal === 'transversal' ? 'Transversal' : 'Específico'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {transversalDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTransversalDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 p-2">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => { setSelectedTransversal('all'); setTransversalDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors hover:bg-slate-50 ${selectedTransversal === 'all' ? 'font-bold text-[#4F5AF5]' : 'text-[#1E293B]'}`}
                      >
                        Todos los alcances
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedTransversal('transversal'); setTransversalDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors hover:bg-slate-50 flex items-center gap-2 ${selectedTransversal === 'transversal' ? 'font-bold text-[#4F5AF5]' : 'text-[#1E293B]'}`}
                      >
                        <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Alcance Transversal (Global)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedTransversal('specific'); setTransversalDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors hover:bg-slate-50 flex items-center gap-2 ${selectedTransversal === 'specific' ? 'font-bold text-[#4F5AF5]' : 'text-[#1E293B]'}`}
                      >
                        <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Específico (Por Dirección)</span>
                      </button>
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
                  setTransversalDropdownOpen(false);
                  setConnectionDropdownOpen(false);
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
                  setTransversalDropdownOpen(false);
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
                                    {(() => {
                                      const isTrans = !!r.is_transversal || r.role === 'admin';
                                      return (
                                        <>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {getRoleBadge(r.role)}
                                            {isTrans ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                <Globe className="w-3 h-3 text-indigo-600" /> Alcance Transversal
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white text-slate-700 border border-slate-200">
                                                <Building className="w-2.5 h-2.5" /> {r.vps?.name || 'Sin VP'}
                                              </span>
                                            )}
                                          </div>
                                          {isTrans ? (
                                            <div className="pl-1 border-l-2 border-indigo-300 ml-1">
                                              <span className="text-[10px] text-indigo-700 font-medium flex items-center gap-1">
                                                <Sparkles className="w-2.5 h-2.5 text-indigo-500" /> {r.role === 'admin' ? 'Acceso Global a todo el sistema (Super Administrador)' : 'Todas las Vicepresidencias y Direcciones'}
                                              </span>
                                            </div>
                                          ) : (
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
                                          )}
                                        </>
                                      );
                                    })()}
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
      </>
      )}

      {/* VISTA CATÁLOGO DE ROLES DINÁMICOS */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {/* Métricas / Resumen de Roles Compacto */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
              <div className="h-0.5 w-full bg-gradient-to-r from-[#4F5AF5] to-[#6366F1] absolute top-0 left-0" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total de Roles</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#4F5AF5] flex items-center justify-center border border-indigo-100/60">
                  <Shield className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">{roles.length}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Catálogo institucional activo
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
              <div className="h-0.5 w-full bg-gradient-to-r from-slate-400 to-slate-500 absolute top-0 left-0" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Roles del Sistema</span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200/60">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">{roles.filter(r => r.is_system).length}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Protegidos e inmutables
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
              <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 to-indigo-500 absolute top-0 left-0" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Personalizados</span>
                <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100/60">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">{roles.filter(r => !r.is_system).length}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                Habilitados para flujos
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
              <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500 absolute top-0 left-0" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Asignaciones</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/60">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">
                {roles.reduce((acc, r) => acc + (r.user_count || 0), 0)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Usuarios asignados
              </p>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros Rápidos (Segmented Control Compacto) */}
          <div className="bg-white p-2.5 rounded-xl shadow-2xs border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="relative flex-1 md:max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roleSearchQuery}
                onChange={e => setRoleSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, código slug o descripción..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#4F5AF5] focus:bg-white transition-all placeholder:text-slate-400"
              />
              {roleSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRoleSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
              <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5 overflow-x-auto">
                {[
                  { id: 'all', label: 'Todos', count: roles.length },
                  { id: 'system', label: 'Sistema', count: roles.filter(r => r.is_system).length },
                  { id: 'custom', label: 'Personalizados', count: roles.filter(r => !r.is_system).length },
                  { id: 'active', label: 'Activos', count: roles.filter(r => r.is_active).length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRoleFilterType(tab.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      roleFilterType === tab.id
                        ? 'bg-white text-slate-800 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-semibold ${
                      roleFilterType === tab.id ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={fetchRoles}
                disabled={rolesLoading}
                className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                title="Actualizar lista de roles"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rolesLoading ? 'animate-spin text-[#4F5AF5]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Grid de Roles Compacto (4 a 5 columnas en desktop) */}
          {rolesLoading && roles.length === 0 ? (
            <div className="py-14 text-center bg-white rounded-xl border border-slate-200/90 shadow-2xs">
              <Loader2 className="w-6 h-6 text-[#4F5AF5] animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Cargando catálogo de roles...</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Sincronizando con base de datos</p>
            </div>
          ) : filteredRolesCatalog.length === 0 ? (
            <div className="py-14 text-center bg-white rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
                <Shield className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">No se encontraron roles</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                No hay ningún rol que coincida con los filtros seleccionados o el término de búsqueda.
              </p>
              <button
                type="button"
                onClick={() => { setRoleSearchQuery(''); setRoleFilterType('all'); }}
                className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
              {filteredRolesCatalog.map((role) => {
                const colorConfig = ROLE_COLORS[role.color] || ROLE_COLORS.slate;
                const userCount = role.user_count !== undefined 
                  ? role.user_count 
                  : users.reduce((acc, u) => acc + (u.user_roles_whitelist?.filter(r => r.role === role.code).length || 0), 0);

                return (
                  <div
                    key={role.id}
                    className="group relative bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all duration-150 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top colored accent line */}
                    <div 
                      className="h-1 w-full transition-all duration-200 group-hover:h-1.5" 
                      style={{ backgroundColor: colorConfig.swatch }}
                    />

                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Header Row: Icon + Title + System/Custom Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div 
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                              style={{ backgroundColor: `${colorConfig.swatch}15`, borderColor: `${colorConfig.swatch}35` }}
                            >
                              {getRoleIcon(role.code, role.is_system)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#4F5AF5] transition-colors leading-tight truncate" title={role.name}>
                                {role.name}
                              </h3>

                              {/* Slug chip with copy */}
                              <div className="mt-1 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleCopySlug(role.code)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-mono text-[10px] font-medium border border-slate-200/70 transition-colors cursor-pointer group/code"
                                  title="Copiar código técnico"
                                >
                                  <span className="truncate max-w-[100px]">{role.code}</span>
                                  {copiedSlug === role.code ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 text-slate-400 group-hover/code:text-slate-600 shrink-0" />
                                  )}
                                </button>
                                {copiedSlug === role.code && (
                                  <span className="text-[9px] text-emerald-600 font-bold">¡Copiado!</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* System vs Custom badge */}
                          {role.is_system ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md shrink-0" title="Rol del sistema base">
                              <Lock className="w-2.5 h-2.5 text-slate-500" />
                              Sistema
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-md shrink-0" title="Rol personalizado para flujos">
                              <Sparkles className="w-2.5 h-2.5 text-violet-500" />
                              Personal
                            </span>
                          )}
                        </div>

                        {/* Description (compact 2-line clamp) */}
                        <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 min-h-[2rem] leading-relaxed">
                          {role.description || 'Sin descripción detallada.'}
                        </p>
                      </div>

                      {/* Unified Compact Footer: Users + Status + Actions */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                        {/* Users count */}
                        <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-semibold" title={`${userCount} usuario(s) asignado(s)`}>
                          <Users className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{userCount} <span className="text-[10px] text-slate-400 font-normal">usr</span></span>
                        </div>

                        {/* Status + Actions Group */}
                        <div className="flex items-center gap-1.5">
                          {/* Active Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleRoleStatus(role)}
                            disabled={role.code === 'admin'}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-all inline-flex items-center gap-1 cursor-pointer ${
                              role.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            } ${role.code === 'admin' ? 'cursor-not-allowed opacity-80' : ''}`}
                            title={role.code === 'admin' ? 'El rol administrador no puede desactivarse' : 'Clic para alternar estado'}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${role.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {role.is_active ? 'Activo' : 'Inactivo'}
                          </button>

                          {/* Edit action */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditRole(role)}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors cursor-pointer"
                            title="Editar rol"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>

                          {/* Delete action */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            disabled={role.is_system || userCount > 0}
                            className={`p-1 rounded-md border transition-all ${
                              role.is_system || userCount > 0
                                ? 'text-slate-300 border-transparent cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-100 cursor-pointer'
                            }`}
                            title={
                              role.is_system
                                ? 'Los roles del sistema base no se pueden eliminar'
                                : userCount > 0
                                ? `No se puede eliminar: tiene ${userCount} usuario(s) asignado(s)`
                                : 'Eliminar rol'
                            }
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal para Crear / Editar Rol con Vista Previa en Vivo */}
      {roleModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F5AF5] to-[#6366F1] text-white flex items-center justify-center shadow-xs">
                  <Shield className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRole ? `Editar Rol: ${editingRole.name}` : 'Crear Nuevo Rol'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingRole ? 'Modifica los atributos visibles y estado del rol' : 'Define un nuevo rol institucional para flujos'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vista Previa en Vivo del Badge */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 my-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Vista previa del rol en tiempo real
              </span>
              <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{ 
                      backgroundColor: `${ROLE_COLORS[roleForm.color]?.swatch || '#6366F1'}15`, 
                      borderColor: `${ROLE_COLORS[roleForm.color]?.swatch || '#6366F1'}35` 
                    }}
                  >
                    <UserCog className="w-4.5 h-4.5" style={{ color: ROLE_COLORS[roleForm.color]?.swatch || '#6366F1' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {roleForm.name.trim() || 'Nombre del rol'}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                      {roleForm.code ? toCleanSlug(roleForm.code) : 'codigo_tecnico'}
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                  roleForm.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {roleForm.is_active ? '● Activo' : '○ Inactivo'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nombre del Rol <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => {
                    const nameVal = e.target.value;
                    setRoleForm(prev => {
                      const prevClean = toCleanSlug(prev.name).replace(/^_+|_+$/g, '');
                      const prevCode = prev.code.trim();
                      const shouldAutoSlug = !editingRole && (!prevCode || prevCode === prevClean || prevCode === toCleanSlug(prev.name));
                      return {
                        ...prev,
                        name: nameVal,
                        code: shouldAutoSlug ? toCleanSlug(nameVal).replace(/^_+|_+$/g, '') : prev.code
                      };
                    });
                  }}
                  placeholder="Ej: Comité de TI, Director de VP, Líder Técnico"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#4F5AF5] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Código Técnico Identificador <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={roleForm.code}
                  disabled={!!editingRole}
                  onChange={(e) => setRoleForm({ ...roleForm, code: toCleanSlug(e.target.value) })}
                  placeholder="ej: comite_ti, director_vp, lider_dominio_ti"
                  className={`w-full px-3.5 py-2.5 font-mono text-xs rounded-xl border ${
                    editingRole 
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 outline-none focus:border-[#4F5AF5] focus:bg-white'
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {editingRole 
                    ? 'El código técnico es inmutable para garantizar la consistencia en el motor de flujos.' 
                    : 'Sin tildes ni caracteres especiales. Se generará automáticamente y se utilizará en las reglas del flujo.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Descripción y Alcance
                </label>
                <textarea
                  rows={3}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Explica las responsabilidades de este rol en las iniciativas o revisiones..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#4F5AF5] focus:bg-white transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Color Distintivo del Badge
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(ROLE_COLORS).filter(([k]) => k !== 'red').map(([colorKey, cfg]) => {
                    const isSelected = roleForm.color === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setRoleForm({ ...roleForm, color: colorKey })}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-[#4F5AF5] bg-indigo-50/70 ring-2 ring-[#4F5AF5]/20 shadow-xs' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className="truncate text-[11px]">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={roleForm.is_active}
                    disabled={editingRole?.code === 'admin'}
                    onChange={(e) => setRoleForm({ ...roleForm, is_active: e.target.checked })}
                    className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Rol activo (disponible para asignaciones de usuarios y flujos de trabajo)
                  </span>
                </label>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={roleSaving}
                  className="flex-[2] bg-gradient-to-r from-[#4F5AF5] to-[#6366F1] hover:from-[#3D47E0] hover:to-[#4F5AF5] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-all inline-flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {roleSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{roleSaving ? 'Guardando...' : (editingRole ? 'Actualizar Rol' : 'Crear Rol')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
