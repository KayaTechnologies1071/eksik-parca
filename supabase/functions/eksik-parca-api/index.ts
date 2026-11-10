import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function computeRankFromXp(xp = 0) {
  if (xp >= 2200) return { level: 5, title: "Efsanevi Kriminalist", nextXp: 3500 };
  if (xp >= 1200) return { level: 4, title: "Başkomiser", nextXp: 2200 };
  if (xp >= 600) return { level: 3, title: "Kıdemli Müfettiş", nextXp: 1200 };
  if (xp >= 200) return { level: 2, title: "Saha Dedektifi", nextXp: 600 };
  return { level: 1, title: "Çaylak Memur", nextXp: 200 };
}

const BADGE_CATALOG = [
  { id: "FIRST_SOLVE", title: "İlk Tutuklama", desc: "İlk vakanızı başarıyla çözdünüz." },
  { id: "ZERO_MISTAKE", title: "Kusursuz Analiz", desc: "Hiç hatalı bağlantı yapmadan vaka çözdünüz." },
  { id: "HARDCORE_WIN", title: "Başkomiser Mührü", desc: "Başkomiser (Zor) modda tam isabetle vaka çözdünüz." },
  { id: "SPEED_SOLVER", title: "Yıldırım Soruşturma", desc: "Bir vakayı 180 saniyenin altında aydınlattınız." },
  { id: "MASTER_5", title: "5 Vaka Uzmanı", desc: "5 farklı cinayet dosyasını kapattınız." },
  { id: "SEASON_CONQUEROR", title: "Sezon Fatihi", desc: "12 veya daha fazla farklı vakayı çözdünüz." },
  { id: "SOLO_MASTER", title: "Arşiv Efendisi", desc: "Solo Arşiv modunda 3 vaka aydınlattınız." },
  { id: "DUO_PARTNER", title: "Kusursuz İkili", desc: "2 kişilik Duo modunda vaka çözdünüz." },
  { id: "MOLE_HUNTER", title: "Köstebek Avcısı", desc: "Kirli Polis (Grup) modunda haini alt ettiniz." },
  { id: "LEGEND_DETECTIVE", title: "Efsanevi Sicil", desc: "2200 XP barajını aşarak en üst rütbeye ulaştınız." },
];

const DIRECTIVE_CATALOG = [
  { id: "DIR_SOLVE_3", title: "Saha Mesaisi: 3 Farklı Vaka Çöz", reward_xp: 120, target: 3, metric: "solved_count" },
  { id: "DIR_CONNECTIONS_8", title: "Kırmızı İp Ustası: Toplam 8 Doğru Bağlantı Kur", reward_xp: 100, target: 8, metric: "total_connections" },
  { id: "DIR_STREAK_2", title: "Kesintisiz Takip: Üst Üste 2 Vaka Kazan", reward_xp: 150, target: 2, metric: "best_streak" },
  { id: "DIR_EXPERT_SOLVE", title: "Ağır Ceza: Zor (Başkomiser) Modda 1 Vaka Kapat", reward_xp: 180, target: 1, metric: "hardcore_solved" },
];

const DEFAULT_STATS = {
  matches_played: 0,
  matches_won: 0,
  win_streak: 0,
  best_streak: 0,
  fastest_solve_sec: null,
  total_connections: 0,
  total_mistakes: 0,
  lead_detective_count: 0,
  dirty_cop_wins: 0,
  solo_wins: 0,
  duo_wins: 0,
  group_wins: 0,
};

function ensureUserCareerFields(user: Record<string, any>) {
  const xp = typeof user.xp === "number" ? user.xp : 0;
  const rk = computeRankFromXp(xp);
  const idStr = String(user.id || "0000");
  let codeNum = 1042;
  for (let i = 0; i < idStr.length; i++) {
    codeNum = (codeNum * 31 + idStr.charCodeAt(i)) % 9000;
  }
  return {
    ...user,
    xp,
    rank_level: rk.level,
    rank_title: rk.title,
    next_rank_xp: rk.nextXp,
    avatar_id: user.avatar_id || "raven",
    theme_color: user.theme_color || "crimson",
    specialty: user.specialty || "Kriminal Analist",
    motto: user.motto || "Her yalan ardında bir iz bırakır.",
    badge_code: user.badge_code || `TR-EP-${codeNum + 1000}`,
    solved_cases: user.solved_cases && typeof user.solved_cases === "object" ? user.solved_cases : {},
    badges: Array.isArray(user.badges) ? user.badges : [],
    claimed_directives: Array.isArray(user.claimed_directives) ? user.claimed_directives : [],
    stats: { ...DEFAULT_STATS, ...(user.stats && typeof user.stats === "object" ? user.stats : {}) },
  };
}

