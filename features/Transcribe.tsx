
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserSession, FeatureType, StoredResult, ProcessingTask } from '../types';
import { Card, Button, ProgressBar, Input, ResultBox, TutorialButton, Modal } from '../components/Shared';
import { transcribeMedia, transcribeYoutubeLink } from '../services/gemini';
import PersistentResults from '../components/PersistentResults';

interface Props {
  onBack: () => void;
  session: UserSession;
  tasks: ProcessingTask[];
  onSaveResult: (result: Omit<StoredResult, 'id' | 'timestamp'>) => void;
  onStartTask: (type: FeatureType, title: string, runAction: (taskId: string) => Promise<any>) => void;
  onUpdateSession: (updates: Partial<UserSession>) => void;
  results: StoredResult[];
  onDeleteResult: (id: string) => void;
  onClearResults: (type: FeatureType) => void;
  onCopyResult: (content: string) => void;
  onDownloadResult: (result: StoredResult) => void;
  onRequireApiKey: () => void;
}

const Transcribe: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onClearResults, onCopyResult, onDownloadResult,
  onRequireApiKey
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [ytUrl, setYtUrl] = useState('');
  const [translateBurmese, setTranslateBurmese] = useState(false);
  const [result, setResult] = useState('');
  const [apiError, setApiError] = useState<{ status: number; message: string; title: string } | null>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);

  const tasksRef = useRef<ProcessingTask[]>(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const activeFileTask = useMemo(() => 
    tasks.find(t => t.type === 'transcribe' && t.title.startsWith('File:') && t.status !== 'completed' && t.status !== 'failed' && !t.isCanceled),
  [tasks]);

  const activeLinkTask = useMemo(() => 
    tasks.find(t => t.type === 'transcribe' && t.title.startsWith('Link:') && t.status !== 'completed' && t.status !== 'failed' && !t.isCanceled),
  [tasks]);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFileUpload = async () => {
    if (!file || activeFileTask || isCheckingUsage) return;
    if (!checkApiKey()) return;

    try {
      setIsCheckingUsage(true);
      const { checkAndIncrementUsage } = await import('../services/usageService');
      const { allowed, message } = await checkAndIncrementUsage(
        'transcribe', 
        session.role !== 'free' ? (session.user?.id || 'logged_in') : null,
        false,
        session.user?.linkTranscribeExpiry
      );
      
      if (!allowed) {
        setApiError({ status: 402, message: message || 'Daily limit exceeded', title: 'Usage Limit Reached' });
        return;
      }
    } finally {
      setIsCheckingUsage(false);
    }

    const apiKey = session.useCustomKey ? session.customApiKey : session.systemApiKey;
    
    onStartTask('transcribe', `File: ${file.name}`, async (taskId) => {
      const isCanceled = () => tasksRef.current.find(t => t.id === taskId)?.isCanceled;

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const res = await transcribeMedia(
              base64, 
              file.type, 
              apiKey, 
              session.useCustomKey ? undefined : session.allApiKeys
            );
            
            if (isCanceled()) return resolve(null);

            setResult(res);
            onSaveResult({
              type: 'transcribe',
              title: `Transcription: ${file.name}`,
              content: res,
              fileName: `transcription_${file.name}.txt`
            });
            resolve(res);
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error("File read error"));
        reader.readAsDataURL(file);
      });
    });
  };

  const processYoutubeLink = async () => {
    if (!ytUrl || activeLinkTask || isCheckingUsage) return;

    try {
      setIsCheckingUsage(true);
      const { checkAndIncrementUsage } = await import('../services/usageService');
      const { allowed, message } = await checkAndIncrementUsage(
        'transcribe', 
        session.role !== 'free' ? (session.user?.id || 'logged_in') : null,
        true,
        session.user?.linkTranscribeExpiry
      );
      
      if (!allowed) {
        setApiError({ status: 402, message: message || 'Daily limit exceeded', title: 'Usage Limit Reached' });
        return;
      }
    } finally {
      setIsCheckingUsage(false);
    }

    const apiKey = session.useCustomKey ? session.customApiKey : session.systemApiKey;
    
    onStartTask('transcribe', `Link: ${ytUrl.substring(0, 30)}...`, async (taskId) => {
      try {
        const resData = await transcribeYoutubeLink(ytUrl, apiKey, translateBurmese);
        
        if (tasksRef.current.find(t => t.id === taskId)?.isCanceled) return;

        // Ensure content is a string to avoid React rendering errors
        let content = typeof resData.text === 'string' 
          ? resData.text 
          : JSON.stringify(resData.text);

        if (resData.sources && resData.sources.length > 0) {
          content += "\n\n--- Search References ---\n" + resData.sources.map((s: any) => s.web?.uri || "").filter(Boolean).join("\n");
        }
        
        setResult(content);
        onSaveResult({
          type: 'transcribe',
          title: `Video Transcription: ${ytUrl}`,
          content: content,
          fileName: `video_transcription.txt`
        });
        return content;
      } catch (err: any) {
        if (tasksRef.current.find(t => t.id === taskId)?.isCanceled) return;
        if (err.status) {
          let errorTitle = "Transcription Error";
          let userMsg = err.message || "An unexpected error occurred.";

          switch (err.status) {
            case 400:
              errorTitle = "Invalid Link";
              userMsg = "Invalid YouTube URL. Please check the link for errors.";
              break;
            case 401:
              errorTitle = "Authentication Error";
              userMsg = "System configuration error (Unauthorized). Please contact support.";
              break;
            case 402:
              errorTitle = "Credits Exhausted";
              userMsg = "Service limit reached (Credits exhausted). Please try again later or top up your credits.";
              break;
            case 404:
              errorTitle = "No Captions Found";
              userMsg = "Transcript not found. This video might not have captions or is restricted.";
              break;
            case 429:
              errorTitle = "Rate Limited";
              userMsg = "Too many requests. Please wait a moment before trying again.";
              break;
            case 500:
            case 503:
              errorTitle = "Service Unavailable";
              userMsg = "The transcript service is currently unavailable. Please try again later.";
              break;
          }
          
          setApiError({ status: err.status, message: userMsg, title: errorTitle });
        }
        throw err;
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="p-2 dark:text-gray-300 dark:hover:bg-gray-800">⬅️ Back</Button>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Transcribe</h2>
        </div>
        <div className="ml-14">
          <TutorialButton videoId="Xdd9xScgNPM" timestamp="30" toolKey="transcribe" session={session} />
        </div>
      </div>

      <Card className="p-8">
        <div className="flex gap-4 mb-8 border-b border-gray-100 pb-4">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'upload' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            📁 File Upload
          </button>
          <button 
            onClick={() => setActiveTab('youtube')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'youtube' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            📺 Video Link Transcription
          </button>
        </div>

        {activeTab === 'upload' && activeFileTask ? (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transcribing File...</h3>
              <p className="text-gray-500 text-sm italic">Our specialized AI is listening and transcribing the audio directly into text.</p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={activeFileTask.progress} label={activeFileTask.status} />
            </div>
          </div>
        ) : activeTab === 'youtube' && activeLinkTask ? (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transcribing Video link...</h3>
              <p className="text-gray-500 text-sm italic">Our specialized AI is extracting and transcribing the video content.</p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={activeLinkTask.progress} label={activeLinkTask.status} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {activeTab === 'upload' ? (
              <div className="flex flex-col items-center gap-6">
                <div className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                  <input type="file" accept="audio/*,video/*" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="text-5xl mb-4">📁</div>
                  <p className="text-gray-700 font-bold">{file ? file.name : "Click or drag to upload audio/video"}</p>
                </div>
                <Button variant="primary" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); processFileUpload(); }} disabled={!file || activeFileTask !== undefined || isCheckingUsage} className="w-full py-4 text-xs font-bold uppercase tracking-widest">
                  {isCheckingUsage ? 'Checking...' : 'Transcribe File'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                  <Input 
                    label="Video Link (YouTube, TikTok, Facebook)" 
                    placeholder="Paste link here..." 
                    value={ytUrl} 
                    onChange={setYtUrl} 
                  />
                  
{/* 
                  <div className="mt-6 flex items-center justify-between p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-indigo-900 uppercase tracking-widest">Translate Transcription to Burmese</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Converts the output to Burmese</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={translateBurmese} 
                        onChange={(e) => setTranslateBurmese(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  */}

                  <p className="mt-4 text-[10px] text-indigo-400 font-bold uppercase tracking-widest italic">
                    Fast and accurate transcription of video content directly into text.
                  </p>
                </div>
                <Button variant="primary" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); processYoutubeLink(); }} disabled={!ytUrl || activeLinkTask !== undefined || isCheckingUsage} className="w-full py-4 text-xs font-bold uppercase tracking-widest">
                  {isCheckingUsage ? 'Checking...' : 'Transcribe Video Link'}
                </Button>
              </div>
            )}
          </div>
        )}

        <ResultBox 
          title="Transcription Result" 
          content={result} 
          onCopy={() => onCopyResult(result)}
          onClear={() => setResult('')}
          onDownload={() => onDownloadResult({
            id: 'temp', type: 'transcribe', timestamp: Date.now(),
            title: 'Download Transcription', content: result, fileName: 'transcription.txt'
          })}
        />
      </Card>

      <Modal 
        isOpen={!!apiError} 
        onClose={() => setApiError(null)} 
        title={apiError?.title || "Error"}
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-3xl">
            {apiError?.status === 402 ? '💳' : apiError?.status === 404 ? '🔇' : '⚠️'}
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{apiError?.title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              {apiError?.message}
            </p>
          </div>
          <div className="pt-4 w-full">
            <Button onClick={() => setApiError(null)} className="w-full shadow-lg shadow-blue-100 dark:shadow-none">
              Got it
            </Button>
          </div>
        </div>
      </Modal>

      <PersistentResults 
        results={results} 
        activeType="transcribe" 
        onDelete={onDeleteResult}
        onClearAll={() => onClearResults('transcribe')}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default Transcribe;
