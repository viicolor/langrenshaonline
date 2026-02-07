import { AIPlayer, AIContext, AIAction, RoleType, AIPersonality } from '@/types/ai';
import { Player } from '@/types/game';

export interface AIStrategy {
  name: string;
  description: string;
  priority: number;
  canExecute: (player: AIPlayer, context: AIContext) => boolean;
  execute: (player: AIPlayer, context: AIContext) => AIAction;
}

export class AIStrategyManager {
  private strategies: Map<RoleType, AIStrategy[]> = new Map();

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    this.strategies.set('werewolf', [
      this.createAggressiveWolfStrategy(),
      this.createDeceptiveWolfStrategy(),
      this.createConservativeWolfStrategy(),
    ]);

    this.strategies.set('seer', [
      this.createActiveSeerStrategy(),
      this.createConservativeSeerStrategy(),
    ]);

    this.strategies.set('witch', [
      this.createAggressiveWitchStrategy(),
      this.createSupportiveWitchStrategy(),
    ]);

    this.strategies.set('hunter', [
      this.createAggressiveHunterStrategy(),
      this.createDefensiveHunterStrategy(),
    ]);

    this.strategies.set('guard', [
      this.createProtectiveGuardStrategy(),
      this.createStrategicGuardStrategy(),
    ]);

    this.strategies.set('villager', [
      this.createObservantVillagerStrategy(),
      this.createParticipatingVillagerStrategy(),
    ]);

