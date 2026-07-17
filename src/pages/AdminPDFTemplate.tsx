import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { supabase } from '../lib/supabase';
import { Save, Loader2, Info } from 'lucide-react';

export default function AdminPDFTemplate() {
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('pdf_template')
        .eq('id', 1)
        .single();
        
      if (error) throw error;
      if (data && data.pdf_template) {
        setTemplate(data.pdf_template);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ pdf_template: template })
        .eq('id', 1);

      if (error) throw error;
      setMessage({ text: 'Plantilla guardada exitosamente.', type: 'success' });
    } catch (error: any) {
      console.error('Error saving template:', error);
      setMessage({ text: 'Error al guardar la plantilla: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean'],
      ['code-block']
    ]
  };

  const availableVariables = [
    { key: '{{titulo_de_la_necesidad}}', desc: 'Título de la iniciativa' },
    { key: '{{id_corta}}', desc: 'ID corto (ej. #A1B2C3D4)' },
    { key: '{{fecha_actual}}', desc: 'Fecha de impresión' },
    { key: '{{registrador}}', desc: 'Nombre del Key User' },
    { key: '{{direccion}}', desc: 'Dirección del usuario' },
    { key: '{{institucion}}', desc: 'Institución (UPN, UPC, etc.)' },
    { key: '{{bp_ti_asignado}}', desc: 'BP de TI asignado' },
    { key: '{{fecha_requerida}}', desc: 'Fecha requerida de entrega' },
    { key: '{{descripcion_de_la_necesidad}}', desc: 'Descripción completa' },
    { key: '{{beneficio_cuantitativo_anual}}', desc: 'Beneficio Cuantitativo' },
    { key: '{{proceso_y_areas_impactadas}}', desc: 'Áreas impactadas' },
    { key: '{{situacion_deseada}}', desc: 'Situación deseada (ejemplo de campo adicional)' }
  ];

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantilla del Informe Ejecutivo PDF</h1>
          <p className="text-sm text-gray-500 mt-1">
            Personaliza el formato del documento PDF usando el editor visual.
          </p>
        </div>
        <button
          onClick={saveTemplate}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Cambios
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <Info className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[700px]">
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700">Editor Visual</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ReactQuill 
              theme="snow" 
              value={template} 
              onChange={setTemplate} 
              modules={modules}
              className="h-full bg-white [&_.ql-container]:border-none [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 [&_.ql-editor]:min-h-[600px] [&_.ql-editor]:p-8"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              Variables Dinámicas
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Copia y pega estas variables en el editor. Serán reemplazadas automáticamente al generar el PDF.
            </p>
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
              {availableVariables.map((v, i) => (
                <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors">
                  <code className="text-xs font-bold text-blue-700 block mb-1 select-all cursor-pointer" title="Doble clic para seleccionar">{v.key}</code>
                  <span className="text-[11px] text-gray-600 block leading-tight">{v.desc}</span>
                </div>
              ))}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-4">
                <span className="text-[11px] text-gray-600 block leading-tight italic">
                  * También puedes usar cualquier otra llave del formulario en el formato {'{{llave_del_campo}}'}.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
