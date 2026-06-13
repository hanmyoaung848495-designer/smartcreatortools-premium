import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, UserSession } from '../types';
import { Play, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void; isGradient?: boolean }> = ({ children, className, onClick, isGradient }) => (
  <div 
    onClick={onClick}
    className={`${isGradient ? 'tool-card-gradient' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'} rounded-2xl shadow-sm border overflow-hidden ${className}`}
  >
    {children}
  </div>
);

export const UsageCounter: React.FC<{ user?: UserProfile; limits: { app: number; own: number } }> = ({ user, limits }) => {
  if (!user) return null;
  return (
    <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-xl mb-4">
      <div className="flex items-center gap-1.5">
        <span className="text-blue-600 dark:text-blue-400">App API:</span>
        <span className="text-gray-900 dark:text-gray-100">{(user.usage?.appApiUsedToday) ?? 0} / {limits.app}</span>
      </div>
      <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
      <div className="flex items-center gap-1.5">
        <span className="text-blue-600 dark:text-blue-400">Own API:</span>
        <span className="text-gray-900 dark:text-gray-100">{(user.usage?.ownApiUsedToday) ?? 0} / {limits.own}</span>
      </div>
      <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
      <div className="flex items-center gap-1.5">
        <span className="text-blue-600 dark:text-blue-400">Credits:</span>
        <span className="text-gray-900 dark:text-gray-100">{user.credits ?? 0}</span>
      </div>
    </div>
  );
};

export const FadeMessages: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = useMemo(() => [
    "Free Plan တွင် တစ်ရက် ၂ ကြိမ်သာ ခွင့်ပြုထားပါသည်။",
    "ကြော်ငြာမပါဘဲ အကန့်အသတ်မရှိ သုံးနိုင်ရန် Premium Plan ကို ရယူပါ။"
  ], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className={`h-6 flex items-center ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={messageIndex}
          initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2.5"
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-indigo-500/30 blur-md rounded-full animate-pulse capitalize" />
            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 relative z-10 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
          </div>
          <p className="text-[10px] font-black tracking-[0.25em] bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
            {messages[messageIndex]}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const ApiKeyManager: React.FC<{
  session: UserSession;
  onUpdate: (updates: Partial<UserSession>) => void;
  onRequireLogin?: () => void;
}> = ({ session, onUpdate, onRequireLogin }) => {
  const [showAdminOnly, setShowAdminOnly] = useState(false);

  return (
    <div className="mb-6 flex flex-col gap-3 relative">
      <AnimatePresence>
        {showAdminOnly && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute -top-[35px] left-[70px] whitespace-nowrap bg-indigo-600 dark:bg-indigo-500 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md shadow-lg z-[1000] pointer-events-none border border-indigo-700/50"
          >
            Admin Only
          </motion.div>
        )}
      </AnimatePresence>
      <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden group shadow-sm">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-indigo-500/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-widest">API Engine:</label>
          <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-blue-100 dark:border-gray-700 relative">
            <button
              onClick={() => {
                if (session.role === 'free' && onRequireLogin) {
                  onRequireLogin();
                } else if (session.role !== 'admin') {
                  setShowAdminOnly(true);
                  setTimeout(() => setShowAdminOnly(false), 2000);
                } else {
                  onUpdate({ useCustomKey: false });
                }
              }}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all relative ${!session.useCustomKey ? 'tool-btn-gradient tool-btn-gradient-active text-blue-600 dark:text-blue-400 shadow-md' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
              System
            </button>

            <button
              onClick={() => onUpdate({ useCustomKey: true })}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${session.useCustomKey ? 'tool-btn-gradient tool-btn-gradient-active text-blue-600 dark:text-blue-400 shadow-md' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
              Own Key
            </button>
          </div>
        </div>
        
        <div className="flex-grow flex flex-col sm:flex-row items-center gap-4 w-full">
          {session.useCustomKey && (
            <input
              id="custom-api-key-input"
              type="password"
              placeholder="Paste your Gemini API Key here..."
              value={session.customApiKey || ''}
              onChange={(e) => onUpdate({ customApiKey: e.target.value })}
              className="flex-grow w-full px-4 py-2 text-xs rounded-xl border border-blue-200 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100"
            />
          )}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <TutorialButton videoId="sGHe7nhThwo" timestamp="30" label="API Key ယူနည်း" toolKey="api_key" hideMessages session={session} />
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-[10px] h-[36px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase rounded-xl transition-all whitespace-nowrap shadow-sm shadow-indigo-100 dark:shadow-none"
            >
              Get API Key 🔑
            </a>
          </div>
        </div>
      </div>

      {session?.role === 'free' && (
        <div className="flex items-center justify-center sm:justify-start px-2">
          <FadeMessages />
        </div>
      )}
    </div>
  );
};


export const ProgressBar: React.FC<{ progress: number; label?: string; color?: string }> = ({ progress, label, color = "bg-indigo-600" }) => (
  <div className="w-full">
    {(label || progress > 0) && (
      <div className="flex justify-between mb-1.5 px-1">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
      </div>
    )}
    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-300 ease-out rounded-full`} 
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

export const Button: React.FC<{
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ onClick, children, variant = 'primary', className, disabled, type = 'button' }) => {
  const baseStyle = "px-6 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none",
    secondary: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-100 dark:shadow-none",
    ghost: "bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700",
    gradient: "tool-btn-gradient tool-btn-gradient-active text-indigo-600 shadow-md"
  };
  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

export const Input: React.FC<{
  label?: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}> = ({ label, type = 'text', value, onChange, placeholder, className, disabled, required }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50"
    />
  </div>
);

export const TextArea: React.FC<{
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}> = ({ label, value, onChange, placeholder, rows = 4, className = "", onFocus, onBlur }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={rows}
      className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none bg-white dark:bg-gray-800 dark:text-gray-100"
    />
  </div>
);

