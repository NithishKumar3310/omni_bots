
import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/authService';
import { UserRole, AuthSession } from '../types';

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('client');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Reset form when switching between Login and Register
  useEffect(() => {
    setError('');
    setRegistrationSuccess(false);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      fullName: ''
    });
  }, [isLogin]);

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      return "Valid e-mail address is required.";
    }

    if (!isLogin) {
      if (formData.password.length < 6) return "Password must be at least 6 characters.";
      if (formData.password !== formData.confirmPassword) return "Passwords do not match.";
      if (!formData.fullName.trim()) return "Full Legal Name is required.";
    } else {
      if (!formData.password) return "Password key is required.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    
    try {
      if (isLogin) {
        // Verification for Login
        const session = AuthService.login(formData.email, formData.password);
        setLoading(true);
        const loginSteps = ["Verifying credentials...", "Establishing secure tunnel...", "Establishing connection..."];
        for (const step of loginSteps) {
          setStatusText(step);
          await new Promise(r => setTimeout(r, 500));
        }
        onLoginSuccess(session);
      } else {
        // Save Changes & Register Flow
        setLoading(true);
        const regSteps = [
          "Securing credentials...", 
          "Validating protocol...", 
          "Saving changes to LexTrack Vault...", 
          "Syncing Identity..."
        ];
        for (const step of regSteps) {
          setStatusText(step);
          await new Promise(r => setTimeout(r, 600));
        }
        AuthService.register(formData.email, formData.password, formData.fullName, role);
        setRegistrationSuccess(true);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    setRegistrationSuccess(false);
    setIsLogin(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-[#020617] overflow-y-auto">
      <div className={`max-w-md w-full relative z-10 my-8 transition-all duration-700 ${error ? 'animate-shake' : 'animate-in fade-in zoom-in'}`}>
        <div className="glass-ultra p-8 md:p-10 rounded-[3rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col justify-center">
          {/* Cyber Decorative Backgrounds */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/10 blur-[100px] rounded-full"></div>
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-fuchsia-500/10 blur-[100px] rounded-full"></div>

          {registrationSuccess ? (
            <div className="text-center animate-in zoom-in duration-500 py-4">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full mx-auto mb-6 flex items-center justify-center border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <svg className="w-10 h-10 text-emerald-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Identity Established</h2>
              <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed px-4">
                Your LexTrack identity linked to {formData.email} is now active.
              </p>
              <button
                onClick={handleReturnToLogin}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                Establish Connection
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-2xl ring-4 ring-white/5 transition-all duration-500 ${isLogin ? 'bg-gradient-to-tr from-indigo-500 to-indigo-600' : 'bg-gradient-to-tr from-fuchsia-500 to-rose-600'}`}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">LexTrack AI</h1>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">{isLogin ? 'e-mail Gateway' : 'New Identity Initialization'}</p>
              </div>

              {/* Tab Switcher */}
              <div className="flex bg-white/5 p-1 rounded-2xl mb-6 border border-white/10 relative">
                <div 
                  className={`absolute top-1 bottom-1 w-[49%] rounded-xl transition-all duration-500 ease-out ${isLogin ? 'left-1 bg-indigo-500 shadow-lg shadow-indigo-500/40' : 'left-[50%] bg-fuchsia-600 shadow-lg shadow-fuchsia-600/40'}`}
                />
                <button 
                  onClick={() => setIsLogin(true)}
                  disabled={loading}
                  className={`relative z-10 flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-colors ${isLogin ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  e-mail Sign-In
                </button>
                <button 
                  onClick={() => setIsLogin(false)}
                  disabled={loading}
                  className={`relative z-10 flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-colors ${!isLogin ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Initialize Identity
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-4 duration-300">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Adv. Rajesh Kumar"
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-fuchsia-500/50 transition-all placeholder:text-slate-700 font-medium disabled:opacity-50"
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">e-mail Address</label>
                  <input
                    required
                    type="email"
                    placeholder="name@email.com"
                    disabled={loading}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700 font-medium disabled:opacity-50"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700 font-medium disabled:opacity-50"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  {!isLogin && (
                    <div className="space-y-1.5 animate-in slide-in-from-right-4 duration-300">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Verify Password</label>
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        disabled={loading}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-fuchsia-500/50 transition-all placeholder:text-slate-700 font-medium disabled:opacity-50"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <div className="space-y-3 pt-1 animate-in slide-in-from-bottom-4 duration-500">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Agent Protocol Selection</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setRole('advocate')}
                        className={`group flex flex-col items-center justify-center p-3 rounded-2xl text-[8px] font-black uppercase tracking-widest border-2 transition-all duration-500 disabled:opacity-50 ${role === 'advocate' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-white/5 text-slate-600 hover:border-white/10'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg mb-1.5 flex items-center justify-center transition-all ${role === 'advocate' ? 'bg-indigo-500 text-white' : 'bg-white/5 group-hover:bg-white/10'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>
                        </div>
                        Advocate
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setRole('client')}
                        className={`group flex flex-col items-center justify-center p-3 rounded-2xl text-[8px] font-black uppercase tracking-widest border-2 transition-all duration-500 disabled:opacity-50 ${role === 'client' ? 'bg-fuchsia-600/10 border-fuchsia-600 text-fuchsia-400 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'bg-white/5 border-white/5 text-slate-600 hover:border-white/10'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg mb-1.5 flex items-center justify-center transition-all ${role === 'client' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 group-hover:bg-white/10'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        Client
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[9px] text-rose-400 font-black uppercase text-center shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-shake">
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {error}
                    </span>
                  </div>
                )}

                <button
                  disabled={loading}
                  className={`w-full font-black py-4 rounded-2xl mt-4 uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all disabled:opacity-50 relative overflow-hidden group ${
                    isLogin 
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-700 text-white shadow-indigo-500/20 active:scale-95' 
                      : 'bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white shadow-fuchsia-600/20 active:scale-95'
                  }`}
                >
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        {statusText}
                      </span>
                    </div>
                  ) : (
                    <>
                      <span className="relative z-10">{isLogin ? 'Establish Secure Connection' : 'Initialize Protocol'}</span>
                      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </>
                  )}
                </button>
              </form>

              {!loading && !registrationSuccess && (
                <div className="mt-6 text-center">
                  <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    {isLogin ? "New user? Establish identity" : "Return to Vault Sign-In"}
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-8 text-center border-t border-white/5 pt-5">
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2">
              <span className={`w-1 h-1 rounded-full animate-pulse ${error ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
              LexTrack Secure Protocol Online
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-8px); }
          60% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
          transform: translate3d(0, 0, 0);
        }
      `}</style>
    </div>
  );
};
