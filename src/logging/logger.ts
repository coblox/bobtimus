import { LoggingWinston } from "@google-cloud/logging-winston";
import winston from "winston";
import defaultLoggingConf from "../../logconfig.json";

export function getLogger(config: any = defaultLoggingConf) {
  const logger = winston.createLogger({
    level: config.level,
    levels: {
      fatal: 0,
      crit: 1,
      warn: 2,
      info: 3,
      debug: 4,
      trace: 5
    },
    format: winston.format.combine(
      winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss"
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: "bobtimus-ts" }
  });

  if (!config.transports || config.transports.includes("console")) {
    logger.add(
      new winston.transports.Console({
        format: winston.format.simple()
      })
    );
  }
  if (config.transports.includes("stackdriver")) {
    logger.add(new LoggingWinston());
  }

  return logger;
}
