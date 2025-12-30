import {
  type MediaId,
  typeIdGenerator,
  type UserId,
} from "@yoda.fun/shared/typeid";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { baseEntityFields, typeId } from "../../utils/db-utils";
import { user } from "../auth/auth.db";

export const mediaTypeEnum = pgEnum("media_type", [
  "market_image",
  "market_thumbnail",
  "user_avatar",
]);

export const mediaSourceEnum = pgEnum("media_source", [
  "replicate",
  "upload",
  "external",
]);

export const mediaStatusEnum = pgEnum("media_status", [
  "pending",
  "source_ready",
  "processed",
  "failed",
]);

export interface MediaMetadata {
  prompt?: string;
  model?: string;
  replicatePredictionId?: string;
  aspectRatio?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

export const media = pgTable(
  "media",
  {
    id: typeId("media", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("media"))
      .$type<MediaId>(),

    type: mediaTypeEnum("type").notNull(),
    source: mediaSourceEnum("source").notNull(),
    status: mediaStatusEnum("status").notNull().default("pending"),

    sourceUrl: text("source_url"),
    metadata: jsonb("metadata").$type<MediaMetadata>(),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),

    tags: text("tags").array(),
    userId: typeId("user", "user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),

    ...baseEntityFields,
  },
  (table) => [
    index("idx_media_user").on(table.userId),
    index("idx_media_status").on(table.status),
    index("idx_media_type_status").on(table.type, table.status),
    index("idx_media_tags").using("gin", table.tags),
  ]
);
