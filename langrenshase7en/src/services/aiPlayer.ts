import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import type { AIConfig } from './admin';
import { aiService } from './AIService';
import { LLMConfig } from './LLMService';
import { AIContext, AIAction as NewAIAction } from '@/types/ai';

export interface AIAction {
  type: 'speak' | 'vote' | 'night_action' | 'day_action';
  content?: string;
  targetId?: string;
  timestamp: string;
  phase: string;
  roundNumber: number;
}

export interface AIPlayer {
  id: string;
  room_id: string;
  user_id: string;
  player_name: string;
  player_avatar: string | null;
  seat_number: number;
  is_host: boolean;
  is_ai: boolean;
  ai_config_id: string | null;
  is_ready: boolean;
  is_alive: boolean;
  role: string | null;
  created_at: string;
}

export interface AIActionLog {
  id: string;
  ai_player_id: string;
  action_type: string;
  content: string;
  target_id: string | null;
  phase: string;
  round_number: number;
  timestamp: string;
}

const aiPlayerService = {
  async getAIPlayers(roomId: string): Promise<AIPlayer[]> {
    try {
      const { data: players, error } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_ai', true)
        .order('seat_number', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (players || []) as AIPlayer[];
    } catch (error) {
      console.error('Get AI players error:', error);
      return [];
    }
  },

  async addAIPlayer(roomId: string, aiConfigId?: string): Promise<AIPlayer | null> {
    try {
      const room = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (!room) {
        throw new Error('房间不存在');
      }

      const existingPlayers = await supabase
        .from('room_players')
        .select('seat_number')
        .eq('room_id', roomId)
        .order('seat_number', { ascending: true, nullsFirst: false });

      const usedSeats = existingPlayers.data?.map(p => p.seat_number) || [];
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
        user_id: `ai-${crypto.randomUUID()}`,
        player_name: aiName,
        player_avatar: avatarUrl,
        seat_number,
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
      return player as AIPlayer | null;
    } catch (error) {
      console.error('Add AI player error:', error);
      return null;
    }
  },

  async addMultipleAIPlayers(roomId: string, count: number, aiConfigId?: string): Promise<AIPlayer[]> {
    const players: AIPlayer[] = [];
    
    for (let i = 0; i < count; i++) {
      const player = await this.addAIPlayer(roomId, aiConfigId);
      if (player) {
        players.push(player);
      }
    }
    
    return players;
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

  async updateAIPlayerConfig(roomId: string, playerId: string, aiConfigId: string): Promise<AIPlayer | null> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .update({ ai_config_id })
        .eq('room_id', roomId)
        .eq('user_id', playerId)
        .select()
        .single();

      if (error) throw error;
      return player as AIPlayer | null;
    } catch (error) {
      console.error('Update AI player config error:', error);
      return null;
    }
  },

  async simulateAIAction(
    roomId: string,
    playerId: string,
    phase: string,
    roundNumber: number,
    gameState: any
  ): Promise<AIAction> {
    const aiConfigId = await this.getAIPlayerConfig(roomId, playerId);
    const aiConfig = await this.getAIConfig(aiConfigId);

    const action = await this.decideAction(roomId, playerId, phase, roundNumber, gameState, aiConfig);

    return action;
  },

  async decideAction(
    roomId: string,
    playerId: string,
    phase: string,
    roundNumber: number,
    gameState: any,
    aiConfig: AIConfig | null
  ): Promise<AIAction> {
    const actions: AIAction[] = [];

    if (phase === 'night') {
      actions.push(await this.decideNightAction(roomId, playerId, gameState, aiConfig));
    } else if (phase === 'day') {
      actions.push(await this.decideDayAction(roomId, playerId, gameState, aiConfig));
    }

    return actions[0];
  },

  async decideNightAction(
    roomId: string,
    playerId: string,
    gameState: any,
    aiConfig: AIConfig | null
  ): Promise<AIAction> {
    const role = await this.getAIPlayerRole(roomId, playerId);
    
    if (role === 'werewolf') {
      return {
        type: 'night_action',
        content: 'kill',
        targetId: await this.selectKillTarget(roomId, playerId, gameState),
        timestamp: new Date().toISOString(),
        phase: 'night',
        roundNumber,
      };
    } else if (role === 'seer') {
      return {
        type: 'night_action',
        content: 'check',
        targetId: await this.selectCheckTarget(roomId, playerId, gameState),
        timestamp: new Date().toISOString(),
        phase: 'night',
        roundNumber,
      };
    } else if (role === 'witch') {
      return {
        type: 'night_action',
        content: await this.decideWitchAction(roomId, playerId, gameState),
        targetId: await this.selectWitchTarget(roomId, playerId, gameState),
        timestamp: new Date().toISOString(),
        phase: 'night',
        roundNumber,
      };
    } else if (role === 'guard') {
      return {
        type: 'night_action',
        content: 'protect',
        targetId: await this.selectProtectTarget(roomId, playerId, gameState),
        timestamp: new Date().toISOString(),
        phase: 'night',
        roundNumber,
      };
    } else {
      return {
        type: 'night_action',
        content: 'skip',
        timestamp: new Date().toISOString(),
        phase: 'night',
        roundNumber,
      };
    }
  },

  async decideDayAction(
    roomId: string,
    playerId: string,
    gameState: any,
    aiConfig: AIConfig | null
  ): Promise<AIAction> {
    const role = await this.getAIPlayerRole(roomId, playerId);
    
    if (role === 'werewolf') {
      return {
        type: 'day_action',
        content: await this.generateWerewolfDayMessage(roomId, playerId, gameState),
        timestamp: new Date().toISOString(),
        phase: 'day',
        roundNumber: gameState.round_number || 1,
      };
    } else if (role === 'villager') {
      return {
        type: 'speak',
        content: await this.generateVillagerMessage(roomId, playerId, gameState),
        timestamp: new Date().toISOString(),
        phase: 'day',
        roundNumber: gameState.round_number || 1,
      };
    } else {
      return {
        type: 'speak',
        content: await this.generateGenericMessage(roomId, playerId, role, gameState),
        timestamp: new Date().toISOString(),
        phase: 'day',
        roundNumber: gameState.round_number || 1,
      };
    }
  },

  async selectKillTarget(roomId: string, playerId: string, gameState: any): Promise<string> {
    const players = await this.getAlivePlayers(roomId);
    const nonWolfPlayers = players.filter(p => p.role !== 'werewolf');
    const targets = nonWolfPlayers.length > 0 ? nonWolfPlayers : players;
    return targets[Math.floor(Math.random() * targets.length)].id;
  },

  async selectCheckTarget(roomId: string, playerId: string, gameState: any): Promise<string> {
    const players = await this.getAlivePlayers(roomId);
    const unknownPlayers = players.filter(p => !this.hasPlayerCheckedBefore(roomId, playerId, p.id, gameState));
    return unknownPlayers.length > 0 ? unknownPlayers[Math.floor(Math.random() * unknownPlayers.length)].id : playerId;
  },

  async selectWitchTarget(roomId: string, playerId: string, gameState: any): Promise<string> {
    const players = await this.getAlivePlayers(roomId);
    return players[Math.floor(Math.random() * players.length)].id;
  },

  async selectProtectTarget(roomId: string, playerId: string, gameState: any): Promise<string> {
    const players = await this.getAlivePlayers(roomId);
    const nonProtectedPlayers = players.filter(p => !this.isPlayerProtected(roomId, p.id, gameState));
    return nonProtectedPlayers.length > 0 ? nonProtectedPlayers[Math.floor(Math.random() * nonProtectedPlayers.length)].id : playerId;
  },

  async decideWitchAction(roomId: string, playerId: string, gameState: any): Promise<string> {
    const hasPoison = await this.hasWitchPoisonUsed(roomId, playerId, gameState);
    const hasAntidote = await this.hasWitchAntidoteUsed(roomId, playerId, gameState);
    
    if (!hasPoison && !hasAntidote) {
      const random = Math.random();
      if (random < 0.5) {
        return 'poison';
      } else {
        return 'antidote';
      }
    } else if (!hasPoison) {
      return 'poison';
    } else if (!hasAntidote) {
      return 'antidote';
    } else {
      return 'skip';
    }
  },

  async generateWerewolfDayMessage(roomId: string, playerId: string, gameState: any): Promise<string> {
    const messages = [
      '我觉得{player}可能是好人',
      '我怀疑{player}',
      '我是平民，不要投我',
      '昨晚{player}没有行动，应该是好人',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  },

  async generateVillagerMessage(roomId: string, playerId: string, gameState: any): Promise<string> {
    const messages = [
      '我是好人，请大家相信我',
      '我觉得{player}很可疑',
      '我昨晚没有看到任何异常',
      '请大家仔细分析',
      '我建议投给{player}',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  },

  async generateGenericMessage(roomId: string, playerId: string, role: string, gameState: any): Promise<string> {
    const roleMessages: Record<string, string[]> = {
      'werewolf': [
        '我是好人，不要怀疑我',
        '我昨晚没有行动',
        '我觉得{player}是狼人',
        '请大家相信我',
      ],
      'seer': [
        '我是好人',
        '我昨晚查验了{player}',
        '请大家相信我',
      ],
      'witch': [
        '我是好人',
        '我昨晚使用了药',
        '请大家相信我',
      ],
      'guard': [
        '我是好人',
        '我昨晚保护了{player}',
        '请大家相信我',
      ],
      'villager': [
        '我是好人',
        '请大家相信我',
        '我觉得{player}是好人',
      ],
    };

    const messages = roleMessages[role] || [
      '我是好人',
      '请大家相信我',
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  },

  async aiPlayerSpeak(roomId: string, playerId: string, message: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          player_name: await this.getAIPlayerName(roomId, playerId),
          player_avatar: await this.getAIPlayerAvatar(roomId, playerId),
          message,
          message_type: 'text',
          player_id: playerId,
          phase: 'day',
          round_number: 1,
        });

      if (error) throw error;
    } catch (error) {
      console.error('AI player speak error:', error);
    }
  },

  async aiPlayerVote(roomId: string, playerId: string, targetId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          player_name: await this.getAIPlayerName(roomId, playerId),
          player_avatar: await this.getAIPlayerAvatar(roomId, playerId),
          message: `我投票给${await this.getPlayerNameById(roomId, targetId)}`,
          message_type: 'vote',
          player_id: playerId,
          phase: 'day',
          round_number: 1,
        });

      if (error) throw error;
    } catch (error) {
      console.error('AI player vote error:', error);
    }
  },

  async getAIPlayerConfig(roomId: string, playerId: string): Promise<string | null> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .select('ai_config_id')
        .eq('room_id', roomId)
        .eq('user_id', playerId)
        .single();

      if (error) throw error;
      
      const aiConfigId = player?.ai_config_id;
      
      if (!aiConfigId) {
        console.log(`AI玩家 ${playerId} 没有配置AI配置ID，使用默认配置`);
        return null;
      }
      
      return aiConfigId;
    } catch (error) {
      console.error('Get AI player config error:', error);
      return null;
    }
  },

  async getAIConfig(aiConfigId: string): Promise<AIConfig | null> {
    if (!aiConfigId) {
      console.log('AI配置ID为空，使用默认配置');
      return null;
    }
    
    try {
      const { data: config, error } = await supabase
        .from('ai_configs')
        .select('*')
        .eq('id', aiConfigId)
        .single();

      if (error) throw error;
      return config as AIConfig | null;
    } catch (error) {
      console.error('Get AI config error:', error);
      return null;
    }
  },

  async getAIPlayerName(roomId: string, playerId: string): Promise<string> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .select('player_name')
        .eq('room_id', roomId)
        .eq('user_id', playerId)
        .single();

      if (error) throw error;
      return player?.player_name || 'AI玩家';
    } catch (error) {
      console.error('Get AI player name error:', error);
      return 'AI玩家';
    }
  },

  async getAIPlayerAvatar(roomId: string, playerId: string): Promise<string> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .select('player_avatar')
        .eq('room_id', roomId)
        .eq('user_id', playerId)
        .single();

      if (error) throw error;
      return player?.player_avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ai';
    } catch (error) {
      console.error('Get AI player avatar error:', error);
      return 'https://api.dicebear.com/7.x/bottts/svg?seed=ai';
    }
  },

  async getAlivePlayers(roomId: string): Promise<AIPlayer[]> {
    try {
      const { data: players, error } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_alive', true)
        .order('seat_number', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (players || []) as AIPlayer[];
    } catch (error) {
      console.error('Get alive players error:', error);
      return [];
    }
  },

  async hasPlayerCheckedBefore(roomId: string, playerId: string, targetId: string, gameState: any): Promise<boolean> {
    return false;
  },

  async isPlayerProtected(roomId: string, playerId: string, gameState: any): Promise<boolean> {
    return false;
  },

  async hasWitchPoisonUsed(roomId: string, playerId: string, gameState: any): Promise<boolean> {
    return false;
  },

  async hasWitchAntidoteUsed(roomId: string, playerId: string, gameState: any): Promise<boolean> {
    return false;
  },

  async getPlayerNameById(roomId: string, playerId: string): Promise<string> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .select('player_name')
        .eq('room_id', roomId)
        .eq('user_id', playerId)
        .single();

      if (error) throw error;
      return player?.player_name || '未知玩家';
    } catch (error) {
      console.error('Get player name error:', error);
      return '未知玩家';
    }
  },

  // 使用LLM服务生成AI行为
  async decideActionWithLLM(
    roomId: string,
    playerId: string,
    phase: string,
    roundNumber: number,
    gameState: any
  ): Promise<AIAction> {
    try {
      // 获取AI玩家信息
      const aiConfigId = await this.getAIPlayerConfig(roomId, playerId);
      const aiConfig = await this.getAIConfig(aiConfigId);
      const playerName = await this.getAIPlayerName(roomId, playerId);
      const role = await this.getAIPlayerRole(roomId, playerId);
      const alivePlayers = await this.getAlivePlayers(roomId);

      // 构建LLM配置
      if (aiConfig) {
        const llmConfig: LLMConfig = {
          provider: aiConfig.provider as 'openai' | 'qwen' | 'mcp',
          apiKey: aiConfig.api_key || '',
          model: aiConfig.model || '',
          endpoint: aiConfig.endpoint || undefined,
          temperature: 0.7,
          maxTokens: 1000,
        };
        
        // 设置AI玩家的LLM配置
        aiService.setPlayerLLMConfig(playerId, llmConfig);
      }

      // 构建AI上下文
      const context: AIContext = {
        currentPhase: phase,
        currentRound: roundNumber,
        players: alivePlayers.map(p => ({
          id: p.user_id,
          name: p.player_name,
          avatar: p.player_avatar || '',
          seatNumber: p.seat_number,
          isAlive: p.is_alive,
          role: p.role as any,
          isHost: p.is_host,
          isReady: p.is_ready,
          isSpectator: false,
        })),
        votes: [],
        nightActions: [],
        messages: [],
        deaths: [],
      };

      // 创建AI玩家实例（如果不存在）
      const aiPlayer = {
        id: playerId,
        name: playerName,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${playerName}`,
        seatNumber: 0,
        isAlive: true,
        role: role as any,
        isHost: false,
        isReady: true,
        isSpectator: false,
        personality: 'calm', // 默认性格
        provider: 'openai', // 默认提供商
        isAI: true,
        aggressiveness: 0.5,
        deceptionLevel: 0.5,
        cooperationLevel: 0.5,
        speakingStyle: 'calm',
        memory: [],
        lastActionTime: 0,
        actionCooldown: 3000,
      };

      // 调用LLM服务生成行为
      const llmAction = await aiService.decideActionWithLLM(playerId, context);

      // 转换为当前的AIAction格式
      if (llmAction.type === 'chat') {
        return {
          type: 'speak',
          content: llmAction.message,
          timestamp: new Date().toISOString(),
          phase,
          roundNumber,
        };
      } else if (llmAction.type === 'vote') {
        return {
          type: 'vote',
          content: 'vote',
          targetId: llmAction.targetId,
          timestamp: new Date().toISOString(),
          phase,
          roundNumber,
        };
      } else if (llmAction.type === 'skill') {
        return {
          type: 'night_action',
          content: 'skill',
          targetId: llmAction.targetId,
          timestamp: new Date().toISOString(),
          phase,
          roundNumber,
        };
      } else {
        // 默认行为
        return await this.decideAction(roomId, playerId, phase, roundNumber, gameState, aiConfig);
      }
    } catch (error) {
      console.error('LLM action error:', error);
      // 出错时使用备用策略
      const aiConfigId = await this.getAIPlayerConfig(roomId, playerId);
      const aiConfig = await this.getAIConfig(aiConfigId);
      return await this.decideAction(roomId, playerId, phase, roundNumber, gameState, aiConfig);
    }
  },



  // 获取AI玩家角色
  async getAIPlayerRole(roomId: string, playerId: string): Promise<string> {
    try {
      const { data: player, error } = await supabase
        .from('room_players')
        .select('role')
        .eq('room_id', roomId)
        .eq('user_id', playerId)
        .single();

      if (error) throw error;
      return player?.role || 'villager';
    } catch (error) {
      console.error('Get AI player role error:', error);
      return 'villager';
    }
  },
};

export default aiPlayerService;
