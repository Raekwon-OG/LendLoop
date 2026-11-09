
Phase 0 — Project foundation

Start here
Initialize Next.js App Router with TypeScript.

Configure Tailwind CSS and a minimal component system.

Install Clerk and Convex.

Configure environment variables.

Set up ESLint, formatting and type checking.

Create the initial README and project structure.

Deliverable: application boots locally, Clerk and Convex are connected.

Phase 1 — Data model and backend architecture

Define users, tools, borrow requests, loans and automation events.

Define admin and user roles.

Implement Convex schema and indexes.

Create reusable authorization helpers.

Establish ownership and access-control rules.

Deliverable: working Convex backend foundation with authorization tests.

Phase 2 — Authentication and user management

Integrate Clerk authentication.

Synchronize authenticated users with Convex.

Create user profiles.

Implement role resolution.

Protect authenticated routes.

Establish secure admin provisioning.

Deliverable: users can sign in, and backend functions recognize their identity and role.

Phase 3 — Public tools directory

Build the LendLoop landing page.

Fetch available tools from Convex.

Show only tool name and category.

Add sign-in navigation.

Create empty states and loading states.

Deliverable: functional public-facing application.

Phase 4 — Tool listings

Create a tool listing form.

Implement create, update and delete mutations.

Enforce ownership in Convex.

Add category filtering.

Show listing availability and condition.

Deliverable: authenticated users can manage their own tools.

Phase 5 — Borrowing lifecycle

Implement borrow requests with date ranges.

Prevent invalid requests and overlapping active loans.

Approve and decline incoming requests.

Track active loans.

Mark loans as returned.

Build My Listings, My Requests and Incoming Requests.

Deliverable: complete borrowing workflow.

Phase 6 — Admin and RBAC

Implement admin-only listing removal.

Allow admins to view all loans.

Implement Trusted Lender functionality.

Verify authorization on every sensitive backend operation.

Add negative authorization tests.

Deliverable: complete role-based access control.

Phase 7 — n8n integration

Configure n8n using Docker Compose.

Create authenticated Convex-to-n8n webhook integration.

Implement HMAC signature verification.

Build request notification workflow.

Build overdue reminder workflow.

Add secure Convex HTTP endpoints for overdue loans and reminder write-backs.

Deliverable: two functional automation workflows.

Phase 8 — Reliability and observability

Add idempotency keys.

Implement retries and failure handling.

Add n8n error workflow.

Track reminder activity.

Handle duplicate webhook deliveries.

Add appropriate logging.

Deliverable: resilient automation with visible execution history.

Phase 9 — Testing, polish and delivery

Test user and admin permissions.

Test the complete borrowing lifecycle.

Test webhook signatures and invalid requests.

Test retry and idempotency behavior.

Improve responsive UI and accessibility.

Complete README and production-readiness notes.

Verify clean installation from scratch.

Deliverable: submission-ready GitHub repository.