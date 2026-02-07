import { GameState, Player, RoleType, DeathCause } from '@/types/gameState';

export type Camp = 'werewolf' | 'good' | 'neutral';

/** 角色类型 -> 阵营，来自 cards.camp。不传时使用内置规则（werewolf/villager/seer 等） */
export type RoleToCampMap = Partial<Record<string, Camp>>;

export interface WinResult {
  winner: 'good' | 'wolf' | null;
  reason: string;
  winningPlayers: Player[];
  losingPlayers: Player[];
  gameDuration: number;
  statistics: {
    totalRounds: number;
    totalVotes: number;
    totalDeaths: number;
    wolfKills: number;
    witchSaves: number;
    witchPoisons: number;
    guardProtects: number;
    seerChecks: number;
  };
}

function getCamp(role: string | null, roleToCamp?: RoleToCampMap): Camp | null {
  if (!role) return null;
  const c = roleToCamp?.[role];
  if (c) return c;
  if (role === 'werewolf') return 'werewolf';
  if (['villager', 'seer', 'witch', 'hunter', 'guard', 'idiot'].includes(role)) return 'good';
  return null;
}

export class WinConditionChecker {
  /** 若传入 roleToCamp（来自 cards.camp），则按阵营判胜负；否则按内置角色规则 */
  checkWinCondition(state: GameState, roleToCamp?: RoleToCampMap): WinResult {
    const alivePlayers = state.players.filter(p => p.isAlive && !p.isSpectator);
    const useCamp = roleToCamp && Object.keys(roleToCamp).length > 0;
    const aliveWolves = useCamp
      ? alivePlayers.filter(p => getCamp(p.role, roleToCamp) === 'werewolf')
      : alivePlayers.filter(p => p.role === 'werewolf');
    const aliveVillagers = useCamp ? [] : alivePlayers.filter(p => p.role === 'villager');
    const aliveGods = useCamp
      ? alivePlayers.filter(p => getCamp(p.role, roleToCamp) === 'good')
      : alivePlayers.filter(p =>
          ['seer', 'witch', 'hunter', 'guard', 'idiot'].includes(p.role || '')
        );
    const aliveGood = useCamp
      ? alivePlayers.filter(p => getCamp(p.role, roleToCamp) === 'good')
      : [...aliveVillagers, ...aliveGods];

    if (aliveWolves.length === 0) {
      return {
        winner: 'good',
        reason: '所有狼人已被淘汰',
        winningPlayers: aliveGood,
        losingPlayers: state.players.filter(p => p.role === 'werewolf'),
        gameDuration: this.calculateGameDuration(state),
        statistics: this.calculateStatistics(state),
      };
    }

    if (!useCamp && aliveVillagers.length === 0 && aliveWolves.length > 0) {
      return {
        winner: 'wolf',
        reason: '屠边：所有村民已被淘汰',
        winningPlayers: aliveWolves,
        losingPlayers: aliveGood,
        gameDuration: this.calculateGameDuration(state),
        statistics: this.calculateStatistics(state),
      };
    }

    if (aliveGods.length === 0 && aliveWolves.length > 0) {
      return {
        winner: 'wolf',
        reason: '屠边：所有神职已被淘汰',
        winningPlayers: aliveWolves,
        losingPlayers: aliveGood,
        gameDuration: this.calculateGameDuration(state),
        statistics: this.calculateStatistics(state),
      };
    }

    if (useCamp && aliveGood.length === 0 && aliveWolves.length > 0) {
      return {
        winner: 'wolf',
        reason: '好人阵营已全部出局',
        winningPlayers: aliveWolves,
        losingPlayers: aliveGood,
        gameDuration: this.calculateGameDuration(state),
        statistics: this.calculateStatistics(state),
      };
    }

    if (aliveWolves.length >= aliveGood.length) {
      return {
        winner: 'wolf',
        reason: '狼人数量大于等于好人数量',
        winningPlayers: aliveWolves,
        losingPlayers: aliveGood,
        gameDuration: this.calculateGameDuration(state),
        statistics: this.calculateStatistics(state),
      };
    }

    return {
      winner: null,
      reason: '游戏继续',
      winningPlayers: [],
      losingPlayers: [],
      gameDuration: 0,
      statistics: this.calculateStatistics(state),
    };
  }

  private calculateGameDuration(state: GameState): number {
    if (state.currentPhase === 'waiting') {
      return 0;
    }

    const startTime = state.phaseStartTime;
    const endTime = Date.now();
    return Math.floor((endTime - startTime) / 1000);
  }

  private calculateStatistics(state: GameState): WinResult['statistics'] {
    const nightActions = state.nightActions;
    
    return {
      totalRounds: state.currentRound,
      totalVotes: state.votes.length,
      totalDeaths: state.players.filter(p => !p.isAlive).length,
      wolfKills: nightActions.filter(na => na.type === 'wolf_kill').length,
      witchSaves: nightActions.filter(na => na.type === 'witch_save').length,
      witchPoisons: nightActions.filter(na => na.type === 'witch_poison').length,
      guardProtects: nightActions.filter(na => na.type === 'guard_protect').length,
      seerChecks: nightActions.filter(na => na.type === 'seer_check').length,
    };
  }

  canEndGame(state: GameState, roleToCamp?: RoleToCampMap): boolean {
    const result = this.checkWinCondition(state, roleToCamp);
    return result.winner !== null;
  }

