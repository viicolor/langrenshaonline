import { supabase } from '@/lib/supabase';
import { BoardWithAdmin, CardWithAdmin, SkillWithAdmin, GlobalConfigWithAdmin, ProcessWithAdmin } from './admin';
import type { RoleToCampMap } from './WinConditionChecker';
import type { SkillEffectParams } from './NightActionResolver';

export interface GameConfig {
  board?: BoardWithAdmin;
  cards: CardWithAdmin[];
  skills: SkillWithAdmin[];
  globalConfigs: GlobalConfigWithAdmin[];
  processes: ProcessWithAdmin[];
}

export const gameConfigService = {
  async getGameConfig(boardId?: string): Promise<GameConfig> {
    try {
      const [cardsData, skillsData, configsData, processesData] = await Promise.all([
        supabase.from('cards').select('*').eq('is_delete', 0),
        supabase.from('skills').select('*').eq('is_delete', 0),
        supabase.from('global_configs').select('*').eq('is_delete', 0),
        supabase.from('processes').select('*').eq('is_delete', 0),
      ]);

      const cards = (cardsData.data || []) as CardWithAdmin[];
      const skills = (skillsData.data || []) as SkillWithAdmin[];
      const globalConfigs = (configsData.data || []) as GlobalConfigWithAdmin[];
      const processes = (processesData.data || []) as ProcessWithAdmin[];

      let board: BoardWithAdmin | undefined;
      if (boardId) {
        const { data: boardData } = await supabase
          .from('boards')
          .select('*')
          .eq('id', boardId)
          .single();
        
        if (boardData) {
          board = boardData as BoardWithAdmin;
        }
      }

      return {
        board,
        cards,
        skills,
        globalConfigs,
        processes,
      };
    } catch (error) {
      console.error('[gameConfigService] Get game config error:', error);
      return {
        cards: [],
        skills: [],
        globalConfigs: [],
        processes: [],
      };
    }
  },

  /** 板子角色统一结构，供发身份使用。优先 board_roles（含 card_id），否则从 boards.character_config.roles 解析。 */
  async getBoardRoles(boardId: string): Promise<{ card_id: string; count: number }[]> {
    try {
      const { data: rolesData } = await supabase
        .from('board_roles')
        .select('*')
        .eq('board_id', boardId);

      const rows = rolesData || [];
      const hasCardId = rows.length > 0 && 'card_id' in rows[0] && (rows[0] as { card_id?: unknown }).card_id != null;
      if (hasCardId) {
        return rows.map((r: { card_id: string; count?: number }) => ({
          card_id: String(r.card_id),
          count: r.count ?? 1,
        }));
      }
      if (rows.length > 0 && 'role_type' in rows[0]) {
        return rows.map((r: { role_type: string; count?: number }) => ({
          card_id: String((r as { role_type?: string }).role_type),
          count: (r as { count?: number }).count ?? 1,
        }));
      }

      const { data: board } = await supabase
        .from('boards')
        .select('character_config')
        .eq('id', boardId)
        .single();

      const cfg = board?.character_config as {
        roles?: Array<{ card_id?: string | number; role?: string; count?: number }>;
      } | null;
      const roles = cfg?.roles;
      if (Array.isArray(roles) && roles.length > 0) {
        return roles.map(r => ({
          card_id: String(r.card_id ?? r.role ?? ''),
          count: r.count ?? 1,
        }));
      }

      return [];
    } catch (error) {
      console.error('[gameConfigService] Get board roles error:', error);
      return [];
    }
  },

  getCardById(cardId: string): CardWithAdmin | null {
    const cards = this.getGameConfig().then(config => config.cards);
    return cards.then(cards => cards.find(c => c.id === cardId) || null);
  },

  getSkillById(skillId: string): SkillWithAdmin | null {
    const skills = this.getGameConfig().then(config => config.skills);
    return skills.then(skills => skills.find(s => s.id === skillId) || null);
  },

  getGlobalConfigByCode(configCode: string): GlobalConfigWithAdmin | null {
    const configs = this.getGameConfig().then(config => config.globalConfigs);
    return configs.then(configs => configs.find(c => c.config_code === configCode) || null);
  },

  getProcessByCode(processCode: string): ProcessWithAdmin | null {
    const processes = this.getGameConfig().then(config => config.processes);
    return processes.then(processes => processes.find(p => p.process_code === processCode) || null);
  },

  /** 流程阶段配置：从 processes 表 phase_config 解析，供阶段顺序与时长使用 */
  async getPhaseConfig(processCode: string = 'standard_flow'): Promise<{ phases: { name: string; duration: number; next_phase: string }[] } | null> {
    const config = await this.getGameConfig();
    const process = config.processes.find(p => p.process_code === processCode);
    if (!process?.phase_config) return null;
    const cfg = process.phase_config as { phases?: { name?: string; duration?: number; next_phase?: string }[] };
    const phases = cfg?.phases;
    if (!Array.isArray(phases) || phases.length === 0) return null;
    return {
      phases: phases.map(p => ({
        name: p.name ?? '',
        duration: typeof p.duration === 'number' ? p.duration : 0,
        next_phase: p.next_phase ?? '',
      })),
    };
  },

  /** 从流程配置中取某阶段的时长（秒），无配置时返回默认值 */
  async getPhaseDuration(processCode: string, phaseName: string, defaultSeconds: number = 120): Promise<number> {
    const config = await this.getPhaseConfig(processCode);
    if (!config?.phases?.length) return defaultSeconds;
    const phase = config.phases.find(p => p.name === phaseName);
    return phase?.duration ?? defaultSeconds;
  },

  /** 夜晚子阶段配置（v1.1 顺序：守卫→狼人→预言家→女巫→猎人），仅返回本板子存在的角色对应步骤 */
  async getNightSteps(processCode: string = 'standard_flow', boardId?: string): Promise<{ step_index: number; step_name: string; skill_codes: string[]; duration: number }[]> {
    const config = await this.getGameConfig(boardId);
    const process = config.processes.find(p => p.process_code === processCode);
    const cfg = process?.phase_config as { night_steps?: { step_name?: string; skill_codes?: string[]; duration?: number }[] } | null;
    const rawSteps = cfg?.night_steps;
    const defaultSteps: { step_name: string; skill_codes: string[]; duration: number }[] = [
      { step_name: '守卫', skill_codes: ['guard_protect'], duration: 20 },
      { step_name: '狼人', skill_codes: ['werewolf_kill'], duration: 30 },
      { step_name: '预言家', skill_codes: ['seer_check'], duration: 15 },
      { step_name: '女巫', skill_codes: ['witch_save', 'witch_poison'], duration: 25 },
      { step_name: '猎人', skill_codes: ['hunter_shoot'], duration: 10 },
    ];
    const steps = Array.isArray(rawSteps) && rawSteps.length > 0
      ? rawSteps.map((s, i) => ({
          step_index: i,
          step_name: (s.step_name ?? `步骤${i + 1}`) as string,
          skill_codes: Array.isArray(s.skill_codes) ? s.skill_codes : [],
          duration: typeof s.duration === 'number' ? s.duration : 20,
        }))
      : defaultSteps.map((s, i) => ({ step_index: i, ...s }));

    if (!boardId) return steps;

    const boardRoles = await this.getBoardRoles(boardId);
    const cardIds = new Set(boardRoles.map(r => String(r.card_id)));
    const roleToSkillCodes: Record<string, string | string[]> = {
      guard: 'guard_protect',
      werewolf: 'werewolf_kill',
      seer: 'seer_check',
      witch: ['witch_save', 'witch_poison'],
      hunter: 'hunter_shoot',
    };
    const boardSkillCodes = new Set<string>();
    for (const card of config.cards) {
      if (!cardIds.has(String(card.id)) && !cardIds.has(card.role_type ?? '')) continue;
      const codes = roleToSkillCodes[card.role_type ?? ''];
      if (Array.isArray(codes)) codes.forEach((c) => boardSkillCodes.add(c));
      else if (typeof codes === 'string') boardSkillCodes.add(codes);
      if (card.skill_id) {
        const skill = config.skills.find((s) => s.id === card.skill_id);
        if (skill) boardSkillCodes.add(skill.skill_code);
      }
    }

    return steps.filter(s => s.skill_codes.some(code => boardSkillCodes.has(code)));
  },

  /** 从流程配置中取某阶段的下一个阶段名，无配置时返回内置顺序 */
  async getNextPhase(processCode: string, phaseName: string): Promise<string> {
    const builtinHunter: Record<string, string> = { hunter_shot: 'night' };
    if (builtinHunter[phaseName]) return builtinHunter[phaseName];
    const config = await this.getPhaseConfig(processCode);
    if (!config?.phases?.length) {
      const builtin: Record<string, string> = { night: 'day', day: 'voting', voting: 'night' };
      return builtin[phaseName] ?? phaseName;
    }
    const phase = config.phases.find(p => p.name === phaseName);
    return phase?.next_phase ?? (phaseName === 'night' ? 'day' : phaseName === 'day' ? 'voting' : 'night');
  },

  /** 从技能列表构建 actionType -> effect_params（含 can_target_self、can_target_dead 等），供 NightActionResolver.validateNightAction 使用 */
  buildSkillParamsByType(skills: { skill_code: string; effect_params?: Record<string, unknown> | null }[]): Record<string, SkillEffectParams> {
    const actionTypeByCode: Record<string, string> = {
      werewolf_kill: 'wolf_kill',
      wolf_kill: 'wolf_kill',
      seer_check: 'seer_check',
      witch_save: 'witch_save',
      witch_poison: 'witch_poison',
      guard_protect: 'guard_protect',
    };
    const out: Record<string, SkillEffectParams> = {};
    for (const s of skills) {
      if (!s.effect_params || typeof s.effect_params !== 'object') continue;
      const actionType = actionTypeByCode[s.skill_code] ?? s.skill_code;
      const params = s.effect_params as Record<string, unknown>;
      const can_target_self = params.can_target_self as boolean | undefined;
      const can_target_dead = params.can_target_dead as boolean | undefined;
      out[actionType] = { ...params, can_target_self, can_target_dead };
    }
    return out;
  },

  /** 从卡牌列表构建 role_type -> camp，供 WinConditionChecker 使用 */
  buildRoleToCampMap(cards: { role_type: string; camp?: string | null }[]): RoleToCampMap {
    const map: RoleToCampMap = {};
    for (const c of cards) {
      if (c.role_type && (c.camp === 'werewolf' || c.camp === 'good' || c.camp === 'neutral')) {
        map[c.role_type] = c.camp;
      }
    }
    return map;
  },
};
