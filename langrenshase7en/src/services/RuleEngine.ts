import { GameState, GamePhase, Player, NightAction, Vote, VoteResult, NightResult, DeathCause, RoleType } from '@/types/gameState';

/** 可选：从流程配置注入阶段时长（秒），未设置时使用内置默认值 */
export type PhaseDurationGetter = (phase: GamePhase) => number;

export class RuleEngine {
  private phaseDurationGetter: PhaseDurationGetter | null = null;

  /** 设置阶段时长提供者（如从 gameConfig.getPhaseConfig 解析），未设置时 getPhaseDuration 使用内置默认值 */
  setPhaseDurationGetter(getter: PhaseDurationGetter | null): void {
    this.phaseDurationGetter = getter;
  }

  resolveNightActions(actions: NightAction[], players: Player[]): NightResult {
    const result: NightResult = {
      deaths: [],
      savedPlayers: [],
      blockedKills: [],
    };

    const wolfKill = actions.find(a => a.type === 'wolf_kill');
    const guardAction = actions.find(a => a.type === 'guard_protect');
    const witchSave = actions.find(a => a.type === 'witch_save');
    const witchPoison = actions.find(a => a.type === 'witch_poison');

    if (!wolfKill) {
      return result;
    }

    const targetId = wolfKill.targetId;
    const targetPlayer = players.find(p => p.id === targetId);

    if (!targetPlayer) {
      return result;
    }

    if (guardAction?.targetId === targetId) {
      result.blockedKills.push({
        playerId: targetId,
        playerName: targetPlayer.name,
      });
      result.savedPlayers.push(targetId);
      return result;
    }

    if (witchSave?.targetId === targetId) {
      result.savedPlayers.push(targetId);
      return result;
    }

    result.deaths.push({
      playerId: targetId,
      playerName: targetPlayer.name,
      cause: 'wolf_kill',
    });

    if (witchPoison?.targetId) {
      const poisonTarget = players.find(p => p.id === witchPoison.targetId);
      if (poisonTarget && poisonTarget.id !== targetId) {
        result.deaths.push({
          playerId: witchPoison.targetId,
          playerName: poisonTarget.name,
          cause: 'poison',
        });
      }
    }

    return result;
  }

  resolveVotes(votes: Vote[], players: Player[]): VoteResult {
    const voteCounts: Record<string, number> = {};
    const targetVotes: Record<string, string[]> = {};

    votes.forEach(vote => {
      voteCounts[vote.targetName] = (voteCounts[vote.targetName] || 0) + 1;
      
      if (!targetVotes[vote.targetName]) {
        targetVotes[vote.targetName] = [];
      }
      targetVotes[vote.targetName].push(vote.voterId);
    });

    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    const leaders = Object.entries(voteCounts)
      .filter(([_, count]) => count === maxVotes)
      .map(([name]) => name);

    if (leaders.length === 0) {
      return {
        type: 'skip',
        votes: voteCounts,
      };
    }

    if (leaders.length > 1) {
      return {
        type: 'tie',
        votes: voteCounts,
      };
    }

    const eliminatedPlayerName = leaders[0];
    const eliminatedPlayer = players.find(p => p.name === eliminatedPlayerName);

    return {
      type: 'eliminated',
      eliminatedPlayer: eliminatedPlayer?.id,
      votes: voteCounts,
    };
  }

  checkWinCondition(players: Player[]): { winner: 'good' | 'wolf' | null; reason: string } {
    const alivePlayers = players.filter(p => p.isAlive && !p.isSpectator);
    const aliveWolves = alivePlayers.filter(p => p.role === 'werewolf');
    const aliveVillagers = alivePlayers.filter(p => p.role === 'villager');
    const aliveGods = alivePlayers.filter(p => 
      ['seer', 'witch', 'hunter', 'guard', 'idiot'].includes(p.role || '')
    );

    if (aliveWolves.length === 0) {
      return { winner: 'good', reason: '所有狼人已被淘汰' };
    }

    if (aliveWolves.length >= aliveVillagers.length + aliveGods.length) {
      return { winner: 'wolf', reason: '狼人数量大于等于好人数量' };
    }

    if (aliveGods.length === 0 && aliveWolves.length > 0) {
      return { winner: 'wolf', reason: '所有神职已被淘汰' };
    }

    return { winner: null, reason: '游戏继续' };
  }

  canPlayerUseSkill(player: Player, phase: GamePhase, round: number, usedSkills: Set<string>): boolean {
    if (!player.isAlive || player.isSpectator) {
      return false;
    }

    if (usedSkills.has(`${player.id}-${round}`)) {
      return false;
    }

    switch (player.role) {
      case 'seer':
        return phase === 'night';
      case 'witch':
        return phase === 'night';
      case 'hunter':
        return phase === 'day' || phase === 'voting';
      case 'guard':
        return phase === 'night';
      case 'idiot':
        return phase === 'voting';
      default:
        return false;
    }
  }

