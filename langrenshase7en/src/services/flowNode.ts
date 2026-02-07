import { supabase } from '@/integrations/supabase/client';

export interface FlowNodeWithAdmin {
  id: string;
  node_name: string;
  node_code: string;
  node_type: string;
  phase_config: any;
  operate_roles: any;
  next_node_rules: any;
  is_auto_advance: number;
  timeout_seconds: number;
  description?: string;
  is_system: number;
  is_active: number;
  create_time: string;
  update_time?: string;
  create_by: string;
  update_by?: string;
  is_delete: number;
}

export interface CreateFlowNodeParams {
  node_name: string;
  node_code: string;
  node_type: string;
  phase_config: any;
  operate_roles: any;
  next_node_rules: any;
  is_auto_advance: number;
  timeout_seconds: number;
  description?: string;
  is_system?: number;
  is_active?: number;
}

export interface BoardFlowMappingWithAdmin {
  id: string;
  board_id: string;
  flow_node_id: string;
  execution_order: number;
  is_active: number;
  create_time: string;
  update_time?: string;
  create_by: string;
  update_by?: string;
  is_delete: number;
}

export interface CreateBoardFlowMappingParams {
  board_id: string;
  flow_node_id: string;
  execution_order: number;
  is_active?: number;
}

export const flowNodeService = {
  async getFlowNodes(): Promise<{ nodes: FlowNodeWithAdmin[] }> {
    try {
      const { data: nodes, error } = await supabase
        .from('game_flow_nodes')
        .select('*')
        .eq('is_delete', 0)
        .order('create_time', { ascending: false });

      if (error) throw error;
      return { nodes: (nodes || []) as FlowNodeWithAdmin[] };
    } catch (error) {
      console.error('Get flow nodes error:', error);
      return { nodes: [] };
    }
  },

  async createFlowNode(params: CreateFlowNodeParams, createBy: string): Promise<FlowNodeWithAdmin> {
    try {
      const { data, error } = await supabase
        .from('game_flow_nodes')
        .insert({
          node_name: params.node_name,
          node_code: params.node_code,
          node_type: params.node_type,
          phase_config: params.phase_config,
          operate_roles: params.operate_roles,
          next_node_rules: params.next_node_rules,
          is_auto_advance: params.is_auto_advance,
          timeout_seconds: params.timeout_seconds,
          description: params.description || null,
          is_system: params.is_system ?? 0,
          is_active: params.is_active ?? 1,
          create_by: createBy,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FlowNodeWithAdmin;
    } catch (error) {
      console.error('Create flow node error:', error);
      throw error;
    }
  },

  async updateFlowNode(id: string, updates: Partial<FlowNodeWithAdmin>, updateBy: string): Promise<FlowNodeWithAdmin> {
    try {
      const { data, error } = await supabase
        .from('game_flow_nodes')
        .update({
          ...updates,
          update_by: updateBy,
          update_time: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FlowNodeWithAdmin;
    } catch (error) {
      console.error('Update flow node error:', error);
      throw error;
    }
  },

  async deleteFlowNode(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('game_flow_nodes')
        .update({ is_delete: 1 })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Delete flow node error:', error);
      throw error;
    }
  },

  async toggleFlowNodeActive(id: string, isActive: number, updateBy: string): Promise<FlowNodeWithAdmin> {
    return this.updateFlowNode(id, { is_active: isActive }, updateBy);
  },

  async getFlowNodeById(id: string): Promise<FlowNodeWithAdmin | null> {
    try {
      const { data: node, error } = await supabase
        .from('game_flow_nodes')
        .select('*')
        .eq('id', id)
        .eq('is_delete', 0)
        .single();

      if (error) throw error;
      return node as FlowNodeWithAdmin | null;
    } catch (error) {
      console.error('Get flow node by id error:', error);
      return null;
    }
  },
};

export const boardFlowService = {
  async getBoardFlows(boardId: string): Promise<{ flows: BoardFlowMappingWithAdmin[] }> {
    try {
      const { data: flows, error } = await supabase
        .from('board_flow_mappings')
        .select(`
          *,
          game_flow_nodes!inner (
            node_name,
            node_code,
            node_type,
            timeout_seconds
          )
        `)
        .eq('board_id', boardId)
        .eq('is_delete', 0)
        .order('execution_order', { ascending: true });

      if (error) throw error;
      return { flows: (flows || []) as BoardFlowMappingWithAdmin[] };
    } catch (error) {
      console.error('Get board flows error:', error);
      return { flows: [] };
    }
  },

  async addFlowToBoard(params: CreateBoardFlowMappingParams, createBy: string): Promise<BoardFlowMappingWithAdmin> {
    try {
      const { data, error } = await supabase
        .from('board_flow_mappings')
        .insert({
          board_id: params.board_id,
          flow_node_id: params.flow_node_id,
          execution_order: params.execution_order,
          is_active: params.is_active ?? 1,
          create_by: createBy,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BoardFlowMappingWithAdmin;
    } catch (error) {
      console.error('Add flow to board error:', error);
      throw error;
    }
  },

  async removeFlowFromBoard(mappingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('board_flow_mappings')
        .update({ is_delete: 1 })
        .eq('id', mappingId);

      if (error) throw error;
    } catch (error) {
      console.error('Remove flow from board error:', error);
      throw error;
    }
  },

  async updateFlowMappingOrder(mappingId: string, executionOrder: number, updateBy: string): Promise<BoardFlowMappingWithAdmin> {
    try {
      const { data, error } = await supabase
        .from('board_flow_mappings')
        .update({
          execution_order: executionOrder,
          update_by: updateBy,
          update_time: new Date().toISOString(),
        })
        .eq('id', mappingId)
        .select()
        .single();

      if (error) throw error;
      return data as BoardFlowMappingWithAdmin;
    } catch (error) {
      console.error('Update flow mapping order error:', error);
      throw error;
    }
  },

  async toggleFlowMappingActive(mappingId: string, isActive: number, updateBy: string): Promise<BoardFlowMappingWithAdmin> {
    try {
      const { data, error } = await supabase
        .from('board_flow_mappings')
        .update({
          is_active: isActive,
          update_by: updateBy,
          update_time: new Date().toISOString(),
        })
        .eq('id', mappingId)
        .select()
        .single();

      if (error) throw error;
      return data as BoardFlowMappingWithAdmin;
    } catch (error) {
      console.error('Toggle flow mapping active error:', error);
      throw error;
    }
  },
};