    this.strategies.set('idiot', [
      this.createCautiousIdiotStrategy(),
      this.createBoldIdiotStrategy(),
    ]);
  }

  getBestStrategy(player: AIPlayer, context: AIContext): AIStrategy | null {
    const roleStrategies = this.strategies.get(player.role) || [];
    
    const availableStrategies = roleStrategies.filter(strategy => 
      strategy.canExecute(player, context)
    );

    if (availableStrategies.length === 0) {
      return null;
    }

    const weightedStrategies = availableStrategies.map(strategy => {
      let weight = strategy.priority;

      if (player.personality === 'aggressive' && strategy.name.includes('激进')) {
        weight *= 1.5;
      }
      if (player.personality === 'calm' && strategy.name.includes('保守')) {
        weight *= 1.5;
      }
      if (player.personality === 'analytical' && strategy.name.includes('分析')) {
        weight *= 1.5;
      }
      if (player.personality === 'deceptive' && strategy.name.includes('狡猾')) {
        weight *= 1.5;
      }
      if (player.personality === 'cooperative' && strategy.name.includes('合作')) {
        weight *= 1.5;
      }

      return { strategy, weight };
    });

    const totalWeight = weightedStrategies.reduce((sum, { weight }) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { strategy, weight } of weightedStrategies) {
      random -= weight;
      if (random <= 0) {
        return strategy;
      }
    }

    return weightedStrategies[0].strategy;
  }

  executeStrategy(player: AIPlayer, context: AIContext): AIAction | null {
    const strategy = this.getBestStrategy(player, context);
    
    if (!strategy) {
      return null;
    }

    return strategy.execute(player, context);
  }

  private createAggressiveWolfStrategy(): AIStrategy {
    return {
      name: '激进狼人策略',
      description: '主动出击，优先袭击神职玩家',
      priority: 8,
      canExecute: (player, context) => {
        return context.currentPhase === 'night' && 
               player.isAlive && 
               player.role === 'werewolf';
      },
      execute: (player, context) => {
        const godPlayers = context.players.filter(p => 
          p.id !== player.id && 
          p.isAlive && 
          ['seer', 'witch', 'hunter', 'guard', 'idiot'].includes(p.role || '')
        );
        
        const target = godPlayers.length > 0 
          ? godPlayers[Math.floor(Math.random() * godPlayers.length)]
          : context.players.filter(p => p.id !== player.id && p.isAlive)[Math.floor(Math.random() * context.players.length)];

        return {
          type: 'skill',
          targetId: target.id,
          priority: 8,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createDeceptiveWolfStrategy(): AIStrategy {
    return {
      name: '狡猾狼人策略',
      description: '隐藏身份，假装好人，误导投票',
      priority: 7,
      canExecute: (player, context) => {
        return context.currentPhase === 'day' && 
               player.isAlive && 
               player.role === 'werewolf';
      },
      execute: (player, context) => {
        const messages = [
          '我觉得我们应该仔细分析一下',
          '这个玩家有点可疑，但还需要更多证据',
          '大家有什么想法吗',
          '我觉得我们应该谨慎一点',
          '这个投票结果很有意思',
        ];

        return {
          type: 'chat',
          message: messages[Math.floor(Math.random() * messages.length)],
          priority: 7,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createConservativeWolfStrategy(): AIStrategy {
    return {
      name: '保守狼人策略',
      description: '跟随大众投票，避免暴露',
      priority: 6,
      canExecute: (player, context) => {
        return context.currentPhase === 'voting' && 
               player.isAlive && 
               player.role === 'werewolf';
      },
      execute: (player, context) => {
        const goodPlayers = context.players.filter(p => 
          p.id !== player.id && 
          p.isAlive && 
          p.role !== 'werewolf'
        );
        
        const target = goodPlayers[Math.floor(Math.random() * goodPlayers.length)];

        return {
          type: 'vote',
          targetId: target.id,
          priority: 6,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createActiveSeerStrategy(): AIStrategy {
    return {
      name: '积极预言家策略',
      description: '每晚查验可疑玩家',
      priority: 9,
      canExecute: (player, context) => {
        return context.currentPhase === 'night' && 
               player.isAlive && 
               player.role === 'seer';
      },
      execute: (player, context) => {
        const targets = context.players.filter(p => 
          p.id !== player.id && 
          p.isAlive
        );
        
        const target = targets[Math.floor(Math.random() * targets.length)];

        return {
          type: 'skill',
          targetId: target.id,
          priority: 9,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createConservativeSeerStrategy(): AIStrategy {
    return {
      name: '保守预言家策略',
      description: '白天谨慎发言，避免暴露',
      priority: 7,
      canExecute: (player, context) => {
        return context.currentPhase === 'day' && 
               player.isAlive && 
               player.role === 'seer';
      },
      execute: (player, context) => {
        const messages = [
          '我需要更多信息',
          '让我想想...',
          '这个情况有点复杂',
        ];

        return {
          type: 'chat',
          message: messages[Math.floor(Math.random() * messages.length)],
          priority: 7,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createAggressiveWitchStrategy(): AIStrategy {
    return {
      name: '激进女巫策略',
      description: '积极使用毒药淘汰可疑玩家',
      priority: 8,
      canExecute: (player, context) => {
        return context.currentPhase === 'night' && 
               player.isAlive && 
               player.role === 'witch';
      },
      execute: (player, context) => {
        const targets = context.players.filter(p => 
          p.id !== player.id && 
          p.isAlive
        );
        
        const target = targets[Math.floor(Math.random() * targets.length)];

        return {
          type: 'skill',
          targetId: target.id,
          priority: 8,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createSupportiveWitchStrategy(): AIStrategy {
    return {
      name: '支持型女巫策略',
      description: '优先使用解药救人',
      priority: 9,
      canExecute: (player, context) => {
        return context.currentPhase === 'night' && 
               player.isAlive && 
               player.role === 'witch';
      },
      execute: (player, context) => {
        const targets = context.players.filter(p => 
          p.id !== player.id && 
          p.isAlive
        );
        
        const target = targets[Math.floor(Math.random() * targets.length)];

        return {
          type: 'skill',
          targetId: target.id,
          priority: 9,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createAggressiveHunterStrategy(): AIStrategy {
    return {
      name: '激进猎人策略',
      description: '积极发言，引导投票',
      priority: 8,
      canExecute: (player, context) => {
        return context.currentPhase === 'day' && 
               player.isAlive && 
               player.role === 'hunter';
      },
      execute: (player, context) => {
        const messages = [
          '我觉得我们应该直接行动',
          '不要犹豫，快点投票',
          '我敢肯定他是狼人',
        ];

        return {
          type: 'chat',
          message: messages[Math.floor(Math.random() * messages.length)],
          priority: 8,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createDefensiveHunterStrategy(): AIStrategy {
    return {
      name: '防御型猎人策略',
      description: '保护自己，避免被投票',
      priority: 7,
      canExecute: (player, context) => {
        return context.currentPhase === 'voting' && 
               player.isAlive && 
               player.role === 'hunter';
      },
      execute: (player, context) => {
        const targets = context.players.filter(p => 
          p.id !== player.id && 
          p.isAlive
        );
        
        const target = targets[Math.floor(Math.random() * targets.length)];

        return {
          type: 'vote',
          targetId: target.id,
          priority: 7,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createProtectiveGuardStrategy(): AIStrategy {
    return {
      name: '保护型守卫策略',
      description: '守护神职玩家',
      priority: 9,
      canExecute: (player, context) => {
        return context.currentPhase === 'night' && 
               player.isAlive && 
               player.role === 'guard';
      },
      execute: (player, context) => {
        const godPlayers = context.players.filter(p => 
          p.id !== player.id && 
          p.isAlive && 
          ['seer', 'witch', 'hunter', 'idiot'].includes(p.role || '')
        );
        
        const target = godPlayers.length > 0 
          ? godPlayers[Math.floor(Math.random() * godPlayers.length)]
          : context.players.filter(p => p.id !== player.id && p.isAlive)[Math.floor(Math.random() * context.players.length)];

        return {
          type: 'skill',
          targetId: target.id,
          priority: 9,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createStrategicGuardStrategy(): AIStrategy {
    return {
      name: '策略型守卫策略',
      description: '根据情况选择守护目标',
      priority: 8,
      canExecute: (player, context) => {
        return context.currentPhase === 'night' && 
               player.isAlive && 
               player.role === 'guard';
      },
      execute: (player, context) => {
        const targets = context.players.filter(p => 
          p.id !== player.id && 
          p.isAlive
        );
        
        const target = targets[Math.floor(Math.random() * targets.length)];

        return {
          type: 'skill',
          targetId: target.id,
          priority: 8,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createObservantVillagerStrategy(): AIStrategy {
    return {
      name: '观察型村民策略',
      description: '观察他人发言，谨慎投票',
      priority: 7,
      canExecute: (player, context) => {
        return context.currentPhase === 'voting' && 
               player.isAlive && 
               player.role === 'villager';
      },
      execute: (player, context) => {
        const targets = context.players.filter(p => 
          p.id !== player.id && 
          p.isAlive
        );
        
        const target = targets[Math.floor(Math.random() * targets.length)];

        return {
          type: 'vote',
          targetId: target.id,
          priority: 7,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createParticipatingVillagerStrategy(): AIStrategy {
    return {
      name: '参与型村民策略',
      description: '积极发言，参与讨论',
      priority: 6,
      canExecute: (player, context) => {
        return context.currentPhase === 'day' && 
               player.isAlive && 
               player.role === 'villager';
      },
      execute: (player, context) => {
        const messages = [
          '我觉得我们应该仔细分析一下',
          '这个情况有点复杂',
          '我需要更多信息',
          '大家有什么想法吗',
        ];

        return {
          type: 'chat',
          message: messages[Math.floor(Math.random() * messages.length)],
          priority: 6,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createCautiousIdiotStrategy(): AIStrategy {
    return {
      name: '谨慎白痴策略',
      description: '避免被投票，谨慎发言',
      priority: 7,
      canExecute: (player, context) => {
        return context.currentPhase === 'day' && 
               player.isAlive && 
               player.role === 'idiot';
      },
      execute: (player, context) => {
        const messages = [
          '让我们冷静分析一下',
          '不要急躁，慢慢来',
          '我们需要更多证据',
        ];

        return {
          type: 'chat',
          message: messages[Math.floor(Math.random() * messages.length)],
          priority: 7,
          timestamp: Date.now(),
        };
      },
    };
  }

  private createBoldIdiotStrategy(): AIStrategy {
    return {
      name: '大胆白痴策略',
      description: '积极发言，引导讨论',
      priority: 8,
      canExecute: (player, context) => {
        return context.currentPhase === 'voting' && 
               player.isAlive && 
               player.role === 'idiot';
      },
      execute: (player, context) => {
        const targets = context.players.filter(p => 
          p.id !== player.id && 
          p.isAlive
        );
        
        const target = targets[Math.floor(Math.random() * targets.length)];

        return {
          type: 'vote',
          targetId: target.id,
          priority: 8,
          timestamp: Date.now(),
        };
      },
    };
  }

  getAllStrategies(): Map<RoleType, AIStrategy[]> {
    return new Map(this.strategies);
  }

  getStrategiesForRole(role: RoleType): AIStrategy[] {
    return this.strategies.get(role) || [];
  }
}
