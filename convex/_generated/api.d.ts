/**
 * Generated API definitions for Convex.
 *
 * Generated automatically by convex codegen / npx convex dev.
 */
import type { AnyApi, FunctionReference } from "convex/server";

export declare const api: {
  health: {
    getHealth: FunctionReference<"query", "public", Record<string, never>, unknown>;
  };
  users: {
    syncUser: FunctionReference<"mutation", "public", { preferredName?: string }, unknown>;
    getCurrentUser: FunctionReference<"query", "public", Record<string, never>, unknown>;
    getUserById: FunctionReference<"query", "public", { userId: string }, unknown>;
    updateProfile: FunctionReference<"mutation", "public", { name: string }, unknown>;
    setRole: FunctionReference<
      "mutation",
      "public",
      { targetUserId: string; newRole: "user" | "admin" },
      unknown
    >;
    setTrustedLender: FunctionReference<
      "mutation",
      "public",
      { targetUserId: string; isTrustedLender: boolean },
      unknown
    >;
    listUsers: FunctionReference<"query", "public", Record<string, never>, unknown>;
  };
  [key: string]: unknown;
};

export declare const internal: AnyApi;
