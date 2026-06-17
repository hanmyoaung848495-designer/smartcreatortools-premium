// Fixes for node-telegram-bot-api in serverless environments
process.env.NTBA_FIX_319 = "1";
process.env.NTBA_FIX_350 = "1";

import express from "express";
import { botService } from '../services/botService.js';
import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";
import { hasProfanity } from "../lib/profanity.js";

const app = express();
app.use(express.json());

// Normalize incoming Netlify serverless function paths so Express routes match correctly
app.use((req, res, next) => {
  const netlifyPrefix = "/.netlify/functions/index";
  if (req.url.startsWith(netlifyPrefix)) {
    let remaining = req.url.slice(netlifyPrefix.length);
    if (!remaining.startsWith("/")) {
      remaining = "/" + remaining;
    }
    if (!remaining.startsWith("/api/") && remaining !== "/api") {
      remaining = "/api" + remaining;
    }
    req.url = remaining;
  }
  next();
});

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// IMPORTANT: Use SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security (RLS) for admin operations.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Clean and sanitize string values against surrounding quotes and whitespace
function cleanVal(val: any): string {
  if (val === undefined || val === null) return "";
  let s = val.toString().trim();
  while ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

// Admin Verification Middleware
const verifyAdmin = async (req: any, res: any, next: any) => {
  const adminId = cleanVal(req.headers['x-admin-id']);
  const adminPass = cleanVal(req.headers['x-admin-pass']);

  if (!adminId || !adminPass) {
    return res.status(401).json({ error: "Admin credentials required" });
  }

  // 1. Check System Admin Keys
  // Base case without index
  const baseKeyId = cleanVal(process.env.SYSTEM_KEY_ID);
  const baseKeyPass = cleanVal(process.env.SYSTEM_KEY_PASS);
  if (baseKeyId && baseKeyId === adminId && baseKeyPass === adminPass) {
    return next();
  }

  // Indexed cases 1 to 10 (with formats _X_ID / _ID_X)
  let i = 1;
  while (i <= 10) {
    const envId = cleanVal(process.env[`SYSTEM_KEY_${i}_ID`] || process.env[`SYSTEM_KEY_ID_${i}`]);
    const envPass = cleanVal(process.env[`SYSTEM_KEY_${i}_PASS`] || process.env[`SYSTEM_KEY_PASS_${i}`]);
    if (envId && envId === adminId && envPass === adminPass) {
      return next(); 
    }
    i++;
  }

  // 2. Check Supabase for user account
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const { data: userData, error } = await supabase
      .from('users_accounts')
      .select('role')
      .eq('username', adminId)
      .eq('password', adminPass)
      .single();

    if (!error && userData && userData.role === 'admin') {
      return next(); 
    }
  } catch (err) {
    console.error("Supabase Admin Check Error:", err);
  }

  return res.status(403).json({ error: "Unauthorized access" });
};

// Initialize Telegram Bot
const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID;
const appUrl = process.env.APP_URL; 
let bot: TelegramBot | null = null;

if (botToken) {
  bot = new TelegramBot(botToken, { polling: false });
  console.log("Telegram bot initialized (Webhook mode).");

  bot.on("message", (msg) => {
    console.log(`[Bot] Message from ${msg.chat.id}: ${msg.text}`);
  });

  bot.onText(/\/start/, (msg) => botService.handleStart(bot!, msg.chat.id));
  bot.onText(/\/help/, (msg) => botService.handleHelp(bot!, msg.chat.id, adminChatId!));

  bot.onText(/\/setwebhook/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    if (!appUrl) {
      bot?.sendMessage(msg.chat.id, "❌ APP_URL is not set in Environment Variables.");
      return;
    }
    const webhookUrl = `${appUrl}/api/telegram-webhook`;
    try {
      await bot?.setWebHook(webhookUrl);
      bot?.sendMessage(msg.chat.id, `✅ Webhook set to: ${webhookUrl}`);
    } catch (err: any) {
      bot?.sendMessage(msg.chat.id, `❌ Error setting webhook: ${err.message}`);
    }
  });

  bot.onText(/\/stats(?:\s+(.*))?/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleStats(bot!, msg.chat.id, match?.[1]?.trim());
  });

  bot.onText(/\/post\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const input = match?.[1];
    if (!input) return;
    await botService.handlePost(bot!, msg.chat.id, input);
  });

  bot.onText(/\/listposts/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleListPosts(bot!, msg.chat.id);
  });

  bot.onText(/\/delpost\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const id = match?.[1]?.trim();
    if (!id) return;
    await botService.handleDeletePost(bot!, msg.chat.id, id);
  });

  bot.onText(/\/checkpost\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const id = match?.[1]?.trim();
    if (!id) return;
    await botService.handleCheckPost(bot!, msg.chat.id, id);
  });

  bot.onText(/\/playlist\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const input = match?.[1];
    if (!input) return;
    await botService.handlePlaylist(bot!, msg.chat.id, input);
  });

  bot.onText(/\/listplaylist/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleListPlaylist(bot!, msg.chat.id);
  });

  bot.onText(/\/delplaylist/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleDelPlaylist(bot!, msg.chat.id);
  });

  // Ban Management Commands
  bot.onText(/\/ban\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const sessionId = match?.[1]?.trim();
    if (!sessionId) return;
    await botService.handleBan(bot!, msg.chat.id, sessionId);
  });

  bot.onText(/\/unban\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const sessionId = match?.[1]?.trim();
    if (!sessionId) return;
    await botService.handleUnban(bot!, msg.chat.id, sessionId);
  });

  bot.onText(/\/listbans/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleListBans(bot!, msg.chat.id);
  });

  bot.onText(/\/users/, async (msg) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    await botService.handleListUsers(bot!, msg.chat.id);
  });

  bot.onText(/\/adduser\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const input = match?.[1];
    if (!input) return;
    await botService.handleAddUserBot(bot!, msg.chat.id, input);
  });

  bot.onText(/\/checkuser\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const id = match?.[1]?.trim();
    if (!id) return;
    await botService.handleCheckUserBot(bot!, msg.chat.id, id);
  });

  bot.onText(/\/deluser\s+(.*)/, async (msg, match) => {
    if (String(msg.chat.id) !== String(adminChatId).trim()) return;
    const id = match?.[1]?.trim();
    if (!id) return;
    await botService.handleDeleteUserBot(bot!, msg.chat.id, id);
  });
}

