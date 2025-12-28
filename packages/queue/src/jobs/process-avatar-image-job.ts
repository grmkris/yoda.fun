import type { UserId } from "@yoda.fun/shared/typeid";

export interface ProcessAvatarImageJob {
  userId: UserId;
  sourceKey: string;
}
