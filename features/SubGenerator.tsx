
import React, { useState, useMemo } from 'react';
import { UserSession, FeatureType, StoredResult, ProcessingTask } from '../types';
import { Card, Button, ProgressBar, TextArea, ResultBox, TutorialButton } from '../components/Shared';
import { generateSubtitles, convertTextToSRT } from '../services/gemini';
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
  onClearResults: (type: FeatureType) => void;
  onRequireApiKey: () => void;
}

const SubGenerator: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onCopyResult, onDownloadResult, onClearResults,
  onRequireApiKey
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [localProgress, setLocalProgress] = useState(0);

  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'sub-generator' && t.status !== 'completed' && t.status !== 'failed'),
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

  const processMedia = async () => {
    if (!file || activeTask) return;
    if (!checkApiKey()) return;
    const apiKey = session.useCustomKey ? session.customApiKey : session.systemApiKey;
    
    onStartTask('sub-generator', `Generating SRT for ${file.name}`, async (taskId) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (ev) => {
          if (ev.lengthComputable) setLocalProgress((ev.loaded / ev.total) * 100);
        };
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const res = await generateSubtitles(base64, file.type, apiKey);
            onSaveResult({
              type: 'sub-generator',
              title: `AI SRT: ${file.name}`,
              content: res,
              fileName: `subtitles_${file.name}.srt`
            });
            setLocalProgress(0);
            resolve(res);
          } catch (err) { reject(err); }
        };
        reader.readAsDataURL(file);
      });
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="p-2 dark:text-gray-300 dark:hover:bg-gray-800">⬅️ Back</Button>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">SRT Generator</h2>
        </div>
        <div className="ml-14">
          <TutorialButton videoId="bKoi0NHV338" timestamp="0" toolKey="srt_generator" session={session} />
        </div>
      </div>

      <Card className="p-8">
        <div className="mb-8 border-b border-gray-100 pb-4">
          <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-[0.2em]">
            🎬 Upload Media to Generate SRT
          </h3>
        </div>

        {activeTask ? (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Media...</h3>
              <p className="text-gray-500">Generating accurate timestamps and SRT format in the background.</p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={activeTask.progress} label={activeTask.status} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border-2 border-dashed p-10 flex flex-col items-center bg-gray-50 relative rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
              <input type="file" accept="video/*,audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
              <span className="text-4xl mb-2">🎬</span>
              <p className="font-bold text-gray-700">{file ? file.name : "Upload audio or video file"}</p>
            </div>
            {localProgress > 0 && localProgress < 100 && <ProgressBar progress={localProgress} label="Uploading file..." />}
            <Button onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); processMedia(); }} disabled={!file} className="w-full py-4 uppercase tracking-widest text-xs font-bold">
              Generate SRT with Timestamps
            </Button>
            <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest italic">
              AI will listen to the audio and generate a perfectly synchronized SRT file.
            </p>
          </div>
        )}
      </Card>

      <PersistentResults 
        results={results} 
        activeType="sub-generator" 
        onDelete={onDeleteResult}
        onClearAll={() => onClearResults('sub-generator')}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default SubGenerator;
