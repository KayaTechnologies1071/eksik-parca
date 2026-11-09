export type GameMode = 'SOLO' | 'DUO' | 'GROUP';
export type DifficultyPreset = 'EASY' | 'STANDARD' | 'HARDCORE';
export type RoomStatus = 'LOBBY' | 'ACTIVE' | 'VOTING' | 'ENDED';
export type PlayerRole = 'DEDEKTİF' | 'KİRLİ_POLİS';
export type SuspectMark = 'SUSPECT' | 'NEUTRAL' | 'CLEARED';
export type AvatarId =
  | 'raven'
  | 'scales'
  | 'cyber_eye'
  | 'magnifier'
  | 'shield'
  | 'knight'
  | 'fingerprint'
  | 'owl';
export type ThemeColorId = 'crimson' | 'amber' | 'emerald' | 'cyan';
export type DocumentTemplateType =
  | 'OFFICIAL_REPORT'
  | 'RECEIPT'
  | 'DIGITAL_COMM'
  | 'SUSPECT_CARD';

export interface BadgeDef {
  id: string;
  title: string;
  desc: string;
}

export interface DirectiveDef {
  id: string;
  title: string;
  reward_xp: number;
  target: number;
  metric: 'solved_count' | 'total_connections' | 'best_streak' | 'hardcore_solved';
}

export interface SolvedCaseRecord {
  solved_at: string;
  best_accuracy: number;
  difficulty_preset: DifficultyPreset;
}

export interface DetectiveStats {
  matches_played: number;
  matches_won: number;
  win_streak: number;
  best_streak: number;
  fastest_solve_sec: number | null;
  total_connections: number;
  total_mistakes: number;
  lead_detective_count: number;
  dirty_cop_wins: number;
  solo_wins: number;
  duo_wins: number;
  group_wins: number;
}

export interface UserProfile {
  id: string;
  device_id: string;
  display_name: string;
  linked_provider: string | null;
  subscription_active: boolean;
  avatar_id: AvatarId;
  theme_color: ThemeColorId;
  specialty: string;
  motto: string;
  badge_code: string;
  xp: number;
  rank_level: number;
  rank_title: string;
  next_rank_xp: number;
  solved_cases: Record<string, SolvedCaseRecord>;
  badges: string[];
  claimed_directives: string[];
  stats: DetectiveStats;
  created_at: string;
}

export interface CasePack {
  pack_id: string;
  title: string;
  subtitle: string;
  price_tier: number;
  price_label: string;
  badge: string;
  is_active: boolean;
}

export interface CaseSummary {
  case_id: string;
  pack_id: string;
  version: number;
  content_hash: string;
  meta: {
    title: string;
    subtitle?: string;
    difficulty: number;
    duration_seconds: number;
    solo_token_limit: number;
    min_players: number;
    max_players: number;
    is_tutorial?: boolean;
    is_new_release?: boolean;
    supported_modes: GameMode[];
  };
  briefing: {
    victim: string;
    location: string;
    time_of_discovery: string;
    summary: string;
  };
  suspect_count: number;
  node_count: number;
  edge_count: number;
  is_unlocked: boolean;
  solved_info: SolvedCaseRecord | null;
}

export interface Suspect {
  id: string;
  name: string;
  age?: number;
  role: string;
  relation?: string;
  alibi: string;
}

export interface EvidenceNode {
  node_id: string;
  template: DocumentTemplateType;
  category: string;
  title: string;
  file_no: string;
  date: string;
  solo_cost: number;
  unlocked: boolean;
  content: string | null;
  highlights: string[];
}

export interface BoardNode {
  node_id: string;
  template: DocumentTemplateType;
  category: string;
  title: string;
  content: string;
  highlights: string[];
  pinned_by: string;
  is_inference: boolean;
  x: number;
  y: number;
}

export interface VerifiedEdge {
  edge_id: string;
  source_node: string;
  target_node: string;
  unlocked_node_id: string;
  initiated_by: string;
}

export interface ActivityLogItem {
  id: string;
  type: string;
  text: string;
  time: string;
}

export interface RoomPlayer {
  user_id: string;
  display_name: string;
  is_host: boolean;
  is_ready: boolean;
  is_bot: boolean;
  connected: boolean;
  connections_made: number;
  mistakes_made: number;
  has_voted: boolean;
  pinned_count: number;
  unpinned_count: number;
}

export interface DirtyCopIntel {
  real_killer_id: string;
  real_killer_name: string;
  frame_target_id: string;
  frame_target_name: string;
  cover_node_ids: string[];
}

export interface EndgameResult {
  is_solved: boolean;
  dirty_cop_won: boolean;
  reason: string;
  difficulty_preset: DifficultyPreset;
  difficulty_label: string;
  duration_sec: number;
  accuracy_rate: number;
  xp_gained: number;
  new_badges: string[];
  lead_detective: string;
  dirty_cop_name: string | null;
  chosen_suspect_id: string | null;
  chosen_suspect_name: string;
  real_killer_id: string;
  real_killer_name: string;
  required_nodes: string[];
  submitted_evidence_ids: string[];
  headline: string;
  story_summary: string;
}

export interface RoomSnapshot {
  room_code: string;
  status: RoomStatus;
  mode: GameMode;
  difficulty_preset: DifficultyPreset;
  difficulty_label: string;
  penalty_seconds_rule: number;
  host_user_id: string;
  case_id: string;
  seq: number;
  server_current_timestamp: number;
  match_start_timestamp: number | null;
  match_end_timestamp: number | null;
  solo_tokens: number;
  solo_token_limit: number;
  total_edges_count: number;
  case_meta: {
    title: string;
    subtitle: string;
    difficulty: number;
    duration_seconds: number;
    is_tutorial: boolean;
  } | null;
  briefing: {
    victim: string;
    location: string;
    time_of_discovery: string;
    summary: string;
  } | null;
  suspects: Suspect[];
  players: RoomPlayer[];
  my_role: PlayerRole;
  dirty_cop_intel: DirtyCopIntel | null;
  my_nodes: EvidenceNode[];
  my_highlights: string[];
  board_nodes: BoardNode[];
  verified_edges: VerifiedEdge[];
  activity_log: ActivityLogItem[];
  my_vote: {
    suspect_id: string;
    evidence_ids: string[];
  } | null;
  cooldown_until: number;
  endgame_result: EndgameResult | null;
}

export interface MatchHistoryItem {
  match_id: string;
  case_id: string;
  case_title: string;
  mode: GameMode;
  difficulty_preset?: DifficultyPreset;
  player_count: number;
  is_solved: boolean;
  duration_sec: number;
  accuracy_rate: number;
  xp_gained?: number;
  lead_detective: string;
  killer_name: string;
  arrested_name: string;
  played_at: string;
}
