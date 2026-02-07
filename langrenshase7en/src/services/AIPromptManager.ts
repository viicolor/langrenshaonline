import { AIPlayer, AIContext, RoleType, AIPersonality } from '@/types/ai';

export class AIPromptManager {
  private rolePrompts: Map<RoleType, string> = new Map();
  private phasePrompts: Map<string, string> = new Map();
  private personalityPrompts: Map<AIPersonality, string> = new Map();

  constructor() {
    this.initializePrompts();
  }

  private initializePrompts(): void {
    // 初始化角色提示
    this.rolePrompts.set('werewolf', `
狼人：
- 胜利条件：消灭所有村民或所有神职
- 技能：每晚可以袭击一名玩家
- 特点：与其他狼人共享视野，知道同伴身份
- 策略：隐藏身份，误导好人，团结狼人
- 注意：不能袭击自己的狼人同伴
    `.trim());

    this.rolePrompts.set('villager', `
村民：
- 胜利条件：消灭所有狼人
- 技能：无特殊技能
- 特点：数量最多，通过发言和投票找出狼人
- 策略：仔细分析发言，寻找狼人漏洞，团结好人
- 注意：不要轻易暴露自己的村民身份
    `.trim());

    this.rolePrompts.set('seer', `
预言家：
- 胜利条件：消灭所有狼人
- 技能：每晚可以查验一名玩家的身份
- 特点：可以知道玩家是狼人还是好人
- 策略：尽早报出查验信息，引导好人投票
- 注意：保护自己，避免被狼人袭击
    `.trim());

    this.rolePrompts.set('witch', `
女巫：
- 胜利条件：消灭所有狼人
- 技能：拥有一瓶解药和一瓶毒药
- 特点：可以救人和杀人
- 策略：合理使用药水，保护神职，毒杀狼人
- 注意：解药不能救自己，毒药不能毒狼人
    `.trim());

    this.rolePrompts.set('hunter', `
猎人：
- 胜利条件：消灭所有狼人
- 技能：死亡时可以开枪带走一名玩家
- 特点：死后有反击能力
- 策略：隐藏身份，在适当的时候暴露
- 注意：被女巫毒死时无法开枪
    `.trim());

    this.rolePrompts.set('guard', `
守卫：
- 胜利条件：消灭所有狼人
- 技能：每晚可以守护一名玩家
- 特点：可以保护玩家免受狼人袭击
- 策略：保护神职，尤其是预言家和女巫
- 注意：不能连续两晚守护同一个人
    `.trim());

    this.rolePrompts.set('idiot', `
白痴：
- 胜利条件：消灭所有狼人
- 技能：被投票出局时可以翻牌免死
- 特点：免死后失去投票权，但可以发言
- 策略：隐藏身份，避免被狼人发现
- 注意：免死后仍然属于好人阵营
    `.trim());

    // 初始化阶段提示
    this.phasePrompts.set('waiting', `
等待阶段：
- 游戏还未开始
- 玩家正在加入房间
- 请耐心等待所有玩家准备
    `.trim());

    this.phasePrompts.set('night', `
夜晚阶段：
- 所有玩家闭眼
- 特殊角色依次行动
- 狼人选择袭击目标
- 预言家查验身份
- 女巫使用药水
- 守卫选择守护目标
- 请根据你的角色执行相应的操作
    `.trim());

    this.phasePrompts.set('day', `
白天阶段：
- 所有玩家睁眼
- 公布夜晚死亡信息
- 玩家依次发言
- 讨论谁是狼人
- 请发表你的观点和推理
    `.trim());

    this.phasePrompts.set('voting', `
投票阶段：
- 所有玩家进行投票
- 得票最多的玩家被淘汰
- 平票时进行PK发言
- 请选择你认为最可疑的玩家
    `.trim());

    this.phasePrompts.set('finished', `
游戏结束阶段：
- 游戏已经结束
- 公布胜负结果
- 总结游戏过程
- 请等待下一局游戏开始
    `.trim());

    // 初始化性格提示
    this.personalityPrompts.set('aggressive', `
性格：激进
- 特点：主动出击，敢于发言，容易怀疑别人
- 发言风格：直接，自信，有攻击性
- 策略：积极带动节奏，引导投票
- 注意：不要过于冲动，避免被狼人利用
    `.trim());

    this.personalityPrompts.set('calm', `
性格：冷静
- 特点：理性分析，稳重发言，不轻易下结论
- 发言风格：平和，客观，有条理
- 策略：仔细观察，分析逻辑，提供合理建议
- 注意：不要过于保守，适当表达观点
    `.trim());

    this.personalityPrompts.set('analytical', `
性格：分析型
- 特点：注重逻辑，善于推理，喜欢收集证据
- 发言风格：详细，严谨，逻辑性强
- 策略：分析发言漏洞，寻找狼人线索
- 注意：不要过于冗长，保持发言简洁
    `.trim());

    this.personalityPrompts.set('deceptive', `
性格：狡猾
- 特点：善于隐藏，误导他人，保护自己
- 发言风格：模糊，委婉，有误导性
- 策略：隐藏真实意图，引导他人错误判断
- 注意：不要过于明显，保持一定的可信度
    `.trim());

    this.personalityPrompts.set('cooperative', `
性格：合作型
- 特点：团结队友，支持他人，注重团队
- 发言风格：友好，支持，鼓励
- 策略：配合神职，相信队友，共同找出狼人
- 注意：不要盲目相信，保持一定的警惕性
    `.trim());
  }

