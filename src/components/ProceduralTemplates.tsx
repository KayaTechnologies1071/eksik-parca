import React from 'react';
import { EvidenceNode, Suspect } from '../types/game';
import { Radio, Lock, Pin, CheckCircle2 } from 'lucide-react';

interface HighlightableTextProps {
  text: string;
  keywords: string[];
  activeHighlights: string[];
  nodeId: string;
  fontSize?: number;
  onToggleKeyword?: (nodeId: string, keyword: string) => void;
}

export const HighlightableText: React.FC<HighlightableTextProps> = ({
  text,
  keywords,
  activeHighlights,
  nodeId,
  fontSize = 14,
  onToggleKeyword,
}) => {
  if (!keywords || keywords.length === 0) {
    return (
      <p style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize + 8}px` }} className="font-mono text-primary">
        {text}
      </p>
    );
  }

  // Sort keywords by length descending so longer phrases match first
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <p
      style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize + 8}px` }}
      className="font-mono text-primary select-text"
    >
      {parts.map((part, idx) => {
        const matchedKw = sorted.find((k) => k.toLowerCase() === part.toLowerCase());
        if (matchedKw) {
          const keyId = `${nodeId}::${matchedKw}`;
          const isHighlighted = activeHighlights.includes(keyId);
          return (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onToggleKeyword?.(nodeId, matchedKw);
              }}
              title="Fosforlu kalemle vurgulamak için dokun"
              className={`inline-block px-1.5 py-0.5 mx-0.5 rounded-[2px] cursor-pointer transition-all border-b ${
                isHighlighted
                  ? 'bg-amber-highlight text-amber border-amber font-bold shadow-amber'
                  : 'bg-elevated/90 text-amber/90 border-amber/40 hover:bg-amber-highlight/60'
              }`}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </p>
  );
};

interface ProceduralDocProps {
  node: EvidenceNode;
  activeHighlights: string[];
  fontSize?: number;
  isPinned?: boolean;
  onToggleKeyword?: (nodeId: string, keyword: string) => void;
  onPin?: () => void;
  onPing?: () => void;
  compact?: boolean;
}

export const ProceduralDocumentView: React.FC<ProceduralDocProps> = ({
  node,
  activeHighlights,
  fontSize = 14,
  isPinned = false,
  onToggleKeyword,
  onPin,
  onPing,
  compact = false,
}) => {
  if (!node.unlocked || !node.content) {
    return (
      <div className="doc-official p-4 border border-subtle rounded-[6px] relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-mono text-muted mb-2">
          <span>[{node.category}]</span>
          <span>{node.file_no}</span>
        </div>
        <div className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-[4px] bg-elevated flex items-center justify-center text-amber border border-amber/30">
            <Lock size={18} />
          </div>
          <div>
            <h4 className="font-sans font-semibold text-primary text-sm">{node.title}</h4>
            <p className="font-mono text-xs text-secondary mt-0.5">
              MERKEZ ARŞİV KİLİTLİ BELGESİ — GEREKLİ YETKİ: {node.solo_cost} JETON (♦)
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isRecovered = node.content.includes('[KURTARILMIŞ VERİ]');
  const cleanContent = node.content.replace('[KURTARILMIŞ VERİ]', '').trim();

  // 1. FİNANS VE FİŞ ŞABLONU (RECEIPT)
  if (node.template === 'RECEIPT') {
    return (
      <div className="doc-receipt p-4 rounded-[6px] relative">
        <div className="flex items-center justify-between text-[11px] font-mono text-secondary pb-2 mb-3 border-b border-dashed border-subtle">
          <span className="text-amber font-semibold">[{node.category} KAYDI]</span>
          <span>{node.file_no}</span>
        </div>
        <div className="flex items-center justify-between text-xs font-mono text-primary mb-3">
          <span className="font-bold uppercase">{node.title}</span>
          <span className="text-secondary">{node.date}</span>
        </div>
        <div className="my-3 py-2 px-3 bg-primary/60 rounded-[4px] border border-subtle">
          <HighlightableText
            text={cleanContent}
            keywords={node.highlights}
            activeHighlights={activeHighlights}
            nodeId={node.node_id}
            fontSize={fontSize}
            onToggleKeyword={onToggleKeyword}
          />
        </div>
        {/* Procedural Barcode */}
        <div className="mt-4 pt-3 border-t border-dashed border-subtle flex items-center justify-between">
          <div className="font-mono text-[10px] tracking-[2px] text-muted select-none">
            ||| | |||| || | ||| || |||| | |||
          </div>
          <span className="font-mono text-[10px] text-secondary">DOĞRULANMIŞ FİŞ #{node.node_id}</span>
        </div>
        {!compact && (onPin || onPing) && (
          <DocumentActionRow isPinned={isPinned} onPin={onPin} onPing={onPing} />
        )}
      </div>
    );
  }

  // 2. DİJİTAL İLETİŞİM ŞABLONU (DIGITAL_COMM)
  if (node.template === 'DIGITAL_COMM') {
    const isOutgoing =
      cleanContent.toLowerCase().includes('giden') ||
      cleanContent.toLowerCase().includes('taslak') ||
      cleanContent.includes('->');

    return (
      <div className="doc-digital p-4 rounded-[6px] border border-subtle bg-surface relative">
        <div className="flex items-center justify-between text-[11px] font-mono text-secondary pb-2 mb-3 border-b border-subtle">
          <span className="text-crimson font-semibold">[{node.category} DÖKÜMÜ]</span>
          <span>{node.file_no} • {node.date}</span>
        </div>
        <h4 className="font-sans font-semibold text-sm text-primary mb-3">{node.title}</h4>

        <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}>
          <div
            className={`max-w-[94%] p-3.5 rounded-[6px] relative ${
              isRecovered
                ? 'border border-dashed border-crimson bg-crimson/5'
                : isOutgoing
                ? 'bg-[#262B3D] border border-subtle'
                : 'bg-elevated border border-subtle'
            }`}
          >
            {isRecovered && (
              <div className="inline-block mb-2 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-crimson/20 text-crimson rounded-[2px] border border-crimson/40">
                [KURTARILMIŞ VERİ]
              </div>
            )}
            <HighlightableText
              text={cleanContent}
              keywords={node.highlights}
              activeHighlights={activeHighlights}
              nodeId={node.node_id}
              fontSize={fontSize}
              onToggleKeyword={onToggleKeyword}
            />
            <div className="mt-2 flex items-center justify-end gap-2 text-[10px] font-mono text-secondary">
              <span>ADLİ BİLİŞİM LOGU</span>
              <span>✓✓</span>
            </div>
          </div>
        </div>

        {!compact && (onPin || onPing) && (
          <DocumentActionRow isPinned={isPinned} onPin={onPin} onPing={onPing} />
        )}
      </div>
    );
  }

  // 3. RESMİ RAPOR ŞABLONU (OFFICIAL_REPORT - Default)
  return (
    <div className="doc-official p-4 rounded-[6px] relative overflow-hidden">
      <div className="flex items-center justify-between text-[11px] font-mono text-secondary pb-2 mb-2 border-b border-subtle">
        <span className="text-crimson font-semibold">[{node.category} KURUMU]</span>
        <span>{node.file_no}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-secondary mb-3 pb-2 border-b border-subtle">
        <span className="text-primary font-bold">KONU: {node.title}</span>
        <span>TARİH: {node.date}</span>
      </div>

      <div className="my-3 pr-2 relative z-10">
        <HighlightableText
          text={cleanContent}
          keywords={node.highlights}
          activeHighlights={activeHighlights}
          nodeId={node.node_id}
          fontSize={fontSize}
          onToggleKeyword={onToggleKeyword}
        />
      </div>

      <div className="mt-6 flex items-center justify-between relative z-10">
        <span className="font-mono text-[10px] text-muted">KRİMİNAL ARŞİV KAYDI #{node.node_id}</span>
        {/* -12 deg Tilted Stamp per UiSartnamesi 2.1 */}
        <div className="stamp-confidential select-none">
          [ GİZLİ / ADLİ DELİL ]
        </div>
      </div>

      {!compact && (onPin || onPing) && (
        <DocumentActionRow isPinned={isPinned} onPin={onPin} onPing={onPing} />
      )}
    </div>
  );
};

const DocumentActionRow: React.FC<{
  isPinned?: boolean;
  onPin?: () => void;
  onPing?: () => void;
}> = ({ isPinned, onPin, onPing }) => (
  <div className="mt-4 pt-3 border-t border-subtle flex items-center gap-2 relative z-10">
    {onPin && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPin();
        }}
        className={`flex-1 min-h-[48px] px-3 py-2 rounded-[4px] font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
          isPinned
            ? 'bg-emerald/15 text-emerald border border-emerald/40'
            : 'bg-crimson text-white hover:bg-crimson/90 shadow-crimson'
        }`}
      >
        {isPinned ? (
          <>
            <CheckCircle2 size={15} />
            ORTAK TAHTADA İĞNELİ
          </>
        ) : (
          <>
            <Pin size={15} />
            📌 BU KANITI ORTAK TAHTAYA İĞNELE
          </>
        )}
      </button>
    )}
    {onPing && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPing();
        }}
        title="Masadaki diğer oyuncuların dikkatini bu belgeye çek"
        className="min-h-[48px] px-3 py-2 rounded-[4px] bg-elevated border border-subtle hover:border-crimson text-secondary hover:text-primary font-mono text-xs flex items-center gap-1.5 transition-all"
      >
        <Radio size={15} className="text-crimson" />
        PING
      </button>
    )}
  </div>
);

