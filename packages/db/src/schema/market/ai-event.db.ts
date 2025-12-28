import {
  type AiEventId,
  type MarketId,
  typeIdGenerator,
} from "@yoda.fun/shared/typeid";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { createTimestampField, typeId } from "../../utils/db-utils";
import { market } from "./market.db";

export const aiEvent = pgTable(
  "ai_event",
  {
    id: typeId("aiEvent", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("aiEvent"))
      .$type<AiEventId>(),
    traceId: text("trace_id"),
    marketId: typeId("market", "market_id")
      .references(() => market.id)
      .$type<MarketId>(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    operation: text("operation"),
    temperature: numeric("temperature", { precision: 3, scale: 2 }),
    maxTokens: integer("max_tokens"),
    topP: numeric("top_p", { precision: 3, scale: 2 }),
    toolsProvided: jsonb("tools_provided"),
    input: jsonb("input"),
    output: jsonb("output"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    reasoningTokens: integer("reasoning_tokens"),
    cacheReadTokens: integer("cache_read_tokens"),
    cacheWriteTokens: integer("cache_write_tokens"),
    latencyMs: integer("latency_ms"),
    finishReason: text("finish_reason"),
    responseId: text("response_id"),
    inputCostUsd: numeric("input_cost_usd", { precision: 10, scale: 6 }),
    outputCostUsd: numeric("output_cost_usd", { precision: 10, scale: 6 }),
    totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 6 }),
    success: boolean("success").notNull().default(true),
    error: text("error"),
    httpStatus: integer("http_status"),
    createdAt: createTimestampField("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("aie_trace_idx").on(t.traceId),
    index("aie_market_idx").on(t.marketId),
    index("aie_created_idx").using("brin", t.createdAt),
  ]
);
