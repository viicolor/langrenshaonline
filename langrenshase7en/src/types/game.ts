export type RoleType = 
  | 'werewolf' 
  | 'villager' 
  | 'seer' 
  | 'witch' 
  | 'hunter' 
  | 'guard' 
  | 'idiot'
  | 'unknown';

export type CampType = 'werewolf' | 'good' | 'neutral';

export type SkillType = 'active' | 'passive' | 'trigger';

export type TriggerPhase = 'night' | 'day' | 'death' | 'vote';

export interface Skill {
  id: string;
  skillName: string;
  skillCode: string;
  skillType: SkillType;
  triggerPhase?: TriggerPhase;
  effectParams?: any;
  effectDescription?: string;
  cooldown?: number;
  usageLimit?: number;
  isActive?: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  seatNumber: number;
  isReady: boolean;
  isHost: boolean;
  role?: RoleType;
  camp?: CampType;
  skill?: Skill;
  isAlive?: boolean;
}

export interface Room {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  host: string;
  createdAt: Date;
  /** 板子名称，来自 boards 表 */
  boardName?: string;
}

export interface GameState {
  phase: 'waiting' | 'countdown' | 'night' | 'day' | 'vote' | 'finished';
  round: number;
  currentPlayer?: string;
  timeLeft?: number;
}

export const ROLE_INFO: Record<RoleType, { name: string; team: 'wolf' | 'villager' | 'god'; color: string }> = {
  werewolf: { name: '狼人', team: 'wolf', color: 'hsl(0, 72%, 35%)' },
  villager: { name: '村民', team: 'villager', color: 'hsl(210, 60%, 45%)' },
  seer: { name: '预言家', team: 'god', color: 'hsl(270, 50%, 45%)' },
  witch: { name: '女巫', team: 'god', color: 'hsl(150, 50%, 35%)' },
  hunter: { name: '猎人', team: 'god', color: 'hsl(25, 85%, 50%)' },
  guard: { name: '守卫', team: 'god', color: 'hsl(200, 60%, 45%)' },
  idiot: { name: '白痴', team: 'god', color: 'hsl(45, 70%, 50%)' },
  unknown: { name: '???', team: 'villager', color: 'hsl(220, 15%, 50%)' },
};

export const CAMP_INFO: Record<CampType, { name: string; color: string }> = {
  werewolf: { name: '狼人阵营', color: 'hsl(0, 72%, 35%)' },
  good: { name: '好人阵营', color: 'hsl(210, 60%, 45%)' },
  neutral: { name: '中立阵营', color: 'hsl(45, 70%, 50%)' },
};