// 4. ŞÜPHELİ KİMLİK KARTI (Fotoğrafsız Geometrik Monogram + Şüpheli Eleme Durumu - UiSartnamesi 2.4)
export const SuspectCardView: React.FC<{
  suspect: Suspect;
  mark?: 'SUSPECT' | 'NEUTRAL' | 'CLEARED';
  isPinged?: boolean;
  onPing?: () => void;
  onCycleMark?: () => void;
}> = ({ suspect, mark = 'NEUTRAL', isPinged, onPing, onCycleMark }) => {
  const initials = suspect.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-[6px] bg-surface border transition-all relative overflow-hidden ${
        isPinged
          ? 'border-crimson ring-2 ring-crimson/40 animate-ping-ripple'
          : mark === 'SUSPECT'
          ? 'border-crimson/60'
          : mark === 'CLEARED'
          ? 'border-emerald/50 opacity-80'
          : 'border-subtle'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Geometric Monogram */}
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[4px] bg-elevated border flex flex-col items-center justify-center shrink-0 relative ${
            mark === 'CLEARED' ? 'border-emerald/50 text-emerald' : 'border-crimson/40 text-crimson'
          }`}
        >
          <span className="font-mono font-bold text-base sm:text-lg tracking-wider">{initials}</span>
          <span className="font-mono text-[8px] text-muted uppercase">
            {mark === 'CLEARED' ? 'ELENDİ' : mark === 'SUSPECT' ? 'HEDEF' : 'ŞÜPHELİ'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h3
              className={`font-sans font-semibold text-sm sm:text-base truncate ${
                mark === 'CLEARED' ? 'line-through text-secondary' : 'text-primary'
              }`}
            >
              {suspect.name}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              {onCycleMark && (
                <button
                  type="button"
                  onClick={onCycleMark}
                  className={`px-2 py-1 rounded-[4px] border text-[10px] font-mono font-bold transition-all ${
                    mark === 'SUSPECT'
                      ? 'bg-crimson/20 border-crimson text-crimson'
                      : mark === 'CLEARED'
                      ? 'bg-emerald/20 border-emerald text-emerald'
                      : 'bg-elevated border-subtle text-secondary hover:text-primary'
                  }`}
                  title="Kişisel şüpheli durumunu değiştir (Belirsiz / Baş Şüpheli / Temiz)"
                >
                  {mark === 'SUSPECT' ? '🔴 HEDEF' : mark === 'CLEARED' ? '🟢 TEMİZ' : '🟡 İŞARETLE'}
                </button>
              )}
              {onPing && (
                <button
                  type="button"
                  onClick={onPing}
                  className="px-2 py-1 rounded-[4px] bg-elevated hover:bg-crimson/20 border border-subtle hover:border-crimson/50 text-[10px] font-mono text-secondary hover:text-primary flex items-center gap-1 transition-all"
                  title="Masadaki oyunculara bu şüpheliyi vurgula"
                >
                  <Radio size={11} className="text-crimson" />
                  SİNYAL
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 space-y-1 font-mono text-[11px] sm:text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted w-24 sm:w-28 shrink-0">YAŞ / MESLEK:</span>
              <span className="text-secondary truncate">
                {suspect.age ? `${suspect.age} • ` : ''}
                {suspect.role}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted w-24 sm:w-28 shrink-0">KURBANLA BAĞ:</span>
              <span className="text-amber truncate">{suspect.relation || suspect.role}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-subtle font-mono text-xs">
        <span className="text-muted block text-[10px] uppercase mb-1">İLK İFADE ÖZETİ (ALİBİ):</span>
        <p className="text-primary/90 italic leading-relaxed">"{suspect.alibi}"</p>
      </div>
    </div>
  );
};

// Prosedürel QR Kod Üreteci (Lobi Ekranı İçin Sıfır Harici Varlık)
export const ProceduralQrCode: React.FC<{ code: string; size?: number }> = ({
  code,
  size = 112,
}) => {
  const gridSize = 15;
  const cells: boolean[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(false)
  );

  // Finder patterns (3 corners)
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const isBorder = r === 0 || r === 4 || c === 0 || c === 4;
        const isCenter = r === 2 && c === 2;
        cells[r0 + r][c0 + c] = isBorder || isCenter;
      }
    }
  };
  drawFinder(1, 1);
  drawFinder(1, gridSize - 6);
  drawFinder(gridSize - 6, 1);

  // Deterministic fill from room code
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed = (seed * 31 + code.charCodeAt(i)) & 0xffffffff;
  }
  for (let r = 1; r < gridSize - 1; r++) {
    for (let c = 1; c < gridSize - 1; c++) {
      const inFinder =
        (r < 7 && c < 7) ||
        (r < 7 && c >= gridSize - 7) ||
        (r >= gridSize - 7 && c < 7);
      if (!inFinder) {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        cells[r][c] = (seed >>> 28) % 2 === 0;
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize} ${gridSize}`}
      className="bg-[#F1F5F9] p-1.5 rounded-[4px] border border-subtle shrink-0"
    >
      {cells.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? (
            <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width={1} height={1} fill="#090A0F" />
          ) : null
        )
      )}
    </svg>
  );
};
