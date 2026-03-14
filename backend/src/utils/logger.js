/**
 * utils/logger.js
 *
 * WHY: console.log() is not suitable for production. Winston gives us:
 * - Structured JSON logs (searchable)
 * - Log levels (error, warn, info, debug)
 * - Separate transports: console in dev, file in prod
 *
 * We keep MongoDB logging out to avoid circular dependency
 * (logger is used before DB connects).
 */

const winston = require('winston');
const config = require('../config');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format: "[2024-01-15 14:32:01] INFO: User logged in"
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    return stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}`
      : `[${timestamp}] ${level}: ${message}`;
  })
);

// JSON format for production — easy to parse with log aggregators
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: config.isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;