// API routes
app.get("/api/set-webhook", async (req, res) => {
  if (!bot || !appUrl) {
    return res.status(500).json({ error: "Bot or APP_URL not configured" });
  }
  const webhookUrl = `${appUrl}/api/telegram-webhook`;
  try {
    await bot.setWebHook(webhookUrl);
    res.json({ success: true, url: webhookUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(/^\/(api\/)?(telegram-)?webhook$/, (req, res) => {
  console.log("[Webhook] Received update:", JSON.stringify(req.body));
  res.status(200).send("OK");

  if (bot && req.body && req.body.update_id) {
    try {
      bot.processUpdate(req.body);
    } catch (err) {
      console.error("[Webhook] Error processing update:", err);
    }
  }
});

app.post(/^\/(api\/)?feedback$/, async (req, res) => {
  const { name, contact, message, sessionId } = req.body;
  console.log("[Feedback] Received:", { name, contact, message, sessionId });

  if (!name || !contact || !message || !sessionId) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!botToken || !adminChatId) {
    console.error("[Feedback] Bot not configured:", { botToken: !!botToken, adminChatId: !!adminChatId });
    return res.status(500).json({ error: "Feedback service not configured" });
  }

  const text = `<b>Smart Creator Feedback Received</b>\n` +
    `<b>Premium Website</b>\n\n` +
    `<b>Session ID :</b> <code>${sessionId}</code>\n` +
    `<b>Name :</b> <code>${name}</code> <b>Email/Telegram:</b> <code>${contact}</code>\n` +
    `<b>Message:</b>\n<code>${message}</code>`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: text,
        parse_mode: "HTML",
      }),
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to send feedback" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

import path from "path";
import ytdl from "@distube/ytdl-core";
import { GoogleGenAI } from "@google/genai";
import serverless from "serverless-http";

function extractVideoId(url: string) {
  // Enhanced regex to handle watch?v=, youtu.be/, shorts/, embed/, etc.
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[1] && match[1].length === 11) ? match[1] : null;
}

function getRotatingApiKey(baseName: string): string[] {
  const keys: string[] = [];
  
  // Try to get keys from index 1 to 5
  for (let i = 1; i <= 5; i++) {
    const key = process.env[`${baseName}_${i}`];
    if (key) keys.push(key);
  }
  
  // Also add the legacy single key if it exists and isn't already in the list
  const legacyKey = process.env[baseName];
  if (legacyKey && !keys.includes(legacyKey)) {
    keys.unshift(legacyKey);
  }

  // Special case for Gemini - handle SYSTEM_KEY_1_VALUE specifically
  if (baseName === 'GEMINI_API_KEY') {
    const systemKey = process.env.SYSTEM_KEY_1_VALUE;
    if (systemKey && !keys.includes(systemKey)) {
      keys.unshift(systemKey);
    }
  }

  return keys;
}

async function sendAdminTelegramAlert(messageText: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_ERRORS_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.error("[Telegram Alert] Missing credentials (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID/TELEGRAM_ERRORS_CHAT_ID)");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: messageText,
        parse_mode: "HTML"
      })
    });
    console.log(`[Telegram Alert] Alert sent successfully to chat ID: ${chat}`);
  } catch (err) {
    console.error("[Telegram Alert] Failed to send alert message:", err);
  }
}

