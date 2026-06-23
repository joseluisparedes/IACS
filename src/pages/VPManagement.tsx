import React, { useState, useEffect } from 'react';
import { Building2, Network, Plus, Trash2, Save, X, Edit2, Mail, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VP {
  id: string;
  name: string;
  bp_name: string | null;
  email: string | null;
}

interface Direccion {
  id: string;
  name: string;
  vp_id: string;
  director_name: string | null;
  email: string | null;
}

export default function VPManagement() {
  const [vps, setVps] = useState<VP[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedVP, setSelectedVP] = useState<string | null>(null);

  // Forms
  const [vpName, setVpName] = useState('');
  const [vpBpName, setVpBpName] = useState('');
  const [vpEmail, setVpEmail] = useState('');
  const [editingVP, setEditingVP] = useState<string | null>(null);

  const [dirName, setDirName] = useState('');
  const [dirDirectorName, setDirDirectorName] = useState('');
  const [dirEmail, setDirEmail] = useState('');
  const [editingDir, setEditingDir] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [vpRes, dirRes] = await Promise.all([
      supabase.from('vps').select('*').order('name'),
      supabase.from('direcciones').select('*').order('name')
    ]);

    if (vpRes.data) setVps(vpRes.data);
    if (dirRes.data) setDirecciones(dirRes.data);
    
    if (vpRes.data && vpRes.data.length > 0 && !selectedVP) {
      setSelectedVP(vpRes.data[0].id);
    }
    setLoading(false);
  };

  const handleSaveVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vpName.trim()) return;

    if (editingVP) {
      const { error } = await supabase
        .from('vps')
        .update({ 
          name: vpName.trim(), 
          bp_name: vpBpName.trim() || null, 
          email: vpEmail.trim() || null 
        })
        .eq('id', editingVP);
        
      if (!error) {
        setVps(vps.map(vp => vp.id === editingVP ? { 
          ...vp, 
          name: vpName.trim(), 
          bp_name: vpBpName.trim() || null, 
          email: vpEmail.trim() || null 
        } : vp));
        setEditingVP(null);
        setVpName('');
        setVpBpName('');
        setVpEmail('');
      } else alert(error.message);
    } else {
      const { data, error } = await supabase
        .from('vps')
        .insert([{ 
          name: vpName.trim(), 
          bp_name: vpBpName.trim() || null, 
          email: vpEmail.trim() || null 
        }])
        .select();
        
      if (!error && data) {
        setVps([...vps, data[0]]);
        setVpName('');
        setVpBpName('');
        setVpEmail('');
        setSelectedVP(data[0].id);
      } else alert(error?.message);
    }
  };

  const handleDeleteVP = async (id: string) => {
    if (!confirm('Eliminar esta VP eliminará todas sus Direcciones. ¿Continuar?')) return;
    const { error } = await supabase.from('vps').delete().eq('id', id);
    if (!error) {
      setVps(vps.filter(vp => vp.id !== id));
      if (selectedVP === id) setSelectedVP(null);
    }
  };

  const handleEditVP = (vp: VP) => {
    setEditingVP(vp.id);
    setVpName(vp.name);
    setVpBpName(vp.bp_name || '');
    setVpEmail(vp.email || '');
  };

  const handleCancelEditVP = () => {
    setEditingVP(null);
    setVpName('');
    setVpBpName('');
    setVpEmail('');
  };

  const handleSaveDir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirName.trim() || !selectedVP) return;

    if (editingDir) {
      const { error } = await supabase
        .from('direcciones')
        .update({ 
          name: dirName.trim(), 
          director_name: dirDirectorName.trim() || null, 
          email: dirEmail.trim() || null 
        })
        .eq('id', editingDir);

      if (!error) {
        setDirecciones(direcciones.map(d => d.id === editingDir ? { 
          ...d, 
          name: dirName.trim(), 
          director_name: dirDirectorName.trim() || null, 
          email: dirEmail.trim() || null 
        } : d));
        setEditingDir(null);
        setDirName('');
        setDirDirectorName('');
        setDirEmail('');
      } else alert(error.message);
    } else {
      const { data, error } = await supabase
        .from('direcciones')
        .insert([{ 
          name: dirName.trim(), 
          vp_id: selectedVP, 
          director_name: dirDirectorName.trim() || null, 
          email: dirEmail.trim() || null 
        }])
        .select();

      if (!error && data) {
        setDirecciones([...direcciones, data[0]]);
        setDirName('');
        setDirDirectorName('');
        setDirEmail('');
      } else alert(error?.message);
    }
  };

  const handleDeleteDir = async (id: string) => {
    if (!confirm('¿Eliminar esta Dirección?')) return;
    const { error } = await supabase.from('direcciones').delete().eq('id', id);
    if (!error) {
      setDirecciones(direcciones.filter(d => d.id !== id));
    }
  };

  const handleEditDir = (dir: Direccion) => {
    setEditingDir(dir.id);
    setDirName(dir.name);
    setDirDirectorName(dir.director_name || '');
    setDirEmail(dir.email || '');
  };

  const handleCancelEditDir = () => {
    setEditingDir(null);
    setDirName('');
    setDirDirectorName('');
    setDirEmail('');
  };

  const currentDirecciones = direcciones.filter(d => d.vp_id === selectedVP);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
        <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-3">
          <Network className="w-7 h-7 text-[#4F5AF5]" />
          Estructura Organizativa
        </h1>
        <p className="text-[#64748B] mt-1 text-sm">
          Configura las Vicepresidencias y sus Direcciones respectivas. Asocia nombres y correos electrónicos para direccionar notificaciones y aprobaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
        {/* VPs Column */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h2 className="font-bold text-[#1E293B] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#4F5AF5]" />
              Vicepresidencias (VPs)
            </h2>
          </div>

          <form onSubmit={handleSaveVP} className="p-4 border-b border-[#E2E8F0] bg-white space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Nombre de la Vicepresidencia</label>
              <input 
                required 
                value={vpName} 
                onChange={e => setVpName(e.target.value)} 
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:border-[#4F5AF5]" 
                placeholder="Ej: VP Finanzas" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Nombre del Vicepresidente</label>
              <input 
                value={vpBpName} 
                onChange={e => setVpBpName(e.target.value)} 
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:border-[#4F5AF5]" 
                placeholder="Ej: Juan Perez" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Correo de la Vicepresidencia</label>
              <input 
                type="email"
                value={vpEmail} 
                onChange={e => setVpEmail(e.target.value)} 
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:border-[#4F5AF5]" 
                placeholder="Ej: vp_finanzas@empresa.com" 
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white text-sm font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {editingVP ? 'Guardar Cambios' : 'Añadir VP'}
              </button>
              {editingVP && (
                <button type="button" onClick={handleCancelEditVP} className="px-3 py-2 border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] rounded-xl transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F8FAFC]">
            {loading ? (
              <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-2 border-[#4F5AF5] border-t-transparent"></div></div>
            ) : vps.length === 0 ? (
              <p className="text-center text-sm text-[#94A3B8] italic p-4">No hay VPs registradas.</p>
            ) : (
              vps.map(vp => (
                <div 
                  key={vp.id} 
                  onClick={() => setSelectedVP(vp.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedVP === vp.id 
                      ? 'bg-violet-50 border-violet-200 shadow-sm' 
                      : 'bg-white border-[#E2E8F0] hover:border-violet-200 hover:bg-violet-50/50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm truncate ${selectedVP === vp.id ? 'text-[#4F5AF5]' : 'text-[#1E293B]'}`}>{vp.name}</p>
                    {vp.bp_name && <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5"><User className="w-3 h-3 text-[#94A3B8]" /> VP: {vp.bp_name}</p>}
                    {vp.email && <p className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {vp.email}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={(e) => { e.stopPropagation(); handleEditVP(vp); }} className="p-1.5 text-[#94A3B8] hover:text-[#4F5AF5] hover:bg-violet-100 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteVP(vp.id); }} className="p-1.5 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Direcciones Column */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h2 className="font-bold text-[#1E293B] flex items-center gap-2">
              <Network className="w-5 h-5 text-emerald-500" />
              Direcciones de {vps.find(v => v.id === selectedVP)?.name || 'la VP'}
            </h2>
          </div>

          {!selectedVP ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-[#94A3B8]">
              <p>Selecciona una Vicepresidencia en la lista izquierda para administrar sus Direcciones.</p>
            </div>
          ) : (
            <>
              <form onSubmit={handleSaveDir} className="p-4 border-b border-[#E2E8F0] bg-white space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Nombre de la Dirección</label>
                  <input 
                    required 
                    value={dirName} 
                    onChange={e => setDirName(e.target.value)} 
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:border-[#4F5AF5]" 
                    placeholder="Ej: Dirección de TI" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Nombre del Director</label>
                  <input 
                    value={dirDirectorName} 
                    onChange={e => setDirDirectorName(e.target.value)} 
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:border-[#4F5AF5]" 
                    placeholder="Ej: Carlos Gómez" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Correo electrónico del Director</label>
                  <input 
                    type="email"
                    value={dirEmail} 
                    onChange={e => setDirEmail(e.target.value)} 
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:border-[#4F5AF5]" 
                    placeholder="Ej: carlos.gomez@empresa.com" 
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    {editingDir ? 'Guardar Cambios' : 'Añadir Dirección'}
                  </button>
                  {editingDir && (
                    <button type="button" onClick={handleCancelEditDir} className="px-3 py-2 border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] rounded-xl transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F8FAFC]">
                {loading ? (
                  <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-2 border-[#4F5AF5] border-t-transparent"></div></div>
                ) : currentDirecciones.length === 0 ? (
                  <p className="text-center text-sm text-[#94A3B8] italic p-4">No hay Direcciones en esta VP.</p>
                ) : (
                  currentDirecciones.map(dir => (
                    <div key={dir.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#1E293B] truncate">{dir.name}</p>
                        {dir.director_name && <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5"><User className="w-3 h-3 text-[#94A3B8]" /> Director: {dir.director_name}</p>}
                        {dir.email && <p className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {dir.email}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button onClick={() => handleEditDir(dir)} className="p-1.5 text-[#94A3B8] hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteDir(dir.id)} className="p-1.5 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
