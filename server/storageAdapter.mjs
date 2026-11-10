import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const DEFAULT_SUPABASE_EDGE_API =
  process.env.SUPABASE_EDGE_API_URL ||
  'https://zioqzlzhvdvxddwsnhem.supabase.co/functions/v1/eksik-parca-api';

/**
 * EKSİK PARÇA — Üretim Hibrit Veritabanı Katmanı
 * 1) DATABASE_URL tanımlıysa doğrudan PostgreSQL TCP havuzu (pg.Pool) kullanır.
 * 2) Tanımlı değilse aktif Supabase Cloud Edge API (zioqzlzhvdvxddwsnhem) üzerinden
 *    canlı PostgreSQL tablolarıyla gerçek zamanlı senkronize çalışır + yerel disk yedeği tutar.
 */
export class StorageAdapter {
  constructor({ dbFilePath, schemaFilePath, defaultPacks }) {
    this.dbFilePath = dbFilePath;
    this.schemaFilePath = schemaFilePath;
    this.defaultPacks = defaultPacks;
    this.pool = null;
    this.supabaseEdgeUrl = DEFAULT_SUPABASE_EDGE_API;
    this.supabaseCloudActive = false;
    this.mode = 'local-json';
    this.mem = {
      users: {},
      case_packs: defaultPacks,
      user_entitlements: {},
      match_history: [],
    };
  }

