// Sistema Avanzato di Debug

// Tipi per il sistema di debug
export interface DebugConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  persistLogs: boolean;
  maxLogEntries: number;
  showStackTrace: boolean;
  enablePerformanceMonitoring: boolean;
}

export interface DebugEntry {
  id: string;
  timestamp: Date;
  level: string;
  message: string;
  data?: unknown;
  stackTrace?: string;
  component?: string;
  userId?: string;
  sessionId: string;
}

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

class AdvancedDebugSystem {
  private config: DebugConfig;
  private logs: DebugEntry[] = [];
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private sessionId: string;
  private errorCallbacks: ((error: Error, context?: unknown) => void)[] = [];

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      level: 'debug',
      persistLogs: true,
      maxLogEntries: 1000,
      showStackTrace: true,
      enablePerformanceMonitoring: true,
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
    this.loadPersistedLogs();
  }

  // Configurazione del sistema
  configure(newConfig: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Logging avanzato
  log(level: string, message: string, data?: unknown, component?: string): void {
    if (!this.config.enabled || !this.shouldLog(level)) return;

    const entry: DebugEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      message,
      data,
      component,
      sessionId: this.sessionId,
      stackTrace: this.config.showStackTrace ? this.getStackTrace() : undefined
    };

    this.addLogEntry(entry);
    this.outputToConsole(entry);
    
    if (this.config.persistLogs) {
      this.persistLog(entry);
    }
  }

  // Metodi di logging specifici
  error(message: string, error?: Error, component?: string): void {
    const data = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined;
    
    this.log('error', message, data, component);
    
    if (error) {
      this.notifyErrorCallbacks(error, { message, component });
    }
  }

  warn(message: string, data?: unknown, component?: string): void {
    this.log('warn', message, data, component);
  }

  info(message: string, data?: unknown, component?: string): void {
    this.log('info', message, data, component);
  }

  debug(message: string, data?: unknown, component?: string): void {
    this.log('debug', message, data, component);
  }

  trace(message: string, data?: unknown, component?: string): void {
    this.log('trace', message, data, component);
  }

  // Monitoraggio delle performance
  startPerformanceTimer(name: string, metadata?: Record<string, unknown>): void {
    if (!this.config.enablePerformanceMonitoring) return;

    this.performanceMetrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  endPerformanceTimer(name: string): number | null {
    if (!this.config.enablePerformanceMonitoring) return null;

    const metric = this.performanceMetrics.get(name);
    if (!metric) {
      this.warn(`Performance timer '${name}' not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    this.info(`Performance: ${name}`, {
      duration: `${duration.toFixed(2)}ms`,
      metadata: metric.metadata
    });

    this.performanceMetrics.delete(name);
    return duration;
  }

  // Wrapper per funzioni con monitoraggio automatico
  measurePerformance<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
    this.startPerformanceTimer(name, metadata);
    try {
      const result = fn();
      this.endPerformanceTimer(name);
      return result;
    } catch (error) {
      this.endPerformanceTimer(name);
      this.error(`Error in ${name}`, error as Error);
      throw error;
    }
  }

  // Wrapper per funzioni async con monitoraggio
  async measurePerformanceAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.startPerformanceTimer(name, metadata);
    try {
      const result = await fn();
      this.endPerformanceTimer(name);
      return result;
    } catch (error) {
      this.endPerformanceTimer(name);
      this.error(`Error in ${name}`, error as Error);
      throw error;
    }
  }

  // Gestione degli errori
  onError(callback: (error: Error, context?: unknown) => void): void {
    this.errorCallbacks.push(callback);
  }

  // Analisi dei log
  getLogs(filter?: {
    level?: string;
    component?: string;
    startTime?: Date;
    endTime?: Date;
  }): DebugEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }
      if (filter.component) {
        filteredLogs = filteredLogs.filter(log => log.component === filter.component);
      }
      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!);
      }
    }

    return filteredLogs;
  }

  // Statistiche dei log
  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byComponent: Record<string, number>;
    errorRate: number;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
      errorRate: 0
    };

    this.logs.forEach(log => {
      // Conteggio per livello
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Conteggio per componente
      if (log.component) {
        stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
      }
    });

    // Calcolo error rate
    const errorCount = stats.byLevel['error'] || 0;
    stats.errorRate = stats.total > 0 ? (errorCount / stats.total) * 100 : 0;

    return stats;
  }

  // Esportazione dei log
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['ID', 'Timestamp', 'Level', 'Message', 'Component', 'Data'];
      const rows = this.logs.map(log => [
        log.id,
        log.timestamp.toISOString(),
        log.level,
        log.message,
        log.component || '',
        JSON.stringify(log.data || {})
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(this.logs, null, 2);
  }

  // Pulizia dei log
  clearLogs(): void {
    this.logs = [];
    if (this.config.persistLogs) {
      localStorage.removeItem('debugSystem_logs');
    }
  }

  // Metodi privati
  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug', 'trace'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);
    
    return logLevelIndex <= currentLevelIndex;
  }

  private addLogEntry(entry: DebugEntry): void {
    this.logs.push(entry);
    
    // Mantieni solo gli ultimi N log
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }
  }

  private outputToConsole(entry: DebugEntry): void {
    const style = this.getConsoleStyle(entry.level);
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp.toLocaleTimeString()}`;
    const component = entry.component ? ` [${entry.component}]` : '';
    
    console.log(
      `%c${prefix}${component}: ${entry.message}`,
      style,
      entry.data || ''
    );
    
    if (entry.stackTrace && entry.level === 'error') {
      console.trace(entry.stackTrace);
    }
  }

  private getConsoleStyle(level: string): string {
    const styles = {
      error: 'color: #ff4444; font-weight: bold;',
      warn: 'color: #ffaa00; font-weight: bold;',
      info: 'color: #4444ff;',
      debug: 'color: #888888;',
      trace: 'color: #cccccc;'
    };
    
    return styles[level as keyof typeof styles] || '';
  }

  private persistLog(entry: DebugEntry): void {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('debugSystem_logs') || '[]');
      existingLogs.push(entry);
      
      // Mantieni solo gli ultimi N log persistiti
      const logsToKeep = existingLogs.slice(-this.config.maxLogEntries);
      localStorage.setItem('debugSystem_logs', JSON.stringify(logsToKeep));
    } catch (error) {
      console.warn('Failed to persist log:', error);
    }
  }

  private loadPersistedLogs(): void {
    if (!this.config.persistLogs) return;
    
    try {
      const persistedLogs = JSON.parse(localStorage.getItem('debugSystem_logs') || '[]');
      this.logs = persistedLogs.map((log: Record<string, unknown>) => ({
        ...log,
        timestamp: (typeof log.timestamp === 'string' || typeof log.timestamp === 'number')
          ? new Date(log.timestamp as string | number)
          : new Date()
      }));
    } catch (error) {
      console.warn('Failed to load persisted logs:', error);
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Gestione errori JavaScript globali
    window.addEventListener('error', (event) => {
      this.error('Global JavaScript Error', event.error, 'Global');
    });

    // Gestione promise rejections non catturate
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', new Error(event.reason), 'Global');
    });
  }

  private notifyErrorCallbacks(error: Error, context?: unknown): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error, context);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStackTrace(): string {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(3).join('\n') : '';
  }
}

