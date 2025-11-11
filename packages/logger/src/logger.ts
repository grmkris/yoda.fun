import type { LoggerOptions } from "pino";
import { pino } from "pino";

import pkg from "pino-std-serializers";

export type LoggerConfig = {
  level?: string;
  nodeEnv?: "development" | "production" | "test";
  appName?: string;
};

export type Logger = {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  debug: (obj: Record<string, unknown>, msg?: string) => void;
  fatal: (obj: Record<string, unknown>, msg?: string) => void;
  trace: (obj: Record<string, unknown>, msg?: string) => void;
};

/**
 * Create a Pino logger instance with the given configuration
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  const {
    level = "info",
    nodeEnv = "development",
    appName = "capbet",
  } = config;

  const isDevelopment = nodeEnv !== "production";

  // Base logger configuration
  const loggerOptions: LoggerOptions = {
    level,
    // Redact sensitive fields from logs
    redact: {
      paths: [
        "*.password",
        "*.token",
        "*.accessToken",
        "*.refreshToken",
        "*.secret",
        "*.apiKey",
        "*.authorization",
        "req.headers.authorization",
        "req.headers.cookie",
      ],
      remove: true,
    },
    // Use errWithCause to preserve full error chains (e.g., API → DB → Blockchain)
    serializers: {
      err: pkg.errWithCause,
      error: pkg.errWithCause,
      req: pkg.wrapRequestSerializer,
      res: pkg.wrapResponseSerializer,
    },
    // Base context to include in all logs
    base: {
      env: nodeEnv,
      app: appName,
    },
    // Timestamp function
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  const logger = isDevelopment
    ? pino({
        ...loggerOptions,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname,app,env",
            singleLine: true,
            messageFormat: "{msg}",
            sync: true,
          },
        },
      })
    : pino(loggerOptions);

  // Log initial startup message
  logger.info({
    msg: `Logger initialized in ${isDevelopment ? "development" : "production"} mode`,
  });

  return logger;
}
