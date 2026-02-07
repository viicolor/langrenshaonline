import { supabase } from '@/integrations/supabase/client';

export interface BoardWithAdmin {
  id: number;
  board_name: string;
  board_alias?: string;
  player_num: number;
  character_config?: any;
  global_config_ids?: string;
  process_ids?: string;
  difficulty: number;
  status: number;
  recommend: number;
  desc?: string;
  create_time: string;
  update_time: string;
  create_by: string;
  update_by?: string;
  is_delete: number;
}

export interface CardWithAdmin {
  id: number;
  card_name: string;
  card_alias?: string;
  card_type: string;
  camp?: string;
  role_type: string;
  skill_id?: number;
  skill_icon?: string;
  difficult: number;
  recommend: number;
  desc?: string;
  character_config?: any;
  create_time: string;
  update_time: string;
  create_by: string;
  update_by?: string;
  is_delete: number;
}

export interface SkillWithAdmin {
  id: number;
  skill_name: string;
  skill_code: string;
  skill_type: string;
  trigger_phase?: string;
  trigger_conditions?: any;
  effect_params?: any;
  effect_description?: string;
  cooldown: number;
  usage_limit: number;
  create_time: string;
  update_time: string;
  create_by: string;
  update_by?: string;
  is_delete: number;
}

export interface GlobalConfigWithAdmin {
  id: number;
  config_name: string;
  config_code: string;
  config_type: string;
  config_value: any;
  description?: string;
  is_default: number;
  env_type?: number;
  create_time: string;
  update_time: string;
  create_by: string;
  update_by?: string;
  is_delete: number;
}

export interface ProcessWithAdmin {
  id: number;
  process_name: string;
  process_code: string;
  process_type: string;
  phase_config: any;
  description?: string;
  is_default: number;
  create_time: string;
  update_time: string;
  create_by: string;
  update_by?: string;
  is_delete: number;
}

export interface CreateSkillParams {
  skill_name: string;
  skill_code: string;
  skill_type: string;
  trigger_phase?: string;
  trigger_conditions?: any;
  effect_params?: any;
  effect_description?: string;
  cooldown?: number;
  usage_limit?: number;
}

export interface CreateCardParams {
  card_name: string;
  card_alias?: string;
  card_type: string;
  camp?: string;
  role_type: string;
  skill_id?: number;
  skill_icon?: string;
  difficult?: number;
  recommend?: number;
  desc?: string;
  character_config?: any;
}

export interface CreateBoardParams {
  board_name: string;
  board_alias?: string;
  player_num: number;
  character_config?: any;
  global_config_ids?: string;
  process_ids?: string;
  difficulty?: number;
  status?: number;
  recommend?: number;
  desc?: string;
}

export interface CreateGlobalConfigParams {
  config_name: string;
  config_code: string;
  config_type: string;
  config_value: any;
  description?: string;
  is_default?: number;
  env_type?: number;
}

export interface CreateProcessParams {
  process_name: string;
  process_code: string;
  process_type: string;
  phase_config: any;
  description?: string;
  is_default?: number;
}

export interface AIConfigWithAdmin {
  id: string;
  name: string;
  provider: string;
  api_key?: string | null;
  model?: string | null;
  endpoint?: string | null;
  config?: any;
  is_active?: boolean;
  created_at?: string;
}

export interface CreateAIConfigParams {
  name: string;
  provider: string;
  api_key?: string | null;
  model?: string | null;
  endpoint?: string | null;
  config?: any;
  is_active?: boolean;
}

/** 配置日志操作类型（符合 adminconfig.pdf 3.5 节） */
export type ConfigLogOperateType = 1 | 2 | 3 | 4 | 5 | 6;

export interface ConfigLogParams {
  operate_type: ConfigLogOperateType;
  operate_object: string;
  operate_object_id: string;
  old_config?: string | null;
  new_config: string;
  operate_result?: 0 | 1;
  operate_desc?: string | null;
  operate_by: string;
}

export interface ConfigLogWithAdmin {
  id: string;
  operate_type: number;
  operate_object: string;
  operate_object_id: string;
  old_config: string | null;
  new_config: string;
  operate_result: number;
  operate_desc: string | null;
  operate_by: string;
  operate_time: string;
  ip: string | null;
}

