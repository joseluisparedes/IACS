import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, KeyRound, UserPlus } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (email !== 'jose241100@gmail.com') {
        const { data: allowedUser, error: checkError } = await supabase
          .from('allowed_users')
          .select('id')
          .ilike('email', email)
          .maybeSingle();

        if (checkError || !allowedUser) {
          setError('Tu correo no está en la lista de accesos permitidos. Contacta al administrador.');
          setLoading(false);
          return;
        }
      }

      if (isSignUp) {
        // Modo Crear Contraseña
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            setError('Ya tienes una cuenta creada. Por favor, inicia sesión.');
          } else {
            throw signUpError;
          }
        } else {
          // Intentar loguearse inmediatamente (por si auto-confirm está activado)
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (loginError) {
            setSuccess('Cuenta creada exitosamente. Si no puedes ingresar, revisa tu correo para confirmar tu cuenta.');
          } else {
            navigate('/');
          }
        }
      } else {
        // Modo Login Normal
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Lógica especial para crear el Administrador si no existe (mantenido por compatibilidad)
          if (email === 'jose241100@gmail.com' && error.message.includes('Invalid login credentials')) {
            const { error: signUpError } = await supabase.auth.signUp({
              email, password,
              options: { data: { name: 'Administrador General' } }
            });
            if (signUpError) throw signUpError;
            
            const { error: secondLoginError } = await supabase.auth.signInWithPassword({ email, password });
            if (secondLoginError) {
              setError('Cuenta de administrador creada, pero revisa si Supabase pide confirmación de correo electrónico.');
              return;
            }
          } else {
            if (error.message.includes('Invalid login credentials')) {
              setError('Credenciales incorrectas. Si eres nuevo y ya te dieron acceso, ve a "Activar mi acceso".');
            } else {
              throw error;
            }
          }
        }

        if (!error || email === 'jose241100@gmail.com') {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC] p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_4px_32px_rgba(13,67,108,.08)] border border-[#D7D9E8] p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[#EB5F46] to-[#0D436C] rounded-xl flex items-center justify-center shadow-lg shadow-[#EB5F46]/20">
            <span className="font-black text-white text-xl tracking-tighter">LP</span>
          </div>
        </div>
        
        <h2 className="text-2xl font-extrabold text-center text-[#0D436C] mb-2 uppercase tracking-wide">IT Needs Manager</h2>
        <p className="text-xs text-center text-[#4a5568] font-semibold tracking-wider uppercase mb-6">
          {isSignUp ? 'Activa tu acceso estableciendo una contraseña' : 'Laureate Perú'}
        </p>

        {/* Pestañas (Tabs) */}
        <div className="flex p-1 mb-6 bg-[#f7f8fc] rounded-xl border border-[#D7D9E8]">
          <button 
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); setSuccess(null); }}
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${!isSignUp ? 'bg-white text-[#EB5F46] shadow-sm' : 'text-[#4a5568] hover:text-[#0d436c]'}`}
          >
            <LogIn className="w-4 h-4" />
            Ingresar
          </button>
          <button 
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); setSuccess(null); }}
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${isSignUp ? 'bg-white text-[#EB5F46] shadow-sm' : 'text-[#4a5568] hover:text-[#0d436c]'}`}
          >
            <KeyRound className="w-4 h-4" />
            Activar Acceso
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-700 font-medium">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4a5568] mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#f7f8fc] border border-[#D7D9E8] rounded-xl focus:ring-2 focus:ring-[#EB5F46]/20 focus:border-[#EB5F46] outline-none transition-all text-[#1a1a2e]"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4a5568] mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#f7f8fc] border border-[#D7D9E8] rounded-xl focus:ring-2 focus:ring-[#EB5F46]/20 focus:border-[#EB5F46] outline-none transition-all text-[#1a1a2e]"
              placeholder={isSignUp ? "Crea una contraseña segura" : "••••••••"}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#EB5F46] hover:bg-[#c94a32] disabled:bg-[#9ca3af] text-white py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#EB5F46]/20 mt-4"
          >
            {loading ? 'Procesando...' : isSignUp ? (
              <>
                <UserPlus className="w-5 h-5" />
                Guardar Contraseña y Entrar
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
