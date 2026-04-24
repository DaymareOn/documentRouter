import winston from 'winston';

const { combine, timestamp, json, colorize, simple } = winston.format;

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    isDevelopment ? combine(colorize(), simple()) : json()
  ),
  transports: [new winston.transports.Console()],
});

export function createLogger(context: string) {
  return logger.child({ context });
}
