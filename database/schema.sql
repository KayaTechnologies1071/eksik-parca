-- EKSİK PARÇA (THE MISSING PIECE) — ÜRETİM POSTGRESQL VERİTABANI ŞEMASI (v2.0)
-- Supabase, Railway PostgreSQL ve Neon Serverless Postgres ile %100 uyumludur.

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS case_packs (
    pack_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    subtitle VARCHAR(240),
    price_tier INT NOT NULL DEFAULT 0,
    price_label VARCHAR(32) DEFAULT 'ÜCRETSİZ',
    badge VARCHAR(32) DEFAULT 'PAKET',
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_entitlements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pack_id VARCHAR(64) REFERENCES case_packs(pack_id) ON DELETE CASCADE,
    transaction_id VARCHAR(128) UNIQUE NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, pack_id)
);

CREATE TABLE IF NOT EXISTS cases (
    case_id VARCHAR(64) PRIMARY KEY,
    pack_id VARCHAR(64) REFERENCES case_packs(pack_id),
    version INT NOT NULL DEFAULT 1,
    content_hash VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_history (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_match_history_played_at ON match_history(played_at DESC);