  canPlayerVote(player: Player, phase: GamePhase): boolean {
    if (!player.isAlive || player.isSpectator) {
      return false;
    }

    if (player.role === 'idiot' && !player.isAlive) {
      return false;
    }

    return phase === 'voting';
  }

  canPlayerSpeak(player: Player, phase: GamePhase): boolean {
    if (!player.isAlive || player.isSpectator) {
      return false;
    }

    return phase === 'day';
  }

  getAvailableTargets(player: Player, players: Player[], phase: GamePhase): Player[] {
    if (!player.isAlive || player.isSpectator) {
      return [];
    }

    const alivePlayers = players.filter(p => p.isAlive && !p.isSpectator && p.id !== player.id);

    switch (player.role) {
      case 'seer':
        return phase === 'night' ? alivePlayers : [];
      case 'witch':
        return phase === 'night' ? alivePlayers : [];
      case 'guard':
        return phase === 'night' ? alivePlayers.filter(p => p.id !== player.id) : [];
      case 'hunter':
        return phase === 'day' || phase === 'voting' ? alivePlayers : [];
      default:
        return [];
    }
  }

  validateNightAction(action: NightAction, players: Player[]): { valid: boolean; reason: string } {
    const actor = players.find(p => p.id === action.actorId);
    
    if (!actor) {
      return { valid: false, reason: '行动者不存在' };
    }

    if (!actor.isAlive) {
      return { valid: false, reason: '行动者已死亡' };
    }

    if (actor.isSpectator) {
      return { valid: false, reason: '观战者不能执行操作' };
    }

    switch (action.type) {
      case 'wolf_kill':
        if (action.targetId) {
          const target = players.find(p => p.id === action.targetId);
          if (!target) {
            return { valid: false, reason: '目标不存在' };
          }
          if (target.role === 'werewolf') {
            return { valid: false, reason: '不能袭击队友' };
          }
        }
        break;

      case 'seer_check':
        if (!action.targetId) {
          return { valid: false, reason: '必须选择查验目标' };
        }
        break;

      case 'witch_save':
      case 'witch_poison':
        if (!action.targetId) {
          return { valid: false, reason: '必须选择目标' };
        }
        break;

      case 'guard_protect': {
        if (!action.targetId) {
          return { valid: false, reason: '必须选择守护目标' };
        }
        const target = players.find(p => p.id === action.targetId);
        if (target?.id === action.actorId) {
          return { valid: false, reason: '不能守护自己' };
        }
        break;
      }
    }

    return { valid: true, reason: '操作有效' };
  }

  validateVote(vote: Vote, players: Player[]): { valid: boolean; reason: string } {
    const voter = players.find(p => p.id === vote.voterId);
    
    if (!voter) {
      return { valid: false, reason: '投票者不存在' };
    }

    if (!voter.isAlive) {
      return { valid: false, reason: '投票者已死亡' };
    }

    if (voter.isSpectator) {
      return { valid: false, reason: '观战者不能投票' };
    }

    const target = players.find(p => p.id === vote.targetId);
    
    if (!target) {
      return { valid: false, reason: '目标不存在' };
    }

    if (!target.isAlive) {
      return { valid: false, reason: '目标已死亡' };
    }

    if (target.isSpectator) {
      return { valid: false, reason: '不能投票给观战者' };
    }

    if (voter.id === vote.targetId) {
      return { valid: false, reason: '不能投票给自己' };
    }

    return { valid: true, reason: '投票有效' };
  }

  getPhaseDuration(phase: GamePhase): number {
    if (this.phaseDurationGetter) {
      const fromConfig = this.phaseDurationGetter(phase);
      if (typeof fromConfig === 'number' && fromConfig >= 0) return fromConfig;
    }
    const durations: Record<GamePhase, number> = {
      waiting: 0,
      night: 60,
      day: 120,
      voting: 30,
      finished: 0,
    };
    return durations[phase] || 0;
  }

  getRoleDescription(role: RoleType): string {
    const descriptions: Record<RoleType, string> = {
      werewolf: '狼人：每晚可以袭击一名玩家',
      villager: '村民：没有特殊技能，通过投票淘汰狼人',
      seer: '预言家：每晚可以查验一名玩家的身份',
      witch: '女巫：拥有一瓶解药和一瓶毒药',
      hunter: '猎人：死亡时可以开枪带走一名玩家',
      guard: '守卫：每晚可以守护一名玩家免受狼人袭击',
      idiot: '白痴：被投票出局时可以翻牌免死',
    };

    return descriptions[role] || '未知角色';
  }
}
