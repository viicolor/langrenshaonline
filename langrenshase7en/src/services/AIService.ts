import { AIPlayer, AIProvider, AIPersonality, AIContext, AIAction, AIMemory, AIResponse, AIPromptTemplate, RoleType } from '@/types/ai';
import { Player } from '@/types/game';

export class AIService {
  private aiPlayers: Map<string, AIPlayer> = new Map();
  private actionQueue: Map<string, AIAction[]> = new Map();
  private processingActions = new Set<string>();

  createAIPlayer(config: {
    id: string;
    name: string;
    role: RoleType;
    personality: AIPersonality;
    provider: AIProvider;
  }): AIPlayer {
    const personalityTraits = this.getPersonalityTraits(config.personality);
    
    const aiPlayer: AIPlayer = {
      id: config.id,
      name: config.name,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${config.name}`,
      seatNumber: 0,
      isReady: false,
      isHost: false,
      role: config.role,
      isAlive: true,
      isSpectator: false,
      personality: config.personality,
      provider: config.provider,
      isAI: true,
      aggressiveness: personalityTraits.aggressiveness,
      deceptionLevel: personalityTraits.deceptionLevel,
      cooperationLevel: personalityTraits.cooperationLevel,
      speakingStyle: personalityTraits.speakingStyle,
      memory: [],
      lastActionTime: 0,
      actionCooldown: 3000,
    };

    this.aiPlayers.set(config.id, aiPlayer);
    this.actionQueue.set(config.id, []);
    
    return aiPlayer;
  }

  private getPersonalityTraits(personality: AIPersonality): {
    aggressiveness: number;
    deceptionLevel: number;
    cooperationLevel: number;
    speakingStyle: 'aggressive' | 'calm' | 'analytical';
  } {
    const traits = {
      aggressive: {
        aggressiveness: 0.8,
        deceptionLevel: 0.6,
        cooperationLevel: 0.3,
        speakingStyle: 'aggressive' as const,
      },
      calm: {
        aggressiveness: 0.3,
        deceptionLevel: 0.4,
        cooperationLevel: 0.8,
        speakingStyle: 'calm' as const,
      },
      analytical: {
        aggressiveness: 0.4,
        deceptionLevel: 0.5,
        cooperationLevel: 0.6,
        speakingStyle: 'analytical' as const,
      },
      deceptive: {
        aggressiveness: 0.6,
        deceptionLevel: 0.9,
        cooperationLevel: 0.4,
        speakingStyle: 'analytical' as const,
      },
      cooperative: {
        aggressiveness: 0.2,
        deceptionLevel: 0.3,
        cooperationLevel: 0.9,
        speakingStyle: 'calm' as const,
      },
    };

    return traits[personality];
  }

  getAIPlayer(playerId: string): AIPlayer | undefined {
    return this.aiPlayers.get(playerId);
  }

  getAllAIPlayers(): AIPlayer[] {
    return Array.from(this.aiPlayers.values());
  }

  updateMemory(playerId: string, memory: AIMemory): void {
    const player = this.aiPlayers.get(playerId);
    if (!player) return;

    player.memory.push(memory);
    if (player.memory.length > 50) {
      player.memory = player.memory.slice(-50);
    }
  }

  async decideAction(playerId: string, context: AIContext): Promise<AIAction> {
    const player = this.aiPlayers.get(playerId);
    if (!player) {
      throw new Error(`AI player ${playerId} not found`);
    }

    const now = Date.now();
    if (now - player.lastActionTime < player.actionCooldown) {
      throw new Error('Action cooldown not ready');
    }

    if (this.processingActions.has(playerId)) {
      throw new Error('Already processing action');
    }

    this.processingActions.add(playerId);

    try {
      const action = await this.generateAction(player, context);
      
      player.lastActionTime = now;
      this.updateMemory(playerId, {
        type: action.type === 'vote' ? 'vote' : action.type === 'skill' ? 'skill' : 'chat',
        timestamp: now,
        data: action,
      });

      return action;
    } finally {
      this.processingActions.delete(playerId);
    }
  }

  private async generateAction(player: AIPlayer, context: AIContext): Promise<AIAction> {
    const availableActions = this.getAvailableActions(player, context);
    
    if (availableActions.length === 0) {
      return {
        type: 'chat',
        message: '我暂时没有可执行的操作',
        priority: 1,
        timestamp: Date.now(),
      };
    }

    const bestAction = this.selectBestAction(player, availableActions, context);
    return bestAction;
  }

  private getAvailableActions(player: AIPlayer, context: AIContext): AIAction[] {
    const actions: AIAction[] = [];
    const now = Date.now();

    switch (context.currentPhase) {
      case 'night':
        if (player.role === 'werewolf' && player.isAlive) {
          const targets = context.players.filter(p => 
            p.id !== player.id && 
            p.isAlive && 
            p.role !== 'werewolf'
          );
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            actions.push({
              type: 'skill',
              targetId: target.id,
              priority: 10,
              timestamp: now,
            });
          }
        }
        if (player.role === 'seer' && player.isAlive) {
          const targets = context.players.filter(p => 
            p.id !== player.id && 
            p.isAlive
          );
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            actions.push({
              type: 'skill',
              targetId: target.id,
              priority: 8,
              timestamp: now,
            });
          }
        }
        if (player.role === 'witch' && player.isAlive) {
          const targets = context.players.filter(p => 
            p.id !== player.id && 
            p.isAlive
          );
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            actions.push({
              type: 'skill',
              targetId: target.id,
              priority: 7,
              timestamp: now,
            });
          }
        }
        if (player.role === 'guard' && player.isAlive) {
          const targets = context.players.filter(p => 
            p.id !== player.id && 
            p.isAlive
          );
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            actions.push({
              type: 'skill',
              targetId: target.id,
              priority: 6,
              timestamp: now,
            });
          }
        }
        break;

      case 'voting':
        if (player.isAlive) {
          const targets = context.players.filter(p => 
            p.id !== player.id && 
            p.isAlive
          );
          if (targets.length > 0) {
            const target = this.selectVoteTarget(player, targets, context);
            actions.push({
              type: 'vote',
              targetId: target.id,
              priority: 9,
              timestamp: now,
            });
          }
        }
        break;

      case 'day':
        if (player.isAlive) {
          actions.push({
            type: 'chat',
            message: this.generateChatMessage(player, context),
            priority: 5,
            timestamp: now,
          });
        }
        break;
    }

    return actions;
  }

  private selectVoteTarget(player: AIPlayer, targets: Player[], context: AIContext): Player {
    if (player.role === 'werewolf') {
      const goodPlayers = targets.filter(p => 
        p.role !== 'werewolf'
      );
      if (goodPlayers.length > 0) {
        return goodPlayers[Math.floor(Math.random() * goodPlayers.length)];
      }
    } else {
      const suspiciousPlayers = this.analyzeSuspiciousPlayers(player, context);
      if (suspiciousPlayers.length > 0) {
        return suspiciousPlayers[Math.floor(Math.random() * suspiciousPlayers.length)];
      }
    }
    
    return targets[Math.floor(Math.random() * targets.length)];
  }

  private analyzeSuspiciousPlayers(player: AIPlayer, context: AIContext): Player[] {
    const suspiciousScores = new Map<string, number>();
    
    context.votes.forEach(vote => {
      const score = suspiciousScores.get(vote.voterId) || 0;
      suspiciousScores.set(vote.voterId, score + 1);
    });

    const sortedPlayers = Array.from(suspiciousScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([playerId]) => context.players.find(p => p.id === playerId))
      .filter((p): p is Player => p !== undefined);

    return sortedPlayers;
  }

  private selectBestAction(player: AIPlayer, actions: AIAction[], context: AIContext): AIAction {
    const weightedActions = actions.map(action => {
      let weight = action.priority;
      
      if (action.type === 'vote' && player.personality === 'aggressive') {
        weight *= 1.5;
      }
      
      if (action.type === 'skill' && player.personality === 'analytical') {
        weight *= 1.3;
      }
      
      if (action.type === 'chat' && player.personality === 'calm') {
        weight *= 1.4;
      }

      return { action, weight };
    });

    const totalWeight = weightedActions.reduce((sum, { weight }) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { action, weight } of weightedActions) {
      random -= weight;
      if (random <= 0) {
        return action;
      }
    }

    return weightedActions[0].action;
  }

  private generateChatMessage(player: AIPlayer, context: AIContext): string {
    const messages = [
      '我觉得我们应该仔细分析一下',
      '这个情况有点复杂',
      '我需要更多信息',
      '大家有什么想法吗',
      '我觉得这个玩家有点可疑',
      '我们需要团结起来',
      '让我想想...',
      '这个投票结果很有意思',
      '我觉得我们应该谨慎一点',
    ];

    const personalityMessages: Record<AIPersonality, string[]> = {
      aggressive: [
        '我觉得我们应该直接行动',
        '不要犹豫，快点投票',
        '我敢肯定他是狼人',
        '我们必须现在就行动',
      ],
      calm: [
        '让我们冷静分析一下',
        '不要急躁，慢慢来',
        '我们需要更多证据',
        '大家保持冷静',
      ],
      analytical: [
        '根据目前的投票情况',
        '从逻辑上分析',
        '这个行为模式很可疑',
        '我们需要理性思考',
      ],
      deceptive: [
        '我觉得我们应该相信他',
        '这个玩家看起来很可信',
        '我同意大家的看法',
        '我们应该团结一致',
      ],
      cooperative: [
        '我们应该一起合作',
        '相信队友，共同前进',
        '我们需要互相支持',
        '让我们一起找出狼人',
      ],
    };

    const personalitySpecificMessages = personalityMessages[player.personality];
    const allMessages = [...messages, ...personalitySpecificMessages];
    
    return allMessages[Math.floor(Math.random() * allMessages.length)];
  }

  removeAIPlayer(playerId: string): void {
    this.aiPlayers.delete(playerId);
    this.actionQueue.delete(playerId);
    this.processingActions.delete(playerId);
  }

  clearAllAIPlayers(): void {
    this.aiPlayers.clear();
    this.actionQueue.clear();
    this.processingActions.clear();
  }

  getAIPlayerCount(): number {
    return this.aiPlayers.size;
  }
}
