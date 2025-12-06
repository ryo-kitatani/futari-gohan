-- ふたりごはん Supabase Schema
-- Run this SQL in Supabase SQL Editor

-- カップル
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザー
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '👤',
  couple_id UUID REFERENCES couples(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 招待コード
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  couple_id UUID REFERENCES couples(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  used_by UUID REFERENCES users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 好み
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  couple_id UUID REFERENCES couples(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'dislike', 'allergy')),
  item TEXT NOT NULL,
  severity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type, item)
);

-- レシピ
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT DEFAULT '🍽️',
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'photo', 'ai', 'manual')),
  source_url TEXT,
  source_site_name TEXT,
  steps JSONB,
  cook_time INTEGER,
  servings INTEGER DEFAULT 2,
  calories INTEGER,
  category TEXT,
  tags TEXT[],
  match_score_total INTEGER,
  match_scores JSONB,
  warnings JSONB,
  cooked_count INTEGER DEFAULT 0,
  last_cooked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- レシピ材料
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount TEXT,
  order_index INTEGER DEFAULT 0
);

-- 料理記録
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  recipe_id UUID REFERENCES recipes(id),
  dish_name TEXT NOT NULL,
  emoji TEXT,
  photo_url TEXT,
  photo_recognition JSONB,
  memo TEXT,
  cooked_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 反応
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES records(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) NOT NULL,
  emoji TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(record_id, user_id)
);

-- インデックス
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_couple_id ON users(couple_id);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_preferences_user_id ON preferences(user_id);
CREATE INDEX idx_preferences_couple_id ON preferences(couple_id);
CREATE INDEX idx_recipes_couple_id ON recipes(couple_id);
CREATE INDEX idx_records_couple_id ON records(couple_id);
CREATE INDEX idx_records_recipe_id ON records(recipe_id);

-- RLS (Row Level Security) は開発段階では無効化
-- 本番環境では有効化すること
