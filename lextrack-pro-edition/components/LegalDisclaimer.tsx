
import React from 'react';

export const LegalDisclaimer: React.FC = () => (
  <div className="mx-auto max-w-4xl mb-10">
    <div className="relative group overflow-hidden rounded-[2rem] bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-white/5 p-6 backdrop-blur-xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-[60px] rounded-full -mr-10 -mt-10"></div>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex-shrink-0 w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-xl shadow-rose-900/40">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="text-center md:text-left">
          <h4 className="text-xs font-black text-rose-400 uppercase tracking-[0.3em] mb-1">Safety Protocol v2.5</h4>
          <h2 className="text-xl font-black text-white mb-2 leading-none">Educational Sandbox Environment</h2>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            This AI prototype simulates legal multi-agents for research only. It is <strong>not a replacement</strong> for a licensed Indian Advocate.
          </p>
        </div>
      </div>
    </div>
  </div>
);