  getGameStatus(state: GameState, roleToCamp?: RoleToCampMap): {
    canStart: boolean;
    canEnd: boolean;
    reason: string;
  } {
    const alivePlayers = state.players.filter(p => p.isAlive && !p.isSpectator);
    const useCamp = roleToCamp && Object.keys(roleToCamp).length > 0;
    const aliveWolves = useCamp
      ? alivePlayers.filter(p => getCamp(p.role, roleToCamp) === 'werewolf')
      : alivePlayers.filter(p => p.role === 'werewolf');
    const aliveGood = useCamp
      ? alivePlayers.filter(p => getCamp(p.role, roleToCamp) === 'good')
      : alivePlayers.filter(
          p =>
            p.role === 'villager' ||
            ['seer', 'witch', 'hunter', 'guard', 'idiot'].includes(p.role || '')
        );

    if (state.currentPhase === 'waiting') {
      if (alivePlayers.length < 6) {
        return {
          canStart: false,
          canEnd: false,
          reason: '玩家数量不足（至少6人）',
        };
      }

      const allReady = state.players.every(p => p.isReady);
      if (!allReady) {
        return {
          canStart: false,
          canEnd: false,
          reason: '等待所有玩家准备',
        };
      }

      return {
        canStart: true,
        canEnd: false,
        reason: '可以开始游戏',
      };
    }

    if (aliveWolves.length === 0) {
      return {
        canStart: false,
        canEnd: true,
        reason: '所有狼人已被淘汰',
      };
    }

    if (aliveWolves.length >= aliveGood.length) {
      return {
        canStart: false,
        canEnd: true,
        reason: '狼人数量大于等于好人数量',
      };
    }

    const aliveGodsCount = alivePlayers.filter(p =>
      ['seer', 'witch', 'hunter', 'guard', 'idiot'].includes(p.role || '')
    ).length;
    if (aliveGodsCount === 0 && aliveWolves.length > 0) {
      return {
        canStart: false,
        canEnd: true,
        reason: '所有神职已被淘汰',
      };
    }

    return {
      canStart: false,
      canEnd: false,
      reason: '游戏进行中',
    };
  }

  getWinningTeam(winner: 'good' | 'wolf'): 'good' | 'wolf' {
    return winner;
  }

  getLosingTeam(winner: 'good' | 'wolf'): 'good' | 'wolf' {
    return winner === 'good' ? 'wolf' : 'good';
  }

  getPlayerContribution(player: Player, state: GameState): {
    kills: number;
    saves: number;
    votes: number;
    correctVotes: number;
  } {
    const nightActions = state.nightActions;
    const votes = state.votes.filter(v => v.voterId === player.id);

    const kills = nightActions.filter(na => 
      na.actorId === player.id && na.type === 'wolf_kill'
    ).length;

    const saves = nightActions.filter(na => 
      na.actorId === player.id && na.type === 'witch_save'
    ).length;

    const playerVotes = votes.length;
    const correctVotes = votes.filter(v => {
      const target = state.players.find(p => p.id === v.targetId);
      return target?.role === 'werewolf';
    }).length;

    return {
      kills,
      saves,
      votes: playerVotes,
      correctVotes,
    };
  }

  getMVP(state: GameState): Player | null {
    const alivePlayers = state.players.filter(p => p.isAlive && !p.isSpectator);
    
    if (state.winner === 'good') {
      const goodPlayers = alivePlayers.filter(p => 
        p.role === 'villager' || 
        ['seer', 'witch', 'hunter', 'guard', 'idiot'].includes(p.role || '')
      );

      let bestPlayer: Player | null = null;
      let bestScore = -1;

      goodPlayers.forEach(player => {
        const contribution = this.getPlayerContribution(player, state);
        const score = contribution.correctVotes * 2 + contribution.saves * 3 - contribution.kills * 1;
        
        if (score > bestScore) {
          bestScore = score;
          bestPlayer = player;
        }
      });

      return bestPlayer;
    }

    if (state.winner === 'wolf') {
      const wolfPlayers = alivePlayers.filter(p => p.role === 'werewolf');
      
      let bestPlayer: Player | null = null;
      let bestScore = -1;

      wolfPlayers.forEach(player => {
        const contribution = this.getPlayerContribution(player, state);
        const score = contribution.kills * 2 + contribution.votes * 1;
        
        if (score > bestScore) {
          bestScore = score;
          bestPlayer = player;
        }
      });

      return bestPlayer;
    }

    return null;
  }

  getGameSummary(state: GameState): string {
    const result = this.checkWinCondition(state);
    
    if (!result.winner) {
      return '游戏进行中...';
    }

    const winnerText = result.winner === 'good' ? '好人阵营' : '狼人阵营';
    const statistics = result.statistics;

    return `
游戏结束！
${result.reason}

游戏统计：
- 总回合数：${statistics.totalRounds}
- 总投票数：${statistics.totalVotes}
- 总死亡数：${statistics.totalDeaths}
- 狼人击杀：${statistics.wolfKills}
- 女巫救人：${statistics.witchSaves}
- 女巫毒杀：${statistics.witchPoisons}
- 守卫守护：${statistics.guardProtects}
- 预言家查验：${statistics.seerChecks}

获胜方：${winnerText}
    `.trim();
  }
}