  buildFullPrompt(player: AIPlayer, context: AIContext): string {
    const rolePrompt = this.rolePrompts.get(player.role) || '未知角色';
    const phasePrompt = this.phasePrompts.get(context.currentPhase) || '未知阶段';
    const personalityPrompt = this.personalityPrompts.get(player.personality) || '普通性格';
    const situationPrompt = this.buildSituationPrompt(context);
    const actionPrompt = this.buildActionPrompt(player, context);

    return `
你是一个狼人杀游戏中的AI玩家，扮演${player.name}这个角色。

=== 游戏规则 ===
狼人杀是一款发言推理游戏，玩家分为好人阵营和狼人阵营。
- 好人阵营：消灭所有狼人
- 狼人阵营：消灭所有村民或所有神职

=== 你的角色信息 ===
${rolePrompt}

=== 你的性格特点 ===
${personalityPrompt}

=== 当前游戏情况 ===
${situationPrompt}

=== 当前游戏阶段 ===
${phasePrompt}

=== 可执行的操作 ===
${actionPrompt}

=== 发言要求 ===
- 符合你的角色身份
- 符合你的性格特点
- 基于当前游戏情况
- 有逻辑，有条理
- 不要暴露游戏规则给其他玩家

=== 决策要求 ===
- 考虑胜利条件
- 考虑当前游戏阶段
- 考虑其他玩家的发言
- 考虑游戏历史
- 做出合理的决策

请根据以上信息，生成一个符合你角色和性格的行动。

请以JSON格式回复，包含以下字段：
- action: 你的行动（type, targetId, message, priority）
- message: 你的发言内容（如果需要）
- reasoning: 你的决策理由
- confidence: 你的置信度（0-1）
    `.trim();
  }

  private buildSituationPrompt(context: AIContext): string {
    const alivePlayers = context.players.filter(p => p.isAlive);
    const deadPlayers = context.players.filter(p => !p.isAlive);

    let prompt = `
当前轮次：第${context.currentRound}轮

存活玩家：${alivePlayers.length}人
`;

    if (alivePlayers.length > 0) {
      prompt += `- ${alivePlayers.map(p => p.name).join(', ')}
`;
    }

    if (deadPlayers.length > 0) {
      prompt += `
死亡玩家：${deadPlayers.length}人
`;
      prompt += `- ${deadPlayers.map(p => p.name).join(', ')}
`;
    }

    if (context.votes.length > 0) {
      prompt += `
最近投票：
`;
      context.votes.slice(-3).forEach(vote => {
        const voter = context.players.find(p => p.id === vote.voterId)?.name || '未知';
        const target = context.players.find(p => p.id === vote.targetId)?.name || '未知';
        prompt += `- ${voter} 投票给 ${target}
`;
      });
    }

    if (context.messages.length > 0) {
      prompt += `
最近发言：
`;
      context.messages.slice(-5).forEach(msg => {
        prompt += `- ${msg.playerName}: ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}
`;
      });
    }

    return prompt.trim();
  }

