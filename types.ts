
export interface UserAccount {
  id: string; // userId
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  startDate: number;
  expiredDate: number | null;
  isLifetime: boolean;
  telegram: string;
  linkTranscribeExpiry: number | null;
  deviceId: string | null;
  lastLogin?: number;
  createdAt: number;
}

export type FeatureType = 
  | 'home' 
  | 'transcribe' 
  | 'translate' 
  | 'srt-translate' 
  | 'sub-generator' 
  | 'text-to-srt'
  | 'script-writer' 
  | 'teleprompter'
  | 'ai-voice'
  | 'video-generator' 
  | 'content-creator'
  | 'admin'
  | 'tutorial'
  | 'api-guide'
  | 'note-pad'
  | 'code-editor'
  | 'pricing';

export type TaskStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface ProcessingTask {
  id: string;
  type: FeatureType;
  status: TaskStatus;
  progress: number;
  title: string;
  error?: string;
  result?: any;
  timestamp: number;
  isCanceled?: boolean;
}

export interface PaymentMethodData {
  id: string;
  name: string;
  details: string;
  qrImage?: string;
}

export interface ActivationRequest {
  id: string;
  userId: string;
  userEmail: string;
  code: string;
  planId: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AdminSettings {
  appLogo: string;
  welcomeMessage: string;
  marqueeText: string;
  footerText: string;
  premiumEnabled: boolean;
  usageLimits: {
    free: number;
    premium: number;
  };
  paymentMethods: PaymentMethodData[];
  activationRequests: ActivationRequest[];
  customCategories: string[];
}

export interface ActivityRecord {
  id: string;
  type: FeatureType;
  timestamp: number;
  description: string;
}

export interface StoredResult {
  id: string;
  type: FeatureType;
  timestamp: number;
  title: string;
  content: string;
  fileName?: string;
  mimeType?: string;
}

export interface UserUsage {
  appApiUsedToday: number;
  ownApiUsedToday: number;
  lastResetDate: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  preferredLanguage: string;
  joinedAt: number;
  startDate?: number | null;
  role?: string;
  history: ActivityRecord[];
  credits: number;
  plan: 'free' | 'premium' | 'premium-ultra' | 'premium-plus';
  expiredDate: number | null;
  isLifetime: boolean;
  linkTranscribeExpiry: number | null;
  usage: UserUsage;
}

export interface UserSession {
  role: 'free' | 'premium' | 'admin';
  useCustomKey: boolean;
  customApiKey?: string;
  systemApiKey?: string;
  allApiKeys?: string[]; // Added for rotation
  user?: UserProfile;
  adminAuth?: { id: string; pass: string }; // For Admin API verification
}

export interface FeatureCardData {
  id: FeatureType;
  title: string;
  description: string;
  icon: string;
  premiumOnly?: boolean;
}

export interface SRTBlock {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

export interface Recording {
  id: string;
  url: string;
  timestamp: number;
  duration: number;
}

export interface ScriptVersion {
  id: string;
  text: string;
  timestamp: number;
}
