import { GameState, GamePhase, Player, GameAction, NightAction, Vote, VoteResult, NightResult, PhaseTransition, ActionValidation, GameEvent, DeathCause } from '@/types/gameState';

/** 流程阶段配置，来自 processes.phase_config，用于阶段顺序与超时后下一阶段 */
export interface PhaseConfig {
  phases: { name: string; duration: number; next_phase: string }[];
}

export class GameStateMachine {
  private state: GameState;
  private listeners: Set<(event: GameEvent) => void> = new Set();
  private phaseTimers: Map<string, NodeJS.Timeout> = new Map();
  private phaseConfig: PhaseConfig | null = null;

  constructor(initialState: GameState, phaseConfig?: PhaseConfig | null) {
    this.state = initialState;
    this.phaseConfig = phaseConfig ?? null;
  }

  setPhaseConfig(config: PhaseConfig | null): void {
    this.phaseConfig = config;
  }

  getPhaseDuration(phaseName: string, defaultSeconds: number = 120): number {
    if (!this.phaseConfig?.phases?.length) return defaultSeconds;
    const phase = this.phaseConfig.phases.find(p => p.name === phaseName);
    return phase?.duration ?? defaultSeconds;
  }

  getState(): GameState {
    return { ...this.state };
  }

  updateState(updates: Partial<GameState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  addListener(listener: (event: GameEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: GameEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  validateAction(action: GameAction): ActionValidation {
    const player = this.state.players.find(p => p.id === action.playerId);
    
    if (!player) {
      return { valid: false, reason: '玩家不存在' };
    }

    if (!player.isAlive) {
      return { valid: false, reason: '玩家已死亡' };
    }

    if (player.isSpectator) {
      return { valid: false, reason: '观战者不能执行操作' };
    }

    if (!this.isActionAvailable(action.actionType, this.state.currentPhase)) {
      return { valid: false, reason: '该阶段不可用此操作' };
    }

    if (this.hasPlayerUsedSkill(action.playerId, this.state.currentRound)) {
      return { valid: false, reason: '本回合已使用技能' };
    }

    return { valid: true };
  }

  private isActionAvailable(actionType: string, phase: GamePhase): boolean {
    const actionPhaseMap: Record<string, GamePhase[]> = {
      'seer_check': ['night'],
      'witch_save': ['night'],
      'witch_poison': ['night'],
      'guard_protect': ['night'],
      'wolf_kill': ['night'],
      'vote': ['voting'],
      'skip_vote': ['voting'],
      'hunter_shot': ['day', 'voting'],
      'idiot_reveal': ['voting'],
    };

    const availablePhases = actionPhaseMap[actionType];
    return availablePhases ? availablePhases.includes(phase) : false;
  }

  private hasPlayerUsedSkill(playerId: string, round: number): boolean {
    return this.state.nightActions.some(
      action => action.actorId === playerId && action.type !== 'wolf_kill'
    );
  }

  transitionPhase(newPhase: GamePhase, round?: number): PhaseTransition {
    const transition: PhaseTransition = {
      from: this.state.currentPhase,
      to: newPhase,
      round: round || this.state.currentRound,
      timestamp: Date.now(),
    };

    this.updateState({
      currentPhase: newPhase,
      currentRound: round || this.state.currentRound,
      phaseStartTime: Date.now(),
      phaseEndTime: undefined,
    });

    this.notifyListeners({
      type: 'phase_change',
      data: { transition },
      timestamp: Date.now(),
    });

    return transition;
  }

  setPhaseTimeout(duration: number): void {
    const timerKey = `${this.state.currentRound}-${this.state.currentPhase}`;
    
    if (this.phaseTimers.has(timerKey)) {
      clearTimeout(this.phaseTimers.get(timerKey));
    }

    const timer = setTimeout(() => {
      this.handlePhaseTimeout();
    }, duration * 1000);

    this.phaseTimers.set(timerKey, timer);
    this.updateState({
      phaseEndTime: Date.now() + duration * 1000,
    });
  }

  private handlePhaseTimeout(): void {
    const currentPhase = this.state.currentPhase;
    const currentRound = this.state.currentRound;

    if (currentPhase === 'voting') {
      this.handleVotingTimeout();
      return;
    }

    const nextFromConfig = this.phaseConfig?.phases?.find(p => p.name === currentPhase)?.next_phase;
    if (nextFromConfig && ['night', 'day', 'voting', 'finished'].includes(nextFromConfig)) {
      this.transitionPhase(nextFromConfig as GamePhase, currentRound);
      return;
    }

    switch (currentPhase) {
      case 'night':
        this.transitionPhase('day', currentRound);
        break;
      case 'day':
        this.transitionPhase('voting', currentRound);
        break;
    }
  }

  private handleVotingTimeout(): void {
    const votes = this.state.votes.filter(v => v.round === this.state.currentRound);
    if (votes.length === 0) {
      this.transitionPhase('night', this.state.currentRound + 1);
    }
  }

  addNightAction(action: NightAction): void {
    this.updateState({
      nightActions: [...this.state.nightActions, action],
    });

    this.notifyListeners({
      type: 'skill_used',
      data: { action },
      timestamp: Date.now(),
    });
  }

  addVote(vote: Vote): void {
    this.updateState({
      votes: [...this.state.votes, vote],
    });

    this.notifyListeners({
      type: 'vote_cast',
      data: { vote },
      timestamp: Date.now(),
    });
  }

  setPlayerDeath(playerId: string, cause: DeathCause): void {
    const players = this.state.players.map(p => 
      p.id === playerId ? { ...p, isAlive: false } : p
    );

    this.updateState({ players });

    this.notifyListeners({
      type: 'player_death',
      data: { playerId, cause },
      timestamp: Date.now(),
    });
  }

  setPlayerSaved(playerId: string): void {
    this.notifyListeners({
      type: 'player_saved',
      data: { playerId },
      timestamp: Date.now(),
    });
  }

  endGame(winner: 'good' | 'wolf', reason: string): void {
    this.updateState({
      winner,
      winnerReason: reason,
      currentPhase: 'finished',
    });

    this.notifyListeners({
      type: 'game_end',
      data: { winner, reason },
      timestamp: Date.now(),
    });

    this.clearAllTimers();
  }

  clearAllTimers(): void {
    this.phaseTimers.forEach(timer => clearTimeout(timer));
    this.phaseTimers.clear();
  }

  getAlivePlayers(): Player[] {
    return this.state.players.filter(p => p.isAlive && !p.isSpectator);
  }

  getPlayersByRole(role: string): Player[] {
    return this.state.players.filter(p => p.role === role && p.isAlive);
  }

  getWolfPlayers(): Player[] {
    return this.getPlayersByRole('werewolf');
  }

  getGoodPlayers(): Player[] {
    return this.getAlivePlayers().filter(p => 
      p.role === 'villager' || 
      ['seer', 'witch', 'hunter', 'guard', 'idiot'].includes(p.role || '')
    );
  }

  canVote(playerId: string): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    return player?.isAlive === true && !player?.isSpectator;
  }

  hasVoted(playerId: string, round: number): boolean {
    return this.state.votes.some(
      v => v.voterId === playerId && v.round === round
    );
  }

  getGameStatus(): { canStart: boolean; canEnd: boolean; reason: string } {
    const alivePlayers = this.getAlivePlayers();
    const aliveWolves = this.getWolfPlayers();
    const aliveGood = this.getGoodPlayers();

    if (this.state.currentPhase === 'waiting') {
      const allReady = this.state.players.every(p => p.isReady);
      if (alivePlayers.length < 6) {
        return { canStart: false, canEnd: false, reason: '玩家数量不足（至少6人）' };
      }
      if (!allReady) {
        return { canStart: false, canEnd: false, reason: '等待所有玩家准备' };
      }
      return { canStart: true, canEnd: false, reason: '可以开始游戏' };
    }

    if (aliveWolves.length === 0) {
      return { canStart: false, canEnd: true, reason: '所有狼人已被淘汰' };
    }

    if (aliveWolves.length >= aliveGood.length) {
      return { canStart: false, canEnd: true, reason: '狼人数量大于等于好人数量' };
    }

    if (aliveGood.filter(p => ['seer', 'witch', 'hunter', 'guard', 'idiot'].includes(p.role || '')).length === 0 && aliveWolves.length > 0) {
      return { canStart: false, canEnd: true, reason: '所有神职已被淘汰' };
    }

    return { canStart: false, canEnd: false, reason: '游戏进行中' };
  }

  destroy(): void {
    this.clearAllTimers();
    this.listeners.clear();
  }
}
