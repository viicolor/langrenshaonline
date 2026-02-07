import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';
import aiPlayerService from './aiPlayer';
import { gameService } from './game';
import type { GamePhase } from './gameEngine';
import { aiService } from './AIService';

/**
 * AI游戏集成服务
 * 负责在游戏流程中生成AI玩家的行为
 */
export class AIGameIntegration {
  /**
   * 生成AI玩家的夜晚行为
   * @param roomId 房间ID
   * @param gameRecordId 游戏记录ID
   * @param round 回合数
   */
  async generateAINightActions(
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<void> {
    try {
      // 获取所有AI玩家
      const aiPlayers = await aiPlayerService.getAIPlayers(roomId);
      
      if (aiPlayers.length === 0) {
        console.log('没有AI玩家需要生成夜晚行为');
        return;
      }

      console.log(`准备为 ${aiPlayers.length} 个AI玩家生成夜晚行为`);

      // 获取游戏状态
      const gameState = await this.getGameState(roomId, gameRecordId, round);

      // 为每个AI玩家生成夜晚行为
      for (const aiPlayer of aiPlayers) {
        if (aiPlayer.is_alive) {
          // 检查AI玩家是否已入座
          if (!aiPlayer.seat_number) {
            console.warn(`AI玩家 ${aiPlayer.player_name} 未入座，跳过夜晚行为生成`);
            continue;
          }

          try {
            console.log(`为AI玩家 ${aiPlayer.player_name} (座位: ${aiPlayer.seat_number}) 生成夜晚行为`);
            
            // 使用LLM生成AI行为
            const action = await aiPlayerService.decideActionWithLLM(
              roomId,
              aiPlayer.user_id,
              'night',
              round,
              gameState
            );

            // 处理生成的行为
            if (action.type === 'night_action' && action.content) {
              await this.processAINightAction(
                roomId,
                gameRecordId,
                aiPlayer,
                action,
                round
              );
              console.log(`AI玩家 ${aiPlayer.player_name} 成功生成夜晚行为: ${action.content}`);
            }
          } catch (error) {
            console.error(`生成AI玩家 ${aiPlayer.player_name} 夜晚行为错误:`, error);
            // 使用备用方法生成行为
            try {
              const fallbackAction = await aiPlayerService.decideAction(
                roomId,
                aiPlayer.user_id,
                'night',
                round,
                gameState,
                null
              );
              
              if (fallbackAction.type === 'night_action' && fallbackAction.content) {
                await this.processAINightAction(
                  roomId,
                  gameRecordId,
                  aiPlayer,
                  fallbackAction,
                  round
                );
                console.log(`AI玩家 ${aiPlayer.player_name} 使用备用方法生成夜晚行为: ${fallbackAction.content}`);
              }
            } catch (fallbackError) {
              console.error(`备用方法生成AI玩家 ${aiPlayer.player_name} 夜晚行为也失败:`, fallbackError);
            }
          }
        } else {
          console.log(`AI玩家 ${aiPlayer.player_name} 已死亡，跳过夜晚行为生成`);
        }
      }
    } catch (error) {
      console.error('生成AI夜晚行为错误:', error);
    }
  }

  /**
   * 生成AI玩家的白天发言
   * @param roomId 房间ID
   * @param gameRecordId 游戏记录ID
   * @param round 回合数
   */
  async generateAIDaySpeeches(
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<void> {
    try {
      // 获取所有AI玩家
      const aiPlayers = await aiPlayerService.getAIPlayers(roomId);
      
      if (aiPlayers.length === 0) {
        console.log('没有AI玩家需要生成白天发言');
        return;
      }

      console.log(`准备为 ${aiPlayers.length} 个AI玩家生成白天发言`);

      // 获取游戏状态
      const gameState = await this.getGameState(roomId, gameRecordId, round);

      // 为每个AI玩家生成白天发言
      for (const aiPlayer of aiPlayers) {
        if (aiPlayer.is_alive) {
          // 检查AI玩家是否已入座
          if (!aiPlayer.seat_number) {
            console.warn(`AI玩家 ${aiPlayer.player_name} 未入座，跳过白天发言生成`);
            continue;
          }

          try {
            console.log(`为AI玩家 ${aiPlayer.player_name} (座位: ${aiPlayer.seat_number}) 生成白天发言`);
            
            // 使用LLM生成AI行为
            const action = await aiPlayerService.decideActionWithLLM(
              roomId,
              aiPlayer.user_id,
              'day',
              round,
              gameState
            );

            // 处理生成的发言
            if (action.type === 'speak' && action.content) {
              await this.processAISpeech(
                roomId,
                gameRecordId,
                aiPlayer,
                action.content,
                round
              );
              console.log(`AI玩家 ${aiPlayer.player_name} 成功生成白天发言`);
            }
          } catch (error) {
            console.error(`生成AI玩家 ${aiPlayer.player_name} 白天发言错误:`, error);
            // 使用备用方法生成发言
            try {
              const fallbackAction = await aiPlayerService.decideAction(
                roomId,
                aiPlayer.user_id,
                'day',
                round,
                gameState,
                null
              );
              
              if (fallbackAction.type === 'speak' && fallbackAction.content) {
                await this.processAISpeech(
                  roomId,
                  gameRecordId,
                  aiPlayer,
                  fallbackAction.content,
                  round
                );
                console.log(`AI玩家 ${aiPlayer.player_name} 使用备用方法生成白天发言`);
              }
            } catch (fallbackError) {
              console.error(`备用方法生成AI玩家 ${aiPlayer.player_name} 白天发言也失败:`, fallbackError);
            }
          }
        } else {
          console.log(`AI玩家 ${aiPlayer.player_name} 已死亡，跳过白天发言生成`);
        }
      }
    } catch (error) {
      console.error('生成AI白天发言错误:', error);
    }
  }

  /**
   * 生成AI玩家的投票
   * @param roomId 房间ID
   * @param gameRecordId 游戏记录ID
   * @param round 回合数
   */
  async generateAIVotes(
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<void> {
    try {
      // 获取所有AI玩家
      const aiPlayers = await aiPlayerService.getAIPlayers(roomId);
      
      if (aiPlayers.length === 0) {
        console.log('没有AI玩家需要生成投票');
        return;
      }

      console.log(`准备为 ${aiPlayers.length} 个AI玩家生成投票`);

      // 获取游戏状态
      const gameState = await this.getGameState(roomId, gameRecordId, round);

      // 为每个AI玩家生成投票
      for (const aiPlayer of aiPlayers) {
        if (aiPlayer.is_alive) {
          // 检查AI玩家是否已入座
          if (!aiPlayer.seat_number) {
            console.warn(`AI玩家 ${aiPlayer.player_name} 未入座，跳过投票生成`);
            continue;
          }

          try {
            console.log(`为AI玩家 ${aiPlayer.player_name} (座位: ${aiPlayer.seat_number}) 生成投票`);
            
            // 使用LLM生成AI行为
            const action = await aiPlayerService.decideActionWithLLM(
              roomId,
              aiPlayer.user_id,
              'voting',
              round,
              gameState
            );

            // 处理生成的投票
            if (action.type === 'vote' && action.targetId) {
              await this.processAIVote(
                roomId,
                gameRecordId,
                aiPlayer,
                action.targetId,
                round
              );
              console.log(`AI玩家 ${aiPlayer.player_name} 成功生成投票`);
            }
          } catch (error) {
            console.error(`生成AI玩家 ${aiPlayer.player_name} 投票错误:`, error);
            // 使用备用方法生成投票
            try {
              const fallbackAction = await aiPlayerService.decideAction(
                roomId,
                aiPlayer.user_id,
                'voting',
                round,
                gameState,
                null
              );
              
              if (fallbackAction.type === 'vote' && fallbackAction.targetId) {
                await this.processAIVote(
                  roomId,
                  gameRecordId,
                  aiPlayer,
                  fallbackAction.targetId,
                  round
                );
                console.log(`AI玩家 ${aiPlayer.player_name} 使用备用方法生成投票`);
              }
            } catch (fallbackError) {
              console.error(`备用方法生成AI玩家 ${aiPlayer.player_name} 投票也失败:`, fallbackError);
            }
          }
        } else {
          console.log(`AI玩家 ${aiPlayer.player_name} 已死亡，跳过投票生成`);
        }
      }
    } catch (error) {
      console.error('生成AI投票错误:', error);
    }
  }

  /**
   * 处理AI玩家的夜晚行为
   * @param roomId 房间ID
   * @param gameRecordId 游戏记录ID
   * @param aiPlayer AI玩家
   * @param action AI行为
   * @param round 回合数
   */
  private async processAINightAction(
    roomId: string,
    gameRecordId: string,
    aiPlayer: any,
    action: any,
    round: number
  ): Promise<void> {
    try {
      // 查找目标玩家
      const targetPlayer = await this.getPlayerById(roomId, action.targetId);
      
      if (!targetPlayer) {
        console.error(`AI玩家 ${aiPlayer.player_name} 目标玩家不存在:`, action.targetId);
        return;
      }

      // 记录夜晚行为
      await supabase
        .from('game_actions')
        .insert({
          game_record_id: gameRecordId,
          player_id: aiPlayer.id,
          action_type: this.mapActionType(action.content),
          target_id: targetPlayer.id,
          round,
          phase: 'night' as GamePhase,
          data: {
            ai_generated: true,
            action_content: action.content,
          },
        });

      // 记录消息
      await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          player_name: aiPlayer.player_name,
          player_avatar: aiPlayer.player_avatar,
          message: `AI玩家 ${aiPlayer.player_name} 执行了 ${action.content} 操作`,
          message_type: 'action',
          game_record_id: gameRecordId,
          phase: 'night',
          round_number: round,
        });

      // 更新AI玩家记忆
      aiService.updateMemory(aiPlayer.user_id, {
        type: 'skill',
        timestamp: Date.now(),
        data: {
          action: action.content,
          targetId: targetPlayer.user_id,
          targetName: targetPlayer.player_name,
          round,
          phase: 'night',
        },
      });
    } catch (error) {
      console.error('处理AI夜晚行为错误:', error);
    }
  }

  /**
   * 处理AI玩家的发言
   * @param roomId 房间ID
   * @param gameRecordId 游戏记录ID
   * @param aiPlayer AI玩家
   * @param content 发言内容
   * @param round 回合数
   */
  private async processAISpeech(
    roomId: string,
    gameRecordId: string,
    aiPlayer: any,
    content: string,
    round: number
  ): Promise<void> {
    try {
      // 记录发言
      await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          player_name: aiPlayer.player_name,
          player_avatar: aiPlayer.player_avatar,
          message: content,
          message_type: 'text',
          player_id: aiPlayer.id,
          game_record_id: gameRecordId,
          phase: 'day',
          round_number: round,
        });

      // 更新AI玩家记忆
      aiService.updateMemory(aiPlayer.user_id, {
        type: 'chat',
        timestamp: Date.now(),
        data: {
          message: content,
          round,
          phase: 'day',
        },
      });

      console.log(`AI玩家 ${aiPlayer.player_name} 发言:`, content);
    } catch (error) {
      console.error('处理AI发言错误:', error);
    }
  }

  /**
   * 处理AI玩家的投票
   * @param roomId 房间ID
   * @param gameRecordId 游戏记录ID
   * @param aiPlayer AI玩家
   * @param targetId 目标玩家ID
   * @param round 回合数
   */
  private async processAIVote(
    roomId: string,
    gameRecordId: string,
    aiPlayer: any,
    targetId: string,
    round: number
  ): Promise<void> {
    try {
      // 查找目标玩家
      const targetPlayer = await this.getPlayerById(roomId, targetId);
      
      if (!targetPlayer) {
        console.error(`AI玩家 ${aiPlayer.player_name} 投票目标玩家不存在:`, targetId);
        return;
      }

      // 记录投票
      await supabase
        .from('game_actions')
        .insert({
          game_record_id: gameRecordId,
          player_id: aiPlayer.id,
          action_type: 'vote',
          target_id: targetPlayer.id,
          round,
          phase: 'voting' as GamePhase,
          data: {
            ai_generated: true,
          },
        });

      // 记录消息
      await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          player_name: aiPlayer.player_name,
          player_avatar: aiPlayer.player_avatar,
          message: `我投票给 ${targetPlayer.player_name}`,
          message_type: 'vote',
          player_id: aiPlayer.id,
          game_record_id: gameRecordId,
          phase: 'voting',
          round_number: round,
        });

      // 更新AI玩家记忆
      aiService.updateMemory(aiPlayer.user_id, {
        type: 'vote',
        timestamp: Date.now(),
        data: {
          targetId: targetPlayer.user_id,
          targetName: targetPlayer.player_name,
          round,
          phase: 'voting',
        },
      });

      console.log(`AI玩家 ${aiPlayer.player_name} 投票给:`, targetPlayer.player_name);
    } catch (error) {
      console.error('处理AI投票错误:', error);
    }
  }

  /**
   * 获取游戏状态
   * @param roomId 房间ID
   * @param gameRecordId 游戏记录ID
   * @param round 回合数
   */
  private async getGameState(
    roomId: string,
    gameRecordId: string,
    round: number
  ): Promise<any> {
    try {
      // 获取所有玩家
      const { data: players } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);

      // 获取游戏记录
      const gameRecord = await gameService.getCurrentGameRecord(roomId);

      // 获取游戏动作
      const actions = await gameService.getActionsForRound(gameRecordId, round);

      // 获取房间消息
      const { data: messages } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('round_number', round)
        .order('created_at', { ascending: true });

      return {
        roomId,
        gameRecordId,
        round_number: round,
        players,
        gameRecord,
        actions,
        messages,
      };
    } catch (error) {
      console.error('获取游戏状态错误:', error);
      return {};
    }
  }

  /**
   * 根据ID获取玩家
   * @param roomId 房间ID
   * @param playerId 玩家ID（可以是user_id或id）
   */
  private async getPlayerById(roomId: string, playerId: string): Promise<any> {
    try {
      // 先尝试通过id查找
      let { data: player } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('id', playerId)
        .single();

      // 如果没找到，尝试通过user_id查找
      if (!player) {
        const { data: playerByUserId } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', roomId)
          .eq('user_id', playerId)
          .single();
        player = playerByUserId;
      }

      return player;
    } catch (error) {
      console.error('获取玩家错误:', error);
      return null;
    }
  }

  /**
   * 映射动作类型
   * @param actionContent 动作内容
   */
  private mapActionType(actionContent: string): string {
    const actionMap: Record<string, string> = {
      'kill': 'werewolf_kill',
      'check': 'seer_check',
      'antidote': 'witch_save',
      'poison': 'witch_poison',
      'protect': 'guard_protect',
    };

    return actionMap[actionContent] || actionContent;
  }
}

// 导出单例实例
export const aiGameIntegration = new AIGameIntegration();
