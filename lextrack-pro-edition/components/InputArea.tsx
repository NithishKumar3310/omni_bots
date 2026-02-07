
import React, { useState, useRef, useEffect } from 'react';
import { FileAttachment } from '../types';

interface InputAreaProps {
  onSendMessage: (text: string, files: FileAttachment[]) => void;
  disabled?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, disabled }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((text.trim() || attachments.length > 0) && !disabled) {
      onSendMessage(text, attachments);
      setText('');
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const filePromise = new Promise<FileAttachment>((resolve) => {
        reader.onload = (event) => {
          resolve({
            name: file.name,
            type: file.type,
            data: event.target?.result as string
          });
        };
      });
      reader.readAsDataURL(file);
      newAttachments.push(await filePromise);
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 md:p-10 z-40 bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent">
      <div className="max-w-4xl mx-auto">
        <div className="neon-border overflow-hidden">
          {attachments.length > 0 && (
            <div className="px-5 py-4 border-b border-white/5 flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="group relative bg-cyan-500/10 border border-cyan-500/30 rounded-2xl px-4 py-2 flex items-center shadow-lg">
                  <span className="text-[10px] font-black text-cyan-300 uppercase tracking-tighter">{file.name}</span>
                  <button 
                    onClick={() => removeAttachment(idx)}
                    className="ml-3 text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-end gap-2 p-3">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,.pdf"
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 text-slate-400 hover:text-cyan-400 transition-all hover:bg-white/5 rounded-2xl flex-shrink-0"
              title="Attach Legal Documentation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for research, drafting, or procedural guidance..."
              rows={1}
              className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder-slate-500 py-4 px-2 text-[15px] font-semibold leading-relaxed resize-none scrollbar-none"
              disabled={disabled}
            />

            <button
              onClick={() => handleSubmit()}
              disabled={disabled || (!text.trim() && attachments.length === 0)}
              className={`p-4 rounded-2xl transition-all flex items-center justify-center min-w-[64px] h-[56px] ${
                disabled || (!text.trim() && attachments.length === 0)
                  ? 'bg-slate-800 text-slate-600'
                  : 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-[0_10px_30px_rgba(99,102,241,0.4)] hover:scale-105 active:scale-95'
              }`}
            >
              {disabled ? (
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <p className="text-center mt-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] opacity-50">
          Enter to send | Shift + Enter for new line
        </p>
      </div>
    </div>
  );
};
