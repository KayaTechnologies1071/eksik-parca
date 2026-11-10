import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { ProceduralDocumentView, SuspectCardView } from './ProceduralTemplates';
import { EvidenceBoardCanvas } from './EvidenceBoardCanvas';
import { DocumentModal } from './DocumentModal';
import { EndgameNewspaper } from './EndgameNewspaper';
import { HowToPlayModal } from './HowToPlayModal';
import {
  FileText,
  FolderLock,
  Network,
  Gavel,
  Volume2,
  VolumeX,
  Fingerprint,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  PlusCircle,
  Eye,
  NotebookPen,
  Activity,
  X,
  HelpCircle,
} from 'lucide-react';

export const GameplayScreen: React.FC = () => {
  const {
    user,
    room,
    gameplayTab,
    isMuted,
    unreadBoardCount,
    serverTimeOffset,
    lastPing,
    penaltyAlert,
    reconnecting,
    suspectMarks,
    detectiveNotes,
    setGameplayTab,
    setInspectedNodeId,
    cycleSuspectMark,
    setDetectiveNotes,
    toggleMute,
    unlockArchiveNode,
    rewardExtraToken,
    toggleHighlight,
    pinNodeToBoard,
    pingItem,
    castVote,
    leaveRoom,
  } = useGameStore();

  const [roleCurtainDismissed, setRoleCurtainDismissed] = useState(false);
  const [isHoldingRoleButton, setIsHoldingRoleButton] = useState(false);
  const [selectedSuspectId, setSelectedSuspectId] = useState<string>('');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [fileFilter, setFileFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(900);

  useEffect(() => {
    const updateClock = () => {
      if (!room?.match_end_timestamp) return;
      const nowServer = Date.now() + serverTimeOffset;
      const diffSec = Math.max(0, Math.floor((room.match_end_timestamp - nowServer) / 1000));
      setRemainingSeconds(diffSec);
    };
    updateClock();
    const interval = setInterval(updateClock, 250);
    return () => clearInterval(interval);
  }, [room?.match_end_timestamp, serverTimeOffset]);

  useEffect(() => {
    if (room?.suspects?.length && !selectedSuspectId) {
      setSelectedSuspectId(room.suspects[0].id);
    }
  }, [room?.case_id, room?.suspects, selectedSuspectId]);

  if (!room || !user) return null;

  if (room.status === 'ENDED' && room.endgame_result) {
    return <EndgameNewspaper />;
  }

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timerString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isCriticalTime = remainingSeconds <= 120;

  const availableAccuseNodesMap = new Map<string, { id: string; title: string; category: string }>();
  for (const n of room.my_nodes) {
    if (n.unlocked) {
      availableAccuseNodesMap.set(n.node_id, {
        id: n.node_id,
        title: n.title,
        category: n.category,
      });
    }
  }
  for (const b of room.board_nodes) {
    availableAccuseNodesMap.set(b.node_id, {
      id: b.node_id,
      title: b.title,
      category: b.category,
    });
  }
  const availableAccuseNodes = Array.from(availableAccuseNodesMap.values());

  const filteredFiles = room.my_nodes.filter((n) => {
    if (fileFilter === 'UNLOCKED') return n.unlocked;
    if (fileFilter === 'LOCKED') return !n.unlocked;
    return true;
  });

  const handleToggleEvidenceSlot = (nodeId: string) => {
    setSelectedEvidenceIds((prev) => {
      if (prev.includes(nodeId)) {
        return prev.filter((id) => id !== nodeId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), nodeId];
      }
      return [...prev, nodeId];
    });
  };

  const showInitialRoleCurtain = room.mode !== 'SOLO' && !roleCurtainDismissed;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-primary relative">
      {/* 1. HOLD-TO-REVEAL SECRET ROLE CURTAIN */}
      {showInitialRoleCurtain && (
        <div className="fixed inset-0 z-50 bg-primary/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-[6px] bg-surface border border-subtle shadow-2xl">
            <div className="font-mono text-[11px] text-amber uppercase tracking-widest mb-1.5">
              [ KAFE ERGONOMİSİ — GİZLİ ROL PERDESİ ]
            </div>
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-primary mb-2">
              Kimliğinizi Kontrol Edin
            </h2>
            <p className="font-mono text-xs text-secondary mb-5 leading-relaxed">
              Yan gözle ekranın görülmesini önlemek için aşağıdaki butona{' '}
              <strong className="text-primary">parmağınızı basılı tutun</strong>.
            </p>

            <div
              className={`min-h-[145px] p-4 rounded-[6px] border-2 mb-5 flex flex-col items-center justify-center transition-all ${
                !isHoldingRoleButton
                  ? 'bg-primary border-dashed border-subtle'
                  : room.my_role === 'KİRLİ_POLİS'
                  ? 'bg-crimson/15 border-crimson shadow-crimson'
                  : 'bg-emerald/15 border-emerald shadow-emerald'
              }`}
            >
              {!isHoldingRoleButton ? (
                <div className="flex flex-col items-center text-muted font-mono text-xs">
                  <Fingerprint size={32} className="mb-2 text-secondary" />
                  <span>GİZLİ — BASILI TUTUN</span>
                </div>
              ) : room.my_role === 'KİRLİ_POLİS' ? (
                <div className="font-mono text-center space-y-1.5">
                  <div className="text-xs font-bold text-crimson uppercase">⚠️ GİZLİ ROLÜNÜZ:</div>
                  <div className="text-lg sm:text-xl font-extrabold text-crimson">
                    KİRLİ POLİS (HAİN!)
                  </div>
                  {room.dirty_cop_intel && (
                    <div className="text-xs text-primary mt-2 space-y-1 bg-primary/70 p-2.5 rounded-[4px] border border-crimson/40">
                      <div>
                        GERÇEK KATİL:{' '}
                        <strong className="text-crimson">
                          {room.dirty_cop_intel.real_killer_name}
                        </strong>
                      </div>
                      <div>
                        HEDEF ŞÜPHELİ:{' '}
                        <strong className="text-amber">
                          {room.dirty_cop_intel.frame_target_name}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="font-mono text-center space-y-1.5">
                  <div className="text-xs font-bold text-emerald uppercase">✓ GİZLİ ROLÜNÜZ:</div>
                  <div className="text-lg sm:text-xl font-extrabold text-emerald">
                    SAHA DEDEKTİFİ
                  </div>
                  <p className="text-xs text-secondary max-w-xs">
                    Çelişkileri yakalayın ve gerçek katili 3 kanıtla tutuklayın!
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onPointerDown={() => setIsHoldingRoleButton(true)}
              onPointerUp={() => setIsHoldingRoleButton(false)}
              onPointerLeave={() => setIsHoldingRoleButton(false)}
              className="w-full min-h-[52px] px-4 py-3 rounded-[4px] bg-crimson text-white font-mono text-xs font-bold tracking-wider uppercase shadow-crimson mb-2.5 touch-none"
            >
              👆 BASILI TUTARAK ROLÜ GÖR
            </button>

            <button
              type="button"
              onClick={() => setRoleCurtainDismissed(true)}
              className="w-full min-h-[42px] px-4 py-2 rounded-[4px] bg-elevated hover:bg-surface border border-subtle text-secondary hover:text-primary font-mono text-xs"
            >
              SORUŞTURMAYA BAŞLA →
            </button>
          </div>
        </div>
      )}

      {/* 2. MOBILE-RESPONSIVE TOP STATUS HUD BAR */}
      <header className="min-h-[54px] px-2.5 py-1.5 bg-surface border-b border-subtle flex items-center justify-between gap-1.5 shrink-0 z-20 safe-top">
        {/* Left: Exit + Case ID + Role */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={leaveRoom}
            title="Vakadan Çık"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-[4px] bg-elevated border border-subtle hover:border-crimson text-secondary hover:text-primary flex items-center justify-center shrink-0"
          >
            <LogOut size={14} />
          </button>
          <div className="min-w-0">
            <div className="font-mono text-[11px] sm:text-xs font-bold text-primary flex items-center gap-1 truncate">
              <span>{room.case_id}</span>
              <span
                className={`px-1 py-0.5 rounded-[2px] text-[9px] font-bold ${
                  room.difficulty_preset === 'HARDCORE'
                    ? 'bg-crimson/20 text-crimson'
                    : room.difficulty_preset === 'EASY'
                    ? 'bg-emerald/20 text-emerald'
                    : 'bg-elevated text-secondary'
                }`}
              >
                {room.difficulty_preset === 'HARDCORE'
                  ? 'ZOR'
                  : room.difficulty_preset === 'EASY'
                  ? 'KOLAY'
                  : 'NORMAL'}
              </span>
            </div>
            {room.mode !== 'SOLO' && (
              <button
                type="button"
                onClick={() => setRoleCurtainDismissed(false)}
                className="font-mono text-[9px] text-amber underline block"
              >
                Gizli Rolüm
              </button>
            )}
          </div>
        </div>

        {/* Center: Countdown Timer & Compact Solo Archive Tokens */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <div
              className={`font-mono font-bold text-base sm:text-xl tracking-wider px-2 py-0.5 rounded-[4px] border ${
                isCriticalTime
                  ? 'text-crimson border-crimson/60 bg-crimson/10 animate-pulse'
                  : 'text-primary border-subtle bg-elevated/60'
              }`}
            >
              {timerString}
            </div>
            {penaltyAlert && Date.now() - penaltyAlert.timestamp < 2200 && (
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono font-bold text-[10px] text-crimson animate-bounce whitespace-nowrap">
                -00:{penaltyAlert.penalty_seconds}!
              </span>
            )}
          </div>

          {room.mode === 'SOLO' && (
            <div
              className="px-2 py-1 rounded-[4px] bg-elevated border border-amber/40 font-mono text-[11px] font-bold text-amber flex items-center gap-1"
              title="Kalan Merkez Arşiv Sorgu Jetonu"
            >
              <span>♦</span>
              <span>
                {room.solo_tokens}/{room.solo_token_limit}
              </span>
            </div>
          )}
        </div>

        {/* Right: Help, Activity Log, Mute & Quick SUÇLA */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsHowToPlayOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-[4px] bg-elevated border border-amber/40 hover:border-amber text-amber flex items-center justify-center"
            title="Nasıl Oynanır? — Dedektif Saha Rehberi"
          >
            <HelpCircle size={15} />
          </button>

          <button
            type="button"
            onClick={() => setLogDrawerOpen((v) => !v)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-[4px] bg-elevated border border-subtle hover:border-amber text-secondary hover:text-primary flex items-center justify-center"
            title="Canlı Masa Kayıtları ve Notlar"
          >
            <Activity size={15} />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-[4px] border flex items-center justify-center ${
              isMuted
                ? 'bg-crimson/15 border-crimson/40 text-crimson'
                : 'bg-elevated border-subtle text-secondary hover:text-primary'
            }`}
            title={isMuted ? 'Sessiz Mod Aktif' : 'Sesi Kapat'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            type="button"
            onClick={() => setGameplayTab('ACCUSE')}
            className="h-8 sm:h-9 px-2.5 rounded-[4px] bg-crimson hover:bg-crimson/90 text-white font-mono text-[11px] font-bold"
          >
            SUÇLA
          </button>
        </div>
      </header>

      {/* Reconnecting Strip */}
      {reconnecting && (
        <div className="h-[24px] px-3 bg-amber text-black font-mono text-[11px] font-bold flex items-center justify-center gap-2 shrink-0">
          <span>⚡ Bağlantı yenileniyor... Masa senkronize ediliyor.</span>
        </div>
      )}

      {/* Tutorial Stepper Banner */}
      {room.case_meta?.is_tutorial && (
        <div className="px-3 py-1.5 bg-amber/15 border-b border-amber/30 flex items-center gap-2 text-[11px] font-mono text-amber shrink-0">
          <Sparkles size={13} className="shrink-0" />
          <span className="leading-snug">
            {room.verified_edges.length === 0
              ? 'EĞİTİM 1/2: "2. DOSYAM" sekmesinden TUT-01 ve TUT-04 belgelerini açıp tahtaya iğneleyin ve "3. TAHTA"da birbirine bağlayın!'
              : 'EĞİTİM 2/2: Çıkarım açıldı! Şimdi "4. TUTUKLA" sekmesinden Mert Vural ve 3 kanıtı seçip mühürleyin!'}
          </span>
        </div>
      )}

      {/* 3. MIDDLE CONTENT AREA */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {/* TAB 1: VAKA ÖZETİ, ŞÜPHELİ MATRİSİ VE DEDEKTİF NOT DEFTERİ */}
        {gameplayTab === 'BRIEFING' && (
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 max-w-2xl mx-auto w-full">
            <div className="doc-official p-3.5 sm:p-4 rounded-[6px] border border-subtle">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-crimson font-bold pb-2 mb-2 border-b border-subtle">
                <span>[OLAY YERİ TUTANAĞI]</span>
                <span>KEŞİF: {room.briefing?.time_of_discovery}</span>
              </div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-primary mb-2">
                {room.case_meta?.title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs mb-3 p-2.5 rounded-[4px] bg-primary/60 border border-subtle">
                <div>
                  <span className="text-muted block text-[10px]">MAKTUL (KURBAN):</span>
                  <span className="text-amber font-semibold">{room.briefing?.victim}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">OLAY YERİ:</span>
                  <span className="text-primary">{room.briefing?.location}</span>
                </div>
              </div>
              <p className="font-mono text-xs sm:text-sm text-primary/90 leading-relaxed">
                {room.briefing?.summary}
              </p>
            </div>

            {/* Suspect Profiles with Interactive Elimination Marks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-sans font-semibold text-xs sm:text-sm text-primary uppercase tracking-wider">
                  ŞÜPHELİ PROFİLLERİ ({room.suspects.length})
                </h3>
                <span className="font-mono text-[10px] text-secondary">
                  Hedef / Temiz olarak işaretleyin
                </span>
              </div>
              <div className="space-y-2.5">
                {room.suspects.map((suspect) => {
                  const isPinged =
                    lastPing?.target_type === 'SUSPECT' &&
                    lastPing.target_id === suspect.id &&
                    Date.now() - lastPing.timestamp < 3000;
                  return (
                    <SuspectCardView
                      key={suspect.id}
                      suspect={suspect}
                      mark={suspectMarks[suspect.id] || 'NEUTRAL'}
                      isPinged={Boolean(isPinged)}
                      onCycleMark={() => cycleSuspectMark(suspect.id)}
                      onPing={() => pingItem('SUSPECT', suspect.id, suspect.name)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Personal Detective Notebook */}
            <div className="p-3.5 rounded-[6px] bg-surface border border-subtle">
              <div className="flex items-center gap-1.5 font-mono text-xs text-amber font-bold mb-2">
                <NotebookPen size={14} />
                <span>KİŞİSEL SORUŞTURMA NOTLARIM (GİZLİ)</span>
              </div>
              <textarea
                value={detectiveNotes}
                onChange={(e) => setDetectiveNotes(e.target.value)}
                rows={3}
                placeholder="Saat çelişkilerini, plaka kodlarını veya şüphelendiğiniz kişileri buraya not alın..."
                className="w-full p-2.5 rounded-[4px] bg-primary border border-subtle focus:border-amber text-primary font-mono text-xs focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* TAB 2: GİZLİ DOSYAM / MERKEZ ARŞİV */}
        {gameplayTab === 'FILES' && (
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 max-w-2xl mx-auto w-full">
            <div className="p-3.5 rounded-[6px] bg-surface border border-subtle flex items-center justify-between gap-2.5">
              <div className="min-w-0">
                <h3 className="font-sans font-semibold text-xs sm:text-sm text-primary">
                  {room.mode === 'SOLO'
                    ? 'Merkez Arşiv Veritabanı (Kısıtlı Yetki)'
                    : 'Gizli Dosyam (Asimetrik Klasör)'}
                </h3>
                <p className="font-mono text-[11px] text-secondary mt-0.5">
                  {room.mode === 'SOLO'
                    ? `Kalan Sorgu Jetonu: ${room.solo_tokens} ♦`
                    : room.difficulty_preset === 'HARDCORE'
                    ? 'Başkomiser Modu: Hazır kelime ipuçları gizlidir, metni dikkatle inceleyin.'
                    : 'Kritik bulguları [📌 ORTAK TAHTAYA İĞNELE] ile paylaşın.'}
                </p>
              </div>
              {room.mode === 'SOLO' && (
                <button
                  type="button"
                  onClick={rewardExtraToken}
                  className="px-2.5 py-2 rounded-[4px] bg-amber/15 hover:bg-amber/25 border border-amber/40 text-amber font-mono text-[11px] font-bold flex items-center gap-1 shrink-0"
                >
                  <PlusCircle size={13} />
                  +1 JETON
                </button>
              )}
            </div>

            {/* Quick Mobile Filter Pills for Solo Mode */}
            {room.mode === 'SOLO' && (
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'ALL', label: `TÜMÜ (${room.my_nodes.length})` },
                    {
                      id: 'UNLOCKED',
                      label: `AÇIK (${room.my_nodes.filter((n) => n.unlocked).length})`,
                    },
                    {
                      id: 'LOCKED',
                      label: `KİLİTLİ (${room.my_nodes.filter((n) => !n.unlocked).length})`,
                    },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFileFilter(f.id)}
                    className={`py-1.5 px-2 rounded-[4px] font-mono text-[11px] font-bold border transition-all ${
                      fileFilter === f.id
                        ? 'bg-crimson text-white border-crimson'
                        : 'bg-surface text-secondary border-subtle'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {filteredFiles.map((node) => {
                const isPinned = room.board_nodes.some((b) => b.node_id === node.node_id);

                if (!node.unlocked) {
                  return (
                    <div
                      key={node.node_id}
                      className="p-3.5 rounded-[6px] bg-surface border border-subtle flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-[4px] bg-elevated border border-amber/40 flex items-center justify-center text-amber shrink-0">
                          <Lock size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-secondary">
                            <span className="text-amber">[{node.category}]</span>
                            <span>{node.file_no}</span>
                          </div>
                          <h4 className="font-sans font-semibold text-xs sm:text-sm text-primary truncate">
                            {node.title}
                          </h4>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => unlockArchiveNode(node.node_id)}
                        className="min-h-[42px] px-3 py-2 rounded-[4px] bg-amber text-black font-mono text-xs font-bold shrink-0 hover:bg-amber/90 transition-all"
                      >
                        🔓 AÇ ({node.solo_cost}♦)
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={node.node_id}
                    onClick={() => setInspectedNodeId(node.node_id)}
                    className="cursor-pointer transition-transform active:scale-[0.99]"
                  >
                    <ProceduralDocumentView
                      node={node}
                      activeHighlights={room.my_highlights}
                      isPinned={isPinned}
                      onToggleKeyword={toggleHighlight}
                      onPin={() => pinNodeToBoard(node.node_id)}
                      onPing={() => pingItem('NODE', node.node_id, node.title)}
                    />
                    <div className="mt-1 flex items-center justify-end gap-1 font-mono text-[10px] text-secondary px-1">
                      <Eye size={11} />
                      <span>Tam ekran okuma ve [A+/A-] büyütme için dokunun</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: RESPONSIVE 2D EVIDENCE BOARD CANVAS */}
        {gameplayTab === 'BOARD' && <EvidenceBoardCanvas />}

        {/* TAB 4: SUÇLAMA VE OYLAMA EKRANI */}
        {gameplayTab === 'ACCUSE' && (
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 max-w-2xl mx-auto w-full">
            <div className="p-3.5 rounded-[6px] bg-surface border border-subtle">
              <div className="font-mono text-xs text-crimson font-bold uppercase mb-1">
                [ NİHAİ TUTUKLAMA EMRİ — ÇÖZÜM ÜÇGENİ ]
              </div>
              <p className="font-mono text-xs text-secondary leading-relaxed">
                Katili ve suçlamayı kanıtlayan 3 temel delili (<strong>Neden</strong>,{' '}
                <strong>Fırsat</strong>, <strong>Fiziksel Kanıt</strong>) seçip mühürleyin.
                {room.difficulty_preset === 'HARDCORE' && (
                  <span className="block text-crimson font-bold mt-1">
                    🔴 Başkomiser Modu Aktif: 3/3 kanıtın tamamı eksiksiz doğru olmalıdır!
                  </span>
                )}
              </p>
            </div>

            {/* Step 1: Suspect Selection */}
            <div>
              <h3 className="font-sans font-semibold text-xs sm:text-sm text-primary uppercase mb-2">
                ADIM 1 — TUTUKLANACAK ŞÜPHELİ:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {room.suspects.map((s) => {
                  const isSelected = selectedSuspectId === s.id;
                  const mark = suspectMarks[s.id];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSuspectId(s.id)}
                      className={`p-3 rounded-[6px] text-left border-2 transition-all ${
                        isSelected
                          ? 'bg-elevated border-crimson shadow-crimson'
                          : 'bg-surface border-subtle hover:border-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] text-amber uppercase truncate">
                          {s.role}
                        </span>
                        {isSelected ? (
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-crimson text-white font-mono text-[9px] font-bold shrink-0">
                            SEÇİLDİ
                          </span>
                        ) : mark === 'CLEARED' ? (
                          <span className="font-mono text-[9px] text-emerald shrink-0">TEMİZ</span>
                        ) : null}
                      </div>
                      <div className="font-sans font-bold text-sm text-primary">{s.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: 3 Evidence Dropzones */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-sans font-semibold text-xs sm:text-sm text-primary uppercase">
                  ADIM 2 — 3 KANIT YUVASI ({selectedEvidenceIds.length}/3):
                </h3>
                {selectedEvidenceIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedEvidenceIds([])}
                    className="font-mono text-xs text-crimson underline"
                  >
                    Temizle
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3.5">
                {['1. NEDEN (MOTIVE)', '2. FIRSAT (ALİBİ)', '3. FİZİKSEL KANIT'].map(
                  (slotLabel, idx) => {
                    const evId = selectedEvidenceIds[idx];
                    const evObj = availableAccuseNodes.find((a) => a.id === evId);
                    return (
                      <div
                        key={slotLabel}
                        onClick={() => evId && handleToggleEvidenceSlot(evId)}
                        className={`p-3 rounded-[6px] min-h-[68px] border flex flex-col justify-between cursor-pointer transition-all ${
                          evObj
                            ? 'bg-elevated border-emerald text-primary'
                            : 'bg-surface/50 border-dashed border-subtle text-muted'
                        }`}
                      >
                        <span className="font-mono text-[10px] text-secondary font-bold">
                          {slotLabel}
                        </span>
                        {evObj ? (
                          <div className="mt-1">
                            <span className="font-mono text-[10px] text-emerald font-bold mr-1.5">
                              #{evObj.id}
                            </span>
                            <span className="font-sans font-semibold text-xs text-primary">
                              {evObj.title}
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-[11px] text-muted mt-1">
                            Aşağıdan dokunarak ekleyin
                          </span>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableAccuseNodes.map((item) => {
                  const isChosen = selectedEvidenceIds.includes(item.id);
                  const isInference = item.category === 'ÇIKARIM';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleEvidenceSlot(item.id)}
                      className={`p-2.5 sm:p-3 rounded-[4px] border text-left flex items-center justify-between gap-2 transition-all ${
                        isChosen
                          ? 'bg-emerald/15 border-emerald text-primary'
                          : isInference
                          ? 'bg-surface border-amber/40 text-primary hover:border-amber'
                          : 'bg-surface border-subtle text-secondary hover:text-primary'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className={isInference ? 'text-amber font-bold' : 'text-crimson'}>
                            [{item.category}]
                          </span>
                          <span>#{item.id}</span>
                        </div>
                        <div className="font-sans font-semibold text-xs text-primary truncate mt-0.5">
                          {item.title}
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-[4px] flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                          isChosen
                            ? 'bg-emerald text-black'
                            : 'bg-elevated text-muted border border-subtle'
                        }`}
                      >
                        {isChosen ? '✓' : '+'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Simultaneous Sealing */}
            <div className="p-4 rounded-[6px] bg-surface border border-subtle">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-secondary uppercase">
                  ADIM 3 — MASA ONAYI:
                </span>
                <div className="flex items-center gap-1.5">
                  {room.players.map((p) => {
                    const initials = p.display_name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <div
                        key={p.user_id}
                        title={`${p.display_name}: ${p.has_voted ? 'Mühürledi' : 'Bekleniyor'}`}
                        className={`w-7 h-7 rounded-full font-mono text-[11px] font-bold flex items-center justify-center border-2 ${
                          p.has_voted
                            ? 'bg-emerald text-black border-emerald shadow-emerald'
                            : 'bg-elevated text-secondary border-subtle'
                        }`}
                      >
                        {initials}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedEvidenceIds.length < 3 && (
                <div className="mb-3 p-2.5 rounded-[4px] bg-amber/10 border border-amber/30 font-mono text-xs text-amber flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Kararı mühürlemek için 3 kanıt yuvasını doldurun.</span>
                </div>
              )}

              <button
                type="button"
                disabled={!selectedSuspectId || selectedEvidenceIds.length !== 3}
                onClick={() => castVote(selectedSuspectId, selectedEvidenceIds)}
                className={`w-full min-h-[50px] px-4 py-3 rounded-[4px] font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedSuspectId && selectedEvidenceIds.length === 3
                    ? 'bg-crimson hover:bg-crimson/90 text-white shadow-crimson'
                    : 'bg-elevated text-muted cursor-not-allowed'
                }`}
              >
                <CheckCircle2 size={17} />
                {room.my_vote ? 'KARARINIZ MÜHÜRLENDİ (GÜNCELLE)' : 'KARARI MÜHÜRLE VE TUTUKLA'}
              </button>
            </div>
          </div>
        )}

        {/* Live Table Activity Log Drawer */}
        {logDrawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setLogDrawerOpen(false)}
          >
            <div
              className="w-full max-w-md bg-elevated border border-subtle rounded-t-[10px] sm:rounded-[6px] max-h-[75vh] flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 bg-surface border-b border-subtle flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber uppercase">
                  📡 CANLI MASA HAREKET KAYDI ({room.activity_log.length})
                </span>
                <button
                  type="button"
                  onClick={() => setLogDrawerOpen(false)}
                  className="text-secondary hover:text-primary"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-3.5 overflow-y-auto space-y-2 font-mono text-xs">
                {room.activity_log.length === 0 ? (
                  <div className="text-secondary text-center py-6">Henüz kayıt yok.</div>
                ) : (
                  room.activity_log.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-[4px] bg-surface border border-subtle flex items-start justify-between gap-2"
                    >
                      <span className="text-primary leading-snug">{log.text}</span>
                      <span className="text-[10px] text-muted shrink-0">{log.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. MOBILE-OPTIMIZED BOTTOM NAVIGATION BAR (With iOS/Android Safe Area Inset) */}
      <nav className="min-h-[62px] bg-surface border-t border-subtle grid grid-cols-4 shrink-0 z-20 safe-bottom">
        <button
          type="button"
          onClick={() => setGameplayTab('BRIEFING')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 font-mono text-[10px] sm:text-xs font-semibold transition-all border-t-2 ${
            gameplayTab === 'BRIEFING'
              ? 'border-crimson text-primary bg-elevated/60'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <FileText size={17} className={gameplayTab === 'BRIEFING' ? 'text-crimson' : ''} />
          <span>1. ÖZET</span>
        </button>

        <button
          type="button"
          onClick={() => setGameplayTab('FILES')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 font-mono text-[10px] sm:text-xs font-semibold transition-all border-t-2 ${
            gameplayTab === 'FILES'
              ? 'border-crimson text-primary bg-elevated/60'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <FolderLock size={17} className={gameplayTab === 'FILES' ? 'text-crimson' : ''} />
          <span>2. DOSYAM</span>
        </button>

        <button
          type="button"
          onClick={() => setGameplayTab('BOARD')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 font-mono text-[10px] sm:text-xs font-semibold transition-all border-t-2 relative ${
            gameplayTab === 'BOARD'
              ? 'border-crimson text-primary bg-elevated/60'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <div className="relative">
            <Network size={17} className={gameplayTab === 'BOARD' ? 'text-crimson' : ''} />
            {unreadBoardCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-crimson text-white text-[9px] font-bold flex items-center justify-center animate-bounce">
                {unreadBoardCount}
              </span>
            )}
          </div>
          <span>3. TAHTA</span>
        </button>

        <button
          type="button"
          onClick={() => setGameplayTab('ACCUSE')}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 font-mono text-[10px] sm:text-xs font-semibold transition-all border-t-2 ${
            gameplayTab === 'ACCUSE'
              ? 'border-crimson text-primary bg-elevated/60'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Gavel size={17} className={gameplayTab === 'ACCUSE' ? 'text-crimson' : ''} />
          <span>4. TUTUKLA</span>
        </button>
      </nav>

      <DocumentModal />
      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
    </div>
  );
};
