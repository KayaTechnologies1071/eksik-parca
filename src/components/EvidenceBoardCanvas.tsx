import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { BoardNode } from '../types/game';
import {
  Crosshair,
  ZoomIn,
  ZoomOut,
  Link2,
  Sparkles,
  Eye,
  Users,
  Lightbulb,
  Layers,
  Radio,
  X,
  Check,
} from 'lucide-react';

// Compact card dimensions so 2 columns (20 + 156 + 24 + 156 + 20 = 376px) fit cleanly on 360-390px mobile portrait screens!
const CARD_W = 156;
const CARD_H = 86;

export const EvidenceBoardCanvas: React.FC = () => {
  const {
    room,
    lastVerifiedEdgeId,
    hintNodeId,
    penaltyAlert,
    lastPing,
    moveBoardNode,
    verifyEdge,
    setInspectedNodeId,
    setGameplayTab,
    requestPartnerPin,
    requestBoardHint,
    pingItem,
  } = useGameStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [camera, setCamera] = useState({ x: 14, y: 16, zoom: 0.96 });
  const [linkModeOnly, setLinkModeOnly] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [quickSheetOpen, setQuickSheetOpen] = useState(false);
  const [quickPickA, setQuickPickA] = useState<string | null>(null);
  const [quickPickB, setQuickPickB] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const hasAutoFittedRef = useRef(false);

  // Multi-touch pointer tracking for smooth 2-finger pinch-to-zoom on iOS & Android
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{
    initialDist: number;
    initialZoom: number;
    worldMidX: number;
    worldMidY: number;
  } | null>(null);

  const interactionRef = useRef<{
    mode: 'NONE' | 'PAN' | 'DRAG_NODE' | 'PULL_ROPE' | 'PINCH';
    activeNodeId: string | null;
    hoverTargetNodeId: string | null;
    startClientX: number;
    startClientY: number;
    startCamX: number;
    startCamY: number;
    nodeOffsetX: number;
    nodeOffsetY: number;
    ropeWorldX: number;
    ropeWorldY: number;
    localNodePositions: Map<string, { x: number; y: number }>;
    movedSignificantly: boolean;
  }>({
    mode: 'NONE',
    activeNodeId: null,
    hoverTargetNodeId: null,
    startClientX: 0,
    startClientY: 0,
    startCamX: 0,
    startCamY: 0,
    nodeOffsetX: 0,
    nodeOffsetY: 0,
    ropeWorldX: 0,
    ropeWorldY: 0,
    localNodePositions: new Map(),
    movedSignificantly: false,
  });

  useEffect(() => {
    if (!penaltyAlert) return;
    setIsShaking(true);
    const t = setTimeout(() => setIsShaking(false), 300);
    return () => clearTimeout(t);
  }, [penaltyAlert]);

  useEffect(() => {
    const timer = setInterval(() => {
      const until = room?.cooldown_until || 0;
      const rem = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setCooldownRemaining(rem);
    }, 200);
    return () => clearInterval(timer);
  }, [room?.cooldown_until]);

  const screenToWorld = useCallback(
    (clientX: number, clientY: number, cam = camera) => {
      const canvas = canvasRef.current;
      if (!canvas) return { wx: 0, wy: 0 };
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        wx: (sx - cam.x) / cam.zoom,
        wy: (sy - cam.y) / cam.zoom,
      };
    },
    [camera]
  );

  const getNodePos = useCallback((node: BoardNode) => {
    const local = interactionRef.current.localNodePositions.get(node.node_id);
    return local || { x: node.x, y: node.y };
  }, []);

  // Responsive Fit-to-Viewport Camera Helper
  const handleCenterBoard = useCallback(() => {
    const nodes = room?.board_nodes || [];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return;

    if (nodes.length === 0) {
      const baseZoom = rect.width < 420 ? 0.92 : 1.0;
      setCamera({ x: 16, y: 18, zoom: baseZoom });
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + CARD_W);
      maxY = Math.max(maxY, n.y + CARD_H);
    }

    const padX = rect.width < 440 ? 28 : 64;
    const padY = rect.width < 440 ? 44 : 72;
    const contentW = Math.max(220, maxX - minX + padX * 2);
    const contentH = Math.max(200, maxY - minY + padY * 2);

    const maxAllowedZoom = rect.width < 440 ? 1.0 : 1.15;
    const fitZoom = Math.max(
      0.52,
      Math.min(maxAllowedZoom, Math.min(rect.width / contentW, (rect.height - 40) / contentH))
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setCamera({
      x: Math.round(rect.width / 2 - cx * fitZoom),
      y: Math.round((rect.height - 24) / 2 - cy * fitZoom),
      zoom: Number(fitZoom.toFixed(2)),
    });
  }, [room?.board_nodes]);

  // Auto-fit once when board first opens with nodes
  useEffect(() => {
    if (!hasAutoFittedRef.current && (room?.board_nodes?.length || 0) > 0) {
      hasAutoFittedRef.current = true;
      setTimeout(() => handleCenterBoard(), 40);
    }
  }, [room?.board_nodes?.length, handleCenterBoard]);

  const focusSingleCard = (node: BoardNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const targetZoom = Math.max(0.88, Math.min(1.15, camera.zoom));
    setCamera({
      x: Math.round(rect.width / 2 - (node.x + CARD_W / 2) * targetZoom),
      y: Math.round(rect.height / 2 - (node.y + CARD_H / 2) * targetZoom),
      zoom: targetZoom,
    });
    setFocusedNodeId(node.node_id);
    setQuickSheetOpen(false);
  };

  // Hit-testing with generous +6dp mobile touch padding
  const hitTestNode = useCallback(
    (wx: number, wy: number): { node: BoardNode; zone: 'BODY' | 'LINK_PORT' | 'INSPECT' } | null => {
      const nodes = room?.board_nodes || [];
      const pad = 6;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const pos = getNodePos(n);
        if (
          wx >= pos.x - pad &&
          wx <= pos.x + CARD_W + pad &&
          wy >= pos.y - pad &&
          wy <= pos.y + CARD_H + 10
        ) {
          if (wx >= pos.x + CARD_W - 38 && wy <= pos.y + 28) {
            return { node: n, zone: 'INSPECT' };
          }
          if (linkModeOnly || wy >= pos.y + CARD_H - 24) {
            return { node: n, zone: 'LINK_PORT' };
          }
          return { node: n, zone: 'BODY' };
        }
      }
      return null;
    },
    [room?.board_nodes, getNodePos, linkModeOnly]
  );

  // Main 2D Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const targetW = Math.floor(rect.width * dpr);
    const targetH = Math.floor(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Tactical Dark Background (#090A0F)
    ctx.fillStyle = '#090A0F';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 2. Dot-Matrix Grid (24dp spacing)
    const gridSpacing = Math.max(14, 24 * camera.zoom);
    const offsetX = ((camera.x % gridSpacing) + gridSpacing) % gridSpacing;
    const offsetY = ((camera.y % gridSpacing) + gridSpacing) % gridSpacing;
    ctx.fillStyle = '#1E293B';
    for (let x = offsetX; x < rect.width; x += gridSpacing) {
      for (let y = offsetY; y < rect.height; y += gridSpacing) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    const nodes = room?.board_nodes || [];
    const nodeMap = new Map<string, BoardNode>();
    nodes.forEach((n) => nodeMap.set(n.node_id, n));

    // 3. Verified Edges (Quadratic Bezier Curves)
    const edges = room?.verified_edges || [];
    for (const edge of edges) {
      const src = nodeMap.get(edge.source_node);
      const tgt = nodeMap.get(edge.target_node);
      const unl = nodeMap.get(edge.unlocked_node_id);
      if (src && tgt) {
        const p1 = getNodePos(src);
        const p2 = getNodePos(tgt);
        const x1 = p1.x + CARD_W / 2;
        const y1 = p1.y + 9;
        const x2 = p2.x + CARD_W / 2;
        const y2 = p2.y + 9;

        const isJustVerified = lastVerifiedEdgeId === edge.edge_id;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 + 24;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        ctx.strokeStyle = isJustVerified ? '#10B981' : '#E11D48';
        ctx.lineWidth = isJustVerified ? 4.5 : 2.8;
        ctx.shadowColor = isJustVerified ? '#10B981' : '#E11D48';
        ctx.shadowBlur = isJustVerified ? 14 : 5;
        ctx.stroke();
        ctx.restore();

        if (unl) {
          const pUnl = getNodePos(unl);
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.moveTo(midX, (y1 + y2) / 2 + 12);
          ctx.lineTo(pUnl.x + CARD_W / 2, pUnl.y + 9);
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 4. Active Dragging Bezier Rope
    const inter = interactionRef.current;
    if (inter.mode === 'PULL_ROPE' && inter.activeNodeId) {
      const srcNode = nodeMap.get(inter.activeNodeId);
      if (srcNode) {
        const p1 = getNodePos(srcNode);
        const x1 = p1.x + CARD_W / 2;
        const y1 = p1.y + CARD_H;
        const x2 = inter.ropeWorldX;
        const y2 = inter.ropeWorldY;
        const ctrlX = (x1 + x2) / 2;
        const ctrlY = Math.max(y1, y2) + 30;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(ctrlX, ctrlY, x2, y2);
        ctx.strokeStyle = inter.hoverTargetNodeId ? '#10B981' : '#E11D48';
        ctx.lineWidth = 3.2;
        ctx.shadowColor = '#E11D48';
        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x2, y2, 7, 0, Math.PI * 2);
        ctx.fillStyle = inter.hoverTargetNodeId ? '#10B981' : '#E11D48';
        ctx.fill();
        ctx.restore();
      }
    }

    // 5. Board Node Cards
    for (const node of nodes) {
      const pos = getNodePos(node);
      const isLinkingSource = linkingSourceId === node.node_id || inter.activeNodeId === node.node_id;
      const isFocused = focusedNodeId === node.node_id;
      const isHoverTarget = inter.hoverTargetNodeId === node.node_id;
      const isHinted = hintNodeId === node.node_id;
      const isPinged =
        lastPing &&
        lastPing.target_type === 'NODE' &&
        lastPing.target_id === node.node_id &&
        Date.now() - lastPing.timestamp < 3000;

      ctx.save();

      if (isPinged || isHinted) {
        ctx.beginPath();
        ctx.roundRect(pos.x - 5, pos.y - 5, CARD_W + 10, CARD_H + 10, 8);
        ctx.strokeStyle = isHinted ? '#F59E0B' : '#E11D48';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Card Body
      ctx.beginPath();
      ctx.roundRect(pos.x, pos.y, CARD_W, CARD_H, 6);
      ctx.fillStyle = node.is_inference
        ? '#162420'
        : isLinkingSource || isHoverTarget || isFocused
        ? '#1C1F2B'
        : '#12141C';
      ctx.fill();

      ctx.lineWidth = isLinkingSource || isHoverTarget || isFocused ? 2 : 1;
      ctx.strokeStyle = isHoverTarget
        ? '#10B981'
        : isLinkingSource
        ? '#E11D48'
        : isFocused
        ? '#F59E0B'
        : node.is_inference
        ? '#10B981'
        : 'rgba(255, 255, 255, 0.14)';
      ctx.stroke();

      // Top Accent Bar
      ctx.beginPath();
      ctx.roundRect(pos.x, pos.y, CARD_W, 4, [6, 6, 0, 0]);
      ctx.fillStyle = node.is_inference ? '#10B981' : '#E11D48';
      ctx.fill();

      // Pin Head
      ctx.beginPath();
      ctx.arc(pos.x + CARD_W / 2, pos.y + 8, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = node.is_inference ? '#10B981' : '#E11D48';
      ctx.fill();

      // Category & Node ID
      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.fillStyle = node.is_inference ? '#10B981' : '#F59E0B';
      ctx.fillText(`[${node.category}]`, pos.x + 7, pos.y + 21);

      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('OKU↗', pos.x + CARD_W - 31, pos.y + 21);

      // Wrapped Title (2 crisp lines)
      ctx.font = '600 11px "Inter", sans-serif';
      ctx.fillStyle = '#F1F5F9';
      const words = node.title.split(' ');
      let line1 = '';
      let line2 = '';
      for (const w of words) {
        if ((line1 + w).length <= 19) {
          line1 += (line1 ? ' ' : '') + w;
        } else if ((line2 + w).length <= 19) {
          line2 += (line2 ? ' ' : '') + w;
        }
      }
      ctx.fillText(line1, pos.x + 7, pos.y + 39);
      if (line2) {
        ctx.fillText(line2, pos.x + 7, pos.y + 53);
      }

      // Bottom Touch-Friendly Link Handle
      ctx.beginPath();
      ctx.roundRect(pos.x + 5, pos.y + CARD_H - 21, CARD_W - 10, 17, 3);
      ctx.fillStyle = isLinkingSource ? 'rgba(225, 29, 72, 0.32)' : 'rgba(28, 31, 43, 0.95)';
      ctx.fill();

      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.fillStyle = isLinkingSource ? '#F1F5F9' : '#E11D48';
      ctx.textAlign = 'center';
      ctx.fillText(
        isLinkingSource ? '● HEDEF KARTA DOKUN' : '● İP ÇEK / BAĞLA',
        pos.x + CARD_W / 2,
        pos.y + CARD_H - 9
      );
      ctx.textAlign = 'left';

      ctx.restore();
    }

    ctx.restore();
  }, [
    camera,
    room?.board_nodes,
    room?.verified_edges,
    getNodePos,
    lastVerifiedEdgeId,
    linkingSourceId,
    focusedNodeId,
    hintNodeId,
    lastPing,
  ]);

  useEffect(() => {
    const id = requestAnimationFrame(renderCanvas);
    return () => cancelAnimationFrame(id);
  }, [renderCanvas]);

  // ResizeObserver so mobile address-bar collapse, orientation rotation, or Simulator Frame toggle redraws crisp!
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(renderCanvas);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [renderCanvas]);

  // Multi-Touch & Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const inter = interactionRef.current;

    // 2-Finger Pinch-to-Zoom Start
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midClientX = (pts[0].x + pts[1].x) / 2;
      const midClientY = (pts[0].y + pts[1].y) / 2;
      const { wx, wy } = screenToWorld(midClientX, midClientY);

      pinchStateRef.current = {
        initialDist: Math.max(20, dist),
        initialZoom: camera.zoom,
        worldMidX: wx,
        worldMidY: wy,
      };
      inter.mode = 'PINCH';
      inter.activeNodeId = null;
      return;
    }

    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    const hit = hitTestNode(wx, wy);

    inter.startClientX = e.clientX;
    inter.startClientY = e.clientY;
    inter.startCamX = camera.x;
    inter.startCamY = camera.y;
    inter.movedSignificantly = false;

    if (!hit) {
      setLinkingSourceId(null);
      setFocusedNodeId(null);
      inter.mode = 'PAN';
      inter.activeNodeId = null;
      requestAnimationFrame(renderCanvas);
      return;
    }

    const { node, zone } = hit;
    setFocusedNodeId(node.node_id);

    if (zone === 'INSPECT') {
      setInspectedNodeId(node.node_id);
      return;
    }

    // Tap-to-Link completion: if user already picked a source card, tapping second card connects them!
    if (linkingSourceId && linkingSourceId !== node.node_id) {
      verifyEdge(linkingSourceId, node.node_id);
      setLinkingSourceId(null);
      inter.mode = 'NONE';
      requestAnimationFrame(renderCanvas);
      return;
    }

    if (zone === 'LINK_PORT') {
      inter.mode = 'PULL_ROPE';
      inter.activeNodeId = node.node_id;
      inter.ropeWorldX = wx;
      inter.ropeWorldY = wy;
      inter.hoverTargetNodeId = null;
      setLinkingSourceId(node.node_id);
    } else {
      const pos = getNodePos(node);
      inter.mode = 'DRAG_NODE';
      inter.activeNodeId = node.node_id;
      inter.nodeOffsetX = wx - pos.x;
      inter.nodeOffsetY = wy - pos.y;
    }
    requestAnimationFrame(renderCanvas);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const inter = interactionRef.current;

    // 2-Finger Pinch-to-Zoom & Simultaneous Pan Update
    if (activePointersRef.current.size === 2 && pinchStateRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midClientX = (pts[0].x + pts[1].x) / 2;
      const midClientY = (pts[0].y + pts[1].y) / 2;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      const scaleRatio = dist / pinchStateRef.current.initialDist;
      const newZoom = Number(
        Math.max(0.45, Math.min(2.2, pinchStateRef.current.initialZoom * scaleRatio)).toFixed(2)
      );
      const sx = midClientX - rect.left;
      const sy = midClientY - rect.top;

      setCamera({
        zoom: newZoom,
        x: Math.round(sx - pinchStateRef.current.worldMidX * newZoom),
        y: Math.round(sy - pinchStateRef.current.worldMidY * newZoom),
      });
      return;
    }

    if (inter.mode === 'NONE' || inter.mode === 'PINCH') return;

    const dx = e.clientX - inter.startClientX;
    const dy = e.clientY - inter.startClientY;
    if (Math.hypot(dx, dy) > 6) {
      inter.movedSignificantly = true;
    }

    if (inter.mode === 'PAN') {
      setCamera((c) => ({
        ...c,
        x: inter.startCamX + dx,
        y: inter.startCamY + dy,
      }));
      return;
    }

    const { wx, wy } = screenToWorld(e.clientX, e.clientY);

    if (inter.mode === 'DRAG_NODE' && inter.activeNodeId) {
      const nx = Math.max(8, Math.min(1300, wx - inter.nodeOffsetX));
      const ny = Math.max(8, Math.min(1100, wy - inter.nodeOffsetY));
      inter.localNodePositions.set(inter.activeNodeId, { x: nx, y: ny });
      requestAnimationFrame(renderCanvas);
      return;
    }

    if (inter.mode === 'PULL_ROPE' && inter.activeNodeId) {
      // Gentle screen-edge auto-pan on mobile while pulling a rope
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        let panDx = 0;
        let panDy = 0;
        if (localX < 28) panDx = 6;
        else if (localX > rect.width - 28) panDx = -6;
        if (localY < 28) panDy = 6;
        else if (localY > rect.height - 28) panDy = -6;
        if (panDx !== 0 || panDy !== 0) {
          setCamera((c) => ({ ...c, x: c.x + panDx, y: c.y + panDy }));
        }
      }

      inter.ropeWorldX = wx;
      inter.ropeWorldY = wy;
      const targetHit = hitTestNode(wx, wy);
      inter.hoverTargetNodeId =
        targetHit && targetHit.node.node_id !== inter.activeNodeId
          ? targetHit.node.node_id
          : null;
      requestAnimationFrame(renderCanvas);
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }

    const inter = interactionRef.current;
    if (inter.mode === 'DRAG_NODE' && inter.activeNodeId) {
      const localPos = inter.localNodePositions.get(inter.activeNodeId);
      if (localPos && inter.movedSignificantly) {
        moveBoardNode(inter.activeNodeId, localPos.x, localPos.y);
      }
      inter.localNodePositions.delete(inter.activeNodeId);
    } else if (inter.mode === 'PULL_ROPE' && inter.activeNodeId) {
      if (inter.hoverTargetNodeId && inter.hoverTargetNodeId !== inter.activeNodeId) {
        verifyEdge(inter.activeNodeId, inter.hoverTargetNodeId);
        setLinkingSourceId(null);
      }
    }

    if (activePointersRef.current.size === 0) {
      inter.mode = 'NONE';
      inter.activeNodeId = null;
      inter.hoverTargetNodeId = null;
    }
    requestAnimationFrame(renderCanvas);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    setCamera((c) => ({
      ...c,
      zoom: Number(Math.max(0.45, Math.min(2.2, c.zoom + delta)).toFixed(2)),
    }));
  };

  const boardNodes = room?.board_nodes || [];
  const focusedCard = boardNodes.find((b) => b.node_id === focusedNodeId) || null;
  const hasPartnerUnpinned = (room?.players || []).some(
    (p) => p.unpinned_count > 0 && p.user_id !== useGameStore.getState().user?.id
  );

  const handleQuickConnectSubmit = () => {
    if (quickPickA && quickPickB && quickPickA !== quickPickB) {
      verifyEdge(quickPickA, quickPickB);
      setQuickPickA(null);
      setQuickPickB(null);
      setQuickSheetOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col bg-primary overflow-hidden select-none ${
        isShaking ? 'animate-board-shake ring-2 ring-crimson' : ''
      }`}
    >
      {/* Responsive Mobile-First Board Sub-Toolbar (Never overflows narrow 320px-390px screens!) */}
      <div className="px-2.5 py-2 bg-surface/95 border-b border-subtle flex items-center justify-between gap-1.5 z-10 shrink-0">
        <div className="flex items-center gap-1.5 font-mono text-[11px] min-w-0">
          <span className="px-2 py-1 rounded-[3px] bg-crimson/20 text-crimson font-bold border border-crimson/40 whitespace-nowrap">
            TAHTA ({boardNodes.length})
          </span>
          <span className="px-2 py-1 rounded-[3px] bg-emerald/15 text-emerald font-bold border border-emerald/40 whitespace-nowrap">
            BAĞ: {room?.verified_edges.length || 0}/{room?.total_edges_count || '?'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Academy Hint Button (Available in EASY mode or Tutorial) */}
          {(room?.difficulty_preset === 'EASY' || room?.case_meta?.is_tutorial) && (
            <button
              type="button"
              onClick={requestBoardHint}
              className="h-8 px-2 rounded-[4px] bg-amber/15 hover:bg-amber/25 border border-amber/40 text-amber font-mono text-[11px] font-bold flex items-center gap-1"
              title="Akademi İpucu Al"
            >
              <Lightbulb size={13} />
              <span className="hidden sm:inline">İPUCU</span>
            </button>
          )}

          {hasPartnerUnpinned && (
            <button
              type="button"
              onClick={requestPartnerPin}
              className="h-8 px-2 rounded-[4px] bg-amber/15 hover:bg-amber/25 text-amber border border-amber/40 font-mono text-[11px] font-bold flex items-center gap-1"
              title="Partnerden Kanıt İste"
            >
              <Users size={13} />
              <span className="hidden sm:inline">KANIT İSTE</span>
            </button>
          )}

          {/* Mobile Quick-Connect Sheet Button (One-Handed Thumb Mode) */}
          {boardNodes.length >= 2 && (
            <button
              type="button"
              onClick={() => setQuickSheetOpen((v) => !v)}
              className={`h-8 px-2.5 rounded-[4px] font-mono text-[11px] font-bold flex items-center gap-1 border transition-all ${
                quickSheetOpen
                  ? 'bg-amber text-black border-amber'
                  : 'bg-elevated text-primary border-subtle hover:border-amber'
              }`}
              title="Tek Elle Hızlı Bağla ve Kart Listesi"
            >
              <Layers size={13} />
              <span>HIZLI BAĞLA</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setLinkModeOnly((v) => !v)}
            className={`h-8 px-2.5 rounded-[4px] font-mono text-[11px] font-bold flex items-center gap-1 border transition-all ${
              linkModeOnly
                ? 'bg-crimson text-white border-crimson shadow-crimson'
                : 'bg-elevated text-secondary border-subtle hover:text-primary'
            }`}
            title="Sürükleme modunu değiştir"
          >
            <Link2 size={13} />
            <span className="hidden sm:inline">{linkModeOnly ? 'İP MODU' : 'TAŞI'}</span>
          </button>
        </div>
      </div>

      {/* Tap-to-Link Active Instruction Strip */}
      {linkingSourceId && (
        <div className="px-3 py-1.5 bg-crimson/20 border-b border-crimson/50 flex items-center justify-between gap-2 text-[11px] font-mono text-primary z-10 shrink-0">
          <span className="truncate">
            🔗 <strong>#{linkingSourceId}</strong> seçildi — Bağlamak için 2. karta dokunun!
          </span>
          <button
            type="button"
            onClick={() => setLinkingSourceId(null)}
            className="px-2 py-0.5 rounded-[2px] bg-crimson text-white font-bold shrink-0"
          >
            İPTAL
          </button>
        </div>
      )}

      {/* Anti-Cheat Cooldown Banner */}
      {cooldownRemaining > 0 && (
        <div className="px-3 py-1.5 bg-crimson text-white font-mono text-[11px] font-bold flex items-center justify-between z-20 animate-pulse shrink-0">
          <span>
            ⚠️ HATALI BAĞLANTI (-00:{room?.penalty_seconds_rule || 30}) — KİLİT: {cooldownRemaining} SN
          </span>
          <span>KORUMA</span>
        </div>
      )}

      {/* Interactive 2D Canvas Surface */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          onWheel={handleWheel}
          className="w-full h-full block touch-none cursor-grab active:cursor-grabbing"
        />

        {/* Empty State Helper */}
        {boardNodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
            <div className="w-full max-w-xs sm:max-w-sm p-4 sm:p-5 rounded-[6px] bg-surface/95 border border-subtle pointer-events-auto shadow-xl">
              <Sparkles className="mx-auto text-amber mb-2" size={26} />
              <h3 className="font-sans font-semibold text-sm sm:text-base text-primary mb-1">
                Ortak Kanıt Tahtası Boş
              </h3>
              <p className="font-mono text-xs text-secondary leading-relaxed mb-3.5">
                "2. DOSYAM" sekmesindeki belgeleri açıp{' '}
                <span className="text-crimson font-semibold">[📌 TAHTAYA İĞNELE]</span> ile buraya
                gönderin ve iki kanıtı birbirine bağlayın.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setGameplayTab('FILES')}
                  className="w-full min-h-[44px] px-3 py-2 rounded-[4px] bg-crimson text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Eye size={14} />
                  GİZLİ DOSYAMA GİT
                </button>
                {hasPartnerUnpinned && (
                  <button
                    type="button"
                    onClick={requestPartnerPin}
                    className="w-full min-h-[44px] px-3 py-2 rounded-[4px] bg-elevated border border-amber/40 text-amber font-mono text-xs font-bold"
                  >
                    PARTNERDEN KANIT İSTE
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top-Right Compact Camera Zoom & Fit Controls (Moved out of bottom thumb zone so they never collide with Selected Card Action Dock!) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={handleCenterBoard}
            className="w-9 h-9 rounded-[4px] bg-surface/90 border border-subtle hover:border-crimson text-primary flex items-center justify-center shadow-xl"
            title="Tüm Kartları Ekrana Sığdır ve Merkezle"
          >
            <Crosshair size={16} className="text-crimson" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCamera((c) => ({ ...c, zoom: Math.min(2.2, Number((c.zoom + 0.15).toFixed(2))) }))
            }
            className="w-9 h-9 rounded-[4px] bg-surface/90 border border-subtle hover:border-crimson text-secondary hover:text-primary flex items-center justify-center shadow-xl"
            title="Yakınlaştır"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              setCamera((c) => ({ ...c, zoom: Math.max(0.45, Number((c.zoom - 0.15).toFixed(2))) }))
            }
            className="w-9 h-9 rounded-[4px] bg-surface/90 border border-subtle hover:border-crimson text-secondary hover:text-primary flex items-center justify-center shadow-xl"
            title="Uzaklaştır"
          >
            <ZoomOut size={16} />
          </button>
          <div className="px-1.5 py-0.5 rounded-[3px] bg-surface/90 border border-subtle font-mono text-[9px] text-center text-secondary">
            %{Math.round(camera.zoom * 100)}
          </div>
        </div>

        {/* One-Handed Mobile Selected Card Action Pill (Bottom Thumb Zone!) */}
        {focusedCard && !quickSheetOpen && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 max-w-md mx-auto p-2.5 rounded-[6px] bg-elevated/95 border border-subtle shadow-2xl z-10 animate-doc-open">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-[2px] bg-crimson/20 text-crimson font-mono text-[10px] font-bold shrink-0">
                  #{focusedCard.node_id}
                </span>
                <span className="font-sans font-semibold text-xs text-primary truncate">
                  {focusedCard.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFocusedNodeId(null)}
                className="text-secondary hover:text-primary p-0.5"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setInspectedNodeId(focusedCard.node_id)}
                className="min-h-[40px] px-2 py-1.5 rounded-[4px] bg-surface border border-subtle hover:border-amber text-primary font-mono text-[11px] font-bold flex items-center justify-center gap-1"
              >
                <Eye size={13} className="text-amber" />
                OKU
              </button>

              <button
                type="button"
                onClick={() => {
                  if (linkingSourceId === focusedCard.node_id) {
                    setLinkingSourceId(null);
                  } else if (linkingSourceId) {
                    verifyEdge(linkingSourceId, focusedCard.node_id);
                    setLinkingSourceId(null);
                  } else {
                    setLinkingSourceId(focusedCard.node_id);
                  }
                }}
                className={`min-h-[40px] px-2 py-1.5 rounded-[4px] font-mono text-[11px] font-bold flex items-center justify-center gap-1 ${
                  linkingSourceId === focusedCard.node_id
                    ? 'bg-emerald text-black'
                    : 'bg-crimson text-white'
                }`}
              >
                <Link2 size={13} />
                {linkingSourceId === focusedCard.node_id ? 'SEÇİLDİ' : 'BAĞLA'}
              </button>

              <button
                type="button"
                onClick={() => pingItem('NODE', focusedCard.node_id, focusedCard.title)}
                className="min-h-[40px] px-2 py-1.5 rounded-[4px] bg-surface border border-subtle hover:border-crimson text-secondary hover:text-primary font-mono text-[11px] font-bold flex items-center justify-center gap-1"
              >
                <Radio size={13} className="text-crimson" />
                PING
              </button>
            </div>
          </div>
        )}

        {/* Mobile One-Handed Quick-Connect Bottom Sheet Drawer */}
        {quickSheetOpen && (
          <div className="absolute inset-x-0 bottom-0 max-h-[78%] bg-elevated border-t-2 border-amber rounded-t-[10px] shadow-2xl flex flex-col z-20 animate-doc-open">
            <div className="px-3.5 py-2.5 bg-surface border-b border-subtle flex items-center justify-between">
              <div>
                <h4 className="font-sans font-bold text-xs sm:text-sm text-primary">
                  ⚡ Tek Elle Hızlı Bağlantı ve Kart Radarı
                </h4>
                <p className="font-mono text-[10px] text-secondary">
                  Birleştirmek istediğiniz 2 kanıt kartını seçin:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickSheetOpen(false)}
                className="w-8 h-8 rounded-[4px] bg-elevated border border-subtle flex items-center justify-center text-secondary hover:text-primary"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
              {boardNodes.map((bn) => {
                const isPicked = quickPickA === bn.node_id || quickPickB === bn.node_id;
                return (
                  <div
                    key={bn.node_id}
                    onClick={() => {
                      if (quickPickA === bn.node_id) setQuickPickA(null);
                      else if (quickPickB === bn.node_id) setQuickPickB(null);
                      else if (!quickPickA) setQuickPickA(bn.node_id);
                      else setQuickPickB(bn.node_id);
                    }}
                    className={`p-2.5 rounded-[5px] border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isPicked
                        ? 'bg-crimson/15 border-crimson text-primary'
                        : bn.is_inference
                        ? 'bg-surface border-emerald/40 text-primary'
                        : 'bg-surface border-subtle text-primary'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className={bn.is_inference ? 'text-emerald font-bold' : 'text-amber'}>
                          [{bn.category}]
                        </span>
                        <span className="text-secondary">#{bn.node_id}</span>
                      </div>
                      <div className="font-sans font-semibold text-xs truncate">{bn.title}</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          focusSingleCard(bn);
                        }}
                        className="px-2 py-1 rounded-[3px] bg-elevated border border-subtle font-mono text-[10px] text-secondary hover:text-primary"
                      >
                        ODAKLA
                      </button>
                      <div
                        className={`w-6 h-6 rounded-[4px] flex items-center justify-center font-mono text-xs font-bold ${
                          isPicked
                            ? 'bg-crimson text-white'
                            : 'bg-elevated text-muted border border-subtle'
                        }`}
                      >
                        {isPicked ? <Check size={13} /> : '+'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-surface border-t border-subtle flex items-center gap-2">
              <button
                type="button"
                disabled={!quickPickA || !quickPickB}
                onClick={handleQuickConnectSubmit}
                className="flex-1 min-h-[46px] px-4 py-2.5 rounded-[4px] bg-crimson disabled:bg-elevated disabled:text-muted text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-crimson"
              >
                <Link2 size={15} />
                {quickPickA && quickPickB
                  ? `BAĞLA: #${quickPickA} ↔ #${quickPickB}`
                  : '2 KANIT KARTI SEÇİN'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
