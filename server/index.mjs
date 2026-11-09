import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { StorageAdapter } from './storageAdapter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CASES_DIR = path.join(ROOT_DIR, 'cases');
const DB_FILE = path.join(ROOT_DIR, 'database', 'db.json');
const SCHEMA_FILE = path.join(ROOT_DIR, 'database', 'schema.sql');
const BOOT_TIME = Date.now();

const ROOM_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const idx = crypto.randomInt(0, ROOM_ALPHABET.length);
    code += ROOM_ALPHABET[idx];
  }
  return code;
}

export function computeRankFromXp(xp = 0) {
  if (xp >= 2200) return { level: 5, title: 'Efsanevi Kriminalist', nextXp: 3500 };
  if (xp >= 1200) return { level: 4, title: 'Başkomiser', nextXp: 2200 };
  if (xp >= 600) return { level: 3, title: 'Kıdemli Müfettiş', nextXp: 1200 };
  if (xp >= 200) return { level: 2, title: 'Saha Dedektifi', nextXp: 600 };
  return { level: 1, title: 'Çaylak Memur', nextXp: 200 };
}

export const BADGE_CATALOG = {
  FIRST_SOLVE: { id: 'FIRST_SOLVE', title: 'İlk Tutuklama', desc: 'İlk vakanızı başarıyla çözdünüz.' },
  ZERO_MISTAKE: { id: 'ZERO_MISTAKE', title: 'Kusursuz Analiz', desc: 'Hiç hatalı bağlantı yapmadan vaka çözdünüz.' },
  HARDCORE_WIN: { id: 'HARDCORE_WIN', title: 'Başkomiser Mührü', desc: 'Başkomiser (Zor) modda tam isabetle vaka çözdünüz.' },
  SPEED_SOLVER: { id: 'SPEED_SOLVER', title: 'Yıldırım Soruşturma', desc: 'Bir vakayı 180 saniyenin altında aydınlattınız.' },
  MASTER_5: { id: 'MASTER_5', title: '5 Vaka Uzmanı', desc: '5 farklı cinayet dosyasını kapattınız.' },
  SEASON_CONQUEROR: { id: 'SEASON_CONQUEROR', title: 'Sezon Fatihi', desc: '12 veya daha fazla farklı vakayı çözdünüz.' },
  SOLO_MASTER: { id: 'SOLO_MASTER', title: 'Arşiv Efendisi', desc: 'Solo Arşiv modunda 3 vaka aydınlattınız.' },
  DUO_PARTNER: { id: 'DUO_PARTNER', title: 'Kusursuz İkili', desc: '2 kişilik Duo modunda vaka çözdünüz.' },
  MOLE_HUNTER: { id: 'MOLE_HUNTER', title: 'Köstebek Avcısı', desc: 'Kirli Polis (Grup) modunda haini alt ettiniz.' },
  LEGEND_DETECTIVE: { id: 'LEGEND_DETECTIVE', title: 'Efsanevi Sicil', desc: '2200 XP barajını aşarak en üst rütbeye ulaştınız.' },
};

export const DIRECTIVE_CATALOG = [
  {
    id: 'DIR_SOLVE_3',
    title: 'Saha Mesaisi: 3 Farklı Vaka Çöz',
    reward_xp: 120,
    target: 3,
    metric: 'solved_count',
  },
  {
    id: 'DIR_CONNECTIONS_8',
    title: 'Kırmızı İp Ustası: Toplam 8 Doğru Bağlantı Kur',
    reward_xp: 100,
    target: 8,
    metric: 'total_connections',
  },
  {
    id: 'DIR_STREAK_2',
    title: 'Kesintisiz Takip: Üst Üste 2 Vaka Kazan',
    reward_xp: 150,
    target: 2,
    metric: 'best_streak',
  },
  {
    id: 'DIR_EXPERT_SOLVE',
    title: 'Ağır Ceza: Zor (Başkomiser) Modda 1 Vaka Kapat',
    reward_xp: 180,
    target: 1,
    metric: 'hardcore_solved',
  },
];

const DEFAULT_PACKS = [
  {
    pack_id: 'pack_starter',
    title: 'Başlangıç Dosyaları (Ücretsiz Paket)',
    subtitle: 'Eğitim + 5 Temel Saha Vakası (Doğu Ekspresi, Nöbetçi Eczane, Loca 402, Gece İhalesi)',
    price_tier: 0,
    price_label: 'ÜCRETSİZ',
    badge: 'AÇIK ERİŞİM',
    is_active: true,
  },
  {
    pack_id: 'pack_couples',
    title: 'Çiftlere Özel Paket (Duo Serisi)',
    subtitle: '5 Yüksek Gerilimli Vaka (Kulis 7, Çatı Katı, Kapadokya, Antika Saatçi, Şarap Mahzeni)',
    price_tier: 1,
    price_label: '₺89,99',
    badge: '5 VAKALIK DLC',
    is_active: true,
  },
  {
    pack_id: 'pack_criminal',
    title: 'Zorlu Kriminal Paket (Uzman Serisi)',
    subtitle: '5 Çok Katmanlı Uzman Vakası (Ameliyathane 3, Vaka 404, Kripto Limanı, Borsa Kulesi, 24. Sokak)',
    price_tier: 2,
    price_label: '₺119,99',
    badge: 'UZMAN SEVİYE',
    is_active: true,
  },
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

function ensureUserCareerFields(user) {
  if (typeof user.xp !== 'number') user.xp = 0;
  const rk = computeRankFromXp(user.xp);
  user.rank_level = rk.level;
  user.rank_title = rk.title;
  user.next_rank_xp = rk.nextXp;
  if (!user.avatar_id) user.avatar_id = 'raven';
  if (!user.theme_color) user.theme_color = 'crimson';
  if (!user.specialty) user.specialty = 'Kriminal Analist';
  if (!user.motto) user.motto = 'Her yalan ardında bir iz bırakır.';
  if (!user.badge_code) {
    const hashNum = parseInt(crypto.createHash('md5').update(user.id || '0').digest('hex').slice(0, 4), 16) % 9000 + 1000;
    user.badge_code = `TR-EP-${hashNum}`;
  }
  if (!user.solved_cases || typeof user.solved_cases !== 'object') {
    user.solved_cases = {};
  }
  if (!Array.isArray(user.badges)) {
    user.badges = [];
  }
  if (!Array.isArray(user.claimed_directives)) {
    user.claimed_directives = [];
  }
  user.stats = {
    ...DEFAULT_STATS,
    ...(user.stats && typeof user.stats === 'object' ? user.stats : {}),
  };
  return user;
}

const storage = new StorageAdapter({
  dbFilePath: DB_FILE,
  schemaFilePath: SCHEMA_FILE,
  defaultPacks: DEFAULT_PACKS,
});

function loadAllCases() {
  const map = new Map();
  if (!fs.existsSync(CASES_DIR)) return map;
  const files = fs.readdirSync(CASES_DIR).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(CASES_DIR, file), 'utf-8');
      const data = JSON.parse(raw);
      const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
      map.set(data.case_id, {
        ...data,
        content_hash: hash,
      });
    } catch (err) {
      console.error(`Failed to load case ${file}:`, err);
    }
  }
  return map;
}

