import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  Award,
  Clock,
  RotateCcw,
  Home,
  Eye,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
} from 'lucide-react';

export const EndgameNewspaper: React.FC = () => {
  const { room, user, retryMatch, leaveRoom } = useGameStore();
  const [showTruthStory, setShowTruthStory] = useState(false);

  const result = room?.endgame_result;
  if (!room || !result) return null;

  const mins = Math.floor(result.duration_sec / 60);
  const secs = result.duration_sec % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-primary flex flex-col items-center safe-top safe-bottom">
      <div className="w-full max-w-xl bg-surface border-2 border-subtle rounded-[6px] p-4 sm:p-7 shadow-2xl animate-doc-open">
        {/* Newspaper Masthead */}
        <div className="border-b-2 border-primary/80 pb-3 mb-4 text-center">
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-secondary uppercase tracking-widest mb-1">
            <span>DOSYA #{room.case_id}</span>
            <span>{result.difficulty_label}</span>
            <span>{new Date().toLocaleDateString('tr-TR')}</span>
          </div>
          <div className="font-serif font-extrabold text-lg sm:text-2xl tracking-tight text-primary uppercase border-y border-subtle py-1.5">
            CUMHURİYET ADLİ POSTASI
          </div>
        </div>

        {/* Status Banner */}
        <div
          className={`mb-4 px-3 py-2 rounded-[4px] font-mono text-xs font-bold flex items-center justify-center gap-2 text-center ${
            result.is_solved
              ? 'bg-emerald/15 text-emerald border border-emerald/40'
              : 'bg-crimson/15 text-crimson border border-crimson/40'
          }`}
        >
          {result.is_solved ? (
            <>
              <CheckCircle2 size={16} className="shrink-0" />
              <span>SORUŞTURMA BAŞARIYLA TAMAMLANDI</span>
            </>
          ) : (
            <>
              <XCircle size={16} className="shrink-0" />
              <span>
                {result.dirty_cop_won
                  ? 'KİRLİ POLİS SABOTAJI BAŞARILI OLDU!'
                  : 'SORUŞTURMA BAŞARISIZ — KATİL KAÇTI'}
              </span>
            </>
          )}
        </div>

        {/* Playfair Display Headline */}
        <h1 className="font-serif font-bold text-xl sm:text-3xl leading-tight text-primary text-center mb-5">
          "{result.headline}"
        </h1>

        {/* Key Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="p-2.5 rounded-[4px] bg-elevated border border-subtle text-center">
            <div className="flex items-center justify-center gap-1 text-secondary font-mono text-[10px] mb-1">
              <Clock size={11} className="text-amber" />
              SÜRE
            </div>
            <div className="font-mono font-bold text-base text-primary">{formattedTime}</div>
          </div>

          <div className="p-2.5 rounded-[4px] bg-elevated border border-subtle text-center">
            <div className="flex items-center justify-center gap-1 text-secondary font-mono text-[10px] mb-1">
              <Award size={11} className="text-emerald" />
              DOĞRULUK
            </div>
            <div className="font-mono font-bold text-base text-emerald">%{result.accuracy_rate}</div>
          </div>

          <div className="p-2.5 rounded-[4px] bg-elevated border border-subtle text-center">
            <div className="flex items-center justify-center gap-1 text-secondary font-mono text-[10px] mb-1">
              <Star size={11} className="text-amber" />
              KAZANILAN XP
            </div>
            <div className="font-mono font-bold text-base text-amber">+{result.xp_gained} XP</div>
          </div>

          <div className="p-2.5 rounded-[4px] bg-elevated border border-subtle text-center">
            <div className="text-secondary font-mono text-[10px] mb-1">BAŞ DEDEKTİF</div>
            <div className="font-sans font-semibold text-xs text-primary truncate">
              {result.lead_detective}
            </div>
          </div>
        </div>

        {/* Newly Unlocked Career Badges */}
        {result.new_badges && result.new_badges.length > 0 && (
          <div className="mb-4 p-3 rounded-[4px] bg-amber/15 border border-amber/40 flex items-center gap-2.5 font-mono text-xs text-amber">
            <Trophy size={18} className="shrink-0" />
            <div>
              <div className="font-bold uppercase text-[10px]">YENİ DEDEKTİF ROZETİ AÇILDI!</div>
              <div className="text-primary font-semibold">{result.new_badges.join(' • ')}</div>
            </div>
          </div>
        )}

        {/* Career Rank Summary */}
        {user && (
          <div className="mb-4 px-3 py-2 rounded-[4px] bg-elevated/70 border border-subtle flex items-center justify-between font-mono text-[11px]">
            <span className="text-secondary">
              GÜNCEL RÜTBE: <strong className="text-amber">{user.rank_title}</strong>
            </span>
            <span className="text-secondary">
              {user.xp} / {user.next_rank_xp} XP
            </span>
          </div>
        )}

        {/* Dirty Cop Reveal Box */}
        {room.mode === 'GROUP' && result.dirty_cop_name && (
          <div className="mb-4 p-3 rounded-[4px] bg-crimson/10 border border-crimson/40 flex items-center gap-2.5">
            <ShieldAlert size={20} className="text-crimson shrink-0" />
            <div className="font-mono text-xs">
              <div className="text-crimson font-bold uppercase">
                KİRLİ POLİS: {result.dirty_cop_name}
              </div>
              <div className="text-secondary mt-0.5 text-[11px]">
                {result.dirty_cop_won
                  ? 'Kirli Polis soruşturmayı sabote ederek kazandı!'
                  : 'Dedektifler Kirli Polisin blöfünü kanıt tahtasında çürüttü!'}
              </div>
            </div>
          </div>
        )}

        {/* Verdict Details */}
        <div className="p-3.5 rounded-[4px] bg-primary/70 border border-subtle font-mono text-xs space-y-2 mb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-secondary">TUTUKLANAN:</span>
            <span
              className={`font-bold ${
                result.chosen_suspect_id === result.real_killer_id ? 'text-emerald' : 'text-crimson'
              }`}
            >
              {result.chosen_suspect_name}
            </span>
          </div>
          {(result.is_solved || showTruthStory) && (
            <div className="flex items-center justify-between gap-2 border-t border-subtle pt-2">
              <span className="text-secondary">GERÇEK KATİL:</span>
              <span className="font-bold text-amber">{result.real_killer_name}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-subtle pt-2">
            <span className="text-secondary">SUNULAN KANITLAR:</span>
            <span className="text-primary text-right">
              {result.submitted_evidence_ids.join(', ') || 'Yok'}
            </span>
          </div>
          {(result.is_solved || showTruthStory) && (
            <div className="flex items-center justify-between gap-2 border-t border-subtle pt-2">
              <span className="text-secondary">ÇÖZÜM ÜÇGENİ:</span>
              <span className="text-emerald font-bold text-right">
                {result.required_nodes.join(' + ')}
              </span>
            </div>
          )}
        </div>

        {/* Truth Story Section */}
        {result.is_solved || showTruthStory ? (
          <div className="p-3.5 sm:p-4 rounded-[6px] bg-elevated border border-amber/30 mb-5">
            <h3 className="font-mono text-xs font-bold text-amber uppercase mb-1.5">
              [ VAKA ÇÖZÜM ÖZETİ — CİNAYET NASIL İŞLENDİ? ]
            </h3>
            <p className="font-mono text-xs sm:text-sm text-primary leading-relaxed">
              {result.story_summary}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowTruthStory(true)}
            className="w-full min-h-[46px] mb-4 px-4 py-2.5 rounded-[4px] bg-elevated hover:bg-amber/15 border border-amber/40 text-amber font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Eye size={15} />
            GERÇEĞİ GÖR (CİNAYETİN NASIL İŞLENDİĞİNİ OKU)
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={retryMatch}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-[4px] bg-crimson hover:bg-crimson/90 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-crimson"
          >
            <RotateCcw size={15} />
            TEKRAR DENE
          </button>
          <button
            type="button"
            onClick={leaveRoom}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-[4px] bg-elevated hover:bg-surface border border-subtle text-primary font-mono text-xs font-bold flex items-center justify-center gap-2"
          >
            <Home size={15} />
            ANA MENÜ
          </button>
        </div>
      </div>
    </div>
  );
};
