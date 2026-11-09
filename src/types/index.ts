/**
 * LendLoop Core Types & Roles
 */

export type UserRole = "user" | "admin";

export interface UserProfile {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  role: UserRole;
  isTrustedLender: boolean;
  createdAt: number;
}

export const TOOL_CATEGORIES = [
  "Power Tools",
  "Hand Tools",
  "Gardening & Yard",
  "Ladders & Scaffolding",
  "Woodworking",
  "Automotive",
  "Plumbing",
  "Cleaning & Pressure Washing",
  "Other",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export type ToolCondition = "Like New" | "Good" | "Fair";

export type ToolStatus = "available" | "borrowed" | "maintenance" | "archived";

export interface ToolSummary {
  _id: string;
  ownerId: string;
  ownerClerkId: string;
  title: string;
  description: string;
  category: ToolCategory | string;
  condition: ToolCondition;
  status: ToolStatus;
  isAvailable: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export type BorrowRequestStatus = "pending" | "approved" | "declined" | "cancelled";

export interface BorrowRequest {
  _id: string;
  toolId: string;
  requesterId: string;
  requesterClerkId: string;
  ownerId: string;
  ownerClerkId: string;
  startDate: number;
  endDate: number;
  status: BorrowRequestStatus;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export type LoanStatus = "active" | "returned" | "overdue";

export interface Loan {
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
  status: LoanStatus;
  createdAt: number;
}

export type AutomationEventType =
  "request_created" | "request_status_changed" | "loan_created" | "loan_overdue" | "reminder_sent";

export type AutomationEventStatus = "pending" | "processed" | "failed";

export interface AutomationEvent {
  _id: string;
  eventType: AutomationEventType;
  resourceId: string;
  payload: string;
  status: AutomationEventStatus;
  idempotencyKey: string;
  attempts: number;
  lastAttemptAt?: number;
  createdAt: number;
}
