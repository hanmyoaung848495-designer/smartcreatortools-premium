
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FeatureType, AdminSettings, UserSession, ActivityRecord, StoredResult, ProcessingTask } from './types';
import { FEATURES, DEFAULT_ADMIN_SETTINGS } from './constants';
import { Card, Button, ProgressBar, ApiKeyManager, Modal, ConfirmModal } from './components/Shared';
import Transcribe from './features/Transcribe';
import Translate from './features/Translate';
import SRTTranslate from './features/SRTTranslate';
import SubGenerator from './features/SubGenerator';
import TextToSRT from './features/TextToSRT';
import TeleprompterFeature from './features/Teleprompter';
import AIVoice from './features/AIVoice';
import Tutorial from './features/Tutorial';
import APIGuide from './features/APIGuide';
import NotePad from './features/NotePad';
import CodeEditor from './features/CodeEditor';
import Pricing from './features/Pricing';
import AdminDashboard from './features/AdminDashboard';
import { getUserTierName } from './lib/tier';
import MusicPlayer from './components/MusicPlayer';
import LandingScreen from './components/LandingScreen';
import PersistentResults from './components/PersistentResults';
import { FeedbackModal } from './components/FeedbackModal';

import { Menu, X, BookOpen, User, Home as HomeIcon, Zap, Send, Sun, Moon, CheckCircle, XCircle, Eye, EyeOff, Shield, FileText, Download, Crown } from 'lucide-react';
import { trackEvent } from './lib/analytics';
import { Toaster, toast } from 'sonner';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<FeatureType>('home');
  
  useEffect(() => {
    if (activeFeature !== 'home') {
      trackEvent('view_tool', activeFeature);
    } else {
      trackEvent('visit', 'home');
    }
  }, [activeFeature]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  });
  const [settings] = useState<AdminSettings>({
    ...DEFAULT_ADMIN_SETTINGS,
    welcomeMessage: "သူငယ်ချင်းတို့မင်္ဂလာပါ!",
    footerText: "Contentတွေလုပ်ရတာအဆင်ပြေအောင် စမ်းသပ်ဖန်တီးထားတဲ့ Web APPလေးဖြစ်ပါတယ်။ သုံးမယ်ဆိုရင် Own Keyကိုနှိပ်ပြီး API KEYထည့်သုံးလို့ရပါတယ်။ Text to SRT နဲ့ Teleprompter ကတော့ API keyမလိုဘဲသုံးလို့ရပါတယ်။",
  });
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  const [session, setSession] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem('smart_creator_session');
      if (saved && saved.trim() !== 'undefined' && saved.trim() !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // If they have a custom key, keep it as custom. 
          // If they don't have a custom key and were on the old 'System' default, 
          // we used to force them to 'Own Key' to prompt them.
          // But now we have a proper system login, so we can be more flexible.
          if (parsed.useCustomKey === undefined) {
            parsed.useCustomKey = true;
          }
          if (parsed.user && !parsed.user.usage) {
            parsed.user.usage = { appApiUsedToday: 0, ownApiUsedToday: 0, lastResetDate: new Date().toDateString() };
          }
          if (parsed.role === 'free') {
            parsed.user = undefined;
            parsed.adminAuth = undefined;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to parse session from localStorage", e);
    }
    return { role: 'free', useCustomKey: true, customApiKey: '' };
  });
  
  const [results, setResults] = useState<StoredResult[]>(() => {
    try {
      const saved = localStorage.getItem('smart_creator_results');
      if (saved && saved.trim() !== 'undefined' && saved.trim() !== 'null') {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (e) {
      console.error("Failed to parse results from localStorage", e);
      return [];
    }
  });

  const [tasks, setTasks] = useState<ProcessingTask[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [modalType, setModalType] = useState<'privacy' | 'terms' | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const [showLanding, setShowLanding] = useState(!session.user);

  const handleTermsAgree = () => {
    if (doNotShowAgain) {
      localStorage.setItem('terms_accepted', 'true');
    }
    setShowWelcomePopup(false);
  };
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [toastMessage, setToastMessage] = useState<{title: string, type: 'success' | 'error'} | null>(null);
  const [showTasksDropdown, setShowTasksDropdown] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [pendingDownload, setPendingDownload] = useState<StoredResult | null>(null);
  const [confirmClear, setConfirmClear] = useState<{ isOpen: boolean, type: FeatureType | null }>({ isOpen: false, type: null });

  const handleSystemLogin = async () => {
    try {
      const { getDeviceId } = await import('./lib/device');
      const deviceId = getDeviceId();
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loginId, password: loginPass, deviceId })
      });

      if (response.ok) {
        const { apiKey, allApiKeys, role, user } = await response.json();
        handleUpdateSession({ 
          useCustomKey: role !== 'admin', 
          systemApiKey: apiKey,
          allApiKeys: allApiKeys,
          role: role || 'premium',
          user: user,
          adminAuth: (role === 'admin') ? { id: loginId, pass: loginPass } : undefined
        });
        setShowLoginModal(false);
        if (!localStorage.getItem('terms_accepted')) {
          setShowWelcomePopup(true);
        }
        setLoginId('');
        setLoginPass('');
        setLoginError('');
        setToastMessage({ title: 'Login အောင်မြင်ပါတယ်။ System APIကိုသုံးလို့ရပါပြီ', type: 'success' });
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        const { error } = await response.json();
        setLoginError(error || 'Password or IDမှားနေပါတယ်');
      }
    } catch (error) {
      setLoginError('Server နှင့် ချိတ်ဆက်၍မရပါ');
    }
  };

  useEffect(() => {
    const handleFallback = (e: any) => {
      const { newModel } = e.detail;
      setToastMessage({ 
        title: `Limit ပြည့်သွားသဖြင့် ${newModel} သို့ အလိုအလျောက် ပြောင်းလဲအသုံးပြုထားပါသည်။`, 
        type: 'success' 
      });
      setTimeout(() => setToastMessage(null), 5000);
    };
    window.addEventListener('gemini-fallback', handleFallback);
    return () => window.removeEventListener('gemini-fallback', handleFallback);
  }, []);

  useEffect(() => {
    if (!session.user) {
      setShowLanding(true);
    }
  }, []);

  useEffect(() => {
      if (session.user && !localStorage.getItem('terms_accepted')) {
          setShowWelcomePopup(true);
      }
  }, [session.user]);

  useEffect(() => {
    localStorage.setItem('smart_creator_session', JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    localStorage.setItem('smart_creator_results', JSON.stringify(results));
  }, [results]);

  const addResult = useCallback((result: Omit<StoredResult, 'id' | 'timestamp'>) => {
    const newResult: StoredResult = {
      ...result,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    setResults(prev => [newResult, ...prev]);
  }, []);

  const deleteResult = useCallback((id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearResultsByType = useCallback((type: FeatureType) => {
    setConfirmClear({ isOpen: true, type });
  }, []);

  const handleConfirmClear = () => {
    if (confirmClear.type) {
      setResults(prev => prev.filter(r => r.type !== confirmClear.type));
      toast.success(`${confirmClear.type.replace('-', ' ')} history cleared!`, {
        icon: '🗑️',
        style: { borderRadius: '1rem' }
      });
    }
  };

  const copyResult = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard!', {
      icon: '📋',
      style: { borderRadius: '1rem' }
    });
  }, []);

  const executeDownload = (result: StoredResult) => {
    const blob = new Blob([result.content], { type: result.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName || `result_${result.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedIds(prev => new Set(prev).add(result.id));
    toast.success('Download started!', {
      icon: '📥',
      style: { borderRadius: '1rem' }
    });
  };

  const downloadResult = useCallback((result: StoredResult) => {
    if (downloadedIds.has(result.id)) {
      setPendingDownload(result);
    } else {
      executeDownload(result);
    }
  }, [downloadedIds]);

  const updateTask = useCallback((id: string, updates: Partial<ProcessingTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const cancelTask = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isCanceled: true, status: 'failed', error: 'Canceled by user' } : t));
    // We keep it in state briefly so the IIFE can see it's canceled, or we can remove it immediately
    // but the user wants it to not show in UI. 
    // Let's filter it out from active tasks.
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const logActivity = useCallback((type: FeatureType, description: string) => {
    if (!session.user) return;
    const record: ActivityRecord = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: Date.now(),
      description
    };
    setSession(prev => ({
      ...prev,
      user: prev.user ? {
        ...prev.user,
        history: [record, ...prev.user.history].slice(0, 50)
      } : undefined
    }));
  }, [session.user]);

  useEffect(() => {
    const checkDeviceSession = async () => {
      if (!session.user?.username || session.role === 'free') return;
      try {
        const { getDeviceId } = await import('./lib/device');
        const deviceId = getDeviceId();
        const response = await fetch('/api/check-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: session.user.username, deviceId })
        });
        if (response.ok) {
          const { valid } = await response.json();
          if (!valid) {
            handleUpdateSession({ useCustomKey: true, role: 'free', systemApiKey: undefined, user: undefined, adminAuth: undefined });
            toast.error('Session expired or device changed. Please login again.');
            if (activeFeature === 'admin') setActiveFeature('home');
          }
        }
      } catch (e) {
        console.error('Failed to check device status', e);
      }
    };

    checkDeviceSession();
    
    // Poll every 1 minute
    const intervalId = setInterval(checkDeviceSession, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [session.user?.username, session.role, activeFeature]);

  const startTask = useCallback((type: FeatureType, title: string, runAction: (taskId: string) => Promise<any>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newTask: ProcessingTask = {
      id,
      type,
      title,
      status: 'uploading',
      progress: 0,
      timestamp: Date.now()
    };
    
    setTasks(prev => [newTask, ...prev]);

    (async () => {
      try {
        for (let p = 0; p <= 30; p += 10) {
          const currentTask = tasks.find(t => t.id === id);
          if (currentTask?.isCanceled) return;
          
          updateTask(id, { progress: p });
          await new Promise(r => setTimeout(r, 100));
        }

        updateTask(id, { status: 'processing', progress: 40 });
        const result = await runAction(id);
        
        // Final check before state updates
        setTasks(currentTasks => {
          const task = currentTasks.find(t => t.id === id);
          if (task?.isCanceled) return currentTasks;
          
          if (session.user) {
            logActivity(type, `Finished: ${title}`);
          }
          
          return currentTasks.map(t => t.id === id ? { ...t, status: 'completed', progress: 100, result } : t);
        });
      } catch (err: any) {
        setTasks(currentTasks => {
          const task = currentTasks.find(t => t.id === id);
          if (task?.isCanceled) return currentTasks;
          return currentTasks.map(t => t.id === id ? { ...t, status: 'failed', error: err.message || 'Processing error' } : t);
        });
      }
    })();
  }, [updateTask, session, logActivity, tasks]);

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'completed' && t.status !== 'failed' && !t.isCanceled), [tasks]);

  const handleUpdateSession = useCallback((updates: Partial<UserSession>) => {
    setSession(prev => {
      const newSession = { ...prev, ...updates };
      (window as any).userSession = newSession;
      return newSession;
    });
  }, []);

  const renderActiveFeature = () => {
    const commonProps = { 
      session, 
      onSaveResult: addResult,
      onStartTask: startTask,
      onUpdateSession: handleUpdateSession,
      results,
      onDeleteResult: deleteResult,
      onClearResults: clearResultsByType,
      onCopyResult: copyResult,
      onDownloadResult: downloadResult,
      tasks: tasks,
      onBack: () => setActiveFeature('home'),
      onRequireApiKey: () => setShowApiKeyPopup(true)
    };

    switch (activeFeature) {
      case 'home': return <Home onSelect={setActiveFeature} settings={settings} activeTasks={activeTasks} session={session} onUpdateSession={handleUpdateSession} onRequireLogin={() => setShowLoginModal(true)} />;
      case 'transcribe': return <Transcribe {...commonProps} />;
      case 'translate': return <Translate {...commonProps} />;
      case 'srt-translate': return <SRTTranslate {...commonProps} />;
      case 'sub-generator': return <SubGenerator {...commonProps} />;
      case 'text-to-srt': return <TextToSRT {...commonProps} />;
      case 'teleprompter': return <TeleprompterFeature onBack={() => setActiveFeature('home')} session={session} onRequireApiKey={() => setShowApiKeyPopup(true)} />;
      case 'ai-voice': return <AIVoice {...commonProps} />;
      case 'api-guide': return <APIGuide onBack={() => setActiveFeature('home')} />;
      case 'tutorial': return <Tutorial onBack={() => setActiveFeature('home')} />;
      case 'note-pad': return <NotePad onBack={() => setActiveFeature('home')} />;
      case 'code-editor': return <CodeEditor onBack={() => setActiveFeature('home')} />;
      case 'pricing': return <Pricing onBack={() => setActiveFeature('home')} onToggleMenu={toggleMenu} session={session} />;
      case 'admin': 
        if (session.role !== 'admin') {
          return <Home onSelect={setActiveFeature} settings={settings} activeTasks={activeTasks} session={session} onUpdateSession={handleUpdateSession} onRequireLogin={() => setShowLoginModal(true)} />;
        }
        return <AdminDashboard onBack={() => setActiveFeature('home')} session={session} />;
      default: return <Home onSelect={setActiveFeature} settings={settings} activeTasks={activeTasks} session={session} onUpdateSession={handleUpdateSession} onRequireLogin={() => setShowLoginModal(true)} />;
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navigateTo = (feature: FeatureType) => {
    setActiveFeature(feature);
    setIsMenuOpen(false);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${isDarkMode ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
      <Toaster position="top-center" richColors closeButton />
      
      {!session.user && showLanding && (
        <LandingScreen 
          onLoginClick={() => {
            setShowLanding(false);
            setShowLoginModal(true);
          }} 
        />
      )}
      
      <ConfirmModal
        isOpen={confirmClear.isOpen}
        onClose={() => setConfirmClear({ isOpen: false, type: null })}
        onConfirm={handleConfirmClear}
        title="Clear History"
        message={`Are you sure you want to clear all ${confirmClear.type?.replace('-', ' ')} history forever?`}
        confirmText="Clear All"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!pendingDownload}
        onClose={() => setPendingDownload(null)}
        onConfirm={() => pendingDownload && executeDownload(pendingDownload)}
        title="Download Again?"
        message={`You have already downloaded "${pendingDownload?.fileName || 'this file'}". Do you want to download it again?`}
        confirmText="Download Again"
        variant="primary"
      />

      {showTutorial && <Tutorial onBack={() => { setShowTutorial(false); localStorage.setItem('smart_creator_onboarded', 'true'); }} />}
      
      {showProfileModal && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-indigo-100 dark:border-gray-700 shadow-xl shadow-indigo-500/5 relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest text-xs">Profile</h3>
                <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg">
                  {session.user ? session.user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                    {session.user ? session.user.name : 'System Admin'}
                  </h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    @{session.user ? session.user.username : 'admin'}
                  </p>
                </div>
                <div className="ml-auto bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 shrink-0">
                  <Crown size={12} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{session.user ? getUserTierName(session.user) : getUserTierName(session)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Expiry</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    {session.user ? (session.user.isLifetime ? 'Lifetime' : session.user.expiredDate ? new Date(session.user.expiredDate).toLocaleDateString() : 'Not set') : 'System'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Link Transcription</p>
                  <p className={`text-xs font-bold ${(session.user?.linkTranscribeExpiry && session.user.linkTranscribeExpiry < Date.now()) ? 'text-red-500' : 'text-emerald-600'}`}>
                    {session.user ? (session.user.linkTranscribeExpiry ? new Date(session.user.linkTranscribeExpiry).toLocaleDateString() : 'Not Set') : 'Unlimited'}
                  </p>
                </div>
              </div>

              <button 
                onClick={async () => {
                  try {
                    const { getDeviceId } = await import('./lib/device');
                    const deviceId = getDeviceId();
                    if (session.user?.username) {
                      await fetch('/api/logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: session.user.username, deviceId })
                      });
                    }
                  } catch (err) {
                    console.error('Logout error:', err);
                  }
                  handleUpdateSession({ useCustomKey: true, role: 'free', systemApiKey: undefined, user: undefined, adminAuth: undefined });
                  setToastMessage({ title: 'Logout အောင်မြင်ပါတယ်။', type: 'success' });
                  setTimeout(() => setToastMessage(null), 3000);
                  setShowProfileModal(false);
                  if (activeFeature === 'admin') {
                    setActiveFeature('home');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                <User size={18} /> Logout
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={toggleMenu}>
          <div 
            className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 shadow-2xl p-6 animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest text-xs">Menu</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  {isDarkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-500" />}
                </button>
                <button onClick={toggleMenu} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => navigateTo('home')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeFeature === 'home' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <HomeIcon size={18} className="text-blue-500" /> Home
              </button>
              <button 
                onClick={() => navigateTo('pricing')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeFeature === 'pricing' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <Crown size={18} className="text-pink-500" /> Premium Plan
              </button>
              <button 
                onClick={() => navigateTo('tutorial')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeFeature === 'tutorial' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <BookOpen size={18} className="text-emerald-500" /> Tutorial
              </button>
              <button 
                onClick={() => navigateTo('api-guide')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeFeature === 'api-guide' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <Zap size={18} className="text-amber-500" /> API Guide
              </button>
              <a 
                href="https://t.me/kcteamofficialbot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                <Send size={18} className="text-sky-500" /> Contact
              </a>
              {session.role !== 'free' ? (
                  <button 
                  onClick={() => {
                    setShowProfileModal(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <User size={18} className="text-emerald-500" /> Profile
                </button>
              ) : (
                <button 
                  onClick={() => { setShowLoginModal(true); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <User size={18} className="text-purple-500" /> System Login
                </button>
              )}
              {session.role === 'admin' && (
                <button 
                  onClick={() => navigateTo('admin')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeFeature === 'admin' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <Shield size={18} className="text-orange-500" /> Admin Dashboard
                </button>
              )}
            </div>

            <div className="absolute bottom-8 left-6 right-6">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-1">Version 1.0.4</p>
                <p className="text-[10px] text-indigo-400 italic">Smart Creator Tools</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showLoginModal}
        title={<span className="bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500 bg-clip-text text-transparent">System Login</span>}
        maxWidth="max-w-sm"
        hideClose={true}
        isAnimated={true}
      >
        <div className="space-y-4">
          <p className="text-sm font-bold bg-gradient-to-r from-indigo-500 to-teal-500 bg-clip-text text-transparent">
            Premium Website ကိုအသုံးပြုရန် Log in ဝင်ပါ။
          </p>
          
          {loginError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
              <XCircle size={16} />
              {loginError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ID</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Enter ID"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSystemLogin()}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Enter Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowLoginModal(false);
                setLoginId('');
                setLoginPass('');
                setLoginError('');
                setShowLanding(true);
              }} 
              className="flex-1 py-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Back
            </Button>
            <Button onClick={handleSystemLogin} className="flex-1 py-3">
              Login
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showWelcomePopup}
        onClose={() => setShowWelcomePopup(false)}
        title="Terms of Service"
        hideClose={true}
        maxWidth="max-w-sm"
      >
        <div className="space-y-6 py-2 flex flex-col items-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-2xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700">
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#1877F2]">
                <span className="font-black text-lg text-[#FFD700] leading-none">$</span>
              </div>
            )}
          </div>
          
          <div className="text-center space-y-0.5">
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Smart Creator Tools</h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Designed and Developed</p>
            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">By KC Team</p>
          </div>
          
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm text-center font-medium">
            ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုသည် KC TTS & SRT အတွက်သာအဓိကဖြစ်ပြီး အခြားသော Tool များသည် မေတ္တာလက်ဆောင် အဖြစ်ဖန်တီးပေးထားခြင်းဖြစ်ပါသည်။ "KC TTS & SRT Plan" တွင် KC Voice နှင့် SRT ဝန်ဆောင်မှုတို့သာ သီးသန့်အကျုံးဝင်မည်ဖြစ်ပါသည်။
          </p>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={doNotShowAgain}
              onChange={() => setDoNotShowAgain(!doNotShowAgain)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">Do Not Show Again</span>
          </label>
          
          <div className="w-full pt-2">
            <Button onClick={handleTermsAgree} className="w-full py-3 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none text-xs">
              Agree
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showApiKeyPopup}
        onClose={() => setShowApiKeyPopup(false)}
        title="API Key လိုအပ်ပါသည်"
        maxWidth="max-w-sm"
        hideBottomClose={true}
      >
        <div className="space-y-4 py-2">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            ဒီ Tool ကိုအသုံးပြုရန် သင့်ကိုယ်ပိုင် Gemini API Key ထည့်သွင်းရန် လိုအပ်ပါသည်။
          </p>
          <div className="flex justify-end pt-2">
            <Button 
              onClick={() => { 
                setShowApiKeyPopup(false); 
                setActiveFeature('home'); 
                handleUpdateSession({ useCustomKey: true });
                setTimeout(() => {
                  document.getElementById('custom-api-key-input')?.focus();
                }, 100);
              }} 
              className="py-2 px-4 text-xs"
            >
              Add API
            </Button>
          </div>
        </div>
      </Modal>
      
      <Modal 
        isOpen={modalType !== null} 
        onClose={() => setModalType(null)} 
        title={modalType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
      >
        {modalType === 'privacy' ? (
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <p>သင်၏ ကိုယ်ရေးအချက်အလက်များကို ကျွန်ုပ်တို့ အထူးဂရုပြုပါသည်။ Smart Creator Tools သည် သင်နှင့် Google AI Studio အကြား ချိတ်ဆက်ပေးသော ကြားခံဝန်ဆောင်မှုတစ်ခုသာဖြစ်ပါသည်။</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">၁။ အချက်အလက်များ သိမ်းဆည်းမထားခြင်း</h4>
            <p>ကျွန်ုပ်တို့သည် သင်အသုံးပြုသည့် အချက်အလက်များကို သိမ်းဆည်းခြင်း၊ မှတ်တမ်းတင်ခြင်း သို့မဟုတ် ထိန်းသိမ်းထားခြင်း မရှိပါ။ သင်၏ ဖန်တီးမှုများသည် သင်၏ဘရောက်ဆာနှင့် Google AI Studio အကြားတွင်သာ တိုက်ရိုက်လုပ်ဆောင်ခြင်းဖြစ်ပါသည်။</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">၂။ ကြားခံဝန်ဆောင်မှု</h4>
            <p>ဤဝဘ်ဆိုက်သည် Google AI Studio ကို အဆင်ပြေစွာ အသုံးပြုနိုင်ရန် ကြားခံဝန်ဆောင်မှုတစ်ခုသာ ဖြစ်ပါသည်။</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">၃။ လုံခြုံရေး</h4>
            <p>အချက်အလက်များ သိမ်းဆည်းထားခြင်း မရှိသည့်အတွက် ဒေတာပေါက်ကြားနိုင်ခြေ မရှိသလောက် နည်းပါးပါသည်။ သင့်ကိုယ်ပိုင် API Keys များကို လုံခြုံစွာထားရှိရန် တိုက်တွန်းလိုပါသည်။</p>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Smart Creator Tools ကို အသုံးပြုခြင်းအားဖြင့် အောက်ပါစည်းကမ်းချက်များကို သဘောတူညီပြီးဖြစ်ပါသည်။</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">၁။ အသုံးပြုမှု</h4>
            <p>သင်ဖန်တီးလိုက်သော အကြောင်းအရာများအတွက် သင်ကိုယ်တိုင် တာဝန်ယူရမည်ဖြစ်ပြီး Google ၏ AI စည်းကမ်းချက်များနှင့်အညီ ဖြစ်ရပါမည်။</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">၂။ API Keys</h4>
            <p>သင့်ကိုယ်ပိုင် API Keys များ၏ လုံခြုံမှုအတွက် သင်ကိုယ်တိုင်သာ တာဝန်ယူရမည် ဖြစ်ပါသည်။</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">၃။ တာဝန်ယူမှု</h4>
            <p>ဤဝန်ဆောင်မှုကို "ရှိသည့်အတိုင်း" သာ ဖန်တီးပေးထားပါသည်။ အနှောင့်အယှက်ကင်းသည့် ဝန်ဆောင်မှု သို့မဟုတ် တိကျသော ရလဒ်များအတွက် အာမခံချက်မပေးနိုင်ပါ။</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">၄။ Service Scope and Plan Coverage</h4>
            <p>ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုသည် KC TTS & SRT အတွက်သာအဓိကဖြစ်ပြီး အခြားသော Tool များသည် မေတ္တာလက်ဆောင် အဖြစ်ဖန်တီးပေးထားခြင်းဖြစ်ပါသည်။ "KC TTS & SRT Plan" တွင် KC Voice နှင့် SRT ဝန်ဆောင်မှုတို့သာ သီးသန့်အကျုံးဝင်မည်ဖြစ်ပါသည်။</p>
          </div>
        )}
      </Modal>

      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveFeature('home')}>
                <div className="w-9 h-9 flex items-center justify-center rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
                  {!logoError ? (
                    <img 
                      src="/logo.png" 
                      alt="Logo" 
                      className="w-full h-full object-cover"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1877F2]">
                      <span className="font-black text-sm text-[#FFD700] leading-none">$</span>
                    </div>
                  )}
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-gray-100">{settings.appLogo}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            {activeTasks.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setShowTasksDropdown(!showTasksDropdown)}
                  className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 rounded-full border border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all"
                >
                  <span className={`w-2 h-2 bg-amber-500 rounded-full ${activeTasks.length > 0 ? 'animate-pulse' : ''}`}></span>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest">{activeTasks.length} Task{activeTasks.length > 1 ? 's' : ''}</span>
                </button>

                <AnimatePresence>
                  {showTasksDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowTasksDropdown(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
                      >
                        <div className="p-3 border-b border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Tasks</h4>
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[8px] font-bold rounded uppercase">Running</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {activeTasks.length > 0 ? (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                              {activeTasks.map(task => (
                                <div key={task.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate pr-2">{task.title}</span>
                                    <button 
                                      onClick={() => cancelTask(task.id)}
                                      className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded-md transition-all"
                                      title="Cancel Task"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter text-gray-400">
                                      <span>{task.status}</span>
                                      <span>{task.progress}%</span>
                                    </div>
                                    <ProgressBar progress={task.progress} color="bg-amber-500" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No active tasks</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button onClick={toggleMenu} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Menu size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 w-full relative h-0">
        <div className="absolute top-2 left-4 z-40">
          <MusicPlayer />
        </div>
      </div>

      <main className={`flex-grow w-full ${activeFeature === 'teleprompter' ? 'max-w-none px-0 py-0' : 'max-w-7xl mx-auto px-4 py-8'}`}>
        {renderActiveFeature()}
      </main>

      {activeFeature !== 'teleprompter' && (
        <>
          <FeedbackModal />

          <footer className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 py-5 mt-auto">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 mb-8 text-[11px] sm:text-[13px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em]">
              <button onClick={() => setModalType('privacy')} className="text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap flex items-center gap-2">
                <Shield size={16} /> Privacy
              </button>
              <div className="w-1 h-1 bg-gray-200 rounded-full shrink-0" />
              <button onClick={() => setModalType('terms')} className="text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap flex items-center gap-2">
                <FileText size={16} /> Terms
              </button>
              <div className="w-1 h-1 bg-gray-200 rounded-full shrink-0" />
              <a href="https://t.me/kcteamofficialbot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap flex items-center gap-2">
                <Send size={16} /> Contact
              </a>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300 px-4 leading-relaxed flex items-center justify-center gap-2">
              <span>© 2026 Smart Creator Tools. All rights reserved by KC Team. With best wishes.</span>
            </div>
          </div>
        </footer>
      </>
    )}
    </div>
  );
};

const Home: React.FC<{ 
  onSelect: (f: FeatureType) => void; 
  settings: AdminSettings; 
  activeTasks: ProcessingTask[];
  session: UserSession;
  onUpdateSession: (updates: Partial<UserSession>) => void;
  onRequireLogin: () => void;
}> = ({ onSelect, settings, activeTasks, session, onUpdateSession, onRequireLogin }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = useMemo(() => {
    const list = ["အသက်ရှူတိုင်းငွေဝင်ပါစေ"];
    if (session.role === 'free') {
      list.push("ကြော်ငြာမပါဘဲ Unlimited Voice တွေ ထုတ်ယူဖို့ Premium Planရယူပါ");
    }
    return list;
  }, [session.role]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tighter leading-normal px-4 py-2 bg-clip-text text-transparent bg-gradient-to-b from-[#FFD700] via-[#FDB931] to-[#9f7928]"
            style={{ 
              filter: 'drop-shadow(2px 2px 0px #b8860b) drop-shadow(4px 4px 4px rgba(0,0,0,0.15))',
            }}>
          {settings.welcomeMessage}
        </h1>
        <div className="mb-6 flex flex-col items-center">
          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Designed and Developed</p>
          <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">By KC Team</p>
        </div>
        <div className="h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent text-sm md:text-lg font-black uppercase tracking-[0.15em] px-4"
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
      <ApiKeyManager session={session} onUpdate={onUpdateSession} onRequireLogin={onRequireLogin} />
    </div>

    <div className="w-full">
      <div className="flex items-center justify-between px-4 mb-6">
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Available Tools</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 px-4">
        {FEATURES.map((feature) => {
          const isRunning = activeTasks.some(t => t.type === feature.id);
          return (
            <button
              key={feature.id}
              onClick={() => onSelect(feature.id)}
              className={`flex items-center gap-3 p-[1px] rounded-2xl transition-all animate-gradient-border ${
                isRunning 
                  ? 'bg-gradient-to-r from-amber-400 to-amber-600' 
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 active:scale-95'
              }`}
            >
              <div className={`flex items-center gap-3 p-4 w-full h-full rounded-[15px] bg-white dark:bg-gray-800 ${isRunning ? 'bg-amber-50' : ''}`}>
                <span className="text-2xl shrink-0">{feature.icon}</span>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs font-bold leading-tight text-left text-gray-900 dark:text-gray-100">{feature.title}</span>
                  {isRunning && <span className="text-[8px] font-black uppercase tracking-tighter mt-1 animate-pulse text-amber-700">Running Task ({activeTasks.filter(t => t.type === feature.id).length})</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>

    {activeTasks.length > 0 && (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
          Running Tasks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTasks.map(task => (
            <Card key={task.id} className="p-4 border-amber-100 bg-amber-50/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm font-bold text-gray-900 truncate">{task.title}</span>
                </div>
                <span className="text-[10px] font-bold text-amber-600 uppercase whitespace-nowrap">{task.status}</span>
              </div>
              <ProgressBar progress={task.progress} color="bg-amber-500" />
            </Card>
          ))}
        </div>
      </div>
    )}
  </div>
  );
};

export default App;
