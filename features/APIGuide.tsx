
import React from 'react';
import { Card, Button } from '../components/Shared';
import { ArrowLeft, Info, Zap, Mic, Video, Clock, Repeat } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const APIGuide: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="p-2 dark:text-gray-300">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">API အသုံးပြုမှု လမ်းညွှန် (API Guide)</h2>
      </div>

      {/* YouTube Video Player */}
      <Card className="overflow-hidden border-indigo-100 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800">
        <div className="aspect-video w-full bg-slate-100 dark:bg-gray-900">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="API Guide Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          ></iframe>
        </div>
        <div className="p-4 bg-indigo-50/50 dark:bg-gray-700">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <Video size={14} /> API Setup & Usage Tutorial
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gemini 3 Flash */}
        <Card className="p-6 border-amber-100 dark:border-gray-700 bg-amber-50/20 dark:bg-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 dark:text-gray-100">Gemini 3 Flash</h3>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Fast & Efficient</p>
            </div>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><Repeat size={14} /> တစ်မိနစ်လျှင် (RPM)</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">၁၅ ကြိမ်</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><Clock size={14} /> တစ်ရက်လျှင် (RPD)</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">၁၅၀၀ ကြိမ်</span>
            </li>
            <li className="pt-2 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic">
              * Transcribe, Translate နှင့် Subtitle ထုတ်ခြင်းများအတွက် အဓိက အသုံးပြုပါသည်။
            </li>
          </ul>
        </Card>

        {/* Gemini 3 Pro */}
        <Card className="p-6 border-indigo-100 dark:border-gray-700 bg-indigo-50/20 dark:bg-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Info size={24} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 dark:text-gray-100">Gemini 3 Pro</h3>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Complex Reasoning</p>
            </div>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><Repeat size={14} /> တစ်မိနစ်လျှင် (RPM)</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">၂ ကြိမ်</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><Clock size={14} /> တစ်ရက်လျှင် (RPD)</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">၅၀ ကြိမ်</span>
            </li>
            <li className="pt-2 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic">
              * Script Writing နှင့် Content Creation များအတွက် အဓိက အသုံးပြုပါသည်။
            </li>
          </ul>
        </Card>
      </div>

      {/* AI Voice & Transcribe Details */}
      <Card className="p-8 border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2 uppercase tracking-tight">
          <Mic size={20} className="text-indigo-600 dark:text-indigo-400" /> အသံထုတ်ခြင်းနှင့် စာသားပြောင်းခြင်း ကန့်သတ်ချက်များ
        </h3>
        
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">AI Voice (TTS)</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm border-b border-slate-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Flash TTS (RPM/RPD)</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">၁၀ / ၁၅၀၀ ကြိမ်</span>
                </div>
                <div className="flex justify-between text-sm border-b border-slate-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Pro TTS (RPM/RPD)</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">၂ / ၅၀ ကြိမ်</span>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 italic">
                  * တစ်ကြိမ်လျှင် စာလုံးရေ ၅၀၀၀ အထိ (မိနစ် ၂၀ ခန့်) ထုတ်ပေးနိုင်သော်လည်း API Key ၏ တစ်ရက်စာ ကန့်သတ်ချက် (RPD) အတိုင်းသာ အသုံးပြုနိုင်ပါသည်။
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Transcribe (Video/Audio)</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm border-b border-slate-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Flash Model သုံးလျှင်</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">၁၅၀၀ ကြိမ်/ရက်</span>
                </div>
                <div className="flex justify-between text-sm border-b border-slate-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Pro Model သုံးလျှင်</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">၅၀ ကြိမ်/ရက်</span>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 italic">
                  * ဖိုင်အရွယ်အစား ၁၀ မိနစ်ထက် ကျော်လွန်ပါက Flash Model ကိုသာ အသုံးပြုရန် အကြံပြုပါသည်။
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
            <p className="text-xs text-red-600 dark:text-red-400 font-bold leading-relaxed">
              မှတ်ချက် - အထက်ပါ ကန့်သတ်ချက်များသည် Google Gemini API ၏ Free Tier (အခမဲ့) အတွက် ဖြစ်ပါသည်။ Quota ပြည့်သွားပါက နောက်တစ်ရက်တွင် ပြန်လည် အသုံးပြုနိုင်မည် ဖြစ်ပါသည်။
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-center pt-4">
        <Button variant="ghost" onClick={onBack} className="font-bold text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default APIGuide;
