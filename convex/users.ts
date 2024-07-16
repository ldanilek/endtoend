import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    return userId !== null ? ctx.db.get(userId) : null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userDocs = await ctx.db.query("users").collect();
    return userDocs.map((doc) => ({
      _id: doc._id,
      name: doc.name,
      email: doc.email,
    }));
  },
});

export const storeKey = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    const keyDoc = await ctx.db.query("keys")
      .withIndex("userId", q => q.eq("userId", userId))
      .unique();
    if (keyDoc) {
      await ctx.db.patch(keyDoc._id, { key });
    } else {
      await ctx.db.insert("keys", { userId, key });
    }
  },
});

export const getPublicKey = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const keyDoc = await ctx.db.query("keys")
      .withIndex("userId", q => q.eq("userId", userId))
      .unique();
    return keyDoc?.key ?? null;
  },
});