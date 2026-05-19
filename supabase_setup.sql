-- အရင်ရှိနှင့်နေပြီးသား Table တွေကြောင့် Error တက်နေရင် အောက်ပါ code တစ်ခုလုံးကို Copy ကူးပြီး Run လိုက်ပါ။
-- (သတိပြုရန် - ရှိပြီးသား Data အဟောင်းများ ပျက်သွားပါလိမ့်မည်)

DROP TABLE IF EXISTS tool_usage;
DROP TABLE IF EXISTS app_settings;

-- ၁။ Tool အသုံးပြုမှုကို မှတ်တမ်းတင်ရန် Table
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

-- ၄။ Default Limit များ ထည့်သွင်းခြင်း
INSERT INTO app_settings (key, value) VALUES 
('usage_limits', '{
  "ai_voice_guest_limit": 2,
  "transcribe_guest_limit": 2,
  "transcribe_user_limit": 3
}'::jsonb);
