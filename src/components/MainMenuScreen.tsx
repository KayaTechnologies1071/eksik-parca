import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { DifficultyPreset } from '../types/game';
import { getCustomServerUrl, setCustomServerUrl } from '../config/env';
import { ProfileScreen } from './ProfileScreen';
import {
  Users,
  FolderArchive,
  KeyRound,
  ShoppingBag,
  History,
  Settings,
  Home,
  GraduationCap,
  Sparkles,
  Lock,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Trash2,
  Volume2,
  Music,
  ArrowLeft,
  Play,
  Flame,
  X,
  Trophy,
  Smartphone,
  Monitor,
  Gauge,
  Server,
  BadgeCheck,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

export const MainMenuScreen: React.FC = () => {
  const {
    user,
    badgeCatalog,
    mainMenuTab,
    selectedModeForCasePicker,
    selectedDifficultyPreset,
    mobilePreviewFrame,
    isJoinModalOpen,
    isOfflineMode,
    serverHealth,
    cases,
    packs,
    history,
    subscriptionActive,
    isMuted,
    isAmbientOn,
    errorMessage,
    initAuth,
    checkServerHealth,
    setMainMenuTab,
    openCasePickerForMode,
    setSelectedDifficultyPreset,
    toggleMobilePreviewFrame,
    setJoinModalOpen,
    createRoom,
    joinRoom,
    purchaseStoreItem,
    deleteAccount,
    toggleMute,
    toggleAmbient,
    showToast,
    clearError,
  } = useGameStore();

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [qrScanningSim, setQrScanningSim] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(() => getCustomServerUrl());
  const [multiplayerSubMode, setMultiplayerSubMode] = useState<'DUO' | 'GROUP'>('DUO');
  const [caseLevelFilter, setCaseLevelFilter] = useState<0 | 1 | 2 | 3>(0);

  const newReleaseCase = cases.find((c) => c.meta.is_new_release);
  const tutorialCase = cases.find((c) => c.meta.is_tutorial);

  const solvedCount = Object.keys(user?.solved_cases || {}).length;
  const xpProgressPct = user
    ? Math.min(100, Math.round((user.xp / Math.max(1, user.next_rank_xp)) * 100))
    : 0;

  const filteredCases = cases.filter((c) => {
    if (caseLevelFilter === 0) return true;
    return c.meta.difficulty === caseLevelFilter;
  });

  const handleNumpadChar = (ch: string) => {
    if (joinCodeInput.length < 6) {
      setJoinCodeInput((prev) => (prev + ch).toUpperCase());
    }
  };

  const renderDifficultyBadge = (diff: number) => {
    if (diff === 1) {
      return (
        <span className="px-2 py-0.5 rounded-[2px] bg-emerald/15 text-emerald border border-emerald/40 font-mono text-[10px] font-bold">
          ★☆☆ KOLAY
        </span>
      );
    }
    if (diff === 2) {
      return (
        <span className="px-2 py-0.5 rounded-[2px] bg-amber/15 text-amber border border-amber/40 font-mono text-[10px] font-bold">
          ★★☆ ORTA
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-[2px] bg-crimson/20 text-crimson border border-crimson/40 font-mono text-[10px] font-bold">
        ★★★ UZMAN
      </span>
    );
  };

  const presetCards: { id: DifficultyPreset; title: string; detail: string; xpTag: string }[] = [
    {
      id: 'EASY',
      title: '🟢 AKADEMİ (KOLAY)',
      detail: '+%35 Ek Süre • +1 Arşiv Jetonu • Tahta İpucu Desteği • -15sn Ceza',
      xpTag: '0.85x XP',
    },
    {
      id: 'STANDARD',
      title: '🟡 SAHA DEDEKTİFİ (ORTA)',
      detail: 'Standart Süre & Jeton • Kelime İpuçları Açık • -30sn Ceza',
      xpTag: '1.0x XP',
    },
    {
      id: 'HARDCORE',
      title: '🔴 BAŞKOMİSER (ZOR)',
      detail: 'Kısıtlı Süre • Sarı Kelime İpuçları Gizli • 3/3 Tam Kanıt Şartı • -60sn Ceza',
      xpTag: '1.5x XP',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-primary">
      {/* Top App Header */}
      <header className="px-3.5 py-2.5 bg-surface border-b border-subtle flex items-center justify-between gap-2 shrink-0 safe-top">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-crimson animate-pulse shrink-0" />
            <h1 className="font-mono font-bold text-base sm:text-lg tracking-wider text-primary truncate">
              EKSİK PARÇA
            </h1>
            <span
              className={`px-1.5 py-0.5 rounded-[2px] border font-mono text-[9px] font-bold shrink-0 ${
                isOfflineMode
                  ? 'bg-amber/15 border-amber/40 text-amber'
                  : 'bg-emerald/15 border-emerald/40 text-emerald'
              }`}
            >
              {isOfflineMode ? 'APK YEREL' : 'BULUT AKTİF'}
            </span>
          </div>
          <p className="font-mono text-[10px] sm:text-[11px] text-secondary truncate mt-0.5">
            {user?.rank_title || 'Çaylak Memur'} • {user?.specialty || 'Kriminal Analist'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleMobilePreviewFrame}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-elevated hover:bg-crimson/20 border border-subtle hover:border-crimson text-secondary hover:text-primary font-mono text-[11px] font-semibold transition-all"
            title="Mobil Uygulama Görünümünü (390x844) Önizle"
          >
            {mobilePreviewFrame ? (
              <>
                <Monitor size={13} className="text-emerald" />
                <span>TAM EKRAN</span>
              </>
            ) : (
              <>
                <Smartphone size={13} className="text-amber" />
                <span>MOBİL SİMÜLATÖR</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMainMenuTab('PROFILE')}
            className="text-right font-mono px-2 py-1 rounded-[4px] bg-elevated/70 border border-subtle hover:border-amber transition-all"
            title="Dedektif Profilini Aç"
          >
            <div className="text-xs font-bold text-primary max-w-[115px] truncate">
              {user?.display_name}
            </div>
            <div className="text-[10px] text-amber flex items-center justify-end gap-1">
              <span>★ {user?.xp || 0} XP</span>
              <span className="text-emerald">• {solvedCount}/{cases.length}</span>
            </div>
          </button>
        </div>
      </header>

      {/* Main Scrollable Body */}
      <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 max-w-xl mx-auto w-full">
        {selectedModeForCasePicker ? (
          <div className="space-y-3.5 animate-doc-open">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => openCasePickerForMode(null)}
                className="min-h-[42px] px-3 py-2 rounded-[4px] bg-surface border border-subtle hover:border-crimson text-secondary hover:text-primary font-mono text-xs flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                GERİ
              </button>

              <span className="px-2.5 py-1 rounded-[2px] bg-crimson/20 text-crimson border border-crimson/40 font-mono text-[11px] font-bold">
                {selectedModeForCasePicker === 'SOLO'
                  ? 'SOLO ARŞİV MODU'
                  : 'ÇOK OYUNCULU MASA'}
              </span>
            </div>

            {selectedModeForCasePicker !== 'SOLO' && (
              <div className="p-2.5 rounded-[6px] bg-surface border border-subtle grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMultiplayerSubMode('DUO')}
                  className={`p-2.5 rounded-[4px] font-mono text-[11px] font-bold border transition-all ${
                    multiplayerSubMode === 'DUO'
                      ? 'bg-crimson text-white border-crimson'
                      : 'bg-elevated text-secondary border-subtle'
                  }`}
                >
                  👥 DUO (2 KİŞİ - İŞBİRLİĞİ)
                </button>
                <button
                  type="button"
                  onClick={() => setMultiplayerSubMode('GROUP')}
                  className={`p-2.5 rounded-[4px] font-mono text-[11px] font-bold border transition-all ${
                    multiplayerSubMode === 'GROUP'
                      ? 'bg-crimson text-white border-crimson'
                      : 'bg-elevated text-secondary border-subtle'
                  }`}
                >
                  🕵️ GRUP (3-6 KİŞİ - HAİN)
                </button>
              </div>
            )}

            {/* Difficulty Preset Selector */}
            <div className="p-3.5 rounded-[6px] bg-surface border border-subtle">
              <div className="flex items-center justify-between mb-2 font-mono text-xs">
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <Gauge size={14} className="text-amber" />
                  1. ZORLUK DERECESİNİ SEÇİN:
                </span>
              </div>
              <div className="space-y-1.5">
                {presetCards.map((p) => {
                  const isSelected = selectedDifficultyPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedDifficultyPreset(p.id)}
                      className={`w-full p-2.5 rounded-[4px] border text-left flex items-center justify-between gap-2 transition-all ${
                        isSelected
                          ? 'bg-elevated border-crimson text-primary shadow-crimson'
                          : 'bg-primary/60 border-subtle text-secondary hover:text-primary'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold">{p.title}</div>
                        <div className="font-mono text-[10px] text-secondary mt-0.5 leading-snug">
                          {p.detail}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-[2px] bg-surface border border-subtle font-mono text-[10px] text-amber font-bold shrink-0">
                        {p.xpTag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Level Filter Tabs */}
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { lv: 0, label: `TÜMÜ (${cases.length})` },
                  {
                    lv: 1,
                    label: `KOLAY (${cases.filter((c) => c.meta.difficulty === 1).length})`,
                  },
                  {
                    lv: 2,
                    label: `ORTA (${cases.filter((c) => c.meta.difficulty === 2).length})`,
                  },
                  {
                    lv: 3,
                    label: `UZMAN (${cases.filter((c) => c.meta.difficulty === 3).length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.lv}
                  type="button"
                  onClick={() => setCaseLevelFilter(tab.lv)}
                  className={`py-2 px-1.5 rounded-[4px] font-mono text-[10px] sm:text-[11px] font-bold border transition-all ${
                    caseLevelFilter === tab.lv
                      ? 'bg-amber text-black border-amber'
                      : 'bg-surface text-secondary border-subtle hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filtered Case List */}
            <div className="space-y-3">
              {filteredCases.map((c) => {
                const modeToLaunch =
                  selectedModeForCasePicker === 'SOLO' ? 'SOLO' : multiplayerSubMode;

                return (
                  <div
                    key={c.case_id}
                    className={`p-3.5 sm:p-4 rounded-[6px] bg-surface border transition-all flex flex-col justify-between gap-3 ${
                      c.solved_info ? 'border-emerald/40' : 'border-subtle hover:border-secondary'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-elevated text-primary font-bold">
                            #{c.case_id}
                          </span>
                          {renderDifficultyBadge(c.meta.difficulty)}
                          {c.meta.is_new_release && (
                            <span className="px-1.5 py-0.5 rounded-[2px] bg-crimson text-white font-bold">
                              YENİ
                            </span>
                          )}
                          {c.meta.is_tutorial && (
                            <span className="px-1.5 py-0.5 rounded-[2px] bg-emerald/20 text-emerald font-bold">
                              ÖĞRETİCİ
                            </span>
                          )}
                          {c.solved_info && (
                            <span className="px-1.5 py-0.5 rounded-[2px] bg-emerald text-black font-bold">
                              ✓ ÇÖZÜLDÜ (%{c.solved_info.best_accuracy})
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-muted">
                          {c.suspect_count} Şüpheli • {c.node_count} Delil
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-base sm:text-lg text-primary">
                        {c.meta.title}
                      </h3>
                      {c.meta.subtitle && (
                        <div className="font-mono text-[11px] text-amber mt-0.5">
                          {c.meta.subtitle}
                        </div>
                      )}
                      <p className="font-mono text-xs text-secondary mt-1.5 leading-relaxed">
                        {c.briefing.summary}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-subtle flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-secondary">
                        Süre: {Math.round(c.meta.duration_seconds / 60)} dk •{' '}
                        {selectedModeForCasePicker === 'SOLO'
                          ? `${c.meta.solo_token_limit} Jeton`
                          : 'Asimetrik Masa'}
                      </span>

                      {c.is_unlocked ? (
                        <button
                          type="button"
                          onClick={() =>
                            createRoom(c.case_id, modeToLaunch, selectedDifficultyPreset)
                          }
                          className="min-h-[42px] px-3.5 py-2 rounded-[4px] bg-crimson hover:bg-crimson/90 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-crimson shrink-0"
                        >
                          <Play size={13} />
                          {selectedModeForCasePicker === 'SOLO' ? 'BAŞLA' : 'ODA KUR'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            openCasePickerForMode(null);
                            setMainMenuTab('STORE');
                          }}
                          className="min-h-[42px] px-3.5 py-2 rounded-[4px] bg-elevated border border-amber/40 text-amber font-mono text-xs font-bold flex items-center gap-1.5 shrink-0"
                        >
                          <Lock size={13} />
                          MAĞAZA
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* TAB 1: HOME */}
            {mainMenuTab === 'HOME' && (
              <div className="space-y-3.5">
                {user && (
                  <div
                    onClick={() => setMainMenuTab('PROFILE')}
                    className="p-3.5 rounded-[6px] bg-surface border border-subtle hover:border-amber/60 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="text-amber font-bold flex items-center gap-1.5">
                        <Trophy size={14} />
                        {user.rank_title.toUpperCase()} • {user.badge_code || 'TR-EP-1042'}
                      </span>
                      <span className="text-secondary text-[11px]">PROFİLİ AÇ →</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-primary overflow-hidden border border-subtle">
                      <div
                        style={{ width: `${xpProgressPct}%` }}
                        className="h-full bg-amber transition-all"
                      />
                    </div>
                  </div>
                )}

                {newReleaseCase && (
                  <div
                    onClick={() => openCasePickerForMode('SOLO')}
                    className="p-3 rounded-[6px] bg-crimson/15 border border-crimson/50 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-crimson/20 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Flame size={18} className="text-crimson shrink-0" />
                      <div className="font-mono text-xs truncate">
                        <span className="font-bold text-crimson">
                          YENİ VAKA: {newReleaseCase.meta.title.toUpperCase()}
                        </span>
                        <span className="text-secondary block text-[10px] truncate">
                          16 Vakalık Tam Sezon Yüklendi — Zorluk seçerek hemen oyna
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-primary shrink-0">→</span>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setJoinModalOpen(true)}
                    className="w-full p-4 sm:p-5 rounded-[6px] bg-crimson hover:bg-crimson/95 text-white text-left border border-crimson shadow-crimson transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-2 py-0.5 rounded-[2px] bg-black/30 font-mono text-[10px] font-bold tracking-wider uppercase">
                        MASAYA BAĞLAN • 6 HANELİ KOD / QR
                      </span>
                      <KeyRound size={20} />
                    </div>
                    <div className="font-sans font-bold text-lg sm:text-xl">1. ODAYA KATIL</div>
                    <p className="font-mono text-xs text-white/85 mt-1">
                      Arkadaşının kurduğu masaya 6 haneli oda kodunu tuşlayarak ücretsiz katıl.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => openCasePickerForMode('DUO')}
                    className="w-full p-4 sm:p-5 rounded-[6px] bg-surface hover:bg-elevated text-left border border-subtle hover:border-crimson/60 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-2 py-0.5 rounded-[2px] bg-elevated font-mono text-[10px] text-amber font-bold uppercase">
                        2 KİŞİ (DUO) VEYA 3-6 KİŞİ (KİRLİ POLİS)
                      </span>
                      <Users size={20} className="text-crimson" />
                    </div>
                    <div className="font-sans font-bold text-lg sm:text-xl text-primary">
                      2. ODA KUR (ÇOK OYUNCULU)
                    </div>
                    <p className="font-mono text-xs text-secondary mt-1">
                      Zorluk derecesini ve vakayı seç; kanıtlar telefonlara asimetrik bölünsün.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => openCasePickerForMode('SOLO')}
                    className="w-full p-4 sm:p-5 rounded-[6px] bg-surface hover:bg-elevated text-left border border-subtle hover:border-amber/60 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-2 py-0.5 rounded-[2px] bg-elevated font-mono text-[10px] text-emerald font-bold uppercase">
                        16 VAKA • KOLAY / ORTA / UZMAN ZORLUK
                      </span>
                      <FolderArchive size={20} className="text-amber" />
                    </div>
                    <div className="font-sans font-bold text-lg sm:text-xl text-primary">
                      3. ARŞİV MODU (TEK KİŞİLİK)
                    </div>
                    <p className="font-mono text-xs text-secondary mt-1">
                      Merkez Arşiv Veritabanı'na bağlan. Sınırlı sorgu jetonlarıyla soğuk vakaları
                      çöz.
                    </p>
                  </button>
                </div>

                {tutorialCase && (
                  <div className="p-3.5 rounded-[6px] bg-elevated border border-subtle flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-[4px] bg-surface border border-amber/40 flex items-center justify-center text-amber shrink-0 mt-0.5">
                        <GraduationCap size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-sans font-semibold text-xs sm:text-sm text-primary truncate">
                          {tutorialCase.meta.title}
                        </h4>
                        <p className="font-mono text-[11px] text-secondary mt-0.5">
                          90 saniyede ip çekme ve fosforlu kalem mekaniğini öğrenin.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => createRoom(tutorialCase.case_id, 'SOLO', 'EASY')}
                      className="min-h-[40px] px-3 py-2 rounded-[4px] bg-amber text-black font-mono text-xs font-bold shrink-0 hover:bg-amber/90"
                    >
                      EĞİTİM
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MAĞAZA */}
            {mainMenuTab === 'STORE' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-[6px] bg-surface border border-subtle">
                  <div className="flex items-center gap-2 font-mono text-xs text-amber font-bold mb-1">
                    <ShieldCheck size={15} />
                    <span>"ODA SAHİBİ ÖDER" KURALI</span>
                  </div>
                  <p className="font-mono text-xs text-secondary leading-relaxed">
                    Masadaki oyunculardan yalnızca odayı kuran kişinin pakete sahip olması
                    yeterlidir. Diğer 1-5 arkadaşınız oda kodunu girerek ücretsiz oynar.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-[6px] bg-elevated border-2 border-amber/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 rounded-[2px] bg-amber text-black font-mono text-[10px] font-bold uppercase">
                      TAM SEZON KARTI (16 VAKA)
                    </span>
                    <Sparkles size={17} className="text-amber" />
                  </div>
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-primary">
                    Tam Erişim Dedektif Aboneliği
                  </h3>
                  <p className="font-mono text-xs text-secondary mt-1 mb-3.5">
                    Başlangıç, Çiftlere Özel ve Zorlu Kriminal paketlerdeki tüm 16 vakaya anında
                    sınırsız erişim sağlayın.
                  </p>
                  <button
                    type="button"
                    disabled={subscriptionActive}
                    onClick={() => purchaseStoreItem(undefined, true)}
                    className={`w-full min-h-[46px] px-4 py-2.5 rounded-[4px] font-mono text-xs font-bold transition-all ${
                      subscriptionActive
                        ? 'bg-emerald/20 text-emerald border border-emerald/40'
                        : 'bg-amber text-black hover:bg-amber/90'
                    }`}
                  >
                    {subscriptionActive
                      ? '✓ TAM ERİŞİM ABONELİĞİNİZ AKTİF'
                      : 'TÜM 16 VAKAYI AÇ — ₺49,99 / AY'}
                  </button>
                </div>

                <div className="space-y-3">
                  {packs.map((pack) => {
                    const packCases = cases.filter((c) => c.pack_id === pack.pack_id);
                    const isOwned =
                      pack.price_tier === 0 ||
                      subscriptionActive ||
                      packCases.every((c) => c.is_unlocked);

                    return (
                      <div
                        key={pack.pack_id}
                        className="p-4 rounded-[6px] bg-surface border border-subtle flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs font-mono mb-1">
                            <span className="text-crimson font-bold">
                              [{pack.badge} • {packCases.length} VAKA]
                            </span>
                            <span className="text-primary font-bold">{pack.price_label}</span>
                          </div>
                          <h4 className="font-sans font-bold text-base text-primary">
                            {pack.title}
                          </h4>
                          <p className="font-mono text-xs text-secondary mt-0.5">{pack.subtitle}</p>
                        </div>

                        <button
                          type="button"
                          disabled={isOwned}
                          onClick={() => purchaseStoreItem(pack.pack_id, false)}
                          className={`min-h-[44px] px-4 py-2 rounded-[4px] font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                            isOwned
                              ? 'bg-emerald/15 text-emerald border border-emerald/40'
                              : 'bg-crimson text-white hover:bg-crimson/90'
                          }`}
                        >
                          {isOwned ? (
                            <>
                              <CheckCircle2 size={15} />
                              ARŞİVİNİZDE AÇIK
                            </>
                          ) : (
                            <>PAKETİ SATIN AL ({pack.price_label})</>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: RICH DETECTIVE PROFILE */}
            {mainMenuTab === 'PROFILE' && <ProfileScreen />}

            {/* TAB 4: ADLİ SİCİL KAYITLARI */}
            {mainMenuTab === 'HISTORY' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-sans font-bold text-sm sm:text-base text-primary">
                    Adli Sicil ve Maç Geçmişi ({history.length})
                  </h2>
                  <span className="font-mono text-xs text-amber font-bold">
                    Madalya: {user?.badges.length || 0}/{badgeCatalog.length}
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="p-8 rounded-[6px] bg-surface border border-subtle text-center font-mono text-xs text-secondary">
                    Henüz tamamlanmış bir vaka kaydınız bulunmuyor.
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.match_id}
                      className="p-3.5 rounded-[6px] bg-surface border border-subtle flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-secondary mb-1">
                          <span className="text-amber font-bold">#{item.case_id}</span>
                          <span>• {item.mode}</span>
                          {item.difficulty_preset && <span>• {item.difficulty_preset}</span>}
                        </div>
                        <h4 className="font-sans font-semibold text-xs sm:text-sm text-primary truncate">
                          {item.case_title}
                        </h4>
                        <div className="font-mono text-[10px] text-secondary mt-0.5">
                          {item.lead_detective} • {item.duration_sec} sn
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[2px] font-mono text-[10px] font-bold ${
                            item.is_solved
                              ? 'bg-emerald/15 text-emerald border border-emerald/40'
                              : 'bg-crimson/15 text-crimson border border-crimson/40'
                          }`}
                        >
                          {item.is_solved ? 'ÇÖZÜLDÜ' : 'BAŞARISIZ'}
                        </span>
                        <div className="font-mono text-[11px] text-secondary mt-1">
                          %{item.accuracy_rate} {item.xp_gained ? `(+${item.xp_gained} XP)` : ''}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 5: SUNUCU DURUMU & SİSTEM AYARLARI */}
            {mainMenuTab === 'SETTINGS' && (
              <div className="space-y-3.5">
                {/* Live Server Diagnostics & Cloud Switcher */}
                <div className="p-4 rounded-[6px] bg-surface border border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isOfflineMode ? (
                        <WifiOff size={16} className="text-amber" />
                      ) : (
                        <Wifi size={16} className="text-emerald" />
                      )}
                      <h3 className="font-sans font-semibold text-sm text-primary">
                        Sunucu ve Veritabanı Durumu
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await checkServerHealth();
                        if (ok) await initAuth();
                        showToast(
                          ok
                            ? '🌐 Canlı sunucu bağlantısı doğrulandı!'
                            : '📱 Uzak sunucuya ulaşılamadı, APK Yerel Motor aktif.'
                        );
                      }}
                      className="px-2.5 py-1 rounded-[4px] bg-elevated border border-subtle text-secondary hover:text-primary font-mono text-[10px] font-bold flex items-center gap-1"
                    >
                      <RefreshCw size={11} />
                      TEST ET
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="p-2.5 rounded-[4px] bg-primary border border-subtle">
                      <span className="text-[10px] text-muted block">ÇALIŞMA MODU:</span>
                      <span className={isOfflineMode ? 'text-amber font-bold' : 'text-emerald font-bold'}>
                        {isOfflineMode ? 'APK Çevrimdışı Motor' : 'Canlı WebSocket Sunucu'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-[4px] bg-primary border border-subtle">
                      <span className="text-[10px] text-muted block">VERİTABANI MOTORU:</span>
                      <span className="text-primary font-bold">
                        {serverHealth?.storage === 'postgresql'
                          ? 'PostgreSQL (Bulut)'
                          : serverHealth?.storage === 'local-json'
                          ? 'Yerel JSON + Bellek'
                          : 'APK LocalStorage'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-secondary uppercase mb-1 flex items-center gap-1.5">
                      <Server size={12} className="text-amber" />
                      CANLI BULUT VEYA LAN SUNUCU ADRESİ (APK / ÇOK OYUNCULU İÇİN):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={serverUrlInput}
                        onChange={(e) => setServerUrlInput(e.target.value)}
                        placeholder="Örn: http://192.168.1.10:3001 veya https://api..."
                        className="flex-1 px-3 py-2 rounded-[4px] bg-primary border border-subtle text-primary font-mono text-xs focus:outline-none focus:border-amber"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          setCustomServerUrl(serverUrlInput);
                          const ok = await checkServerHealth();
                          if (ok) await initAuth();
                          showToast(
                            ok
                              ? '🌐 Canlı sunucuya başarıyla bağlandı!'
                              : 'Sunucu adresi kaydedildi (Şu an çevrimdışı modda).'
                          );
                        }}
                        className="px-3.5 py-2 rounded-[4px] bg-crimson text-white font-mono text-xs font-bold shrink-0"
                      >
                        BAĞLAN
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audio Controls */}
                <div className="p-4 rounded-[6px] bg-surface border border-subtle space-y-3">
                  <h3 className="font-sans font-semibold text-sm text-primary">
                    Ses ve Atmosfer (Kafe Ergonomisi)
                  </h3>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-secondary flex items-center gap-2">
                      <Volume2 size={15} className="text-crimson shrink-0" />
                      Mikro Etkileşim Sesleri
                    </span>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`px-3 py-1.5 rounded-[4px] font-mono text-xs font-bold ${
                        !isMuted ? 'bg-emerald/20 text-emerald' : 'bg-crimson/20 text-crimson'
                      }`}
                    >
                      {!isMuted ? 'AÇIK' : 'SESSİZ MOD'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-subtle">
                    <span className="font-mono text-xs text-secondary flex items-center gap-2">
                      <Music size={15} className="text-amber shrink-0" />
                      Dark Ambient Döngüsü
                    </span>
                    <button
                      type="button"
                      onClick={toggleAmbient}
                      className={`px-3 py-1.5 rounded-[4px] font-mono text-xs font-bold ${
                        isAmbientOn ? 'bg-amber text-black' : 'bg-elevated text-secondary'
                      }`}
                    >
                      {isAmbientOn ? 'ÇALIYOR' : 'KAPALI'}
                    </button>
                  </div>
                </div>

                {/* KVKK / GDPR */}
                <div className="p-4 rounded-[6px] bg-surface border border-subtle space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-sans font-semibold text-sm text-primary">
                      KVKK / GDPR ve Mağaza Uyumluluğu
                    </h3>
                    <span className="px-2 py-0.5 rounded-[2px] bg-elevated font-mono text-[10px] text-amber font-bold">
                      PEGI 12
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={deleteAccount}
                    className="w-full min-h-[42px] px-3 py-2 rounded-[4px] bg-crimson/15 hover:bg-crimson/25 border border-crimson/40 text-crimson font-mono text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                    HESABIMI VE VERİLERİMİ KALICI OLARAK SİL
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 5-TAB MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="min-h-[62px] bg-surface border-t border-subtle grid grid-cols-5 shrink-0 safe-bottom">
        <button
          type="button"
          onClick={() => setMainMenuTab('HOME')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 font-mono text-[9px] sm:text-xs font-semibold border-t-2 ${
            mainMenuTab === 'HOME'
              ? 'border-crimson text-primary bg-elevated/60'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Home size={16} className={mainMenuTab === 'HOME' ? 'text-crimson' : ''} />
          <span>LOBİ</span>
        </button>

        <button
          type="button"
          onClick={() => setMainMenuTab('STORE')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 font-mono text-[9px] sm:text-xs font-semibold border-t-2 ${
            mainMenuTab === 'STORE'
              ? 'border-crimson text-primary bg-elevated/60'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <ShoppingBag size={16} className={mainMenuTab === 'STORE' ? 'text-crimson' : ''} />
          <span>MAĞAZA</span>
        </button>

        <button
          type="button"
          onClick={() => setMainMenuTab('PROFILE')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 font-mono text-[9px] sm:text-xs font-bold border-t-2 ${
            mainMenuTab === 'PROFILE'
              ? 'border-amber text-amber bg-elevated/80'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <BadgeCheck size={17} className={mainMenuTab === 'PROFILE' ? 'text-amber' : ''} />
          <span>PROFİL</span>
        </button>

        <button
          type="button"
          onClick={() => setMainMenuTab('HISTORY')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 font-mono text-[9px] sm:text-xs font-semibold border-t-2 ${
            mainMenuTab === 'HISTORY'
              ? 'border-crimson text-primary bg-elevated/60'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <History size={16} className={mainMenuTab === 'HISTORY' ? 'text-crimson' : ''} />
          <span>SİCİL</span>
        </button>

        <button
          type="button"
          onClick={() => setMainMenuTab('SETTINGS')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 font-mono text-[9px] sm:text-xs font-semibold border-t-2 ${
            mainMenuTab === 'SETTINGS'
              ? 'border-crimson text-primary bg-elevated/60'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Settings size={16} className={mainMenuTab === 'SETTINGS' ? 'text-crimson' : ''} />
          <span>SUNUCU</span>
        </button>
      </nav>

      {/* JOIN ROOM MODAL */}
      {isJoinModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-doc-open"
          onClick={() => setJoinModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-elevated border border-subtle rounded-t-[10px] sm:rounded-[6px] p-4 sm:p-5 shadow-2xl safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-sans font-bold text-base text-primary">
                6 Haneli Oda Kodunu Girin
              </h3>
              <button
                type="button"
                onClick={() => setJoinModalOpen(false)}
                className="w-8 h-8 rounded-[4px] bg-surface border border-subtle text-secondary hover:text-primary flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) =>
                setJoinCodeInput(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
                )
              }
              placeholder="489K2M"
              maxLength={6}
              className="w-full py-3 px-4 rounded-[4px] bg-primary border-2 border-subtle focus:border-crimson text-center font-mono font-bold text-2xl tracking-[6px] text-primary uppercase mb-3 focus:outline-none"
            />

            <div className="grid grid-cols-8 gap-1.5 mb-3">
              {'23456789ABCDEFGH'.split('').map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => handleNumpadChar(ch)}
                  className="h-9 rounded-[4px] bg-surface hover:bg-crimson/20 border border-subtle font-mono text-xs font-bold text-primary"
                >
                  {ch}
                </button>
              ))}
              {'JKMNPQRSTUVWXYZ'.split('').map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => handleNumpadChar(ch)}
                  className="h-9 rounded-[4px] bg-surface hover:bg-crimson/20 border border-subtle font-mono text-xs font-bold text-primary"
                >
                  {ch}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setJoinCodeInput((p) => p.slice(0, -1))}
                className="h-9 rounded-[4px] bg-crimson/20 border border-crimson/40 font-mono text-xs font-bold text-crimson"
              >
                ⌫
              </button>
            </div>

            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-[4px] bg-crimson/15 border border-crimson/40 font-mono text-xs text-crimson">
                {errorMessage}
              </div>
            )}

            {qrScanningSim && (
              <div className="mb-3 p-3 rounded-[4px] bg-primary border border-dashed border-amber text-center font-mono text-xs text-amber">
                📷 Kamera QR Tarayıcı Aktif — Masadaki Oda Sahibinin QR kodunu hizalayın...
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setQrScanningSim((v) => !v);
                }}
                className="px-3 py-3 rounded-[4px] bg-surface border border-subtle hover:border-amber text-secondary hover:text-primary font-mono text-xs font-bold flex items-center gap-1.5"
              >
                <QrCode size={15} className="text-amber" />
                QR
              </button>
              <button
                type="button"
                disabled={joinCodeInput.length < 4}
                onClick={() => joinRoom(joinCodeInput)}
                className="flex-1 min-h-[46px] px-4 py-3 rounded-[4px] bg-crimson hover:bg-crimson/90 disabled:bg-surface disabled:text-muted text-white font-mono text-xs font-bold shadow-crimson"
              >
                MASAYA BAĞLAN →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
