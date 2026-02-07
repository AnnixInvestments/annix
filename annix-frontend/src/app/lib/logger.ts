type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || "info";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LEVELS[LOG_LEVEL];

const noop = () => {};

export const log = {
  debug: currentLevel <= LEVELS.debug ? (...args: any[]) => console.debug(...args) : noop,
  info: currentLevel <= LEVELS.info ? (...args: any[]) => console.info(...args) : noop,
  warn: currentLevel <= LEVELS.warn ? (...args: any[]) => console.warn(...args) : noop,
  error: currentLevel <= LEVELS.error ? (...args: any[]) => console.error(...args) : noop,
};
