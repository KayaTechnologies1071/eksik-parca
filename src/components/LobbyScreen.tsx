import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { ProceduralQrCode } from './ProceduralTemplates';
import { HowToPlayModal } from './HowToPlayModal';
import { DifficultyPreset } from '../types/game';
import {
  Copy,
  Check,
  UserPlus,
  Play,
  ArrowLeft,
  Shield,
  Bot,
  ExternalLink,
  CheckCircle2,
  Gauge,
  BookOpen,
} from 'lucide-react';

export const LobbyScreen: React.FC = () => {
  const {
    user,
    room,
    toggleReady,
    setRoomDifficultyPreset,
    addBotPlayer,
    startMatch,
    leaveRoom,
    showToast,
  } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  if (!room || !user) return null;

  const formattedCode =
    room.room_code.length === 6
      ? `${room.room_code.slice(0, 3)}-${room.room_code.slice(3)}`
      : room.room_code;

  const isHost = room.host_user_id === user.id;
  const allReady = room.players.every((p) => p.is_ready);
  const myPlayer = room.players.find((p) => p.user_id === user.id);

  const slots = Array.from({ length: 6 }, (_, idx) => room.players[idx] || null);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(room.room_code);
    setCopied(true);
    showToast(`Oda Kodu kopyalandı: ${room.room_code}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSecondTab = () => {
    const url = `${window.location.origin}/?join=${room.room_code}`;
    window.open(url, '_blank');
  };

  const diffOptions: { id: DifficultyPreset; label: string; desc: string }[] = [
    { id: 'EASY', label: '🟢 AKADEMİ', desc: '+%35 Süre • İpucu Açık • -15sn Ceza' },
    { id: 'STANDARD', label: '🟡 STANDART', desc: 'Şartname Dengesi • -30sn Ceza' },
    { id: 'HARDCORE', label: '🔴 BAŞKOMİSER', desc: 'Kısıtlı Süre • Gizli Vurgu • 3/3 Tam Kanıt' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 flex flex-col max-w-xl mx-auto w-full safe-bottom">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <button
          type="button"
          onClick={leaveRoom}
          className="min-h-[42px] px-3 py-2 rounded-[4px] bg-surface border border-subtle hover:border-crimson text-secondary hover:text-primary font-mono text-xs flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          AYRIL
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsHowToPlayOpen(true)}
            className="min-h-[36px] px-2.5 py-1 rounded-[4px] bg-elevated border border-amber/40 hover:border-amber text-amber font-mono text-[11px] font-bold flex items-center gap-1"
          >
            <BookOpen size={13} />
            <span>NASIL OYNANIR?</span>
          </button>
          <span className="px-2.5 py-1 rounded-[2px] bg-crimson/20 text-crimson border border-crimson/40 font-mono text-[11px] font-bold">
            {room.players.length >= 3
              ? 'GRUP MODU (KİRLİ POLİS)'
              : 'DUO MODU (2 KİŞİLİK)'}
          </span>
        </div>
      </div>

      {/* Case Briefing Header */}
      <div className="p-3.5 rounded-[6px] bg-surface border border-subtle mb-3.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-amber mb-1">
          <span>DOSYA: #{room.case_id}</span>
          <span>DOSYA SEVİYESİ: {room.case_meta?.difficulty || 2} / 3</span>
        </div>
        <h2 className="font-serif font-bold text-lg sm:text-xl text-primary">
          {room.case_meta?.title}
        </h2>
        <p className="font-mono text-xs text-secondary mt-0.5">{room.briefing?.victim}</p>
      </div>

      {/* Host Difficulty Selector */}
      <div className="p-3.5 rounded-[6px] bg-surface border border-subtle mb-3.5">
        <div className="flex items-center justify-between mb-2 font-mono text-xs">
          <span className="text-primary font-bold flex items-center gap-1.5">
            <Gauge size={14} className="text-amber" />
            SORUŞTURMA ZORLUK MODU:
          </span>
          <span className="text-[10px] text-secondary">
            {isHost ? 'Oda sahibi seçer' : room.difficulty_label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {diffOptions.map((opt) => {
            const active = room.difficulty_preset === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={!isHost}
                onClick={() => setRoomDifficultyPreset(opt.id)}
                className={`p-2 rounded-[4px] border text-left transition-all ${
                  active
                    ? 'bg-elevated border-crimson text-primary'
                    : 'bg-primary/60 border-subtle text-secondary'
                }`}
              >
                <div className="font-mono text-[10px] sm:text-[11px] font-bold">{opt.label}</div>
                <div className="font-mono text-[9px] text-muted mt-0.5 leading-tight">
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Room Code & QR Code */}
      <div className="p-4 rounded-[6px] bg-elevated border border-subtle mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left w-full sm:w-auto">
          <span className="font-mono text-[10px] text-secondary uppercase tracking-wider block mb-1">
            MASA DAVET KODU
          </span>
          <div className="font-mono font-bold text-3xl tracking-widest text-primary my-1">
            {formattedCode}
          </div>
          <p className="font-mono text-[10px] text-muted mb-2.5">
            Oda Sahibi Öder • Diğer oyuncular ücretsiz katılır
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-2 rounded-[4px] bg-surface border border-subtle hover:border-amber text-primary font-mono text-xs font-semibold flex items-center gap-1.5"
            >
              {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
              {copied ? 'KOPYALANDI' : 'KOPYALA'}
            </button>
            <button
              type="button"
              onClick={handleOpenSecondTab}
              className="px-3 py-2 rounded-[4px] bg-surface border border-subtle hover:border-crimson text-secondary hover:text-primary font-mono text-xs flex items-center gap-1.5"
            >
              <ExternalLink size={13} className="text-crimson" />
              2. EKRAN AÇ
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center shrink-0">
          <ProceduralQrCode code={room.room_code} size={96} />
          <span className="font-mono text-[9px] text-muted mt-1">QR KODU OKUT</span>
        </div>
      </div>

      {/* 6 Player Slots */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-sans font-semibold text-xs sm:text-sm text-primary">
            OYUNCU YUVALARI ({room.players.length}/6)
          </h3>
          {isHost && room.players.length < 6 && (
            <button
              type="button"
              onClick={addBotPlayer}
              className="px-2.5 py-1.5 rounded-[4px] bg-amber/15 hover:bg-amber/25 border border-amber/40 text-amber font-mono text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              <Bot size={13} />+ AI PARTNER EKLE
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {slots.map((slotPlayer, index) => {
            if (!slotPlayer) {
              return (
                <div
                  key={`empty-${index}`}
                  className="p-3 rounded-[6px] bg-surface/50 border border-dashed border-subtle flex flex-col items-center justify-center min-h-[78px] text-center"
                >
                  <UserPlus size={14} className="text-muted mb-1" />
                  <span className="font-mono text-[10px] text-muted">YUVA #{index + 1}</span>
                </div>
              );
            }

            const initials = slotPlayer.display_name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={slotPlayer.user_id}
                className={`p-3 rounded-[6px] bg-surface border-2 transition-all flex flex-col justify-between min-h-[78px] ${
                  slotPlayer.is_ready ? 'border-emerald shadow-emerald' : 'border-amber/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[4px] bg-elevated border border-subtle flex items-center justify-center font-mono font-bold text-xs text-primary shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-sans font-semibold text-xs text-primary truncate">
                      {slotPlayer.display_name}
                    </div>
                    <div className="font-mono text-[9px] text-secondary truncate">
                      {slotPlayer.is_host
                        ? 'ODA SAHİBİ'
                        : slotPlayer.is_bot
                        ? 'AI DEDEKTİF'
                        : 'DEDEKTİF'}
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-1 border-t border-subtle flex items-center justify-between text-[9px] font-mono">
                  <span className={slotPlayer.connected ? 'text-emerald' : 'text-amber'}>
                    ● {slotPlayer.connected ? 'AKTİF' : 'BEKLİYOR'}
                  </span>
                  <span className={`font-bold ${slotPlayer.is_ready ? 'text-emerald' : 'text-amber'}`}>
                    {slotPlayer.is_ready ? '✓ HAZIR' : '...'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mode Info */}
      <div className="p-3 rounded-[6px] bg-surface border border-subtle font-mono text-[11px] text-secondary mb-4 flex items-start gap-2">
        <Shield size={15} className="text-crimson shrink-0 mt-0.5" />
        <span>
          {room.players.length >= 3
            ? '3-6 Kişilik Kirli Polis Modu: İçinizden 1 kişi gizlice HAİN seçilecek!'
            : 'Asimetrik İkili Mod: Kanıtlar ortadan ikiye bölünecek, konuşarak birleştirin.'}
        </span>
      </div>

      {/* Bottom Controls */}
      <div className="mt-auto flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={toggleReady}
          className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-[4px] font-mono text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
            myPlayer?.is_ready
              ? 'bg-emerald/15 text-emerald border-emerald'
              : 'bg-elevated text-primary border-subtle'
          }`}
        >
          <CheckCircle2 size={15} />
          {myPlayer?.is_ready ? 'HAZIR DURUMDASINIZ' : 'HAZIRIM'}
        </button>

        {isHost && (
          <button
            type="button"
            disabled={!allReady}
            onClick={() => {
              if (room.players.length === 1) {
                addBotPlayer();
                setTimeout(() => startMatch(), 150);
              } else {
                startMatch();
              }
            }}
            className={`flex-1 min-h-[48px] px-5 py-2.5 rounded-[4px] font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              allReady
                ? 'bg-crimson hover:bg-crimson/90 text-white shadow-crimson'
                : 'bg-elevated text-muted cursor-not-allowed'
            }`}
          >
            <Play size={15} />
            {room.players.length === 1 ? 'AI PARTNER İLE BAŞLAT' : 'VAKAYI BAŞLAT'}
          </button>
        )}
      </div>

      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
    </div>
  );
};