  async init() {
    // Load local disk cache first so we don't lose any local data
    const dir = path.dirname(this.dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.dbFilePath, 'utf-8'));
        this.mem.users = parsed.users || {};
        this.mem.user_entitlements = parsed.user_entitlements || {};
        this.mem.match_history = parsed.match_history || [];
      } catch {}
    }

    const dbUrl = process.env.DATABASE_URL?.trim();
    if (dbUrl && !dbUrl.includes('VERITABANI_SIFRENIZ') && !dbUrl.includes('SIFRENIZ')) {
      try {
        const useSsl =
          !dbUrl.includes('localhost') &&
          !dbUrl.includes('127.0.0.1') &&
          process.env.PGSSLMODE !== 'disable';

        this.pool = new Pool({
          connectionString: dbUrl,
          ssl: useSsl ? { rejectUnauthorized: false } : false,
          max: 15,
        });

        await this.pool.query('SELECT 1');
        if (fs.existsSync(this.schemaFilePath)) {
          const schemaSql = fs.readFileSync(this.schemaFilePath, 'utf-8');
          await this.pool.query(schemaSql);
        }

        const usersRes = await this.pool.query('SELECT * FROM users');
        for (const row of usersRes.rows) {
          this.mem.users[row.id] = row;
        }
        const entRes = await this.pool.query('SELECT * FROM user_entitlements');
        for (const row of entRes.rows) {
          if (!this.mem.user_entitlements[row.user_id]) {
            this.mem.user_entitlements[row.user_id] = [];
          }
          this.mem.user_entitlements[row.user_id].push(row);
        }
        const histRes = await this.pool.query(
          'SELECT * FROM match_history ORDER BY played_at DESC LIMIT 60'
        );
        this.mem.match_history = histRes.rows;

        this.mode = 'postgresql';
        console.log('[VERİTABANI] Doğrudan PostgreSQL TCP bağlantısı aktif.');
        return;
      } catch (err) {
        console.error('[VERİTABANI UYARISI] Doğrudan PostgreSQL bağlanamadı:', err.message);
        this.pool = null;
      }
    }

    // 2. Connect to Live Supabase Cloud Edge API (zioqzlzhvdvxddwsnhem)
    if (this.supabaseEdgeUrl) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4500);
        const res = await fetch(`${this.supabaseEdgeUrl}/api/sync/bootstrap`, {
          signal: ctrl.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const cloud = await res.json();
          for (const u of cloud.users || []) {
            this.mem.users[u.id] = u;
          }
          for (const ent of cloud.entitlements || []) {
            const list = this.mem.user_entitlements[ent.user_id] || [];
            if (!list.some((e) => e.pack_id === ent.pack_id)) {
              list.push(ent);
              this.mem.user_entitlements[ent.user_id] = list;
            }
          }
          if (Array.isArray(cloud.match_history) && cloud.match_history.length > 0) {
            this.mem.match_history = cloud.match_history;
          }
          this.supabaseCloudActive = true;
          this.mode = 'supabase-postgresql (zioqzlzhvdvxddwsnhem)';
          this.flushLocal();
          console.log('[VERİTABANI] Canlı Supabase PostgreSQL (zioqzlzhvdvxddwsnhem) bulut senkronizasyonu aktif.');
          return;
        }
      } catch (err) {
        console.warn('[VERİTABANI] Supabase Bulut API erişilemedi, yerel JSON modunda devam ediliyor.');
      }
    }

    this.flushLocal();
    this.mode = 'local-json';
    console.log('[VERİTABANI] Yerel disk modu aktif (database/db.json).');
  }

  flushLocal() {
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.mem, null, 2), 'utf-8');
    } catch (err) {
      console.error('JSON yazma hatası:', err);
    }
  }

  async pushToSupabaseCloud(payload) {
    if (!this.supabaseCloudActive || !this.supabaseEdgeUrl) return;
    try {
      await fetch(`${this.supabaseEdgeUrl}/api/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}
  }

  async upsertUser(user) {
    this.mem.users[user.id] = user;
    this.flushLocal();

    if (this.pool) {
      await this.pool.query(
        `INSERT INTO users (
          id, device_id, display_name, linked_provider, subscription_active,
          avatar_id, theme_color, specialty, motto, badge_code,
          xp, solved_cases, badges, stats, claimed_directives, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          linked_provider = EXCLUDED.linked_provider,
          subscription_active = EXCLUDED.subscription_active,
          avatar_id = EXCLUDED.avatar_id,
          theme_color = EXCLUDED.theme_color,
          specialty = EXCLUDED.specialty,
          motto = EXCLUDED.motto,
          badge_code = EXCLUDED.badge_code,
          xp = EXCLUDED.xp,
          solved_cases = EXCLUDED.solved_cases,
          badges = EXCLUDED.badges,
          stats = EXCLUDED.stats,
          claimed_directives = EXCLUDED.claimed_directives,
          updated_at = NOW()`,
        [
          user.id,
          user.device_id,
          user.display_name,
          user.linked_provider,
          Boolean(user.subscription_active),
          user.avatar_id || 'raven',
          user.theme_color || 'crimson',
          user.specialty || 'Kriminal Analist',
          user.motto || 'Her yalan ardında bir iz bırakır.',
          user.badge_code || 'TR-EP-0001',
          user.xp || 0,
          JSON.stringify(user.solved_cases || {}),
          JSON.stringify(user.badges || []),
          JSON.stringify(user.stats || {}),
          JSON.stringify(user.claimed_directives || []),
        ]
      );
    } else if (this.supabaseCloudActive) {
      await this.pushToSupabaseCloud({ type: 'upsert_user', user });
    }
  }

  async deleteUser(userId) {
    delete this.mem.users[userId];
    delete this.mem.user_entitlements[userId];
    this.flushLocal();

    if (this.pool) {
      await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
    } else if (this.supabaseCloudActive) {
      await this.pushToSupabaseCloud({ type: 'delete_user', user_id: userId });
    }
  }

  async addEntitlement(ent) {
    const list = this.mem.user_entitlements[ent.user_id] || [];
    if (!list.some((e) => e.pack_id === ent.pack_id)) {
      list.push(ent);
      this.mem.user_entitlements[ent.user_id] = list;
    }
    this.flushLocal();

    if (this.pool) {
      await this.pool.query(
        `INSERT INTO user_entitlements (user_id, pack_id, transaction_id, purchased_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, pack_id) DO NOTHING`,
        [ent.user_id, ent.pack_id, ent.transaction_id, ent.purchased_at]
      );
    } else if (this.supabaseCloudActive) {
      await this.pushToSupabaseCloud({ type: 'add_entitlement', entitlement: ent });
    }
  }

  async recordMatch(matchItem) {
    this.mem.match_history.unshift(matchItem);
    if (this.mem.match_history.length > 60) {
      this.mem.match_history.length = 60;
    }
    this.flushLocal();

    if (this.pool) {
      await this.pool.query(
        `INSERT INTO match_history (
          match_id, case_id, case_title, mode, difficulty_preset, player_count,
          is_solved, duration_sec, accuracy_rate, xp_gained, lead_detective,
          killer_name, arrested_name, played_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          matchItem.match_id,
          matchItem.case_id,
          matchItem.case_title,
          matchItem.mode,
          matchItem.difficulty_preset || 'STANDARD',
          matchItem.player_count,
          matchItem.is_solved,
          matchItem.duration_sec,
          matchItem.accuracy_rate,
          matchItem.xp_gained || 0,
          matchItem.lead_detective,
          matchItem.killer_name,
          matchItem.arrested_name,
          matchItem.played_at,
        ]
      );
    } else if (this.supabaseCloudActive) {
      await this.pushToSupabaseCloud({ type: 'record_match', match: matchItem });
    }
  }
}
