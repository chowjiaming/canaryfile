const LEVELS = ["debug", "info", "warn", "error"];

/** Wrap a logger, forwarding every level. */
export function wrapLogger(logger) {
  const wrapped = {};
  for (const level of LEVELS) {
    wrapped[level] = (...args) => logger[level](...args);
  }
  return wrapped;
}