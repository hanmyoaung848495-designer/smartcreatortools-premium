
import React, { useState, useMemo } from 'react';
import { UserSession, StoredResult, ProcessingTask, FeatureType } from '../types';
import { Card, Button, Input, Select, ResultBox, ProgressBar, TutorialButton } from '../components/Shared';
import { writeScript } from '../services/gemini';
import PersistentResults from '../components/PersistentResults';

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

const ScriptWriter: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onCopyResult, onDownloadResult,
  onRequireApiKey
}) => {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('creative');
  const [customStyle, setCustomStyle] = useState('');
  const [length, setLength] = useState('short');
  const [lang, setLang] = useState('English');
  const [result, setResult] = useState('');

  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'script-writer' && t.status !== 'completed' && t.status !== 'failed'),
  [tasks]);

  const finalStyle = style === 'custom' ? customStyle : style;

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

  const handleGenerate = async () => {
    if (!topic || activeTask) return;
    if (style === 'custom' && !customStyle) return;
    if (!checkApiKey()) return;
    const apiKey = session.useCustomKey ? session.customApiKey : session.systemApiKey;
    
    onStartTask('script-writer', `Writing Script: ${topic}`, async () => {
      const res = await writeScript(topic, finalStyle, length, lang, apiKey);
      setResult(res);
      onSaveResult({
        type: 'script-writer',
        title: `AI Script: ${topic}`,
        content: res,
        fileName: `script_${topic.substring(0, 15)}.txt`
      });
      return res;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="p-2 dark:text-gray-300 dark:hover:bg-gray-800">⬅️ Back</Button>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">AI Script Writer</h2>
        </div>
        <div className="ml-14">
          <TutorialButton videoId="5D66YbnUO1s" timestamp="10" toolKey="script_writer" session={session} />
        </div>
      </div>

      <Card className="p-8">
        {activeTask ? (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI is Drafting...</h3>
              <p className="text-gray-500">Composing scenes and dialogue in the background.</p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={activeTask.progress} label={activeTask.status} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <Input label="Script Topic / Title" value={topic} onChange={setTopic} placeholder="e.g. A journey through the hidden temples of Bagan" />
            </div>
            <Select 
              label="Style" 
              value={style} 
              onChange={setStyle} 
              options={[
                { label: 'Creative', value: 'creative' },
                { label: 'Emotional', value: 'emotional' },
                { label: 'Horror', value: 'horror' },
                { label: 'Professional', value: 'professional' },
                { label: 'Funny', value: 'funny' },
                { label: 'Custom', value: 'custom' },
              ]} 
            />
            {style === 'custom' && (
              <Input label="Custom Style" value={customStyle} onChange={setCustomStyle} placeholder="e.g. Action-packed, Mystery, Sci-fi" />
            )}
            <Select 
              label="Length" 
              value={length} 
              onChange={setLength} 
              options={[
                { label: 'Short (1-3 pages)', value: 'short' },
                { label: 'Long (5-15 pages)', value: 'long' },
              ]} 
            />
            <Select 
              label="Language" 
              value={lang} 
              onChange={setLang} 
              options={LANGUAGES} 
            />
            <div className="md:col-span-2">
              <Button onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleGenerate(); }} disabled={!topic || (style === 'custom' && !customStyle)} className="w-full py-4">
                Generate Full Script
              </Button>
            </div>
          </div>
        )}
        <ResultBox 
          title="Generated Script" 
          content={result} 
          onCopy={() => onCopyResult(result)}
        />
      </Card>

      <PersistentResults 
        results={results} 
        activeType="script-writer" 
        onDelete={onDeleteResult}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default ScriptWriter;
