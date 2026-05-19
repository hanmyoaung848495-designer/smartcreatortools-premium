
import React, { useState } from 'react';
import { toast } from 'sonner';
import { FeatureType, StoredResult, UserSession, ProcessingTask } from '../types';
import { Card, Button, TextArea, Input, Modal, TutorialButton } from '../components/Shared';
import PersistentResults from '../components/PersistentResults';

interface Props {
  session: UserSession;
  onSaveResult: (result: Omit<StoredResult, 'id' | 'timestamp'>) => void;
  onStartTask: (type: FeatureType, title: string, runAction: (taskId: string) => Promise<any>) => void;
  results: StoredResult[];
  onDeleteResult: (id: string) => void;
  onClearResults: (type: FeatureType) => void;
  onCopyResult: (content: string) => void;
  onDownloadResult: (result: StoredResult) => void;
  onBack: () => void;
}

const TextToSRT: React.FC<Props> = ({
  session,
  onSaveResult,
  results,
  onDeleteResult,
  onClearResults,
  onCopyResult,
  onDownloadResult,
  onBack
}) => {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [touched, setTouched] = useState(false);
  const [showError, setShowError] = useState(false);

  const formatTime = (timeStr: string) => {
    const [main, ms] = timeStr.split(/[.,]/);
    const parts = main.split(':');
    let hh = '00', mm = '00', ss = '00';
    
    if (parts.length === 3) {
      [hh, mm, ss] = parts;
    } else if (parts.length === 2) {
      [mm, ss] = parts;
    } else if (parts.length === 1) {
      ss = parts[0];
    }

    const formattedMain = `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
    const formattedMs = (ms || '000').padEnd(3, '0').slice(0, 3);
    return `${formattedMain},${formattedMs}`;
  };

  const parseToSRT = (input: string) => {
    const lines = input.split('\n').map(l => l.trim());
    let srtContent = '';
    let index = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.match(/^\d+$/)) continue; // Skip empty lines and index numbers

      // Support various timestamp formats including those with commas/dots
      const timePattern = /(\d{1,2}:\d{1,2}(?::\d{1,2})?(?:[.,]\d{1,3})?)/;
      const tsMatch = line.match(new RegExp(`${timePattern.source}\\s*(?:-->|[-–—])\\s*${timePattern.source}\\s*:?\\s*(.*)`));
      const bracketMatch = line.match(new RegExp(`\\[${timePattern.source}\\s*[-–—]\\s*${timePattern.source}\\]\\s*(.*)`));

      const match = tsMatch || bracketMatch;
      if (match) {
        const start = formatTime(match[1]);
        const end = formatTime(match[2]);
        let content = match[3]?.trim();

        // If no text content on the same line, check the next line (Standard SRT format)
        if (!content && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          // If next line is not a timestamp or a number, it's likely the text
          if (nextLine && !nextLine.match(/^\d+$/) && !nextLine.match(/\d{1,2}:\d{1,2}/)) {
            content = nextLine;
            i++; // Skip the next line as we've used it
          }
        }

        if (!content) content = '...';
        
        srtContent += `${index}\n${start} --> ${end}\n${content}\n\n`;
        index++;
      }
    }
    return srtContent;
  };

  const handleGenerate = () => {
    setTouched(true);
    if (!fileName.trim()) {
      return;
    }
    if (!text.trim()) {
      toast.error('ကျေးဇူးပြု၍ စာသားထည့်ပါ', {
        style: { borderRadius: '1rem' }
      });
      return;
    }

    const srtOutput = parseToSRT(text);
    if (!srtOutput) {
      setShowError(true);
      return;
    }

    const finalFileName = fileName.trim();
    
    onSaveResult({
      type: 'text-to-srt',
      title: finalFileName,
      content: srtOutput,
      fileName: `${finalFileName}.srt`,
      mimeType: 'text/plain'
    });

    setText('');
    setFileName('');
    setTouched(false);
    toast.success('SRT File အဖြစ်ပြောင်းလဲပြီးပါပြီ', {
      icon: '🎬',
      style: { borderRadius: '1rem' }
    });
  };

  const handleDownload = (result: StoredResult) => {
    onDownloadResult(result);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Modal 
        isOpen={showError} 
        onClose={() => setShowError(false)} 
        title="Format မှားယွင်းနေပါသည်"
      >
        <div className="space-y-4">
          <p className="text-red-500 font-bold">ထည့်သွင်းလိုက်သော စာသားသည် သတ်မှတ်ထားသော Format နှင့် မကိုက်ညီပါ။</p>
          <div className="bg-gray-50 p-4 rounded-xl space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">မှန်ကန်သော ပုံစံများ -</p>
            <ul className="text-sm space-y-1 text-gray-600 font-mono">
              <li>00:00:05 - 00:00:10: စာသား</li>
              <li>00:00:05 - 00:00:10 စာသား</li>
              <li>[00:00:05 - 00:00:10] စာသား</li>
              <li>00:05 - 00:10 စာသား</li>
            </ul>
          </div>
          <p className="text-sm text-gray-500 italic">မှတ်ချက်: အချိန်အပိုင်းအခြားနှင့် စာသားကြားတွင် space သို့မဟုတ် colon (:) ပါရှိရပါမည်။</p>
        </div>
      </Modal>

      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack} className="p-2 dark:text-gray-300 dark:hover:bg-gray-800">⬅️ Back</Button>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Text to SRT</h2>
          </div>
          <div className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-100 dark:border-indigo-800">
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">No API Key Required</span>
          </div>
        </div>
        <div className="ml-14">
          <TutorialButton videoId="sGHe7nhThwo" timestamp="30" toolKey="text_to_srt" session={session} />
        </div>
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-2xl md:text-4xl font-black leading-tight tracking-tighter" 
            style={{ 
              color: '#FFD700', 
              textShadow: '2px 2px 0px #b8860b, 4px 4px 0px rgba(0,0,0,0.1)',
              WebkitTextStroke: '1px #b8860b'
            }}>
          Geminiကကူးလာတဲ့စာသားတွေကိုအောက်မှာထည့်ပြီး Generateကိုနှိပ်ပါ
        </h2>
      </div>

      <Card className="p-6 md:p-8 max-w-4xl mx-auto shadow-xl border-indigo-50">
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className={`text-sm font-bold transition-colors ${(!fileName.trim() && touched) ? 'text-red-500' : 'text-blue-600'}`}>
              ဖိုင်နာမည်ထည့်ပါ
            </label>
            <Input
              placeholder="(ဥပမာ - subtitle_ep1)"
              value={fileName}
              onChange={(val) => {
                setFileName(val);
                setTouched(true);
              }}
              className="w-full"
            />
          </div>

          <TextArea
            placeholder={`00:00:05 - 00:00:10: Text here\n00:00:05 --> 00:00:10 Text here\n\nပေးထားတဲ့ ဥပမာတွေအတိုင်းထည့်ပေးပါ`}
            value={text}
            onChange={setText}
            rows={12}
          />

          <div className="flex justify-center">
            <Button 
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleGenerate(); }} 
              className="w-full md:w-auto min-w-[200px] h-[46px] text-sm font-bold uppercase tracking-widest"
              disabled={!fileName.trim() || !text.trim()}
            >
              🚀 Generate SRT File
            </Button>
          </div>
        </div>
      </Card>

      <PersistentResults
        results={results}
        activeType="text-to-srt"
        onDelete={onDeleteResult}
        onClearAll={() => onClearResults('text-to-srt')}
        onCopy={onCopyResult}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default TextToSRT;
