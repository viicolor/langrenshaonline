import { GameState, Player, NightAction, NightResult, DeathCause, RoleType } from '@/types/gameState';
import { RuleEngine } from './RuleEngine';

/** 来自 skills.effect_params 的校验参数，用于按配置放宽/收紧目标规则 */
export type SkillEffectParams = {
  can_target_self?: boolean;
  can_target_dead?: boolean;
  [key: string]: unknown;
};

export class NightActionResolver {
  private ruleEngine: RuleEngine;

  constructor() {
    this.ruleEngine = new RuleEngine();
  }

  async resolveNightPhase(state: GameState): Promise<NightResult> {
    const result: NightResult = {
      deaths: [],
      savedPlayers: [],
      blockedKills: [],
    };

    const alivePlayers = state.players.filter(p => p.isAlive && !p.isSpectator);
    const nightActions = state.nightActions;

    const wolfKill = nightActions.find(a => a.type === 'wolf_kill');
    const guardAction = nightActions.find(a => a.type === 'guard_protect');
    const witchSave = nightActions.find(a => a.type === 'witch_save');
    const witchPoison = nightActions.find(a => a.type === 'witch_poison');

    if (wolfKill) {
      const killResult = this.resolveWolfKill(wolfKill, guardAction, witchSave, alivePlayers);
      result.deaths.push(...killResult.deaths);
      result.savedPlayers.push(...killResult.saved);
      result.blockedKills.push(...killResult.blocked);
    }

    // 奶穿：守卫守护与女巫解药作用于同一玩家时，该玩家视为死亡（v1.1 规则）
    const guardTarget = guardAction?.targetId;
    const witchSaveTarget = witchSave?.targetId;
    if (guardTarget && witchSaveTarget && guardTarget === witchSaveTarget) {
      const p = state.players.find(x => x.id === guardTarget);
      if (p && p.isAlive && !result.deaths.some(d => d.playerId === guardTarget)) {
        result.deaths.push({ playerId: guardTarget, playerName: p.name, cause: 'none' });
      }
    }

    if (witchPoison) {
      const poisonResult = this.resolveWitchPoison(witchPoison, alivePlayers);
      if (poisonResult.death) {
        result.deaths.push(poisonResult.death);
      }
    }

    return result;
  }

  private resolveWolfKill(
    wolfKill: NightAction,
    guardAction: NightAction | undefined,
    witchSave: NightAction | undefined,
    players: Player[]
  ): { deaths: Array<{ playerId: string; playerName: string; cause: DeathCause }>; saved: string[]; blocked: Array<{ playerId: string; playerName: string }> } {
    const targetId = wolfKill.targetId;
    const targetPlayer = players.find(p => p.id === targetId);

    if (!targetPlayer) {
      return { deaths: [], saved: [], blocked: [] };
    }

    const targetRole = targetPlayer.role;

    if (targetRole === 'werewolf') {
      return { deaths: [], saved: [], blocked: [] };
    }

    // 奶穿：守卫+女巫同目标由 resolveNightPhase 统一加死亡，此处不记狼刀死亡
    if (guardAction?.targetId === targetId && witchSave?.targetId === targetId) {
      return { deaths: [], saved: [], blocked: [] };
    }

    if (guardAction?.targetId === targetId && witchSave?.targetId !== targetId) {
      return {
        deaths: [],
        saved: [targetId],
        blocked: [{ playerId: targetId, playerName: targetPlayer.name }],
      };
    }

    if (witchSave?.targetId === targetId && guardAction?.targetId !== targetId) {
      return {
        deaths: [],
        saved: [targetId],
        blocked: [],
      };
    }

    return {
      deaths: [{ playerId: targetId, playerName: targetPlayer.name, cause: 'wolf_kill' }],
      saved: [],
      blocked: [],
    };
  }

  private resolveWitchPoison(
    witchPoison: NightAction,
    players: Player[]
  ): { death: { playerId: string; playerName: string; cause: DeathCause } | null } {
    const targetId = witchPoison.targetId;
    const targetPlayer = players.find(p => p.id === targetId);

    if (!targetPlayer) {
      return { death: null };
    }

    const targetRole = targetPlayer.role;

    if (targetRole === 'werewolf') {
      return { death: null };
    }

    if (!targetPlayer.isAlive) {
      return { death: null };
    }

    return {
      death: { playerId: targetId, playerName: targetPlayer.name, cause: 'poison' },
    };
  }

