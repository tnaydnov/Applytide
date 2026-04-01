/**
 * @fileoverview Frontend Logger
 *
 * Lightweight logger that suppresses verbose console output in production.
 * In development, all levels are printed. In production, only `warn` and
 * `error` are printed (debug/info are silenced).
 *
 * Usage:
 *   import { logger } from '../lib/logger';
 *   logger.error('Failed to load data', error);
 *   logger.debug('Fetched items', items);   // silent in production
 */

const isDev = import.meta.env.DEV;

type LogArgs = unknown[];

function noop(..._args: LogArgs): void {
  // intentionally empty
}

export const logger = {
  /** Debug-level: shown only in development */
  debug: isDev ? console.debug.bind(console) : noop,
  /** Info-level: shown only in development */
  info: isDev ? console.info.bind(console) : noop,
  /** Warning-level: always shown */
  warn: console.warn.bind(console),
  /** Error-level: always shown */
  error: console.error.bind(console),
} as const;
