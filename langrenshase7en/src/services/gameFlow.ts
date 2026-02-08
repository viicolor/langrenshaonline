import { supabase } from '@/integrations/supabase/client';

export interface GameFlowState {
  current_node_id: string | null;
  node_start_time: string | null;
  node_remaining_seconds: number;
  last_heartbeat_time: string | null;
}

export interface FlowNodeInfo {
  id: string;
  node_name: string;
  node_code: string;
  node_type: string;
  phase_config: any;
  operate_roles: any;
  next_node_rules: any;
  is_auto_advance: number;
  timeout_seconds: number;
}

export const gameFlowService = {
  async getGameFlowState(gameId: string): Promise<GameFlowState | null> {
    try {
      const { data, error } = await supabase
        .from('game_records')
        .select('current_node_id, node_start_time, node_remaining_seconds, last_heartbeat_time')
        .eq('id', gameId)
        .single();

      if (error) throw error;
      return data as GameFlowState | null;
    } catch (error) {
      console.error('Get game flow state error:', error);
      return null;
    }
  },

  async subscribeToGameFlowChanges(gameId: string, callback: (state: GameFlowState) => void) {
    const channel = supabase
      .channel(`game-flow-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_records',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const state = payload.new as GameFlowState;
            callback(state);
          }
        }
      )
      .subscribe();

    return channel;
  },

  async unsubscribeFromGameFlowChanges(channel: any) {
    supabase.removeChannel(channel);
  },

  async sendHeartbeat(gameId: string, playerId: string): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-core/api/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId,
          playerId,
        }),
      });

      if (!response.ok) {
        throw new Error('Heartbeat failed');
      }
    } catch (error) {
      console.error('Send heartbeat error:', error);
      throw error;
    }
  },

  async submitPlayerOperate(gameId: string, playerId: string, operateType: string, operateContent: any = {}): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-core/api/player-operate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          gameId,
          playerId,
          operateType,
          operateContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || 'Operate failed');
      }
    } catch (error) {
      console.error('Submit player operate error:', error);
      throw error;
    }
  },

  async getFlowNodeByCode(nodeCode: string): Promise<FlowNodeInfo | null> {
    try {
      const { data, error } = await supabase
        .from('game_flow_nodes')
        .select('*')
        .eq('node_code', nodeCode)
        .eq('is_delete', 0)
        .single();

      if (error) throw error;
      return data as FlowNodeInfo | null;
    } catch (error) {
      console.error('Get flow node by code error:', error);
      return null;
    }
  },

  async getFlowNodesByBoardId(boardId: string): Promise<FlowNodeInfo[]> {
    try {
      const { data, error } = await supabase
        .from('board_flow_mappings')
        .select(`
          execution_order,
          is_active,
          game_flow_nodes!inner (
            id,
            node_name,
            node_code,
            node_type,
            phase_config,
            operate_roles,
            next_node_rules,
            is_auto_advance,
            timeout_seconds
          )
        `)
        .eq('board_id', boardId)
        .eq('is_delete', 0)
        .order('execution_order', { ascending: true });

      if (error) throw error;
      return (data || []).map((mapping: any) => ({
        id: mapping.game_flow_nodes.id,
        node_name: mapping.game_flow_nodes.node_name,
        node_code: mapping.game_flow_nodes.node_code,
        node_type: mapping.game_flow_nodes.node_type,
        phase_config: mapping.game_flow_nodes.phase_config,
        operate_roles: mapping.game_flow_nodes.operate_roles,
        next_node_rules: mapping.game_flow_nodes.next_node_rules,
        is_auto_advance: mapping.game_flow_nodes.is_auto_advance,
        timeout_seconds: mapping.game_flow_nodes.timeout_seconds,
      })) as FlowNodeInfo[];
    } catch (error) {
      console.error('Get flow nodes by board id error:', error);
      return [];
    }
  },

  formatRemainingTime(seconds: number): string {
    if (seconds <= 0) return '0秒';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  },

  getNodeTypeLabel(nodeType: string): string {
    switch (nodeType) {
      case 'night_phase':
        return '夜晚';
      case 'day_phase':
        return '白天';
      case 'action':
        return '动作';
      default:
        return nodeType;
    }
  },

  canPlayerOperate(nodeConfig: FlowNodeInfo, playerId: string, playerRole?: string): boolean {
    const operateRoles = nodeConfig.operate_roles;
    if (!operateRoles) return false;

    switch (operateRoles.type) {
      case 'ALL':
        return true;
      case 'CURRENT_PLAYER':
        return operateRoles.player_id === playerId;
      case 'SPECIFIC_ROLES':
        return playerRole ? operateRoles.role_ids?.includes(playerRole) : false;
      default:
        return false;
    }
  },

  getAllowedActions(nodeConfig: FlowNodeInfo): string[] {
    return nodeConfig.phase_config?.actions || [];
  },

  getNextNodeIdByTrigger(nodeConfig: FlowNodeInfo, triggerType: 'TIMEOUT' | 'DISCONNECT' | 'PLAYER_OPERATE'): string | null {
    const rules = nodeConfig.next_node_rules;
    if (!rules) return null;

    switch (rules.type) {
      case 'FIXED':
        return rules.next_node_id || null;
      case 'BY_TRIGGER':
        return rules[triggerType] || rules.default || null;
      case 'BY_STATE':
      case 'BY_OPERATE':
        return rules.default || null;
      default:
        return null;
    }
  },
};