function jsonResp(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);
  const apiIdx = url.pathname.indexOf("/api/");
  const pathname = apiIdx >= 0 ? url.pathname.slice(apiIdx) : "/api/health";

  try {
    // 0. Health Check & Full DB Snapshot for Hybrid Server Sync
    if (pathname === "/api/health" && req.method === "GET") {
      const { count: caseCount } = await sb.from("cases").select("*", { count: "exact", head: true });
      const { count: userCount } = await sb.from("users").select("*", { count: "exact", head: true });
      return jsonResp(200, {
        status: "ok",
        service: "eksik-parca-supabase-edge",
        version: "2.0.0",
        storage: "supabase-postgresql",
        project_ref: "zioqzlzhvdvxddwsnhem",
        cases_loaded: caseCount ?? 16,
        registered_detectives: userCount ?? 0,
        server_time: Date.now(),
      });
    }

    // 0B. Hybrid Server Bootstrap / Sync Endpoint
    if (pathname === "/api/sync/bootstrap" && req.method === "GET") {
      const [usersRes, entRes, histRes, packsRes] = await Promise.all([
        sb.from("users").select("*"),
        sb.from("user_entitlements").select("*"),
        sb.from("match_history").select("*").order("played_at", { ascending: false }).limit(60),
        sb.from("case_packs").select("*").order("price_tier", { ascending: true }),
      ]);
      return jsonResp(200, {
        users: (usersRes.data || []).map(ensureUserCareerFields),
        entitlements: entRes.data || [],
        match_history: histRes.data || [],
        case_packs: packsRes.data || [],
      });
    }

    if (pathname === "/api/sync/push" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.type === "upsert_user" && body.user) {
        const u = ensureUserCareerFields(body.user);
        await sb.from("users").upsert({
          id: u.id,
          device_id: u.device_id,
          display_name: u.display_name,
          linked_provider: u.linked_provider,
          subscription_active: Boolean(u.subscription_active),
          avatar_id: u.avatar_id,
          theme_color: u.theme_color,
          specialty: u.specialty,
          motto: u.motto,
          badge_code: u.badge_code,
          xp: u.xp,
          solved_cases: u.solved_cases,
          badges: u.badges,
          stats: u.stats,
          claimed_directives: u.claimed_directives,
          updated_at: new Date().toISOString(),
        });
      } else if (body.type === "delete_user" && body.user_id) {
        await sb.from("users").delete().eq("id", body.user_id);
      } else if (body.type === "add_entitlement" && body.entitlement) {
        await sb.from("user_entitlements").upsert(body.entitlement, { onConflict: "user_id,pack_id" });
      } else if (body.type === "record_match" && body.match) {
        await sb.from("match_history").insert(body.match);
      }
      return jsonResp(200, { synced: true });
    }

    // 1. Guest Login
    if (pathname === "/api/auth/guest" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const deviceId = body.device_id || `dev_${crypto.randomUUID()}`;
      const displayName = (body.display_name || "").trim() || "Dedektif K.";

      const { data: existingRows } = await sb.from("users").select("*").eq("device_id", deviceId).limit(1);
      let userObj: Record<string, any>;

      if (!existingRows || existingRows.length === 0) {
        const newId = crypto.randomUUID();
        const fresh = ensureUserCareerFields({
          id: newId,
          device_id: deviceId,
          display_name: displayName,
          linked_provider: null,
          subscription_active: false,
          avatar_id: "raven",
          theme_color: "crimson",
          specialty: "Kriminal Analist",
          motto: "Her yalan ardında bir iz bırakır.",
          xp: 0,
          solved_cases: {},
          badges: [],
          claimed_directives: [],
          stats: { ...DEFAULT_STATS },
        });

        await sb.from("users").insert({
          id: fresh.id,
          device_id: fresh.device_id,
          display_name: fresh.display_name,
          linked_provider: fresh.linked_provider,
          subscription_active: fresh.subscription_active,
          avatar_id: fresh.avatar_id,
          theme_color: fresh.theme_color,
          specialty: fresh.specialty,
          motto: fresh.motto,
          badge_code: fresh.badge_code,
          xp: fresh.xp,
          solved_cases: fresh.solved_cases,
          badges: fresh.badges,
          stats: fresh.stats,
          claimed_directives: fresh.claimed_directives,
        });

        await sb.from("user_entitlements").upsert({
          user_id: fresh.id,
          pack_id: "pack_starter",
          transaction_id: `tx_free_${fresh.id.slice(0, 8)}`,
          purchased_at: new Date().toISOString(),
        }, { onConflict: "user_id,pack_id" });

        userObj = fresh;
      } else {
        userObj = ensureUserCareerFields(existingRows[0]);
        if (body.display_name && body.display_name.trim() && body.display_name.trim() !== userObj.display_name) {
          userObj.display_name = displayName;
          await sb.from("users").update({ display_name: displayName, updated_at: new Date().toISOString() }).eq("id", userObj.id);
        }
      }

      const { data: entRows } = await sb.from("user_entitlements").select("*").eq("user_id", userObj.id);

      return jsonResp(200, {
        user: userObj,
        badge_catalog: BADGE_CATALOG,
        directive_catalog: DIRECTIVE_CATALOG,
        entitlements: entRows || [],
      });
    }

    // 1B. Update Detective Profile
    if (pathname === "/api/profile/update" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { data: rows } = await sb.from("users").select("*").eq("id", body.user_id).limit(1);
      if (!rows || rows.length === 0) return jsonResp(404, { error: "Kullanıcı bulunamadı." });

      const user = ensureUserCareerFields(rows[0]);
      if (typeof body.display_name === "string" && body.display_name.trim()) {
        user.display_name = body.display_name.trim().slice(0, 32);
      }
      if (typeof body.avatar_id === "string") user.avatar_id = body.avatar_id.slice(0, 24);
      if (typeof body.theme_color === "string") user.theme_color = body.theme_color.slice(0, 24);
      if (typeof body.specialty === "string") user.specialty = body.specialty.slice(0, 48);
      if (typeof body.motto === "string") user.motto = body.motto.slice(0, 120);

      await sb.from("users").update({
        display_name: user.display_name,
        avatar_id: user.avatar_id,
        theme_color: user.theme_color,
        specialty: user.specialty,
        motto: user.motto,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      return jsonResp(200, { user });
    }

    // 1C. Claim Directive XP
    if (pathname === "/api/profile/claim-directive" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const dir = DIRECTIVE_CATALOG.find((d) => d.id === body.directive_id);
      const { data: rows } = await sb.from("users").select("*").eq("id", body.user_id).limit(1);
      if (!rows || rows.length === 0 || !dir) return jsonResp(404, { error: "Görev bulunamadı." });

      const user = ensureUserCareerFields(rows[0]);
      if (user.claimed_directives.includes(dir.id)) {
        return jsonResp(400, { error: "Bu görev ödülü zaten alındı." });
      }
      user.claimed_directives.push(dir.id);
      user.xp += dir.reward_xp;
      if (user.xp >= 2200 && !user.badges.includes("LEGEND_DETECTIVE")) {
        user.badges.push("LEGEND_DETECTIVE");
      }
      const updated = ensureUserCareerFields(user);

      await sb.from("users").update({
        xp: updated.xp,
        badges: updated.badges,
        claimed_directives: updated.claimed_directives,
        updated_at: new Date().toISOString(),
      }).eq("id", updated.id);

      return jsonResp(200, { user: updated, reward_xp: dir.reward_xp });
    }

    // 1D. Import Backup
    if (pathname === "/api/profile/import" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { data: rows } = await sb.from("users").select("*").eq("id", body.user_id).limit(1);
      const imported = body.backup_data;
      if (!rows || rows.length === 0 || !imported || typeof imported !== "object") {
        return jsonResp(400, { error: "Geçersiz yedek verisi." });
      }
      const user = ensureUserCareerFields(rows[0]);
      if (imported.display_name) user.display_name = String(imported.display_name).slice(0, 32);
      if (imported.avatar_id) user.avatar_id = String(imported.avatar_id);
      if (imported.theme_color) user.theme_color = String(imported.theme_color);
      if (imported.specialty) user.specialty = String(imported.specialty);
      if (imported.motto) user.motto = String(imported.motto);
      if (typeof imported.xp === "number") user.xp = Math.max(user.xp, imported.xp);
      if (imported.solved_cases && typeof imported.solved_cases === "object") {
        user.solved_cases = { ...user.solved_cases, ...imported.solved_cases };
      }
      if (Array.isArray(imported.badges)) {
        user.badges = Array.from(new Set([...user.badges, ...imported.badges]));
      }
      const updated = ensureUserCareerFields(user);
      await sb.from("users").update({
        display_name: updated.display_name,
        avatar_id: updated.avatar_id,
        theme_color: updated.theme_color,
        specialty: updated.specialty,
        motto: updated.motto,
        xp: updated.xp,
        solved_cases: updated.solved_cases,
        badges: updated.badges,
        updated_at: new Date().toISOString(),
      }).eq("id", updated.id);
      return jsonResp(200, { user: updated });
    }

    // 2. Link Account
    if (pathname === "/api/auth/link" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { data: rows } = await sb.from("users").select("*").eq("id", body.user_id).limit(1);
      if (!rows || rows.length === 0) return jsonResp(404, { error: "Kullanıcı bulunamadı." });
      const provider = body.provider || "GOOGLE";
      await sb.from("users").update({ linked_provider: provider, updated_at: new Date().toISOString() }).eq("id", body.user_id);
      return jsonResp(200, { user: ensureUserCareerFields({ ...rows[0], linked_provider: provider }) });
    }

    // 3. Delete Account
    if (pathname === "/api/auth/delete" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.user_id) {
        await sb.from("users").delete().eq("id", body.user_id);
      }
      return jsonResp(200, { deleted: true });
    }

    // 4. Get Cases, Store Packs & User Career
    if (pathname === "/api/cases" && req.method === "GET") {
      const userId = url.searchParams.get("user_id") || "";
      const [casesRes, packsRes, userRes, entRes] = await Promise.all([
        sb.from("cases").select("*").order("case_id", { ascending: true }),
        sb.from("case_packs").select("*").order("price_tier", { ascending: true }),
        userId ? sb.from("users").select("*").eq("id", userId).limit(1) : Promise.resolve({ data: [] }),
        userId ? sb.from("user_entitlements").select("*").eq("user_id", userId) : Promise.resolve({ data: [] }),
      ]);

      const user = userRes.data && userRes.data[0] ? ensureUserCareerFields(userRes.data[0]) : null;
      const entitlements = entRes.data || [];
      const solvedMap = user?.solved_cases || {};

      const hasPack = (packId: string) => {
        if (!packId || packId === "pack_starter") return true;
        if (user?.subscription_active) return true;
        return entitlements.some((e: any) => e.pack_id === packId);
      };

      const list = (casesRes.data || []).map((row: any) => {
        const c = row.payload || {};
        return {
          case_id: row.case_id,
          pack_id: row.pack_id || "pack_starter",
          version: row.version,
          content_hash: (row.content_hash || "").slice(0, 16),
          meta: c.meta,
          briefing: c.briefing,
          suspect_count: (c.suspects || []).length,
          node_count: (c.nodes || []).length,
          edge_count: (c.edges || []).length,
          is_unlocked: hasPack(row.pack_id || "pack_starter"),
          solved_info: solvedMap[row.case_id] || null,
        };
      });

      return jsonResp(200, {
        cases: list,
        packs: packsRes.data || [],
        user,
        badge_catalog: BADGE_CATALOG,
        directive_catalog: DIRECTIVE_CATALOG,
        entitlements,
        subscription_active: Boolean(user?.subscription_active),
      });
    }

    // 5. Purchase DLC Pack
    if (pathname === "/api/store/purchase" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { user_id, pack_id, is_subscription } = body;
      const { data: rows } = await sb.from("users").select("*").eq("id", user_id).limit(1);
      if (!rows || rows.length === 0) return jsonResp(404, { error: "Kullanıcı bulunamadı." });

      const user = ensureUserCareerFields(rows[0]);
      if (is_subscription) {
        user.subscription_active = true;
        await sb.from("users").update({ subscription_active: true, updated_at: new Date().toISOString() }).eq("id", user_id);
        for (const pid of ["pack_starter", "pack_couples", "pack_criminal"]) {
          await sb.from("user_entitlements").upsert({
            user_id,
            pack_id: pid,
            transaction_id: `tx_sub_${crypto.randomUUID().slice(0, 8)}`,
            purchased_at: new Date().toISOString(),
          }, { onConflict: "user_id,pack_id" });
        }
      } else if (pack_id) {
        await sb.from("user_entitlements").upsert({
          user_id,
          pack_id,
          transaction_id: `tx_iap_${crypto.randomUUID().slice(0, 8)}`,
          purchased_at: new Date().toISOString(),
        }, { onConflict: "user_id,pack_id" });
      }

      const { data: entRows } = await sb.from("user_entitlements").select("*").eq("user_id", user_id);
      return jsonResp(200, {
        user,
        entitlements: entRows || [],
        subscription_active: Boolean(user.subscription_active),
      });
    }

    // 6. Match History
    if (pathname === "/api/history" && req.method === "GET") {
      const { data: histRows } = await sb.from("match_history").select("*").order("played_at", { ascending: false }).limit(60);
      return jsonResp(200, { history: histRows || [] });
    }

    return jsonResp(404, { error: "Endpoint bulunamadı.", path: pathname });
  } catch (err: any) {
    return jsonResp(500, { error: err?.message || "Sunucu hatası" });
  }
});
