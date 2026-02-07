import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import type { BoardWithAdmin } from './admin';

export type Board = Tables<'boards'>;
export type BoardRole = Tables<'board_roles'>;
export type BoardWithRoles = Board & {
  roles: BoardRole[];
}

export interface CreateRoomParams {
  name: string;
  boardId?: string;
  maxPlayers?: number;
  aiPlayerCount?: number;
  allowAIPlayers?: boolean;
}

export const boardService = {
  /** 获取板子列表，按后台管理顺序（created_at 倒序，与 admin 一致） */
  async getBoards(): Promise<Board[]> {
    try {
      const { data: boards, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return boards || [];
    } catch (error) {
      console.error('Get boards error:', error);
      return [];
    }
  },

  /** 按人数推荐板子：返回第一个 player_count 等于目标人数的板子（在已按 getBoards 顺序的列表中） */
  getRecommendedBoardByPlayerCount(boards: Board[], playerCount: number): Board | undefined {
    return boards.find(b => b.player_count === playerCount);
  },

  async getBoardsWithAdmin(): Promise<BoardWithAdmin[]> {
    try {
      const { data: boards, error } = await supabase
        .from('boards')
        .select('*')
        .in('is_delete', [0])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (boards || []) as BoardWithAdmin[];
    } catch (error) {
      console.error('Get boards with admin error:', error);
      return [];
    }
  },

  async getBoardById(boardId: string): Promise<BoardWithRoles | null> {
    try {
      const { data: board, error } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (error) throw error;
      if (!board) return null;

      const { data: roles } = await supabase
        .from('board_roles')
        .select('*')
        .eq('board_id', boardId);

      return {
        ...board,
        roles: roles || [],
      };
    } catch (error) {
      console.error('Get board by id error:', error);
      return null;
    }
  },

  async createBoard(params: CreateRoomParams, hostId: string): Promise<Board | null> {
    try {
      const boardData: TablesInsert<'boards'> = {
        name: params.name,
        host_id: hostId,
        board_id: params.boardId || null,
        max_players: params.maxPlayers || 12,
        ai_player_count: params.aiPlayerCount || 0,
        allow_ai_players: params.allowAIPlayers !== undefined ? params.allowAIPlayers : true,
        status: 'waiting',
      };

      const { data: board, error } = await supabase
        .from('boards')
        .insert(boardData)
        .select()
        .single();

      if (error) throw error;
      return board;
    } catch (error) {
      console.error('Create board error:', error);
      return null;
    }
  },

  async updateBoard(boardId: string, updates: Partial<TablesInsert<'boards'>>): Promise<Board | null> {
    try {
      const { data: board, error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', boardId)
        .select()
        .single();

      if (error) throw error;
      return board;
    } catch (error) {
      console.error('Update board error:', error);
      return null;
    }
  },

  async deleteBoard(boardId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete board error:', error);
      return false;
    }
  },

  getDefaultBoard(): Promise<BoardWithRoles | null> {
    return null;
  },

  getBoardRolesCount(board: BoardWithRoles): Record<string, number> {
    const rolesCount: Record<string, number> = {};
    if (board && board.roles) {
      board.roles.forEach(role => {
        rolesCount[role.role_type] = role.count;
      });
    }
    return rolesCount;
  },

  getBoardDescription(board: BoardWithRoles): string {
    const rolesCount = this.getBoardRolesCount(board);
    const descriptions: string[] = [];
    if (rolesCount.werewolf) descriptions.push(`${rolesCount.werewolf}狼`);
    if (rolesCount.villager) descriptions.push(`${rolesCount.villager}民`);
    if (rolesCount.seer) descriptions.push(`${rolesCount.seer}预言家`);
    if (rolesCount.witch) descriptions.push(`${rolesCount.witch}女巫`);
    if (rolesCount.hunter) descriptions.push(`${rolesCount.hunter}猎人`);
    if (rolesCount.guard) descriptions.push(`${rolesCount.guard}守卫`);
    if (rolesCount.idiot) descriptions.push(`${rolesCount.idiot}白痴`);
    return descriptions.join('、');
  },

  getTotalPlayers(board: BoardWithRoles): number {
    if (board && board.roles) {
      return board.roles.reduce((sum, role) => sum + role.count, 0);
    }
    return 0;
  },
};
