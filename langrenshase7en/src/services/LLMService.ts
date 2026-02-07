import { AIPlayer, AIContext, AIResponse, RoleType, AIPersonality } from '@/types/ai';
import { OpenAIService } from './OpenAIService';
import { TongyiService } from './TongyiService';

export interface LLMConfig {
  provider: 'openai' | 'qwen' | 'mcp';
  apiKey: string;
  model?: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
}

export class LLMService {
  private services: Map<string, OpenAIService | TongyiService> = new Map();
  private defaultConfig: LLMConfig | null = null;

  constructor() {
    // 初始化服务实例
  }

  setDefaultConfig(config: LLMConfig): void {
    this.defaultConfig = config;
    this.getOrCreateService(config);
  }

  getDefaultConfig(): LLMConfig | null {
    return this.defaultConfig;
  }

  private getOrCreateService(config: LLMConfig): OpenAIService | TongyiService {
    const key = `${config.provider}-${config.model || 'default'}`;
    
    if (!this.services.has(key)) {
      let service;
      
      switch (config.provider) {
        case 'openai':
          service = new OpenAIService({
            apiKey: config.apiKey,
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
          });
          break;
        case 'qwen':
          service = new TongyiService({
            apiKey: config.apiKey,
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
          });
          break;
        case 'mcp':
          // 暂时使用OpenAI服务作为MCP的替代品
          service = new OpenAIService({
            apiKey: config.apiKey,
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
          });
          break;
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
      
      this.services.set(key, service);
    }
    
    return this.services.get(key)!;
  }

  async generateAIAction(
    player: AIPlayer,
    context: AIContext,
    config?: LLMConfig
  ): Promise<AIResponse> {
    const serviceConfig = config || this.defaultConfig;
    
    if (!serviceConfig) {
      throw new Error('No LLM config provided');
    }
    
    const service = this.getOrCreateService(serviceConfig);
    
    // 重试机制
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`LLMService generateAIAction attempt ${attempt}/${maxRetries}`);
        return await service.generateAIAction(player, context);
      } catch (error) {
        console.error(`LLMService generateAIAction error (attempt ${attempt}):`, error);
        lastError = error as Error;
        
        // 指数退避重试
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('LLMService generateAIAction failed after all attempts:', lastError);
    return this.getFallbackAction(player, context);
  }

  async generateChatMessage(
    player: AIPlayer,
    context: AIContext,
    topic?: string,
    config?: LLMConfig
  ): Promise<string> {
    const serviceConfig = config || this.defaultConfig;
    
    if (!serviceConfig) {
      throw new Error('No LLM config provided');
    }
    
    const service = this.getOrCreateService(serviceConfig);
    
    // 重试机制
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`LLMService generateChatMessage attempt ${attempt}/${maxRetries}`);
        return await service.generateChatMessage(player, context, topic);
      } catch (error) {
        console.error(`LLMService generateChatMessage error (attempt ${attempt}):`, error);
        lastError = error as Error;
        
        // 指数退避重试
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('LLMService generateChatMessage failed after all attempts:', lastError);
    return this.getFallbackChatMessage(player);
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

  updateServiceConfig(config: LLMConfig): void {
    const service = this.getOrCreateService(config);
    if (service instanceof OpenAIService) {
      service.updateConfig({
        apiKey: config.apiKey,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });
    } else if (service instanceof TongyiService) {
      // 更新通义千问服务配置
    }
  }

  clearServices(): void {
    this.services.clear();
  }

  getServiceCount(): number {
    return this.services.size;
  }
}

// 导出单例实例
export const llmService = new LLMService();
