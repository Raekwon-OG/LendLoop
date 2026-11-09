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
  tools: {
    getAvailable: FunctionReference<
      "query",
      "public",
      { category?: string },
      Array<{
        _id: string;
        title: string;
        description: string;
        category: string;
        condition: "Like New" | "Good" | "Fair";
        status: string;
        isAvailable: boolean;
        createdAt: number;
      }>
    >;
    getAvailableCategories: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{ name: string; count: number }>
    >;
  };
  [key: string]: unknown;
};

export declare const internal: AnyApi;