let casesMap = loadAllCases();

function userHasPackEntitlement(userId, packId) {
  if (!packId || packId === 'pack_starter') return true;
  const user = storage.mem.users[userId];
  if (user && user.subscription_active) return true;
  const list = storage.mem.user_entitlements[userId] || [];
  return list.some((e) => e.pack_id === packId);
}

function getDifficultyModifiers(preset = 'STANDARD', caseData) {
  const baseDuration = caseData?.meta?.duration_seconds || 900;
  const baseTokens = caseData?.meta?.solo_token_limit || 4;

  if (preset === 'EASY') {
    return {
      preset: 'EASY',
      label: 'AKADEMİ (KOLAY)',
      durationSec: Math.round(baseDuration * 1.35),
      soloTokens: baseTokens + 1,
      penaltySec: 15,
      cooldownMs: 2000,
      hideKeywordHints: false,
      strictTriadRequired: false,
      xpMultiplier: 0.85,
    };
  }
  if (preset === 'HARDCORE') {
    return {
      preset: 'HARDCORE',
      label: 'BAŞKOMİSER (UZMAN)',
      durationSec: Math.round(baseDuration * 0.75),
      soloTokens: baseTokens,
      penaltySec: 60,
      cooldownMs: 8000,
      hideKeywordHints: true,
      strictTriadRequired: true,
      xpMultiplier: 1.5,
    };
  }
  return {
    preset: 'STANDARD',
    label: 'SAHA DEDEKTİFİ (NORMAL)',
    durationSec: baseDuration,
    soloTokens: baseTokens,
    penaltySec: 30,
    cooldownMs: 5000,
    hideKeywordHints: false,
    strictTriadRequired: false,
    xpMultiplier: 1.0,
  };
}

const rooms = new Map();
const joinRateLimiter = new Map();

function checkJoinRateLimit(ip) {
  const now = Date.now();
  const entry = joinRateLimiter.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60000;
  }
  return entry.count < 5;
}

function recordFailedJoin(ip) {
  const now = Date.now();
  const entry = joinRateLimiter.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + 60000;
  } else {
    entry.count += 1;
  }
  joinRateLimiter.set(ip, entry);
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.created_at > 2 * 60 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 60000);

function pushRoomLog(room, type, text) {
  if (!room.activity_log) room.activity_log = [];
  room.activity_log.unshift({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    text,
    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  });
  if (room.activity_log.length > 25) {
    room.activity_log.length = 25;
  }
}

function sanitizeNodeForClient(node, isUnlocked = true, hideKeywordHints = false) {
  if (!isUnlocked) {
    return {
      node_id: node.node_id,
      template: node.template || 'OFFICIAL_REPORT',
      category: node.category || 'ARŞİV',
      title: node.title,
      file_no: node.file_no || `ARŞİV #${node.node_id}`,
      date: node.date || 'GİZLİ KAYIT',
      solo_cost: node.solo_cost ?? 1,
      unlocked: false,
      content: null,
      highlights: [],
    };
  }
  return {
    node_id: node.node_id,
    template: node.template || 'OFFICIAL_REPORT',
    category: node.category || 'BELGE',
    title: node.title,
    file_no: node.file_no || `DOSYA #${node.node_id}`,
    date: node.date || '14.10.2026',
    solo_cost: node.solo_cost ?? 1,
    unlocked: true,
    content: node.content,
    highlights: hideKeywordHints ? [] : node.highlights || [],
  };
}

function buildRoomSnapshotForPlayer(room, userId) {
  const caseData = casesMap.get(room.case_id);
  const player = room.players.get(userId);
  const mods = getDifficultyModifiers(room.difficulty_preset, caseData);

  let myNodes = [];
  if (room.status !== 'LOBBY' && caseData && player) {
    if (room.mode === 'SOLO') {
      myNodes = caseData.nodes.map((n) => {
        const isUnl = room.solo_unlocked_nodes.has(n.node_id);
        return sanitizeNodeForClient(n, isUnl, mods.hideKeywordHints);
      });
    } else {
      myNodes = (player.assigned_node_ids || [])
        .map((nid) => caseData.nodes.find((n) => n.node_id === nid))
        .filter(Boolean)
        .map((n) => sanitizeNodeForClient(n, true, mods.hideKeywordHints));
    }
  }

  let dirtyCopIntel = null;
  if (player && player.role === 'KİRLİ_POLİS' && caseData) {
    const killer = caseData.suspects.find((s) => s.id === caseData.solution.killer_id);
    const frameTarget = caseData.suspects.find(
      (s) => s.id === caseData.solution.dirty_cop_frame_target
    );
    dirtyCopIntel = {
      real_killer_id: caseData.solution.killer_id,
      real_killer_name: killer ? killer.name : 'Bilinmiyor',
      frame_target_id: caseData.solution.dirty_cop_frame_target,
      frame_target_name: frameTarget ? frameTarget.name : 'Masum Şüpheli',
      cover_node_ids: caseData.solution.dirty_cop_cover_nodes || [],
    };
  }

  const playersArray = Array.from(room.players.values()).map((p) => ({
    user_id: p.user_id,
    display_name: p.display_name,
    is_host: p.user_id === room.host_user_id,
    is_ready: p.is_ready,
    is_bot: Boolean(p.is_bot),
    connected: p.connected,
    connections_made: p.connections_made || 0,
    mistakes_made: p.mistakes_made || 0,
    has_voted: room.votes.has(p.user_id),
    pinned_count: p.pinned_count || 0,
    unpinned_count: Math.max(0, (p.assigned_node_ids?.length || 0) - (p.pinned_count || 0)),
  }));

  return {
    room_code: room.room_code,
    status: room.status,
    mode: room.mode,
    difficulty_preset: room.difficulty_preset || 'STANDARD',
    difficulty_label: mods.label,
    penalty_seconds_rule: mods.penaltySec,
    host_user_id: room.host_user_id,
    case_id: room.case_id,
    seq: room.seq,
    server_current_timestamp: Date.now(),
    match_start_timestamp: room.match_start_timestamp,
    match_end_timestamp: room.match_end_timestamp,
    solo_tokens: room.solo_tokens,
    solo_token_limit: mods.soloTokens,
    total_edges_count: caseData?.edges?.length || 0,
    case_meta: caseData
      ? {
          title: caseData.meta.title,
          subtitle: caseData.meta.subtitle || '',
          difficulty: caseData.meta.difficulty,
          duration_seconds: mods.durationSec,
          is_tutorial: Boolean(caseData.meta.is_tutorial),
        }
      : null,
    briefing: caseData?.briefing || null,
    suspects: caseData?.suspects || [],
    players: playersArray,
    my_role: player?.role || 'DEDEKTİF',
    dirty_cop_intel: dirtyCopIntel,
    my_nodes: myNodes,
    my_highlights: player ? Array.from(player.highlights || []) : [],
    board_nodes: Array.from(room.board_nodes.values()),
    verified_edges: Array.from(room.verified_edges.values()),
    activity_log: room.activity_log || [],
    my_vote: room.votes.get(userId) || null,
    cooldown_until: player?.cooldown_until || 0,
    endgame_result: room.endgame_result || null,
  };
}

