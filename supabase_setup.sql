-- အရင်ရှိနှင့်နေပြီးသား Table တွေကြောင့် Error တက်နေရင် အောက်ပါ code တစ်ခုလုံးကို Copy ကူးပြီး Run လိုက်ပါ။
-- (သတိပြုရန် - ရှိပြီးသား Data အဟောင်းများ ပျက်သွားပါလိမ့်မည်)

DROP TABLE IF EXISTS tool_usage CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS users_accounts CASCADE;
DROP TABLE IF EXISTS tutorials CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS banned_sessions CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS tts_cache CASCADE;

-- ၁။ Tool အသုံးပြုမှုကို မှတ်တမ်းတင်ရန် Table (Link Transcribe Limit အတွက် သုံးပါသည်)
CREATE TABLE tool_usage (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL, -- Device ID သို့မဟုတ် User ID
  tool_type TEXT NOT NULL,  -- 'ai_voice' သို့မဟုတ် 'transcribe'
  usage_date DATE DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, tool_type, usage_date)
);

-- ၂။ Admin Settings (Limit များ) သတ်မှတ်ရန် Table
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ၃။ User Accounts Table
CREATE TABLE users_accounts (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  start_date BIGINT,
  expired_date BIGINT,
  link_transcribe_expiry BIGINT,
  is_lifetime BOOLEAN DEFAULT FALSE,
  telegram TEXT,
  device_id TEXT,
  last_login BIGINT,
  created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)
);

-- ၄။ Tutorials Table
CREATE TABLE tutorials (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  video_id TEXT NOT NULL,
  time_start INTEGER DEFAULT 0,
  content TEXT,
  tool_key TEXT
);

-- ၅။ Playlists Table
CREATE TABLE playlists (
  id BIGSERIAL PRIMARY KEY,
  video_id TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- ၆။ Banned Sessions Table (စနစ်သို့ဝင်ရောက်ခွင့် ပိတ်ပင်ထားသော Device list)
CREATE TABLE banned_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ၇။ Analytics Events Table (Disabled in code but schema structure maintained)
CREATE TABLE analytics (
  id TEXT PRIMARY KEY,
  action TEXT,
  tool TEXT,
  timestamp TEXT,
  synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ၈။ TTS Audio Cache Table
CREATE TABLE tts_cache (
  id BIGSERIAL PRIMARY KEY,
  voice_name TEXT NOT NULL,
  audio_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Limit settings များ ထည့်သွင်းခြင်း
INSERT INTO app_settings (key, value) VALUES 
('usage_limits', '{
  "ai_voice_guest_limit": 2,
  "transcribe_guest_limit": 2,
  "transcribe_user_limit": 3
}'::jsonb);
