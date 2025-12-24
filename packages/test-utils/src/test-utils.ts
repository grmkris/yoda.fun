import { faker } from "@faker-js/faker";

/**
 * Generate a random wallet address in the format 0x...
 */
export function generateWalletAddress(): `0x${string}` {
  return `0x${faker.string.hexadecimal({ length: 40, casing: "lower", prefix: "" })}`;
}

/**
 * Generate a random email address
 */
export function generateEmail(): string {
  return faker.internet.email();
}

/**
 * Generate a random full name
 */
export function generateName(): string {
  return faker.person.fullName();
}

/**
 * Generate a random sentence for test data
 */
export function generateSentence(): string {
  return faker.lorem.sentence();
}

/**
 * Generate a random paragraph for test data
 */
export function generateParagraph(): string {
  return faker.lorem.paragraph();
}

/**
 * Generate a random number between min and max
 */
export function generateNumber(min = 1, max = 100): number {
  return faker.number.int({ min, max });
}

/**
 * Generate a random amount string with 2 decimal places
 */
export function generateAmount(min = 1, max = 100): string {
  return faker.number.float({ min, max, fractionDigits: 2 }).toFixed(2);
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or max attempts reached
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        await wait(delayMs * attempt);
      }
    }
  }

  throw lastError;
}

/**
 * Time constants for test setup
 */
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * Create a date offset from now
 */
export function dateFromNow(offsetMs: number): Date {
  return new Date(Date.now() + offsetMs);
}

/**
 * Create a date in the past
 */
export function pastDate(offsetMs: number): Date {
  return new Date(Date.now() - offsetMs);
}

/**
 * Create a date in the future
 */
export function futureDate(offsetMs: number): Date {
  return new Date(Date.now() + offsetMs);
}

// Re-export faker for advanced usage
export { faker };
