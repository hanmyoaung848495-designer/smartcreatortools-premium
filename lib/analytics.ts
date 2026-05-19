import { supabase } from './supabase';
import localforage from 'localforage';

export interface AnalyticsEvent {
  id: string;
  action: string;
  tool: string;
  timestamp: string;
  synced: boolean;
}

export const trackEvent = async (action: string, tool: string) => {
  // Analytics tracking has been disabled by user request
  return;
};

export const syncAnalytics = async () => {
  // Syncing disabled
  return;
};

// Listen for online event to trigger sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncAnalytics);
}