export const adminService = {
  /** 检查卡牌是否被板子使用（符合 adminconfig.pdf 4.2.3 删除逻辑：仅允许删除未被任何板子关联的角色） */
  async checkCardUsedByBoards(cardId: string | number): Promise<{ used: boolean; boardNames: string[] }> {
    const idStr = String(cardId);
    const boardNames: string[] = [];
    try {
      const { data: boards } = await supabase.from('boards').select('id, board_name, name, character_config').eq('is_delete', 0);
      if (boards) {
        for (const b of boards) {
          const cfg = b.character_config as { roles?: { card_id: string | number }[] } | null;
          if (cfg?.roles?.some((r: { card_id: string | number }) => String(r.card_id) === idStr)) {
            const name = (b as { board_name?: string }).board_name ?? (b as { name?: string }).name ?? String(b.id);
            boardNames.push(name);
          }
        }
      }
      return { used: boardNames.length > 0, boardNames };
    } catch {
      return { used: false, boardNames: [] };
    }
  },

  async writeConfigLog(params: ConfigLogParams): Promise<void> {
    try {
      await supabase.from('config_log').insert({
        operate_type: params.operate_type,
        operate_object: params.operate_object,
        operate_object_id: params.operate_object_id,
        old_config: params.old_config ?? null,
        new_config: params.new_config,
        operate_result: params.operate_result ?? 1,
        operate_desc: params.operate_desc ?? null,
        operate_by: params.operate_by,
      } as any);
    } catch (e) {
      console.error('Write config log error:', e);
    }
  },

  async getConfigLogs(options?: { limit?: number; operateType?: number }): Promise<ConfigLogWithAdmin[]> {
    try {
      let q = supabase
        .from('config_log')
        .select('*')
        .order('operate_time', { ascending: false });
      if (options?.operateType != null) {
        q = q.eq('operate_type', options.operateType);
      }
      if (options?.limit != null) {
        q = q.limit(options.limit);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ConfigLogWithAdmin[];
    } catch (e) {
      console.error('Get config logs error:', e);
      return [];
    }
  },

  async getBoardsWithAdmin(): Promise<BoardWithAdmin[]> {
    try {
      const { data: boards, error } = await supabase
        .from('boards')
        .select('*')
        .eq('is_delete', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (boards || []) as BoardWithAdmin[];
    } catch (error) {
      console.error('Get boards with admin error:', error);
      return [];
    }
  },

  async getCardsWithAdmin(): Promise<CardWithAdmin[]> {
    try {
      const { data: cards, error } = await supabase
        .from('cards')
        .select('*')
        .eq('is_delete', 0)
        .order('create_time', { ascending: false });

      if (error) throw error;
      return (cards || []) as CardWithAdmin[];
    } catch (error) {
      console.error('Get cards with admin error:', error);
      return [];
    }
  },

  async createBoardWithAdmin(params: CreateBoardParams, createBy: string): Promise<BoardWithAdmin | null> {
    try {
      const boardData = {
        board_name: params.board_name,
        board_alias: params.board_alias || null,
        player_num: params.player_num || 12,
        character_config: params.character_config || null,
        global_config_ids: params.global_config_ids || null,
        process_ids: params.process_ids || null,
        difficulty: params.difficulty || 1,
        status: params.status || 2,
        recommend: params.recommend || 0,
        desc: params.desc || null,
        create_by: createBy,
      };

      const { data: board, error } = await supabase
        .from('boards')
        .insert(boardData as any)
        .select()
        .single();

      if (error) {
        console.error('[adminService] Create board error:', error);
        throw error;
      }
      if (board) {
        const boardId = (board as { id: string | number }).id;
        await this.syncBoardRoles(boardId, params.character_config);
        await this.writeConfigLog({
          operate_type: 3,
          operate_object: '板子',
          operate_object_id: String(boardId),
          new_config: JSON.stringify(board),
          operate_result: 1,
          operate_desc: `板子新增：${params.board_name}`,
          operate_by: createBy,
        });
      }
      return board as BoardWithAdmin | null;
    } catch (error) {
      console.error('[adminService] Create board with admin error:', error);
      return null;
    }
  },

  /** 将 character_config.roles (card_id + count) 按 role_type 聚合后同步到 board_roles 表，便于查询与兼容旧逻辑 */
  async syncBoardRoles(
    boardId: string | number,
    characterConfig?: { roles?: { card_id: string | number; count?: number }[] } | null
  ): Promise<void> {
    try {
      const roles = characterConfig?.roles;
      if (!Array.isArray(roles) || roles.length === 0) {
        await supabase.from('board_roles').delete().eq('board_id', boardId);
        return;
      }
      const { data: cards } = await supabase.from('cards').select('id, role_type').eq('is_delete', 0);
      const cardMap = new Map<string, string>();
      (cards || []).forEach((c: { id: string | number; role_type: string }) => {
        cardMap.set(String(c.id), c.role_type);
      });
      const roleCounts: Record<string, number> = {};
      for (const r of roles) {
        const roleType = cardMap.get(String(r.card_id));
        if (roleType) {
          roleCounts[roleType] = (roleCounts[roleType] || 0) + (r.count ?? 1);
        }
      }
      await supabase.from('board_roles').delete().eq('board_id', boardId);
      for (const [roleType, count] of Object.entries(roleCounts)) {
        await supabase.from('board_roles').insert({
          board_id: boardId,
          role_type: roleType,
          count,
        } as any);
      }
    } catch (e) {
      console.error('[adminService] syncBoardRoles error:', e);
    }
  },

  async updateBoardWithAdmin(boardId: number, updates: Partial<BoardWithAdmin>, updateBy: string): Promise<BoardWithAdmin | null> {
    try {
      const updateData = {
        ...updates,
        update_by,
      };

      const { data: board, error } = await supabase
        .from('boards')
        .update(updateData as any)
        .eq('id', boardId)
        .select()
        .single();

      if (error) throw error;
      if (board) {
        const cfg = (updates.character_config ?? (board as BoardWithAdmin).character_config) as
          | { roles?: { card_id: string | number; count?: number }[] }
          | undefined
          | null;
        await this.syncBoardRoles(boardId, cfg);
        await this.writeConfigLog({
          operate_type: 4,
          operate_object: '板子',
          operate_object_id: String(boardId),
          new_config: JSON.stringify(board),
          operate_result: 1,
          operate_desc: `板子编辑：${(board as BoardWithAdmin).board_name}`,
          operate_by: updateBy,
        });
      }
      return board as BoardWithAdmin | null;
    } catch (error) {
      console.error('Update board with admin error:', error);
      return null;
    }
  },

  async deleteBoardWithAdmin(boardId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('boards')
        .update({ is_delete: 1, update_by: 'admin' })
        .eq('id', boardId);

      if (error) throw error;
      await this.writeConfigLog({
        operate_type: 4,
        operate_object: '板子',
        operate_object_id: String(boardId),
        new_config: JSON.stringify({ is_delete: 1 }),
        operate_result: 1,
        operate_desc: '板子删除/下线',
        operate_by: 'admin',
      });
      return true;
    } catch (error) {
      console.error('Delete board with admin error:', error);
      return false;
    }
  },

  async createCardWithAdmin(params: CreateCardParams, createBy: string): Promise<CardWithAdmin | null> {
    try {
      const cardData = {
        card_name: params.card_name,
        card_alias: params.card_alias || null,
        card_type: params.card_type,
        role_type: params.role_type,
        camp: params.camp || null,
        skill_id: params.skill_id || null,
        skill_icon: params.skill_icon || null,
        difficult: params.difficult || 1,
        recommend: params.recommend || 0,
        desc: params.desc || null,
        character_config: params.character_config || null,
        create_by: createBy,
      };

      const { data: card, error } = await supabase
        .from('cards')
        .insert(cardData as any)
        .select()
        .single();

      if (error) {
        console.error('[adminService] Create card error:', error);
        throw error;
      }
      return card as CardWithAdmin | null;
    } catch (error) {
      console.error('[adminService] Create card with admin error:', error);
      return null;
    }
  },

  async updateCardWithAdmin(cardId: number, updates: Partial<CardWithAdmin>, updateBy: string): Promise<CardWithAdmin | null> {
    try {
      const updateData = {
        ...updates,
        update_by,
      };

      const { data: card, error } = await supabase
        .from('cards')
        .update(updateData as any)
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;
      return card as CardWithAdmin | null;
    } catch (error) {
      console.error('Update card with admin error:', error);
      return null;
    }
  },

  async deleteCardWithAdmin(cardId: string | number): Promise<boolean> {
    try {
      const { used, boardNames } = await this.checkCardUsedByBoards(cardId);
      if (used) {
        throw new Error(
          boardNames.length > 0
            ? `该角色已被板子使用（${boardNames.join('、')}），请先从板子中移除后再删除。`
            : '该角色已被板子使用，请先从板子中移除后再删除。'
        );
      }
      const { error } = await supabase
        .from('cards')
        .update({ is_delete: 1, update_by: 'admin' })
        .eq('id', cardId);

      if (error) throw error;
      await this.writeConfigLog({
        operate_type: 2,
        operate_object: '角色',
        operate_object_id: String(cardId),
        new_config: JSON.stringify({ deleted: true }),
        operate_result: 1,
        operate_desc: '角色删除',
        operate_by: 'admin',
      });
      return true;
    } catch (error) {
      console.error('Delete card with admin error:', error);
      throw error;
    }
  },

  async getSkillsWithAdmin(): Promise<SkillWithAdmin[]> {
    try {
      const { data: skills, error } = await supabase
        .from('skills')
        .select('*')
        .eq('is_delete', 0)
        .order('create_time', { ascending: false });

      if (error) throw error;
      return (skills || []) as SkillWithAdmin[];
    } catch (error) {
      console.error('Get skills with admin error:', error);
      return [];
    }
  },

  async createSkillWithAdmin(params: CreateSkillParams, createBy: string): Promise<SkillWithAdmin | null> {
    try {
      const skillData = {
        skill_name: params.skill_name,
        skill_code: params.skill_code,
        skill_type: params.skill_type,
        trigger_phase: params.trigger_phase || null,
        trigger_conditions: params.trigger_conditions || null,
        effect_params: params.effect_params || null,
        effect_description: params.effect_description || null,
        cooldown: params.cooldown || 0,
        usage_limit: params.usage_limit || 0,
        create_by: createBy,
      };

      const { data: skill, error } = await supabase
        .from('skills')
        .insert(skillData as any)
        .select()
        .single();

      if (error) {
        console.error('[adminService] Create skill error:', error);
        throw error;
      }
      return skill as SkillWithAdmin | null;
    } catch (error) {
      console.error('[adminService] Create skill with admin error:', error);
      return null;
    }
  },

  async updateSkillWithAdmin(skillId: number, updates: Partial<SkillWithAdmin>, updateBy: string): Promise<SkillWithAdmin | null> {
    try {
      const updateData = {
        ...updates,
        update_by,
      };

      const { data: skill, error } = await supabase
        .from('skills')
        .update(updateData as any)
        .eq('id', skillId)
        .select()
        .single();

      if (error) throw error;
      return skill as SkillWithAdmin | null;
    } catch (error) {
      console.error('Update skill with admin error:', error);
      return null;
    }
  },

  async deleteSkillWithAdmin(skillId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('skills')
        .update({ is_delete: 1, update_by: 'admin' })
        .eq('id', skillId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete skill with admin error:', error);
      return false;
    }
  },

  async getGlobalConfigsWithAdmin(): Promise<GlobalConfigWithAdmin[]> {
    try {
      const { data: configs, error } = await supabase
        .from('global_configs')
        .select('*')
        .eq('is_delete', 0)
        .order('create_time', { ascending: false });

      if (error) throw error;
      return (configs || []) as GlobalConfigWithAdmin[];
    } catch (error) {
      console.error('Get global configs with admin error:', error);
      return [];
    }
  },

  async createGlobalConfigWithAdmin(params: CreateGlobalConfigParams, createBy: string): Promise<GlobalConfigWithAdmin | null> {
    try {
      const configData = {
        config_name: params.config_name,
        config_code: params.config_code,
        config_type: params.config_type,
        config_value: params.config_value,
        description: params.description || null,
        is_default: params.is_default || 0,
        env_type: params.env_type ?? 3,
        create_by: createBy,
      };

      const { data: config, error } = await supabase
        .from('global_configs')
        .insert(configData as any)
        .select()
        .single();

      if (error) {
        console.error('[adminService] Create global config error:', error);
        throw error;
      }
      return config as GlobalConfigWithAdmin | null;
    } catch (error) {
      console.error('[adminService] Create global config with admin error:', error);
      return null;
    }
  },

  async updateGlobalConfigWithAdmin(configId: number, updates: Partial<GlobalConfigWithAdmin>, updateBy: string): Promise<GlobalConfigWithAdmin | null> {
    try {
      const updateData = {
        ...updates,
        update_by,
      };

      const { data: config, error } = await supabase
        .from('global_configs')
        .update(updateData as any)
        .eq('id', configId)
        .select()
        .single();

      if (error) throw error;
      return config as GlobalConfigWithAdmin | null;
    } catch (error) {
      console.error('Update global config with admin error:', error);
      return null;
    }
  },

  async deleteGlobalConfigWithAdmin(configId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('global_configs')
        .update({ is_delete: 1, update_by: 'admin' })
        .eq('id', configId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete global config with admin error:', error);
      return false;
    }
  },

  async getProcessesWithAdmin(): Promise<ProcessWithAdmin[]> {
    try {
      const { data: processes, error } = await supabase
        .from('processes')
        .select('*')
        .eq('is_delete', 0)
        .order('create_time', { ascending: false });

      if (error) throw error;
      return (processes || []) as ProcessWithAdmin[];
    } catch (error) {
      console.error('Get processes with admin error:', error);
      return [];
    }
  },

  async createProcessWithAdmin(params: CreateProcessParams, createBy: string): Promise<ProcessWithAdmin | null> {
    try {
      const processData = {
        process_name: params.process_name,
        process_code: params.process_code,
        process_type: params.process_type,
        phase_config: params.phase_config,
        description: params.description || null,
        is_default: params.is_default || 0,
        create_by: createBy,
      };

      const { data: process, error } = await supabase
        .from('processes')
        .insert(processData as any)
        .select()
        .single();

      if (error) {
        console.error('[adminService] Create process error:', error);
        throw error;
      }
      return process as ProcessWithAdmin | null;
    } catch (error) {
      console.error('[adminService] Create process with admin error:', error);
      return null;
    }
  },

  async updateProcessWithAdmin(processId: number, updates: Partial<ProcessWithAdmin>, updateBy: string): Promise<ProcessWithAdmin | null> {
    try {
      const updateData = {
        ...updates,
        update_by,
      };

      const { data: process, error } = await supabase
        .from('processes')
        .update(updateData as any)
        .eq('id', processId)
        .select()
        .single();

      if (error) throw error;
      return process as ProcessWithAdmin | null;
    } catch (error) {
      console.error('Update process with admin error:', error);
      return null;
    }
  },

  async deleteProcessWithAdmin(processId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('processes')
        .update({ is_delete: 1, update_by: 'admin' })
        .eq('id', processId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete process with admin error:', error);
      return false;
    }
  },

  async getAIConfigsWithAdmin(): Promise<AIConfigWithAdmin[]> {
    try {
      const { data: configs, error } = await supabase
        .from('ai_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (configs || []) as AIConfigWithAdmin[];
    } catch (error) {
      console.error('Get AI configs with admin error:', error);
      return [];
    }
  },

  async createAIConfigWithAdmin(params: CreateAIConfigParams): Promise<AIConfigWithAdmin | null> {
    try {
      const configData = {
        name: params.name,
        provider: params.provider,
        api_key: params.api_key,
        model: params.model,
        endpoint: params.endpoint,
        config: params.config,
        is_active: params.is_active ?? true,
      };

      const { data: config, error } = await supabase
        .from('ai_configs')
        .insert(configData as any)
        .select()
        .single();

      if (error) {
        console.error('[adminService] Create AI config error:', error);
        throw error;
      }
      return config as AIConfigWithAdmin | null;
    } catch (error) {
      console.error('[adminService] Create AI config with admin error:', error);
      return null;
    }
  },

  async updateAIConfigWithAdmin(configId: string, updates: Partial<AIConfigWithAdmin>): Promise<AIConfigWithAdmin | null> {
    try {
      const updateData = {
        ...updates,
      };

      const { data: config, error } = await supabase
        .from('ai_configs')
        .update(updateData as any)
        .eq('id', configId)
        .select()
        .single();

      if (error) throw error;
      return config as AIConfigWithAdmin | null;
    } catch (error) {
      console.error('Update AI config with admin error:', error);
      return null;
    }
  },

  async deleteAIConfigWithAdmin(configId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_configs')
        .delete()
        .eq('id', configId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete AI config with admin error:', error);
      return false;
    }
  },
};
