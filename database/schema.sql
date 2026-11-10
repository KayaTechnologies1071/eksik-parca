-- EKSİK PARÇA (THE MISSING PIECE) — ÜRETİM POSTGRESQL VERİTABANI ŞEMASI (v2.0)
-- Supabase (Proje: dedektifgame / zioqzlzhvdvxddwsnhem), Railway PostgreSQL ve Neon Serverless Postgres ile %100 uyumludur.

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(128) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL DEFAULT 'Dedektif K.',
    linked_provider VARCHAR(32),
    subscription_active BOOLEAN DEFAULT FALSE,
    avatar_id VARCHAR(32) DEFAULT 'raven',
    theme_color VARCHAR(24) DEFAULT 'crimson',
    specialty VARCHAR(64) DEFAULT 'Kriminal Analist',
    motto VARCHAR(140) DEFAULT 'Her yalan ardında bir iz bırakır.',
    badge_code VARCHAR(24),
    xp INT NOT NULL DEFAULT 0,
    solved_cases JSONB NOT NULL DEFAULT '{}'::jsonb,
    badges JSONB NOT NULL DEFAULT '[]'::jsonb,
    stats JSONB NOT NULL DEFAULT '{"matches_played":0,"matches_won":0,"win_streak":0,"best_streak":0,"fastest_solve_sec":null,"total_connections":0,"total_mistakes":0,"lead_detective_count":0,"dirty_cop_wins":0,"solo_wins":0,"duo_wins":0,"group_wins":0}'::jsonb,
    claimed_directives JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.case_packs (
    pack_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    subtitle VARCHAR(240),
    price_tier INT NOT NULL DEFAULT 0,
    price_label VARCHAR(32) DEFAULT 'ÜCRETSİZ',
    badge VARCHAR(32) DEFAULT 'PAKET',
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.user_entitlements (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    pack_id VARCHAR(64) REFERENCES public.case_packs(pack_id) ON DELETE CASCADE,
    transaction_id VARCHAR(128) UNIQUE NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, pack_id)
);

CREATE TABLE IF NOT EXISTS public.cases (
    case_id VARCHAR(64) PRIMARY KEY,
    pack_id VARCHAR(64) REFERENCES public.case_packs(pack_id),
    version INT NOT NULL DEFAULT 1,
    content_hash VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.match_history (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    case_id VARCHAR(64),
    case_title VARCHAR(160),
    mode VARCHAR(16) NOT NULL,
    difficulty_preset VARCHAR(24) DEFAULT 'STANDARD',
    player_count INT NOT NULL,
    is_solved BOOLEAN NOT NULL,
    duration_sec INT NOT NULL,
    accuracy_rate INT NOT NULL DEFAULT 0,
    xp_gained INT NOT NULL DEFAULT 0,
    lead_detective VARCHAR(64),
    killer_name VARCHAR(64),
    arrested_name VARCHAR(64),
    played_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sorgu ve Yabancı Anahtar (FK) İndeksleri
CREATE INDEX IF NOT EXISTS idx_users_device_id ON public.users(device_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_pack_id ON public.user_entitlements(pack_id);
CREATE INDEX IF NOT EXISTS idx_cases_pack_id ON public.cases(pack_id);
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON public.match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_played_at ON public.match_history(played_at DESC);

-- Row Level Security (RLS) Aktivasyonu
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- Varsayılan Vaka Paketleri
INSERT INTO public.case_packs (pack_id, title, subtitle, price_tier, price_label, badge, is_active)
VALUES
    ('pack_starter', 'Başlangıç Paketi: Şehir Dosyaları', '5 Tam Vaka + 90 Sn İnteraktif Eğitim Dosyası', 0, 'ÜCRETSİZ', 'BAŞLANGIÇ', true),
    ('pack_couples', 'Çiftler Özel: Gizemli Randevu', '2 Kişilik İkili (Duo) Mod İçin Özel Kurgulanmış 5 Asimetrik Vaka', 1, '₺89,99', 'DUO ÖZEL', true),
    ('pack_criminal', 'Ağır Ceza: Kusursuz Cinayetler', '3-6 Kişilik Grup & Kirli Polis Modu İçin 5 Yüksek Zorluklu Dosya', 2, '₺129,99', 'HARDCORE', true)
ON CONFLICT (pack_id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    price_tier = EXCLUDED.price_tier,
    price_label = EXCLUDED.price_label,
    badge = EXCLUDED.badge,
    is_active = EXCLUDED.is_active;
