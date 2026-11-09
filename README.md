# LendLoop 🛠️

> **"Borrow what you need. Lend what you don't."**

LendLoop is a neighborhood equipment-sharing cooperative built as a modern, full-stack application. It empowers neighbors to lend and borrow tools (power tools, garden gear, camping equipment, kitchen appliances) in an accountable, trust-verified community circle, powered by automated workflow notifications and reminder cycles orchestrated with n8n.

---

## Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React Server Components)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Authentication**: [Clerk](https://clerk.com/) (`@clerk/nextjs`)
- **Database & Reactive Backend**: [Convex](https://www.convex.dev/) (`convex`)
- **Workflow Automation**: [n8n](https://n8n.io/) (Self-hosted via Docker Compose or cloud deployable)
- **Testing**: [Vitest](https://vitest.dev/) (78 automated test cases covering RBAC, borrowing lifecycle, HMAC security, data minimization, and idempotency)
- **Validation**: [Zod](https://zod.dev/)

---

## User Roles & Permissions

LendLoop implements strict Role-Based Access Control (RBAC) enforced directly inside Convex backend queries and mutations:

| Capability | Public Visitor | Neighbor (`user`) | Administrator (`admin`) |
| :--- | :---: | :---: | :---: |
| Browse public available tool directory | ✅ (read-only) | ✅ | ✅ |
| View tool owner contact details | ❌ | ✅ (only for approved loans) | ✅ |
| List, edit, and delete personal equipment | ❌ | ✅ (own equipment only) | ✅ |
| Request reservations with date ranges | ❌ | ✅ | ✅ |
| Approve or decline borrowing requests | ❌ | ✅ (on own listings) | ✅ |
| Mark loaned tools as returned | ❌ | ✅ (as lender) | ✅ |
| Moderate and remove any tool listing | ❌ | ❌ | ✅ |
| Inspect global loan registry & overdue loans | ❌ | ❌ | ✅ |
| Designate members with "Trusted Lender" badge | ❌ | ❌ | ✅ |
| Promote members to administrator role | ❌ | ❌ | ✅ |

---

## System Architecture

```text
                     ┌──────────────────────────────────────────────┐
                     │            Next.js App Router (UI)           │
                     │  - Public Catalog    - My Listings           │
                     │  - Reservation Modal - Incoming Approvals    │
                     │  - Admin Oversight   - Activity History      │
                     └──────────────────────┬───────────────────────┘
                                            │
                     ┌──────────────────────┴───────────────────────┐
                     │        Clerk Auth & Identity Provider        │
                     │  - Session tokens    - Webhook Sync          │
                     │  - JWT Template for Convex                   │
                     └──────────────────────┬───────────────────────┘
                                            │
                                  Authenticated Calls
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │          Convex Reactive Backend             │
                     │  - Strict Schema & Compound Indexes          │
                     │  - Reservation Overlap Collision Guard       │
                     │  - Idempotent Write-Back Mutations           │
                     │  - HTTP Router (/api/overdue-loans)          │
                     └──────────────┬───────────────────────────────┘
                                    │               ▲
          Outgoing HMAC Webhooks    │               │  Idempotent Polling &
          (Borrow Request Events)   │               │  HMAC Write-backs
                                    ▼               │
                     ┌──────────────────────────────┴───────────────┐
                     │               n8n Workflow Engine            │
                     │                                              │
                     │  1. Request Notifications (Webhook trigger)  │
                     │  2. Daily Overdue Reminders (Cron trigger)   │
                     │  3. Error Handler & Incident Logger          │
                     └──────────────────────────────────────────────┘
```

---

## n8n Automation Workflows

All workflow definitions are exported as version-controlled JSON files inside `n8n/workflows/`:

### 1. Borrow Request Notifications (`n8n/workflows/request_notification.json`)
- **Trigger**: Webhook triggered by Convex on `request_created` or `request_status_changed`.
- **Security**: Verifies `X-LendLoop-Signature` (HMAC SHA-256) and prevents replay attacks via `X-LendLoop-Timestamp` (15-minute maximum tolerance).
- **Behavior**:
  - `request_created`: Formats a clean notification notice for the equipment owner with reservation date range and borrower note.
  - `request_status_changed`: Notifies the borrower when their reservation has been approved or declined.
- **Data Minimization**: Exposes only tool title, borrower name, and date range. Sensitive account identifiers are never transmitted.

### 2. Daily Overdue Reminders & Idempotent Write-Back (`n8n/workflows/overdue_reminders.json`)
- **Trigger**: Schedule trigger running daily at `09:00 UTC` (`0 9 * * *`).
- **Data Ingestion**: Queries Convex HTTP endpoint `GET /api/overdue-loans` using an Authorization Bearer token.
- **Data Minimization**: The endpoint strictly projects:
  - `loanId`, `toolTitle`, `toolCategory`, `borrowerName`, `borrowerEmail`, `dueDate`, `daysOverdue`, `reminderCount`.
  - Lender contact information, home addresses, and private account IDs are excluded.
- **Dispatches Reminder**: Simulates/dispatches friendly notification to borrower.
- **Idempotent Write-Back**: Signs a write-back payload with HMAC SHA-256 and calls `POST /api/reminder-writeback` with idempotency key `reminder_<loanId>_<YYYY-MM-DD>`.
- **Convex Idempotency**: If the workflow runs multiple times in the same day, duplicate requests return `alreadyProcessed: true` without incrementing reminder counts.

### 3. Error Handler & Incident Logger (`n8n/workflows/error_handler.json`)
- **Trigger**: Error Trigger capturing unexpected network or workflow failures across n8n.
- **Observability**: Formats execution failure metadata, failing node name, and stack traces, ensuring no silent failures occur.

---

## Security & Data-Minimization Decisions

1. **Cryptographic Payload Signing (Two-Way HMAC SHA-256)**:
   - Outgoing webhooks from Convex to n8n carry `X-LendLoop-Signature: <hmac_hex>` and `X-LendLoop-Timestamp: <ms>`.
   - Write-back calls from n8n to Convex carry identical HMAC authentication.
   - Verified using timing-safe comparison (`crypto.timingSafeEqual`) to eliminate timing side-channel attacks.
2. **Replay Attack Defense**:
   - Timestamps are bound into the HMAC digest (`${timestamp}.${rawBody}`).
   - Incoming payloads older than 15 minutes are rejected immediately.
3. **Strict Data Minimization**:
   - Public tool catalog suppresses owner identity completely.
   - Overdue reminders endpoint returns only borrower email and item title necessary for drafting a reminder.
4. **Idempotency Guarantees**:
   - Write-backs into Convex use scoped keys (`reminder_<loanId>_<YYYY-MM-DD>`).
   - Retries or network hiccups never produce duplicate logs or double-increment reminder counters.
5. **No Secrets in Source Control**:
   - All cryptographic keys and API tokens are parameterized via environment variables and n8n expressions (`{{ $env.N8N_WEBHOOK_SECRET }}`).

---

## Project Structure

```text
├── convex/                          # Convex backend functions and configuration
│   ├── _generated/                  # Generated Convex server types and API descriptors
│   ├── auth.config.ts               # Clerk JWT authentication integration config
│   ├── automations.ts               # Queries, mutations & actions for n8n workflows
│   ├── borrowRequests.ts            # Reservation lifecycle and collision protection
│   ├── health.ts                    # Backend connectivity and health check query
│   ├── http.ts                      # Convex HTTP Router (/api/overdue-loans, /api/reminder-writeback)
│   ├── loans.ts                     # Active loans, return flows, and admin audit queries
│   ├── schema.ts                    # Database tables with compound indexes
│   ├── tools.ts                     # Tool catalog queries and mutations
│   ├── users.ts                     # User sync, profiles, and RBAC mutations
│   └── lib/
│       ├── auth.ts                  # Convex identity extraction and caller verification
│       └── hmac.ts                  # HMAC-SHA256 signing, verification & timing-safe equality
├── n8n/                             # Automation workflows and local infra
│   ├── .env.example                 # Environment template for n8n container
│   ├── docker-compose.yml           # Local multi-container n8n orchestration
│   └── workflows/
│       ├── request_notification.json# Borrow request webhook workflow
│       ├── overdue_reminders.json   # Daily scheduled overdue reminder workflow
│       └── error_handler.json       # Failure handling & incident logging workflow
├── public/                          # Static assets, official LendLoop logo, and favicon
├── src/
│   ├── app/                         # Next.js App Router routes
│   │   ├── (auth)/                  # Clerk authentication routes (/sign-in, /sign-up)
│   │   ├── (dashboard)/             # Protected application dashboard shell
│   │   │   └── dashboard/           # Tools, listings, requests, incoming, and admin
│   │   ├── api/webhooks/clerk/      # Clerk user sync webhook endpoint
│   │   ├── globals.css              # Tailwind styling and brand theme tokens
│   │   ├── layout.tsx               # Root layout (ClerkProvider + ConvexClientProvider)
│   │   └── page.tsx                 # Public LendLoop landing page & tool directory
│   ├── components/
│   │   ├── admin/                   # Admin moderation, member roles, and global loans panel
│   │   ├── layout/                  # Shared layouts (Navbar, DashboardNav)
│   │   ├── providers/               # ConvexClientProvider and UserSyncProvider
│   │   ├── requests/                # BorrowRequestModal with date picker
│   │   ├── tools/                   # Tool catalog components & ToolListingModal
│   │   └── ui/                      # Reusable UI primitives (Button, Badge, Card, Logo)
│   ├── lib/
│   │   ├── auth.ts                  # Server-side Clerk authentication helpers
│   │   ├── date.ts                  # Relative timestamp formatting for reminders
│   │   └── env.ts                   # Type-safe environment variable validation with Zod
│   ├── middleware.ts                # Clerk authentication route matcher and protection
│   └── types/                       # Domain entity types, roles, and categories
├── tests/                           # Vitest automated test suite (78 tests)
│   ├── admin_rbac.test.ts           # Admin moderation and role enforcement
│   ├── automations_hmac.test.ts     # HMAC cryptography, data minimization, and idempotency
│   ├── borrow_lifecycle.test.ts     # Overlap reservation collisions and return flow
│   ├── tool_listings.test.ts        # Tool listing CRUD and ownership verification
│   └── users.test.ts                # User sync, profile updates, and admin bootstrap
├── Phases.MD                        # Architectural roadmap and implementation phases
├── .env.example                     # Sample Next.js environment variable template
└── package.json                     # Project manifest and scripts
```

---

## Local Setup & Quickstart

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker & Docker Compose** (for running local n8n)
- A free account on [Clerk](https://clerk.com/)
- A free account on [Convex](https://www.convex.dev/)

### 2. Clone and Install Dependencies
```bash
git clone <repository-url>
cd LendLoop
npm install
```

### 3. Environment Variables
Copy the environment template:
```bash
cp .env.example .env.local
```

Populate the required environment variables:

| Variable | Description | Where to Get |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Base application URL (`http://localhost:3000`) | Local |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key (`pk_test_...`) | Clerk Dashboard |
| `CLERK_SECRET_KEY` | Clerk Secret Key (`sk_test_...`) | Clerk Dashboard |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Default |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Default |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` | Default |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` | Default |
| `NEXT_PUBLIC_CONVEX_URL` | Convex Deployment URL (`https://<project>.convex.cloud`) | `npx convex dev` |
| `CONVEX_DEPLOYMENT` | Convex Deployment Target (`dev:<project>`) | `npx convex dev` |
| `N8N_WEBHOOK_SECRET` | Shared secret for HMAC-SHA256 signatures | Choose a secure random string |
| `N8N_WEBHOOK_URL` | URL of n8n webhook (`http://localhost:5678/webhook/borrow-request`) | Local n8n |

### 4. Start Convex Backend
In a separate terminal:
```bash
npx convex dev
```
In the [Convex Dashboard](https://dashboard.convex.dev/) under **Settings > Environment Variables**, add:
- `CLERK_JWT_ISSUER_DOMAIN`: Your Clerk Issuer domain (e.g., `https://<your-app>.clerk.accounts.dev`).
- `N8N_WEBHOOK_SECRET`: Your shared HMAC secret (matches `.env.local` and n8n).
- `N8N_WEBHOOK_URL`: Your n8n webhook URL.

### 5. Start n8n Workflow Automation (Docker)
In the project root:
```bash
cd n8n
cp .env.example .env
docker compose up -d
```
Open [http://localhost:5678](http://localhost:5678) to access your local n8n instance.

### 6. Start Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view LendLoop.

---

## Running the Automated Test Suite

LendLoop includes 78 unit and integration tests across 7 test files:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Check types and ESLint
npm run type-check
npm run lint

# Next.js production build verification
npm run build
```

---

## Deploying to Northflank (`https://app.northflank.com/`)

To host the LendLoop stack in the cloud on Northflank:

### 1. Deploying the n8n Service on Northflank
1. Log in to [Northflank](https://app.northflank.com/) and create a new **Project** (e.g. `lendloop-production`).
2. Click **Create Service** > **Deployment Service**.
3. Select **Deployment source**: **External image**.
4. Set image path: `docker.n8n.io/n8nio/n8n:latest`.
5. Under **Ports**, add port `5678` with HTTP protocol.
6. Under **Environment Variables**, add:
   - `N8N_HOST`: Your Northflank public domain (e.g., `n8n--lendloop.code.run`)
   - `N8N_PORT`: `5678`
   - `N8N_PROTOCOL`: `https`
   - `WEBHOOK_URL`: `https://<your-northflank-n8n-domain>/`
   - `N8N_WEBHOOK_SECRET`: Secure random string (matching your Convex environment secret)
   - `CONVEX_SITE_URL`: `https://<your-convex-deployment>.convex.site`
   - `NODE_FUNCTION_ALLOW_BUILTIN`: `crypto,buffer,util`
   - `N8N_RUNNERS_ENABLED`: `true`
7. Under **Volumes**, attach a persistent volume (1 GB or larger) mounted at `/home/node/.n8n` to preserve workflow data across container restarts.
8. Click **Deploy**.

### 2. Importing Workflows into n8n
1. Open your deployed n8n web interface on Northflank and set up the owner account.
2. In the left navigation, click **Workflows** > **Import from File**.
3. Import the three workflows from your repository:
   - `n8n/workflows/request_notification.json`
   - `n8n/workflows/overdue_reminders.json`
   - `n8n/workflows/error_handler.json`
4. In each workflow, toggle the **Active** switch in the top-right corner to **Active**.

### 3. Deploying the Next.js Frontend on Northflank (or Vercel)
1. In Northflank, create a **Combined Service** or link your GitHub repository.
2. Set build command: `npm run build` and run command: `npm start`.
3. Add the production environment variables (`NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`).

---

## What We Would Change for Production

While LendLoop is fully functional and architecturally robust, the following enhancements would be recommended for a high-traffic production rollout:

1. **Transactional Email Provider Integration**:
   - Replace the mock notification log nodes in n8n with production email providers such as **Resend**, **SendGrid**, or **Amazon SES** with DKIM and SPF verification.
2. **Dedicated Notification Center (In-App)**:
   - Add a persistent real-time notification tray with unread counters using Convex reactive queries.
3. **Queueing & Rate Limiting**:
   - For high-volume borrow bursts, implement Redis / Upstash rate limiting and job queues (BullMQ) to protect n8n and Convex endpoints from denial-of-service spikes.
4. **Secrets Management**:
   - Store webhook secrets and API keys in **AWS Secrets Manager**, **Infisical**, or **Vault** with automated rotation rather than static environment files.
5. **Geographic Proximity & Zip Code Radius**:
   - Integrate PostGIS or geolocation coordinates to filter equipment by neighborhood radius (e.g. within 2 miles).
6. **Damage Assessment & Security Deposit Escrow**:
   - Introduce pre/post rental photo upload checks via Cloud Storage and stripe deposit holds for expensive heavy equipment.
