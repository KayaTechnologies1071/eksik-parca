import { create } from 'zustand';
import {
  AvatarId,
  BadgeDef,
  CasePack,
  CaseSummary,
  DifficultyPreset,
  DirectiveDef,
  GameMode,
  MatchHistoryItem,
  RoomSnapshot,
  SuspectMark,
  ThemeColorId,
  UserProfile,
} from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { buildApiUrl, buildWsUrl } from '../config/env';
import {
  OFFLINE_BADGES,
  OFFLINE_DIRECTIVES,
  OFFLINE_PACKS,
  offlineEngine,
} from '../services/offlineFallbackEngine';

interface PingAlert {
  id: number;
  initiated_by: string;
  target_type: 'NODE' | 'SUSPECT';
  target_id: string;
  label: string;
  timestamp: number;
}

interface PenaltyAlert {
  id: number;
  penalty_seconds: number;
  initiated_by: string;
  timestamp: number;
}

interface ServerHealthInfo {
  online: boolean;
  storage: string;
  cases_loaded: number;
  active_rooms: number;
  latency_ms: number;
}

interface GameStoreState {
  // Auth, Career Profile & Connection Mode
  user: UserProfile | null;
  badgeCatalog: BadgeDef[];
  directiveCatalog: DirectiveDef[];
  isAuthReady: boolean;
  isOfflineMode: boolean;
  serverHealth: ServerHealthInfo | null;

  // Navigation & Menus (5 Main Menu Tabs including dedicated PROFILE)
  mainMenuTab: 'HOME' | 'STORE' | 'PROFILE' | 'HISTORY' | 'SETTINGS';
  gameplayTab: 'BRIEFING' | 'FILES' | 'BOARD' | 'ACCUSE';
  selectedModeForCasePicker: GameMode | null;
  selectedDifficultyPreset: DifficultyPreset;
  isJoinModalOpen: boolean;
  mobilePreviewFrame: boolean;

  // Cases, Packs & History
  cases: CaseSummary[];
  packs: CasePack[];
  history: MatchHistoryItem[];
  subscriptionActive: boolean;

  // Room & Real-time WebSocket State
  room: RoomSnapshot | null;
  wsConnected: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
  serverTimeOffset: number;

  // Personal Detective Notebook
  suspectMarks: Record<string, SuspectMark>;
  detectiveNotes: string;

  // Micro-interaction & UI States
  inspectedNodeId: string | null;
  hintNodeId: string | null;
  docFontSize: number;
  isMuted: boolean;
  isAmbientOn: boolean;
  unreadBoardCount: number;
  unreadFilesCount: number;
  lastPing: PingAlert | null;
  lastVerifiedEdgeId: string | null;
  penaltyAlert: PenaltyAlert | null;
  toastMessage: string | null;
  errorMessage: string | null;

  // Actions
  initAuth: (customName?: string) => Promise<void>;
  checkServerHealth: () => Promise<boolean>;
  updateDisplayName: (name: string) => Promise<void>;
  updateDetectiveProfile: (payload: {
    display_name?: string;
    avatar_id?: AvatarId;
    theme_color?: ThemeColorId;
    specialty?: string;
    motto?: string;
  }) => Promise<void>;
  claimDirective: (directiveId: string) => Promise<void>;
  importProfileBackup: (rawJson: string) => Promise<boolean>;
  linkAccount: (provider: 'APPLE' | 'GOOGLE') => Promise<void>;
  deleteAccount: () => Promise<void>;
  fetchCases: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  purchaseStoreItem: (packId?: string, isSubscription?: boolean) => Promise<void>;