app.post(/^\/(api\/)?youtube-transcribe$/, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const keys = getRotatingApiKey('TRANSCRIPT_API_KEY');
  if (keys.length === 0) {
    return res.status(500).json({ error: "TRANSCRIPT_API_KEY is not configured on the server." });
  }

  let lastError: any;
  let keyIndex = 1;
  for (const transcriptApiKey of keys) {
    try {
      console.log(`[YouTube Transcribe] Trying key rotation... URL: ${url}`);
      
      const response = await fetch(`https://transcriptapi.com/api/v2/youtube/transcript?video_url=${encodeURIComponent(url)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${transcriptApiKey}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        const errText = errorData.error || errorData.detail || `TranscriptAPI failed with status ${status}`;
        
        console.warn(`[YouTube Transcribe] Key TRANSCRIPT_API_KEY_${keyIndex} failed with status ${status}.`);
        
        // Telegram Bot Alert to Admin about key limit/failure:
        const alertMsg = `⚠️ <b>YouTube Transcribe API Key Alert</b>\n\nTRANSCRIPT_API_KEY_${keyIndex} has encountered an error or reached its limit.\n\n<b>Status:</b> ${status}\n<b>Error details:</b>\n<code>${errText}</code>\n\n<i>Trying next available key...</i>`;
        await sendAdminTelegramAlert(alertMsg);

        lastError = { status: status, message: errText };
        keyIndex++;
        continue;
      }

      const data = await response.json();
      console.log(`[YouTube Transcribe] Success using TranscriptAPI V2.`);

      let transcribedText = "";
      if (Array.isArray(data.transcript)) {
        transcribedText = data.transcript.map((segment: any) => segment.text).join(" ");
      } else if (data.transcript && typeof data.transcript === "string") {
        transcribedText = data.transcript;
      } else if (data.text) {
        transcribedText = typeof data.text === "string" ? data.text : JSON.stringify(data.text);
      } else {
        transcribedText = "No transcript found for this video.";
      }

      return res.json({
        text: transcribedText,
        sources: []
      });

    } catch (error: any) {
      console.error("[YouTube Transcribe] Error with current key:", error);
      const errText = error.message || String(error);
      const alertMsg = `⚠️ <b>YouTube Transcribe API Connection Error</b>\n\nTRANSCRIPT_API_KEY_${keyIndex} caused a connection exception.\n\n<b>Error:</b> <code>${errText}</code>\n\n<i>Trying next available key...</i>`;
      await sendAdminTelegramAlert(alertMsg);
      lastError = error;
      keyIndex++;
    }
  }

  return res.status(500).json({ 
    error: "API limit ပြည့်နေပါသဖြင့် အသုံးပြု၍မရနိုင်သေးပါ။ Admin ထံအကြောင်းကြားပေးထားပါတယ်ခင်ဗျာ" 
  });
});

// Helper functions to encrypt/decrypt URLs to hide Hugging Face Space endpoints from devtools (F12)
const xorKey = "SmartCreatorSecretKeySecurity";
const encryptUrl = (url: string): string => {
  const buffer = Buffer.from(url, 'utf8');
  const encrypted = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    encrypted[i] = buffer[i] ^ xorKey.charCodeAt(i % xorKey.length);
  }
  return encrypted.toString('base64url');
};

const decryptUrl = (encryptedBase64: string): string => {
  try {
    const buffer = Buffer.from(encryptedBase64, 'base64url');
    const decrypted = Buffer.alloc(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      decrypted[i] = buffer[i] ^ xorKey.charCodeAt(i % xorKey.length);
    }
    return decrypted.toString('utf8');
  } catch (e) {
    console.error("[Decrypt URL Error]", e);
    return "";
  }
};

app.post(/^\/(api\/)?db-query$/, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured on the server" });

  const { action, table, select, eq, upsertData, order, limit, single } = req.body;

  try {
    if (action === 'select') {
      let query = supabase.from(table).select(select || '*');
      
      if (eq) {
        for (const [key, val] of Object.entries(eq)) {
          if (val !== undefined && val !== null) {
            query = query.eq(key, val);
          }
        }
      }
      
      if (order) {
        query = query.order(order.column, { ascending: order.ascending ?? true });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (single) {
        const { data, error } = await query.single();
        if (error) {
          if (error.code === 'PGRST116') {
            return res.json({ data: null, error: null });
          }
          return res.status(400).json({ error: error.message, code: error.code });
        }
        return res.json({ data });
      } else {
        const { data, error } = await query;
        if (error) {
          return res.status(400).json({ error: error.message, code: error.code });
        }
        return res.json({ data });
      }
    } 
    
    if (action === 'upsert') {
      const { data, error } = await supabase
        .from(table)
        .upsert(upsertData, { onConflict: req.body.onConflict });
        
      if (error) {
        return res.status(400).json({ error: error.message, code: error.code });
      }
      return res.json({ success: true, data });
    }

    return res.status(400).json({ error: "Unsupported database action" });
  } catch (err: any) {
    console.error("[db-query Error]", err);
    return res.status(500).json({ error: err.message });
  }
});

app.get(/^\/(api\/)?get-client-ip$/, async (req, res) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
    let mainIp = "127.0.0.1";
    if (typeof rawIp === 'string') {
      mainIp = rawIp.split(',')[0].trim();
    } else if (Array.isArray(rawIp)) {
      mainIp = rawIp[0].trim();
    }
    if (mainIp.startsWith('::ffff:')) {
      mainIp = mainIp.substring(7);
    }
    
    let countryCode = "UN";
    let countryName = "Unknown Location";
    
    // Check if the extracted IP is public and not local loopback
    const isLocal = mainIp === '127.0.0.1' || mainIp === '::1' || mainIp.startsWith('10.') || mainIp.startsWith('192.168.') || mainIp.startsWith('172.');
    
    if (!isLocal && mainIp !== '') {
      try {
        const geoRes = await fetch(`https://ipapi.co/${mainIp}/json/`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.country_code) {
            countryCode = geoData.country_code;
            countryName = geoData.country_name || countryName;
          }
        }
      } catch (e) {
        console.warn("[get-client-ip] ipapi.co query failed:", e);
      }
    }
    
    return res.json({ ip: mainIp, country_code: countryCode, country_name: countryName });
  } catch (err: any) {
    console.error("[get-client-ip Error]", err);
    return res.json({ ip: "127.0.0.1", country_code: "UN", country_name: "Unknown Location" });
  }
});

