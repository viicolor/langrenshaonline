export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  error?: Error;
}

export interface LoggerOptions {
  level?: LogLevel;
  context?: string;
  enableConsole?: boolean;
  enableStorage?: boolean;
  maxStorageEntries?: number;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private options: Required<LoggerOptions> = {
    level: LogLevel.INFO,
    context: 'App',
    enableConsole: true,
    enableStorage: true,
    maxStorageEntries: 1000,
  };

  private constructor(options?: LoggerOptions) {
    this.options = { ...this.options, ...options };
    this.loadLogsFromStorage();
  }

  static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  private loadLogsFromStorage(): void {
    if (!this.options.enableStorage) return;

    try {
      const stored = localStorage.getItem('app_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
        this.trimLogs();
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
    }
  }

  private saveLogsToStorage(): void {
    if (!this.options.enableStorage) return;

    try {
      localStorage.setItem('app_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  private trimLogs(): void {
    if (this.logs.length > this.options.maxStorageEntries) {
      this.logs = this.logs.slice(-this.options.maxStorageEntries);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.options.level;
  }

  private addLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      ...entry,
    };

    this.logs.push(logEntry);
    this.trimLogs();

    if (this.options.enableConsole) {
      this.logToConsole(logEntry);
    }

    if (this.options.enableStorage) {
      this.saveLogsToStorage();
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const context = entry.context || this.options.context;
    const prefix = `[${timestamp}] [${context}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, entry.message, entry.error, entry.data);
        break;
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    this.addLog({
      level: LogLevel.DEBUG,
      message,
      data,
      context: context || this.options.context,
    });
  }

  info(message: string, data?: unknown, context?: string): void {
    this.addLog({
      level: LogLevel.INFO,
      message,
      data,
      context: context || this.options.context,
    });
  }

  warn(message: string, data?: unknown, context?: string): void {
    this.addLog({
      level: LogLevel.WARN,
      message,
      data,
      context: context || this.options.context,
    });
  }

  error(message: string, error?: Error, data?: unknown, context?: string): void {
    this.addLog({
      level: LogLevel.ERROR,
      message,
      error,
      data,
      context: context || this.options.context,
    });
  }

  fatal(message: string, error?: Error, data?: unknown, context?: string): void {
    this.addLog({
      level: LogLevel.FATAL,
      message,
      error,
      data,
      context: context || this.options.context,
    });
  }

  getLogs(level?: LogLevel, context?: string): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    if (context !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.context === context);
    }

    return filteredLogs;
  }

  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  getLogsByTimeRange(startTime: number, endTime: number): LogEntry[] {
    return this.logs.filter(
      log => log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  clearLogs(): void {
    this.logs = [];
    this.saveLogsToStorage();
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else if (format === 'csv') {
      const headers = 'timestamp,level,message,context,error';
      const rows = this.logs.map(log => 
        `${log.timestamp},${LogLevel[log.level]},${log.message},${log.context || ''},${log.error?.message || ''}`
      );
      return [headers, ...rows].join('\n');
    }
    return '';
  }

  downloadLogs(filename?: string): void {
    const content = this.exportLogs('json');
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `logs_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  setContext(context: string): void {
    this.options.context = context;
  }

  setEnableConsole(enabled: boolean): void {
    this.options.enableConsole = enabled;
  }

  setEnableStorage(enabled: boolean): void {
    this.options.enableStorage = enabled;
  }
}

export const logger = Logger.getInstance();

export function createLogger(context: string): Logger {
  return Logger.getInstance({ context });
}
