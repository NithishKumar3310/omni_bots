
// Fix: Correctly import React from 'react' and remove incorrect 'border' import from types
import React from 'react';
import { Message, SafetyMetrics as SafetyMetricsType } from '../types';

interface ChatBubbleProps {
  message: Message;
}

const EdgeScoreboard: React.FC<{ metrics: SafetyMetricsType; agent: string }> = ({ metrics, agent }) => {
  const isRefusal = metrics.decision === 'REFUSAL' || metrics.decision === 'ESCALATE';
  const colorClass = isRefusal ? 'text-rose-400' : (metrics.confidence > 80 ? 'text-cyan-400' : 'text-amber-400');

  return (
    <div className="mt-8 p-6 rounded-[2rem] bg-slate-950/80 border border-white/10 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isRefusal ? 'bg-rose-500' : 'bg-cyan-500'}`}></div>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${colorClass}`}>
            LEXTRACK EDGE: {metrics.decision}
          </span>
        </div>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Agent: {agent}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Confidence Score</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${metrics.confidence}%` }}></div>
            </div>
            <span className="text-[10px] font-black text-white">{metrics.confidence}%</span>
          </div>
        </div>
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Legal Risk Index</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500" style={{ width: `${metrics.riskScore}%` }}></div>
            </div>
            <span className="text-[10px] font-black text-white">{metrics.riskScore}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {metrics.repealCheck !== 'n/a' && (
          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${metrics.repealCheck === 'passed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            Repeal Check: {metrics.repealCheck}
          </span>
        )}
        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${metrics.jurisdictionStatus === 'verified' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
          Jurisdiction: {metrics.jurisdictionStatus}
        </span>
      </div>

      {metrics.penaltyPrediction && (
        <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl mb-4">
          <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Financial Penalty Forecast</p>
          <p className="text-xs text-white font-medium">{metrics.penaltyPrediction}</p>
        </div>
      )}

      {metrics.evidenceGaps && metrics.evidenceGaps.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Missing Evidence Detected</p>
          <div className="space-y-1">
            {metrics.evidenceGaps.map((gap, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400 font-medium italic">
                <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                {gap}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('###')) return <h3 key={i} className="text-indigo-400 font-black text-xs uppercase tracking-widest mt-6 mb-3 flex items-center gap-2">{line.replace('###', '').trim()}</h3>;
      if (line.trim().startsWith('|')) {
         return <div key={i} className="my-4 overflow-x-auto"><p className="text-[11px] text-cyan-500 font-mono">{line}</p></div>;
      }
      return line.trim() ? <p key={i} className="mb-3 opacity-90 leading-relaxed text-[15px]">{line}</p> : null;
    });
  };

  return (
    <div className={`flex w-full mb-12 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative max-w-[90%] md:max-w-[80%] p-7 transition-all ${
        isUser 
          ? 'bg-gradient-to-br from-indigo-600 to-fuchsia-700 text-white rounded-[2rem] rounded-tr-none shadow-[0_15px_40px_rgba(79,70,229,0.3)]' 
          : 'glass-ultra border-l-4 border-l-cyan-500 text-slate-100 rounded-[2rem] rounded-tl-none'
      }`}>
        <div className={`absolute -top-7 ${isUser ? 'right-4' : 'left-4'} flex items-center gap-2`}>
           <div className={`w-2 h-2 rounded-full ${isUser ? 'bg-fuchsia-400' : 'bg-cyan-400 animate-pulse'}`}></div>
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {isUser ? 'Petitioner' : `LexTrack AI: ${message.agentUsed || 'Master'}`}
           </span>
        </div>

        <div className="legal-content">
          {message.content.includes('```') ? <pre className="whitespace-pre-wrap">{message.content.replace(/```/g, '')}</pre> : renderContent(message.content)}
        </div>

        {!isUser && message.safety && (
          <EdgeScoreboard metrics={message.safety} agent={message.agentUsed || 'Unknown'} />
        )}
      </div>
    </div>
  );
};
