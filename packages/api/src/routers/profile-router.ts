import { ORPCError } from "@orpc/server";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { UserId } from "@yoda.fun/shared/typeid";
import sharp from "sharp";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../api";

const AVATAR_SIZE = 256;
const WEBP_QUALITY = 85;

export const profileRouter = {
  getById: publicProcedure
    .input(z.object({ userId: UserId }))
    .handler(async ({ context, input }) => {
      const viewerId = context.session?.user?.id
        ? UserId.parse(context.session.user.id)
        : undefined;

      const profile = await context.profileService.getProfileByUserId(
        input.userId,
        viewerId
      );

      if (!profile) {
        throw new ORPCError("NOT_FOUND");
      }

      return profile;
    }),

  getByUsername: publicProcedure
    .input(z.object({ username: z.string().min(1).max(50) }))
    .handler(async ({ context, input }) => {
      const viewerId = context.session?.user?.id
        ? UserId.parse(context.session.user.id)
        : undefined;

      const profile = await context.profileService.getProfileByUsername(
        input.username,
        viewerId
      );

      if (!profile) {
        throw new ORPCError("NOT_FOUND");
      }

      return profile;
    }),

  me: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);

    const profile = await context.profileService.getProfileByUserId(
      userId,
      userId
    );

    return profile;
  }),

  uploadAvatar: protectedProcedure
    .input(
      z.object({
        image: z.string().min(1, "Image data is required"),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      if (!context.storage) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Storage not configured",
        });
      }

      // Process avatar inline (resize + convert to webp)
      const imageBuffer = Buffer.from(input.image, "base64");
      const avatarKey = `avatars/${userId}.webp`;

      const processedBuffer = await sharp(imageBuffer)
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      await context.storage.uploadPublic({
        key: avatarKey,
        data: processedBuffer,
        contentType: "image/webp",
      });

      // Update user record with avatar key
      await context.db
        .update(DB_SCHEMA.user)
        .set({ image: avatarKey })
        .where(eq(DB_SCHEMA.user.id, userId));

      return { status: "completed" as const, avatarKey };
    }),

  bets: publicProcedure
    .input(
      z.object({
        userId: UserId,
        limit: z
          .number()
          .min(1)
          .max(NUMERIC_CONSTANTS.pagination.maxLimit)
          .optional()
          .default(NUMERIC_CONSTANTS.pagination.defaultLimit),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .handler(async ({ context, input }) => {
      const viewerId = context.session?.user?.id
        ? UserId.parse(context.session.user.id)
        : undefined;

      const result = await context.profileService.getBetHistory({
        userId: input.userId,
        viewerId,
        limit: input.limit,
        offset: input.offset,
      });

      return result;
    }),
};