// Istanza globale del sistema di debug
export const debugSystem = new AdvancedDebugSystem();

// Hook React per il debug
export function useDebug(componentName: string) {
  // Funzione log inutilizzata rimossa

  return {
    error: (message: string, error?: Error) => debugSystem.error(message, error, componentName),
    warn: (message: string, data?: unknown) => debugSystem.warn(message, data, componentName),
    info: (message: string, data?: unknown) => debugSystem.info(message, data, componentName),
    debug: (message: string, data?: unknown) => debugSystem.debug(message, data, componentName),
    trace: (message: string, data?: unknown) => debugSystem.trace(message, data, componentName),
    measurePerformance: <T>(name: string, fn: () => T) => 
      debugSystem.measurePerformance(`${componentName}.${name}`, fn),
    measurePerformanceAsync: <T>(name: string, fn: () => Promise<T>) => 
      debugSystem.measurePerformanceAsync(`${componentName}.${name}`, fn)
  };
}

// Decorator per il debug automatico delle funzioni
export function debugMethod(target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: unknown[]) {
    const className = (target as { constructor: { name: string } }).constructor.name;
    const methodName = `${className}.${propertyName}`;
    
    debugSystem.debug(`Calling ${methodName}`, { args });
    
    try {
      const result = method.apply(this, args);
      
      if (result instanceof Promise) {
        return result
          .then(res => {
            debugSystem.debug(`${methodName} completed`, { result: res });
            return res;
          })
          .catch(error => {
            debugSystem.error(`${methodName} failed`, error);
            throw error;
          });
      }
      
      debugSystem.debug(`${methodName} completed`, { result });
      return result;
    } catch (error) {
      debugSystem.error(`${methodName} failed`, error as Error);
      throw error;
    }
  };
  
  return descriptor;
}

// Utility per il debug condizionale
export const conditionalDebug = {
  when: (condition: boolean) => ({
    log: (message: string, data?: unknown) => {
      if (condition) debugSystem.debug(message, data);
    },
    error: (message: string, error?: Error) => {
      if (condition) debugSystem.error(message, error);
    }
  })
};

export default debugSystem;