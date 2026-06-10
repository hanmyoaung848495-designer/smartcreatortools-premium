/**
 * Profanity Checker for English and Burmese (Unicode & Zawgyi)
 * Designed for user feedback validation, with strict false positive protection.
 */

export function hasProfanity(text: string): boolean {
  if (!text) return false;

  const lowerText = text.toLowerCase();

  // 1. Normalize by removing all whitespaces, tabs, symbols, and zero-width characters (bypass protection)
  const normalized = lowerText.replace(/[\s\u200B-\u200D\uFEFF\.,\-\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '');

  // 2. Transcribe some common number and character lookalikes for English
  const englishNormalized = normalized
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/v/g, 'u');

  // 3. English Bad Words List (handles core and common symbols/bypasses)
  const englishBadWords = [
    'fuck', 'fucking', 'fucker', 'motherfucker', 'bitch', 'bastard', 'asshole',
    'dick', 'pussy', 'cunt', 'wanker', 'twat', 'slut', 'whore', 'fck', 'fuk', 
    'fuxk', 'mft', 'btch', 'sht', 'ahole', 'fvck', 'f0ck'
  ];

  // Specific check for 'shit' with false positive exclusions (like 'shitake', 'shitsu')
  const hasEnglishBadWord = englishBadWords.some(word => englishNormalized.includes(word)) || 
    (englishNormalized.includes('shit') && !englishNormalized.includes('shitake') && !englishNormalized.includes('shitsu'));

  // Star bypass verification (e.g. f**k, f*ck)
  const hasStarBypasses = /f[\*]+[a-z]*k/i.test(lowerText) || 
    /f[a-z]*[\*]+k/i.test(lowerText) || 
    /sh[\*]+t/i.test(lowerText) || 
    /b[\*]+tch/i.test(lowerText) ||
    lowerText.includes('f**k') ||
    lowerText.includes('f*ck') ||
    lowerText.includes('f.u.c.k') ||
    lowerText.includes('f_u_c_k');

  // Transliterated Burmese/English slang bad words with boundary checks to prevent false positives (e.g. mal, lee, phin)
  const transliteratedRegex = /\b(kmkl|mal|mmsp|stt|lee|ngarloe|min\s+may\s+loe|farthal|far\s+thal|ftmt|flmt|fay\s+loe\s+ma\s+thar|fayloemathar|ma\s+a\s+loe|maaloe|phin)\b/i;
  const hasTransliteratedBadWord = transliteratedRegex.test(lowerText);

  // Vowel representation of lee block, e.g. -ီး, *ီး, _ီး
  const hasHyphenLee = /[-_~—–\*]ီး/.test(lowerText);

  if (hasEnglishBadWord || hasStarBypasses || hasTransliteratedBadWord || hasHyphenLee) {
    return true;
  }

  // 4. Burmese Bad Words List
  // Protects against overlapping substrings while targeting insults accurately.
  // Contains both standard Unicode and Zawgyi visual ordering representations.
  const burmeseBadWords = [
    // --- Core Words ---
    'လီး', 'လိုး', 'စောက်ဖုတ်', 'စောက်ပတ်', 'လီးပဲ', 'လီးလား', 'ခွေးမသား', 'ဖာသည်', 'ဖာမ', 'လိုးမသား',
    'စောက်ရူး', 'စောက်ခွက်', 'စောက်ကန်း', 'ငါလိုး', 'ငါိုး',

    // --- Burmese Family Insults ---
    'မအေလိုး', 'နှမလိုး', 'မအေဘေး', 'မအေပေး', 'နှမပေး', 'ညီမလိုး', 'မအေလိုးမသား', 'မအေလိုးလေး', 'မအေခွေးလိုး',

    // --- Variations & Bypass (Unicode) ---
    'သောက်ရူး', 'သောက်ခွက်', 'သောက်ဖုတ်', 'သောက်ပတ်', 'လီပဲ', 'လးပဲ', 'လီးဘဲ', 'လိုးမလို့', 'လိုးမာလား',
    'စောက်ရူူး', 'မအေလိုးး', 'မေအလိုး', 'မအေလိုးမ', 'မအေလိုးကောင်', 'မအေ၁ိုး', 'မအေခွေး', 'မအေရိုး', 'မအေရိုးမသား',

    // --- Zawgyi Visual Ordering Representations ---
    // In Zawgyi, 'ေ' (e-ga-lan) precedes the starting consonant
    'ေစောက်', 'ေစျာက်', 'ေစက်ာ', 'ေစက်ာဖုတ္', 'ေစျာက်ဖုတ်', 'ေစောက်ပတ်', 'ေစက်ာပတ်', 'ေစျာက်ပတ်',
    'လီးေပ', 'လီးေပဲ', 'လီေပ', 'ေခွးမသား', 'ဖာေသည္', 'ဖာေသည်', 'ေစက်ာရူး', 'ေစျာက်ရူး', 'ေစောက်ရူး',
    'ေစက်ာခွက်', 'ေစျာက်ခွက်', 'ေစောက်ခွက်', 'ေစက်ာကန်း', 'ေစျာက်ကန်း', 'ေစောက်ကန်း',
    'မေအလိုး', 'မေအေဘး', 'မေအေပး', 'နှမေပး', 'နှမေပေး', 'မေအလိုးမသား', 'မေအလိုးေလး', 'မေအလိုးလေး',
    'မေအေခွးလိုး', 'ေသာက်ရူး', 'ေသာက္ရူး', 'ေသာက်ခွက်', 'ေသာက္ခွက်', 'ေသာက်ဖုတ်', 'ေသာောက်ပတ်',
    'လးေပ', 'လီးေဘ', 'မေအလိုးး', 'မေအလိုးမ', 'မေအလိုးေကာင်', 'မေအလိုးကောင်', 'မေအ၁ိုး', 'မေအေခွး', 'မေအေရိုး',
    'မေအေရိုးမသား',

    // --- Transliterated English ---
    'ဖတ်ခ်', 'ဖက်ခ်', 'ဖက်', 'ဖတ်', 'ဖက္ကင်း', 'ဖတ်ကင်း', 'ဘစ်ချ်', 'ဘတ်စ်တပ်', 'အက်စ်ဟိုး', 'ရှစ်',

    // --- Added by request (June 2026) ---
    'လဥ', 'လအု', 'ဠီး', 'ငါဠိုး', 'မေနိုး', 'မြေနိုး', 'မအေယိုး', 'ငါယိုး', 'နာလိုး', 'နာယိုး', 'နာရိုး', 'ဠိုး', 'မအေိုး',
    'အောင်ဇမ္ဗူ', 'aungzabu', 'bubu', 'sanyaymoe', 'phonechit', 'ဖိုးချစ်', 'စမ်းရေမိုး', 'မင်းအဖေ', 'မင်းအမေလင်', 'မင်းအမေယောက်ျား', 'မင်းအစ်မယောက်ျား', 'မင်းပထွေး', 'မင်းနှမလင်', 'မင်းအမလင်', 'မင်းအစ်မလင်', 'မင်းညီမလင်', 'မလင်'
  ];

  const hasBurmeseBadWord = burmeseBadWords.some(word => normalized.includes(word));
  if (hasBurmeseBadWord) {
    return true;
  }

  // Handle generalized "စောက်" prefixes safely
  // Since 'စောက်' is extremely unique to profane contexts, we target its variations.
  // This avoids false positive matching on words like 'စက္ကူ' (paper) because 'စောက်' has completely different Unicode units.
  if (normalized.includes('စောက်') || normalized.includes('ေစောက်') || normalized.includes('ေစျာက်') || normalized.includes('ေစက်ာ')) {
    return true;
  }

  return false;
}
