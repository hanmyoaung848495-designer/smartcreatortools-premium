export const INITIAL_PRONUNCIATION_MAP: Record<string, string> = {
  "Intro": "အင်ထရို",
  "တူမလေး": "တူ မ လေး",
  "$": "ဒေါ်လာ",
  "တူမတော်": "တူ  မတော်",
  "ပြဿနာ": "ပြတ်သနာ",
  "ဥစ္စာ": "အုတ်စာ",
  "မေတ္တာ": "မြစ်တာ",
  "ဓားပြ": "ဓမြ",
  "ကောင်မလေး": "ကောင်မ လေး",
  "မကြီး": "မ ကြီး",
  "သူတောင်းစား": "သဒေါင်းဇား",
  "သူဌေး": "သဌေး",
  "ပါးစပ်": "ပဇပ်",
  "ပန်းချီ": "ဘဂျီ",
  "ပန်းကန်": "ဘဂန်",
  "ကုတင်": "ဂဒင်",
  "ပုဆိုး": "ပဆိုး",
  "ပုလင်း": "ပလင်း",
  "ဧကရာဇ်": "အေကရစ်",
  "အဘိုး": "အဖိုး",
  "အဘွား": "အဖွား",
  "မုဆိုး": "မုတ်ဆိုး",
  "ပုလ္လင်": "ပလင်",
  "ပုဂံ": "ဘဂံ",
  "CEO": "စီအီးအို",
  "FBI": "အက်ဖ်ဘီအိုင်",
  "အံ့ဩ": "အံ့အော",
  "ဇနီးသည်": "ဇနီးသယ်",
  "ဘီလူး": "ဘလူး",
  "စတေး": "ဇဒေး",
  "Uric acid": "ယူရစ် အက်ဆစ်",
  "ချောက်ကမ်းပါး": "ဂျောက်ကမ်းပါး",
  "Recap": "ရီကပ်ပ်",
  "ကလေးမလေး": "ခလေးမ လေး",
  "ကုဋေကြွယ်": "ဂဒေကြွယ်",
  "ဩဇာ": "အောဇာ",
  "မြေးမလေး": "မြေးမ လေး",
  "အစ်မ": "အ မ",
  "သူမ": "သူ မ",
  "စနောက်": "စာ့ နောက်",
  "ထရပ်": "ထာ့ ရပ်"
};

export function applyPronunciation(text: string, customMap: Record<string, string> = {}): string {
  // Normalize both text and map keys to handle different Unicode representations of Burmese characters
  let processedText = text.normalize();
  const activeMap: Record<string, string> = {};
  
  // Normalize INITIAL_PRONUNCIATION_MAP
  for (const [key, val] of Object.entries(INITIAL_PRONUNCIATION_MAP)) {
    activeMap[key.normalize()] = val;
  }
  
  // Normalize and merge customMap
  for (const [key, val] of Object.entries(customMap)) {
    activeMap[key.normalize()] = val;
  }

  // Sort keys by length descending to prevent partial matches
  const keys = Object.keys(activeMap).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    if (key.trim()) {
      // Use split/join for global replacement
      processedText = processedText.split(key).join(activeMap[key]);
    }
  }

  return processedText;
}
