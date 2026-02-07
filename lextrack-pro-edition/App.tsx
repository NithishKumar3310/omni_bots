
import React, { useState, useEffect, useRef } from 'react';
import { LegalAIService } from './services/geminiService';
import { AuthService } from './services/authService';
import { Message, FileAttachment, CaseSession, UserRole, AuthSession, AgentType, ViewMode, Notification, DailyCase } from './types';
import { ChatBubble } from './components/ChatBubble';
import { InputArea } from './components/InputArea';
import { LegalDisclaimer } from './components/LegalDisclaimer';
import { LoginPage } from './components/LoginPage';

const STORAGE_KEYS = {
  CASES: 'lextrack_cases_v5',
  CHATS: 'lextrack_chats_v5',
  NOTIFS: 'lextrack_notifs_v5',
  THEME: 'lextrack_theme',
  SETTINGS: 'lextrack_user_config'
};

const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem(STORAGE_KEYS.THEME) as any) || 'dark');
  const [chatSessions, setChatSessions] = useState<CaseSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuggestingDocs, setIsSuggestingDocs] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isAddingCase, setIsAddingCase] = useState(false);
  const [dailyCases, setDailyCases] = useState<DailyCase[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [researchData, setResearchData] = useState<{ [id: string]: any }>({});
  const [isResearching, setIsResearching] = useState(false);

  // User Settings State
  const [userSettings, setUserSettings] = useState({
    notificationsEnabled: true,
    legalLogic: 'BNS' as 'BNS' | 'IPC',
    verbosity: 'detailed' as 'concise' | 'detailed',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    autoSave: true
  });

  const [newCaseForm, setNewCaseForm] = useState({
    title: '', caseType: 'Civil', court: '', time: '10:00', description: '', nextHearingDate: '', requiredDocuments: [] as string[]
  });

  const legalService = useRef(new LegalAIService());
  const selectedCase = dailyCases.find(c => c.id === selectedCaseId);
  const currentChatSession = chatSessions.find(s => s.id === currentSessionId);

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // Unified Data Loader
  useEffect(() => {
    const active = AuthService.getSession();
    if (active) {
      setSession(active);
      const uid = active.user.id;
      
      const storedCases = JSON.parse(localStorage.getItem(STORAGE_KEYS.CASES) || '[]');
      setDailyCases(storedCases.filter((c: DailyCase) => c.userId === uid));
      
      const storedChats = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHATS) || '[]');
      setChatSessions(storedChats.filter((s: CaseSession) => s.userId === uid).map((s: any) => ({ 
        ...s, 
        createdAt: new Date(s.createdAt),
        messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      })));
      
      const storedNotifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFS) || '[]');
      setNotifications(storedNotifs.filter((n: Notification) => n.userId === uid).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })));

      const storedSettings = JSON.parse(localStorage.getItem(`${STORAGE_KEYS.SETTINGS}_${uid}`) || '{}');
      if (storedSettings.legalLogic) setUserSettings(prev => ({ ...prev, ...storedSettings }));
    }
  }, [session?.user.id]);

  // Global Persistence Effect
  useEffect(() => {
    if (!session) return;

    const persistIsolated = (key: string, currentData: any[]) => {
      const allItems = JSON.parse(localStorage.getItem(key) || '[]');
      const otherUsersData = allItems.filter((item: any) => item.userId !== session.user.id);
      const myUpdatedData = currentData.map(item => ({ ...item, userId: session.user.id }));
      localStorage.setItem(key, JSON.stringify([...otherUsersData, ...myUpdatedData]));
    };

    persistIsolated(STORAGE_KEYS.CASES, dailyCases);
    persistIsolated(STORAGE_KEYS.CHATS, chatSessions);
    persistIsolated(STORAGE_KEYS.NOTIFS, notifications);
    localStorage.setItem(`${STORAGE_KEYS.SETTINGS}_${session.user.id}`, JSON.stringify(userSettings));
  }, [dailyCases, chatSessions, notifications, session, userSettings]);

  // Hearing Notification Logic
  useEffect(() => {
    if (!session || !userSettings.notificationsEnabled) return;
    const interval = setInterval(() => {
      const now = new Date();
      dailyCases.forEach(c => {
        if (!c.nextHearingDate || !c.time) return;
        const hearing = new Date(`${c.nextHearingDate}T${c.time}`);
        const diffMs = hearing.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        const role = session.user.role;
        const threshold = role === 'advocate' ? 2 : 12;
        const alertId = `alert-${c.id}-${threshold}h-${session.user.id}`;

        if (diffHours > 0 && diffHours <= threshold && !notifications.some(n => n.id === alertId)) {
          const alertText = role === 'advocate' 
            ? `URGENT: Case "${c.title}" hearing in < 2h. Neural strategy ready.` 
            : `REMINDER: Your hearing for "${c.title}" is in 12h. Check your vault documents.`;
          
          setNotifications(prev => [{ 
            id: alertId, userId: session.user.id, type: 'urgent', text: alertText, timestamp: new Date(), isRead: false 
          }, ...prev]);
        }
      });
    }, 60000); 
    return () => clearInterval(interval);
  }, [dailyCases, session, notifications, userSettings.notificationsEnabled]);

  const handleSendMessage = async (text: string, files: FileAttachment[]) => {
    if (!session) return;
    let sid = currentSessionId;
    
    if (!sid) {
      sid = Date.now().toString();
      const newSession: CaseSession = { 
        id: sid, 
        userId: session.user.id,
        title: text.length > 40 ? text.substring(0, 40) + '...' : text, 
        messages: [], 
        createdAt: new Date(), 
        role: session.user.role 
      };
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(sid);
    }

    const uMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date(), attachments: files };
    setChatSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, uMsg] } : s));
    setLoading(true);

    try {
      const res = await legalService.current.analyzeQuery(text, [...(chatSessions.find(s => s.id === sid)?.messages || []), uMsg], session.user.role, files);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: res.answer, timestamp: new Date(), agentUsed: res.agent_type, safety: res.safety_metrics };
      setChatSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, aiMsg] } : s));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResearch = async (id: string) => {
    const c = dailyCases.find(x => x.id === id);
    if (!c) return;
    setIsResearching(true);
    try {
      const result = await legalService.current.researchCase(c.title, c.description);
      setResearchData(prev => ({ ...prev, [id]: result }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsResearching(false);
    }
  };

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    setIsSuggestingDocs(true);
    try {
      const docs = await legalService.current.suggestRequiredDocuments(newCaseForm.caseType, newCaseForm.description);
      
      const newCase: DailyCase = {
        id: Date.now().toString(),
        userId: session.user.id,
        title: newCaseForm.title,
        caseType: newCaseForm.caseType,
        cnr: 'LT-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        court: newCaseForm.court,
        hall: 'Hall ' + (Math.floor(Math.random() * 15) + 1),
        time: newCaseForm.time,
        stage: 'Filing',
        risk: 'medium',
        nextStep: 'Document Verification',
        session: parseInt(newCaseForm.time.split(':')[0]) < 12 ? 'Morning' : 'Afternoon',
        petitioner: session.user.role === 'client' ? session.user.fullName : 'Confidential Petitioner',
        respondent: 'Pending Information',
        description: newCaseForm.description,
        lastOrderDate: new Date().toISOString().split('T')[0],
        nextHearingDate: newCaseForm.nextHearingDate,
        requiredDocuments: docs
      };

      setDailyCases(prev => [newCase, ...prev]);
      setIsAddingCase(false);
      setNewCaseForm({
        title: '', caseType: 'Civil', court: '', time: '10:00', description: '', nextHearingDate: '', requiredDocuments: [] as string[]
      });
    } catch (err) {
      console.error("Vault entry failure:", err);
    } finally {
      setIsSuggestingDocs(false);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions(prev => prev.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));
  };

  const deleteCase = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDailyCases(prev => prev.filter(c => c.id !== id));
    if (selectedCaseId === id) setSelectedCaseId(null);
  };

  const handleLogout = () => {
    AuthService.logout();
    setSession(null);
    setCurrentSessionId(null);
    setDailyCases([]);
    setChatSessions([]);
    setNotifications([]);
    setResearchData({});
    setSelectedCaseId(null);
    setViewMode('chat');
  };

  const clearAllData = () => {
    if (window.confirm("PROTOCOL WARNING: Purging the vault will permanently delete all isolated user data. Proceed?")) {
      handleLogout();
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!session) return <LoginPage onLoginSuccess={setSession} />;

  // ROLE-BASED AVATARS
  const AdvocateAvatar = (
    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-indigo-800 flex items-center justify-center p-2">
      <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
  );

  const ClientAvatar = (
    <div className="w-full h-full bg-gradient-to-br from-fuchsia-500 to-rose-800 flex items-center justify-center p-2">
      <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-500">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 glass-ultra border-r border-[var(--border-main)] flex flex-col p-4 z-50 transition-all duration-300">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => { setViewMode('chat'); setCurrentSessionId(null); }}>
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <h1 className="hidden md:block text-lg font-black uppercase tracking-tighter text-white">LexTrack</h1>
        </div>
        <nav className="space-y-2 flex-1">
          {[
            { id: 'chat', label: 'Workspace', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
            { id: 'cases', label: 'Registry', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5' },
            { id: 'history', label: 'Vault History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37.996.608 2.296.07 2.572-1.065z' }
          ].map(m => (
            <button key={m.id} onClick={() => { setViewMode(m.id as any); if(m.id === 'chat') setCurrentSessionId(null); }} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${viewMode === m.id ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-inner' : 'text-slate-500 hover:bg-white/5'}`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d={m.icon} /></svg>
              <span className="md:inline hidden text-[10px] font-black uppercase tracking-widest">{m.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 px-8 flex items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-main)]/95 backdrop-blur-xl z-40">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl transition-transform hover:scale-110 duration-500">
              {session.user.role === 'advocate' ? AdvocateAvatar : ClientAvatar}
            </div>
            <div className="flex flex-col">
              <h2 className={`text-xl font-black uppercase tracking-tighter leading-none mb-1 ${session.user.role === 'advocate' ? 'text-indigo-400' : 'text-fuchsia-400'}`}>
                {session.user.role === 'advocate' ? 'Senior Advocate' : 'Client Profile'}
              </h2>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60 truncate max-w-[200px]">{session.user.fullName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 bg-white/5 border border-white/5 rounded-xl text-slate-500 hover:text-amber-400 transition-all">
              {theme === 'dark' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            </button>
            <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-3 rounded-xl transition-all ${showNotifications ? 'bg-white/10 text-indigo-400' : 'text-slate-500 hover:bg-white/5'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {notifications.some(n => !n.isRead) && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border-2 border-[var(--bg-main)]"></span>}
            </button>
            <button onClick={handleLogout} className="p-3 text-slate-500 hover:text-rose-400 transition-colors" title="Secure Termination">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
          
          {showNotifications && (
            <div className="absolute top-24 right-8 w-80 glass-ultra rounded-[2.5rem] border border-[var(--border-main)] shadow-2xl z-50 p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Vault Alerts</h4>
                <button onClick={() => setNotifications(prev => prev.map(n => ({...n, isRead: true})))} className="text-[8px] font-black uppercase text-slate-500 hover:text-indigo-400">Mark All Read</button>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scroll">
                {notifications.length > 0 ? notifications.map(n => (
                  <div key={n.id} className={`p-4 rounded-2xl border transition-all ${n.type === 'urgent' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-indigo-500/5 border-indigo-500/20'} ${n.isRead ? 'opacity-40' : 'shadow-lg shadow-indigo-500/5'}`}>
                    <p className="text-[11px] font-bold mb-2 leading-tight">{n.text}</p>
                    <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">{n.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                )) : <p className="text-center py-8 text-[10px] opacity-30 uppercase font-black">All protocols clear</p>}
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-10 scroll-smooth custom-scroll">
          <div className="max-w-5xl mx-auto">
            {viewMode === 'chat' && (
              currentChatSession ? (
                <div className="pb-40 animate-in slide-in-from-bottom-6 duration-500">
                  <LegalDisclaimer />
                  <div className="space-y-8">
                    {currentChatSession.messages.map(m => <ChatBubble key={m.id} message={m} />)}
                  </div>
                  {loading && <div className="p-6 glass-ultra rounded-3xl animate-pulse mt-8 max-w-xs text-[10px] font-black text-indigo-400 uppercase tracking-widest">Neural Orchestrator reasoning...</div>}
                  <div className="fixed bottom-0 left-16 md:left-64 right-0 p-10 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)] to-transparent pointer-events-none z-30">
                    <div className="max-w-4xl mx-auto pointer-events-auto"><InputArea onSendMessage={handleSendMessage} disabled={loading} /></div>
                  </div>
                </div>
              ) : (
                <div className="h-[65vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                  <div className={`w-24 h-24 rounded-[2.5rem] overflow-hidden mb-8 shadow-2xl shadow-indigo-500/10 group hover:scale-110 transition-transform duration-500`}>
                     {session.user.role === 'advocate' ? AdvocateAvatar : ClientAvatar}
                  </div>
                  <h1 className="text-5xl font-black mb-4 tracking-tighter uppercase">Welcome, {session.user.fullName.split(' ')[0]}</h1>
                  <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 mb-16">Establishing secure neural link...</p>
                  <div className="w-full max-w-2xl"><InputArea onSendMessage={handleSendMessage} disabled={loading} /></div>
                </div>
              )
            )}

            {viewMode === 'history' && (
              <div className="animate-in slide-in-from-bottom-8 duration-500">
                <div className="flex justify-between items-center mb-12">
                  <h3 className="text-4xl font-black uppercase tracking-tighter">Vault History</h3>
                  <button onClick={() => { setCurrentSessionId(null); setViewMode('chat'); }} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-600/20">Initialize Workspace</button>
                </div>
                
                <div className="space-y-4">
                  {chatSessions.length > 0 ? chatSessions.sort((a,b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt.getTime() - a.createdAt.getTime()).map(s => (
                    <div key={s.id} onClick={() => { setCurrentSessionId(s.id); setViewMode('chat'); }} className={`group p-6 glass-ultra rounded-[2.5rem] border transition-all cursor-pointer flex items-center justify-between ${currentSessionId === s.id ? 'border-indigo-500 shadow-xl' : 'border-[var(--border-main)] hover:border-indigo-500/50'}`}>
                      <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.isPinned ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-slate-400'}`}>
                          {s.isPinned ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v2.17l3.86 1.93a1 1 0 01.54.9V11a1 1 0 01-1 1h-3v4.17l.86.83a1 1 0 11-1.42 1.42L10 17.42l-.86.86a1 1 0 11-1.42-1.42l.86-.86V12H5.5a1 1 0 01-1-1V7.9a1 1 0 01.54-.9L9 4.17V3a1 1 0 011-1z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight mb-1 group-hover:text-indigo-400 transition-colors">{s.title || "Untracked session"}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.messages.length} interactions • {s.createdAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => togglePin(s.id, e)} className={`p-3 rounded-xl border border-white/5 ${s.isPinned ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 hover:text-white bg-white/5'}`}>{s.isPinned ? 'Unpin' : 'Pin'}</button>
                         <button onClick={(e) => deleteSession(s.id, e)} className="p-3 rounded-xl border border-white/5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all">Delete</button>
                      </div>
                    </div>
                  )) : <div className="py-32 text-center opacity-20 uppercase font-black text-sm tracking-[0.5em]">Workspace logs blank</div>}
                </div>
              </div>
            )}

            {viewMode === 'cases' && (
              <div className="animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-12">
                  <h3 className="text-4xl font-black uppercase tracking-tighter">Case Registry</h3>
                  <button onClick={() => setIsAddingCase(true)} className="px-8 py-3 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all">New Entry</button>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  {dailyCases.map(c => (
                    <div key={c.id} onClick={() => setSelectedCaseId(c.id)} className="p-8 glass-ultra rounded-[3rem] border border-[var(--border-main)] cursor-pointer hover:border-indigo-500/50 hover:shadow-2xl transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] -mr-10 -mt-10 group-hover:bg-indigo-500/10 duration-500"></div>
                      <div className="flex justify-between mb-4">
                        <div className="flex gap-2">
                          <span className="text-[8px] font-black uppercase bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-full">{c.caseType}</span>
                          <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">Sync Active</span>
                        </div>
                        <button onClick={(e) => deleteCase(c.id, e)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-500 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                      <h4 className="text-2xl font-black mb-3 leading-tight group-hover:text-indigo-400 transition-colors">{c.title}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">{c.court}</p>
                      <div className="flex justify-between items-center pt-6 border-t border-white/5 text-[10px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {c.nextHearingDate}
                        </div>
                        <div className="text-indigo-400">{c.time}</div>
                      </div>
                    </div>
                  ))}
                  {dailyCases.length === 0 && <div className="col-span-full py-32 text-center opacity-20 font-black uppercase tracking-widest">No profiles established</div>}
                </div>
              </div>
            )}

            {viewMode === 'settings' && (
              <div className="animate-in slide-in-from-bottom-8 duration-500 max-w-2xl mx-auto space-y-10">
                <h3 className="text-4xl font-black uppercase tracking-tighter">Vault Config</h3>
                
                <section className="p-8 glass-ultra rounded-[3rem] border border-[var(--border-main)] space-y-8">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 border-b border-white/5 pb-2">Appearance Node</h4>
                  <div className="flex items-center justify-between">
                    <div><p className="font-black uppercase text-xs">Color Scheme</p><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Adjust visual contrast</p></div>
                    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">{theme === 'dark' ? 'Dark' : 'Light'}</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="font-black uppercase text-xs">Font Scaling</p><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Workspace text density</p></div>
                    <select value={userSettings.fontSize} onChange={(e) => setUserSettings({...userSettings, fontSize: e.target.value as any})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-black uppercase outline-none">
                      <option value="small">Dense</option><option value="medium">Standard</option><option value="large">Spacious</option>
                    </select>
                  </div>
                </section>

                <section className="p-8 glass-ultra rounded-[3rem] border border-[var(--border-main)] space-y-8">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400 border-b border-white/5 pb-2">Neural Logic Node</h4>
                  <div className="flex items-center justify-between">
                    <div><p className="font-black uppercase text-xs">Legal Framework</p><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Preferred statutory logic</p></div>
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                       {['BNS', 'IPC'].map(f => (
                         <button key={f} onClick={() => setUserSettings({...userSettings, legalLogic: f as any})} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${userSettings.legalLogic === f ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{f}</button>
                       ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="font-black uppercase text-xs">Agent Verbosity</p><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Orchestrator detail depth</p></div>
                    <button onClick={() => setUserSettings({...userSettings, verbosity: userSettings.verbosity === 'detailed' ? 'concise' : 'detailed'})} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${userSettings.verbosity === 'detailed' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-white/10 text-slate-500'}`}>{userSettings.verbosity}</button>
                  </div>
                </section>

                <section className="p-8 glass-ultra rounded-[3rem] border border-rose-500/20 space-y-8">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400 border-b border-rose-500/10 pb-2">Security Node</h4>
                  <div className="flex items-center justify-between">
                    <div><p className="font-black uppercase text-xs">Auto-Sync Alert</p><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Real-time hearing push</p></div>
                    <input type="checkbox" checked={userSettings.notificationsEnabled} onChange={(e) => setUserSettings({...userSettings, notificationsEnabled: e.target.checked})} className="w-5 h-5 accent-rose-500" />
                  </div>
                  <button onClick={clearAllData} className="w-full py-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all">Emergency Purge Vault</button>
                </section>
              </div>
            )}

            {/* Selected Case Modal Overlay */}
            {selectedCaseId && viewMode === 'cases' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 animate-in fade-in duration-300">
                <div className="w-full max-w-6xl glass-ultra rounded-[4rem] p-12 overflow-y-auto max-h-[90vh] relative border border-white/10 shadow-2xl custom-scroll">
                  <button onClick={() => setSelectedCaseId(null)} className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 transition-all group">
                     <svg className="w-6 h-6 group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  
                  <div className="flex flex-col md:flex-row justify-between mb-16 gap-10">
                    <div className="flex-1">
                      <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter">{selectedCase?.title}</h2>
                      <div className="flex gap-4">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${session.user.role === 'advocate' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-fuchsia-500/20 text-fuchsia-400'}`}>{selectedCase?.caseType} Litigation</span>
                        <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Vault Protected</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Protocol Hearing</p>
                      <p className="text-3xl font-black tracking-tighter mb-1">{selectedCase?.nextHearingDate}</p>
                      <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest">{selectedCase?.time}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-12">
                      <section className="animate-in slide-in-from-left-4 duration-500">
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg"></div>Narrative Summary</h4>
                        <div className="p-10 bg-white/5 rounded-[3rem] border border-white/5 text-lg leading-relaxed text-slate-300 font-medium shadow-inner">
                          {selectedCase?.description}
                        </div>
                      </section>

                      <section className="animate-in slide-in-from-left-4 duration-700 delay-100">
                        <div className="flex justify-between items-center mb-8">
                          <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em] flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>AI Intelligence Node</h4>
                          {!researchData[selectedCaseId] && (
                            <button onClick={() => handleResearch(selectedCaseId)} disabled={isResearching} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${isResearching ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 shadow-lg shadow-emerald-500/10'}`}>
                              {isResearching ? 'Deep Searching...' : 'Research Precedents'}
                            </button>
                          )}
                        </div>
                        {researchData[selectedCaseId] && (
                          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="p-10 bg-emerald-500/5 border border-emerald-500/20 rounded-[3rem] space-y-6">
                              <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.3em]">Key Neural Insights</p>
                              <ul className="space-y-4">
                                {researchData[selectedCaseId].points.map((p:string, i:number) => (
                                  <li key={i} className="text-[15px] text-slate-200 leading-relaxed flex gap-4"><span className="text-emerald-500 font-black text-xl mt-[-2px]">»</span>{p}</li>
                                ))}
                              </ul>
                            </div>
                            {researchData[selectedCaseId].sources.length > 0 && (
                              <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Grounding Sources</p>
                                <div className="flex flex-wrap gap-3">
                                  {researchData[selectedCaseId].sources.map((s:any, i:number) => (
                                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-indigo-400 hover:bg-white/10 transition-all flex items-center gap-3 truncate max-w-xs shadow-sm">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>{s.title}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    </div>

                    <div className="space-y-12 animate-in slide-in-from-right-4 duration-700">
                      <section className="space-y-6">
                        <h4 className="text-[11px] font-black text-fuchsia-400 uppercase tracking-[0.4em] flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-fuchsia-500 shadow-lg shadow-fuchsia-500/50"></div>Mandatory Protocols</h4>
                        <div className="space-y-3">
                          {selectedCase?.requiredDocuments.map((d, i) => (
                            <div key={i} className="group p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all flex items-center gap-4 cursor-pointer">
                               <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                               <div className="flex-1"><p className="text-[11px] font-black uppercase tracking-widest">{d}</p><p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Pending Vault Sync</p></div>
                            </div>
                          ))}
                        </div>
                      </section>
                      <button onClick={(e) => { deleteCase(selectedCase!.id, e); }} className="w-full py-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all">Purge Profile</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isAddingCase && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 animate-in fade-in duration-300">
                <form onSubmit={handleAddCase} className="w-full max-w-2xl glass-ultra rounded-[4rem] p-12 space-y-8 relative border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scroll">
                  <button type="button" onClick={() => setIsAddingCase(false)} className="absolute top-10 right-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  <div className="text-center mb-4"><h2 className="text-3xl font-black uppercase tracking-tighter">Initialize Case Profile</h2><p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Personal Vault Entry</p></div>
                  <div className="space-y-6">
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Litigation Category</label><select required className="w-full bg-white/5 p-5 rounded-2xl text-[var(--text-main)] outline-none border border-white/10 focus:border-indigo-500 font-bold" value={newCaseForm.caseType} onChange={e => setNewCaseForm({ ...newCaseForm, caseType: e.target.value })}><option value="Civil">Civil Matter</option><option value="Criminal">Criminal Case</option><option value="Family">Family Law</option><option value="Corporate">Corporate Dispute</option><option value="Labor">Labor Court</option></select></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Case Alias</label><input required placeholder="Unique Alias..." className="w-full bg-white/5 p-5 rounded-2xl text-[var(--text-main)] outline-none border border-white/10 focus:border-indigo-500 font-bold" value={newCaseForm.title} onChange={e => setNewCaseForm({ ...newCaseForm, title: e.target.value })} /></div>
                    <div className="space-y-2 relative"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Narrative</label><textarea required placeholder="AI mapping description..." className="w-full bg-white/5 p-5 rounded-2xl text-[var(--text-main)] outline-none border border-white/10 focus:border-indigo-500 h-40 resize-none font-medium" value={newCaseForm.description} onChange={e => setNewCaseForm({ ...newCaseForm, description: e.target.value })} />{isSuggestingDocs && <div className="absolute bottom-4 right-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Mapping...</div>}</div>
                    {newCaseForm.requiredDocuments.length > 0 && <div className="space-y-4 pt-4 border-t border-white/5"><p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.3em]">AI Suggested Protocols</p><div className="flex flex-wrap gap-2">{newCaseForm.requiredDocuments.map((d, i) => <span key={i} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">{d}</span>)}</div></div>}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Hearing Date</label><input required type="date" className="w-full bg-white/5 p-5 rounded-2xl text-[var(--text-main)] outline-none border border-white/10 font-bold" value={newCaseForm.nextHearingDate} onChange={e => setNewCaseForm({ ...newCaseForm, nextHearingDate: e.target.value })} /></div>
                      <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Protocol Time</label><input required type="time" className="w-full bg-white/5 p-5 rounded-2xl text-[var(--text-main)] outline-none border border-white/10 font-bold" value={newCaseForm.time} onChange={e => setNewCaseForm({ ...newCaseForm, time: e.target.value })} /></div>
                    </div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Court Venue</label><input required placeholder="Court / Location..." className="w-full bg-white/5 p-5 rounded-2xl text-[var(--text-main)] outline-none border border-white/10 font-bold" value={newCaseForm.court} onChange={e => setNewCaseForm({ ...newCaseForm, court: e.target.value })} /></div>
                    <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl mt-6 hover:scale-[1.02] active:scale-95 transition-all">Establish Vault Profile</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        [data-theme="light"] .glass-ultra { background: rgba(255, 255, 255, 0.95); }
        [data-theme="light"] { --bg-main: #f8fafc; --text-main: #0f172a; --border-main: rgba(0, 0, 0, 0.08); }
        [data-theme="light"] .bg-white\\/5 { background: rgba(0, 0, 0, 0.04); }
        [data-theme="light"] .border-white\\/5 { border-color: rgba(0, 0, 0, 0.1); }
        [data-theme="light"] .text-white { color: #0f172a; }
        [data-theme="light"] aside h1, [data-theme="light"] header p, [data-theme="light"] .text-indigo-400, [data-theme="light"] .text-fuchsia-400 { color: #4f46e5; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