  /**
   * 校验夜晚行动。可选传入 skillParamsByType（来自 skills 表 effect_params），按配置校验 can_target_self、can_target_dead 等。
   * skillParamsByType 的 key 为技能类型，如 'wolf_kill'、'guard_protect'、'witch_save'；value 为 effect_params 中对应技能的参数。
   */
  validateNightAction(
    action: NightAction,
    state: GameState,
    skillParamsByType?: Record<string, SkillEffectParams>
  ): { valid: boolean; reason: string } {
    const actor = state.players.find(p => p.id === action.actorId);

    if (!actor) {
      return { valid: false, reason: '行动者不存在' };
    }

    if (!actor.isAlive) {
      return { valid: false, reason: '行动者已死亡' };
    }

    if (actor.isSpectator) {
      return { valid: false, reason: '观战者不能执行操作' };
    }

    const target = action.targetId ? state.players.find(p => p.id === action.targetId) : null;
    const params = skillParamsByType?.[action.type];

    switch (action.type) {
      case 'wolf_kill': {
        if (actor.role !== 'werewolf') {
          return { valid: false, reason: '只有狼人可以袭击' };
        }
        if (target?.role === 'werewolf') {
          return { valid: false, reason: '不能袭击队友' };
        }
        const canTargetDead = params?.can_target_dead === true;
        if (target && !target.isAlive && !canTargetDead) {
          return { valid: false, reason: '目标已死亡' };
        }
        break;
      }

      case 'seer_check': {
        if (actor.role !== 'seer') {
          return { valid: false, reason: '只有预言家可以查验' };
        }
        if (!target) {
          return { valid: false, reason: '必须选择查验目标' };
        }
        const canTargetDead = params?.can_target_dead === true;
        if (!target.isAlive && !canTargetDead) {
          return { valid: false, reason: '目标已死亡' };
        }
        if (target.isSpectator) {
          return { valid: false, reason: '不能查验观战者' };
        }
        break;
      }

      case 'witch_save':
      case 'witch_poison': {
        if (actor.role !== 'witch') {
          return { valid: false, reason: '只有女巫可以使用药水' };
        }
        if (!target) {
          return { valid: false, reason: '必须选择目标' };
        }
        const canTargetDead = params?.can_target_dead === true;
        if (!target.isAlive && !canTargetDead) {
          return { valid: false, reason: '目标已死亡' };
        }
        if (target.isSpectator) {
          return { valid: false, reason: '不能对观战者使用' };
        }
        break;
      }

      case 'guard_protect': {
        if (actor.role !== 'guard') {
          return { valid: false, reason: '只有守卫可以守护' };
        }
        if (!target) {
          return { valid: false, reason: '必须选择守护目标' };
        }
        if (!target.isAlive) {
          return { valid: false, reason: '目标已死亡' };
        }
        const canTargetSelf = params?.can_target_self === true;
        if (target.id === actor.id && !canTargetSelf) {
          return { valid: false, reason: '不能守护自己' };
        }
        if (target.isSpectator) {
          return { valid: false, reason: '不能守护观战者' };
        }
        break;
      }
    }

    return { valid: true, reason: '操作有效' };
  }

  getRequiredNightActions(players: Player[]): Map<RoleType, string[]> {
    const requiredActions = new Map<RoleType, string[]>();

    const alivePlayers = players.filter(p => p.isAlive && !p.isSpectator);
    const wolves = alivePlayers.filter(p => p.role === 'werewolf');
    const seer = alivePlayers.find(p => p.role === 'seer');
    const witch = alivePlayers.find(p => p.role === 'witch');
    const guard = alivePlayers.find(p => p.role === 'guard');

    if (wolves.length > 0) {
      requiredActions.set('werewolf', ['wolf_kill']);
    }

    if (seer) {
      requiredActions.set('seer', ['seer_check']);
    }

    if (witch) {
      requiredActions.set('witch', ['witch_save', 'witch_poison']);
    }

    if (guard) {
      requiredActions.set('guard', ['guard_protect']);
    }

    return requiredActions;
  }

  checkAllRequiredActionsCompleted(nightActions: NightAction[], players: Player[]): boolean {
    const requiredActions = this.getRequiredNightActions(players);
    
    for (const [role, actions] of requiredActions.entries()) {
      const actor = players.find(p => p.role === role);
      if (actor && actor.isAlive && !actor.isSpectator) {
        const hasCompletedAction = actions.some(actionType =>
          nightActions.some(na => na.actorId === actor.id && na.type === actionType)
        );
        if (!hasCompletedAction) {
          return false;
        }
      }
    }

    return true;
  }

  getNightActionDescription(action: NightAction, players: Player[]): string {
    const actor = players.find(p => p.id === action.actorId);
    const target = action.targetId ? players.find(p => p.id === action.targetId) : null;

    switch (action.type) {
      case 'wolf_kill':
        return `${actor?.name} 袭击了 ${target?.name}`;
      case 'seer_check':
        return `${actor?.name} 查验了 ${target?.name}`;
      case 'witch_save':
        return `${actor?.name} 使用解药救了 ${target?.name}`;
      case 'witch_poison':
        return `${actor?.name} 使用毒药毒了 ${target?.name}`;
      case 'guard_protect':
        return `${actor?.name} 守护了 ${target?.name}`;
      default:
        return '未知行动';
    }
  }
}
