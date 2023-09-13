import { LogLevel } from './types';

const isFigma = typeof figma !== 'undefined';
const isUi = typeof parent !== 'undefined';
export const logBase = (level: LogLevel, ...msg: unknown[]) =>
  console[level](`RPC in ${isFigma ? 'logic' : isUi ? 'ui' : 'UNKNOWN'}:`, ...msg);

export const strictObjectKeys = Object.keys as <T extends Record<string, unknown>>(obj: T) => Array<keyof T>;
