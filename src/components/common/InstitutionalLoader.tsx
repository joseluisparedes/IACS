import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';

const DEFAULT_INSTITUTIONAL_PHRASES = [
  "Conectando con el motor de gobernanza IACS...",
  "Sincronizando estado con la cadena de custodia...",
  "Validando directrices y políticas de TI...",
  "Cargando trazabilidad y dictámenes técnicos...",
  "Optimizando la cartera estratégica de iniciativas...",
  "Verificando acuerdos y consentimientos digitales..."
];

interface InstitutionalLoaderProps {
  title?: string;
  subtitle?: string;
  phrases?: string[];
  overlay?: boolean;
  className?: string;
}

export const InstitutionalLoader: React.FC<InstitutionalLoaderProps> = ({
  title = "Gestor de Demandas TI — IACS",
  subtitle,
  phrases = DEFAULT_INSTITUTIONAL_PHRASES,
  overlay = false,
  className = "",
}) => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!phrases || phrases.length <= 1) return;
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [phrases]);

  const content = (
    <div className={`flex flex-col items-center justify-center text-center p-6 select-none ${className}`}>
      {/* Visual glowing spinner with badge */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="absolute w-16 h-16 rounded-full bg-indigo-500/15 animate-ping duration-1000" />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4F5AF5] to-indigo-400 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#4F5AF5] animate-spin" />
          </div>
        </div>
        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-xs border-2 border-white">
          <ShieldCheck className="w-3 h-3" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
          <span>{title}</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        </h4>

        {subtitle && (
          <p className="text-xs text-slate-500 font-medium">
            {subtitle}
          </p>
        )}

        {/* Dynamic rotating institutional phrase */}
        <div className="h-6 flex items-center justify-center overflow-hidden pt-1">
          <p
            key={phraseIndex}
            className="text-xs font-semibold text-indigo-600 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {phrases[phraseIndex]}
          </p>
        </div>
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-indigo-100 shadow-2xl p-4 max-w-md w-full">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
