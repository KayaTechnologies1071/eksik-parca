/**
 * EKSİK PARÇA — Dahili Mobil / Çevrimdışı Oyun Motoru (Standalone APK Engine)
 * Android APK cihazda internet veya bulut sunucusu olmadan açıldığında bile
 * tüm 16 vakanın Solo, Eğitim ve AI Partnerli Duo/Grup modlarında %100 çalışmasını sağlar.
 * Bulut sunucusu (Railway / Render / LAN) bağlandığında otomatik olarak canlı sunucuya devreder.
 */

import {
  BadgeDef,
  BoardNode,
  CasePack,
  CaseSummary,
  DifficultyPreset,
  DirectiveDef,
  GameMode,
  MatchHistoryItem,
  RoomSnapshot,
  UserProfile,
} from '../types/game';

interface RawCaseJson {
  case_id: string;
  pack_id: string;
  version: number;
  meta: CaseSummary['meta'];
  briefing: CaseSummary['briefing'];
  suspects: RoomSnapshot['suspects'];
  nodes: Array<{
    node_id: string;
    template: BoardNode['template'];
    category: string;
    title: string;
    file_no?: string;
    date?: string;
    partition_group?: number;
    solo_cost?: number;
    content: string;
    highlights?: string[];
  }>;
  edges: Array<{
    edge_id: string;
    source_node: string;
    target_node: string;
    unlocked_node: {
      node_id: string;
      template?: BoardNode['template'];
      category?: string;
      title: string;
      content: string;
      highlights?: string[];
    };
  }>;
  solution: {
    killer_id: string;
    required_nodes: string[];
    alternative_required_nodes?: string[];
    dirty_cop_frame_target?: string;
    dirty_cop_cover_nodes?: string[];
    headline_success: string;
    headline_failure: string;
    story_summary: string;
  };
}

const rawModules = import.meta.glob('../../cases/*.json', { eager: true }) as Record<
  string,
  { default?: RawCaseJson } & RawCaseJson
>;

const BUNDLED_CASES = new Map<string, RawCaseJson>();
Object.values(rawModules).forEach((mod) => {
  const c = (mod.default || mod) as RawCaseJson;
  if (c && c.case_id) {
    BUNDLED_CASES.set(c.case_id, c);
  }
});

export const OFFLINE_BADGES: BadgeDef[] = [
  { id: 'FIRST_SOLVE', title: 'İlk Tutuklama', desc: 'İlk vakanızı başarıyla çözdünüz.' },
  { id: 'ZERO_MISTAKE', title: 'Kusursuz Analiz', desc: 'Hiç hatalı bağlantı yapmadan vaka çözdünüz.' },
  { id: 'HARDCORE_WIN', title: 'Başkomiser Mührü', desc: 'Başkomiser (Zor) modda tam isabetle vaka çözdünüz.' },
  { id: 'SPEED_SOLVER', title: 'Yıldırım Soruşturma', desc: 'Bir vakayı 180 saniyenin altında aydınlattınız.' },
  { id: 'MASTER_5', title: '5 Vaka Uzmanı', desc: '5 farklı cinayet dosyasını kapattınız.' },
  { id: 'SEASON_CONQUEROR', title: 'Sezon Fatihi', desc: '12 veya daha fazla farklı vakayı çözdünüz.' },
  { id: 'SOLO_MASTER', title: 'Arşiv Efendisi', desc: 'Solo Arşiv modunda 3 vaka aydınlattınız.' },
  { id: 'DUO_PARTNER', title: 'Kusursuz İkili', desc: '2 kişilik Duo modunda vaka çözdünüz.' },
  { id: 'MOLE_HUNTER', title: 'Köstebek Avcısı', desc: 'Kirli Polis (Grup) modunda haini alt ettiniz.' },
  { id: 'LEGEND_DETECTIVE', title: 'Efsanevi Sicil', desc: '2200 XP barajını aşarak en üst rütbeye ulaştınız.' },
];

