import React from 'react';
import { Settings, LogOut } from 'lucide-react';

export default function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border-t-4 border-indigo-600">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Settings className="w-10 h-10 text-indigo-600 animate-spin-slow" style={{ animationDuration: '3s' }} />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Sitio en Mantenimiento</h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Estamos realizando mejoras en el sistema para brindarte una mejor experiencia. 
          Por favor, vuelve a intentarlo en unos minutos.
        </p>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-800 font-medium">
            Si eres administrador, puedes iniciar sesión desde un entorno autorizado.
          </p>
          <button 
            onClick={async () => {
              const { supabase } = await import('../lib/supabase');
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="mt-4 flex items-center justify-center w-full gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg shadow-sm hover:bg-indigo-50 font-semibold text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión e Ir al Login
          </button>
        </div>
      </div>
      
      <div className="mt-8 text-sm text-gray-500">
        © {new Date().getFullYear()} IACS - Laureate International Universities
      </div>
    </div>
  );
}
