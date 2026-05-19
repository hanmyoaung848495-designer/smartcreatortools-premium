
import React from 'react';
import { FeatureCardData, AdminSettings } from './types';

export const FEATURES: FeatureCardData[] = [
  {
    id: 'ai-voice',
    title: 'AI Voice',
    description: 'Generate high-quality AI voices from your text.',
    icon: '🗣️'
  },
  {
    id: 'transcribe',
    title: 'Transcribe',
    description: 'Generate engaging speaking scripts from audio, video, or links.',
    icon: '🎙️'
  },
  {
    id: 'translate',
    title: 'Translate',
    description: 'Advanced AI translation supporting 100+ languages.',
    icon: '🌐'
  },
  {
    id: 'sub-generator',
    title: 'SRT Generator',
    description: 'Automatically generate SRT files from media with accurate timestamps.',
    icon: '📝'
  },
  {
    id: 'srt-translate',
    title: 'SRT Translate',
    description: 'Translate subtitle files while preserving timestamps.',
    icon: '🎞️'
  },
  {
    id: 'script-writer',
    title: 'AI Script Writer',
    description: 'Generate creative and professional scripts for any topic.',
    icon: '🖋️'
  },
  {
    id: 'teleprompter',
    title: 'Teleprompter',
    description: 'စကားပြောစာသားများကို အနှေးအမြန်ထိန်းညှိပြီး ဖတ်ရှုနိုင်ပါသည်။',
    icon: '📜'
  },
  {
    id: 'text-to-srt',
    title: 'Text To SRT',
    description: 'Convert Gemini output text into downloadable SRT subtitle files.',
    icon: '📄'
  },
  {
    id: 'note-pad',
    title: 'Note Pad',
    description: 'Write, edit, and save your text notes easily.',
    icon: '📓'
  },
  {
    id: 'code-editor',
    title: 'Code Editor',
    description: 'Write and save code with syntax highlighting.',
    icon: '💻'
  }
];

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  appLogo: 'SmartCreator',
  welcomeMessage: 'ဒေါ်လာစားများအားလုံးမင်္ဂလာပါ',
  marqueeText: 'Contentတွေလုပ်ရတာအဆင်ပြေအောင် စမ်းသပ်ဖန်တီးထားတဲ့ Web APPလေးဖြစ်ပါတယ်။ သုံးမယ်ဆိုရင် Own Keyကိုနှိပ်ပြီး API Keyထည့်သုံးလို့ရပါတယ်။ Text to SRT နဲ့ Teleprompter ကတော့ API keyမလိုဘဲသုံးလို့ရပါတယ်။',
  footerText: '© 2024 Smart Creator Tools. All rights reserved.',
  premiumEnabled: true,
  usageLimits: {
    free: 5,
    premium: 50
  },
  paymentMethods: [
    { id: 'visa', name: 'Visa', details: 'Bank: International Bank\nName: Smart Creator Tools\nAccount: 1234 5678 9012 3456' },
    { id: 'kpay', name: 'KPay', details: 'Number: 09876543210\nName: Mr. Jame' },
    { id: 'wave', name: 'Wave', details: 'Number: 09876543210\nName: Mr. Jame' },
    { id: 'mmqr', name: 'MMQR', details: 'Name: ST', qrImage: 'https://placehold.co/400x400?text=MMQR+Placeholder' },
    { id: 'ton', name: 'TON', details: 'Wallet: EQ...WalletAddress' },
    { id: 'usdt', name: 'USDT', details: 'Network: TRC20\nAddress: T...USDTAddress' }
  ],
  activationRequests: [],
  customCategories: ['AI', 'Marketing', 'Gaming', 'Travel', 'Food', 'Beauty', 'Technology', 'Education', 'Finance', 'Health']
};