function broadcastToRoom(room, eventName, extraData = {}) {
  room.seq += 1;
  const now = Date.now();
  for (const [uid, clientSet] of room.sockets.entries()) {
    const snapshot = buildRoomSnapshotForPlayer(room, uid);
    const payload = JSON.stringify({
      event: eventName,
      seq: room.seq,
      server_time: now,
      data: extraData,
      snapshot,
    });
    for (const ws of clientSet) {
      if (ws.readyState === 1) {
        ws.send(payload);
      }
    }
  }
}

function startMatchInRoom(room) {
  const caseData = casesMap.get(room.case_id);
  if (!caseData) return;

  const mods = getDifficultyModifiers(room.difficulty_preset, caseData);

  room.status = 'ACTIVE';
  const now = Date.now();
  room.match_start_timestamp = now;
  room.match_end_timestamp = now + mods.durationSec * 1000;
  room.board_nodes.clear();
  room.verified_edges.clear();
  room.votes.clear();
  room.activity_log = [];
  room.endgame_result = null;
  room.total_mistakes = 0;

  const playerIds = Array.from(room.players.keys());
  const playerCount = playerIds.length;

  if (room.mode === 'SOLO' || playerCount === 1) {
    room.mode = 'SOLO';
    room.solo_tokens = mods.soloTokens;
    room.solo_unlocked_nodes = new Set();
    for (const n of caseData.nodes) {
      if ((n.solo_cost ?? 1) === 0) {
        room.solo_unlocked_nodes.add(n.node_id);
      }
    }
    const p = room.players.get(playerIds[0]);
    if (p) {
      p.role = 'DEDEKTİF';
      p.assigned_node_ids = caseData.nodes.map((n) => n.node_id);
      p.pinned_count = 0;
      p.connections_made = 0;
      p.mistakes_made = 0;
    }
  } else {
    room.mode = playerCount >= 3 ? 'GROUP' : 'DUO';

    let dirtyCopIndex = -1;
    if (room.mode === 'GROUP') {
      dirtyCopIndex = crypto.randomInt(0, playerCount);
    }

    playerIds.forEach((uid, idx) => {
      const p = room.players.get(uid);
      p.role = idx === dirtyCopIndex ? 'KİRLİ_POLİS' : 'DEDEKTİF';
      p.assigned_node_ids = [];
      p.pinned_count = 0;
      p.connections_made = 0;
      p.mistakes_made = 0;
    });

    const group1Nodes = caseData.nodes.filter((n) => n.partition_group === 1);
    const group2Nodes = caseData.nodes.filter((n) => n.partition_group !== 1);

    if (playerCount === 2) {
      const p1 = room.players.get(playerIds[0]);
      const p2 = room.players.get(playerIds[1]);
      p1.assigned_node_ids = group1Nodes.map((n) => n.node_id);
      p2.assigned_node_ids = group2Nodes.map((n) => n.node_id);
    } else {
      const teamA = playerIds.filter((_, idx) => idx % 2 === 0);
      const teamB = playerIds.filter((_, idx) => idx % 2 === 1);

      group1Nodes.forEach((n, i) => {
        const targetUid = teamA[i % teamA.length];
        room.players.get(targetUid).assigned_node_ids.push(n.node_id);
      });
      group2Nodes.forEach((n, i) => {
        const targetUid = teamB[i % teamB.length];
        room.players.get(targetUid).assigned_node_ids.push(n.node_id);
      });

      for (const uid of playerIds) {
        const p = room.players.get(uid);
        if (p.assigned_node_ids.length < 2) {
          const donor = Array.from(room.players.values()).find(
            (other) => other.assigned_node_ids.length > 2
          );
          if (donor) {
            p.assigned_node_ids.push(donor.assigned_node_ids.pop());
          }
        }
      }
    }
  }

  pushRoomLog(room, 'START', `Soruşturma başlatıldı (${mods.label}).`);

  broadcastToRoom(room, 'MATCH_STARTED', {
    mode: room.mode,
    difficulty_preset: room.difficulty_preset,
    match_end_timestamp: room.match_end_timestamp,
  });

  scheduleBotActions(room);
}

function findFreeBoardPosition(room, preferredX, preferredY) {
  const existing = Array.from(room.board_nodes.values());
  let x = preferredX;
  let y = preferredY;

  for (let attempt = 0; attempt < 20; attempt++) {
    const collides = existing.some(
      (b) => Math.abs(b.x - x) < 152 && Math.abs(b.y - y) < 86
    );
    if (!collides) return { x, y };
    y += 108;
    if (y > 760) {
      y = 32;
      x += 182;
    }
  }
  return { x, y };
}

function placeNodeOnBoard(room, nodeObj, ownerName, customPos = null) {
  if (room.board_nodes.has(nodeObj.node_id)) {
    return room.board_nodes.get(nodeObj.node_id);
  }
  const index = room.board_nodes.size;
  const col = index % 2;
  const row = Math.floor(index / 2);
  const baseX = customPos ? customPos.x : 20 + col * 180;
  const baseY = customPos ? customPos.y : 26 + row * 116;

  const { x, y } = findFreeBoardPosition(room, baseX, baseY);

  const boardCard = {
    node_id: nodeObj.node_id,
    template: nodeObj.template || 'OFFICIAL_REPORT',
    category: nodeObj.category || 'KANIT',
    title: nodeObj.title,
    content: nodeObj.content,
    highlights: nodeObj.highlights || [],
    pinned_by: ownerName,
    is_inference: nodeObj.category === 'ÇIKARIM',
    x,
    y,
  };
  room.board_nodes.set(nodeObj.node_id, boardCard);
  return boardCard;
}

function scheduleBotActions(room) {
  const bots = Array.from(room.players.values()).filter((p) => p.is_bot);
  if (bots.length === 0) return;

  const caseData = casesMap.get(room.case_id);
  if (!caseData) return;

  setTimeout(() => {
    if (room.status !== 'ACTIVE') return;
    for (const bot of bots) {
      const unpinnedId = (bot.assigned_node_ids || []).find(
        (nid) => !room.board_nodes.has(nid)
      );
      if (unpinnedId) {
        const nodeObj = caseData.nodes.find((n) => n.node_id === unpinnedId);
        if (nodeObj) {
          bot.pinned_count = (bot.pinned_count || 0) + 1;
          const card = placeNodeOnBoard(room, nodeObj, bot.display_name);
          pushRoomLog(room, 'PIN', `${bot.display_name} '${card.title}' kanıtını iğneledi.`);
          broadcastToRoom(room, 'NODE_PINNED', {
            node: card,
            initiated_by: bot.display_name,
          });
        }
      }
    }
  }, 2200);
}

