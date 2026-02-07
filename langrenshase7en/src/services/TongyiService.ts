import { AIPlayer, AIContext, AIResponse, RoleType, AIPersonality } from '@/types/ai';

export interface TongyiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class TongyiService {
  private config: TongyiConfig;
  private baseUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

  constructor(config: TongyiConfig) {
    this.config = {
      model: 'qwen-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      ...config,
    };
  }

  async generateAIAction(
    player: AIPlayer,
    context: AIContext
  ): Promise<AIResponse> {
    const prompt = this.buildPrompt(player, context);
    
    try {
      const response = await this.callTongyi(prompt);
      return this.parseResponse(response, player);
    } catch (error) {
      console.error('Tongyi API error:', error);
      return this.getFallbackAction(player, context);
    }
  }

  private buildPrompt(player: AIPlayer, context: AIContext): string {
    const roleDescription = this.getRoleDescription(player.role);
    const personalityDescription = this.getPersonalityDescription(player.personality);
    const phaseDescription = this.getPhaseDescription(context.currentPhase);
    const situationDescription = this.getSituationDescription(context);
    const availableActions = this.getAvailableActionsDescription(player, context);

    return `
你是一个狼人杀游戏中的AI玩家，扮演${player.name}这个角色。

角色信息：
- 身份：${roleDescription}
- 性格：${personalityDescription}
- 说话风格：${player.speakingStyle}

当前游戏情况：
${situationDescription}

当前阶段：${phaseDescription}

可执行的操作：
${availableActions}

请根据你的角色、性格和当前情况，选择一个最合适的操作，并说明你的理由。

请以JSON格式回复，格式如下：
{
  "action": {
    "type": "vote" | "skill" | "chat",
    "targetId": "玩家ID（可选）",
    "message": "消息内容（如果是聊天）",
    "priority": 1-10的优先级
  },
  "message": "如果需要发言，请提供发言内容",
  "reasoning": "你的决策理由",
  "confidence": 0-1的置信度
}
    `.trim();
  }

  private getRoleDescription(role: RoleType): string {
    const descriptions: Record<RoleType, string> = {
      werewolf: '狼人，每晚可以袭击一名玩家，目标是消灭所有好人',
      villager: '村民，没有特殊技能，通过投票淘汰狼人',
      seer: '预言家，每晚可以查验一名玩家的身份',
      witch: '女巫，拥有一瓶解药和一瓶毒药',
      hunter: '猎人，死亡时可以开枪带走一名玩家',
      guard: '守卫，每晚可以守护一名玩家免受狼人袭击',
      idiot: '白痴，被投票出局时可以翻牌免死',
    };

    return descriptions[role] || '未知角色';
  }

  private getPersonalityDescription(personality: AIPersonality): string {
    const descriptions: Record<AIPersonality, string> = {
      aggressive: '激进，喜欢主动出击，容易怀疑别人',
      calm: '冷静，喜欢理性分析，不轻易下结论',
      analytical: '分析型，注重逻辑推理，喜欢收集证据',
      deceptive: '狡猾，善于隐藏身份，喜欢误导他人',
      cooperative: '合作型，喜欢团队合作，相信队友',
    };

    return descriptions[personality] || '普通';
  }

  private getPhaseDescription(phase: string): string {
    const descriptions: Record<string, string> = {
      waiting: '等待阶段，等待游戏开始',
      night: '夜晚，所有角色闭眼，特殊角色行动',
      day: '白天，所有玩家睁眼，可以自由发言',
      voting: '投票阶段，所有玩家投票淘汰一名玩家',
      finished: '游戏结束',
    };

    return descriptions[phase] || '未知阶段';
  }

  private getSituationDescription(context: AIContext): string {
    let description = `当前第 ${context.currentRound} 轮\n`;
    
    description += `存活玩家：${context.players.filter(p => p.isAlive).map(p => p.name).join('、')}\n`;
    
    if (context.deaths.length > 0) {
      description += `死亡玩家：${context.deaths.map(d => d.playerName).join('、')}\n`;
    }
    
    if (context.votes.length > 0) {
      description += `最近的投票：${context.votes.slice(-3).map(v => `${v.voterId} 投票给 ${v.targetId}`).join('、')}\n`;
    }
    
    if (context.messages.length > 0) {
      description += `最近的发言：\n${context.messages.slice(-5).map(m => `${m.playerName}: ${m.message}`).join('\n')}\n`;
    }

    return description;
  }

