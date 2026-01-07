import type { Environment } from "@yoda.fun/shared/services";
import type { LoggerOptions } from "pino";
import { pino } from "pino";
import pkg from "pino-std-serializers";

export interface LoggerConfig {
  level?: string;
  environment?: Environment;
  appName?: string;
}

export interface Logger {
  info: {
    (msg: string): void;
    (obj: Record<string, unknown>, msg?: string): void;
  };
  error: {
    (msg: string): void;
    (obj: Record<string, unknown>, msg?: string): void;
  };
  warn: {
    (msg: string): void;
    (obj: Record<string, unknown>, msg?: string): void;
  };
  debug: {
    (msg: string): void;
    (obj: Record<string, unknown>, msg?: string): void;
  };
  fatal: {
    (msg: string): void;
    (obj: Record<string, unknown>, msg?: string): void;
  };
  trace: {
    (msg: string): void;
    (obj: Record<string, unknown>, msg?: string): void;
  };
}

/**
 * Create a Pino logger instance with the given configuration
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  const {
    level = "info",
    appName = "yoda-server",
    environment = "dev",
  } = config;

  const isDevelopment = environment === "dev";

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
      env: environment,
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
