import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { AvatarId, ThemeColorId } from '../types/game';
import {
  Award,
  Check,
  Copy,
  Edit3,
  Eye,
  Feather,
  Fingerprint,
  Flame,
  Gift,
  Scale,
  Search,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Upload,
} from 'lucide-react';

const AVATAR_OPTIONS: { id: AvatarId; label: string }[] = [
  { id: 'raven', label: 'Kuzgun' },
  { id: 'scales', label: 'Terazi' },
  { id: 'cyber_eye', label: 'Siber Göz' },
  { id: 'magnifier', label: 'Mercek' },
  { id: 'shield', label: 'Kalkan' },
  { id: 'knight', label: 'Stratejist' },
  { id: 'fingerprint', label: 'Biyometri' },
  { id: 'owl', label: 'Baykuş' },
];

const SPECIALTIES = [
  'Kriminal Analist',
  'Siber Suçlar Uzmanı',
  'Adli Tıp Müfettişi',
  'Sorgu Başkomiseri',
  'Soğuk Vaka Avcısı',
  'Davranış Bilimci',
];

const THEME_MAP: Record<ThemeColorId, { label: string; hex: string; borderClass: string; badgeClass: string }> = {
  crimson: {
    label: 'Kriminal Kırmızı',
    hex: '#E11D48',
    borderClass: 'border-crimson/60',
    badgeClass: 'bg-crimson/20 text-crimson border-crimson/40',
  },
  amber: {
    label: 'Kehribar Altın',
    hex: '#F59E0B',
    borderClass: 'border-amber/60',
    badgeClass: 'bg-amber/15 text-amber border-amber/40',
  },
  emerald: {
    label: 'Zümrüt Siber',
    hex: '#10B981',
    borderClass: 'border-emerald/50',
    badgeClass: 'bg-emerald/15 text-emerald border-emerald/40',
  },
  cyan: {
    label: 'Gece Mavisi',
    hex: '#38BDF8',
    borderClass: 'border-subtle',
    badgeClass: 'bg-elevated text-primary border-subtle',
  },
};

const AvatarEmblemIcon: React.FC<{ id: AvatarId; color: string; size?: number }> = ({
  id,
  color,
  size = 28,
}) => {
  const props = { size, style: { color } };
  switch (id) {
    case 'scales':
      return <Scale {...props} />;
    case 'cyber_eye':
      return <Eye {...props} />;
    case 'magnifier':
      return <Search {...props} />;
    case 'shield':
      return <Shield {...props} />;
    case 'knight':
      return <Swords {...props} />;
    case 'fingerprint':
      return <Fingerprint {...props} />;
    case 'owl':
      return <Target {...props} />;
    default:
      return <Feather {...props} />;
  }
};

