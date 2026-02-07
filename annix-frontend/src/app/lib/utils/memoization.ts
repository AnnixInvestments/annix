import { nowMillis } from "@/app/lib/datetime";

type CacheKey = string | number;

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

const createMemoizedFunction = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  keyFn: (...args: TArgs) => CacheKey,
  maxAge: number = 60000,
): ((...args: TArgs) => TResult) => {
  const cache = new Map<CacheKey, CacheEntry<TResult>>();

  return (...args: TArgs): TResult => {
    const key = keyFn(...args);
    const now = nowMillis();
    const cached = cache.get(key);

    if (cached && now - cached.timestamp < maxAge) {
      return cached.value;
    }

    const result = fn(...args);
    cache.set(key, { value: result, timestamp: now });

    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }

    return result;
  };
};

export const memoizeByArgs = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  maxAge: number = 60000,
): ((...args: TArgs) => TResult) => {
  return createMemoizedFunction(fn, (...args) => JSON.stringify(args), maxAge);
};

export const memoizeByFirstTwoArgs = <T1, T2, TResult>(
  fn: (arg1: T1, arg2: T2, ...rest: unknown[]) => TResult,
  maxAge: number = 60000,
): ((arg1: T1, arg2: T2, ...rest: unknown[]) => TResult) => {
  return createMemoizedFunction(fn, (arg1, arg2) => `${String(arg1)}-${String(arg2)}`, maxAge);
};

export const createSimpleCache = <TKey extends CacheKey, TValue>() => {
  const cache = new Map<TKey, TValue>();

  return {
    get: (key: TKey): TValue | undefined => cache.get(key),
    set: (key: TKey, value: TValue): void => {
      cache.set(key, value);
    },
    has: (key: TKey): boolean => cache.has(key),
    clear: (): void => {
      cache.clear();
    },
    size: (): number => cache.size,
  };
};

export const scheduleCache = createSimpleCache<string, unknown[]>();
export const wallThicknessCache = createSimpleCache<string, number>();

export const cacheKey = (...args: (string | number | undefined | null)[]): string => {
  return args.map((a) => String(a ?? "")).join("-");
};
