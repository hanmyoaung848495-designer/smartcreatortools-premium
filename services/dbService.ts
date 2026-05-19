import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const dbService = {
  // Tutorials
  async addTutorial(title: string, video_id: string, time_start: number, content: string, tool_key: string | null) {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('tutorials').insert([{ title, video_id, time_start, content, tool_key }]);
  },
  async listTutorials() {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('tutorials').select('id, title, tool_key').order('id', { ascending: true });
  },
  async getTutorial(id: string) {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('tutorials').select('*').eq('id', id).single();
  },
  async deleteTutorial(id: string) {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('tutorials').delete().eq('id', id);
  },

  // Playlists
  async setPlaylist(inserts: any[]) {
    if (!supabase) return { error: "Supabase not configured" };
    await supabase.from('playlists').delete().neq('id', 0);
    return await supabase.from('playlists').insert(inserts);
  },
  async listPlaylist() {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('playlists').select('id, video_id, order_index').order('order_index', { ascending: true });
  },
  async clearPlaylist() {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('playlists').delete().neq('id', 0);
  },

  // Bans
  async banSession(sessionId: string) {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('banned_sessions').insert([{ session_id: sessionId }]);
  },
  async unbanSession(sessionId: string) {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('banned_sessions').delete().eq('session_id', sessionId);
  },
  async listBannedSessions() {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('banned_sessions').select('session_id, created_at');
  },
  async checkBan(sessionId: string) {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('banned_sessions').select('id').eq('session_id', sessionId).single();
  },

  // Analytics
  async getStats(dateFilter?: string) {
    if (!supabase) return { error: "Supabase not configured" };
    let query = supabase.from('analytics').select('tool', { count: 'exact' });
    if (dateFilter && dateFilter !== 'all') {
      query = query.like('timestamp', `${dateFilter}%`);
    } else if (!dateFilter) {
      const today = new Date().toISOString().split('T')[0];
      query = query.like('timestamp', `${today}%`);
    }
    return await query;
  },

  // User Accounts
  async listUsers() {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('users_accounts').select('*').order('created_at', { ascending: false });
  },
  async addUser(data: any) {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('users_accounts').upsert(data, { onConflict: 'username' });
  },
  async getUser(username: string) {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('users_accounts').select('*').eq('username', username).single();
  },
  async deleteUser(username: string) {
    if (!supabase) return { error: "Supabase not configured" };
    return await supabase.from('users_accounts').delete().eq('username', username);
  }
};
