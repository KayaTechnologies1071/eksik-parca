import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

/**
 * EKSİK PARÇA — Üretim Hibrit Veritabanı Katmanı (PostgreSQL + Yerel JSON Fallback)
 * Ortam değişkeninde DATABASE_URL tanımlıysa (Supabase / Railway / Neon PostgreSQL),
 * tüm kalıcı verileri doğrudan PostgreSQL üzerinde tutar ve şemayı otomatik kurar.
 * Tanımlı değilse yerel geliştirme için database/db.json kullanır.
 */
export class StorageAdapter {
  constructor({ dbFilePath, schemaFilePath, defaultPacks }) {
    this.dbFilePath = dbFilePath;
    this.schemaFilePath = schemaFilePath;
    this.defaultPacks = defaultPacks;
    this.pool = null;
    this.mode = 'local-json';
    this.mem = {
      users: {},
      case_packs: defaultPacks,
      user_entitlements: {},
      match_history: [],
    };
  }

  async init() {
    const dbUrl = process.env.DATABASE_URL?.trim();
    if (dbUrl) {
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

        for (const p of this.defaultPacks) {
          await this.pool.query(
            `INSERT INTO case_packs (pack_id, title, subtitle, price_tier, price_label, badge, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (pack_id) DO UPDATE SET
               title = EXCLUDED.title,
               subtitle = EXCLUDED.subtitle,
               price_tier = EXCLUDED.price_tier,
               price_label = EXCLUDED.price_label,
               badge = EXCLUDED.badge`,
            [p.pack_id, p.title, p.subtitle, p.price_tier, p.price_label, p.badge, p.is_active]
          );
        }

        // Hydrate warm cache from PostgreSQL for sub-millisecond reads during gameplay
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
        console.log('[VERİTABANI] PostgreSQL bağlantısı ve şema senkronizasyonu aktif.');
        return;
      } catch (err) {
        console.error('[VERİTABANI UYARISI] PostgreSQL bağlanamadı, yerel JSON moduna geçiliyor:', err.message);
        this.pool = null;
      }
    }

    // Local JSON fallback
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
    } else {
      this.flushLocal();
    }
    this.mode = 'local-json';
    console.log('[VERİTABANI] Yerel disk modu aktif (database/db.json).');
  }

  flushLocal() {
    if (this.mode === 'postgresql') return;
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.mem, null, 2), 'utf-8');
    } catch (err) {
      console.error('JSON yazma hatası:', err);
    }
  }

  async upsertUser(user) {
    this.mem.users[user.id] = user;
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
    } else {
      this.flushLocal();
    }
  }

  async deleteUser(userId) {
    delete this.mem.users[userId];
    delete this.mem.user_entitlements[userId];
    if (this.pool) {
      await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
    } else {
      this.flushLocal();
    }
  }

  async addEntitlement(ent) {
    const list = this.mem.user_entitlements[ent.user_id] || [];
    if (!list.some((e) => e.pack_id === ent.pack_id)) {
      list.push(ent);
      this.mem.user_entitlements[ent.user_id] = list;
    }
    if (this.pool) {
      await this.pool.query(
        `INSERT INTO user_entitlements (user_id, pack_id, transaction_id, purchased_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, pack_id) DO NOTHING`,
        [ent.user_id, ent.pack_id, ent.transaction_id, ent.purchased_at]
      );
    } else {
      this.flushLocal();
    }
  }

  async recordMatch(matchItem) {
    this.mem.match_history.unshift(matchItem);
    if (this.mem.match_history.length > 60) {
      this.mem.match_history.length = 60;
    }
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
    } else {
      this.flushLocal();
    }
  }
}