  setMainMenuTab: (tab: 'HOME' | 'STORE' | 'PROFILE' | 'HISTORY' | 'SETTINGS') => void;
  setGameplayTab: (tab: 'BRIEFING' | 'FILES' | 'BOARD' | 'ACCUSE') => void;
  openCasePickerForMode: (mode: GameMode | null) => void;
  setSelectedDifficultyPreset: (preset: DifficultyPreset) => void;
  setJoinModalOpen: (open: boolean) => void;
  toggleMobilePreviewFrame: () => void;
  setInspectedNodeId: (nodeId: string | null) => void;
  adjustDocFontSize: (delta: number) => void;
  cycleSuspectMark: (suspectId: string) => void;
  setDetectiveNotes: (notes: string) => void;
  toggleMute: () => void;
  toggleAmbient: () => void;
  showToast: (msg: string) => void;
  clearError: () => void;

  // Room & Gameplay Actions
  createRoom: (caseId: string, mode: GameMode, preset?: DifficultyPreset) => Promise<boolean>;
  joinRoom: (roomCode: string) => Promise<boolean>;
  leaveRoom: () => void;
  sendWsEvent: (event: string, data?: Record<string, unknown>) => void;
  toggleReady: () => void;
  setRoomDifficultyPreset: (preset: DifficultyPreset) => void;
  addBotPlayer: () => void;
  startMatch: () => void;
  unlockArchiveNode: (nodeId: string) => void;
  rewardExtraToken: () => void;
  toggleHighlight: (nodeId: string, keyword: string) => void;
  pinNodeToBoard: (nodeId: string) => void;
  requestPartnerPin: () => void;
  requestBoardHint: () => void;
  moveBoardNode: (nodeId: string, x: number, y: number) => void;
  verifyEdge: (sourceNode: string, targetNode: string) => void;
  pingItem: (targetType: 'NODE' | 'SUSPECT', targetId: string, label: string) => void;
  castVote: (suspectId: string, evidenceIds: string[]) => void;
  retryMatch: () => void;
}

