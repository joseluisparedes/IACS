import React, { useState, useEffect } from 'react';
import { Building2, Network, Trash2, Save, X, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VP {
  id: string;
  name: string;
}

interface Direccion {
  id: string;
  name: string;
  vp_id: string;
}

export default function VPManagement() {
  const [vps, setVps] = useState<VP[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedVP, setSelectedVP] = useState<string | null>(null);

  // Forms
  const [vpName, setVpName] = useState('');
  const [editingVP, setEditingVP] = useState<string | null>(null);

  const [dirName, setDirName] = useState('');
  const [editingDir, setEditingDir] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [vpRes, dirRes] = await Promise.all([
      supabase.from('vps').select('id, name').order('name'),
      supabase.from('direcciones').select('id, name, vp_id').order('name')
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
          name: vpName.trim()
        })
        .eq('id', editingVP);
        
      if (!error) {
        setVps(vps.map(vp => vp.id === editingVP ? { 
          ...vp, 
          name: vpName.trim()
        } : vp));
        setEditingVP(null);
        setVpName('');
      } else alert(error.message);
    } else {
      const { data, error } = await supabase
        .from('vps')
        .insert([{ 
          name: vpName.trim()
        }])
        .select();
        
      if (!error && data) {
        setVps([...vps, data[0]]);
        setVpName('');
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
  };

  const handleCancelEditVP = () => {
    setEditingVP(null);
    setVpName('');
  };

  const handleSaveDir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirName.trim() || !selectedVP) return;

    if (editingDir) {
      const { error } = await supabase
        .from('direcciones')
        .update({ 
          name: dirName.trim()
        })
        .eq('id', editingDir);

      if (!error) {
        setDirecciones(direcciones.map(d => d.id === editingDir ? { 
          ...d, 
          name: dirName.trim()
        } : d));
        setEditingDir(null);
        setDirName('');
      } else alert(error.message);
    } else {
      const { data, error } = await supabase
        .from('direcciones')
        .insert([{ 
          name: dirName.trim(), 
          vp_id: selectedVP
        }])
        .select();

      if (!error && data) {
        setDirecciones([...direcciones, data[0]]);
        setDirName('');
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
  };

  const handleCancelEditDir = () => {
    setEditingDir(null);
    setDirName('');
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
          Configura las Vicepresidencias y sus Direcciones respectivas para la organización institucional.
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
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedVP === vp.id 
                      ? 'bg-violet-50 border-violet-200 shadow-sm' 
                      : 'bg-white border-[#E2E8F0] hover:border-violet-200 hover:bg-violet-50/50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm truncate ${selectedVP === vp.id ? 'text-[#4F5AF5]' : 'text-[#1E293B]'}`}>{vp.name}</p>
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
                    <div key={dir.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#1E293B] truncate">{dir.name}</p>
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
