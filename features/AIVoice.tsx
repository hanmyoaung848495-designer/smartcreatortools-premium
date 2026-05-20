
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { GoogleGenAI, Modality } from "@google/genai";
import { getAIClient } from '../services/gemini';
import { Card, Button, TextArea, Input, Select, ProgressBar, TutorialButton } from '../components/Shared';
import { Play, Pause, Download, Trash2, History, ArrowLeft, Mic, Volume2, Users, User, StopCircle, Loader2, X } from 'lucide-react';
import { FeatureType, ProcessingTask, UserSession } from '../types';
import { KCAudioPlayer } from '@/features/KCAudioPlayer';
import { GeminiAudioPlayer } from '../components/GeminiAudioPlayer';
import { INITIAL_PRONUNCIATION_MAP, applyPronunciation } from '../lib/pronunciation';
import { saveVoiceHistoryDB, loadVoiceHistoryDB, getCachedAudio, setCachedAudio } from '../services/storage';
import { supabase } from '../lib/supabase';

interface VoiceHistory {
  id: string;
  title: string;
  text: string;
  mode: 'single' | 'multi';
  voices: string[];
  audioData: string; // Base64
  timestamp: number;
  kcResult?: { status: string; audio_url: string; srt_url: string; fileName: string };
}

interface AIVoiceProps {
  session: UserSession;
  onStartTask: (type: FeatureType, title: string, runAction: (taskId: string) => Promise<any>) => void;
  tasks: ProcessingTask[];
  onBack: () => void;
  onRequireApiKey: () => void;
}

const VOICES = [
  'Zephyr', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede', 
  'Callirrhoe', 'Autonoe', 'Enceladus', 'Umbriel', 
  'Algieba', 'Erinome', 'Algenib', 'Rasalgethi', 
  'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 
  'Pulcherrima', 'Achird', 'Zubenelgenubi', 'Vindemiatrix', 
  'Sadachbia', 'Sadaltager', 'Sulafat'
];

const MODELS = [
  { label: 'Gemini 3.1 Flash (TTS Preview)', value: 'gemini-3.1-flash-preview-tts' },
  { label: 'Gemini 2.5 Preview (High Quality)', value: 'gemini-2.5-preview-tts' },
  { label: 'Gemini 2.5 Flash (Fast)', value: 'gemini-2.5-flash-preview-tts' },
  { label: 'Gemini 1.5 Flash (TTS Preview)', value: 'gemini-1.5-flash-preview-tts' }
];

// KC TTS Constants
const KC_CHARACTERS = [
  { label: 'ဗန် (Myanmar)', value: 'ဗန်' },
  { label: 'သူဇာ (Myanmar)', value: 'သူဇာ' },
  { label: 'သန့်ဇင် (Myanmar)', value: 'သန့်ဇင်' },
  { label: 'ကြည်ပြာ (Myanmar)', value: 'ကြည်ပြာ' },
  { label: 'မောင်မှိုင်း (Myanmar)', value: 'မောင်မှိုင်း' },
  { label: 'သီတာ (Myanmar)', value: 'သီတာ' },
  { label: 'အောင်အောင် (Myanmar)', value: 'အောင်အောင်' },
  { label: 'သီရိ (Myanmar)', value: 'သီရိ' },
  { label: 'အောင်လ (Myanmar)', value: 'အောင်လ' },
  { label: 'သက်ထား (Myanmar)', value: 'သက်ထား' },
  { label: 'တာတီး (Myanmar)', value: 'တာတီး' },
  { label: 'ချယ်ရီ (Myanmar)', value: 'ချယ်ရီ' },
  { label: 'ဗျူဟာ (Myanmar)', value: 'ဗျူဟာ' },
  { label: 'အောင်ဒင် (Myanmar)', value: 'အောင်ဒင်' },
  { label: 'John (English)', value: 'John' },
  { label: 'Monica (English)', value: 'Monica' },
  { label: 'David (English)', value: 'David' },
  { label: 'Julia (English)', value: 'Julia' }
];

const KC_STYLES = [
  { label: 'Normal', value: 'normal' },
  { label: 'Movie Recap (ဇာတ်လမ်းပြော)', value: 'Movie Recap (ဇာတ်လမ်းပြော)' },
  { label: 'Storytelling', value: 'storytelling' },
  { label: 'Documentary', value: 'documentary' },
  { label: 'Sad', value: 'sad' },
  { label: 'Angry', value: 'angry' }
];

