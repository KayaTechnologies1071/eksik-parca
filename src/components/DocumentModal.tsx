import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { ProceduralDocumentView } from './ProceduralTemplates';
import { X, Highlighter, Pin, Radio } from 'lucide-react';
import { EvidenceNode } from '../types/game';

export const DocumentModal: React.FC = () => {
  const {
    room,
    inspectedNodeId,
    docFontSize,
    setInspectedNodeId,
    adjustDocFontSize,
    toggleHighlight,
    pinNodeToBoard,
    pingItem,
  } = useGameStore();

  if (!inspectedNodeId || !room) return null;

  // Find node either in player's private files or on the shared board
  let foundNode: EvidenceNode | null =
    room.my_nodes.find((n) => n.node_id === inspectedNodeId) || null;

  if (!foundNode) {
    const boardMatch = room.board_nodes.find((b) => b.node_id === inspectedNodeId);
    if (boardMatch) {
      foundNode = {
        node_id: boardMatch.node_id,
        template: boardMatch.template,
        category: boardMatch.category,
        title: boardMatch.title,
        file_no: `TAHTA #${boardMatch.node_id}`,
        date: 'ORTAK DELİL',
        solo_cost: 0,
        unlocked: true,
        content: boardMatch.content,
        highlights: boardMatch.highlights || [],
      };
    }
  }

  if (!foundNode) return null;

  const isPinned = room.board_nodes.some((b) => b.node_id === foundNode!.node_id);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-doc-open"
      onClick={() => setInspectedNodeId(null)}
    >
      <div
        className="w-full max-w-lg bg-elevated border border-subtle rounded-t-[10px] sm:rounded-[6px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Inspector Bar with [A- / A+] Accessibility Controls (UiSartnamesi 5.3) */}
        <div className="px-4 py-3 bg-surface border-b border-subtle flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-[2px] bg-crimson/20 text-crimson font-mono text-[11px] font-bold">
              [{foundNode.category}]
            </span>
            <span className="font-mono text-xs text-secondary">{foundNode.node_id}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Dynamic Font Size Scaler [A- / A+] */}
            <button
              type="button"
              onClick={() => adjustDocFontSize(-1)}
              className="h-8 px-2.5 rounded-[4px] bg-elevated border border-subtle hover:border-amber text-secondary hover:text-primary font-mono text-xs font-bold"
              title="Metni Küçült (A-)"
            >
              A-
            </button>
            <span className="font-mono text-[11px] text-muted px-1">{docFontSize}sp</span>
            <button
              type="button"
              onClick={() => adjustDocFontSize(1)}
              className="h-8 px-2.5 rounded-[4px] bg-elevated border border-subtle hover:border-amber text-secondary hover:text-primary font-mono text-xs font-bold"
              title="Metni Büyüt (A+)"
            >
              A+
            </button>

            <button
              type="button"
              onClick={() => setInspectedNodeId(null)}
              className="ml-2 w-8 h-8 rounded-[4px] bg-elevated border border-subtle hover:border-crimson text-secondary hover:text-primary flex items-center justify-center"
              title="Kapat"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Highlighter Instruction Strip */}
        <div className="px-4 py-2 bg-amber/10 border-b border-amber/20 flex items-center gap-2 text-[11px] font-mono text-amber">
          <Highlighter size={13} className="shrink-0" />
          <span>
            Fosforlu Kalem: Belge içindeki sarı altı çizili kritik verilere dokunarak vurgulayabilirsiniz.
          </span>
        </div>

        {/* Scrollable Procedural Document Body */}
        <div className="p-4 overflow-y-auto flex-1">
          <ProceduralDocumentView
            node={foundNode}
            activeHighlights={room.my_highlights}
            fontSize={docFontSize}
            isPinned={isPinned}
            onToggleKeyword={toggleHighlight}
            compact
          />
        </div>

        {/* Bottom Fixed Ergonomic Action Bar (UiSartnamesi 3.3 & 5.1) */}
        <div className="p-4 bg-surface border-t border-subtle flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              pinNodeToBoard(foundNode!.node_id);
              setInspectedNodeId(null);
            }}
            className={`flex-1 min-h-[48px] px-4 py-3 rounded-[4px] font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              isPinned
                ? 'bg-emerald/20 text-emerald border border-emerald/40'
                : 'bg-crimson text-white hover:bg-crimson/90 shadow-crimson'
            }`}
          >
            <Pin size={15} />
            {isPinned ? 'ORTAK TAHTADA İĞNELİ (TEKRAR ODAKLA)' : '📌 BU KANITI ORTAK TAHTAYA İĞNELE'}
          </button>

          <button
            type="button"
            onClick={() => {
              pingItem('NODE', foundNode!.node_id, foundNode!.title);
            }}
            className="min-h-[48px] px-3.5 py-3 rounded-[4px] bg-elevated border border-subtle hover:border-crimson text-secondary hover:text-primary font-mono text-xs font-bold flex items-center gap-1.5"
          >
            <Radio size={15} className="text-crimson" />
            PING
          </button>
        </div>
      </div>
    </div>
  );
};
