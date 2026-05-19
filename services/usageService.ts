import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';

export type ToolType = 'ai_voice' | 'transcribe';

export interface UsageLimits {
  ai_voice_guest_limit: number;
  transcribe_guest_limit: number;
  transcribe_user_limit: number;
}

const DEFAULT_LIMITS: UsageLimits = {
  ai_voice_guest_limit: 2,
  transcribe_guest_limit: 2,
  transcribe_user_limit: 3
};

export const getUsageLimits = async (): Promise<UsageLimits> => {
  if (!supabase) return DEFAULT_LIMITS;
  
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'usage_limits')
      .single();
      
    if (error || !data) return DEFAULT_LIMITS;
    return data.value as UsageLimits;
  } catch (e) {
    console.error('Error fetching limits:', e);
    return DEFAULT_LIMITS;
  }
};

export const updateUsageLimits = async (limits: UsageLimits): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'usage_limits', value: limits, updated_at: new Date().toISOString() });
      
    return !error;
  } catch (e) {
    console.error('Error updating limits:', e);
    return false;
  }
};

export const checkAndIncrementUsage = async (
  toolType: ToolType, 
  userId?: string | null,
  isLink?: boolean,
  linkTranscribeExpiry?: number | null
): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
  if (!supabase) return { allowed: true, remaining: 99 }; // Fallback if no DB

  const identifier = userId || getDeviceId();
  const limits = await getUsageLimits();
  
  // Define limit based on user status and tool type
  let limit = 0;
  const isGuest = !userId;

  if (toolType === 'ai_voice') {
    if (isGuest) {
      limit = limits.ai_voice_guest_limit;
    } else {
      return { allowed: true, remaining: 999 }; // Unlimited for logged in users
    }
  } else if (toolType === 'transcribe') {
    if (isGuest) {
      limit = limits.transcribe_guest_limit;
    } else {
      // For logged in users, Link Transcribe has a specific validity
      if (isLink) {
        const now = Date.now();
        const expiry = linkTranscribeExpiry ? (typeof linkTranscribeExpiry === 'number' ? linkTranscribeExpiry : new Date(linkTranscribeExpiry).getTime()) : null;
        
        if (expiry && now <= expiry) {
          limit = limits.transcribe_user_limit; // 3 or whatever admin set
        } else {
          // Expired or No validity set: Fallback to 1 / day for Link Transcribe
          limit = 1;
        }
      } else {
        // Standard File Transcribe for premium users
        limit = limits.transcribe_user_limit;
      }
    }
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    // Check current usage
    const { data, error } = await supabase
      .from('tool_usage')
      .select('count')
      .eq('identifier', identifier)
      .eq('tool_type', toolType)
      .eq('usage_date', today)
      .single();

    const currentCount = data?.count || 0;

    if (currentCount >= limit) {
      return { 
        allowed: false, 
        remaining: 0, 
        message: `ယနေ့အတွက် အသုံးပြုနိုင်သည့် အကြိမ်ရေ (${limit} ကြိမ်) ပြည့်သွားပါပြီ။ မနက်ဖြန်မှ ထပ်မံကြိုးစားပေးပါ။` 
      };
    }

    // Increment usage
    const { error: upsertError } = await supabase
      .from('tool_usage')
      .upsert({
        identifier,
        tool_type: toolType,
        usage_date: today,
        count: currentCount + 1
      }, { onConflict: 'identifier, tool_type, usage_date' });

    if (upsertError) throw upsertError;

    return { allowed: true, remaining: limit - (currentCount + 1) };
  } catch (e) {
    console.error('Usage check error:', e);
    return { allowed: true, remaining: 1 }; // Allow on error to avoid blocking users
  }
};
