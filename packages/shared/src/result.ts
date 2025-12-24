/**
 * Result type utilities using neverthrow
 *
 * Provides type-safe error handling with explicit Result types
 * instead of throwing exceptions.
 *
 * @example
 * ```ts
 * import { ok, err, Result } from "@yoda.fun/shared/result";
 *
 * function divide(a: number, b: number): Result<number, DivisionError> {
 *   if (b === 0) return err(new DivisionError("Cannot divide by zero"));
 *   return ok(a / b);
 * }
 *
 * // Usage with match
 * divide(10, 2).match(
 *   (value) => console.log(`Result: ${value}`),
 *   (error) => console.error(`Error: ${error.message}`)
 * );
 *
 * // Usage with mapErr
 * divide(10, 0)
 *   .mapErr((e) => new AppError(e.message))
 *   .match(
 *     (v) => console.log(v),
 *     (e) => console.error(e)
 *   );
 * ```
 */

// Re-export everything from neverthrow
export {
  Err,
  err,
  errAsync,
  fromPromise,
  fromSafePromise,
  fromThrowable,
  Ok,
  ok,
  okAsync,
  Result,
  ResultAsync,
  safeTry,
} from "neverthrow";

import { err, ok, type Result } from "neverthrow";
import type { z } from "zod";

// ============================================================================
// Common Error Types
// ============================================================================

/**
 * Base application error with code and message
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Validation error with field-level details
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly errors: Record<string, string[]> = {}
  ) {
    super("VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(
    public readonly resource: string,
    public readonly id?: string
  ) {
    super(
      "NOT_FOUND",
      id ? `${resource} with id '${id}' not found` : `${resource} not found`
    );
    this.name = "NotFoundError";
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

/**
 * Conflict error (duplicate, already exists, etc.)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "ConflictError";
  }
}

/**
 * Business logic error
 */
export class BusinessError extends AppError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "BusinessError";
  }
}

// ============================================================================
// Result Utility Functions
// ============================================================================

/**
 * Parse data with a Zod schema and return a Result
 */
export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): Result<T, ValidationError> {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      const pathErrors = errors[path] ?? [];
      pathErrors.push(issue.message);
      errors[path] = pathErrors;
    }
    return err(new ValidationError("Validation failed", errors));
  }

  return ok(parsed.data);
}

/**
 * Wrap a promise in a Result
 */
export async function tryCatch<T, E extends Error = Error>(
  promise: Promise<T>,
  mapError?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const result = await promise;
    return ok(result);
  } catch (error) {
    if (mapError) {
      return err(mapError(error));
    }
    return err(error as E);
  }
}

/**
 * Wrap a sync function in a Result
 */
export function tryCatchSync<T, E extends Error = Error>(
  fn: () => T,
  mapError?: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    if (mapError) {
      return err(mapError(error));
    }
    return err(error as E);
  }
}

/**
 * Combine multiple Results into one
 * If all succeed, returns Ok with array of values
 * If any fail, returns first Err
 */
export function combineResults<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (result.isErr()) {
      return err(result.error);
    }
    values.push(result.value);
  }

  return ok(values);
}

// ============================================================================
// Type Aliases for Common Patterns
// ============================================================================

/**
 * Result that can be a NotFoundError
 */
export type MaybeResult<T> = Result<T, NotFoundError>;

/**
 * Result that can be a ValidationError
 */
export type ValidatedResult<T> = Result<T, ValidationError>;

/**
 * Generic service result type
 */
export type ServiceResult<T, E extends AppError = AppError> = Result<T, E>;