export const Select: React.FC<{
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}> = ({ label, value, onChange, options, placeholder = "Select option" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="flex flex-col gap-1.5 relative">
      {label && <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm transition-all hover:border-indigo-400 dark:hover:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
      >
        <span className={selectedOption ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400"
        >
          <Minus size={14} className="rotate-90" />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[310]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 5, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 z-[320] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto subtle-scrollbar p-1.5"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${
                    value === opt.value 
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold" 
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  {opt.label}
                  {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ResultBox: React.FC<{
  title: string;
  content: string;
  onCopy: () => void;
  onDownload?: () => void;
  onClear?: () => void;
  loading?: boolean;
}> = ({ title, content, onCopy, onDownload, onClear, loading }) => {
  if (loading) return (
    <div className="mt-8 p-12 bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 dark:text-gray-400 animate-pulse font-medium">Processing your request...</p>
    </div>
  );

  if (!content) return null;

  return (
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 truncate pr-2">{title}</h3>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={onCopy} className="text-[10px] h-8 px-3 uppercase font-bold tracking-widest whitespace-nowrap">
            📋 Copy
          </Button>
          {onDownload && (
            <Button variant="primary" onClick={onDownload} className="text-[10px] h-8 px-3 uppercase font-bold tracking-widest whitespace-nowrap">
              💾 Download
            </Button>
          )}
          {onClear && (
            <Button variant="ghost" onClick={onClear} className="text-[10px] h-8 px-3 uppercase font-bold tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 whitespace-nowrap">
              🗑️ Clear
            </Button>
          )}
        </div>
      </div>
      <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-auto max-h-[500px] whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
        {content}
      </div>
    </div>
  );
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  hideClose?: boolean;
  hideBottomClose?: boolean;
  maxWidth?: string;
  compact?: boolean;
  contentClassName?: string;
  containerClassName?: string;
  isAnimated?: boolean;
}> = ({ isOpen, onClose, title, children, hideClose, hideBottomClose, maxWidth = "max-w-2xl", compact, contentClassName = "", containerClassName = "", isAnimated }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`relative ${isAnimated ? 'p-[2px] animate-gradient-border-premium' : ''} bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full ${maxWidth} max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ${containerClassName}`}>
        <div className={`relative z-10 flex flex-col h-full bg-white dark:bg-gray-800 rounded-[calc(1.5rem-2px)] overflow-hidden`}>
          <div className={`flex items-center justify-between ${compact ? 'p-3 px-6' : 'p-6'} border-b border-gray-100 dark:border-gray-700`}>
            <h3 className={`${compact ? 'text-xs uppercase tracking-widest' : 'text-xl'} font-bold text-gray-900 dark:text-gray-100`}>{title}</h3>
            {!hideClose && (
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <span className={`${compact ? 'text-xl' : 'text-2xl'} leading-none dark:text-gray-300`}>&times;</span>
              </button>
            )}
          </div>
          <div className={`${compact ? 'p-0' : 'p-8'} overflow-y-auto text-gray-600 dark:text-gray-300 leading-relaxed text-sm ${contentClassName}`}>
            {children}
          </div>
          {!hideClose && !hideBottomClose && !compact && (
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <Button onClick={onClose} className="text-xs font-bold uppercase tracking-widest">Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const YouTubeEmbed: React.FC<{ videoId: string; timestamp?: string; autoplay?: boolean }> = ({ videoId, timestamp, autoplay = false }) => {
  const start = timestamp ? parseInt(timestamp) : 0;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${start}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&color=white&autoplay=${autoplay ? 1 : 0}`;

  return (
    <div className="relative w-full aspect-video overflow-hidden bg-black shadow-inner group">
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Tutorial Video"
        loading="lazy"
      />
    </div>
  );
};

export const TutorialButton: React.FC<{ videoId: string; timestamp?: string; iconOnly?: boolean; label?: string; toolKey?: string; hideMessages?: boolean; session?: UserSession }> = ({ videoId, timestamp, iconOnly, label = "Tutorial", toolKey, hideMessages, session }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [dynamicVideo, setDynamicVideo] = useState<{id: string, start: string} | null>(null);

  useEffect(() => {
    const fetchToolTutorial = async () => {
      if (!supabase || !toolKey) return;
      const { data, error } = await supabase
        .from('tutorials')
        .select('video_id, time_start')
        .eq('tool_key', toolKey)
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        setDynamicVideo({ id: data.video_id, start: data.time_start?.toString() || '0' });
      }
    };
    fetchToolTutorial();
  }, [toolKey]);

  const finalVideoId = dynamicVideo?.id || videoId;
  const finalTimestamp = dynamicVideo?.start || timestamp;

  return (
    <div className={`flex flex-col items-start ${hideMessages ? '' : 'gap-2'}`}>
      {iconOnly ? (
        <button 
          onClick={() => setIsOpen(true)} 
          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
          title={label}
        >
          <Play size={20} className="fill-current" />
        </button>
      ) : (
        <Button variant="secondary" onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase whitespace-nowrap">
          <Play size={12} className="fill-current" /> {label}
        </Button>
      )}

      {!iconOnly && !hideMessages && session?.role === 'free' && (
        <FadeMessages />
      )}

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={label}
        maxWidth="max-w-4xl"
        compact={true}
      >
        <YouTubeEmbed videoId={finalVideoId} timestamp={finalTimestamp} />
      </Modal>
    </div>
  );
};

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", variant = 'primary' }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md" hideBottomClose>
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">{message}</p>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} className="text-xs font-bold uppercase tracking-widest">
            {cancelText}
          </Button>
          <Button 
            variant={variant} 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className="text-xs font-bold uppercase tracking-widest"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
