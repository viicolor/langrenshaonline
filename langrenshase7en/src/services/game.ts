import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type GamePhase = 'waiting' | 'night' | 'day' | 'voting' | 'finished';

export interface GameAction {
  id: string;
  gameRecordId: string;
  playerId: string;
  actionType: string;
  targetId?: string;
  round: number;
  phase: GamePhase;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface GamePhaseState {
  gameRecordId: string;
  phase: GamePhase;
  round: number;
  phaseStartTime: string;
  phaseEndTime?: string;
  currentSpeaker?: string;
  votes?: Record<string, string>;
  nightActions?: GameAction[];
}

export const gameService = {
  async createGameRecord(roomId: string, boardId?: string): Promise<string | null> {
    try {
      const { data: firstNode, error: nodeError } = await supabase
        .from('game_flow_nodes')
        .select('id')
        .eq('node_code', 'night_start')
        .eq('is_delete', 0)
        .maybeSingle();

      if (nodeError) {
        console.error('Get first flow node error:', nodeError);
      }

      const { data: gameRecord, error } = await supabase
        .from('game_records')
        .insert({
          room_id: roomId,
          board_id: boardId || null,
          started_at: new Date().toISOString(),
          current_round: 1,
          current_phase: null,
          night_step: 0,
          phase_ends_at: null,
          phase_started_at: null,
          current_node_id: firstNode?.id || null,
          node_start_time: firstNode?.id ? new Date().toISOString() : null,
          node_remaining_seconds: firstNode?.timeout_seconds || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return gameRecord?.id || null;
    } catch (error) {
      console.error('Create game record error:', error);
      return null;
    }
  },

  async endGameRecord(gameRecordId: string, winnerTeam: string, durationSeconds: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('game_records')
        .update({
          ended_at: new Date().toISOString(),
          winner_team: winnerTeam,
          duration_seconds: durationSeconds,
          current_phase: 'finished',
        })
        .eq('id', gameRecordId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('End game record error:', error);
      return false;
    }
  },

  /** 获取房间当前进行中的对局（未结束的最新一条） */
  async getCurrentGameRecord(roomId: string): Promise<Tables<'game_records'> | null> {
    try {
      const { data, error } = await supabase
        .from('game_records')
        .select('*')
        .eq('room_id', roomId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get current game record error:', error);
      return null;
    }
  },

  /** 获取房间最近一次已结束的对局（用于展示获胜方等） */
  async getLastEndedGameRecord(roomId: string): Promise<Tables<'game_records'> | null> {
    try {
      const { data, error } = await supabase
        .from('game_records')
        .select('*')
        .eq('room_id', roomId)
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get last ended game record error:', error);
      return null;
    }
  },

  /** 更新对局阶段与倒计时，供多端同步。仅当 onlyIfCurrentPhase / onlyIfNightStep 匹配时才更新（用于阶段推进幂等）。 */
  async updateGamePhase(
    gameRecordId: string,
    payload: {
      current_phase?: string;
      current_round?: number;
      phase_started_at?: string;
      phase_ends_at?: string;
      night_step?: number;
      current_node_id?: string;
      node_start_time?: string;
      node_remaining_seconds?: number;
    },
    onlyIfCurrentPhase?: string,
    onlyIfNightStep?: number
  ): Promise<boolean> {
    try {
      let q = supabase.from('game_records').update(payload).eq('id', gameRecordId);
      if (onlyIfCurrentPhase != null) {
        q = q.eq('current_phase', onlyIfCurrentPhase);
      }
      if (onlyIfNightStep !== undefined && onlyIfNightStep !== null) {
        q = q.eq('night_step', onlyIfNightStep);
      }
      const { data, error } = await q.select('id').maybeSingle();

      if (error) throw error;
      return data != null;
    } catch (error) {
      console.error('Update game phase error:', error);
      return false;
    }
  },

  /** 获取某对局某回合的技能/行动记录（用于判断本回合是否已提交、预言家查验结果等） */
  async getActionsForRound(
    gameRecordId: string,
    round: number
  ): Promise<Array<{ id: string; player_id: string; action_type: string; target_id: string | null; data: Record<string, unknown> | null }>> {
    try {
      const { data, error } = await supabase
        .from('game_actions')
        .select('id, player_id, action_type, target_id, data')
        .eq('game_record_id', gameRecordId)
        .eq('round', round);

      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        player_id: row.player_id,
        action_type: row.action_type,
        target_id: row.target_id ?? null,
        data: (row.data as Record<string, unknown>) ?? {},
      }));
    } catch (error) {
      console.error('Get actions for round error:', error);
      return [];
    }
  },

  /** 女巫药物全场唯一性：本局是否已使用过解药/毒药（任意回合） */
  async getWitchDrugUsage(gameRecordId: string): Promise<{ usedSave: boolean; usedPoison: boolean }> {
    try {
      const { data, error } = await supabase
        .from('game_actions')
        .select('action_type')
        .eq('game_record_id', gameRecordId)
        .in('action_type', ['witch_save', 'witch_poison']);
      if (error) throw error;
      const list = data || [];
      return {
        usedSave: list.some((r: { action_type: string }) => r.action_type === 'witch_save'),
        usedPoison: list.some((r: { action_type: string }) => r.action_type === 'witch_poison'),
      };
    } catch (error) {
      console.error('Get witch drug usage error:', error);
      return { usedSave: false, usedPoison: false };
    }
  },

  /** 订阅单条 game_record 变更，用于多端同步阶段/倒计时 */
  subscribeToGameRecord(
    gameRecordId: string,
    callback: (payload: { eventType: string; new?: Tables<'game_records'>; old?: Tables<'game_records'> }) => void
  ): () => void {
    const channel = supabase
      .channel(`game_record:${gameRecordId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_records',
          filter: `id=eq.${gameRecordId}`,
        },
        callback
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },

  async assignRoles(roomId: string, gameRecordId: string, roles: string[]): Promise<boolean> {
    try {
      const { data: roomPlayers } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('seat_number', { ascending: true, nullsFirst: false });

      if (!roomPlayers || roomPlayers.length === 0) return false;

      const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

      const updates = roomPlayers.map((player, index) => ({
        id: player.id,
        role: shuffledRoles[index] || null,
      }));

      for (const update of updates) {
        await supabase
          .from('room_players')
          .update({ role: update.role })
          .eq('id', update.id);
      }

      return true;
    } catch (error) {
      console.error('Assign roles error:', error);
      return false;
    }
  },

  async startNightPhase(roomId: string, gameRecordId: string, round: number): Promise<boolean> {
    try {
      const messageData: TablesInsert<'room_messages'> = {
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `第 ${round} 夜开始，请闭眼`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'night',
        round_number: round,
      };

      await supabase.from('room_messages').insert(messageData);
      return true;
    } catch (error) {
      console.error('Start night phase error:', error);
      return false;
    }
  },

  async startDayPhase(roomId: string, gameRecordId: string, round: number): Promise<boolean> {
    try {
      const messageData: TablesInsert<'room_messages'> = {
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `第 ${round} 天开始，请睁眼`,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'day',
        round_number: round,
      };

      await supabase.from('room_messages').insert(messageData);
      return true;
    } catch (error) {
      console.error('Start day phase error:', error);
      return false;
    }
  },

  async startVotingPhase(roomId: string, gameRecordId: string, round: number): Promise<boolean> {
    try {
      const messageData: TablesInsert<'room_messages'> = {
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: '投票阶段开始，请选择要投票的玩家',
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'voting',
        round_number: round,
      };

      await supabase.from('room_messages').insert(messageData);
      return true;
    } catch (error) {
      console.error('Start voting phase error:', error);
      return false;
    }
  },

  async killPlayer(roomId: string, userId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('room_players')
        .update({ is_alive: false })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

      const { data: player } = await supabase
        .from('room_players')
        .select('player_name')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (player) {
        const messageData: TablesInsert<'room_messages'> = {
          room_id: roomId,
          player_name: '系统',
          player_avatar: null,
          message: `${player.player_name} ${reason}`,
          message_type: 'system',
        };

        await supabase.from('room_messages').insert(messageData);
      }

      return true;
    } catch (error) {
      console.error('Kill player error:', error);
      return false;
    }
  },

  async recordVote(
    roomId: string,
    gameRecordId: string,
    voterId: string,
    targetId: string,
    round: number
  ): Promise<boolean> {
    try {
      const messageData: TablesInsert<'room_messages'> = {
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message: `投票记录`,
        message_type: 'vote',
        game_record_id: gameRecordId,
        phase: 'voting',
        round_number: round,
      };

      await supabase.from('room_messages').insert(messageData);
      return true;
    } catch (error) {
      console.error('Record vote error:', error);
      return false;
    }
  },

  async announceVoteResult(
    roomId: string,
    gameRecordId: string,
    round: number,
    votes: Record<string, number>,
    eliminatedPlayer?: string
  ): Promise<boolean> {
    try {
      let message = '投票结果：\n';
      Object.entries(votes).forEach(([playerName, count]) => {
        message += `${playerName}: ${count}票\n`;
      });

      if (eliminatedPlayer) {
        message += `\n${eliminatedPlayer} 被投票出局`;
      } else {
        message += '\n无人出局，平票';
      }

      const messageData: TablesInsert<'room_messages'> = {
        room_id: roomId,
        player_name: '系统',
        player_avatar: null,
        message,
        message_type: 'system',
        game_record_id: gameRecordId,
        phase: 'voting',
        round_number: round,
      };

      await supabase.from('room_messages').insert(messageData);
      return true;
    } catch (error) {
      console.error('Announce vote result error:', error);
      return false;
    }
  },

  async checkWinCondition(roomId: string): Promise<{ winner: string | null; reason: string }> {
    try {
      const { data: roomPlayers } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);

      if (!roomPlayers || roomPlayers.length === 0) {
        return { winner: null, reason: '没有玩家' };
      }

      const alivePlayers = roomPlayers.filter(p => p.is_alive);
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
    } catch (error) {
      console.error('Check win condition error:', error);
      return { winner: null, reason: '检查失败' };
    }
  },

  async getGameRecord(gameRecordId: string) {
    try {
      const { data: gameRecord, error } = await supabase
        .from('game_records')
        .select('*')
        .eq('id', gameRecordId)
        .single();

      if (error) throw error;
      return gameRecord;
    } catch (error) {
      console.error('Get game record error:', error);
      return null;
    }
  },
};