  private getAvailableActionsDescription(player: AIPlayer, context: AIContext): string {
    const actions: string[] = [];
    
    switch (context.currentPhase) {
      case 'night':
        if (player.role === 'werewolf') {
          actions.push('选择一名玩家进行袭击');
        }
        if (player.role === 'seer') {
          actions.push('选择一名玩家进行查验');
        }
        if (player.role === 'witch') {
          actions.push('使用解药救人');
          actions.push('使用毒药毒人');
        }
        if (player.role === 'guard') {
          actions.push('选择一名玩家进行守护');
        }
        break;
        
      case 'voting':
        if (player.isAlive) {
          actions.push('选择一名玩家进行投票');
          actions.push('选择弃票');
        }
        break;
        
      case 'day':
        if (player.isAlive) {
          actions.push('发表观点和看法');
        }
        break;
    }
    
    return actions.length > 0 ? actions.join('\n- ') : '暂无可执行操作';
  }

  private async callTongyi(prompt: string): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一个专业的狼人杀游戏AI玩家，需要根据游戏情况做出合理的决策。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        parameters: {
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          result_format: {
            type: 'message',
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Tongyi API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.output.choices[0].message.content;
  }

  private parseResponse(response: string, player: AIPlayer): AIResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        action: parsed.action || {
          type: 'chat',
          message: '我需要更多信息',
          priority: 1,
          timestamp: Date.now(),
        },
        message: parsed.message,
        reasoning: parsed.reasoning,
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error('Failed to parse Tongyi response:', error);
      return this.getFallbackAction(player, { currentPhase: 'day', currentRound: 1, players: [], votes: [], nightActions: [], messages: [], deaths: [] });
    }
  }

  private getFallbackAction(player: AIPlayer, context: AIContext): AIResponse {
    const messages = [
      '我需要更多信息来做出决策',
      '让我仔细思考一下',
      '这个情况有点复杂',
      '我需要更多时间分析',
    ];

    return {
      action: {
        type: 'chat',
        message: messages[Math.floor(Math.random() * messages.length)],
        priority: 1,
        timestamp: Date.now(),
      },
      message: messages[Math.floor(Math.random() * messages.length)],
      reasoning: '使用备用策略',
      confidence: 0.3,
    };
  }

  async generateChatMessage(
    player: AIPlayer,
    context: AIContext,
    topic?: string
  ): Promise<string> {
    const prompt = topic 
      ? `你是一个狼人杀游戏中的AI玩家${player.name}，性格是${player.personality}。请就"${topic}"这个话题发表你的看法。`
      : `你是一个狼人杀游戏中的AI玩家${player.name}，性格是${player.personality}。请根据当前游戏情况发表你的看法。`;

    try {
      const response = await this.callTongyi(prompt);
      return response;
    } catch (error) {
      console.error('Tongyi chat error:', error);
      return this.getFallbackChatMessage(player);
    }
  }

  private getFallbackChatMessage(player: AIPlayer): string {
    const messages = {
      aggressive: ['我觉得我们应该直接行动', '不要犹豫，快点投票', '我敢肯定他是狼人'],
      calm: ['让我们冷静分析一下', '不要急躁，慢慢来', '我们需要更多证据'],
      analytical: ['根据目前的投票情况', '从逻辑上分析', '这个行为模式很可疑'],
      deceptive: ['我觉得我们应该相信他', '这个玩家看起来很可信', '我同意大家的看法'],
      cooperative: ['我们应该一起合作', '相信队友，共同前进', '我们需要互相支持'],
    };

    const personalityMessages = messages[player.personality] || messages.calm;
    return personalityMessages[Math.floor(Math.random() * personalityMessages.length)];
  }

  updateConfig(config: Partial<TongyiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): TongyiConfig {
    return { ...this.config };
  }
}
