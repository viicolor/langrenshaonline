import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import type { BoardWithRoles } from './board';
import { gameService } from './game';

export type Room = Tables<'rooms'>;
export type RoomMessage = Tables<'room_messages'>;
export type RoomPlayer = Tables<'room_players'>;

export interface CreateRoomParams {
  name: string;
  boardId?: string;
  maxPlayers?: number;
  aiPlayerCount?: number;
  allowAIPlayers?: boolean;
}

export interface JoinRoomParams {
  roomId: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  isAI?: boolean;
  aiConfigId?: string;
}

export const roomService = {
  async getRooms(): Promise<Room[]> {
    try {
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select('*')
        .in('status', ['waiting', 'playing'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return rooms || [];
    } catch (error) {
      console.error('Get rooms error:', error);
      return [];
    }
  },

  /** 批量获取各房间当前玩家数，用于大厅展示 */
  async getRoomPlayerCounts(roomIds: string[]): Promise<Record<string, number>> {
    if (roomIds.length === 0) return {};
    try {
      const { data: players, error } = await supabase
        .from('room_players')
        .select('room_id')
        .in('room_id', roomIds);

      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const id of roomIds) counts[id] = 0;
      for (const p of players || []) {
        const rid = (p as { room_id: string }).room_id;
        if (rid in counts) counts[rid]++;
      }
      return counts;
    } catch (error) {
      console.error('Get room player counts error:', error);
      return {};
    }
  },

  /** 批量获取各房间房主昵称（从 room_players 中 is_host=true 的 player_name） */
  async getRoomHostNames(roomIds: string[]): Promise<Record<string, string>> {
    if (roomIds.length === 0) return {};
    try {
      const { data: players, error } = await supabase
        .from('room_players')
        .select('room_id, player_name')
        .in('room_id', roomIds)
        .eq('is_host', true);

      if (error) throw error;
      const map: Record<string, string> = {};
      for (const p of players || []) {
        const r = p as { room_id: string; player_name: string };
        map[r.room_id] = r.player_name || '房主';
      }
      return map;
    } catch (error) {
      console.error('Get room host names error:', error);
      return {};
    }
  },

  async getRoomById(roomId: string): Promise<Room | null> {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      return room;
    } catch (error) {
      console.error('Get room by id error:', error);
      return null;
    }
  },

  /** 按房间名称查询（用于调试/分析），名称支持模糊匹配 */
  async getRoomByName(roomName: string): Promise<Room | null> {
    try {
      const { data: list, error } = await supabase
        .from('rooms')
        .select('*')
        .ilike('name', `%${roomName}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return list?.[0] ?? null;
    } catch (error) {
      console.error('Get room by name error:', error);
      return null;
    }
  },

  async createRoom(params: CreateRoomParams, hostId: string): Promise<Room | null> {
    try {
      const roomData: TablesInsert<'rooms'> = {
        name: params.name,
        host_id: hostId,
        board_id: params.boardId || null,
        max_players: params.maxPlayers || 12,
        ai_player_count: params.aiPlayerCount || 0,
        allow_ai_players: params.allowAIPlayers !== undefined ? params.allowAIPlayers : true,
        status: 'waiting',
      };

      const { data: room, error } = await supabase
        .from('rooms')
        .insert(roomData)
        .select()
        .single();

      if (error) throw error;
      return room;
    } catch (error) {
      console.error('Create room error:', error);
      return null;
    }
  },

  async updateRoom(roomId: string, updates: Partial<TablesInsert<'rooms'>>): Promise<Room | null> {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;
      return room;
    } catch (error) {
      console.error('Update room error:', error);
      return null;
    }
  },

  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete room error:', error);
      return false;
    }
  },

  async getRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
    try {
      const { data: players, error } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('seat_number', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return players || [];
    } catch (error) {
      console.error('Get room players error:', error);
      return [];
    }
  },

  async joinRoom(params: JoinRoomParams): Promise<RoomPlayer | null> {
    try {
      const room = await this.getRoomById(params.roomId);
      if (!room) {
        throw new Error('房间不存在');
      }

      if (room.status !== 'waiting') {
        throw new Error('房间已开始游戏，无法加入');
      }

      const existingPlayers = await this.getRoomPlayers(params.roomId);
      if (existingPlayers.some(p => p.user_id === params.userId)) {
        return existingPlayers.find(p => p.user_id === params.userId) || null;
      }

      const playerData: TablesInsert<'room_players'> = {
        room_id: params.roomId,
        user_id: params.userId,
        player_name: params.username,
        player_avatar: params.avatarUrl || null,
        is_host: room.host_id === params.userId,
        is_ai: params.isAI || false,
        ai_config_id: params.aiConfigId || null,
      };

      const { data: player, error } = await supabase
        .from('room_players')
        .insert(playerData)
        .select()
        .single();

      if (error) throw error;
      return player;
    } catch (error) {
      console.error('Join room error:', error);
      return null;
    }
  },

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Leave room error:', error);
      return false;
    }
  },

  async toggleReady(roomId: string, userId: string, isReady: boolean): Promise<RoomPlayer | null> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .update({ is_ready: isReady })
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return player;
    } catch (error) {
      console.error('Toggle ready error:', error);
      return null;
    }
  },

  /** 点击空座直接参与并占座：未在房间则先加入再占座，已在房间则只占座 */
  async takeSeat(params: {
    roomId: string;
    userId: string;
    username: string;
    avatarUrl?: string | null;
    seatNumber: number;
  }): Promise<RoomPlayer | null> {
    const { roomId, userId, username, avatarUrl, seatNumber } = params;
    try {
      const room = await this.getRoomById(roomId);
      if (!room) throw new Error('房间不存在');
      if (room.status !== 'waiting') throw new Error('游戏已开始，无法入座');
      const maxPlayers = room.max_players || 12;
      if (seatNumber < 1 || seatNumber > maxPlayers) throw new Error('座位号无效');

      const existingPlayers = await this.getRoomPlayers(roomId);
      const seatTaken = existingPlayers.some(
        p => p.seat_number === seatNumber && p.user_id !== userId
      );
      if (seatTaken) throw new Error(`座位 ${seatNumber} 已被占用`);

      const me = existingPlayers.find(p => p.user_id === userId);
      if (me) {
        const { data: player, error } = await supabase
          .from('room_players')
          .update({ seat_number: seatNumber })
          .eq('room_id', roomId)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw error;
        return player;
      }

      const playerData: TablesInsert<'room_players'> = {
        room_id: roomId,
        user_id: userId,
        player_name: username,
        player_avatar: avatarUrl || null,
        seat_number: seatNumber,
        is_host: room.host_id === userId,
        is_ai: false,
        ai_config_id: null,
      };
      const { data: player, error } = await supabase
        .from('room_players')
        .insert(playerData)
        .select()
        .single();
      if (error) throw error;
      return player;
    } catch (error) {
      console.error('Take seat error:', error);
      throw error;
    }
  },

  /** 撤下座位进入观战：将当前用户的 seat_number 置为 null，头像从座位撤下 */
  async leaveSeat(roomId: string, userId: string): Promise<RoomPlayer | null> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .update({ seat_number: null })
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return player;
    } catch (error) {
      console.error('Leave seat error:', error);
      throw error;
    }
  },

  async assignSeat(roomId: string, userId: string, seatNumber: number): Promise<RoomPlayer | null> {
    try {
      const room = await this.getRoomById(roomId);
      if (!room) throw new Error('房间不存在');
      const maxPlayers = room.max_players || 12;
      if (seatNumber < 1 || seatNumber > maxPlayers) throw new Error('座位号无效');

      const existingPlayers = await this.getRoomPlayers(roomId);
      const seatTaken = existingPlayers.some(
        p => p.seat_number === seatNumber && p.user_id !== userId
      );
      if (seatTaken) throw new Error(`座位 ${seatNumber} 已被占用`);

      const me = existingPlayers.find(p => p.user_id === userId);
      if (!me) throw new Error('请先上桌参与游戏');

      const { data: player, error } = await supabase
        .from('room_players')
        .update({ seat_number: seatNumber })
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return player;
    } catch (error) {
      console.error('Assign seat error:', error);
      throw error;
    }
  },

  async assignRole(roomId: string, userId: string, role: string): Promise<RoomPlayer | null> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .update({ role })
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return player;
    } catch (error) {
      console.error('Assign role error:', error);
      return null;
    }
  },

  async updatePlayerAlive(roomId: string, userId: string, isAlive: boolean): Promise<RoomPlayer | null> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .update({ is_alive: isAlive })
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return player;
    } catch (error) {
      console.error('Update player alive error:', error);
      return null;
    }
  },

  async startGame(roomId: string): Promise<Room | null> {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;
      return room;
    } catch (error) {
      console.error('Start game error:', error);
      return null;
    }
  },

  async endGame(roomId: string, winnerTeam: string): Promise<Room | null> {
    try {
      const { error: playersError } = await supabase
        .from('room_players')
        .update({ is_ready: false })
        .eq('room_id', roomId);
      if (playersError) throw playersError;

      const { data: room, error } = await supabase
        .from('rooms')
        .update({ status: 'finished' })
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;
      return room;
    } catch (error) {
      console.error('End game error:', error);
      return null;
    }
  },

  /** 游戏结束展示结束后，将房间重置为等待状态，便于玩家准备开始下一局。 */
  async resetRoomToWaiting(roomId: string): Promise<Room | null> {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .update({ status: 'waiting' })
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;
      return room;
    } catch (error) {
      console.error('Reset room to waiting error:', error);
      return null;
    }
  },

  /**
   * 【测试用】游戏进行中房主可重新开始一局：结束当前对局、房间回到等待、全员置为准备且存活，
   * 满足满座且全员准备时会自动开始新游戏。正式部署前请移除此功能。
   */
  async restartGameForTest(roomId: string): Promise<Room | null> {
    try {
      const record = await gameService.getCurrentGameRecord(roomId);
      if (record?.id) {
        const startedAt = record.started_at ? new Date(record.started_at).getTime() : Date.now();
        const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        await gameService.endGameRecord(record.id, 'test_restart', durationSeconds);
      }

      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'waiting' })
        .eq('id', roomId);
      if (roomError) throw roomError;

      const { data: players } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', roomId)
        .not('seat_number', 'is', null);

      if (players?.length) {
        for (const p of players) {
          await supabase
            .from('room_players')
            .update({ is_ready: true, is_alive: true })
            .eq('id', p.id);
        }
      }

      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (error) throw error;
      return room;
    } catch (error) {
      console.error('Restart game for test error:', error);
      return null;
    }
  },

  async sendMessage(
    roomId: string,
    playerName: string,
    playerAvatar: string | null,
    message: string,
    messageType: string = 'text',
    playerId?: string,
    gameRecordId?: string,
    phase?: string,
    roundNumber?: number
  ): Promise<RoomMessage | null> {
    try {
      const messageData: Record<string, unknown> = {
        room_id: roomId,
        message,
        game_record_id: gameRecordId || null,
        phase: phase || null,
        round_number: roundNumber ?? null,
        user_id: playerId || null,
        player_name: playerName,
        player_avatar: playerAvatar,
        message_type: messageType,
      };

      const { data: newMessage, error } = await supabase
        .from('room_messages')
        .insert(messageData as TablesInsert<'room_messages'>)
        .select()
        .single();

      if (error) throw error;
      return newMessage;
    } catch (error) {
      console.error('Send message error:', error);
      return null;
    }
  },

  async getRoomMessages(roomId: string, limit: number = 50): Promise<RoomMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return messages || [];
    } catch (error) {
      console.error('Get room messages error:', error);
      return [];
    }
  },

  /** 狼队夜聊：仅本局本夜 message_type=werewolf 的消息（需表中有 message_type 等字段） */
  async getWerewolfMessages(roomId: string, gameRecordId: string, roundNumber: number): Promise<RoomMessage[]> {
    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('game_record_id', gameRecordId)
        .eq('round_number', roundNumber)
        .eq('message_type', 'werewolf')
        .order('created_at', { ascending: true });
      if (error) return [];
      return (data as RoomMessage[]) || [];
    } catch {
      return [];
    }
  },

  subscribeToRoomMessages(roomId: string, callback: (message: RoomMessage) => void) {
    const channel = supabase
      .channel(`room_messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          callback(payload.new as RoomMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToRoomPlayers(roomId: string, callback: (payload: { eventType: string; new?: RoomPlayer; old?: RoomPlayer }) => void) {
    const channel = supabase
      .channel(`room_players:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToRooms(callback: (payload: { eventType: string; new?: Room; old?: Room }) => void) {
    const channel = supabase
      .channel('rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async addAIPlayer(roomId: string, aiConfigId?: string): Promise<RoomPlayer | null> {
    try {
      const room = await this.getRoomById(roomId);
      if (!room) {
        throw new Error('房间不存在');
      }

      if (!room.allow_ai_players) {
        throw new Error('房间不允许AI玩家');
      }

      const existingPlayers = await this.getRoomPlayers(roomId);
      const usedSeats = existingPlayers.map(p => p.seat_number).filter((seat): seat is number => seat !== null && seat !== undefined);
      const maxPlayers = room.max_players || 12;
      const availableSeats = Array.from({ length: maxPlayers }, (_, i) => i + 1).filter(seat => !usedSeats.includes(seat));

      if (availableSeats.length === 0) {
        throw new Error('房间已满');
      }

      const seatNumber = availableSeats[0];
      const aiName = `AI-${Math.floor(Math.random() * 1000)}`;
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${aiName}`;

      const playerData: TablesInsert<'room_players'> = {
        room_id: roomId,
        user_id: null,
        player_name: aiName,
        player_avatar: avatarUrl,
        seat_number: seatNumber,
        is_host: false,
        is_ai: true,
        ai_config_id: aiConfigId || null,
        is_ready: true,
        is_alive: true,
      };

      const { data: player, error } = await supabase
        .from('room_players')
        .insert(playerData)
        .select()
        .single();

      if (error) throw error;
      return player as RoomPlayer | null;
    } catch (error) {
      console.error('Add AI player error:', error);
      return null;
    }
  },

  async removeAIPlayer(roomId: string, playerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', playerId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Remove AI player error:', error);
      return false;
    }
  },

  async getAIPlayers(roomId: string): Promise<RoomPlayer[]> {
    try {
      const { data: players, error } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_ai', true)
        .order('seat_number', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (players || []) as RoomPlayer[];
    } catch (error) {
      console.error('Get AI players error:', error);
      return [];
    }
  },

  async updateAIPlayerConfig(roomId: string, playerId: string, aiConfigId: string): Promise<RoomPlayer | null> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .update({ ai_config_id: aiConfigId })
        .eq('room_id', roomId)
        .eq('user_id', playerId)
        .select()
        .single();

      if (error) throw error;
      return player as RoomPlayer | null;
    } catch (error) {
      console.error('Update AI player config error:', error);
      return null;
    }
  },

  async addAIPlayers(roomId: string, count: number): Promise<RoomPlayer[]> {
    try {
      const room = await this.getRoomById(roomId);
      if (!room) {
        throw new Error('房间不存在');
      }

      if (!room.allow_ai_players) {
        throw new Error('房间不允许AI玩家');
      }

      const existingPlayers = await this.getRoomPlayers(roomId);
      const usedSeats = existingPlayers.map(p => p.seat_number).filter((seat): seat is number => seat !== null && seat !== undefined);
      const maxPlayers = room.max_players || 12;
      const availableSeats = Array.from({ length: maxPlayers }, (_, i) => i + 1).filter(seat => !usedSeats.includes(seat));

      if (availableSeats.length < count) {
        throw new Error(`房间座位不足，最多只能添加 ${availableSeats.length} 个AI玩家`);
      }

      const addedPlayers: RoomPlayer[] = [];
      for (let i = 0; i < count; i++) {
        const seatNumber = availableSeats[i];
        const aiName = `AI-${Math.floor(Math.random() * 1000)}`;
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${aiName}`;

        const playerData: TablesInsert<'room_players'> = {
          room_id: roomId,
          user_id: null,
          player_name: aiName,
          player_avatar: avatarUrl,
          seat_number: seatNumber,
          is_host: false,
          is_ai: true,
          ai_config_id: null,
          is_ready: true,
          is_alive: true,
        };

        const { data: player, error } = await supabase
          .from('room_players')
          .insert(playerData)
          .select()
          .single();

        if (error) throw error;
        if (player) {
          addedPlayers.push(player);
        }
      }

      return addedPlayers;
    } catch (error) {
      console.error('Add AI players error:', error);
      return [];
    }
  },
};
