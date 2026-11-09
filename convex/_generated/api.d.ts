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
    getMyTools: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{
        _id: string;
        ownerId: string;
        ownerClerkId: string;
        title: string;
        description: string;
        category: string;
        condition: "Like New" | "Good" | "Fair";
        status: "available" | "borrowed" | "maintenance" | "archived";
        createdAt: number;
        updatedAt: number;
      }>
    >;
    getToolById: FunctionReference<"query", "public", { toolId: string }, unknown>;
    create: FunctionReference<
      "mutation",
      "public",
      {
        title: string;
        description: string;
        category: string;
        condition: "Like New" | "Good" | "Fair";
      },
      string
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        toolId: string;
        title?: string;
        description?: string;
        category?: string;
        condition?: "Like New" | "Good" | "Fair";
        status?: "available" | "borrowed" | "maintenance" | "archived";
      },
      unknown
    >;
    remove: FunctionReference<"mutation", "public", { toolId: string }, { success: boolean; deletedToolId: string }>;
  };
  borrowRequests: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        toolId: string;
        startDate: number;
        endDate: number;
        note?: string;
      },
      string
    >;
    approve: FunctionReference<
      "mutation",
      "public",
      { requestId: string },
      { success: boolean; loanId: string }
    >;
    decline: FunctionReference<
      "mutation",
      "public",
      { requestId: string },
      { success: boolean }
    >;
    cancel: FunctionReference<
      "mutation",
      "public",
      { requestId: string },
      { success: boolean }
    >;
    getMyRequests: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{
        _id: string;
        toolId: string;
        requesterId: string;
        requesterClerkId: string;
        ownerId: string;
        ownerClerkId: string;
        startDate: number;
        endDate: number;
        status: "pending" | "approved" | "declined" | "cancelled";
        note?: string;
        createdAt: number;
        updatedAt: number;
        toolTitle: string;
        toolCategory: string;
        toolCondition: string;
        ownerName: string;
        ownerEmail: string;
      }>
    >;
    getIncomingRequests: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{
        _id: string;
        toolId: string;
        requesterId: string;
        requesterClerkId: string;
        ownerId: string;
        ownerClerkId: string;
        startDate: number;
        endDate: number;
        status: "pending" | "approved" | "declined" | "cancelled";
        note?: string;
        createdAt: number;
        updatedAt: number;
        toolTitle: string;
        toolCategory: string;
        requesterName: string;
        requesterEmail: string;
      }>
    >;
  };
  loans: {
    markReturned: FunctionReference<
      "mutation",
      "public",
      { loanId: string },
      { success: boolean }
    >;
    getMyActiveLoans: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{
        _id: string;
        toolId: string;
        borrowRequestId: string;
        lenderId: string;
        lenderClerkId: string;
        borrowerId: string;
        borrowerClerkId: string;
        startDate: number;
        dueDate: number;
        returnedDate?: number;
        status: "active" | "returned" | "overdue";
        computedStatus: "active" | "returned" | "overdue";
        createdAt: number;
        toolTitle: string;
        toolCategory: string;
        borrowerName: string;
        borrowerEmail: string;
        lenderName: string;
        lenderEmail: string;
        isCallerLender: boolean;
      }>
    >;
    getMyLoanHistory: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{
        _id: string;
        toolId: string;
        borrowRequestId: string;
        lenderId: string;
        lenderClerkId: string;
        borrowerId: string;
        borrowerClerkId: string;
        startDate: number;
        dueDate: number;
        returnedDate?: number;
        status: "active" | "returned" | "overdue";
        createdAt: number;
        toolTitle: string;
        toolCategory: string;
        borrowerName: string;
        lenderName: string;
        isCallerLender: boolean;
      }>
    >;
    getAllLoans: FunctionReference<
      "query",
      "public",
      { statusFilter?: string },
      Array<{
        _id: string;
        toolId: string;
        borrowRequestId: string;
        lenderId: string;
        lenderClerkId: string;
        borrowerId: string;
        borrowerClerkId: string;
        startDate: number;
        dueDate: number;
        returnedDate?: number;
        status: "active" | "returned" | "overdue";
        createdAt: number;
        toolTitle: string;
        borrowerName: string;
        borrowerEmail: string;
        lenderName: string;
        lenderEmail: string;
      }>
    >;
  };
  [key: string]: unknown;
};

export declare const internal: AnyApi;
