
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserSession, StoredResult, ProcessingTask, FeatureType } from '../types';
import { Card, Button, Select, ResultBox, ProgressBar, TutorialButton } from '../components/Shared';
import { translateSRT } from '../services/gemini';
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
  onCopyResult: (content: string) => void;
  onDownloadResult: (result: StoredResult) => void;
  onRequireApiKey: () => void;
}

const LANGUAGES = [
  { label: 'English', value: 'English' },
  { label: 'Burmese', value: 'Burmese' },
  { label: 'Thai', value: 'Thai' },
  { label: 'Korean', value: 'Korean' },
  { label: 'Japanese', value: 'Japanese' },
  { label: 'Chinese', value: 'Chinese' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'French', value: 'French' },
];

const SRTTranslate: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onCopyResult, onDownloadResult,
  onRequireApiKey
}) => {
  const [inputType, setInputType] = useState<'file' | 'text'>('file');
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [srtContent, setSrtContent] = useState('');
  const [targetLang, setTargetLang] = useState('English');
  const [customFileName, setCustomFileName] = useState('');
  const [result, setResult] = useState('');

  const tasksRef = useRef<ProcessingTask[]>(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const getFinalFileName = () => {
    let baseName = customFileName.trim();
    if (!baseName) {
      if (inputType === 'file' && srtFile) {
        baseName = `translated_${targetLang}_${srtFile.name.replace(/\.srt$/i, '')}`;
      } else {
        baseName = `translated_${targetLang}`;
      }
    } else {
      baseName = baseName.replace(/\.srt$/i, '');
    }
    return `${baseName}.srt`;
  };

  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'srt-translate' && t.status !== 'completed' && t.status !== 'failed' && !t.isCanceled),
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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSrtFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setSrtContent(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  const handleTranslate = async () => {
    if (!srtContent || activeTask) return;
    if (!checkApiKey()) return;
    const apiKey = session.useCustomKey ? session.customApiKey : session.systemApiKey;
    
    const finalFileName = getFinalFileName();
    const taskTitle = customFileName.trim() ? customFileName : (srtFile?.name || 'Pasted Text');

    onStartTask('srt-translate', `Translating Subtitles: ${taskTitle}`, async (taskId) => {
      const res = await translateSRT(srtContent, targetLang, apiKey);
      if (tasksRef.current.find(t => t.id === taskId)?.isCanceled) return;

      setResult(res);
      onSaveResult({
        type: 'srt-translate',
        title: `SRT Translation (${targetLang}): ${taskTitle}`,
        content: res,
        fileName: finalFileName
      });
      return res;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="p-2 dark:text-gray-300 dark:hover:bg-gray-800">⬅️ Back</Button>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">SRT Translate</h2>
        </div>
        <div className="ml-14">
          <TutorialButton videoId="epA3sSWCLx4" timestamp="30" toolKey="srt_translate" session={session} />
        </div>
      </div>

      <Card className="p-8" isGradient={false}>
        {activeTask ? (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Translating SRT...</h3>
              <p className="text-gray-500 italic">Maintaining timestamps precisely...</p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={activeTask.progress} label={activeTask.status} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setInputType('file')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${inputType === 'file' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Upload SRT File
              </button>
              <button
                onClick={() => setInputType('text')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${inputType === 'text' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Paste SRT Text
              </button>
            </div>

            {inputType === 'file' ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 flex flex-col items-center bg-slate-50 dark:bg-gray-800/50 relative hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
                 <input type="file" accept=".srt" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
                 <span className="text-4xl mb-3">📄</span>
                 <p className="font-semibold text-gray-700 dark:text-gray-300 text-center">
                   {srtFile ? srtFile.name : "Click or drag to upload .srt file"}
                 </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">SRT Content</label>
                <textarea
                  value={srtContent}
                  onChange={(e) => setSrtContent(e.target.value)}
                  placeholder="1&#10;00:00:01,000 --> 00:00:04,000&#10;Hello World..."
                  className="w-full h-48 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all resize-none font-mono text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select 
                label="Translate to" 
                value={targetLang} 
                onChange={setTargetLang} 
                options={LANGUAGES}
              />
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Save As (File Name)</label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder={inputType === 'file' && srtFile ? `translated_${targetLang}_${srtFile.name.replace(/\.srt$/i, '')}` : `translated_${targetLang}`}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all"
                />
              </div>
            </div>

            <Button onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleTranslate(); }} className="w-full py-4 text-lg" disabled={!srtContent}>
              Translate Subtitles
            </Button>
          </div>
        )}

        <ResultBox 
          title="Translated SRT" 
          content={result} 
          onCopy={() => onCopyResult(result)}
          onDownload={() => onDownloadResult({
            id: 'temp', type: 'srt-translate', timestamp: Date.now(), 
            title: 'Download', content: result, fileName: getFinalFileName()
          })}
        />
      </Card>

      <PersistentResults 
        results={results} 
        activeType="srt-translate" 
        onDelete={onDeleteResult}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default SRTTranslate;