  private buildActionPrompt(player: AIPlayer, context: AIContext): string {
    const actions: string[] = [];

    switch (context.currentPhase) {
      case 'night':
        if (player.role === 'werewolf' && player.isAlive) {
          actions.push('选择一名非狼人玩家进行袭击');
        }
        if (player.role === 'seer' && player.isAlive) {
          actions.push('选择一名玩家进行身份查验');
        }
        if (player.role === 'witch' && player.isAlive) {
          actions.push('使用解药救一名被袭击的玩家');
          actions.push('使用毒药毒杀一名玩家');
        }
        if (player.role === 'guard' && player.isAlive) {
          actions.push('选择一名玩家进行守护');
        }
        break;

      case 'day':
        if (player.isAlive) {
          actions.push('发表观点和推理');
          actions.push('分析其他玩家的发言');
          actions.push('回应其他玩家的质疑');
        }
        break;

      case 'voting':
        if (player.isAlive) {
          actions.push('选择一名玩家进行投票');
          actions.push('选择弃票');
        }
        break;
    }

    if (actions.length === 0) {
      return '暂无可执行操作';
    }

    return actions.map(action => `- ${action}`).join('\n');
  }

  generateChatPrompt(player: AIPlayer, context: AIContext, topic?: string): string {
    const rolePrompt = this.rolePrompts.get(player.role) || '未知角色';
    const personalityPrompt = this.personalityPrompts.get(player.personality) || '普通性格';
    const situationPrompt = this.buildSituationPrompt(context);

    const topicPrompt = topic ? `\n讨论话题：${topic}` : '';

    return `
你是狼人杀游戏中的${player.name}，角色是${player.role}。

${rolePrompt}

${personalityPrompt}

${situationPrompt}
${topicPrompt}

请根据你的角色和性格，发表一段符合当前游戏情况的发言。

发言要求：
- 符合你的角色身份
- 符合你的性格特点
- 基于当前游戏情况
- 有逻辑，有条理
- 自然，口语化
- 长度适中（50-200字）
    `.trim();
  }

  generateSkillPrompt(player: AIPlayer, context: AIContext, skillType: string): string {
    const rolePrompt = this.rolePrompts.get(player.role) || '未知角色';
    const situationPrompt = this.buildSituationPrompt(context);

    let skillPrompt = '';
    
    switch (skillType) {
      case 'wolf_kill':
        skillPrompt = '请选择一名非狼人玩家作为袭击目标，并说明理由。';
        break;
      case 'seer_check':
        skillPrompt = '请选择一名玩家进行身份查验，并说明理由。';
        break;
      case 'witch_save':
        skillPrompt = '请选择是否使用解药，以及要救的目标，并说明理由。';
        break;
      case 'witch_poison':
        skillPrompt = '请选择是否使用毒药，以及要毒的目标，并说明理由。';
        break;
      case 'guard_protect':
        skillPrompt = '请选择一名玩家进行守护，并说明理由。';
        break;
    }

    return `
你是狼人杀游戏中的${player.name}，角色是${player.role}。

${rolePrompt}

${situationPrompt}

${skillPrompt}

请考虑：
- 你的胜利条件
- 其他玩家的身份
- 游戏的当前阶段
- 可能的后果

请以JSON格式回复，包含目标选择和理由。
    `.trim();
  }

  generateVotePrompt(player: AIPlayer, context: AIContext): string {
    const rolePrompt = this.rolePrompts.get(player.role) || '未知角色';
    const situationPrompt = this.buildSituationPrompt(context);

    return `
你是狼人杀游戏中的${player.name}，角色是${player.role}。

${rolePrompt}

${situationPrompt}

请选择一名你认为最可疑的玩家进行投票，并说明理由。

请考虑：
- 该玩家的发言
- 该玩家的行为
- 其他玩家的投票
- 游戏的当前阶段
- 你的胜利条件

请以JSON格式回复，包含投票目标和理由。
    `.trim();
  }
}

// 导出单例实例
export const aiPromptManager = new AIPromptManager();
