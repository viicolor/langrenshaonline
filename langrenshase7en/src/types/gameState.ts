export type GamePhase = 'waiting' | 'night' | 'day' | 'voting' | 'finished';

export type RoleType = 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter' | 'guard' | 'idiot';

export type DeathCause = 'wolf_kill' | 'vote' | 'poison' | 'hunter_shot' | 'none';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  seatNumber: number;
  isAlive: boolean;
  role: RoleType | null;
  isHost: boolean;
  isReady: boolean;
  isSpectator: boolean;
}

export interface GameAction {
  id: string;
  playerId: string;
  actionType: string;
  targetId?: string;
  round: number;
  phase: GamePhase;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface NightAction {
  type: 'wolf_kill' | 'seer_check' | 'witch_save' | 'witch_poison' | 'guard_protect';
  actorId: string;
  targetId?: string;
  targetName?: string;
}

export interface Vote {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
  round: number;
}

export interface VoteResult {
  type: 'eliminated' | 'tie' | 'skip';
  eliminatedPlayer?: string;
  votes: Record<string, number>;
}

export interface NightResult {
  deaths: Array<{
    playerId: string;
    playerName: string;
    cause: DeathCause;
  }>;
  savedPlayers: string[];
  blockedKills: Array<{
    playerId: string;
    playerName: string;
  }>;
}

export interface GameState {
  gameId: string;
  roomId: string;
  currentPhase: GamePhase;
  currentRound: number;
  phaseStartTime: number;
  phaseEndTime?: number;
  players: Player[];
  votes: Vote[];
  nightActions: NightAction[];
  gameActions: GameAction[];
  winner?: 'good' | 'wolf' | null;
  winnerReason?: string;
}

export interface PhaseTransition {
  from: GamePhase;
  to: GamePhase;
  round: number;
  timestamp: number;
}

export interface ActionValidation {
  valid: boolean;
  reason?: string;
}

export interface GameEvent {
  type: 'phase_change' | 'player_death' | 'player_saved' | 'vote_cast' | 'skill_used' | 'game_end';
  data: Record<string, unknown>;
  timestamp: number;
}