let activeWs: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getOrCreateDeviceId(): string {
  const key = 'eksik_parca_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2600) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export const useGameStore = create<GameStoreState>((set, get) => {
  const connectWebSocket = (roomCode: string, userId: string, attempt = 0) => {
    if (activeWs) {
      activeWs.onclose = null;
      activeWs.close();
      activeWs = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    const ws = new WebSocket(buildWsUrl());
    activeWs = ws;

    ws.onopen = () => {
      set({ wsConnected: true, reconnecting: false, reconnectAttempt: 0 });
      ws.send(
        JSON.stringify({
          event: 'JOIN_SOCKET',
          data: { room_code: roomCode, user_id: userId },
        })
      );
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const { event, server_time, data, snapshot } = msg;

        if (typeof server_time === 'number') {
          set({ serverTimeOffset: server_time - Date.now() });
        }

        if (snapshot) {
          const prevStatus = get().room?.status;
          set({ room: snapshot });

          if (prevStatus === 'LOBBY' && snapshot.status === 'ACTIVE') {
            set({
              gameplayTab: 'BRIEFING',
              unreadBoardCount: 0,
              unreadFilesCount: 0,
              suspectMarks: {},
              detectiveNotes: '',
            });
            soundEngine.playPaperRustle();
          }
          if (snapshot.status === 'ENDED' && prevStatus !== 'ENDED') {
            get().fetchCases();
          }
        }

        if (event === 'NODE_PINNED' && data?.node) {
          soundEngine.playPinDrop();
          const currentTab = get().gameplayTab;
          set((s) => ({
            unreadBoardCount: currentTab === 'BOARD' ? 0 : s.unreadBoardCount + 1,
            toastMessage: `📌 ${data.initiated_by}: ${data.node.title}`,
          }));
        } else if (event === 'EDGE_VERIFIED' && data?.newly_unlocked_node) {
          soundEngine.playEdgeSuccess();
          set({
            lastVerifiedEdgeId: data.edge_id,
            hintNodeId: null,
            toastMessage: `🔗 Yeni Çıkarım Açıldı: ${data.newly_unlocked_node.title}`,
          });
          setTimeout(() => {
            if (get().lastVerifiedEdgeId === data.edge_id) {
              set({ lastVerifiedEdgeId: null });
            }
          }, 1600);
        } else if (event === 'EDGE_REJECTED') {
          soundEngine.playEdgeError();
          set({
            penaltyAlert: {
              id: Date.now(),
              penalty_seconds: data?.penalty_seconds || 30,
              initiated_by: data?.initiated_by || 'Dedektif',
              timestamp: Date.now(),
            },
            toastMessage: `⚠️ Hatalı Bağlantı! Süreden -00:${data?.penalty_seconds || 30} düşüldü.`,
          });
        } else if (event === 'BOARD_HINT' && data) {
          soundEngine.playSonarPing();
          set({
            hintNodeId: data.hint_node_id || null,
            toastMessage: data.message,
          });
          setTimeout(() => {
            set({ hintNodeId: null });
          }, 4500);
        } else if (event === 'ITEM_PINGED' && data) {
          soundEngine.playSonarPing();
          set({
            lastPing: {
              id: Date.now(),
              initiated_by: data.initiated_by,
              target_type: data.target_type,
              target_id: data.target_id,
              label: data.label,
              timestamp: Date.now(),
            },
            toastMessage: `📡 ${data.initiated_by} vurguladı: ${data.label}`,
          });
        } else if (event === 'ARCHIVE_NODE_UNLOCKED') {
          soundEngine.playPaperRustle();
          set({
            toastMessage: `🔓 Arşiv Dosyası Açıldı! Kalan Jeton: ${data?.remaining_tokens}`,
          });
        } else if (event === 'EXTRA_TOKEN_GRANTED') {
          soundEngine.playEdgeSuccess();
          set({
            toastMessage: `♦ +1 Ekstra Arşiv Sorgu Jetonu Tanımlandı!`,
          });
        } else if (event === 'TIMER_EXPIRED') {
          soundEngine.playSonarPing();
          set({
            gameplayTab: 'ACCUSE',
            toastMessage: `⏱️ Süre Doldu! Suçlama ve Oylama Ekranına Geçildi.`,
          });
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      if (activeWs !== ws) return;
      const currentRoom = get().room;
      const currentUser = get().user;
      if (!currentRoom || !currentUser || get().isOfflineMode) {
        set({ wsConnected: false, reconnecting: false });
        return;
      }

      const nextAttempt = attempt + 1;
      const delayMs = Math.min(8000, Math.pow(2, Math.min(3, attempt)) * 1000);
      set({
        wsConnected: false,
        reconnecting: true,
        reconnectAttempt: nextAttempt,
      });

      reconnectTimer = setTimeout(() => {
        connectWebSocket(currentRoom.room_code, currentUser.id, nextAttempt);
      }, delayMs);
    };
  };

  return {
    user: null,
    badgeCatalog: OFFLINE_BADGES,
    directiveCatalog: OFFLINE_DIRECTIVES,
    isAuthReady: false,
    isOfflineMode: false,
    serverHealth: null,

    mainMenuTab: 'HOME',
    gameplayTab: 'BRIEFING',
    selectedModeForCasePicker: null,
    selectedDifficultyPreset: 'STANDARD',
    isJoinModalOpen: false,
    mobilePreviewFrame: false,

    cases: [],
    packs: OFFLINE_PACKS,
    history: [],
    subscriptionActive: false,

    room: null,
    wsConnected: false,
    reconnecting: false,
    reconnectAttempt: 0,
    serverTimeOffset: 0,

    suspectMarks: {},
    detectiveNotes: '',

    inspectedNodeId: null,
    hintNodeId: null,
    docFontSize: 15,
    isMuted: false,
    isAmbientOn: false,
    unreadBoardCount: 0,
    unreadFilesCount: 0,
    lastPing: null,
    lastVerifiedEdgeId: null,
    penaltyAlert: null,
    toastMessage: null,
    errorMessage: null,

    checkServerHealth: async () => {
      const t0 = performance.now();
      try {
        const res = await fetchWithTimeout(buildApiUrl('/api/health'), {}, 2400);
        if (!res.ok) throw new Error('bad status');
        const data = await res.json();
        const latency = Math.round(performance.now() - t0);
        set({
          isOfflineMode: false,
          serverHealth: {
            online: true,
            storage: data.storage || 'local-json',
            cases_loaded: data.cases_loaded || 16,
            active_rooms: data.active_rooms || 0,
            latency_ms: latency,
          },
        });
        return true;
      } catch {
        // Check if Supabase Cloud Edge API is reachable for cloud DB sync on Android APK
        const supabaseHealthUrl =
          'https://zioqzlzhvdvxddwsnhem.supabase.co/functions/v1/eksik-parca-api/api/health';
        try {
          const sbRes = await fetchWithTimeout(supabaseHealthUrl, {}, 2800);
          if (sbRes.ok) {
            const sbData = await sbRes.json();
            const latency = Math.round(performance.now() - t0);
            set({
              isOfflineMode: true,
              serverHealth: {
                online: true,
                storage: sbData.storage || 'supabase-postgresql',
                cases_loaded: sbData.cases_loaded || 16,
                active_rooms: 1,
                latency_ms: latency,
              },
            });
            return true;
          }
        } catch {}

        set({
          isOfflineMode: true,
          serverHealth: {
            online: false,
            storage: 'apk-offline-engine',
            cases_loaded: 16,
            active_rooms: 0,
            latency_ms: 0,
          },
        });
        return false;
      }
    },

    initAuth: async (customName?: string) => {
      const deviceId = getOrCreateDeviceId();
      const savedName = customName || localStorage.getItem('eksik_parca_name') || '';

      try {
        const res = await fetchWithTimeout(
          buildApiUrl('/api/auth/guest'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device_id: deviceId,
              display_name: savedName || undefined,
            }),
          },
          2500
        );
        if (!res.ok) throw new Error('offline');
        const data = await res.json();
        if (data.user) {
          localStorage.setItem('eksik_parca_name', data.user.display_name);
          set({
            user: data.user,
            badgeCatalog: data.badge_catalog || OFFLINE_BADGES,
            directiveCatalog: data.directive_catalog || OFFLINE_DIRECTIVES,
            isAuthReady: true,
            isOfflineMode: false,
            subscriptionActive: Boolean(data.user.subscription_active),
          });
          get().checkServerHealth();
          await get().fetchCases();
          await get().fetchHistory();
          return;
        }
      } catch {
        // Activate Standalone Mobile APK Offline Engine + Supabase Cloud DB Sync!
        const localUser = offlineEngine.loadOrCreateUser(deviceId, savedName || undefined);
        localStorage.setItem('eksik_parca_name', localUser.display_name);
        set({
          user: localUser,
          badgeCatalog: OFFLINE_BADGES,
          directiveCatalog: OFFLINE_DIRECTIVES,
          cases: offlineEngine.getCaseSummaries(localUser),
          packs: OFFLINE_PACKS,
          history: offlineEngine.getHistory(),
          isAuthReady: true,
          isOfflineMode: true,
          subscriptionActive: Boolean(localUser.subscription_active),
          serverHealth: {
            online: false,
            storage: 'apk-offline-engine',
            cases_loaded: 16,
            active_rooms: 0,
            latency_ms: 0,
          },
        });
        get().checkServerHealth();
      }
    },

    updateDisplayName: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      await get().updateDetectiveProfile({ display_name: trimmed });
    },

    updateDetectiveProfile: async (payload) => {
      const user = get().user;
      if (!user) return;

      if (payload.display_name) {
        localStorage.setItem('eksik_parca_name', payload.display_name.trim());
      }

      if (get().isOfflineMode) {
        const updated: UserProfile = {
          ...user,
          ...(payload.display_name ? { display_name: payload.display_name.trim() } : {}),
          ...(payload.avatar_id ? { avatar_id: payload.avatar_id } : {}),
          ...(payload.theme_color ? { theme_color: payload.theme_color } : {}),
          ...(payload.specialty ? { specialty: payload.specialty } : {}),
          ...(payload.motto !== undefined ? { motto: payload.motto } : {}),
        };
        offlineEngine.saveUser(updated);
        soundEngine.playEdgeSuccess();
        set({ user: updated });
        get().showToast('Dedektif kimlik kartınız güncellendi.');
        return;
      }

      try {
        const res = await fetch(buildApiUrl('/api/profile/update'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, ...payload }),
        });
        const data = await res.json();
        if (data.user) {
          soundEngine.playEdgeSuccess();
          set({ user: data.user });
          get().showToast('Dedektif kimlik kartınız güncellendi.');
        }
      } catch {
        get().showToast('Profil güncellenemedi.');
      }
    },

    claimDirective: async (directiveId) => {
      const user = get().user;
      if (!user) return;

      if (get().isOfflineMode) {
        const dir = OFFLINE_DIRECTIVES.find((d) => d.id === directiveId);
        if (!dir || user.claimed_directives.includes(directiveId)) return;
        const updated: UserProfile = {
          ...user,
          xp: user.xp + dir.reward_xp,
          claimed_directives: [...user.claimed_directives, directiveId],
        };
        offlineEngine.saveUser(updated);
        soundEngine.playEdgeSuccess();
        set({ user: { ...updated } });
        get().showToast(`🎖️ Görev Tamamlandı! +${dir.reward_xp} XP eklendi.`);
        return;
      }

      try {
        const res = await fetch(buildApiUrl('/api/profile/claim-directive'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, directive_id: directiveId }),
        });
        const data = await res.json();
        if (data.user) {
          soundEngine.playEdgeSuccess();
          set({ user: data.user });
          get().showToast(`🎖️ Görev Tamamlandı! +${data.reward_xp} XP eklendi.`);
        }
      } catch {}
    },

    importProfileBackup: async (rawJson) => {
      const user = get().user;
      if (!user) return false;
      try {
        const parsed = JSON.parse(rawJson.trim());
        if (get().isOfflineMode) {
          const updated: UserProfile = {
            ...user,
            display_name: parsed.display_name || user.display_name,
            avatar_id: parsed.avatar_id || user.avatar_id,
            theme_color: parsed.theme_color || user.theme_color,
            specialty: parsed.specialty || user.specialty,
            motto: parsed.motto || user.motto,
            xp: Math.max(user.xp, Number(parsed.xp || 0)),
            solved_cases: { ...user.solved_cases, ...(parsed.solved_cases || {}) },
            badges: Array.from(new Set([...user.badges, ...(parsed.badges || [])])),
          };
          offlineEngine.saveUser(updated);
          set({
            user: { ...updated },
            cases: offlineEngine.getCaseSummaries(updated),
          });
          soundEngine.playEdgeSuccess();
          get().showToast('Dedektif yedeği başarıyla yüklendi.');
          return true;
        }

        const res = await fetch(buildApiUrl('/api/profile/import'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, backup_data: parsed }),
        });
        const data = await res.json();
        if (data.user) {
          set({ user: data.user });
          await get().fetchCases();
          soundEngine.playEdgeSuccess();
          get().showToast('Dedektif yedeği sunucuya aktarıldı.');
          return true;
        }
        return false;
      } catch {
        get().showToast('Geçersiz yedek kodu formatı.');
        return false;
      }
    },

    linkAccount: async (provider: 'APPLE' | 'GOOGLE') => {
      const user = get().user;
      if (!user) return;
      if (get().isOfflineMode) {
        const updated = { ...user, linked_provider: provider };
        offlineEngine.saveUser(updated);
        set({ user: updated });
        get().showToast(`${provider} profil işareti kaydedildi.`);
        return;
      }
      const res = await fetch(buildApiUrl('/api/auth/link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, provider }),
      });
      const data = await res.json();
      if (data.user) {
        set({ user: data.user });
        get().showToast(`${provider === 'APPLE' ? 'Apple' : 'Google'} hesabı bağlandı.`);
      }
    },

    deleteAccount: async () => {
      const user = get().user;
      if (!user) return;
      if (!get().isOfflineMode) {
        await fetch(buildApiUrl('/api/auth/delete'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        }).catch(() => {});
      }
      localStorage.clear();
      set({ user: null, room: null });
      await get().initAuth('Yeni Dedektif');
      get().showToast('KVKK/GDPR kapsamında tüm verileriniz kalıcı olarak silindi.');
    },

    fetchCases: async () => {
      const user = get().user;
      if (!user) return;
      if (get().isOfflineMode) {
        set({
          cases: offlineEngine.getCaseSummaries(user),
          packs: OFFLINE_PACKS,
        });
        return;
      }
      try {
        const res = await fetch(buildApiUrl(`/api/cases?user_id=${encodeURIComponent(user.id)}`));
        const data = await res.json();
        set((s) => ({
          cases: data.cases || [],
          packs: data.packs || OFFLINE_PACKS,
          user: data.user || s.user,
          badgeCatalog: data.badge_catalog || s.badgeCatalog,
          directiveCatalog: data.directive_catalog || s.directiveCatalog,
          subscriptionActive: Boolean(data.subscription_active),
        }));
      } catch {}
    },

    fetchHistory: async () => {
      if (get().isOfflineMode) {
        set({ history: offlineEngine.getHistory() });
        return;
      }
      try {
        const res = await fetch(buildApiUrl('/api/history'));
        const data = await res.json();
        set({ history: data.history || [] });
      } catch {}
    },

    purchaseStoreItem: async (packId?: string, isSubscription?: boolean) => {
      const user = get().user;
      if (!user) return;

      if (get().isOfflineMode) {
        const updated = { ...user };
        if (isSubscription) {
          updated.subscription_active = true;
          OFFLINE_PACKS.forEach((p) => offlineEngine.addOwnedPack(p.pack_id));
        } else if (packId) {
          offlineEngine.addOwnedPack(packId);
        }
        offlineEngine.saveUser(updated);
        soundEngine.playEdgeSuccess();
        set({
          user: updated,
          subscriptionActive: Boolean(updated.subscription_active),
          cases: offlineEngine.getCaseSummaries(updated),
        });
        get().showToast('Paket çevrimdışı arşivinize açıldı!');
        return;
      }

      const res = await fetch(buildApiUrl('/api/store/purchase'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          pack_id: packId,
          is_subscription: Boolean(isSubscription),
        }),
      });
      const data = await res.json();
      if (data.user) {
        soundEngine.playEdgeSuccess();
        set({
          user: data.user,
          subscriptionActive: Boolean(data.subscription_active),
        });
        await get().fetchCases();
        get().showToast(
          isSubscription
            ? 'Tam Erişim Aboneliği aktifleşti! Tüm 16 vakanın kilidi açıldı.'
            : 'Vaka Paketi satın alındı! Dosyalar arşivinize eklendi.'
        );
      }
    },

    setMainMenuTab: (tab) => {
      soundEngine.playTabSwitch();
      set({ mainMenuTab: tab, selectedModeForCasePicker: null });
      if (tab === 'HISTORY' || tab === 'PROFILE') get().fetchHistory();
      if (tab === 'STORE' || tab === 'HOME' || tab === 'PROFILE') get().fetchCases();
      if (tab === 'SETTINGS') get().checkServerHealth();
    },

    setGameplayTab: (tab) => {
      soundEngine.playTabSwitch();
      set((s) => ({
        gameplayTab: tab,
        unreadBoardCount: tab === 'BOARD' ? 0 : s.unreadBoardCount,
        unreadFilesCount: tab === 'FILES' ? 0 : s.unreadFilesCount,
      }));
    },

    openCasePickerForMode: (mode) => {
      soundEngine.playTabSwitch();
      set({ selectedModeForCasePicker: mode });
    },

    setSelectedDifficultyPreset: (preset) => {
      soundEngine.playTabSwitch();
      set({ selectedDifficultyPreset: preset });
    },

    setJoinModalOpen: (open) => {
      soundEngine.playTabSwitch();
      set({ isJoinModalOpen: open, errorMessage: null });
    },

    toggleMobilePreviewFrame: () => {
      soundEngine.playTabSwitch();
      set((s) => ({ mobilePreviewFrame: !s.mobilePreviewFrame }));
    },

    setInspectedNodeId: (nodeId) => {
      if (nodeId) soundEngine.playPaperRustle();
      set({ inspectedNodeId: nodeId });
    },

    adjustDocFontSize: (delta) => {
      set((s) => ({
        docFontSize: Math.max(13, Math.min(21, s.docFontSize + delta)),
      }));
    },

    cycleSuspectMark: (suspectId) => {
      soundEngine.playTabSwitch();
      const order: SuspectMark[] = ['NEUTRAL', 'SUSPECT', 'CLEARED'];
      const current = get().suspectMarks[suspectId] || 'NEUTRAL';
      const next = order[(order.indexOf(current) + 1) % order.length];
      set((s) => ({
        suspectMarks: {
          ...s.suspectMarks,
          [suspectId]: next,
        },
      }));
    },

    setDetectiveNotes: (notes) => set({ detectiveNotes: notes }),

    toggleMute: () => {
      const next = !get().isMuted;
      soundEngine.setMuted(next);
      set({ isMuted: next });
      get().showToast(next ? '🔇 Sessiz Mod Aktif' : '🔊 Ses Efektleri Aktif');
    },

    toggleAmbient: () => {
      const playing = soundEngine.toggleAmbient();
      set({ isAmbientOn: playing });
    },

    showToast: (msg) => {
      set({ toastMessage: msg });
      setTimeout(() => {
        if (get().toastMessage === msg) {
          set({ toastMessage: null });
        }
      }, 3600);
    },

    clearError: () => set({ errorMessage: null }),

    createRoom: async (caseId, mode, preset) => {
      const user = get().user;
      if (!user) return false;
      const difficultyPreset = preset || get().selectedDifficultyPreset;

      if (get().isOfflineMode) {
        const snap = offlineEngine.createLocalRoom(user, caseId, mode, difficultyPreset);
        if (!snap) return false;
        soundEngine.playPaperRustle();
        set({
          room: snap,
          selectedModeForCasePicker: null,
          gameplayTab: 'BRIEFING',
          unreadBoardCount: 0,
          suspectMarks: {},
          detectiveNotes: '',
        });
        return true;
      }

      try {
        const res = await fetch(buildApiUrl('/api/rooms/create'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            display_name: user.display_name,
            case_id: caseId,
            mode,
            difficulty_preset: difficultyPreset,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          set({ errorMessage: data.error || 'Oda kurulamadı.' });
          return false;
        }
        set({
          room: data.snapshot,
          selectedModeForCasePicker: null,
          gameplayTab: 'BRIEFING',
          unreadBoardCount: 0,
          unreadFilesCount: 0,
          suspectMarks: {},
          detectiveNotes: '',
        });
        connectWebSocket(data.room_code, user.id);
        return true;
      } catch {
        set({ errorMessage: 'Sunucu bağlantı hatası.' });
        return false;
      }
    },

    joinRoom: async (roomCode) => {
      const user = get().user;
      if (!user) return false;
      if (get().isOfflineMode) {
        set({
          errorMessage:
            'Çevrimdışı APK modundasınız. Çok oyunculu odaya katılmak için Sistem sekmesinden canlı sunucu adresini bağlayın.',
        });
        return false;
      }
      try {
        const res = await fetch(buildApiUrl('/api/rooms/join'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            display_name: user.display_name,
            room_code: roomCode.trim().toUpperCase(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          soundEngine.playEdgeError();
          set({ errorMessage: data.error || 'Odaya katılınamadı.' });
          return false;
        }
        soundEngine.playEdgeSuccess();
        set({
          room: data.snapshot,
          isJoinModalOpen: false,
          errorMessage: null,
          gameplayTab: 'BRIEFING',
          suspectMarks: {},
          detectiveNotes: '',
        });
        connectWebSocket(data.room_code, user.id);
        return true;
      } catch {
        set({ errorMessage: 'Sunucu bağlantı hatası.' });
        return false;
      }
    },

    leaveRoom: () => {
      if (activeWs) {
        activeWs.onclose = null;
        activeWs.close();
        activeWs = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      set({
        room: null,
        wsConnected: false,
        reconnecting: false,
        inspectedNodeId: null,
      });
      get().fetchCases();
      get().fetchHistory();
    },

    sendWsEvent: (event, data = {}) => {
      const user = get().user;
      if (get().isOfflineMode && user) {
        const res = offlineEngine.handleLocalAction(user, event, data);
        if (res) {
          if (res.edgeVerifiedId) soundEngine.playEdgeSuccess();
          if (res.penaltySec) soundEngine.playEdgeError();
          set((s) => ({
            room: res.snapshot,
            user: { ...user },
            lastVerifiedEdgeId: res.edgeVerifiedId || s.lastVerifiedEdgeId,
            penaltyAlert: res.penaltySec
              ? {
                  id: Date.now(),
                  penalty_seconds: res.penaltySec,
                  initiated_by: user.display_name,
                  timestamp: Date.now(),
                }
              : s.penaltyAlert,
            toastMessage: res.toast || s.toastMessage,
          }));
        }
        return;
      }

      if (activeWs && activeWs.readyState === WebSocket.OPEN) {
        activeWs.send(JSON.stringify({ event, data }));
      }
    },

    toggleReady: () => get().sendWsEvent('TOGGLE_READY'),
    setRoomDifficultyPreset: (preset) =>
      get().sendWsEvent('SET_DIFFICULTY_PRESET', { difficulty_preset: preset }),
    addBotPlayer: () => get().sendWsEvent('ADD_BOT_PLAYER'),
    startMatch: () => get().sendWsEvent('START_MATCH'),
    unlockArchiveNode: (nodeId) => get().sendWsEvent('UNLOCK_ARCHIVE_NODE', { node_id: nodeId }),
    rewardExtraToken: () => get().sendWsEvent('REWARD_EXTRA_TOKEN'),
    toggleHighlight: (nodeId, keyword) => {
      soundEngine.playHighlightMarker();
      get().sendWsEvent('TOGGLE_HIGHLIGHT', { node_id: nodeId, keyword });
    },
    pinNodeToBoard: (nodeId) => {
      get().sendWsEvent('PIN_NODE', { node_id: nodeId });
    },
    requestPartnerPin: () => {
      get().sendWsEvent('REQUEST_PARTNER_PIN');
    },
    requestBoardHint: () => {
      get().sendWsEvent('REQUEST_BOARD_HINT');
    },
    moveBoardNode: (nodeId, x, y) => {
      get().sendWsEvent('MOVE_BOARD_NODE', { node_id: nodeId, x: Math.round(x), y: Math.round(y) });
    },
    verifyEdge: (sourceNode, targetNode) => {
      get().sendWsEvent('VERIFY_EDGE', {
        source_node: sourceNode,
        target_node: targetNode,
      });
    },
    pingItem: (targetType, targetId, label) => {
      get().sendWsEvent('PING_ITEM', {
        target_type: targetType,
        target_id: targetId,
        label,
      });
    },
    castVote: (suspectId, evidenceIds) => {
      soundEngine.playPinDrop();
      get().sendWsEvent('CAST_VOTE', {
        suspect_id: suspectId,
        evidence_ids: evidenceIds,
      });
    },
    retryMatch: () => {
      set({ gameplayTab: 'BRIEFING', inspectedNodeId: null });
      get().sendWsEvent('RETRY_MATCH');
    },
  };
});
