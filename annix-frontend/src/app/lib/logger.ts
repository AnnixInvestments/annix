type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: LogLevel): boolean => {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
};

export const log = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error(...args);
    }
  },
};
