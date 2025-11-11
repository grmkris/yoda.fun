import { describe, it } from "bun:test";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { createLogger } from "./logger";

describe("Logger", () => {
  it("should log a message to the console", async () => {
    const logger = createLogger({ appName: "test", level: "debug" });

    // Test that logger[level] can be called without throwing
    logger.info({ message: "Hello, world!" });
    logger.error({ message: "Error: Hello, world!" });
    logger.warn({ message: "Warning: Hello, world!" });
    logger.debug({ message: "Debug: Hello, world!" });
    logger.trace({ message: "Trace: Hello, world!" });

    // Test logging objects
    logger.info({ message: "Hello, world!", data: { foo: "bar" } });
    logger.error({ message: "Error: Hello, world!", data: { foo: "bar" } });
    logger.warn({ message: "Warning: Hello, world!", data: { foo: "bar" } });
    logger.debug({ message: "Debug: Hello, world!", data: { foo: "bar" } });
    logger.trace({ message: "Trace: Hello, world!", data: { foo: "bar" } });
    // delay to ensure the message is logged
    await new Promise((resolve) =>
      setTimeout(resolve, NUMERIC_CONSTANTS.MAX_DELAY)
    );
  });
});