export const OFFLINE_DIRECTIVES: DirectiveDef[] = [
  { id: 'DIR_SOLVE_3', title: 'Saha Mesaisi: 3 Farklı Vaka Çöz', reward_xp: 120, target: 3, metric: 'solved_count' },
  { id: 'DIR_CONNECTIONS_8', title: 'Kırmızı İp Ustası: Toplam 8 Doğru Bağlantı Kur', reward_xp: 100, target: 8, metric: 'total_connections' },
  { id: 'DIR_STREAK_2', title: 'Kesintisiz Takip: Üst Üste 2 Vaka Kazan', reward_xp: 150, target: 2, metric: 'best_streak' },
  { id: 'DIR_EXPERT_SOLVE', title: 'Ağır Ceza: Zor (Başkomiser) Modda 1 Vaka Kapat', reward_xp: 180, target: 1, metric: 'hardcore_solved' },
];

export const OFFLINE_PACKS: CasePack[] = [
  {
    pack_id: 'pack_starter',
    title: 'Başlangıç Dosyaları (Ücretsiz Paket)',
    subtitle: 'Eğitim + 5 Temel Saha Vakası',
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

function computeRank(xp: number) {
  if (xp >= 2200) return { level: 5, title: 'Efsanevi Kriminalist', nextXp: 3500 };
  if (xp >= 1200) return { level: 4, title: 'Başkomiser', nextXp: 2200 };
  if (xp >= 600) return { level: 3, title: 'Kıdemli Müfettiş', nextXp: 1200 };
  if (xp >= 200) return { level: 2, title: 'Saha Dedektifi', nextXp: 600 };
  return { level: 1, title: 'Çaylak Memur', nextXp: 200 };
}

const STORAGE_USER_KEY = 'ep_offline_user_v2';
const STORAGE_PACKS_KEY = 'ep_offline_owned_packs_v2';
const STORAGE_HIST_KEY = 'ep_offline_history_v2';

class OfflineGameEngine {
  private activeRoom: {
    rawCase: RawCaseJson;
    snapshot: RoomSnapshot;
    unlockedSet: Set<string>;
    botNodes: string[];
    totalMistakes: number;
  } | null = null;

  public loadOrCreateUser(deviceId: string, customName?: string): UserProfile {
    let saved: UserProfile | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_USER_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {}

    if (!saved) {
      saved = {
        id: `local_${deviceId.slice(0, 10)}`,
        device_id: deviceId,
        display_name: customName || 'Dedektif K.',
        linked_provider: null,
        subscription_active: false,
        avatar_id: 'raven',
        theme_color: 'crimson',
        specialty: 'Kriminal Analist',
        motto: 'Her yalan ardında bir iz bırakır.',
        badge_code: `TR-EP-${Math.floor(1000 + Math.random() * 8999)}`,
        xp: 0,
        rank_level: 1,
        rank_title: 'Çaylak Memur',
        next_rank_xp: 200,
        solved_cases: {},
        badges: [],
        claimed_directives: [],
        stats: {
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
        },
        created_at: new Date().toISOString(),
      };
    } else if (customName) {
      saved.display_name = customName;
    }

    const rk = computeRank(saved.xp || 0);
    saved.rank_level = rk.level;
    saved.rank_title = rk.title;
    saved.next_rank_xp = rk.nextXp;
    this.saveUser(saved);
    return saved;
  }

  public saveUser(user: UserProfile) {
    const rk = computeRank(user.xp || 0);
    user.rank_level = rk.level;
    user.rank_title = rk.title;
    user.next_rank_xp = rk.nextXp;
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  }

  public getOwnedPacks(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_PACKS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return ['pack_starter'];
  }

  public addOwnedPack(packId: string) {
    const list = new Set(this.getOwnedPacks());
    list.add(packId);
    localStorage.setItem(STORAGE_PACKS_KEY, JSON.stringify(Array.from(list)));
  }

  public getHistory(): MatchHistoryItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_HIST_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  public getCaseSummaries(user: UserProfile): CaseSummary[] {
    const owned = new Set(this.getOwnedPacks());
    return Array.from(BUNDLED_CASES.values())
      .sort((a, b) => a.case_id.localeCompare(b.case_id))
      .map((c) => ({
        case_id: c.case_id,
        pack_id: c.pack_id || 'pack_starter',
        version: c.version || 1,
        content_hash: 'apk_bundled',
        meta: c.meta,
        briefing: c.briefing,
        suspect_count: c.suspects.length,
        node_count: c.nodes.length,
        edge_count: c.edges.length,
        is_unlocked: user.subscription_active || owned.has(c.pack_id || 'pack_starter'),
        solved_info: user.solved_cases[c.case_id] || null,
      }));
  }

  public createLocalRoom(
    user: UserProfile,
    caseId: string,
    mode: GameMode,
    preset: DifficultyPreset
  ): RoomSnapshot | null {
    const rawCase = BUNDLED_CASES.get(caseId);
    if (!rawCase) return null;

    const baseDur = rawCase.meta.duration_seconds || 900;
    const baseTokens = rawCase.meta.solo_token_limit || 4;
    const durSec =
      preset === 'EASY'
        ? Math.round(baseDur * 1.35)
        : preset === 'HARDCORE'
        ? Math.round(baseDur * 0.75)
        : baseDur;
    const soloTokens = preset === 'EASY' ? baseTokens + 1 : baseTokens;
    const penaltySec = preset === 'EASY' ? 15 : preset === 'HARDCORE' ? 60 : 30;
    const label =
      preset === 'EASY'
        ? 'AKADEMİ (KOLAY)'
        : preset === 'HARDCORE'
        ? 'BAŞKOMİSER (UZMAN)'
        : 'SAHA DEDEKTİFİ (NORMAL)';

    const unlockedSet = new Set<string>();
    for (const n of rawCase.nodes) {
      if ((n.solo_cost ?? 1) === 0) unlockedSet.add(n.node_id);
    }

    const hideHints = preset === 'HARDCORE';
    const isSolo = mode === 'SOLO';
    const myRawNodes = isSolo
      ? rawCase.nodes
      : rawCase.nodes.filter((n) => n.partition_group === 1);
    const botNodes = isSolo
      ? []
      : rawCase.nodes.filter((n) => n.partition_group !== 1).map((n) => n.node_id);

    const now = Date.now();
    const snapshot: RoomSnapshot = {
      room_code: 'APKMOD',
      status: isSolo ? 'ACTIVE' : 'LOBBY',
      mode,
      difficulty_preset: preset,
      difficulty_label: label,
      penalty_seconds_rule: penaltySec,
      host_user_id: user.id,
      case_id: caseId,
      seq: 1,
      server_current_timestamp: now,
      match_start_timestamp: isSolo ? now : null,
      match_end_timestamp: isSolo ? now + durSec * 1000 : null,
      solo_tokens: soloTokens,
      solo_token_limit: soloTokens,
      total_edges_count: rawCase.edges.length,
      case_meta: {
        title: rawCase.meta.title,
        subtitle: rawCase.meta.subtitle || '',
        difficulty: rawCase.meta.difficulty,
        duration_seconds: durSec,
        is_tutorial: Boolean(rawCase.meta.is_tutorial),
      },
      briefing: rawCase.briefing,
      suspects: rawCase.suspects,
      players: [
        {
          user_id: user.id,
          display_name: user.display_name,
          is_host: true,
          is_ready: true,
          is_bot: false,
          connected: true,
          connections_made: 0,
          mistakes_made: 0,
          has_voted: false,
          pinned_count: 0,
          unpinned_count: myRawNodes.length,
        },
      ],
      my_role: 'DEDEKTİF',
      dirty_cop_intel: null,
      my_nodes: myRawNodes.map((n) => {
        const unl = isSolo ? unlockedSet.has(n.node_id) : true;
        return {
          node_id: n.node_id,
          template: n.template || 'OFFICIAL_REPORT',
          category: n.category || 'BELGE',
          title: n.title,
          file_no: n.file_no || `DOSYA #${n.node_id}`,
          date: n.date || '14.10.2026',
          solo_cost: n.solo_cost ?? 1,
          unlocked: unl,
          content: unl ? n.content : null,
          highlights: unl && !hideHints ? n.highlights || [] : [],
        };
      }),
      my_highlights: [],
      board_nodes: [],
      verified_edges: [],
      activity_log: [
        {
          id: `${now}`,
          type: 'START',
          text: `Çevrimdışı Mobil Motor aktif (${label}).`,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      my_vote: null,
      cooldown_until: 0,
      endgame_result: null,
    };

    this.activeRoom = {
      rawCase,
      snapshot,
      unlockedSet,
      botNodes,
      totalMistakes: 0,
    };
    return { ...snapshot };
  }

  public handleLocalAction(
    user: UserProfile,
    event: string,
    data: Record<string, unknown> = {}
  ): { snapshot: RoomSnapshot; toast?: string; edgeVerifiedId?: string; penaltySec?: number } | null {
    if (!this.activeRoom) return null;
    const { rawCase, snapshot, unlockedSet, botNodes } = this.activeRoom;
    const hideHints = snapshot.difficulty_preset === 'HARDCORE';

    const placeOnBoard = (
      nodeObj: {
        node_id: string;
        template?: BoardNode['template'];
        category?: string;
        title: string;
        content: string;
        highlights?: string[];
      },
      owner: string,
      customPos?: { x: number; y: number }
    ) => {
      const existing = snapshot.board_nodes.find((b) => b.node_id === nodeObj.node_id);
      if (existing) return existing;
      const idx = snapshot.board_nodes.length;
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const card: BoardNode = {
        node_id: nodeObj.node_id,
        template: nodeObj.template || 'OFFICIAL_REPORT',
        category: nodeObj.category || 'KANIT',
        title: nodeObj.title,
        content: nodeObj.content,
        highlights: nodeObj.highlights || [],
        pinned_by: owner,
        is_inference: nodeObj.category === 'ÇIKARIM',
        x: customPos ? customPos.x : 20 + col * 180,
        y: customPos ? customPos.y : 26 + row * 116,
      };
      snapshot.board_nodes = [...snapshot.board_nodes, card];
      return card;
    };

    if (event === 'ADD_BOT_PLAYER') {
      if (snapshot.players.length < 6) {
        const names = ['Dedektif Tuna (AI)', 'Komiser Mercan (AI)', 'Müfettiş Poyraz (AI)'];
        const botName = names[(snapshot.players.length - 1) % names.length];
        snapshot.players = [
          ...snapshot.players,
          {
            user_id: `bot_${snapshot.players.length}`,
            display_name: botName,
            is_host: false,
            is_ready: true,
            is_bot: true,
            connected: true,
            connections_made: 0,
            mistakes_made: 0,
            has_voted: false,
            pinned_count: 0,
            unpinned_count: botNodes.length,
          },
        ];
        if (snapshot.players.length >= 3) snapshot.mode = 'GROUP';
      }
      return { snapshot: { ...snapshot } };
    }

    if (event === 'SET_DIFFICULTY_PRESET') {
      const p = data.difficulty_preset as DifficultyPreset;
      if (p) {
        return {
          snapshot: this.createLocalRoom(user, rawCase.case_id, snapshot.mode, p)!,
        };
      }
    }

    if (event === 'START_MATCH') {
      const now = Date.now();
      snapshot.status = 'ACTIVE';
      snapshot.match_start_timestamp = now;
      snapshot.match_end_timestamp = now + (snapshot.case_meta?.duration_seconds || 900) * 1000;
      if (botNodes.length > 0) {
        const firstBotNode = rawCase.nodes.find((n) => n.node_id === botNodes[0]);
        if (firstBotNode) {
          placeOnBoard(firstBotNode, 'AI Partner');
        }
      }
      return { snapshot: { ...snapshot }, toast: 'Soruşturma başladı!' };
    }

    if (event === 'UNLOCK_ARCHIVE_NODE') {
      const nid = String(data.node_id || '');
      const nObj = rawCase.nodes.find((n) => n.node_id === nid);
      if (!nObj || unlockedSet.has(nid)) return { snapshot: { ...snapshot } };
      const cost = nObj.solo_cost ?? 1;
      if (snapshot.solo_tokens < cost) {
        return { snapshot: { ...snapshot }, toast: '⚠️ Arşiv Sorgu Jetonunuz kalmadı!' };
      }
      snapshot.solo_tokens -= cost;
      unlockedSet.add(nid);
      snapshot.my_nodes = snapshot.my_nodes.map((mn) =>
        mn.node_id === nid
          ? {
              ...mn,
              unlocked: true,
              content: nObj.content,
              highlights: hideHints ? [] : nObj.highlights || [],
            }
          : mn
      );
      return {
        snapshot: { ...snapshot },
        toast: `🔓 Arşiv Dosyası Açıldı! Kalan Jeton: ${snapshot.solo_tokens}`,
      };
    }

    if (event === 'REWARD_EXTRA_TOKEN') {
      snapshot.solo_tokens += 1;
      return { snapshot: { ...snapshot }, toast: '♦ +1 Ekstra Arşiv Sorgu Jetonu eklendi!' };
    }

    if (event === 'TOGGLE_HIGHLIGHT') {
      const key = `${data.node_id}::${data.keyword}`;
      if (snapshot.my_highlights.includes(key)) {
        snapshot.my_highlights = snapshot.my_highlights.filter((k) => k !== key);
      } else {
        snapshot.my_highlights = [...snapshot.my_highlights, key];
      }
      return { snapshot: { ...snapshot } };
    }

    if (event === 'PIN_NODE') {
      const nid = String(data.node_id || '');
      const nObj = rawCase.nodes.find((n) => n.node_id === nid);
      if (nObj) {
        const card = placeOnBoard(nObj, user.display_name);
        return { snapshot: { ...snapshot }, toast: `📌 Tahtaya iğnelendi: ${card.title}` };
      }
    }

    if (event === 'REQUEST_PARTNER_PIN') {
      const nextBotId = botNodes.find((id) => !snapshot.board_nodes.some((b) => b.node_id === id));
      if (nextBotId) {
        const nObj = rawCase.nodes.find((n) => n.node_id === nextBotId);
        if (nObj) {
          const card = placeOnBoard(nObj, 'AI Partner');
          return { snapshot: { ...snapshot }, toast: `📌 AI Partner kanıt iğneledi: ${card.title}` };
        }
      }
      return { snapshot: { ...snapshot }, toast: 'Partnerin tüm kanıtları zaten tahtada.' };
    }

    if (event === 'MOVE_BOARD_NODE') {
      const nid = String(data.node_id || '');
      snapshot.board_nodes = snapshot.board_nodes.map((b) =>
        b.node_id === nid ? { ...b, x: Number(data.x), y: Number(data.y) } : b
      );
      return { snapshot: { ...snapshot } };
    }

    if (event === 'REQUEST_BOARD_HINT') {
      const unv = rawCase.edges.find(
        (e) => !snapshot.verified_edges.some((v) => v.edge_id === e.edge_id)
      );
      const msg = unv
        ? `💡 İpucu: #${unv.source_node} ile #${unv.target_node} belgelerini inceleyip birleştirin!`
        : '💡 Tüm çıkarım bağlantıları açıldı! 4. TUTUKLA sekmesine geçebilirsiniz.';
      return { snapshot: { ...snapshot }, toast: msg };
    }

    if (event === 'VERIFY_EDGE') {
      const src = String(data.source_node || '');
      const tgt = String(data.target_node || '');
      const matched = rawCase.edges.find(
        (e) =>
          (e.source_node === src && e.target_node === tgt) ||
          (e.source_node === tgt && e.target_node === src)
      );

      if (matched) {
        if (!snapshot.verified_edges.some((v) => v.edge_id === matched.edge_id)) {
          snapshot.verified_edges = [
            ...snapshot.verified_edges,
            {
              edge_id: matched.edge_id,
              source_node: matched.source_node,
              target_node: matched.target_node,
              unlocked_node_id: matched.unlocked_node.node_id,
              initiated_by: user.display_name,
            },
          ];
          snapshot.players[0].connections_made += 1;
          const sCard = snapshot.board_nodes.find((b) => b.node_id === matched.source_node);
          const tCard = snapshot.board_nodes.find((b) => b.node_id === matched.target_node);
          const midX = sCard && tCard ? Math.round((sCard.x + tCard.x) / 2) : 100;
          const midY = sCard && tCard ? Math.max(sCard.y, tCard.y) + 114 : 220;
          const unlocked = placeOnBoard(
            { ...matched.unlocked_node, category: 'ÇIKARIM', template: 'OFFICIAL_REPORT' },
            'SİSTEM ÇIKARIMI',
            { x: midX, y: midY }
          );
          return {
            snapshot: { ...snapshot },
            edgeVerifiedId: matched.edge_id,
            toast: `🔗 Yeni Çıkarım Açıldı: ${unlocked.title}`,
          };
        }
        return { snapshot: { ...snapshot } };
      } else {
        this.activeRoom.totalMistakes += 1;
        snapshot.players[0].mistakes_made += 1;
        const pen = snapshot.penalty_seconds_rule;
        if (snapshot.match_end_timestamp) {
          snapshot.match_end_timestamp = Math.max(
            Date.now() + 5000,
            snapshot.match_end_timestamp - pen * 1000
          );
        }
        snapshot.cooldown_until = Date.now() + 4000;
        return {
          snapshot: { ...snapshot },
          penaltySec: pen,
          toast: `⚠️ Hatalı Bağlantı! Süreden -00:${pen} düşüldü.`,
        };
      }
    }

    if (event === 'CAST_VOTE') {
      const suspectId = String(data.suspect_id || '');
      const evidenceIds = (data.evidence_ids as string[]) || [];
      const sol = rawCase.solution;
      const reqSet = new Set(sol.required_nodes);
      const altSet = new Set(sol.alternative_required_nodes || []);
      const m1 = evidenceIds.filter((id) => reqSet.has(id)).length;
      const m2 = altSet.size > 0 ? evidenceIds.filter((id) => altSet.has(id)).length : 0;
      const matchedCount = Math.max(m1, m2);
      const isSuspectOk = suspectId === sol.killer_id;
      const strict = snapshot.difficulty_preset === 'HARDCORE' ? 3 : 2;
      const isSolved = isSuspectOk && matchedCount >= strict;
      const acc = Math.min(100, Math.round(((isSuspectOk ? 1 : 0) * 40 + (matchedCount / 3) * 60)));
      const durSec = Math.max(
        1,
        Math.round((Date.now() - (snapshot.match_start_timestamp || Date.now())) / 1000)
      );
      const mult =
        snapshot.difficulty_preset === 'HARDCORE'
          ? 1.5
          : snapshot.difficulty_preset === 'EASY'
          ? 0.85
          : 1.0;
      const xpGained = isSolved
        ? Math.round(((rawCase.meta.difficulty || 1) * 80 + (acc === 100 ? 40 : 0)) * mult)
        : 20;

      // Update local user career
      user.xp += xpGained;
      user.stats.matches_played += 1;
      user.stats.total_connections += snapshot.players[0].connections_made;
      user.stats.total_mistakes += snapshot.players[0].mistakes_made;
      const newBadges: string[] = [];

      if (isSolved) {
        user.stats.matches_won += 1;
        user.stats.win_streak += 1;
        user.stats.best_streak = Math.max(user.stats.best_streak, user.stats.win_streak);
        if (!user.stats.fastest_solve_sec || durSec < user.stats.fastest_solve_sec) {
          user.stats.fastest_solve_sec = durSec;
        }
        if (snapshot.mode === 'SOLO') user.stats.solo_wins += 1;
        const prevAcc = user.solved_cases[rawCase.case_id]?.best_accuracy || 0;
        user.solved_cases[rawCase.case_id] = {
          solved_at: new Date().toISOString(),
          best_accuracy: Math.max(prevAcc, acc),
          difficulty_preset: snapshot.difficulty_preset,
        };
        const give = (bid: string) => {
          if (!user.badges.includes(bid)) {
            user.badges.push(bid);
            const b = OFFLINE_BADGES.find((x) => x.id === bid);
            if (b) newBadges.push(b.title);
          }
        };
        give('FIRST_SOLVE');
        if (this.activeRoom.totalMistakes === 0) give('ZERO_MISTAKE');
        if (snapshot.difficulty_preset === 'HARDCORE' && acc === 100) give('HARDCORE_WIN');
        if (durSec <= 180) give('SPEED_SOLVER');
        if (Object.keys(user.solved_cases).length >= 5) give('MASTER_5');
      } else {
        user.stats.win_streak = 0;
      }
      this.saveUser(user);

      const killerObj = rawCase.suspects.find((s) => s.id === sol.killer_id);
      const chosenObj = rawCase.suspects.find((s) => s.id === suspectId);

      const hist = this.getHistory();
      hist.unshift({
        match_id: `loc_${Date.now()}`,
        case_id: rawCase.case_id,
        case_title: rawCase.meta.title,
        mode: snapshot.mode,
        difficulty_preset: snapshot.difficulty_preset,
        player_count: snapshot.players.length,
        is_solved: isSolved,
        duration_sec: durSec,
        accuracy_rate: acc,
        xp_gained: xpGained,
        lead_detective: user.display_name,
        killer_name: killerObj?.name || '',
        arrested_name: chosenObj?.name || '',
        played_at: new Date().toISOString(),
      });
      localStorage.setItem(STORAGE_HIST_KEY, JSON.stringify(hist.slice(0, 50)));

      snapshot.status = 'ENDED';
      snapshot.endgame_result = {
        is_solved: isSolved,
        dirty_cop_won: false,
        reason: 'ALL_SEALED',
        difficulty_preset: snapshot.difficulty_preset,
        difficulty_label: snapshot.difficulty_label,
        duration_sec: durSec,
        accuracy_rate: acc,
        xp_gained: xpGained,
        new_badges: newBadges,
        lead_detective: user.display_name,
        dirty_cop_name: null,
        chosen_suspect_id: suspectId,
        chosen_suspect_name: chosenObj?.name || 'Seçilmedi',
        real_killer_id: sol.killer_id,
        real_killer_name: killerObj?.name || '',
        required_nodes: sol.required_nodes,
        submitted_evidence_ids: evidenceIds,
        headline: isSolved ? sol.headline_success : sol.headline_failure,
        story_summary: sol.story_summary,
      };
      return { snapshot: { ...snapshot } };
    }

    if (event === 'RETRY_MATCH') {
      return {
        snapshot: this.createLocalRoom(
          user,
          rawCase.case_id,
          snapshot.mode,
          snapshot.difficulty_preset
        )!,
      };
    }

    return { snapshot: { ...snapshot } };
  }
}

export const offlineEngine = new OfflineGameEngine();