// Procedural 5-Axis SVG Skill Radar Chart
const DetectiveRadarChart: React.FC<{
  axes: { label: string; value: number }[];
  accentHex: string;
}> = ({ axes, accentHex }) => {
  const size = 210;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const maxR = 68;

  const pointAt = (index: number, pct: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
    const r = (Math.max(12, Math.min(100, pct)) / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      lx: cx + (maxR + 24) * Math.cos(angle),
      ly: cy + (maxR + 18) * Math.sin(angle),
    };
  };

  const rings = [0.33, 0.66, 1.0];
  const dataPolygon = axes
    .map((ax, i) => {
      const p = pointAt(i, ax.value);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto block">
      {rings.map((rk) => {
        const pts = axes
          .map((_, i) => {
            const p = pointAt(i, rk * 100);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(' ');
        return (
          <polygon
            key={rk}
            points={pts}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />
        );
      })}

      {axes.map((_, i) => {
        const outer = pointAt(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}

      <polygon
        points={dataPolygon}
        fill={accentHex}
        fillOpacity="0.24"
        stroke={accentHex}
        strokeWidth="2"
      />

      {axes.map((ax, i) => {
        const pt = pointAt(i, ax.value);
        return (
          <g key={ax.label}>
            <circle cx={pt.x} cy={pt.y} r="3.5" fill={accentHex} />
            <text
              x={pt.lx}
              y={pt.ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#94A3B8"
              fontSize="8.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              {ax.label} %{Math.round(ax.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const ProfileScreen: React.FC = () => {
  const {
    user,
    cases,
    badgeCatalog,
    directiveCatalog,
    updateDetectiveProfile,
    claimDirective,
    importProfileBackup,
    linkAccount,
    showToast,
  } = useGameStore();

  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.display_name || '');
  const [avatarDraft, setAvatarDraft] = useState<AvatarId>(user?.avatar_id || 'raven');
  const [themeDraft, setThemeDraft] = useState<ThemeColorId>(user?.theme_color || 'crimson');
  const [specialtyDraft, setSpecialtyDraft] = useState(user?.specialty || SPECIALTIES[0]);
  const [mottoDraft, setMottoDraft] = useState(user?.motto || '');
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [copiedBackup, setCopiedBackup] = useState(false);

  if (!user) return null;

  const theme = THEME_MAP[user.theme_color] || THEME_MAP.crimson;
  const solvedEntries = Object.values(user.solved_cases || {});
  const solvedCount = solvedEntries.length;
  const totalCases = Math.max(1, cases.length);
  const hardcoreSolvedCount = solvedEntries.filter(
    (s) => s.difficulty_preset === 'HARDCORE'
  ).length;

  const stats = user.stats || {
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

  const winRate =
    stats.matches_played > 0
      ? Math.round((stats.matches_won / stats.matches_played) * 100)
      : 0;

  const connAccuracy =
    stats.total_connections + stats.total_mistakes > 0
      ? Math.round(
          (stats.total_connections / (stats.total_connections + stats.total_mistakes)) * 100
        )
      : 80;

  const speedScore = stats.fastest_solve_sec
    ? Math.min(100, Math.max(30, Math.round((420 / Math.max(90, stats.fastest_solve_sec)) * 75)))
    : 45;

  const radarAxes = [
    { label: 'ANALİZ', value: Math.max(25, connAccuracy) },
    { label: 'HIZ', value: speedScore },
    { label: 'ARŞİV', value: Math.min(100, 30 + Math.round((solvedCount / totalCases) * 70)) },
    { label: 'LİDERLİK', value: Math.min(100, 35 + stats.lead_detective_count * 15 + stats.best_streak * 8) },
    { label: 'SEZGİ', value: Math.min(100, 30 + hardcoreSolvedCount * 22 + user.rank_level * 12) },
  ];

  const xpPct = Math.min(100, Math.round((user.xp / Math.max(1, user.next_rank_xp)) * 100));

  const formatFastest = (sec: number | null) => {
    if (!sec) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getDirectiveProgress = (metric: string) => {
    if (metric === 'solved_count') return solvedCount;
    if (metric === 'total_connections') return stats.total_connections;
    if (metric === 'best_streak') return stats.best_streak;
    if (metric === 'hardcore_solved') return hardcoreSolvedCount;
    return 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateDetectiveProfile({
      display_name: nameDraft,
      avatar_id: avatarDraft,
      theme_color: themeDraft,
      specialty: specialtyDraft,
      motto: mottoDraft,
    });
    setIsEditing(false);
  };

  const handleCopyBackup = () => {
    const payload = JSON.stringify({
      display_name: user.display_name,
      avatar_id: user.avatar_id,
      theme_color: user.theme_color,
      specialty: user.specialty,
      motto: user.motto,
      xp: user.xp,
      solved_cases: user.solved_cases,
      badges: user.badges,
    });
    navigator.clipboard?.writeText(payload);
    setCopiedBackup(true);
    showToast('Dedektif yedek kodu panoya kopyalandı!');
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  return (
    <div className="space-y-4 animate-doc-open">
      {/* 1. PROCEDURAL DETECTIVE ID CARD */}
      <div
        className={`p-4 sm:p-5 rounded-[6px] bg-surface border-2 ${theme.borderClass} relative overflow-hidden shadow-xl`}
      >
        <div className="flex items-center justify-between text-[10px] font-mono text-secondary pb-2.5 mb-3 border-b border-subtle">
          <span className="font-bold tracking-wider" style={{ color: theme.hex }}>
            [ SİBER KRİMİNAL DAİRE BAŞKANLIĞI — RESMİ KİMLİK ]
          </span>
          <span>SİCİL: {user.badge_code || 'TR-EP-1042'}</span>
        </div>

        <div className="flex items-start gap-3.5">
          {/* Procedural Vector Emblem Box */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-[6px] bg-elevated border-2 flex flex-col items-center justify-center shrink-0"
            style={{ borderColor: theme.hex }}
          >
            <AvatarEmblemIcon id={user.avatar_id || 'raven'} color={theme.hex} size={30} />
            <span className="font-mono text-[9px] text-muted uppercase mt-1">
              SV.{user.rank_level}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span
                  className={`inline-block px-2 py-0.5 rounded-[2px] border font-mono text-[10px] font-bold uppercase mb-1 ${theme.badgeClass}`}
                >
                  {user.rank_title}
                </span>
                <h2 className="font-serif font-bold text-lg sm:text-xl text-primary truncate">
                  {user.display_name}
                </h2>
                <div className="font-mono text-xs text-amber">{user.specialty}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNameDraft(user.display_name);
                  setAvatarDraft(user.avatar_id || 'raven');
                  setThemeDraft(user.theme_color || 'crimson');
                  setSpecialtyDraft(user.specialty || SPECIALTIES[0]);
                  setMottoDraft(user.motto || '');
                  setIsEditing((v) => !v);
                }}
                className="px-2.5 py-1.5 rounded-[4px] bg-elevated hover:bg-primary border border-subtle text-secondary hover:text-primary font-mono text-[11px] font-bold flex items-center gap-1 shrink-0"
              >
                <Edit3 size={12} />
                DÜZENLE
              </button>
            </div>

            {user.motto && (
              <p className="font-mono text-[11px] text-secondary italic mt-2">
                "{user.motto}"
              </p>
            )}
          </div>
        </div>

        {/* XP Rank Progress Bar */}
        <div className="mt-4 pt-3 border-t border-subtle">
          <div className="flex items-center justify-between font-mono text-[11px] mb-1.5">
            <span className="text-secondary">
              KARİYER PUANI: <strong className="text-primary">{user.xp} XP</strong>
            </span>
            <span className="text-muted">SONRAKİ TERFİ: {user.next_rank_xp} XP</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-primary overflow-hidden border border-subtle">
            <div
              style={{ width: `${xpPct}%`, backgroundColor: theme.hex }}
              className="h-full transition-all"
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-muted">
            <span>||| || |||| | ||| || ||||</span>
            <span>YETKİ SINIFI: ALPHA-{user.rank_level}</span>
          </div>
        </div>
      </div>

      {/* INLINE PROFILE CUSTOMIZER DRAWER */}
      {isEditing && (
        <form
          onSubmit={handleSaveProfile}
          className="p-4 rounded-[6px] bg-elevated border border-amber/50 space-y-3.5 animate-doc-open"
        >
          <div className="font-mono text-xs font-bold text-amber uppercase flex items-center gap-1.5">
            <Sparkles size={14} />
            <span>DEDEKTİF KİMLİK KARTINI ÖZELLEŞTİR</span>
          </div>

          <div>
            <label className="block font-mono text-[10px] text-secondary uppercase mb-1">
              DEDEKTİF ADI:
            </label>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={30}
              className="w-full px-3 py-2 rounded-[4px] bg-primary border border-subtle text-primary font-mono text-xs focus:outline-none focus:border-amber"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] text-secondary uppercase mb-1">
              ARMA SEMBOLÜ (8 VEKTÖREL MÜHÜR):
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {AVATAR_OPTIONS.map((av) => {
                const selected = avatarDraft === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatarDraft(av.id)}
                    className={`p-2 rounded-[4px] border flex flex-col items-center gap-1 font-mono text-[10px] transition-all ${
                      selected
                        ? 'bg-surface border-amber text-primary'
                        : 'bg-primary/60 border-subtle text-secondary'
                    }`}
                  >
                    <AvatarEmblemIcon
                      id={av.id}
                      color={selected ? '#F59E0B' : '#94A3B8'}
                      size={18}
                    />
                    <span>{av.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] text-secondary uppercase mb-1">
              UZMANLIK ALANI:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {SPECIALTIES.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSpecialtyDraft(sp)}
                  className={`p-2 rounded-[4px] border font-mono text-[11px] text-left truncate ${
                    specialtyDraft === sp
                      ? 'bg-surface border-amber text-amber font-bold'
                      : 'bg-primary/60 border-subtle text-secondary'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] text-secondary uppercase mb-1">
              KİMLİK KARTI VURGU RENGİ:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(THEME_MAP) as ThemeColorId[]).map((tid) => (
                <button
                  key={tid}
                  type="button"
                  onClick={() => setThemeDraft(tid)}
                  className={`p-2 rounded-[4px] border font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 ${
                    themeDraft === tid
                      ? 'bg-surface border-primary text-primary'
                      : 'bg-primary/60 border-subtle text-secondary'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: THEME_MAP[tid].hex }}
                  />
                  <span className="truncate">{THEME_MAP[tid].label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] text-secondary uppercase mb-1">
              DEDEKTİF MOTTOSU / İMZASI:
            </label>
            <input
              type="text"
              value={mottoDraft}
              onChange={(e) => setMottoDraft(e.target.value)}
              maxLength={90}
              placeholder="Örn: Kanıt konuşur, şüpheliler susar."
              className="w-full px-3 py-2 rounded-[4px] bg-primary border border-subtle text-primary font-mono text-xs focus:outline-none focus:border-amber"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 rounded-[4px] bg-surface border border-subtle font-mono text-xs text-secondary"
            >
              İPTAL
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-[4px] bg-crimson text-white font-mono text-xs font-bold shadow-crimson"
            >
              KİMLİK KARTINI KAYDET
            </button>
          </div>
        </form>
      )}

      {/* 2. CAREER METRICS & 5-AXIS SKILL RADAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-[6px] bg-surface border border-subtle flex flex-col justify-between">
          <h3 className="font-sans font-bold text-xs text-primary uppercase tracking-wider mb-1">
            5 EKSENLİ YETENEK RADARI
          </h3>
          <DetectiveRadarChart axes={radarAxes} accentHex={theme.hex} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-[6px] bg-surface border border-subtle">
            <div className="font-mono text-[10px] text-muted">ÇÖZÜLEN DOSYA</div>
            <div className="font-mono font-bold text-lg text-primary mt-1">
              {solvedCount} / {cases.length}
            </div>
            <div className="font-mono text-[10px] text-emerald mt-0.5">
              %{Math.round((solvedCount / totalCases) * 100)} Sezon
            </div>
          </div>

          <div className="p-3 rounded-[6px] bg-surface border border-subtle">
            <div className="font-mono text-[10px] text-muted">BAŞARI ORANI</div>
            <div className="font-mono font-bold text-lg text-emerald mt-1">%{winRate}</div>
            <div className="font-mono text-[10px] text-secondary mt-0.5">
              {stats.matches_won}/{stats.matches_played} Maç
            </div>
          </div>

          <div className="p-3 rounded-[6px] bg-surface border border-subtle">
            <div className="font-mono text-[10px] text-muted">EN HIZLI REKOR</div>
            <div className="font-mono font-bold text-lg text-amber mt-1">
              {formatFastest(stats.fastest_solve_sec)}
            </div>
            <div className="font-mono text-[10px] text-secondary mt-0.5">Saha Süresi</div>
          </div>

          <div className="p-3 rounded-[6px] bg-surface border border-subtle">
            <div className="font-mono text-[10px] text-muted">SERİ & BAĞLANTI</div>
            <div className="font-mono font-bold text-lg text-crimson mt-1 flex items-center gap-1">
              <Flame size={16} />
              {stats.best_streak}x
            </div>
            <div className="font-mono text-[10px] text-secondary mt-0.5">
              {stats.total_connections} Doğru İp
            </div>
          </div>
        </div>
      </div>

      {/* 3. ACTIVE DETECTIVE DIRECTIVES (CLAIMABLE XP MISSIONS) */}
      <div className="p-4 rounded-[6px] bg-surface border border-subtle space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-sans font-bold text-xs sm:text-sm text-primary flex items-center gap-1.5">
            <Gift size={15} className="text-amber" />
            AKTİF KARİYER GÖREVLERİ (EKSTRA XP)
          </h3>
          <span className="font-mono text-[10px] text-secondary">Ödüllü Direktifler</span>
        </div>

        <div className="space-y-2">
          {directiveCatalog.map((dir) => {
            const current = getDirectiveProgress(dir.metric);
            const claimed = user.claimed_directives?.includes(dir.id);
            const readyToClaim = current >= dir.target && !claimed;
            const pct = Math.min(100, Math.round((current / dir.target) * 100));

            return (
              <div
                key={dir.id}
                className={`p-3 rounded-[4px] border flex items-center justify-between gap-3 ${
                  readyToClaim
                    ? 'bg-amber/15 border-amber'
                    : claimed
                    ? 'bg-emerald/15 border-emerald/40 opacity-80'
                    : 'bg-primary/60 border-subtle'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-sans font-semibold text-xs text-primary">{dir.title}</div>
                  <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden mt-1.5">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full ${claimed ? 'bg-emerald' : 'bg-amber'}`}
                    />
                  </div>
                  <div className="font-mono text-[10px] text-secondary mt-1">
                    İlerleme: {Math.min(current, dir.target)} / {dir.target} • Ödül: +{dir.reward_xp} XP
                  </div>
                </div>

                {claimed ? (
                  <span className="px-2.5 py-1 rounded-[3px] bg-emerald/20 text-emerald font-mono text-[10px] font-bold shrink-0">
                    ✓ ALINDI
                  </span>
                ) : readyToClaim ? (
                  <button
                    type="button"
                    onClick={() => claimDirective(dir.id)}
                    className="min-h-[38px] px-3 py-1.5 rounded-[4px] bg-amber text-black font-mono text-xs font-bold shrink-0 animate-pulse"
                  >
                    🎁 +{dir.reward_xp} XP AL
                  </button>
                ) : (
                  <span className="font-mono text-[10px] text-muted shrink-0">%{pct}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 10 TACTICAL MEDALS SHOWCASE */}
      <div className="p-4 rounded-[6px] bg-surface border border-subtle">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-sans font-bold text-xs sm:text-sm text-primary flex items-center gap-1.5">
            <Trophy size={15} className="text-amber" />
            MADALYA VE ÜSTÜN HİZMET NİŞANLARI ({user.badges.length}/{badgeCatalog.length})
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {badgeCatalog.map((b) => {
            const unlocked = user.badges.includes(b.id);
            return (
              <div
                key={b.id}
                className={`p-2.5 rounded-[4px] border flex items-start gap-2.5 font-mono text-xs ${
                  unlocked
                    ? 'bg-emerald/15 border-emerald/40 text-primary'
                    : 'bg-primary/50 border-subtle text-muted'
                }`}
              >
                <Award
                  size={16}
                  className={unlocked ? 'text-amber shrink-0 mt-0.5' : 'text-muted shrink-0 mt-0.5'}
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs">{b.title}</div>
                  <div className="text-[10px] text-secondary mt-0.5 leading-snug">{b.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. CLOUD SYNC & CAREER BACKUP / TRANSFER */}
      <div className="p-4 rounded-[6px] bg-surface border border-subtle space-y-3">
        <h3 className="font-sans font-bold text-xs sm:text-sm text-primary">
          Bulut Senkronizasyonu ve Cihaz Transfer Kodu
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => linkAccount('APPLE')}
            className="min-h-[42px] px-3 py-2 rounded-[4px] bg-elevated border border-subtle font-mono text-xs font-bold text-primary flex items-center justify-center gap-1.5"
          >
             Apple Bağla {user.linked_provider === 'APPLE' && <span className="text-emerald">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => linkAccount('GOOGLE')}
            className="min-h-[42px] px-3 py-2 rounded-[4px] bg-elevated border border-subtle font-mono text-xs font-bold text-primary flex items-center justify-center gap-1.5"
          >
            G Google Bağla {user.linked_provider === 'GOOGLE' && <span className="text-emerald">✓</span>}
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyBackup}
            className="flex-1 min-h-[42px] px-3 py-2 rounded-[4px] bg-elevated border border-subtle hover:border-amber font-mono text-xs font-semibold text-primary flex items-center justify-center gap-1.5"
          >
            {copiedBackup ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
            {copiedBackup ? 'KOPYALANDI' : 'YEDEK KODUNU KOPYALA'}
          </button>
          <button
            type="button"
            onClick={() => setBackupModalOpen((v) => !v)}
            className="min-h-[42px] px-3 py-2 rounded-[4px] bg-elevated border border-subtle hover:border-crimson font-mono text-xs font-semibold text-secondary hover:text-primary flex items-center gap-1.5"
          >
            <Upload size={14} />
            YÜKLE
          </button>
        </div>

        {backupModalOpen && (
          <div className="pt-2 space-y-2">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={3}
              placeholder="Kopyaladığınız JSON yedek kodunu buraya yapıştırın..."
              className="w-full p-2.5 rounded-[4px] bg-primary border border-subtle font-mono text-xs text-primary focus:outline-none focus:border-crimson resize-none"
            />
            <button
              type="button"
              onClick={async () => {
                const ok = await importProfileBackup(importText);
                if (ok) {
                  setBackupModalOpen(false);
                  setImportText('');
                }
              }}
              className="w-full min-h-[40px] rounded-[4px] bg-crimson text-white font-mono text-xs font-bold"
            >
              YEDEĞİ İÇE AKTAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
