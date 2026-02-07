export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: Error) => boolean;
}

export interface RetryResult<T> {
  data: T | null;
  error: Error | null;
  attempts: number;
  success: boolean;
}

export class RetryManager {
  private static defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    shouldRetry: (error: Error) => {
      return (
        error.name === 'NetworkError' ||
        error.name === 'TimeoutError' ||
        error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504')
      );
    },
  };

  static async retry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error | null = null;
    let attempts = 0;
    let delay = opts.initialDelay;

    for (attempts = 1; attempts <= opts.maxAttempts; attempts++) {
      try {
        const data = await fn();
        return {
          data,
          error: null,
          attempts,
          success: true,
        };
      } catch (error) {
        lastError = error as Error;
        
        if (!opts.shouldRetry(lastError) || attempts === opts.maxAttempts) {
          break;
        }

        await this.sleep(delay);
        delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
      }
    }

    return {
      data: null,
      error: lastError,
      attempts,
      success: false,
    };
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    const result = await this.retry(fn, options);
    
    if (!result.success) {
      throw result.error || new Error('Retry failed');
    }

    return result.data as T;
  }
}

export class ErrorHandler {
  private static errorLog: Map<string, Error[]> = new Map();
  private static maxErrorsPerType = 100;

  static handleError(error: Error, context?: string): void {
    console.error(`[ErrorHandler] ${context || 'Unknown'}:`, error);
    
    const errorType = error.name || 'UnknownError';
    const errors = this.errorLog.get(errorType) || [];
    errors.push(error);
    
    if (errors.length > this.maxErrorsPerType) {
      errors.shift();
    }
    
    this.errorLog.set(errorType, errors);
  }

  static getErrorCount(errorType: string): number {
    return this.errorLog.get(errorType)?.length || 0;
  }

  static getRecentErrors(errorType: string, count: number = 10): Error[] {
    const errors = this.errorLog.get(errorType) || [];
    return errors.slice(-count);
  }

  static clearErrors(errorType?: string): void {
    if (errorType) {
      this.errorLog.delete(errorType);
    } else {
      this.errorLog.clear();
    }
  }

  static createError(message: string, code?: string): Error {
    const error = new Error(message);
    error.name = code || 'ApplicationError';
    return error;
  }

  static isNetworkError(error: Error): boolean {
    return (
      error.name === 'NetworkError' ||
      error.message.includes('Network') ||
      error.message.includes('fetch') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT')
    );
  }

  static isTimeoutError(error: Error): boolean {
    return (
      error.name === 'TimeoutError' ||
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT')
    );
  }

  static isAuthError(error: Error): boolean {
    return (
      error.name === 'AuthError' ||
      error.message.includes('401') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('Authentication')
    );
  }

  static isValidationError(error: Error): boolean {
    return (
      error.name === 'ValidationError' ||
      error.message.includes('400') ||
      error.message.includes('Bad Request') ||
      error.message.includes('Validation')
    );
  }

  static isServerError(error: Error): boolean {
    return (
      error.name === 'ServerError' ||
      error.message.includes('500') ||
      error.message.includes('502') ||
      error.message.includes('503') ||
      error.message.includes('504')
    );
  }
}

export class ErrorBoundary {
  private static listeners: Map<string, Set<(error: Error) => void>> = new Map();

  static subscribe(errorType: string, listener: (error: Error) => void): () => void {
    if (!this.listeners.has(errorType)) {
      this.listeners.set(errorType, new Set());
    }
    
    this.listeners.get(errorType)!.add(listener);
    
    return () => {
      this.listeners.get(errorType)?.delete(listener);
    };
  }

  static notify(error: Error, errorType?: string): void {
    const types = errorType ? [errorType] : Array.from(this.listeners.keys());
    
    types.forEach(type => {
      this.listeners.get(type)?.forEach(listener => listener(error));
    });
  }

  static clearListeners(errorType?: string): void {
    if (errorType) {
      this.listeners.delete(errorType);
    } else {
      this.listeners.clear();
    }
  }
}

export function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  return fn().catch((error: Error) => {
    ErrorHandler.handleError(error, context);
    throw error;
  });
}

export function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return RetryManager.retryWithBackoff(fn, options);
}

export function withErrorHandlingAndRetry<T>(
  fn: () => Promise<T>,
  options?: { context?: string; retryOptions?: RetryOptions }
): Promise<T> {
  return withErrorHandling(
    () => withRetry(fn, options?.retryOptions),
    options?.context
  );
}
