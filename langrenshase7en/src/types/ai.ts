import { RoleType, Player } from '@/types/game';

export type AIProvider = 'openai' | 'tongyi' | 'rule_based';

export type AIPersonality = 'aggressive' | 'calm' | 'analytical' | 'deceptive' | 'cooperative';

export interface AIPlayer extends Player {
  id: string;
  name: string;
  avatar: string;
  role: RoleType;
  personality: AIPersonality;
  provider: AIProvider;
  isAI: true;
  aggressiveness: number;
  deceptionLevel: number;
  cooperationLevel: number;
  speakingStyle: 'aggressive' | 'calm' | 'analytical';
  memory: AIMemory[];
  lastActionTime: number;
  actionCooldown: number;
}

export interface AIMemory {
  type: 'vote' | 'skill' | 'death' | 'chat' | 'phase_change';
  timestamp: number;
  data: Record<string, unknown>;
}

export interface AIAction {
  type: 'vote' | 'skill' | 'chat';
  targetId?: string;
  message?: string;
  priority: number;
  timestamp: number;
}

export interface AIContext {
  currentPhase: 'waiting' | 'night' | 'day' | 'voting' | 'finished';
  currentRound: number;
  players: Player[];
  votes: Array<{
    voterId: string;
    targetId: string;
    round: number;
  }>;
  nightActions: Array<{
    type: string;
    actorId: string;
    targetId?: string;
    round: number;
  }>;
  messages: Array<{
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
  }>;
  deaths: Array<{
    playerId: string;
    playerName: string;
    cause: string;
    round: number;
  }>;
}

export interface AIPromptTemplate {
  role: RoleType;
  personality: AIPersonality;
  phase: string;
  context: string;
  availableActions: string[];
  constraints: string[];
}

export interface AIResponse {
  action: AIAction;
  message?: string;
  reasoning?: string;
  confidence: number;
}