async function finalizeMatch(room, reason = 'VOTES_SEALED') {
  if (room.status === 'ENDED') return;
  room.status = 'ENDED';

  const caseData = casesMap.get(room.case_id);
  if (!caseData) return;
  const mods = getDifficultyModifiers(room.difficulty_preset, caseData);

  const now = Date.now();
  const durationSec = Math.max(
    1,
    Math.round((now - (room.match_start_timestamp || now)) / 1000)
  );

  const suspectVoteCounts = new Map();
  let bestEvidenceSet = [];

  for (const [, vote] of room.votes.entries()) {
    const c = (suspectVoteCounts.get(vote.suspect_id) || 0) + 1;
    suspectVoteCounts.set(vote.suspect_id, c);
    if (Array.isArray(vote.evidence_ids) && vote.evidence_ids.length > 0) {
      bestEvidenceSet = vote.evidence_ids;
    }
  }

  let chosenSuspectId = null;
  let maxVotes = -1;
  for (const [sid, count] of suspectVoteCounts.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      chosenSuspectId = sid;
    }
  }

  const solution = caseData.solution;
  const reqSet = new Set(solution.required_nodes || []);
  const altSet = new Set(solution.alternative_required_nodes || []);

  const matchedReq = bestEvidenceSet.filter((id) => reqSet.has(id)).length;
  const matchedAlt =
    altSet.size > 0 ? bestEvidenceSet.filter((id) => altSet.has(id)).length : 0;
  const matchedCount = Math.max(matchedReq, matchedAlt);

  const isSuspectCorrect = chosenSuspectId === solution.killer_id;
  const minRequiredMatches = mods.strictTriadRequired ? 3 : 2;
  const isSolved = isSuspectCorrect && matchedCount >= minRequiredMatches;
  const accuracyRate = Math.min(
    100,
    Math.round(((isSuspectCorrect ? 1 : 0) * 40 + (matchedCount / 3) * 60))
  );

  let leadDetective = 'Dedektif Ekibi';
  let leadUserId = null;
  let bestConn = -1;
  let dirtyCopPlayer = null;

  for (const p of room.players.values()) {
    if (p.role === 'KİRLİ_POLİS') {
      dirtyCopPlayer = p;
    }
    if ((p.connections_made || 0) > bestConn) {
      bestConn = p.connections_made || 0;
      leadDetective = p.display_name;
      leadUserId = p.user_id;
    }
  }

  const baseCaseXp = (caseData.meta.difficulty || 1) * 80;
  const earnedXp = isSolved
    ? Math.round(
        (baseCaseXp + (accuracyRate === 100 ? 40 : 0) + (room.total_mistakes === 0 ? 35 : 0)) *
          mods.xpMultiplier
      )
    : 20;

  const unlockedBadgeTitles = [];

  for (const p of room.players.values()) {
    if (p.is_bot) continue;
    const dbUser = storage.mem.users[p.user_id];
    if (!dbUser) continue;
    ensureUserCareerFields(dbUser);

    dbUser.xp += earnedXp;
    const rk = computeRankFromXp(dbUser.xp);
    dbUser.rank_level = rk.level;
    dbUser.rank_title = rk.title;
    dbUser.next_rank_xp = rk.nextXp;

    // Update detailed career stats
    dbUser.stats.matches_played += 1;
    dbUser.stats.total_connections += p.connections_made || 0;
    dbUser.stats.total_mistakes += p.mistakes_made || 0;
    if (p.user_id === leadUserId && (p.connections_made || 0) > 0) {
      dbUser.stats.lead_detective_count += 1;
    }
    if (p.role === 'KİRLİ_POLİS' && !isSolved) {
      dbUser.stats.dirty_cop_wins += 1;
    }

    if (isSolved) {
      dbUser.stats.matches_won += 1;
      dbUser.stats.win_streak += 1;
      dbUser.stats.best_streak = Math.max(dbUser.stats.best_streak, dbUser.stats.win_streak);
      if (!dbUser.stats.fastest_solve_sec || durationSec < dbUser.stats.fastest_solve_sec) {
        dbUser.stats.fastest_solve_sec = durationSec;
      }
      if (room.mode === 'SOLO') dbUser.stats.solo_wins += 1;
      if (room.mode === 'DUO') dbUser.stats.duo_wins += 1;
      if (room.mode === 'GROUP') dbUser.stats.group_wins += 1;

      const prevBest = dbUser.solved_cases[room.case_id]?.best_accuracy || 0;
      dbUser.solved_cases[room.case_id] = {
        solved_at: new Date().toISOString(),
        best_accuracy: Math.max(prevBest, accuracyRate),
        difficulty_preset: room.difficulty_preset,
      };

      const grantBadge = (badgeId) => {
        if (!dbUser.badges.includes(badgeId) && BADGE_CATALOG[badgeId]) {
          dbUser.badges.push(badgeId);
          unlockedBadgeTitles.push(BADGE_CATALOG[badgeId].title);
        }
      };

      const totalSolvedUnique = Object.keys(dbUser.solved_cases).length;
      grantBadge('FIRST_SOLVE');
      if ((room.total_mistakes || 0) === 0) grantBadge('ZERO_MISTAKE');
      if (room.difficulty_preset === 'HARDCORE' && accuracyRate === 100) grantBadge('HARDCORE_WIN');
      if (durationSec <= 180) grantBadge('SPEED_SOLVER');
      if (totalSolvedUnique >= 5) grantBadge('MASTER_5');
      if (totalSolvedUnique >= 12) grantBadge('SEASON_CONQUEROR');
      if (dbUser.stats.solo_wins >= 3) grantBadge('SOLO_MASTER');
      if (room.mode === 'DUO') grantBadge('DUO_PARTNER');
      if (room.mode === 'GROUP' && p.role === 'DEDEKTİF') grantBadge('MOLE_HUNTER');
      if (dbUser.xp >= 2200) grantBadge('LEGEND_DETECTIVE');
    } else {
      dbUser.stats.win_streak = 0;
    }

    await storage.upsertUser(dbUser);
  }

  const killerObj = caseData.suspects.find((s) => s.id === solution.killer_id);
  const arrestedObj = caseData.suspects.find((s) => s.id === chosenSuspectId);
  const dirtyCopWon = room.mode === 'GROUP' && !isSolved;

  room.endgame_result = {
    is_solved: isSolved,
    dirty_cop_won: dirtyCopWon,
    reason,
    difficulty_preset: room.difficulty_preset,
    difficulty_label: mods.label,
    duration_sec: durationSec,
    accuracy_rate: accuracyRate,
    xp_gained: earnedXp,
    new_badges: unlockedBadgeTitles,
    lead_detective: leadDetective,
    dirty_cop_name: dirtyCopPlayer ? dirtyCopPlayer.display_name : null,
    chosen_suspect_id: chosenSuspectId,
    chosen_suspect_name: arrestedObj ? arrestedObj.name : 'Seçilmedi',
    real_killer_id: solution.killer_id,
    real_killer_name: killerObj ? killerObj.name : 'Bilinmiyor',
    required_nodes: solution.required_nodes,
    submitted_evidence_ids: bestEvidenceSet,
    headline: isSolved ? solution.headline_success : solution.headline_failure,
    story_summary: solution.story_summary,
  };

  await storage.recordMatch({
    match_id: crypto.randomUUID(),
    case_id: room.case_id,
    case_title: caseData.meta.title,
    mode: room.mode,
    difficulty_preset: room.difficulty_preset,
    player_count: room.players.size,
    is_solved: isSolved,
    duration_sec: durationSec,
    accuracy_rate: accuracyRate,
    xp_gained: earnedXp,
    lead_detective: leadDetective,
    killer_name: killerObj ? killerObj.name : '',
    arrested_name: arrestedObj ? arrestedObj.name : 'Yok',
    played_at: new Date().toISOString(),
  });

  broadcastToRoom(room, 'MATCH_ENDED', room.endgame_result);
}

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status === 'ACTIVE' && room.match_end_timestamp && now >= room.match_end_timestamp) {
      room.status = 'VOTING';
      pushRoomLog(room, 'TIMER', 'Soruşturma süresi doldu! Son oylama aşamasına geçildi.');
      broadcastToRoom(room, 'TIMER_EXPIRED', {
        message: 'Süre doldu! Son kararınızı mühürleyin.',
      });
    }
  }
}, 1000);

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // 0. Health Check (For Railway / Render / Docker / Mobile Ping)
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'eksik-parca-server',
      version: '2.0.0',
      storage: storage.mode,
      cases_loaded: casesMap.size,
      active_rooms: rooms.size,
      uptime_sec: Math.round((Date.now() - BOOT_TIME) / 1000),
      server_time: Date.now(),
    });
  }

  // 1. Guest Profile Login & Career Stats
  if (pathname === '/api/auth/guest' && req.method === 'POST') {
    const body = await parseBody(req);
    const deviceId = body.device_id || `dev_${crypto.randomUUID()}`;
    const displayName = (body.display_name || '').trim() || 'Dedektif K.';

    let existingUser = Object.values(storage.mem.users).find((u) => u.device_id === deviceId);
    if (!existingUser) {
      existingUser = ensureUserCareerFields({
        id: crypto.randomUUID(),
        device_id: deviceId,
        display_name: displayName,
        linked_provider: null,
        subscription_active: false,
        avatar_id: 'raven',
        theme_color: 'crimson',
        specialty: 'Kriminal Analist',
        motto: 'Her yalan ardında bir iz bırakır.',
        xp: 0,
        solved_cases: {},
        badges: [],
        claimed_directives: [],
        stats: { ...DEFAULT_STATS },
        created_at: new Date().toISOString(),
      });
      await storage.upsertUser(existingUser);
      await storage.addEntitlement({
        user_id: existingUser.id,
        pack_id: 'pack_starter',
        transaction_id: `tx_free_${existingUser.id.slice(0, 8)}`,
        purchased_at: new Date().toISOString(),
      });
    } else {
      ensureUserCareerFields(existingUser);
      if (body.display_name) {
        existingUser.display_name = displayName;
        await storage.upsertUser(existingUser);
      }
    }

    return sendJson(res, 200, {
      user: existingUser,
      badge_catalog: Object.values(BADGE_CATALOG),
      directive_catalog: DIRECTIVE_CATALOG,
      entitlements: storage.mem.user_entitlements[existingUser.id] || [],
    });
  }

  // 1B. Update Rich Detective Profile (Avatar, Theme, Specialty, Motto, Name)
  if (pathname === '/api/profile/update' && req.method === 'POST') {
    const body = await parseBody(req);
    const user = storage.mem.users[body.user_id];
    if (!user) return sendJson(res, 404, { error: 'Kullanıcı bulunamadı.' });
    ensureUserCareerFields(user);

    if (typeof body.display_name === 'string' && body.display_name.trim()) {
      user.display_name = body.display_name.trim().slice(0, 32);
    }
    if (typeof body.avatar_id === 'string') user.avatar_id = body.avatar_id.slice(0, 24);
    if (typeof body.theme_color === 'string') user.theme_color = body.theme_color.slice(0, 24);
    if (typeof body.specialty === 'string') user.specialty = body.specialty.slice(0, 48);
    if (typeof body.motto === 'string') user.motto = body.motto.slice(0, 120);

    await storage.upsertUser(user);
    return sendJson(res, 200, { user });
  }

  // 1C. Claim Career Directive Reward XP
  if (pathname === '/api/profile/claim-directive' && req.method === 'POST') {
    const body = await parseBody(req);
    const user = storage.mem.users[body.user_id];
    const dir = DIRECTIVE_CATALOG.find((d) => d.id === body.directive_id);
    if (!user || !dir) return sendJson(res, 404, { error: 'Görev bulunamadı.' });
    ensureUserCareerFields(user);

    if (user.claimed_directives.includes(dir.id)) {
      return sendJson(res, 400, { error: 'Bu görev ödülü zaten alındı.' });
    }

    user.claimed_directives.push(dir.id);
    user.xp += dir.reward_xp;
    const rk = computeRankFromXp(user.xp);
    user.rank_level = rk.level;
    user.rank_title = rk.title;
    user.next_rank_xp = rk.nextXp;
    if (user.xp >= 2200 && !user.badges.includes('LEGEND_DETECTIVE')) {
      user.badges.push('LEGEND_DETECTIVE');
    }

    await storage.upsertUser(user);
    return sendJson(res, 200, { user, reward_xp: dir.reward_xp });
  }

  // 1D. Import Profile Backup Code
  if (pathname === '/api/profile/import' && req.method === 'POST') {
    const body = await parseBody(req);
    const user = storage.mem.users[body.user_id];
    const imported = body.backup_data;
    if (!user || !imported || typeof imported !== 'object') {
      return sendJson(res, 400, { error: 'Geçersiz yedek verisi.' });
    }
    ensureUserCareerFields(user);

    if (imported.display_name) user.display_name = String(imported.display_name).slice(0, 32);
    if (imported.avatar_id) user.avatar_id = String(imported.avatar_id);
    if (imported.theme_color) user.theme_color = String(imported.theme_color);
    if (imported.specialty) user.specialty = String(imported.specialty);
    if (imported.motto) user.motto = String(imported.motto);
    if (typeof imported.xp === 'number') user.xp = Math.max(user.xp, imported.xp);
    if (imported.solved_cases && typeof imported.solved_cases === 'object') {
      user.solved_cases = { ...user.solved_cases, ...imported.solved_cases };
    }
    if (Array.isArray(imported.badges)) {
      user.badges = Array.from(new Set([...user.badges, ...imported.badges]));
    }
    ensureUserCareerFields(user);
    await storage.upsertUser(user);
    return sendJson(res, 200, { user });
  }

  // 2. Link Account
  if (pathname === '/api/auth/link' && req.method === 'POST') {
    const body = await parseBody(req);
    const user = storage.mem.users[body.user_id];
    if (!user) return sendJson(res, 404, { error: 'Kullanıcı bulunamadı.' });
    user.linked_provider = body.provider || 'GOOGLE';
    await storage.upsertUser(user);
    return sendJson(res, 200, { user: ensureUserCareerFields(user) });
  }

  // 3. Delete Account
  if (pathname === '/api/auth/delete' && req.method === 'POST') {
    const body = await parseBody(req);
    if (body.user_id && storage.mem.users[body.user_id]) {
      await storage.deleteUser(body.user_id);
    }
    return sendJson(res, 200, { deleted: true });
  }

  // 4. Get Cases, Store Packs & User Career Progress
  if (pathname === '/api/cases' && req.method === 'GET') {
    casesMap = loadAllCases();
    const userId = url.searchParams.get('user_id') || '';
    const user = storage.mem.users[userId]
      ? ensureUserCareerFields(storage.mem.users[userId])
      : null;
    const solvedMap = user?.solved_cases || {};

    const list = Array.from(casesMap.values()).map((c) => ({
      case_id: c.case_id,
      pack_id: c.pack_id || 'pack_starter',
      version: c.version,
      content_hash: c.content_hash,
      meta: c.meta,
      briefing: c.briefing,
      suspect_count: (c.suspects || []).length,
      node_count: (c.nodes || []).length,
      edge_count: (c.edges || []).length,
      is_unlocked: userHasPackEntitlement(userId, c.pack_id || 'pack_starter'),
      solved_info: solvedMap[c.case_id] || null,
    }));

    return sendJson(res, 200, {
      cases: list,
      packs: DEFAULT_PACKS,
      user,
      badge_catalog: Object.values(BADGE_CATALOG),
      directive_catalog: DIRECTIVE_CATALOG,
      entitlements: storage.mem.user_entitlements[userId] || [],
      subscription_active: Boolean(user?.subscription_active),
    });
  }

  // 5. Purchase DLC Pack or Full Subscription
  if (pathname === '/api/store/purchase' && req.method === 'POST') {
    const body = await parseBody(req);
    const { user_id, pack_id, is_subscription } = body;
    const user = storage.mem.users[user_id];
    if (!user) return sendJson(res, 404, { error: 'Kullanıcı bulunamadı.' });

    if (is_subscription) {
      user.subscription_active = true;
      await storage.upsertUser(user);
      for (const pack of DEFAULT_PACKS) {
        await storage.addEntitlement({
          user_id,
          pack_id: pack.pack_id,
          transaction_id: `tx_sub_${crypto.randomUUID().slice(0, 8)}`,
          purchased_at: new Date().toISOString(),
        });
      }
    } else if (pack_id) {
      await storage.addEntitlement({
        user_id,
        pack_id,
        transaction_id: `tx_iap_${crypto.randomUUID().slice(0, 8)}`,
        purchased_at: new Date().toISOString(),
      });
    }
    return sendJson(res, 200, {
      user: ensureUserCareerFields(user),
      entitlements: storage.mem.user_entitlements[user_id] || [],
      subscription_active: Boolean(user.subscription_active),
    });
  }

  // 6. Match History
  if (pathname === '/api/history' && req.method === 'GET') {
    return sendJson(res, 200, {
      history: storage.mem.match_history,
    });
  }

  // 7. Create Room
  if (pathname === '/api/rooms/create' && req.method === 'POST') {
    const body = await parseBody(req);
    const { user_id, display_name, case_id, mode, difficulty_preset } = body;
    const caseData = casesMap.get(case_id);
    if (!caseData) {
      return sendJson(res, 404, { error: 'Seçilen vaka bulunamadı.' });
    }

    if (!userHasPackEntitlement(user_id, caseData.pack_id || 'pack_starter')) {
      return sendJson(res, 403, {
        error: 'Bu vakayı başlatmak için Oda Sahibinin ilgili Vaka Paketine sahip olması gerekir.',
      });
    }

    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const chosenPreset = ['EASY', 'STANDARD', 'HARDCORE'].includes(difficulty_preset)
      ? difficulty_preset
      : 'STANDARD';
    const mods = getDifficultyModifiers(chosenPreset, caseData);

    const room = {
      room_code: roomCode,
      created_at: Date.now(),
      status: 'LOBBY',
      mode: mode || 'DUO',
      difficulty_preset: chosenPreset,
      host_user_id: user_id,
      case_id,
      seq: 1,
      match_start_timestamp: null,
      match_end_timestamp: null,
      solo_tokens: mods.soloTokens,
      solo_unlocked_nodes: new Set(),
      total_mistakes: 0,
      players: new Map(),
      sockets: new Map(),
      board_nodes: new Map(),
      verified_edges: new Map(),
      votes: new Map(),
      activity_log: [],
      endgame_result: null,
    };

    room.players.set(user_id, {
      user_id,
      display_name: display_name || 'Baş Dedektif',
      is_ready: true,
      is_bot: false,
      connected: true,
      role: 'DEDEKTİF',
      assigned_node_ids: [],
      highlights: new Set(),
      connections_made: 0,
      mistakes_made: 0,
      pinned_count: 0,
      cooldown_until: 0,
    });

    rooms.set(roomCode, room);

    if (mode === 'SOLO') {
      startMatchInRoom(room);
    }

    return sendJson(res, 200, {
      room_code: roomCode,
      snapshot: buildRoomSnapshotForPlayer(room, user_id),
    });
  }

  // 8. Join Room
  if (pathname === '/api/rooms/join' && req.method === 'POST') {
    const ip = req.socket.remoteAddress || 'local';
    if (!checkJoinRateLimit(ip)) {
      return sendJson(res, 429, {
        error: 'Çok fazla başarısız oda denemesi yaptınız. Lütfen 1 dakika bekleyin.',
      });
    }

    const body = await parseBody(req);
    const rawCode = (body.room_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const room = rooms.get(rawCode);
    if (!room) {
      recordFailedJoin(ip);
      return sendJson(res, 404, {
        error: 'Oda bulunamadı. 6 haneli oda kodunu kontrol edin.',
      });
    }

    const userId = body.user_id;
    const displayName = body.display_name || 'Dedektif';

    if (!room.players.has(userId)) {
      if (room.players.size >= 6) {
        return sendJson(res, 400, { error: 'Oda maksimum oyuncu kapasitesine (6 kişi) ulaştı.' });
      }
      room.players.set(userId, {
        user_id: userId,
        display_name: displayName,
        is_ready: true,
        is_bot: false,
        connected: true,
        role: 'DEDEKTİF',
        assigned_node_ids: [],
        highlights: new Set(),
        connections_made: 0,
        mistakes_made: 0,
        pinned_count: 0,
        cooldown_until: 0,
      });

      if (room.status === 'ACTIVE') {
        const caseData = casesMap.get(room.case_id);
        if (caseData) {
          const group2Nodes = caseData.nodes.filter((n) => n.partition_group !== 1);
          room.players.get(userId).assigned_node_ids = group2Nodes.map((n) => n.node_id);
        }
      }
    } else {
      room.players.get(userId).connected = true;
      room.players.get(userId).display_name = displayName;
    }

    pushRoomLog(room, 'JOIN', `${displayName} soruşturma masasına katıldı.`);
    broadcastToRoom(room, 'PLAYER_JOINED', {
      user_id: userId,
      display_name: displayName,
    });

    return sendJson(res, 200, {
      room_code: room.room_code,
      snapshot: buildRoomSnapshotForPlayer(room, userId),
    });
  }

  // Static production build serving
  const distDir = path.join(ROOT_DIR, 'dist');
  if (req.method === 'GET' && !pathname.startsWith('/api') && fs.existsSync(distDir)) {
    const safePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const fullPath = path.join(distDir, safePath);
    const targetFile =
      fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()
        ? fullPath
        : path.join(distDir, 'index.html');

    if (fs.existsSync(targetFile)) {
      const ext = path.extname(targetFile).toLowerCase();
      const mimeMap = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.webmanifest': 'application/manifest+json; charset=utf-8',
        '.svg': 'image/svg+xml',
      };
      res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
      res.end(fs.readFileSync(targetFile));
      return;
    }
  }

  sendJson(res, 404, { error: 'Uç nokta bulunamadı.' });
});

