import React, { useState, useEffect } from 'react';
import { Button, Card } from '../components/Shared';
import { ArrowLeft, Play, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TutorialItem {
  id?: number;
  title: string;
  description: string;
  videoId?: string;
  timestamp?: string;
}

const DEFAULT_TUTORIALS: TutorialItem[] = [
  {
    title: "AI Voice (AIအသံထုတ်ရန်)",
    description: `KC Voice နဲ့ Gemini Voice နှစ်မျိုးရှိပါတယ်။
KC Voice တွင်အသံထုတ်ပါက အသံဖိုင်နှင့်အတူ တိကျတဲ့စာတန်းထိုး(SRT)ဖိုင်ကိုပါရရှိမှာဖြစ်ပါတယ်။ အသံအနှေးအမြန်၊pitchတွေကိုလည်းစိတ်ကြိုက်ချိန်ညှိနိုင်ပါတယ်။
Gemini Voice သည်Google AI Studioကိုသွားစရာမလိုဘဲ Gemini အသံများကိုလွယ်လွယ်ကူကူထုတ်နိုင်အောင်စမ်းသပ်ထားခြင်းဖြစ်ပါတယ်။ Style instructions မှာမိမိဖတ်စေချင်တဲ့ပုံစံများကိုအင်္ဂလိပ်လိုရောမြန်မာလိုပါရေးသားနိုင်ပါတယ်။
ဖတ်စေလိုတဲ့စာပိုဒ်ရဲ့စာသားများရှေ့တွင်အောက်မှာပြထားတဲ့ Audio tags များကိုလိုအပ်သလိုထည့်သွင်းအသုံးပြုခြင်းအားဖြင့်ပိုကောင်းတဲ့ရလဒ်ကိုရရှိမှာဖြစ်ပါတယ်။

အသံထိန်းချုပ်ရန် Tag များ
(Gemini Voice အတွက်သာ)

 [pause=0.5] (အချိန်အတိုင်းအတာဖြင့် ရပ်ရန်)
 [short pause] (ခဏတဖြုတ် ရပ်ရန်)
 [fast] (မြန်မြန်ပြောရန်)
 [very fast] (အလွန်မြန်မြန်ပြောရန်)
 [slow] (နှေးနှေးပြောရန်)
 [very slow] (အလွန်နှေးနှေးပြောရန်)
ခံစားချက်နှင့် ဟန်ပန်ဖော်ပြရန် Tag များ
 [excited] (စိတ်လှုပ်ရှားစွာဖြင့်)
 [cried] (ငိုသံပါပါဖြင့်)
 [sad] (ဝမ်းနည်းစွာဖြင့်)
 [happy] (ပျော်ရွှင်စွာဖြင့်)
 [cheerful] (ရွှင်လန်းတက်ကြွစွာဖြင့်)
 [reluctantly] (မလိုလားဘဲ တုံ့ဆိုင်းဆိုင်းဖြင့်)
 [determination] (စိတ်ပိုင်းဖြတ်ထားသည့်ဟန်ဖြင့်)
 [shocked] (အံ့အားသင့်စွာဖြင့်)
 [anxious] (စိုးရိမ်ပူပန်စွာဖြင့်)
 [whispers] (တီးတိုးပြောရန်)
 [shouting] (အော်ပြောရန်)
 [conversational] (သာမန် စကားပြောသလို သဘာဝကျကျပြောရန်)
 [neutral] (ခံစားချက်မပါဘဲ ရိုးရိုးပြောရန်)
 [sarcastically] (ခနဲ့တဲ့တဲ့ ရွဲ့ပြောရန်)
 [sinister] (ကြောက်မက်ဖွယ် / မကောင်းဆိုးဝါးဟန်ဖြင့်)
 [laughing] (ရယ်မောလျက်ပြောရန်)
အထူးအသံနေအသံထားများ
 [like Eminem] (ရက်ပါသီချင်းဆိုသလို)
 [like grandpal] (အဘိုးအိုအသံ)
 [cartoon dog voice] (ကာတွန်းခွေးလေးအသံ)
 [Dracula tone] (ဒရက်ကူလာ လေသံ)
 [sarcastically, one painfully slow word at a time] (ရွဲ့ပြီး တစ်လုံးချင်းစီ အလွန်နှေးကွေးစွာ အားယူပြောရန်)

အဆင်မပြေပါက Admin ထံဆက်သွယ်မေးမြန်းလို့ရပါတယ်ခင်ဗျာ။`,
    videoId: "sGHe7nhThwo",
    timestamp: "30"
  },
  {
    title: "Transcribe (အသံဖိုင်မှ စာသားပြောင်းခြင်း)",
    description: "Tutorial videoတွေမလုပ်ရသေးလို့ သီချင်းလေးပဲနားထောင်ပေးပါဦး။ \n ဗီဒီယို သို့မဟုတ် အသံဖိုင်များမှ စကားပြောများကို စာသားအဖြစ် အလိုအလျောက် ပြောင်းလဲပေးပါသည်။ YouTube Link များမှလည်း တိုက်ရိုက် ပြောင်းလဲနိုင်ပါသည်။",
    videoId: "Xdd9xScgNPM",
    timestamp: "30"
  },
  {
    title: "Translator (ဘာသာပြန်ဆိုခြင်း)",
    description: "စာသားများ သို့မဟုတ် SRT ဖိုင်များကို အချိန်မှတ်များ မလွဲချော်စေဘဲ အခြားဘာသာစကားများသို့ တိကျစွာ ဘာသာပြန်ပေးပါသည်။",
    videoId: "epA3sSWCLx4",
    timestamp: "30"
  },
  {
    title: "SRT Generator (SRT ဖိုင်ထုတ်ပေးခြင်း)",
    description: "ဗီဒီယိုနှင့် အသံဖိုင်များမှ အချိန်အတိအကျပါဝင်သော SRT Subtitle ဖိုင်များကို အလိုအလျောက် ထုတ်ပေးပါသည်။",
    videoId: "bKoi0NHV338",
    timestamp: "0"
  },
  {
    title: "AI Script Writer (AI ဖြင့် ဇာတ်ညွှန်းရေးခြင်း)",
    description: "သင်ပေးလိုက်သော ခေါင်းစဉ်အပေါ် မူတည်၍ စိတ်ဝင်စားဖွယ်ကောင်းသော Script များကို AI က ရေးသားပေးမည် ဖြစ်ပါသည်။ Style နှင့် Length ကိုလည်း စိတ်ကြိုက် ရွေးချယ်နိုင်ပါသည်။",
    videoId: "5D66YbnUO1s",
    timestamp: "10"
  },
  {
    title: "Teleprompter (တယ်လီပရွန်တာ)",
    description: `Teleprompter ကို ကိုယ်ပိုင်အသံဖြင့်အသံသွင်းပြီး content ဖန်တီးသူများအတွက်အဆင်ပြေစေရန်ရည်ရွယ်ဖန်တီးထားပါတယ်။ မိမိဖတ်လိုသောစာသားကိုထည့်ပြီး Auto Scroll လုပ်ကာစာသားများကိုဖတ်ပြီးအသံသွင်းနိုင်ပါတယ်။ Scroll လုပ်တဲ့ speedအနှေးအမြန်၊စာလံုးအကြီးအသေးချိန်နိုင်သလို ဖတ်နေစဉ်မှာ လက်နဲ့ဖိ၍လဲရပ်ထားနိုင်ပါတယ်။
Gemini APIထည့်ပြီး ခေါင်းစဉ်ပေးက AIကိုလည်းဇာတ်လမ်းရေးခိုင်းနိုင်ပါတယ်။`,
    videoId: "-3FIdZrEnFE",
    timestamp: "2"
  },
  {
    title: "Text To SRT (စာသားမှ SRT ပြောင်းခြင်း)",
    description: "အချိန်မှတ် (Timestamp) ပါဝင်သော စာသားများကို SRT ဖိုင်အဖြစ်သို့ လွယ်ကူလျင်မြန်စွာ ပြောင်းလဲပေးပါသည်။ API Key မလိုဘဲ အသုံးပြုနိုင်ပါသည်။",
    videoId: "sGHe7nhThwo",
    timestamp: "30"
  },
  {
    title: "AI ဖြင့်မြန်မာသီချင်းဖန်တီးနည်း",
    description: "မြန်မာသံပီပီသသနဲ့ AIသီချင်းဖန်တီးဖို့ အသေးစိတ်ပြောပြပေးထားပါတယ်",
    videoId: "YNYx2t_F2e8",
    timestamp: "0"
  }
];

const YouTubeEmbed: React.FC<{ videoId: string; timestamp?: string }> = ({ videoId, timestamp }) => {
  const start = timestamp ? parseInt(timestamp) : 0;
  // Modest branding and hiding controls as much as possible to make it look custom
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${start}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&color=white`;

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 mb-4 shadow-inner group">
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Tutorial Video"
        loading="lazy"
      />
      {/* Overlay to catch initial clicks if needed or just for styling */}
      <div className="absolute inset-0 pointer-events-none border-4 border-white/10 rounded-2xl"></div>
    </div>
  );
};

const TutorialDescription: React.FC<{ description: string; id: string }> = ({ description, id }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 180;
  const isLong = description.length > maxLength;

  return (
    <div className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium flex-1">
      <div className="whitespace-pre-wrap">
        {isExpanded ? description : (isLong ? `${description.substring(0, maxLength)}...` : description)}
      </div>
      {isLong && (
        <button
          id={`tut-see-more-btn-${id}`}
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline focus:outline-none cursor-pointer flex items-center gap-1 text-sm"
        >
          {isExpanded ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
};

const Tutorial: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tutorials, setTutorials] = useState<TutorialItem[]>(DEFAULT_TUTORIALS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTutorials = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .order('id', { ascending: true });
        
      if (!error && data) {
        // Create a map from DB for easier lookup by title
        const dbTutorialMap = new Map(data.map((t: any) => [t.title, {
          id: t.id,
          title: t.title,
          description: t.content,
          videoId: t.video_id,
          timestamp: t.time_start?.toString()
        }]));

        // Merge DB data into default tutorials
        const merged: TutorialItem[] = DEFAULT_TUTORIALS.map(defaultT => {
          if (dbTutorialMap.has(defaultT.title)) {
            return dbTutorialMap.get(defaultT.title) as TutorialItem;
          }
          return defaultT;
        });
        
        // Add tutorials from DB that are not in default list
        data.forEach((t: any) => {
          if (!DEFAULT_TUTORIALS.find(d => d.title === t.title)) {
            merged.push({
              id: t.id,
              title: t.title,
              description: t.content,
              videoId: t.video_id,
              timestamp: t.time_start?.toString()
            });
          }
        });

        setTutorials(merged);
      }
      setLoading(false);
    };
    
    fetchTutorials();
  }, []);

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Tutorial</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">အသုံးပြုပုံ လမ်းညွှန်ချက်များ</p>
        </div>
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 dark:text-gray-300">
          <ArrowLeft size={18} /> Back to Home
        </Button>
      </div>

      <div className="grid gap-8">
        {tutorials.map((item, index) => (
          <Card key={item.id || index} className="p-0 overflow-hidden border-none shadow-xl shadow-indigo-500/5 bg-white dark:bg-gray-800">
            <div className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200 dark:shadow-none">
                  <span className="font-black text-lg">{index + 1}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{item.title}</h2>
                  <div className="h-1 w-12 bg-indigo-600 rounded-full"></div>
                </div>
              </div>

              {item.videoId && (
                <YouTubeEmbed videoId={item.videoId} timestamp={item.timestamp} />
              )}

              <div className="p-0 mt-6">
                <div className="flex gap-3">
                  <Info size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-1" />
                  <TutorialDescription description={item.description} id={item.id?.toString() || index.toString()} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center pb-12">
        <p className="text-gray-400 dark:text-gray-500 text-sm font-bold uppercase tracking-widest mb-4">Need more help?</p>
        <a 
          href="https://t.me/kcteamofficialbot" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full px-8 py-3 border border-gray-200 dark:border-gray-600 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
};

export default Tutorial;
