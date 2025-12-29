import { ORPCError } from "@orpc/server";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../api";

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

  setUsername: protectedProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3, "Username must be at least 3 characters")
          .max(20, "Username must be at most 20 characters")
          .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can only contain letters, numbers, and underscores"
          ),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      const result = await context.profileService.setUsername(
        userId,
        input.username
      );

      if (!result.success) {
        throw new ORPCError("CONFLICT", {
          message:
            result.error === "USERNAME_TAKEN"
              ? "This username is already taken"
              : "Failed to set username",
        });
      }

      return { username: result.username };
    }),

  checkUsernameAvailability: publicProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3, "Username must be at least 3 characters")
          .max(20, "Username must be at most 20 characters")
          .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can only contain letters, numbers, and underscores"
          ),
      })
    )
    .handler(async ({ context, input }) => {
      const result = await context.profileService.isUsernameAvailable(
        input.username
      );
      return result;
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

      if (!context.queue) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Queue not configured",
        });
      }

      // Upload raw image to private bucket
      const sourceKey = `temp/avatars/${userId}-${Date.now()}`;
      const imageBuffer = Buffer.from(input.image, "base64");
      await context.storage.upload({
        key: sourceKey,
        data: imageBuffer,
        contentType: "image/png",
      });

      // Queue processing job
      await context.queue.addJob("process-avatar-image", {
        userId,
        sourceKey,
      });

      return { status: "processing" as const };
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
