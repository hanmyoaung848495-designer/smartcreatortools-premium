import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { generateScript, refineScript } from '../services/gemini';
import { Recording, ScriptVersion } from '../types';
import { X, Mic, Wand2, Save, Download, Trash2, History, Send, RotateCcw, FileText, Clock, Key, ShieldCheck, UserCheck, ArrowLeft, Play, Pause, Square, Type, Settings, Sparkles, Link, Link2Off, ChevronUp, ChevronDown, Plus, Minus } from 'lucide-react';
import { Button, TutorialButton } from '../components/Shared';

import { UserSession } from '../types';

interface TeleprompterProps {
  onBack: () => void;
  session: UserSession;
  onRequireApiKey: () => void;
}

const TeleprompterFeature: React.FC<TeleprompterProps> = ({ onBack, session, onRequireApiKey }) => {
  // Script & UI State
  const [script, setScript] = useState<string>("Welcome to TelePromp AI. This is your professional teleprompter and recording studio. \n\nYou can use the controls at the bottom to adjust your reading speed and font size. \n\nTry the AI Script Generator by clicking the sparkle icon to create a new script in seconds. \n\nHover your mouse over this text to pause the scrolling automatically.");
  const [isScrolling, setIsScrolling] = useState(false);
  const [speed, setSpeed] = useState(3.5);
  const [fontSize, setFontSize] = useState(56);
  const [isHovering, setIsHovering] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);
  
  // Recording & Version History State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [scriptVersions, setScriptVersions] = useState<ScriptVersion[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Modals
  const [showTeleprompterTutorial, setShowTeleprompterTutorial] = useState(false);
  const [activeModal, setActiveModal] = useState<'editor' | 'ai' | 'history' | 'versions' | null>(null);
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempScript, setTempScript] = useState(script);

  const checkApiKey = () => {
    if (session.useCustomKey) {
      if (!session.customApiKey || session.customApiKey.trim() === '') {
        onRequireApiKey();
        return false;
      }
    } else {
      // System mode: Require an API key
      if (!session.systemApiKey) {
        onRequireApiKey();
        return false;
      }
    }
    return true;
  };

  // Auto-save version helper
  const saveScriptVersion = useCallback((text: string) => {
    if (!text.trim()) return;
    setScriptVersions(prev => {
      if (prev.length > 0 && prev[0].text === text) return prev;
      const newVersion: ScriptVersion = {
        id: Date.now().toString(),
        text,
        timestamp: Date.now(),
      };
      return [newVersion, ...prev].slice(0, 50);
    });
  }, []);

  // Initialize first version
  useEffect(() => {
    saveScriptVersion(script);
  }, [saveScriptVersion, script]);

  // Auto-scroll logic synced with recording
  useEffect(() => {
    if (syncScroll) {
      setIsScrolling(isRecording);
    }
  }, [isRecording, syncScroll]);

  // Timer logic for recording
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        const startTime = Date.now();
        recorder.onstop = () => {
          const duration = Math.round((Date.now() - startTime) / 1000);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          const newRecording: Recording = {
            id: Date.now().toString(),
            url,
            timestamp: Date.now(),
            duration: duration,
          };
          setRecordings(prev => [newRecording, ...prev]);
          stream.getTracks().forEach(t => t.stop());
        };

        recorder.start();
        setIsRecording(true);
      } catch (err) {
        toast.error("Microphone access denied. Please allow microphone permissions.", {
          style: { borderRadius: '1rem' }
        });
        console.error(err);
      }
    }
  }, [isRecording]);

  const handleGenerateScript = async () => {
    if (!aiTopic.trim()) return;
    if (!checkApiKey()) return;

    setIsGenerating(true);
    try {
      const apiKey = session.useCustomKey ? session.customApiKey : session.systemApiKey;
      const newScript = await generateScript(aiTopic, apiKey);
      setScript(newScript);
      saveScriptVersion(newScript);
      setActiveModal(null);
      setAiTopic('');
      toast.success('AI Script generated successfully!', {
        icon: '✨',
        style: { borderRadius: '1rem' }
      });
    } catch (error) {
      toast.error("API Error: Please check if your provided key is valid.", {
        style: { borderRadius: '1rem' }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineScript = async () => {
    if (!checkApiKey()) return;

    setIsGenerating(true);
    try {
      const apiKey = session.useCustomKey ? session.customApiKey : session.systemApiKey;
      const refined = await refineScript(script, apiKey);
      setScript(refined);
      saveScriptVersion(refined);
      toast.success('AI Script refined successfully!', {
        icon: '🪄',
        style: { borderRadius: '1rem' }
      });
    } catch (error) {
      toast.error("API Error: Please check if your provided key is valid.", {
        style: { borderRadius: '1rem' }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const restoreVersion = (version: ScriptVersion) => {
    setScript(version.text);
    setActiveModal(null);
  };

  const saveEditedScript = () => {
    setScript(tempScript);
    saveScriptVersion(tempScript);
    setActiveModal(null);
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  // --- Inline Teleprompter Component Logic ---
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const animationFrameRef = useRef<number>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  useEffect(() => {
    const scroll = () => {
      if (isScrolling && !isHovering && !isUserInteracting && containerRef.current) {
        const increment = (speed / 10) * (fontSize / 16); 
        scrollPositionRef.current += increment;
        containerRef.current.scrollTop = scrollPositionRef.current;
      }
      animationFrameRef.current = requestAnimationFrame(scroll);
    };

    animationFrameRef.current = requestAnimationFrame(scroll);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScrolling, isHovering, isUserInteracting, speed, fontSize]);

  const handleScroll = () => {
    if (containerRef.current && (!isScrolling || isHovering || isUserInteracting)) {
      scrollPositionRef.current = containerRef.current.scrollTop;
    }
  };

  const handleInteractionStart = () => {
    setIsUserInteracting(true);
    setIsHovering(true);
  };

  const handleInteractionEnd = () => {
    setIsUserInteracting(false);
    setIsHovering(false);
  };
  // --- End Inline Teleprompter Component Logic ---

  return (
    <div className="flex flex-col h-[calc(100vh-70px)] w-full bg-black text-white selection:bg-blue-500/30 relative rounded-b-[50px] overflow-hidden shadow-2xl border-b border-neutral-800 mb-10">
      {/* Teleprompter Specific Tutorial Overlay */}
      {showTeleprompterTutorial && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-3 px-6 border-b border-neutral-800 bg-neutral-900/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Teleprompter Tutorial</h3>
              </div>
              <button 
                onClick={() => setShowTeleprompterTutorial(false)} 
                className="p-1.5 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="aspect-video bg-black relative flex items-center justify-center">
              <iframe
                src="https://www.youtube.com/embed/-3FIdZrEnFE?start=2&autoplay=1&modestbranding=1&rel=0"
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Teleprompter Tutorial"
              />
            </div>
            <div className="p-3 bg-neutral-900/80 border-t border-neutral-800 flex justify-center">
              <button 
                onClick={() => setShowTeleprompterTutorial(false)}
                className="px-8 py-1.5 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header UI */}
      <div className="z-30 flex flex-col p-4 bg-neutral-900/50 backdrop-blur-md border-b border-neutral-800 gap-4">
        <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack} className="text-white hover:bg-neutral-800 p-2.5">
              <ArrowLeft size={26} />
            </Button>
            <div className="flex items-center gap-3 bg-black/50 border border-neutral-800 rounded-xl p-2 px-4">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
              <span className="text-sm font-black uppercase tracking-[0.2em] text-neutral-300">TelePromp <span className="text-blue-500">AI</span></span>
            </div>
          </div>
          <div className="ml-14">
            <button 
              onClick={() => setShowTeleprompterTutorial(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-full transition-all text-[10px] font-black uppercase tracking-widest border border-blue-500/20"
              title="Teleprompter Tutorial"
            >
              <Play size={12} className="fill-current" /> Tutorial
            </button>
          </div>
        </div>

          {isRecording && (
            <div className="flex items-center gap-3 bg-red-600/20 border border-red-500/50 px-4 py-2 rounded-xl animate-in fade-in zoom-in duration-300">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
              <span className="text-lg font-mono font-black text-red-400 tabular-nums">
                {formatTime(recordingDuration)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveModal('history')}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <History size={16} />
            Recordings ({recordings.length})
          </button>
          <button 
            onClick={() => setActiveModal('versions')}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <Clock size={16} />
            History
          </button>
        </div>
      </div>

      {/* Main Teleprompter Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col select-none">
        {/* Background Watermark */}
        {!isScrolling && script && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none transition-opacity duration-500">
             <div className="text-center space-y-4 opacity-20">
               <p className="text-white text-2xl md:text-4xl font-black uppercase tracking-[0.4em] select-none leading-none">
                 Ready<br/>to Scroll
               </p> 
               <div className="flex flex-col items-center gap-2">
                 <div className="w-12 h-[1px] bg-white"></div>
                 <p className="text-white text-xs font-bold uppercase tracking-[0.3em]">Designed By Pyae Phyo Aung</p>
               </div>
             </div>
          </div>
        )}

        {/* Visual Focus Area / Reader Guide */}
        <div className="absolute top-1/2 left-0 w-full h-32 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-between px-4">
          <div className="absolute inset-0 bg-blue-500/5 border-y border-blue-500/20 shadow-[inset_0_0_50px_rgba(59,130,246,0.05)]"></div>
          <div className="w-1.5 h-16 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse"></div>
          <div className="w-1.5 h-16 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse"></div>
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>
        </div>

        {/* Main Script Container */}
        <div
          ref={containerRef}
          onMouseEnter={handleInteractionStart}
          onMouseLeave={handleInteractionEnd}
          onMouseDown={handleInteractionStart}
          onMouseUp={handleInteractionEnd}
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto no-scrollbar px-8 md:px-24 pt-[45vh] pb-[2vh] transition-opacity duration-300 relative z-10 ${
            isHovering ? 'opacity-90' : 'opacity-100'
          }`}
        >
          <div 
            className="max-w-5xl mx-auto text-white font-bold leading-[1.3] whitespace-pre-wrap text-center"
            style={{ 
              fontSize: `${fontSize}px`,
              textShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
          >
            {script || "Write your script to begin..."}
          </div>
        </div>

        {/* Status HUD */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex gap-3 pointer-events-none">
          {isScrolling && isHovering && (
            <div className="flex items-center gap-2 bg-amber-600/20 border border-amber-500/50 text-amber-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-xl">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
              Paused (Interaction)
            </div>
          )}
        </div>
      </div>

      {/* Controls Area */}
      <div className="w-full bg-neutral-900 border-t border-neutral-800 p-2 md:p-3 flex flex-col gap-3 z-20 shadow-2xl mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto flex-1">
            <div className="flex flex-col gap-1 min-w-[140px] flex-1">
              <label className="text-neutral-500 text-[9px] font-bold uppercase tracking-wider flex items-center justify-between">
                Speed: {speed.toFixed(1)}
                <span className="text-neutral-400">FPS</span>
              </label>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSpeed(Math.max(0.5, speed - 0.5))}
                  className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex-shrink-0"
                  title="Decrease Speed"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 min-w-[60px]"
                />
                <button 
                  onClick={() => setSpeed(Math.min(10, speed + 0.5))}
                  className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex-shrink-0"
                  title="Increase Speed"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 min-w-[140px] flex-1">
              <label className="text-neutral-500 text-[9px] font-bold uppercase tracking-wider">
                Text Size: {fontSize}px
              </label>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setFontSize(Math.max(24, fontSize - 4))}
                  className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex-shrink-0"
                  title="Decrease Size"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="range"
                  min="20"
                  max="96"
                  step="4"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 min-w-[60px]"
                />
                <button 
                  onClick={() => setFontSize(Math.min(120, fontSize + 4))}
                  className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex-shrink-0"
                  title="Increase Size"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-center flex-1">
            <button
              onClick={() => setSyncScroll(!syncScroll)}
              title={syncScroll ? "Unsync Record/Scroll" : "Sync Record/Scroll"}
              className={`p-2.5 rounded-full transition-all ${
                syncScroll ? 'bg-blue-500/10 text-blue-500' : 'bg-neutral-800 text-neutral-500'
              }`}
            >
              {syncScroll ? <Link size={18} /> : <Link2Off size={18} />}
            </button>

            <button
              onClick={() => setIsScrolling(!isScrolling)}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all text-sm flex-1 max-w-[160px] justify-center ${
                isScrolling ? 'bg-white text-black' : 'bg-neutral-800 text-white'
              }`}
            >
              {isScrolling ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              <span className="whitespace-nowrap">{isScrolling ? 'Stop Scroll' : 'Start Scroll'}</span>
            </button>

            <button
              onClick={handleToggleRecording}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all text-sm shadow-lg flex-1 max-w-[160px] justify-center ${
                isRecording 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
            >
              {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} fill="currentColor" />}
              <span>{isRecording ? 'STOP' : 'REC'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Row for AI Script and Text Editor */}
        <div className="flex items-center gap-4 justify-center pt-2 border-t border-neutral-800/50">
          <button
            onClick={() => setActiveModal('ai')}
            className="flex items-center gap-2 px-6 py-2 bg-neutral-800 text-purple-400 rounded-xl hover:bg-purple-400 hover:text-black transition-all font-bold text-xs uppercase tracking-widest"
            title="AI Script Tools"
          >
            <Sparkles size={16} />
            AI Script
          </button>
          <button
            onClick={() => { setTempScript(script); setActiveModal('editor'); }}
            className="flex items-center gap-2 px-6 py-2 bg-neutral-800 text-neutral-300 rounded-xl hover:bg-neutral-700 transition-all font-bold text-xs uppercase tracking-widest"
            title="Edit Script"
          >
            <Type size={16} />
            Text Editor
          </button>
        </div>
      </div>

      {/* Modals Logic */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                {activeModal === 'editor' && <><FileText className="text-blue-500" /> <h3 className="text-xl font-bold">Edit Script</h3></>}
                {activeModal === 'ai' && <><Wand2 className="text-purple-500" /> <h3 className="text-xl font-bold">AI Script Tools</h3></>}
                {activeModal === 'history' && <><Mic className="text-red-500" /> <h3 className="text-xl font-bold">My Recordings</h3></>}
                {activeModal === 'versions' && <><Clock className="text-amber-500" /> <h3 className="text-xl font-bold">Version History</h3></>}
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className={`flex-1 p-6 ${activeModal === 'editor' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto subtle-scrollbar'}`}>
              {activeModal === 'editor' && (
                <div className="space-y-4 h-full flex flex-col">
                  <textarea
                    value={tempScript}
                    onChange={(e) => setTempScript(e.target.value)}
                    className="flex-1 w-full min-h-[50vh] resize-none subtle-scrollbar bg-black border border-neutral-800 rounded-2xl p-6 text-neutral-200 focus:outline-none focus:border-blue-500 transition-all font-mono leading-relaxed"
                    placeholder="Type or paste your script here..."
                  />
                  <button 
                    onClick={saveEditedScript}
                    className="w-full py-4 bg-white text-black rounded-2xl font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Apply & Save Script
                  </button>
                </div>
              )}

              {activeModal === 'ai' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-neutral-500 uppercase tracking-widest flex justify-between items-center">
                      Topic or Description
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g. How to bake a chocolate cake..."
                        className="w-full bg-black border border-neutral-800 rounded-2xl p-4 pr-16 text-white focus:outline-none focus:border-purple-500 transition-all"
                      />
                      <button 
                        disabled={isGenerating || !aiTopic.trim()}
                        onClick={handleGenerateScript}
                        className="absolute right-2 top-2 p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-500 disabled:opacity-50 transition-all"
                      >
                        {isGenerating ? <RotateCcw size={20} className="animate-spin" /> : <Send size={20} />}
                      </button>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-neutral-800 space-y-4">
                    <label className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Script Optimization</label>
                    <button 
                      disabled={isGenerating}
                      onClick={handleRefineScript}
                      className="w-full py-4 border border-purple-500/30 bg-purple-500/10 text-purple-400 rounded-2xl font-bold hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Wand2 size={20} />
                      Refine Current Script for Better Delivery
                    </button>
                  </div>
                </div>
              )}

              {activeModal === 'history' && (
                <div className="space-y-4">
                  {recordings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-600 space-y-4">
                      <Mic size={48} className="opacity-20" />
                      <p className="font-bold">No recordings yet.</p>
                    </div>
                  ) : (
                    recordings.map((recording) => (
                      <div key={recording.id} className="bg-neutral-800/50 border border-neutral-800 p-4 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-white font-bold">{new Date(recording.timestamp).toLocaleString()}</span>
                            <span className="text-xs text-neutral-500 uppercase tracking-widest">Duration: {formatTime(recording.duration)}</span>
                          </div>
                          <button 
                            onClick={() => deleteRecording(recording.id)}
                            className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                        <div className="flex items-center gap-4">
                          <audio src={recording.url} controls className="flex-1 h-10 accent-blue-500" />
                          <a 
                            href={recording.url} 
                            download={`recording-${recording.id}.webm`}
                            className="p-3 bg-white text-black rounded-xl hover:bg-neutral-200 transition-all"
                          >
                            <Download size={20} />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeModal === 'versions' && (
                <div className="space-y-3">
                  {scriptVersions.length === 0 ? (
                    <p className="text-center text-neutral-600 py-12">No version history available.</p>
                  ) : (
                    scriptVersions.map((v) => (
                      <div key={v.id} className="group bg-neutral-800/30 border border-neutral-800 p-4 rounded-2xl hover:border-amber-500/50 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-neutral-500">
                            <Clock size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider">{new Date(v.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <button 
                            onClick={() => restoreVersion(v)}
                            className="text-xs font-black uppercase text-amber-500 opacity-0 group-hover:opacity-100 transition-all px-3 py-1 bg-amber-500/10 rounded-full"
                          >
                            Restore
                          </button>
                        </div>
                        <p className="text-neutral-400 text-sm line-clamp-2 leading-relaxed italic">
                          "{v.text.slice(0, 150)}..."
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeleprompterFeature;