const AIVoice: React.FC<AIVoiceProps> = ({ session, onStartTask, tasks, onBack, onRequireApiKey }) => {
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [isDialogMode, setIsDialogMode] = useState(false);
  const [dialogBlocks, setDialogBlocks] = useState<{ id: string; speaker: 'Speaker 1' | 'Speaker 2' | 'Speaker 3'; text: string }[]>([
    { id: '1', speaker: 'Speaker 1', text: '' },
    { id: '2', speaker: 'Speaker 2', text: '' },
    { id: '3', speaker: 'Speaker 3', text: '' }
  ]);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-preview-tts');
  const [voiceEngine, setVoiceEngine] = useState<'gemini' | 'kc_tts'>('kc_tts');
  const [voice1, setVoice1] = useState('Kore');
  const [voice2, setVoice2] = useState('Charon');
  const [voice3, setVoice3] = useState('Zephyr');
  const [styleInstruction, setStyleInstruction] = useState('Read aloud in a warm and friendly tone: ');
  const [text, setText] = useState('');
  
  // KC TTS State
  const [kcText, setKcText] = useState('');
  const [kcMode, setKcMode] = useState<'single' | 'multi'>('single');
  const [kcV1Voice, setKcV1Voice] = useState('ဗန်');
  const [kcV2Voice, setKcV2Voice] = useState('သူဇာ');
  const [kcV3Voice, setKcV3Voice] = useState('သန့်ဇင်');
  const [kcStyle, setKcStyle] = useState('Movie Recap (ဇာတ်လမ်းပြော)');
  const [kcCharOpen, setKcCharOpen] = useState<'v1' | 'v2' | 'v3' | null>(null);
  const [kcStyleOpen, setKcStyleOpen] = useState(false);
  const [kcRatio, setKcRatio] = useState<'9:16' | '16:9'>('9:16');
  const [kcFileName, setKcFileName] = useState('KC_Voice');
  const [kcPitch, setKcPitch] = useState(0);
  const [kcRate, setKcRate] = useState(0);
  const [kcVolume, setKcVolume] = useState(0);
  const [kcManualOpen, setKcManualOpen] = useState(false);
  const [kcPronunciationOpen, setKcPronunciationOpen] = useState(false);
  const [kcManualText, setKcManualText] = useState(`Intro = အင်ထရို\nတူမလေး = တူ မ လေး`);
  const [kcLoading, setKcLoading] = useState(false);
  const [timerCount, setTimerCount] = useState(0);
  const [kcResult, setKcResult] = useState<{ status: string; audio_url: string; srt_url: string; fileName?: string } | null>(null);
  const [geminiResult, setGeminiResult] = useState<{ audio_url: string; fileName: string } | null>(null);

  const activeGeminiTask = tasks.find(t => t.type === 'ai-voice' && t.title.startsWith('Gemini:') && t.status !== 'completed' && t.status !== 'failed' && !t.isCanceled);
  const activeKCTask = tasks.find(t => t.type === 'ai-voice' && t.title.startsWith('KC:') && t.status !== 'completed' && t.status !== 'failed' && !t.isCanceled);

  useEffect(() => {
    let interval: any;
    if (activeGeminiTask || activeKCTask) {
      interval = setInterval(() => {
        setTimerCount(prev => prev + 1);
      }, 1000);
    } else {
      setTimerCount(0);
    }
    return () => clearInterval(interval);
  }, [activeGeminiTask, activeKCTask]);

  const [history, setHistory] = useState<VoiceHistory[]>([]);
  const [currentAudio, setCurrentAudio] = useState<{ url: string; id: string } | null>(null);

  const HISTORY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  const cleanupOldHistory = (currentHistory: VoiceHistory[]) => {
    const now = Date.now();
    const filtered = currentHistory.filter(item => now - item.timestamp < HISTORY_TIMEOUT);
    if (filtered.length !== currentHistory.length) {
      saveHistory(filtered);
    }
  };

  const handleGenerateKCTTS = async () => {
    if (!kcText.trim()) {
      toast.error('Please enter text for KC Voice.');
      return;
    }

    try {
      setIsCheckingUsage(true);
      const { checkAndIncrementUsage } = await import('../services/usageService');
      const { allowed, message } = await checkAndIncrementUsage('ai_voice', session.role !== 'free' ? (session.user?.id || 'logged_in') : null);
      
      if (!allowed) {
        toast.error(message || 'Daily limit exceeded');
        return;
      }
    } finally {
      setIsCheckingUsage(false);
    }

    // Parse textarea into map
    const customMap: Record<string, string> = {};
    kcManualText.split('\n').filter(line => line.includes('=')).forEach(line => {
        const [key, val] = line.split('=').map(s => s.trim());
        if (key && val) customMap[key] = val;
    });

    let processedText = applyPronunciation(kcText, customMap);

    setKcLoading(true);
    setKcResult(null);
    
    onStartTask('ai-voice', `KC: ${kcFileName || 'Voice'}`, async (taskId) => {
      try {
        const apiUrl = '/api/kc-tts/generate';
        console.log('Generating with:', { processedText, kcV1Voice, kcV2Voice, kcV3Voice, kcStyle, kcRatio });
        
        const payload = {
          text: processedText,
          v1_voice: kcV1Voice,
          v2_voice: kcMode === 'multi' ? kcV2Voice : '',
          v3_voice: kcMode === 'multi' ? kcV3Voice : '',
          style: kcStyle,
          srt_ratio: kcRatio,
          manual_pitch: kcPitch,
          manual_rate: kcRate,
          volume_boost: kcVolume,
          pronunciation_rules: kcManualText
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const isCanceled = () => tasksRef.current.find(t => t.id === taskId)?.isCanceled;

        if (!response.ok) {
          if (isCanceled()) return;
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`Generation failed: ${response.statusText} - ${errorText}`);
        }
        const data = await response.json();
        
        if (isCanceled()) return;

        const resultWithFileName = { ...data, fileName: kcFileName };
        setKcResult(resultWithFileName);

        // Save to history
        const newItem: VoiceHistory = {
          id: Math.random().toString(36).substr(2, 9),
          title: kcFileName || 'KC_Voice',
          text: kcText,
          mode: kcMode,
          voices: kcMode === 'multi' ? [kcV1Voice, kcV2Voice, kcV3Voice] : [kcV1Voice],
          audioData: '', // Audio is fetched from URL, not base64 here
          timestamp: Date.now(),
          kcResult: resultWithFileName
        };
        saveHistory([newItem, ...history]);

        toast.success('Generated successfully!');
        return resultWithFileName;
      } catch (err) {
        if (tasksRef.current.find(t => t.id === taskId)?.isCanceled) return;
        console.error('Generation Error details:', err);
        const msg = err instanceof Error ? err.message : 'Generation failed.';
        toast.error(msg);
        throw err;
      } finally {
        setKcLoading(false);
      }
    });
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);
  const [kcPreviewUrls, setKcPreviewUrls] = useState<Record<string, string>>({});
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [pickingVoiceFor, setPickingVoiceFor] = useState<'voice1' | 'voice2' | 'voice3' | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tasksRef = useRef<ProcessingTask[]>(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await loadVoiceHistoryDB();
        let currentHistory: VoiceHistory[] = [];
        if (saved && saved.length > 0) {
          currentHistory = saved;
        } else {
          // Fallback to localStorage for migration
          const oldSaved = localStorage.getItem('ai_voice_history');
          try {
            if (oldSaved && oldSaved.trim() !== 'undefined' && oldSaved.trim() !== 'null') {
              const parsed = JSON.parse(oldSaved);
              if (Array.isArray(parsed)) {
                currentHistory = parsed;
                localStorage.removeItem('ai_voice_history');
              }
            }
          } catch (e) {
            console.error("Failed to parse AI voice history from localStorage", e);
          }
        }

        // Apply initial cleanup
        const now = Date.now();
        const filtered = currentHistory.filter(item => now - item.timestamp < HISTORY_TIMEOUT);
        setHistory(filtered);
        await saveVoiceHistoryDB(filtered);
      } catch (error) {
        console.error("Failed to load history:", error);
      }
    };
    loadHistory();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.character-dropdown-container')) {
        setKcCharOpen(null);
      }
      if (!target.closest('.style-dropdown-container')) {
        setKcStyleOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);

    // Set up auto-cleanup timer
    const cleanupInterval = setInterval(() => {
      setHistory(prevHistory => {
        const now = Date.now();
        const filtered = prevHistory.filter(item => now - item.timestamp < HISTORY_TIMEOUT);
        if (filtered.length !== prevHistory.length) {
          saveVoiceHistoryDB(filtered); // Persist cleanup
          return filtered;
        }
        return prevHistory;
      });
    }, 30000); // Check every 30 seconds

    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setAudioProgress(0);
      setIsPreviewing(null);
    };
    audioRef.current.ontimeupdate = () => {
      if (audioRef.current && audioRef.current.duration > 0) {
        setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      }
    };
    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current) setAudioDuration(audioRef.current.duration);
    };

    return () => {
      clearInterval(cleanupInterval);
      window.removeEventListener('mousedown', handleClickOutside);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const saveHistory = async (newHistory: VoiceHistory[]) => {
    setHistory(newHistory);
    await saveVoiceHistoryDB(newHistory);
  };

  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const playPromiseRef = useRef<Promise<void> | null>(null);

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

  const handleRun = async () => {
    const isTextEmpty = mode === 'multi' && isDialogMode 
      ? dialogBlocks.every(b => !b.text.trim())
      : !text.trim();

    if (isTextEmpty) {
      toast.error('Please enter some text!', {
        style: { borderRadius: '1rem' }
      });
      return;
    }

    if (!checkApiKey()) return;
    const apiKey = session.useCustomKey ? session.customApiKey : session.systemApiKey;

    try {
      setIsCheckingUsage(true);
      const { checkAndIncrementUsage } = await import('../services/usageService');
      const { allowed, message } = await checkAndIncrementUsage('ai_voice', session.role !== 'free' ? (session.user?.id || 'logged_in') : null);
      
      if (!allowed) {
        toast.error(message || 'Daily limit exceeded');
        return;
      }
    } finally {
      setIsCheckingUsage(false);
    }

    const displayTitle = mode === 'multi' && isDialogMode 
      ? dialogBlocks.find(b => b.text.trim())?.text.slice(0, 30) || 'Multi-speaker Dialog'
      : text.slice(0, 30);
    const title = displayTitle + (displayTitle.length >= 30 ? '...' : '');
    
    onStartTask('ai-voice', `Gemini: ${title}`, async (taskId) => {
      try {
        const ai = getAIClient(apiKey);
        
        let config: any = {
          responseModalities: [Modality.AUDIO],
        };

        if (mode === 'single') {
          config.speechConfig = {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice1 },
            },
          };
        } else {
          config.speechConfig = {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: 'Speaker 1', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice1 } } },
                { speaker: 'Speaker 2', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice2 } } },
                { speaker: 'Speaker 3', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice3 } } },
              ],
            },
          };
        }

        let prompt = '';
        
        // Parse custom pronunciation from KC TTS manual text if in multi-speaker/gemini mode too
        const customMap: Record<string, string> = {};
        kcManualText.split('\n').filter(line => line.includes('=')).forEach(line => {
            const [key, val] = line.split('=').map(s => s.trim());
            if (key && val) customMap[key] = val;
        });

        if (mode === 'multi' && isDialogMode) {
          const processedDialog = dialogBlocks.map(b => `${b.speaker}: ${applyPronunciation(b.text, customMap)}`).join('\n');
          prompt = styleInstruction + "\n\n" + processedDialog;
        } else {
          prompt = styleInstruction + "\n\n" + applyPronunciation(text, customMap);
        }

        const keysToTry = session.useCustomKey ? [apiKey] : (session.allApiKeys && session.allApiKeys.length > 0 ? session.allApiKeys : [apiKey || '']);
        let lastError: any;
        let base64Audio: string | undefined;

        const isCanceled = () => tasksRef.current.find(t => t.id === taskId)?.isCanceled;

        for (const currentKey of keysToTry) {
          try {
            if (isCanceled()) return;
            const ai = getAIClient(currentKey);
            const response = await ai.models.generateContent({
              model: selectedModel,
              contents: [{ parts: [{ text: prompt }] }],
              config,
            });
            base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) break;
          } catch (err: any) {
             lastError = err;
             const errMsg = err?.message || String(err);
             if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
                console.warn("Gemini Voice quota reached for key. Rotating...");
                continue;
             }
             throw err;
          }
        }

        if (isCanceled()) return;
        if (!base64Audio) throw lastError || new Error('Failed to generate audio');

        const wavBlob = base64PcmToWavBlob(base64Audio, 24000);
        const reader = new FileReader();
        const audioDataPromise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(wavBlob);
        });
        const wavBase64 = await audioDataPromise;
        
        if (isCanceled()) return;

        const newItem: VoiceHistory = {
          id: Math.random().toString(36).substr(2, 9),
          title,
          text,
          mode,
          voices: mode === 'single' ? [voice1] : [voice1, voice2, voice3],
          audioData: wavBase64,
          timestamp: Date.now(),
        };

        const updatedHistory = [newItem, ...history];
        saveHistory(updatedHistory);
        
        const url = URL.createObjectURL(wavBlob);
        setGeminiResult({ audio_url: url, fileName: title });

        return newItem;
      } catch (err: any) {
        if (tasksRef.current.find(t => t.id === taskId)?.isCanceled) return;
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          setIsQuotaModalOpen(true);
        } else {
          toast.error('Generation failed: ' + errMsg, {
            style: { borderRadius: '1rem' }
          });
        }
      }
    });
  };

  const base64PcmToWavBlob = (base64: string, sampleRate: number) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // Add WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + bytes.length, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, bytes.length, true);
    
    return new Blob([header, bytes], { type: 'audio/wav' });
  };

  const base64ToBlob = (base64: string, type: string) => {
    const parts = base64.split(',');
    const actualBase64 = parts.length > 1 ? parts[1] : parts[0];
    const binary = atob(actualBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  };

  const playAudio = async (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      setIsPlaying(true);
      try {
        playPromiseRef.current = audioRef.current.play();
        await playPromiseRef.current;
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Audio playback failed:', error);
          setIsPlaying(false);
        }
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  const handlePlayPause = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch (e) {}
        }
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        try {
          playPromiseRef.current = audioRef.current.play();
          await playPromiseRef.current;
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Audio playback failed:', error);
            setIsPlaying(false);
          }
        } finally {
          playPromiseRef.current = null;
        }
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = (parseFloat(e.target.value) / 100) * audioDuration;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTo;
      setAudioProgress(parseFloat(e.target.value));
    }
  };

  const handleDownload = (item: VoiceHistory) => {
    const blob = base64ToBlob(item.audioData, 'audio/wav');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title || 'ai-voice'}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    saveHistory(history.filter(h => h.id !== id));
  };

  const addDialogBlock = () => {
    const nextSpeaker = (dialogBlocks.length % 3 === 0) ? 'Speaker 1' : (dialogBlocks.length % 3 === 1 ? 'Speaker 2' : 'Speaker 3');
    setDialogBlocks([...dialogBlocks, { 
      id: Math.random().toString(36).substr(2, 9), 
      speaker: nextSpeaker, 
      text: '' 
    }]);
  };

  const updateDialogBlock = (id: string, updates: Partial<{ speaker: 'Speaker 1' | 'Speaker 2' | 'Speaker 3'; text: string }>) => {
    setDialogBlocks(dialogBlocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeDialogBlock = (id: string) => {
    if (dialogBlocks.length > 1) {
      setDialogBlocks(dialogBlocks.filter(b => b.id !== id));
    }
  };

  const previewKCCharacter = async (e: React.MouseEvent, charValue: string, charLabel: string) => {
    e.stopPropagation();
    
    const previewId = `kc_${charValue}`;
    if (isPreviewing === previewId) {
      if (audioRef.current && isPlaying) {
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch (e) {}
        }
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setIsPreviewing(null);
      return;
    }
    
    if (kcPreviewUrls[charValue]) {
       setIsPreviewing(previewId);
       playAudio(kcPreviewUrls[charValue]);
       return;
    }

    setIsPreviewing(previewId);

    try {
      const apiUrl = '/api/kc-tts/generate';
      const isEnglish = charLabel.includes('(English)');
      let spokenLabel = charLabel.replace(/\s*\([^)]*\)/g, '');
      
      let previewText = '';
      if (isEnglish) {
        previewText = `Hello, I am ${spokenLabel}. If you like my voice, you can use it.`;
      } else {
        if (spokenLabel === 'မသူဇာ') spokenLabel = 'မတ်သူဇာ';
        previewText = `မင်္ဂလာပါ ${spokenLabel} ပြောနေပါတယ် အသံကြိုက်ရင် သုံးနိုင်ပါတယ်`;
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          v1_voice: charValue,
          style: 'Normal',
          srt_ratio: '9:16',
          manual_pitch: 0,
          manual_rate: 0,
          volume_boost: 0
        }),
      });

      if (!response.ok) {
        toast.error(`Preview failed`);
        setIsPreviewing(null);
        return;
      }
      
      const data = await response.json();
      const audioUrl = data.audio_url;
      
      setKcPreviewUrls(prev => ({...prev, [charValue]: audioUrl}));
      
      setIsPreviewing(current => {
         if (current === previewId) {
            playAudio(audioUrl);
            return previewId;
         }
         return current;
      });

    } catch (err) {
      console.error(err);
      toast.error('Preview failed');
      setIsPreviewing(null);
    }
  };

  const previewVoice = async (voiceName: string) => {
    const cacheKey = `tts_preview_${voiceName}`;
    let cachedAudio: string | null = null;
    try {
      cachedAudio = await getCachedAudio(cacheKey);
    } catch (e) {
      console.warn("Failed to retrieve cached audio from IndexedDB", e);
    }

    if (cachedAudio) {
      setIsPreviewing(voiceName);
      const wavBlob = base64PcmToWavBlob(cachedAudio, 24000);
      const url = URL.createObjectURL(wavBlob);
      playAudio(url);
      return;
    }

    setIsPreviewing(voiceName);

    // Check Supabase first (Global Cache)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tts_cache')
          .select('audio_data')
          .eq('voice_name', voiceName)
          .single();
        
        if (data && data.audio_data) {
          try {
            await setCachedAudio(cacheKey, data.audio_data); // Cache in IndexedDB for next time
          } catch (e) {
            console.warn("Failed to cache audio in IndexedDB", e);
          }
          const wavBlob = base64PcmToWavBlob(data.audio_data, 24000);
          const url = URL.createObjectURL(wavBlob);
          playAudio(url);
          return;
        }
      } catch (err) {
        console.warn("Supabase cache check failed:", err);
      }
    }

    if (!checkApiKey()) {
      setIsPreviewing(null);
      return;
    }
    const apiKey = session.useCustomKey ? session.customApiKey : (session.systemApiKey || process.env.GEMINI_API_KEY);

    try {
      const ai = getAIClient(apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts', // Always use flash for preview to save quota
        contents: [{ parts: [{ text: `Hello, I am ${voiceName}.` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        try {
          await setCachedAudio(cacheKey, base64Audio); // Cache in IndexedDB
        } catch (e) {
          console.warn('Failed to cache preview audio in IndexedDB (storage full?)', e);
        }
        
        // Save to Supabase disabled by user request to stop analysis and database entry
        /*
        if (supabase) {
          supabase.from('tts_cache').insert([
            { voice_name: voiceName, audio_data: base64Audio }
          ]).then(({error}) => {
            if (error) console.error("Failed to save to Supabase:", error);
          });
        }
        */

        const wavBlob = base64PcmToWavBlob(base64Audio, 24000);
        const url = URL.createObjectURL(wavBlob);
        playAudio(url);
      }
    } catch (err) {
      console.error('Preview failed:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        setIsQuotaModalOpen(true);
      } else {
        toast.error('Preview failed: ' + errMsg, {
          style: { borderRadius: '1rem' }
        });
      }
    } finally {
      setIsPreviewing(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const VoiceSelector = ({ value, onChange, label, id }: { value: string; onChange: (v: string) => void; label: string; id: 'voice1' | 'voice2' | 'voice3' }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <button 
        onClick={() => setPickingVoiceFor(id)}
        className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 transition-all shadow-sm group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center">
            <Mic size={14} />
          </div>
          <span className="font-semibold text-sm text-gray-700">{value}</span>
        </div>
        <div className="text-indigo-600 text-[10px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">Change →</div>
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
      {/* Quota Modal */}
      {isQuotaModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl w-full max-w-md text-center relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setIsQuotaModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <StopCircle size={40} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tight">Quota ပြည့်သွားပါပြီ</h3>
            <p className="text-gray-600 leading-relaxed font-medium">
              လူကြီးမင်းထည့်ထားသော APIမှာ Quotaပြည့်သွားပါသဖြင့်အသုံးပြု၍မရတော့ပါ။ 
              <br/><br/>
              <span className="text-indigo-600 font-bold">မှတ်ချက်:</span> Gemini AI model များသည် Free Tier တွင် အသုံးပြုမှု အကန့်အသတ် ရှိပါသည်။ ခဏစောင့်ပြီးမှ ပြန်လည်ကြိုးစားပေးပါ။
            </p>
            <Button 
              onClick={() => setIsQuotaModalOpen(false)}
              className="w-full mt-8 py-4 rounded-2xl font-black uppercase tracking-widest"
            >
              နားလည်ပါပြီ
            </Button>
          </div>
        </div>
      )}

      {/* Voice Picker Modal */}
      {pickingVoiceFor && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[300px] max-h-[60vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Select Voice</h3>
              <button 
                onClick={() => setPickingVoiceFor(null)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-all text-gray-600 hover:text-black shadow-sm"
              >
                <span className="text-xl leading-none font-black">&times;</span>
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-3 space-y-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {VOICES.map(voice => {
                const isSelected = (pickingVoiceFor === 'voice1' ? voice1 : (pickingVoiceFor === 'voice2' ? voice2 : voice3)) === voice;
                return (
                  <div 
                    key={voice}
                    onClick={() => {
                      if (pickingVoiceFor === 'voice1') setVoice1(voice);
                      else if (pickingVoiceFor === 'voice2') setVoice2(voice);
                      else setVoice3(voice);
                      setPickingVoiceFor(null);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-600'}`} />
                      <span className="font-semibold text-sm">{voice}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        previewVoice(voice);
                      }}
                      disabled={isPreviewing !== null}
                      className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'text-white bg-white/20 hover:bg-white/30' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                    >
                      {isPreviewing === voice ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="p-2 dark:text-gray-300 dark:hover:bg-gray-800">
            <ArrowLeft size={20} /> Back
          </Button>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">AI Voice Generator</h2>
        </div>
        <div className="ml-14 mb-4">
          <TutorialButton videoId="sGHe7nhThwo" timestamp="30" toolKey="ai_voice" session={session} />
        </div>

        {/* Voice Engine Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit ml-14 mb-4">
          <button
            onClick={() => setVoiceEngine('kc_tts')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${voiceEngine === 'kc_tts' ? 'tool-btn-gradient tool-btn-gradient-active text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            KC Voice
          </button>
          <button
            onClick={() => setVoiceEngine('gemini')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${voiceEngine === 'gemini' ? 'tool-btn-gradient tool-btn-gradient-active text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Gemini Voice
          </button>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        {voiceEngine === 'gemini' ? (
          <>
            {/* Gemini Config */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-64">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">AI Model</label>
                  <Select
                    value={selectedModel}
                    onChange={setSelectedModel}
                    options={MODELS}
                  />
                </div>
                
                {/* Mode Selection */}
                <div className="flex items-center justify-end">
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                    <button
                      onClick={() => setMode('single')}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${mode === 'single' ? 'tool-btn-gradient tool-btn-gradient-active text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <User size={14} /> Single
                    </button>
                    <button
                      onClick={() => setMode('multi')}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${mode === 'multi' ? 'tool-btn-gradient tool-btn-gradient-active text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Users size={14} /> Multi
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Selectors & Input */}
            <div className={`grid gap-6 ${mode === 'multi' ? 'md:grid-cols-3' : ''}`}>
              <VoiceSelector 
                label={mode === 'multi' ? 'Speaker 1 Voice' : 'Select Voice'}
                value={voice1}
                onChange={setVoice1}
                id="voice1"
              />

              {mode === 'multi' && (
                <>
                  <VoiceSelector 
                    label="Speaker 2 Voice"
                    value={voice2}
                    onChange={setVoice2}
                    id="voice2"
                  />
                  <VoiceSelector 
                    label="Speaker 3 Voice"
                    value={voice3}
                    onChange={setVoice3}
                    id="voice3"
                  />
                </>
              )}
            </div>

            <div className="space-y-4">
              <TextArea
                label="Style Instruction"
                value={styleInstruction}
                onChange={setStyleInstruction}
                placeholder="e.g. Read aloud in a warm and friendly tone: "
                rows={3}
              />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Text to Speak</label>
                  {mode === 'multi' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dialog Mode</span>
                      <button 
                        onClick={() => setIsDialogMode(!isDialogMode)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${isDialogMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isDialogMode ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  )}
                </div>

                {mode === 'multi' && isDialogMode ? (
                  <div className="space-y-3">
                    {dialogBlocks.map((block, index) => (
                      <div key={block.id} className="flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                          <div className="w-full max-w-[160px]">
                            <Select
                              value={block.speaker}
                              onChange={(val) => updateDialogBlock(block.id, { speaker: val as any })}
                              options={[
                                { label: 'Speaker 1', value: 'Speaker 1' },
                                { label: 'Speaker 2', value: 'Speaker 2' },
                                { label: 'Speaker 3', value: 'Speaker 3' }
                              ]}
                            />
                          </div>
                          <button 
                            onClick={() => removeDialogBlock(block.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <TextArea
                          value={block.text}
                          onChange={(val) => updateDialogBlock(block.id, { text: val })}
                          placeholder={`What ${block.speaker} says...`}
                          rows={2}
                        />
                      </div>
                    ))}
                    <Button 
                      variant="secondary" 
                      onClick={addDialogBlock}
                      className="w-full py-3 border-dashed border-2 border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
                    >
                      + Add Speaker Line
                    </Button>
                  </div>
                ) : (
                  <TextArea
                    value={text}
                    onChange={setText}
                    placeholder="Enter the text you want the AI to read..."
                    rows={12}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 mt-4">
              {geminiResult && !activeGeminiTask ? (
                <div className="w-full">
                  <GeminiAudioPlayer 
                    audioUrl={geminiResult.audio_url}
                    fileName={geminiResult.fileName}
                    onDelete={() => setGeminiResult(null)}
                  />
                </div>
              ) : (
                <div className="flex-grow"></div>
              )}

              {!geminiResult && (
                <Button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!activeGeminiTask && !isCheckingUsage) handleRun();
                    }}
                  variant={activeGeminiTask ? 'danger' : 'gradient'}
                  className="w-auto px-6 py-3 text-sm font-black uppercase tracking-[0.2em] transition-all shrink-0 rounded-full"
                  disabled={isPreviewing !== null || isCheckingUsage}
                >
                  {activeGeminiTask ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> {timerCount}s
                    </>
                  ) : isCheckingUsage ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Checking...
                    </>
                  ) : (
                    <>
                      <Play size={18} fill="currentColor" /> Generate
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-end">
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button
                  onClick={() => {
                    setKcMode('single');
                  }}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${kcMode === 'single' ? 'tool-btn-gradient tool-btn-gradient-active text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <User size={14} /> Single
                </button>
                <button
                  onClick={() => {
                    setKcMode('multi');
                    if (!kcText.includes('[V1]')) {
                      setKcText('[V1] မျှင်မျှင်ရေ [V2] ပြောပါကိုကိုတွတ်ရေ [V3] ဟာ ဒီလင်မယားကတော့ လာရိုပြနေတာပဲ');
                    }
                  }}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${kcMode === 'multi' ? 'tool-btn-gradient tool-btn-gradient-active text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Users size={14} /> Multi
                </button>
              </div>
            </div>

            {/* Input and Selectors */}
            <div className="space-y-4">
              <Input
                label="File Name"
                value={kcFileName}
                onChange={setKcFileName}
                placeholder="KC_Voice"
              />
              <TextArea
                value={kcText}
                onChange={setKcText}
                placeholder="Enter text for KC Voice..."
                rows={12}
              />
              <div className={`grid gap-4 ${kcMode === 'multi' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                {/* Character 1 */}
                <div className="flex flex-col gap-1.5 relative character-dropdown-container">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {kcMode === 'single' ? 'Character' : 'Speaker V1'}
                  </label>
                  <button
                    onClick={() => setKcCharOpen(kcCharOpen === 'v1' ? null : 'v1')}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left transition-all hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {KC_CHARACTERS.find(c => c.value === kcV1Voice)?.label || 'Select...'}
                    </span>
                    <span className={`text-indigo-600 transition-transform duration-200 ${kcCharOpen === 'v1' ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {kcCharOpen === 'v1' && (
                    <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="max-h-[200px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {KC_CHARACTERS.map((char) => (
                          <div
                            key={char.value}
                            onClick={() => {
                              setKcV1Voice(char.value);
                              setKcCharOpen(null);
                            }}
                            className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors flex items-center justify-between group ${
                              kcV1Voice === char.value 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="truncate">{char.label}</span>
                              <button
                                onClick={(e) => previewKCCharacter(e, char.value, char.label)}
                                disabled={isPreviewing !== null && isPreviewing !== `kc_${char.value}`}
                                className={`p-1.5 rounded-md transition-all ${
                                  isPreviewing === `kc_${char.value}`
                                    ? 'bg-indigo-100 text-indigo-600'
                                    : 'hover:bg-indigo-100 hover:text-indigo-600 text-gray-400'
                                }`}
                                title="Preview voice"
                              >
                                {isPreviewing === `kc_${char.value}` ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Volume2 size={14} />
                                )}
                              </button>
                            </div>
                            {kcV1Voice === char.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {kcMode === 'multi' && (
                  <>
                    <div className="flex flex-col gap-1.5 relative character-dropdown-container">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Speaker V2</label>
                      <button
                        onClick={() => setKcCharOpen(kcCharOpen === 'v2' ? null : 'v2')}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left transition-all hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {KC_CHARACTERS.find(c => c.value === kcV2Voice)?.label || 'Select...'}
                        </span>
                        <span className={`text-indigo-600 transition-transform duration-200 ${kcCharOpen === 'v2' ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                      {kcCharOpen === 'v2' && (
                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="max-h-[200px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {KC_CHARACTERS.map((char) => (
                              <div
                                key={char.value}
                                onClick={() => {
                                  setKcV2Voice(char.value);
                                  setKcCharOpen(null);
                                }}
                                className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors flex items-center justify-between group ${
                                  kcV2Voice === char.value 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{char.label}</span>
                                  <button
                                    onClick={(e) => previewKCCharacter(e, char.value, char.label)}
                                    disabled={isPreviewing !== null && isPreviewing !== `kc_${char.value}`}
                                    className={`p-1.5 rounded-md transition-all ${
                                      isPreviewing === `kc_${char.value}`
                                        ? 'bg-indigo-100 text-indigo-600'
                                        : 'hover:bg-indigo-100 hover:text-indigo-600 text-gray-400'
                                    }`}
                                  >
                                    {isPreviewing === `kc_${char.value}` ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                                  </button>
                                </div>
                                {kcV2Voice === char.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 relative character-dropdown-container">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Speaker V3</label>
                      <button
                        onClick={() => setKcCharOpen(kcCharOpen === 'v3' ? null : 'v3')}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left transition-all hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {KC_CHARACTERS.find(c => c.value === kcV3Voice)?.label || 'Select...'}
                        </span>
                        <span className={`text-indigo-600 transition-transform duration-200 ${kcCharOpen === 'v3' ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                      {kcCharOpen === 'v3' && (
                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="max-h-[200px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {KC_CHARACTERS.map((char) => (
                              <div
                                key={char.value}
                                onClick={() => {
                                  setKcV3Voice(char.value);
                                  setKcCharOpen(null);
                                }}
                                className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors flex items-center justify-between group ${
                                  kcV3Voice === char.value 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{char.label}</span>
                                  <button
                                    onClick={(e) => previewKCCharacter(e, char.value, char.label)}
                                    disabled={isPreviewing !== null && isPreviewing !== `kc_${char.value}`}
                                    className={`p-1.5 rounded-md transition-all ${
                                      isPreviewing === `kc_${char.value}`
                                        ? 'bg-indigo-100 text-indigo-600'
                                        : 'hover:bg-indigo-100 hover:text-indigo-600 text-gray-400'
                                    }`}
                                  >
                                    {isPreviewing === `kc_${char.value}` ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                                  </button>
                                </div>
                                {kcV3Voice === char.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className={`flex flex-col gap-1.5 relative style-dropdown-container ${kcMode === 'multi' ? 'md:col-span-3' : ''}`}>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Style</label>
                  <button
                    onClick={() => setKcStyleOpen(!kcStyleOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left transition-all hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {KC_STYLES.find(s => s.value === kcStyle)?.label}
                    </span>
                    <span className={`text-indigo-600 transition-transform duration-200 ${kcStyleOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  
                  {kcStyleOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="max-h-[200px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {KC_STYLES.map((style) => (
                          <div
                            key={style.value}
                            onClick={() => {
                              setKcStyle(style.value);
                              setKcStyleOpen(false);
                            }}
                            className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                              kcStyle === style.value 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span>{style.label}</span>
                            {kcStyle === style.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">SRT Ratio:</label>
                <button
                  onClick={() => setKcRatio('16:9')}
                  className={`px-4 py-1 rounded text-xs font-bold transition-all ${kcRatio === '16:9' ? 'tool-btn-gradient tool-btn-gradient-active text-indigo-600 shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'}`}
                >
                  16:9
                </button>
                <button
                  onClick={() => setKcRatio('9:16')}
                  className={`px-4 py-1 rounded text-xs font-bold transition-all ${kcRatio === '9:16' ? 'tool-btn-gradient tool-btn-gradient-active text-indigo-600 shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'}`}
                >
                  9:16
                </button>
              </div>

              {/* Manual Style Controls */}
              <div className="space-y-2">
                <button
                  onClick={() => setKcManualOpen(!kcManualOpen)}
                  className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 transition-all shadow-sm"
                >
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Manual Settings</span>
                  <span className="text-indigo-600 font-bold">{kcManualOpen ? '▲' : '▼'}</span>
                </button>
                
                {kcManualOpen && (
                  <div className="p-4 bg-white border border-gray-100 rounded-xl space-y-4 shadow-inner">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-medium text-gray-700">
                        <span>Pitch</span>
                        <span>{kcPitch}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={kcPitch} onChange={(e) => setKcPitch(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-medium text-gray-700">
                        <span>Rate</span>
                        <span>{kcRate}%</span>
                      </div>
                      <input type="range" min="-100" max="100" value={kcRate} onChange={(e) => setKcRate(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-medium text-gray-700">
                        <span>Volume</span>
                        <span>{kcVolume}</span>
                      </div>
                      <input type="range" min="0" max="20" value={kcVolume} onChange={(e) => setKcVolume(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    </div>
                  </div>
                )}
              </div>

              <Button
                  onClick={activeKCTask || isCheckingUsage ? undefined : handleGenerateKCTTS}
                  className="w-full mt-4"
                  variant={activeKCTask ? 'secondary' : 'gradient'}
                  disabled={!!activeKCTask || isCheckingUsage}
                >
                  {activeKCTask ? `Generating (${timerCount}s)...` : isCheckingUsage ? 'Checking...' : 'Generate'}
              </Button>

              {/* Result Area */}
              {kcResult && (
                <KCAudioPlayer 
                  audioUrl={kcResult.audio_url} 
                  srtUrl={kcResult.srt_url} 
                  fileName={kcResult.fileName || 'KC_Voice'}
                  onDelete={() => setKcResult(null)}
                />
              )}
            </div>
          </div>
        )}
        
        {/* Pronunciation Rules */}
        {voiceEngine === 'kc_tts' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-4">
          <button
            onClick={() => setKcPronunciationOpen(!kcPronunciationOpen)}
            className="w-full flex items-center justify-between p-3"
          >
            <span className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
              <span className="bg-indigo-100 p-1 rounded-sm"><span className="text-indigo-600">🔧</span></span>
              Pronunciation Rules (အသံထွက် ပြင်ဆင်ရန်)
            </span>
            <span className="text-indigo-600 font-bold">{kcPronunciationOpen ? '▲' : '▼'}</span>
          </button>
          {kcPronunciationOpen && (
            <div className="p-4 border-t border-gray-100">
              <TextArea
                value={kcManualText}
                onChange={setKcManualText}
                placeholder="Intro = အင်ထရို
တူမလေး = တူ မ လေး"
                rows={10}
                className="font-mono text-xs"
              />
            </div>
          )}
        </div>
        )}
      </Card>

      {/* History */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
          <History size={16} className="text-indigo-600" /> Generation History
        </h3>
        <div className="grid gap-4">
          {history.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm italic">No history yet. Start generating voices!</p>
            </div>
          ) : (
            history.map(item => (
              <Card key={item.id} className="p-4 flex flex-col sm:flex-row items-center gap-4 group">
                <div className="flex w-full items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Volume2 size={20} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 truncate">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">
                        {item.mode === 'single' ? 'Single' : 'Multi'} {item.voices ? `• ${item.voices.join(', ')}` : ''}
                      </span>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {item.kcResult ? (
                  <div className="w-full sm:w-auto">
                    <KCAudioPlayer 
                      audioUrl={item.kcResult.audio_url} 
                      srtUrl={item.kcResult.srt_url} 
                      fileName={item.kcResult.fileName || 'KC_Voice'}
                      onDelete={() => handleDelete(item.id)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button 
                      variant="secondary" 
                      className="p-2 h-9 w-9 rounded-lg"
                      onClick={() => {
                        const blob = base64ToBlob(item.audioData, 'audio/wav');
                        const url = URL.createObjectURL(blob);
                        setCurrentAudio({ url, id: item.id });
                        playAudio(url);
                      }}
                    >
                      <Play size={16} fill="currentColor" />
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="p-2 h-9 w-9 rounded-lg"
                      onClick={() => handleDownload(item)}
                    >
                      <Download size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="p-2 h-9 w-9 rounded-lg text-red-500 hover:bg-red-50"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AIVoice;