// WebSocket Server with 25s Cloud Proxy Heartbeat
const wss = new WebSocketServer({ server, path: '/ws' });

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  let boundRoomCode = null;
  let boundUserId = null;

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const { event, data } = msg;

    if (event === 'JOIN_SOCKET') {
      const roomCode = (data?.room_code || '').toUpperCase();
      const userId = data?.user_id;
      const room = rooms.get(roomCode);
      if (!room || !userId) {
        ws.send(JSON.stringify({ event: 'ERROR', data: { message: 'Oda oturumu bulunamadı.' } }));
        return;
      }

      boundRoomCode = roomCode;
      boundUserId = userId;

      if (!room.sockets.has(userId)) {
        room.sockets.set(userId, new Set());
      }
      room.sockets.get(userId).add(ws);

      const player = room.players.get(userId);
      if (player) {
        player.connected = true;
      }

      ws.send(
        JSON.stringify({
          event: 'STATE_SNAPSHOT',
          seq: room.seq,
          server_time: Date.now(),
          snapshot: buildRoomSnapshotForPlayer(room, userId),
        })
      );
      broadcastToRoom(room, 'PRESENCE_UPDATED', { user_id: userId, connected: true });
      return;
    }

    if (!boundRoomCode || !boundUserId) return;
    const room = rooms.get(boundRoomCode);
    if (!room) return;
    const player = room.players.get(boundUserId);
    const caseData = casesMap.get(room.case_id);
    if (!player || !caseData) return;

    if (event === 'TOGGLE_READY') {
      player.is_ready = !player.is_ready;
      broadcastToRoom(room, 'READY_UPDATED', {
        user_id: boundUserId,
        is_ready: player.is_ready,
      });
      return;
    }

    if (event === 'SET_DIFFICULTY_PRESET') {
      if (room.host_user_id !== boundUserId || room.status !== 'LOBBY') return;
      const nextPreset = data?.difficulty_preset;
      if (['EASY', 'STANDARD', 'HARDCORE'].includes(nextPreset)) {
        room.difficulty_preset = nextPreset;
        broadcastToRoom(room, 'DIFFICULTY_UPDATED', { difficulty_preset: nextPreset });
      }
      return;
    }

    if (event === 'ADD_BOT_PLAYER') {
      if (room.players.size >= 6) return;
      const botNames = [
        'Dedektif Tuna (AI)',
        'Komiser Mercan (AI)',
        'Müfettiş Poyraz (AI)',
        'Kriminal Ece (AI)',
        'Analist Barış (AI)',
      ];
      const botIndex = room.players.size - 1;
      const botId = `bot_${crypto.randomUUID().slice(0, 6)}`;
      const botName = botNames[botIndex % botNames.length];

      room.players.set(botId, {
        user_id: botId,
        display_name: botName,
        is_ready: true,
        is_bot: true,
        connected: true,
        role: 'DEDEKTİF',
        assigned_node_ids: [],
        highlights: new Set(),
        connections_made: 0,
        mistakes_made: 0,
        pinned_count: 0,
        cooldown_until: 0,
      });

      if (room.players.size >= 3) {
        room.mode = 'GROUP';
      } else if (room.players.size === 2) {
        room.mode = 'DUO';
      }

      broadcastToRoom(room, 'BOT_ADDED', { bot_id: botId, display_name: botName });
      return;
    }

    if (event === 'START_MATCH') {
      if (room.host_user_id !== boundUserId) return;
      startMatchInRoom(room);
      return;
    }

    if (event === 'UNLOCK_ARCHIVE_NODE') {
      const nodeId = data?.node_id;
      const nodeObj = caseData.nodes.find((n) => n.node_id === nodeId);
      if (!nodeObj) return;
      if (room.solo_unlocked_nodes.has(nodeId)) return;

      const cost = nodeObj.solo_cost ?? 1;
      if (room.solo_tokens < cost) {
        ws.send(
          JSON.stringify({
            event: 'ARCHIVE_TOKEN_EMPTY',
            data: { message: 'Arşiv Sorgu Hakkınız (Jeton) kalmadı!' },
          })
        );
        return;
      }

      room.solo_tokens -= cost;
      room.solo_unlocked_nodes.add(nodeId);
      pushRoomLog(room, 'ARCHIVE', `Merkez Arşivden '${nodeObj.title}' dosyasının kilidi açıldı.`);
      broadcastToRoom(room, 'ARCHIVE_NODE_UNLOCKED', {
        node_id: nodeId,
        remaining_tokens: room.solo_tokens,
      });
      return;
    }

    if (event === 'REWARD_EXTRA_TOKEN') {
      room.solo_tokens += 1;
      pushRoomLog(room, 'ARCHIVE', '+1 Ekstra Arşiv Sorgu Jetonu tanımlandı.');
      broadcastToRoom(room, 'EXTRA_TOKEN_GRANTED', {
        remaining_tokens: room.solo_tokens,
      });
      return;
    }

    if (event === 'TOGGLE_HIGHLIGHT') {
      const key = `${data?.node_id}::${data?.keyword}`;
      if (player.highlights.has(key)) {
        player.highlights.delete(key);
      } else {
        player.highlights.add(key);
      }
      broadcastToRoom(room, 'HIGHLIGHT_UPDATED', { key });
      return;
    }

    if (event === 'PIN_NODE') {
      const nodeId = data?.node_id;
      const nodeObj = caseData.nodes.find((n) => n.node_id === nodeId);
      if (!nodeObj) return;
      if (room.mode === 'SOLO' && !room.solo_unlocked_nodes.has(nodeId)) return;

      if (!room.board_nodes.has(nodeId)) {
        player.pinned_count = (player.pinned_count || 0) + 1;
        pushRoomLog(room, 'PIN', `${player.display_name} tahtaya '${nodeObj.title}' belgesini iğneledi.`);
      }
      const card = placeNodeOnBoard(room, nodeObj, player.display_name);
      broadcastToRoom(room, 'NODE_PINNED', {
        node: card,
        initiated_by: player.display_name,
      });
      return;
    }

    if (event === 'REQUEST_PARTNER_PIN') {
      for (const p of room.players.values()) {
        if (p.user_id !== boundUserId) {
          const nextId = (p.assigned_node_ids || []).find((nid) => !room.board_nodes.has(nid));
          if (nextId) {
            const nodeObj = caseData.nodes.find((n) => n.node_id === nextId);
            if (nodeObj) {
              p.pinned_count = (p.pinned_count || 0) + 1;
              const card = placeNodeOnBoard(room, nodeObj, p.display_name);
              pushRoomLog(room, 'PIN', `${p.display_name} tahtaya '${card.title}' belgesini iğneledi.`);
              broadcastToRoom(room, 'NODE_PINNED', {
                node: card,
                initiated_by: p.display_name,
              });
              return;
            }
          }
        }
      }
      return;
    }

    if (event === 'REQUEST_BOARD_HINT') {
      const unverifiedEdge = (caseData.edges || []).find(
        (e) => !room.verified_edges.has(e.edge_id)
      );
      if (!unverifiedEdge) {
        ws.send(
          JSON.stringify({
            event: 'BOARD_HINT',
            data: { message: 'Tüm çıkarım bağlantıları açıldı! Artık 4. TUTUKLA sekmesine geçebilirsiniz.' },
          })
        );
        return;
      }

      const srcOnBoard = room.board_nodes.has(unverifiedEdge.source_node);
      const tgtOnBoard = room.board_nodes.has(unverifiedEdge.target_node);
      let hintMsg = '';
      if (srcOnBoard && tgtOnBoard) {
        hintMsg = `💡 İpucu: Tahtadaki #${unverifiedEdge.source_node} ile #${unverifiedEdge.target_node} belgeleri arasında kritik bir bağ var!`;
      } else if (!srcOnBoard) {
        hintMsg = `💡 İpucu: Önce #${unverifiedEdge.source_node} kodlu kanıtı açıp Ortak Tahtaya iğneleyin.`;
      } else {
        hintMsg = `💡 İpucu: #${unverifiedEdge.source_node} tahtada hazır; karşı eşleşmesi olan #${unverifiedEdge.target_node} belgesini tahtaya getirin.`;
      }

      ws.send(
        JSON.stringify({
          event: 'BOARD_HINT',
          data: {
            message: hintMsg,
            hint_node_id: srcOnBoard ? unverifiedEdge.source_node : unverifiedEdge.target_node,
          },
        })
      );
      return;
    }

    if (event === 'MOVE_BOARD_NODE') {
      const { node_id, x, y } = data || {};
      const existing = room.board_nodes.get(node_id);
      if (existing && typeof x === 'number' && typeof y === 'number') {
        existing.x = Math.max(8, Math.min(1400, Math.round(x)));
        existing.y = Math.max(8, Math.min(1200, Math.round(y)));
        broadcastToRoom(room, 'BOARD_NODE_MOVED', {
          node_id,
          x: existing.x,
          y: existing.y,
        });
      }
      return;
    }

    if (event === 'VERIFY_EDGE') {
      const now = Date.now();
      const mods = getDifficultyModifiers(room.difficulty_preset, caseData);

      if (player.cooldown_until && now < player.cooldown_until) {
        ws.send(
          JSON.stringify({
            event: 'COOLDOWN_ACTIVE',
            data: { remaining_ms: player.cooldown_until - now },
          })
        );
        return;
      }

      const { source_node, target_node } = data || {};
      if (!source_node || !target_node || source_node === target_node) return;

      const matchedEdge = (caseData.edges || []).find(
        (e) =>
          (e.source_node === source_node && e.target_node === target_node) ||
          (e.source_node === target_node && e.target_node === source_node)
      );

      if (matchedEdge) {
        if (!room.verified_edges.has(matchedEdge.edge_id)) {
          room.verified_edges.set(matchedEdge.edge_id, {
            edge_id: matchedEdge.edge_id,
            source_node: matchedEdge.source_node,
            target_node: matchedEdge.target_node,
            unlocked_node_id: matchedEdge.unlocked_node.node_id,
            initiated_by: player.display_name,
          });
          player.connections_made = (player.connections_made || 0) + 1;

          const srcCard = room.board_nodes.get(matchedEdge.source_node);
          const tgtCard = room.board_nodes.get(matchedEdge.target_node);
          const midX =
            srcCard && tgtCard ? Math.round((srcCard.x + tgtCard.x) / 2) : 110;
          const midY =
            srcCard && tgtCard ? Math.max(srcCard.y, tgtCard.y) + 112 : 220;

          const unlockedCard = placeNodeOnBoard(
            room,
            {
              ...matchedEdge.unlocked_node,
              category: 'ÇIKARIM',
              template: 'OFFICIAL_REPORT',
            },
            'SİSTEM ÇIKARIMI',
            { x: midX, y: midY }
          );

          pushRoomLog(
            room,
            'EDGE_OK',
            `🔗 ${player.display_name} yeni çıkarım açtı: ${unlockedCard.title}`
          );

          broadcastToRoom(room, 'EDGE_VERIFIED', {
            edge_id: matchedEdge.edge_id,
            initiated_by: player.display_name,
            newly_unlocked_node: unlockedCard,
          });
        }
      } else {
        room.total_mistakes = (room.total_mistakes || 0) + 1;
        player.mistakes_made = (player.mistakes_made || 0) + 1;

        if (room.match_end_timestamp) {
          room.match_end_timestamp = Math.max(
            now + 5000,
            room.match_end_timestamp - mods.penaltySec * 1000
          );
        }
        player.cooldown_until = now + mods.cooldownMs;

        pushRoomLog(
          room,
          'EDGE_FAIL',
          `⚠️ ${player.display_name} hatalı bağlantı denedi (-${mods.penaltySec} sn).`
        );

        broadcastToRoom(room, 'EDGE_REJECTED', {
          initiated_by: player.display_name,
          source_node,
          target_node,
          penalty_seconds: mods.penaltySec,
          cooldown_ms: mods.cooldownMs,
        });
      }
      return;
    }

    if (event === 'PING_ITEM') {
      const { target_type, target_id, label } = data || {};
      pushRoomLog(room, 'PING', `📡 ${player.display_name} vurguladı: ${label || target_id}`);
      broadcastToRoom(room, 'ITEM_PINGED', {
        initiated_by: player.display_name,
        target_type,
        target_id,
        label: label || target_id,
      });
      return;
    }

    if (event === 'CAST_VOTE') {
      const { suspect_id, evidence_ids } = data || {};
      if (!suspect_id || !Array.isArray(evidence_ids) || evidence_ids.length !== 3) {
        return;
      }

      room.votes.set(boundUserId, {
        user_id: boundUserId,
        display_name: player.display_name,
        suspect_id,
        evidence_ids,
        sealed_at: Date.now(),
      });

      pushRoomLog(room, 'VOTE', `⚖️ ${player.display_name} tutuklama kararını mühürledi.`);

      for (const p of room.players.values()) {
        if (p.is_bot && !room.votes.has(p.user_id)) {
          const botSuspect =
            p.role === 'KİRLİ_POLİS'
              ? caseData.solution.dirty_cop_frame_target || suspect_id
              : suspect_id;
          room.votes.set(p.user_id, {
            user_id: p.user_id,
            display_name: p.display_name,
            suspect_id: botSuspect,
            evidence_ids,
            sealed_at: Date.now(),
          });
        }
      }

      broadcastToRoom(room, 'VOTE_UPDATED', {
        user_id: boundUserId,
        display_name: player.display_name,
      });

      const allVoted = Array.from(room.players.values()).every(
        (p) => !p.connected || room.votes.has(p.user_id)
      );
      if (allVoted) {
        await finalizeMatch(room, 'ALL_SEALED');
      }
      return;
    }

    if (event === 'RETRY_MATCH') {
      startMatchInRoom(room);
      return;
    }
  });

  ws.on('close', () => {
    if (boundRoomCode && boundUserId) {
      const room = rooms.get(boundRoomCode);
      if (room) {
        const set = room.sockets.get(boundUserId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) {
            const p = room.players.get(boundUserId);
            if (p) p.connected = false;
            broadcastToRoom(room, 'PRESENCE_UPDATED', {
              user_id: boundUserId,
              connected: false,
            });
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
storage.init().then(() => {
  server.listen(PORT, () => {
    console.log(
      `[EKSİK PARÇA SUNUCUSU] http://localhost:${PORT} üzerinde aktif | Depolama: ${storage.mode}`
    );
  });
});
