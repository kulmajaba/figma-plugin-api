import { LogLevel } from './types';

const isFigma = typeof figma !== 'undefined';
const isUi = typeof parent !== 'undefined';
const logBase = (level: LogLevel, ...msg: unknown[]) =>
  console[level](`RPC in ${isFigma ? 'logic' : isUi ? 'ui' : 'UNKNOWN'}:`, ...msg);

export const log = (...msg: unknown[]) => logBase('log', ...msg);
export const logWarn = (...msg: unknown[]) => logBase('warn', ...msg);
export const logError = (...msg: unknown[]) => logBase('error', ...msg);

export const strictObjectKeys = Object.keys as <T extends Record<string, unknown>>(obj: T) => Array<keyof T>;
