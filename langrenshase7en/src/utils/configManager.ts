export interface AppConfig {
  api: {
    openai: {
      apiKey: string;
      model: string;
      temperature: number;
      maxTokens: number;
    };
    tongyi: {
      apiKey: string;
      model: string;
      temperature: number;
      maxTokens: number;
    };
  };
  game: {
    maxPlayers: number;
    minPlayers: number;
    defaultBoardId: string;
    phaseDurations: {
      night: number;
      day: number;
      voting: number;
    };
  };
  ai: {
    enabled: boolean;
    provider: 'openai' | 'tongyi' | 'rule_based';
    defaultPersonality: 'aggressive' | 'calm' | 'analytical' | 'deceptive' | 'cooperative';
    actionCooldown: number;
  };
  performance: {
    enableVirtualScroll: boolean;
    enableLazyLoad: boolean;
    batchSize: number;
    maxCacheSize: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    enableConsole: boolean;
    enableStorage: boolean;
    maxStorageEntries: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: 'zh-CN' | 'en-US';
    animations: boolean;
    soundEffects: boolean;
  };
}

export const defaultConfig: AppConfig = {
  api: {
    openai: {
      apiKey: '',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    },
    tongyi: {
      apiKey: '',
      model: 'qwen-turbo',
      temperature: 0.7,
      maxTokens: 1000,
    },
  },
  game: {
    maxPlayers: 12,
    minPlayers: 6,
    defaultBoardId: 'standard',
    phaseDurations: {
      night: 60,
      day: 120,
      voting: 30,
    },
  },
  ai: {
    enabled: true,
    provider: 'rule_based',
    defaultPersonality: 'calm',
    actionCooldown: 3000,
  },
  performance: {
    enableVirtualScroll: true,
    enableLazyLoad: true,
    batchSize: 20,
    maxCacheSize: 100,
  },
  logging: {
    level: 'info',
    enableConsole: true,
    enableStorage: true,
    maxStorageEntries: 1000,
  },
  ui: {
    theme: 'auto',
    language: 'zh-CN',
    animations: true,
    soundEffects: true,
  },
};

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private storageKey = 'app_config';
  private listeners: Set<(config: AppConfig) => void> = new Set();

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return this.mergeConfig(defaultConfig, parsed);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
    return { ...defaultConfig };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  private mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
    return {
      api: { ...base.api, ...override.api },
      game: { ...base.game, ...override.game },
      ai: { ...base.ai, ...override.ai },
      performance: { ...base.performance, ...override.performance },
      logging: { ...base.logging, ...override.logging },
      ui: { ...base.ui, ...override.ui },
    };
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.saveConfig();
  }

  resetConfig(): void {
    this.config = { ...defaultConfig };
    this.saveConfig();
  }

  getOpenAIConfig(): AppConfig['api']['openai'] {
    return { ...this.config.api.openai };
  }

  updateOpenAIConfig(config: Partial<AppConfig['api']['openai']>): void {
    this.config.api.openai = { ...this.config.api.openai, ...config };
    this.saveConfig();
  }

  getTongyiConfig(): AppConfig['api']['tongyi'] {
    return { ...this.config.api.tongyi };
  }

  updateTongyiConfig(config: Partial<AppConfig['api']['tongyi']>): void {
    this.config.api.tongyi = { ...this.config.api.tongyi, ...config };
    this.saveConfig();
  }

  getGameConfig(): AppConfig['game'] {
    return { ...this.config.game };
  }

  updateGameConfig(config: Partial<AppConfig['game']>): void {
    this.config.game = { ...this.config.game, ...config };
    this.saveConfig();
  }

  getAIConfig(): AppConfig['ai'] {
    return { ...this.config.ai };
  }

  updateAIConfig(config: Partial<AppConfig['ai']>): void {
    this.config.ai = { ...this.config.ai, ...config };
    this.saveConfig();
  }

  getPerformanceConfig(): AppConfig['performance'] {
    return { ...this.config.performance };
  }

  updatePerformanceConfig(config: Partial<AppConfig['performance']>): void {
    this.config.performance = { ...this.config.performance, ...config };
    this.saveConfig();
  }

  getLoggingConfig(): AppConfig['logging'] {
    return { ...this.config.logging };
  }

  updateLoggingConfig(config: Partial<AppConfig['logging']>): void {
    this.config.logging = { ...this.config.logging, ...config };
    this.saveConfig();
  }

  getUIConfig(): AppConfig['ui'] {
    return { ...this.config.ui };
  }

  updateUIConfig(config: Partial<AppConfig['ui']>): void {
    this.config.ui = { ...this.config.ui, ...config };
    this.saveConfig();
  }

  subscribe(listener: (config: AppConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      this.config = this.mergeConfig(defaultConfig, imported);
      this.saveConfig();
      return true;
    } catch (error) {
      console.error('Failed to import config:', error);
      return false;
    }
  }

  downloadConfig(): void {
    const content = this.exportConfig();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.game.maxPlayers < this.config.game.minPlayers) {
      errors.push('maxPlayers must be greater than or equal to minPlayers');
    }

    if (this.config.game.minPlayers < 2) {
      errors.push('minPlayers must be at least 2');
    }

    if (this.config.game.maxPlayers > 20) {
      errors.push('maxPlayers cannot exceed 20');
    }

    if (this.config.ai.actionCooldown < 1000) {
      errors.push('actionCooldown must be at least 1000ms');
    }

    if (this.config.performance.batchSize < 1) {
      errors.push('batchSize must be at least 1');
    }

    if (this.config.performance.maxCacheSize < 10) {
      errors.push('maxCacheSize must be at least 10');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const configManager = ConfigManager.getInstance();
