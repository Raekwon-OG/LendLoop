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
- **Database & Reactive Backend**: [Convex](https://www.convex.dev/) (`convex` with native Convex File Storage for equipment photos)
- **Workflow Automation**: [n8n](https://n8n.io/) (Self-hosted via Docker Compose or cloud deployable)
- **Testing**: [Vitest](https://vitest.dev/) (87 automated test cases covering RBAC, borrowing lifecycle, HMAC security, data minimization, error formatting, and idempotency)
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

### How to Make a User an Administrator

LendLoop supports three straightforward methods for assigning the `admin` role:

1. **Automatic First-User Bootstrap**:
   - The very first user to register in a fresh database is automatically provisioned with `role: "admin"` and `isTrustedLender: true` by `users:syncUser`.

2. **Manual Provisioning via Convex Dashboard**:
   - To manually elevate any user via the database console:
     1. Open your [Convex Dashboard](https://dashboard.convex.dev/) and select your project (`lendloop`).
     2. In the left navigation, click **Data** &rarr; select the **`users`** table.
     3. Click on the document of the user you want to elevate.
     4. Change the `role` field from `"user"` to `"admin"` and save.
     5. The **Admin Panel** link in the sidebar and inline admin controls will appear automatically in real time.

3. **In-App Promotion & Trusted Lender Designation (via Admin Panel or Browse Catalog)**:
   - Once logged in as an administrator, you can manage roles and Trusted Lender badges directly in the UI:
     - **Admin Panel (`/dashboard/admin`)**: Open the **Members & Roles** or **Listings Moderation** tab to click **Grant Trusted** / **Revoke Trusted**, **Make Admin**, or **Remove Listing**, and inspect **All Loans**.
     - **Browse Tools (`/dashboard/tools`)**: Use the inline admin bar at the bottom of any tool card to click **★ Mark Trusted Lender** or **Remove** on the spot.

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

## External Service Configuration (Required Before First Run)

Setting up LendLoop requires connecting three services: **Clerk** (auth), **Convex** (database/backend), and **n8n** (automation).

### 1. Clerk Authentication Setup

1. Go to the [Clerk Dashboard](https://dashboard.clerk.com/) and click **Add application**.
2. Name the application **LendLoop**.
3. Under **Authentication Providers**, enable **Email** (Email code or link) and optionally **Google**.
4. In the left navigation, open **API Keys** (under *Configure*):
   - Copy **Publishable Key** (`pk_test_...`) &rarr; save for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
   - Copy **Secret Key** (`sk_test_...`) &rarr; save for `CLERK_SECRET_KEY`.
5. Under **Paths** (or *Configure > Paths*), verify routing:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
6. **Create the Convex JWT Template** (Required for Convex to recognize Clerk users):
   - In Clerk Dashboard, navigate to **Configure** &rarr; **JWT Templates**.
   - Click **New template** and select the predefined **Convex** template.
   - Leave the template name as default: `convex`.
   - Copy the **Issuer URL** (e.g. `https://<your-app>.clerk.accounts.dev`). You will need this for Convex.

---

### 2. Convex Backend Setup

1. Open your terminal in the project directory and run:
   ```bash
   npx convex dev
   ```
2. When prompted:
   - Log in to your Convex account in the browser.
   - Choose **Create a new project** (or select an existing one) and name it **lendloop**.
3. Convex will automatically configure your local deployment and write `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` into your `.env.local`.
4. Open the [Convex Dashboard](https://dashboard.convex.dev/):
   - Select your `lendloop` project.
   - Click **Settings** (gear icon) &rarr; **Environment Variables**.
   - Add the following environment variables:
     - `CLERK_JWT_ISSUER_DOMAIN`: The Clerk Issuer URL from Step 1.6 (e.g., `https://<your-app>.clerk.accounts.dev`).
     - `N8N_WEBHOOK_SECRET`: A shared secret string you generate (e.g. run `openssl rand -hex 24` or use a 32+ char random string).
     - `N8N_WEBHOOK_URL`: Your n8n webhook URL (e.g., `http://localhost:5678/webhook/borrow-request` locally or your cloud n8n URL).

---

### 3. n8n Automation Workflows Setup

#### Generic Deployment & Workflow Setup (Any Cloud Container or Docker Host)

You can run n8n on any modern container host (Docker, Kubernetes, Render, Railway, Fly.io, or VPS) using the latest official image:

1. **Deploy the n8n Container**:
   - Image: `docker.n8n.io/n8nio/n8n:latest` (or Docker Hub: `n8nio/n8n:latest`).
   - Expose port `5678`.
   - Mount a persistent volume at `/home/node/.n8n` to preserve user credentials, workflow states, and encryption keys across restarts.

2. **Configure Essential Environment Variables**:
   | Variable | Value / Recommended Setting | Purpose |
   | :--- | :--- | :--- |
   | `N8N_PORT` | `5678` | Internal web server port |
   | `N8N_PROTOCOL` | `https` (or `http` behind a TLS reverse proxy) | URL scheme |
   | `N8N_HOST` | Your public domain (e.g. `n8n.yourdomain.com`) | Host header validation |
   | `N8N_WEBHOOK_URL` | `https://<your-n8n-domain>/` | Base URL emitted for webhook triggers |
   | `N8N_WEBHOOK_SECRET` | Shared secret string (e.g. `openssl rand -hex 24`) | Verifies HMAC-SHA256 signatures with Convex |
   | `CONVEX_SITE_URL` | `https://<your-deployment>.convex.site` | Target for polling overdue loans and reminder write-backs |
   | `NODE_FUNCTION_ALLOW_BUILTIN` | `crypto,buffer,util` | Grants Code nodes access to Node.js crypto primitives |

3. **Import LendLoop Workflows**:
   - Open your n8n web UI and complete the initial owner account creation.
   - Navigate to **Workflows** &rarr; **Add Workflow** &rarr; **Import from File**.
   - Import all three workflows located in `n8n/workflows/`:
     - `request_notification.json` — Listens on `/webhook/borrow-request`, verifies HMAC signature, routes `request_created` and `request_status_changed` notifications.
     - `overdue_reminders.json` — Scheduled cron (daily at 09:00), polls `/api/overdue-loans` on Convex with data minimization, and idempotently records reminder write-backs with HMAC.
     - `error_handler.json` — Universal Error Trigger workflow capturing execution errors and logging incident reports.
   - Toggle each workflow switch to **Active**.

4. **Connect the Webhook to LendLoop**:
   - In the **Borrow Request Notifications** workflow, double-click the **Webhook Trigger** node.
   - Copy the **Production URL** (`https://<your-n8n-domain>/webhook/borrow-request`).
   - Add this URL as `N8N_WEBHOOK_URL` in Convex Dashboard and Vercel.

---

#### Local Development Setup (Docker Compose)

For local development without cloud hosting, run n8n locally via Docker Compose:

1. Open the `n8n/` directory:
   ```bash
   cd n8n
   cp .env.example .env
   ```
2. Verify `.env` contains:
   - `N8N_WEBHOOK_SECRET`: Matches the value configured in your local Convex backend.
   - `CONVEX_SITE_URL`: `https://<your-convex-deployment>.convex.site` (or local HTTP tunnel).
3. Start the container:
   ```bash
   docker compose up -d
   ```
4. Access the web UI at [http://localhost:5678](http://localhost:5678), create your admin account, and import the workflows from `n8n/workflows/`.

---

#### Reference Cloud Deployment: Northflank (with Memory Constraints & Versioning)

In our live environment, n8n is deployed on [Northflank](https://app.northflank.com/) at:
**`https://n8n--lendloop--p4x9rr7dxz5f.code.run/`**

##### ⚠️ Important Constraints & Memory Considerations:
- **Free / Micro Tier RAM Limit (512MB)**:
  - The standard `n8nio/n8n:latest` (v2.x) runs a dual-process architecture (the main web server plus an isolated task runner process). This defaults to ~480MB memory consumption at idle, triggering `OOMKilled` (Out Of Memory) container crashes on 512MB tiers.
  - **Recommended Version for 512MB Tiers**: We use **`n8nio/n8n:1.76.1`** LTS. Version 1.76 runs as a lean single process idling around ~190MB RAM.
  - Add `NODE_OPTIONS=--max-old-space-size=350` to restrict V8 garbage collection thresholds beneath the container ceiling.
- **Docker Registry Compatibility**:
  - Northflank requires approved public image paths. Use the Docker Hub image path `n8nio/n8n:1.76.1` (or `n8nio/n8n:latest` on paid plans with &ge; 1GB RAM) rather than `docker.n8n.io/...`.
- **Workflow Schema Compatibility**:
  - The workflow JSON definitions in `n8n/workflows/` use universal `if` nodes (v1) and root-level HTTP retry parameters, ensuring 100% clean imports across both n8n `1.76.x` and `2.x+`.

##### Step-by-Step Northflank Service Setup:
1. Log in to [Northflank](https://app.northflank.com/) and create a project (e.g. `lendloop-automation`).
2. Click **Create Service** &rarr; **Deployment Service** &rarr; **External image**.
3. Image path: `n8nio/n8n:1.76.1` (or `n8nio/n8n:latest` if your instance has &ge; 1GB RAM).
4. Under **Ports**, add port `5678` with HTTP protocol and enable public access.
5. Under **Volumes**, attach a persistent volume (1 GB or larger) mounted at `/home/node/.n8n`.
6. Under **Environment Variables**, configure:
   ```env
   N8N_LISTEN_ADDRESS=0.0.0.0
   N8N_PORT=5678
   N8N_PROTOCOL=http
   N8N_HOST=n8n--lendloop--p4x9rr7dxz5f.code.run
   N8N_EDITOR_BASE_URL=https://n8n--lendloop--p4x9rr7dxz5f.code.run
   N8N_WEBHOOK_URL=https://n8n--lendloop--p4x9rr7dxz5f.code.run/
   N8N_PROXY_HOPS=1
   N8N_RUNNERS_GRANT_TOKEN_TTL=120
   N8N_DIAGNOSTICS_ENABLED=false
   NODE_OPTIONS=--max-old-space-size=350
   NODE_FUNCTION_ALLOW_BUILTIN=crypto,buffer,util
   N8N_WEBHOOK_SECRET=<your-shared-hmac-secret>
   CONVEX_SITE_URL=https://knowing-tiger-323.convex.site
   ```
7. Click **Deploy Service**. Once running, access the URL, create the owner account, and import the 3 workflows from `n8n/workflows/`.

---

## Deploying Next.js on Vercel

If deploying the Next.js app on [Vercel](https://vercel.com/):

### Environment Variables Checklist for Vercel
Go to **Vercel Dashboard** &rarr; Your Project &rarr; **Settings** &rarr; **Environment Variables**, and add:

| Environment Variable | Description | Where to Retrieve |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_CONVEX_URL` | Cloud Convex deployment URL | [Convex Dashboard](https://dashboard.convex.dev/) &rarr; Project &rarr; Settings &rarr; **Deployment URL** (or from your `.env.local`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key (`pk_test_...` or `pk_live_...`) | [Clerk Dashboard](https://dashboard.clerk.com/) &rarr; Application &rarr; **API Keys** &rarr; Publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key (`sk_test_...` or `sk_live_...`) | [Clerk Dashboard](https://dashboard.clerk.com/) &rarr; Application &rarr; **API Keys** &rarr; Secret key |
| `N8N_WEBHOOK_URL` | Production URL for n8n borrow webhook | n8n Dashboard &rarr; Borrow Request Workflow &rarr; **Webhook Trigger Node** &rarr; Production URL |
| `N8N_WEBHOOK_SECRET` | Shared HMAC signing secret | Same pre-shared secret you configured in Convex and n8n (`openssl rand -hex 24`) |
| `NEXT_PUBLIC_APP_URL` | Your live Vercel domain | e.g. `https://lendloop.vercel.app` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in page path | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up page path | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Post-login redirect path | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Post-signup redirect path | `/dashboard` |

### Step-by-Step: Where to Fetch Each Variable

1. **`NEXT_PUBLIC_CONVEX_URL`**:
   - Go to [https://dashboard.convex.dev/](https://dashboard.convex.dev/) &rarr; select project **lendloop** &rarr; **Settings** &rarr; copy **Deployment URL** (e.g. `https://fictional-lendloop-123.convex.cloud`).
   - Alternatively, check your local `.env.local` generated by `npx convex dev`.

2. **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`**:
   - Go to [https://dashboard.clerk.com/](https://dashboard.clerk.com/) &rarr; select **LendLoop**.
   - In the left sidebar, click **API Keys**.
   - Under **Quick Copy**, copy the **Publishable key** (`pk_...`) and the **Secret key** (`sk_...`).

3. **`N8N_WEBHOOK_URL`**:
   - Open your deployed n8n instance (e.g. on Northflank or your cloud host).
   - In the left menu, click **Workflows** and open **LendLoop - Borrow Request Notifications**.
   - Double click the first node: **Webhook Trigger**.
   - In the modal, click the **Production URL** tab and copy the complete URL (`https://<your-n8n-domain>/webhook/borrow-request`).

4. **`N8N_WEBHOOK_SECRET`**:
   - This is **your shared cryptographic secret** for HMAC-SHA256 signatures.
   - Generate it once using:
     ```bash
     openssl rand -hex 24
     ```
   - Enter this **exact same value** into:
     1. Vercel Environment Variables (`N8N_WEBHOOK_SECRET`)
     2. Convex Dashboard &rarr; Settings &rarr; Environment Variables (`N8N_WEBHOOK_SECRET`)
     3. n8n Environment Variables (`N8N_WEBHOOK_SECRET`)


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

### 3. Configure Local Environment
```bash
cp .env.example .env.local
```
Fill in `.env.local` using the keys from your Clerk and Convex dashboards.

### 4. Start Services
```bash
# Terminal 1: Convex Backend
npx convex dev

# Terminal 2: n8n Automation (Docker)
cd n8n && docker compose up -d && cd ..

# Terminal 3: Next.js Development Server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view LendLoop.

---

## Running the Automated Test Suite

LendLoop includes 87 unit and integration tests across 8 test files:

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