app.get(/^\/(api\/)?kc-tts\/proxy$/, async (req, res) => {
  let url = "";
  const encryptedUrl = req.query.u as string;
  if (encryptedUrl) {
    url = decryptUrl(encryptedUrl);
  } else {
    url = req.query.url as string;
  }
  
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    if (!encryptedUrl) {
      // Keep decoding as long as it contains percent signs (up to 3 times)
      let decodeCount = 0;
      while (url.includes('%') && decodeCount < 3) {
        const decoded = decodeURIComponent(url);
        if (decoded === url) break;
        url = decoded;
        decodeCount++;
      }
    }
  } catch (e) {
    console.error("[KC TTS Proxy] Failed to decode URL:", e);
  }

  try {
    console.log(`[KC TTS Proxy] Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch remote audio: ${response.statusText}`);
    }

    // Set correct Content-Type from upstream or fallback
    const contentType = response.headers.get('Content-Type');
    console.log(`[KC TTS Proxy] Received Content-Type: ${contentType}, Status: ${response.status}`);
    res.setHeader('Content-Type', contentType || 'audio/wav');
    
    // Add cache control to avoid re-fetching the same audio
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const contentLength = response.headers.get('Content-Length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (contentType?.includes('html') || buffer.toString('utf8', 0, 10).includes('<!doctype')) {
        console.warn(`[KC TTS Proxy] Warning: Received HTML instead of audio! URL: ${url}`);
        console.warn(`[KC TTS Proxy] HTML start: ${buffer.toString('utf8', 0, 200)}`);
    }
    
    res.send(buffer);
  } catch (error) {
    console.error("[KC TTS Proxy] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

function cleanControlCharacters(str: any, keepNewlines = false): any {
  if (typeof str !== 'string') return str;
  if (keepNewlines) {
    // Keep 0x0A (\n), 0x0D (\r), and 0x09 (\t), remove other 0x00-0x1F, 0x7F, and 0x80-0x9F
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  } else {
    // Remove all 0x00-0x1F, 0x7F, and 0x80-0x9F
    return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  }
}

function sanitizeKCText(str: string): string {
  if (typeof str !== 'string') return str;
  
  // 1. Convert speaker tags
  let cleaned = str
    .replace(/\[\s*[cC]1\s*\]/g, '[V1]')
    .replace(/\[\s*[cC]2\s*\]/g, '[V2]')
    .replace(/\[\s*[cC]3\s*\]/g, '[V3]')
    .replace(/\[\s*[vV]1\s*\]/g, '[V1]')
    .replace(/\[\s*[vV]2\s*\]/g, '[V2]')
    .replace(/\[\s*[vV]3\s*\]/g, '[V3]');

  // 2. Temporarily protect valid speaker tag patterns (exact [V1], [V2], [V3])
  cleaned = cleaned
    .replace(/\[V1\]/g, '___TAG_V1___')
    .replace(/\[V2\]/g, '___TAG_V2___')
    .replace(/\[V3\]/g, '___TAG_V3___');

  // 3. Strip ONLY single quotes, double quotes, smart quotes, backticks, and backslashes
  cleaned = cleaned
    .replace(/[\"\"“”]/g, '')     // Double quotes & smart double quotes
    .replace(/[\'\'‘’`]/g, '')     // Single quotes & backticks & smart single quotes
    .replace(/\\/g, '');          // Backslashes

  // 4. Restore the protected speaker tags
  cleaned = cleaned
    .replace(/___TAG_V1___/g, '[V1]')
    .replace(/___TAG_V2___/g, '[V2]')
    .replace(/___TAG_V3___/g, '[V3]');

  // 5. Clean control characters except tab and newlines (\r, \n)
  cleaned = cleaned
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove all non-newline control characters
    .trim();

  return cleaned;
}

function sanitizeKCPronunciationRules(str: string): string {
  if (typeof str !== 'string') return str;
  
  let cleaned = str
    .replace(/[\"\"“”]/g, '')       // Double quotes & smart double quotes
    .replace(/[\'\'‘’`]/g, '')       // Single quotes & backticks & smart single quotes
    .replace(/\\/g, '')            // Backslashes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ''); // Control characters except newlines

  return cleaned;
}

app.post(/^\/(api\/)?kc-tts\/generate$/, async (req, res) => {
  // Sanitize incoming payload string values against invalid JSON / control characters (C0 and C1 classes)
  if (req.body && typeof req.body === 'object') {
    if (typeof req.body.text === 'string') {
      req.body.text = sanitizeKCText(req.body.text);
    }
    if (typeof req.body.pronunciation_rules === 'string') {
      req.body.pronunciation_rules = sanitizeKCPronunciationRules(req.body.pronunciation_rules);
    }
    for (const key of Object.keys(req.body)) {
      if (key !== 'text' && key !== 'pronunciation_rules' && typeof req.body[key] === 'string') {
        req.body[key] = cleanControlCharacters(req.body[key], false);
      }
    }
  }

  const ttsPairs: { label: string, url: string, key: string }[] = [];

  // Main Pair (KC_TTS_API_URL & TTS_API_KEY)
  const mainUrl = process.env.KC_TTS_API_URL || process.env.VITE_KC_TTS_API_URL;
  if (mainUrl) {
    ttsPairs.push({
      label: 'Main',
      url: mainUrl,
      key: process.env.TTS_API_KEY || ''
    });
  }

  // Pairs 1 to 5
  for (let i = 1; i <= 5; i++) {
    const url = process.env[`KC_TTS_API_URL_${i}`] || process.env[`VITE_KC_TTS_API_URL_${i}`];
    const key = process.env[`TTS_API_KEY_${i}`];
    if (url) {
      ttsPairs.push({
        label: `${i}`,
        url: url,
        key: key || ''
      });
    }
  }

  if (ttsPairs.length === 0) {
    console.error("[KC TTS] No API URLs (KC_TTS_API_URL or KC_TTS_API_URL_1 to 5) configured in environment variables.");
    return res.status(500).json({ error: "TTS Server information is not configured on the server." });
  }

  // Diagnostic log to see exactly what pairs are loaded in memory and in what order
  console.log("[KC TTS] Detected Active API Pairs:", ttsPairs.map(p => ({ label: p.label, url: p.url, hasKey: !!p.key })));

  let lastError: any;
  
  for (const pair of ttsPairs) {
    const pathsToTry = ['/generate', '/api/generate', ''];
    let localErrorText = "";

    for (const path of pathsToTry) {
      let apiUrl = pair.url.endsWith('/') ? `${pair.url}${path.replace(/^\//, '')}` : `${pair.url}${path}`;
      if (pair.url.includes('/generate') && path !== '') continue;

      try {
        console.log(`[KC TTS] Attempting generate at: ${apiUrl} (Pair ${pair.label})`);
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": pair.key || ""
          },
          body: JSON.stringify(req.body)
        });

        const responseText = await response.text();
        
        if (!response.ok) {
          console.error(`[KC TTS] API returned ${response.status} at ${apiUrl}: ${responseText.slice(0, 100)}`);
          localErrorText = `Status: ${response.status}, Response: ${responseText.slice(0, 100)}`;
          if (response.status === 404) continue;
          
          if (response.status === 429 || response.status === 402) {
            console.warn(`[KC TTS] Pair ${pair.label} failed with status ${response.status}. Trying next pair...`);
            break; // Try next pair
          }
          continue; // Try next path
        }

        try {
          const data = JSON.parse(responseText);
          
          const transformUrl = (rawUrl: string) => {
            if (!rawUrl) return rawUrl;
            let fullUrl = rawUrl;
            if (!fullUrl.startsWith('http')) {
              const base = pair.url.endsWith('/') ? pair.url : `${pair.url}/`;
              const cleanPath = fullUrl.startsWith('/') ? fullUrl.slice(1) : fullUrl;
              fullUrl = `${base}${cleanPath}`;
            }
            const encrypted = encryptUrl(fullUrl);
            return `/api/kc-tts/proxy?u=${encrypted}`;
          };

          if (data.audio_url) data.audio_url = transformUrl(data.audio_url);
          if (data.srt_url) data.srt_url = transformUrl(data.srt_url);

          return res.json(data);
        } catch (parseError) {
          if (responseText.includes('<!doctype') || responseText.includes('<html')) {
            console.warn(`[KC TTS] HTML response from ${apiUrl}, trying next path...`);
            localErrorText = `HTML response from endpoint instead of JSON`;
            continue;
          }
          console.error(`[KC TTS] Failed to parse JSON response from ${apiUrl}. First 200 chars: ${responseText.slice(0, 200)}`);
          localErrorText = `Invalid JSON response: ${responseText.slice(0, 100)}`;
          continue;
        }
      } catch (error: any) {
        console.error(`[KC TTS] Connection error at ${apiUrl}:`, error);
        localErrorText = error.message || String(error);
      }
    }

    if (res.headersSent) return;

    // If we are here, ALL paths for this pair failed.
    // Notify admin via telegram bot about the failure of this pair
    console.warn(`[KC TTS] Pair ${pair.label} completely failed. Notifying admin and trying next pair...`);
    const isLastPair = pair === ttsPairs[ttsPairs.length - 1];
    const nextStepMsg = isLastPair 
      ? `<i>အတွဲအားလုံး စမ်းသပ်ပြီးသော်လည်း အလုပ်မလုပ်ပါသဖြင့် စနစ်ရပ်တန့်သွားပါပြီ။</i>`
      : `<i>စနစ်သည် နောက်ထပ် URL/Key Pair တစ်ခုကို အလိုအလျောက် ပြောင်းလဲအသုံးပြုနေပါသည်...</i>`;
    
    const alertMsg = `⚠️ <b>KC TTS API Error Alert</b>\n\nKC TTS API URL (${pair.label}) သို့မဟုတ် TTS API Key (${pair.label}) တွင် Error ဖြစ်ပေါ်နေပါသည်ခင်ဗျာ။\n\n<b>API URL:</b> <code>${pair.url}</code>\n<b>Error Message:</b>\n<code>${localErrorText}</code>\n\n${nextStepMsg}`;
    await sendAdminTelegramAlert(alertMsg);

    lastError = new Error(localErrorText || `All paths for pair ${pair.label} failed`);
  }

  return res.status(500).json({ 
    error: `Server error ဖြစ်ပေါ်နေပါသဖြင့် Admin ထံအကြောင်းကြားပေးထားပါတယ်. Details: ${lastError ? lastError.message : 'Unknown error'}` 
  });
});

app.post("/api/feedback", async (req, res) => {
  const { name, contact, message, sessionId } = req.body;

  if (!name || !contact || !message) {
    return res.status(400).json({ error: "ကျေးဇူးပြု၍ အချက်အလက်အားလုံး ဖြည့်စွက်ပေးပါ" });
  }

  if (hasProfanity(name) || hasProfanity(contact) || hasProfanity(message)) {
    return res.status(400).json({ error: "ညစ်ညမ်းစကားလုံးများ ပါဝင်နေသဖြင့် ပို့၍မရပါ။ ကျေးဇူးပြု၍ ယဉ်ကျေးစွာ ပြန်လည်ရေးသားပေးပါ။" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chat) {
    console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variable is missing.");
    return res.status(500).json({ error: "Telegram credentials are not configured on the server." });
  }

  // Format three fields line-by-line (တစ်ကြောင်းချင်းစီ)
  const text = `<b>Smart Creator Feedback</b>\n` +
    `<b>Premium Website</b>\n\n` +
    `<b>Session ID:</b>\n<code>${sessionId || 'N/A'}</code>\n\n` +
    `<b>Name:</b>\n<code>${name || 'Anonymous'}</code>\n\n` +
    `<b>Telegram Acc/Phone No:</b>\n<code>${contact}</code>\n\n` +
    `<b>Message:</b>\n<code>${message}</code>`;

  try {
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: text,
        parse_mode: "HTML"
      })
    });

    if (telegramRes.ok) {
      return res.json({ success: true });
    } else {
      const data = await telegramRes.json();
      console.error("Telegram error response:", data);
      return res.status(500).json({ error: data.description || "Telegram delivery failed" });
    }
  } catch (err: any) {
    console.error("Error sending feedback to Telegram:", err);
    return res.status(500).json({ error: `Connection to Telegram failed: ${err.message}` });
  }
});

app.post(/^\/(api\/)?login$/, async (req, res) => {
  const id = cleanVal(req.body.id);
  const password = cleanVal(req.body.password);
  const deviceId = cleanVal(req.body.deviceId);

  if (!id || !password) {
    return res.status(400).json({ error: "ID and Password are required" });
  }

  // 1. Check fixed environment variables (Super Admin)
  let isSystemAdmin = false;
  let foundSuperKey = "";

  // Base case without index
  const baseKeyId = cleanVal(process.env.SYSTEM_KEY_ID);
  const baseKeyPass = cleanVal(process.env.SYSTEM_KEY_PASS);
  const baseKeyValue = cleanVal(process.env.SYSTEM_KEY_VALUE || process.env.GEMINI_API_KEY);
  
  if (baseKeyId && baseKeyId === id && baseKeyPass === password) {
    isSystemAdmin = true;
    foundSuperKey = baseKeyValue;
  } else {
    // Indexed cases 1 to 10 (with formats _X_ID / _ID_X)
    let i = 1;
    while (i <= 10) {
      const envId = cleanVal(process.env[`SYSTEM_KEY_${i}_ID`] || process.env[`SYSTEM_KEY_ID_${i}`]);
      const envPass = cleanVal(process.env[`SYSTEM_KEY_${i}_PASS`] || process.env[`SYSTEM_KEY_PASS_${i}`]);
      const envValue = cleanVal(process.env[`SYSTEM_KEY_${i}_VALUE`] || process.env[`SYSTEM_KEY_VALUE_${i}`] || process.env.GEMINI_API_KEY);
      
      if (envId && envId === id && envPass === password) {
        isSystemAdmin = true;
        foundSuperKey = envValue;
        break;
      }
      i++;
    }
  }

  if (isSystemAdmin) {
    const systemGeminiKeys = getRotatingApiKey('GEMINI_API_KEY');
    return res.json({ 
      apiKey: foundSuperKey || systemGeminiKeys[0] || '',
      allApiKeys: systemGeminiKeys,
      role: 'admin' 
    });
  }

  // 2. Check Supabase for user account
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const { data: userData, error } = await supabase
      .from('users_accounts')
      .select('*')
      .eq('username', id)
      .eq('password', password)
      .single();

    if (error || !userData) {
      return res.status(401).json({ error: "Invalid ID or Password" });
    }

    // Check expiration
    if (!userData.is_lifetime && userData.expired_date) {
      const now = Date.now();
      const expiry = !isNaN(Number(userData.expired_date)) ? Number(userData.expired_date) : new Date(userData.expired_date).getTime();
      
      if (now > expiry) {
        return res.status(403).json({ error: "Account has expired. Please contact admin." });
      }
    }

    // Check start date
    if (userData.start_date) {
      const now = Date.now();
      const start = !isNaN(Number(userData.start_date)) ? Number(userData.start_date) : new Date(userData.start_date).getTime();
      
      if (now < start) {
        return res.status(403).json({ error: "Account is not active yet." });
      }
    }

    // Check device binding
    if (userData.device_id && deviceId && userData.device_id !== deviceId) {
      return res.status(403).json({ error: "This ID is bound to another device." });
    }

    // Update device ID if not set
    const updates: any = { last_login: Date.now() };
    if (!userData.device_id && deviceId) {
      updates.device_id = deviceId;
    }

    await supabase
      .from('users_accounts')
      .update(updates)
      .eq('id', userData.id);

    // Get all rotating Gemini keys for client rotation
    const systemGeminiKeys = getRotatingApiKey('GEMINI_API_KEY');
    
    return res.json({ 
      apiKey: systemGeminiKeys[0] || '', // Primary key
      allApiKeys: systemGeminiKeys,     // Array for rotation
      role: userData.role || 'premium',
      user: {
        name: userData.name,
        username: userData.username,
        role: userData.role,
        startDate: userData.start_date,
        expiredDate: userData.expired_date,
        isLifetime: userData.is_lifetime,
        linkTranscribeExpiry: userData.link_transcribe_expiry
      }
    });

  } catch (error) {
    console.error("Login Check Error:", error);
    return res.status(500).json({ error: "Internal server error during login" });
  }
});

app.post(/^\/(api\/)?logout$/, async (req, res) => {
  const username = req.body.username?.toString().trim();
  const deviceId = req.body.deviceId?.toString().trim();

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const { data: userData, error } = await supabase
      .from('users_accounts')
      .select('id, device_id')
      .eq('username', username)
      .single();
      
    if (userData && (userData.device_id === deviceId || !userData.device_id)) {
      // If the device ID matches the stored one, or it's already null/empty, clear it to null
      await supabase
        .from('users_accounts')
        .update({ device_id: null })
        .eq('id', userData.id);
    }
    
    return res.json({ success: true });
  } catch (err) {
    console.error("Logout Error:", err);
    return res.status(500).json({ error: "Failed to logout" });
  }
});

app.post(/^\/(api\/)?check-device$/, async (req, res) => {
  const username = req.body.username?.toString().trim();
  const deviceId = req.body.deviceId?.toString().trim();

  if (!username || !deviceId) {
    return res.status(400).json({ valid: false });
  }

  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const { data: userData, error } = await supabase
      .from('users_accounts')
      .select('device_id, expired_date, is_lifetime, link_transcribe_expiry, name, username, role, start_date')
      .eq('username', username)
      .single();
      
    if (error || !userData) {
      return res.json({ valid: false });
    }

    // Check expiration
    if (!userData.is_lifetime && userData.expired_date) {
      const now = Date.now();
      const expiry = !isNaN(Number(userData.expired_date)) ? Number(userData.expired_date) : new Date(userData.expired_date).getTime();
      
      if (now > expiry) {
        return res.json({ valid: false, reason: 'expired' });
      }
    }

    if (userData.device_id !== deviceId) {
      if (!userData.device_id) {
        // If device ID is null in DB, implicitly bind the current device ID
        await supabase
          .from('users_accounts')
          .update({ device_id: deviceId })
          .eq('username', username);
      } else {
        return res.json({ valid: false });
      }
    }
    
    return res.json({ 
      valid: true,
      user: {
        name: userData.name,
        username: userData.username,
        role: userData.role,
        startDate: userData.start_date,
        expiredDate: userData.expired_date,
        isLifetime: userData.is_lifetime,
        linkTranscribeExpiry: userData.link_transcribe_expiry
      }
    });
  } catch (err) {
    console.error("Check Device Error:", err);
    return res.status(500).json({ error: "Failed to check device" });
  }
});

// Admin API Routes
app.get("/api/mngr-sec/users", verifyAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const { data, error } = await supabase
      .from('users_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/mngr-sec/users", verifyAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const account = req.body;
    // Map camalCase to snake_case for Supabase
    const supabaseData: any = {
      name: account.name,
      username: account.username,
      password: account.password,
      role: account.role,
      start_date: account.startDate,
      expired_date: account.expiredDate,
      link_transcribe_expiry: account.linkTranscribeExpiry,
      is_lifetime: account.isLifetime,
      telegram: account.telegram,
      device_id: account.deviceId === undefined ? undefined : account.deviceId
    };

    // Remove undefined fields to avoid overwriting with undefined
    Object.keys(supabaseData).forEach(key => supabaseData[key] === undefined && delete supabaseData[key]);

    const { error } = await supabase
      .from('users_accounts')
      .upsert(supabaseData, { onConflict: 'username' });

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error("Add User Error:", error);
    if (error.code === '42501') {
      return res.status(403).json({ 
        error: "Supabase RLS Error: SUPABASE_SERVICE_ROLE_KEY is required to bypass security. Please add it to Vercel Environment Variables.",
        details: error
      });
    }
    res.status(500).json({ error: "Failed to add user" });
  }
});

app.delete("/api/mngr-sec/users/:username", verifyAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

  try {
    const { error } = await supabase
      .from('users_accounts')
      .delete()
      .eq('username', req.params.username);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Tutorials Admin API
app.get("/api/mngr-sec/tutorials", verifyAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { data, error } = await supabase
      .from('tutorials')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tutorials" });
  }
});

app.post("/api/mngr-sec/tutorials", verifyAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const tutorial = req.body;
    let error;
    if (tutorial.id) {
      // Update
      const { error: err } = await supabase
        .from('tutorials')
        .update({
          title: tutorial.title,
          video_id: tutorial.video_id,
          time_start: tutorial.time_start,
          content: tutorial.content,
          tool_key: tutorial.tool_key
        })
        .eq('id', tutorial.id);
      error = err;
    } else {
      // Insert
      const { error: err } = await supabase
        .from('tutorials')
        .insert([{
          title: tutorial.title,
          video_id: tutorial.video_id,
          time_start: tutorial.time_start,
          content: tutorial.content,
          tool_key: tutorial.tool_key
        }]);
      error = err;
    }
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Save Tutorial Error:", error);
    res.status(500).json({ error: "Failed to save tutorial" });
  }
});

app.delete("/api/mngr-sec/tutorials/:id", verifyAdmin, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { error } = await supabase
      .from('tutorials')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete tutorial" });
  }
});


// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const viteModuleName = "vi" + "te";
      const { createServer: createViteServer } = await import(viteModuleName);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log("Vite not imported");
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite();

// Export for Vercel and Netlify
export const handler = serverless(app, {
  binary: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/webm",
    "audio/*",
    "application/octet-stream"
  ]
});
export default app;

// Local listen
const PORT = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

