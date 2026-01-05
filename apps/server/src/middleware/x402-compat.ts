import type { MiddlewareHandler } from "hono";

/**
 * Middleware to ensure x402 402 responses include payment requirements in body
 * (for compatibility with clients that expect v1 format)
 *
 * x402 v2 puts requirements in X-PAYMENT-REQUIRED header (base64 encoded)
 * x402 v1 clients expect requirements in response body
 * This middleware copies header content to body for backwards compatibility
 */
export function x402BodyCompat(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    // Only process 402 responses
    if (c.res.status !== 402) return;

    // Get the payment-required header (base64 encoded)
    const headers = c.res.headers.entries();
    const headersObject = Object.fromEntries(headers);
    const paymentRequiredHeader = headersObject["payment-required"];

    if (!paymentRequiredHeader) return;

    // Decode and parse the payment requirements
    const decoded = JSON.parse(
      Buffer.from(paymentRequiredHeader, "base64").toString("utf-8")
    );

    // Create new response with decoded body while preserving headers
    const newHeaders = new Headers(c.res.headers);
    newHeaders.set("Content-Type", "application/json");

    c.res = new Response(JSON.stringify(decoded), {
      status: 402,
      headers: newHeaders,
    });
  };
}
