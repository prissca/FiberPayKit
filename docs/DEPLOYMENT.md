# Deploying FiberPayKit for a live demo

FiberPayKit is a monorepo with two deployable pieces:

| Piece | What it is | Where it goes |
| --- | --- | --- |
| **`apps/web`** | Next.js hosted checkout + dashboard + demo store | **Vercel** |
| **`apps/api`** | Fastify API + invoice poller + webhook worker (needs PostgreSQL) | **Render** (or Railway/Fly) |

Vercel is serverless and can't run the long-lived Fastify API + background
workers, so the API is hosted separately and the Vercel frontend points at it.
Default demo runs in **mock Fiber mode** — no real Fiber node and no Redis
required (webhooks deliver inline when Redis is absent).

> There is a chicken-and-egg between the two URLs: deploy both once, then set the
> cross-references (`NEXT_PUBLIC_API_URL` on Vercel, `WEB_URL`/`CORS_ORIGINS` on
> Render) and redeploy. ~5 minutes total.

---

## Step 1 — Deploy the API on Render

1. Go to <https://dashboard.render.com> → **New → Blueprint**.
2. Connect the `prissca/FiberPayKit` repo. Render reads [`render.yaml`](../render.yaml)
   and provisions:
   - a **web service** `fiberpaykit-api`, and
   - a free **PostgreSQL** database `fiberpaykit-db`.
3. Click **Apply**. The build runs:
   `install → build shared/sdk/api → prisma db push → seed demo merchant`.
4. When it's live, copy the service URL, e.g. `https://fiberpaykit-api.onrender.com`.
5. Verify: open `https://fiberpaykit-api.onrender.com/health` — you should see
   `{"ok":true,"mode":"mock",...}`.

> **Free tier note:** Render free web services sleep after ~15 min of inactivity
> and cold-start in ~30–50s. Hit `/health` once right before demoing to wake it.
> (Railway has no sleep if you prefer — see below.)

## Step 2 — Deploy the web app on Vercel

1. Go to <https://vercel.com/new> → import `prissca/FiberPayKit`.
2. **Important:** set **Root Directory** to `apps/web` (Project Settings →
   General → Root Directory → Edit). This is what fixes the earlier build error —
   Vercel then builds only the Next.js app, not the Fastify API.
3. Framework preset: **Next.js** (auto-detected). Leave build/install as default.
4. Add **Environment Variables**:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://fiberpaykit-api.onrender.com` |
   | `NEXT_PUBLIC_DEMO_API_KEY` | `fpk_test_demo` |
   | `NEXT_PUBLIC_WEB_URL` | `https://<your-app>.vercel.app` |

5. **Deploy.** Copy the resulting URL, e.g. `https://fiberpaykit.vercel.app`.

## Step 3 — Wire the two together (then redeploy)

On **Render** → `fiberpaykit-api` → **Environment**, set:

| Name | Value |
| --- | --- |
| `WEB_URL` | `https://<your-app>.vercel.app` |
| `API_URL` | `https://fiberpaykit-api.onrender.com` |
| `CORS_ORIGINS` | `https://<your-app>.vercel.app` |

- `WEB_URL` — so generated `checkoutUrl`s point at your Vercel site.
- `API_URL` — so the seeded demo webhook endpoint posts to the API itself.
- `CORS_ORIGINS` — so the browser dashboard/checkout can call the API.

Save (Render redeploys). If you changed `NEXT_PUBLIC_WEB_URL` on Vercel, redeploy
Vercel too.

## Step 4 — Demo it

1. Open `https://<your-app>.vercel.app/store`.
2. Click **Pay with Fiber** → redirected to the hosted checkout (QR + countdown).
3. Click **Mark paid** (mock control).
4. Status → **paid**; a signed `invoice.paid` webhook is delivered inline.
5. Open `/dashboard` (invoice paid, webhook succeeded) and
   `/dashboard/webhook-tester` (event received, **signature verified**).
6. Click **Export reconciliation CSV**.

---

## Alternative: Railway (no cold starts)

1. <https://railway.app> → New Project → Deploy from `prissca/FiberPayKit`.
2. Add a **PostgreSQL** plugin (sets `DATABASE_URL`).
3. Service settings:
   - **Build command:**
     `corepack enable && pnpm install --frozen-lockfile=false && pnpm --filter @fiberpaykit/shared build && pnpm --filter @fiberpaykit/sdk build && pnpm --filter @fiberpaykit/api build && pnpm --filter @fiberpaykit/api db:push && pnpm --filter @fiberpaykit/api db:seed`
   - **Start command:** `node apps/api/dist/index.js`
4. Set `FIBER_MODE=mock`, `JWT_SECRET`, `ENCRYPTION_KEY`, `WEB_URL`, `API_URL`,
   `CORS_ORIGINS`. Railway injects `PORT` automatically (the app honors it).

## Optional: enable the real Fiber node + Redis

- Set `FIBER_MODE=fiber-rpc` and `FIBER_RPC_URL` (server-side only) to talk to a
  real Fiber Network node.
- Add a Redis instance and set `REDIS_URL` to use the durable BullMQ webhook
  queue instead of inline delivery. Everything else is unchanged.

## Troubleshooting

- **Vercel build fails building the API / "Cannot find module '@fiberpaykit/shared'"**
  → Root Directory isn't set to `apps/web`. Set it and redeploy.
- **Dashboard shows "is the API running on port 4000?"** → `NEXT_PUBLIC_API_URL`
  is wrong/missing on Vercel, or `CORS_ORIGINS` on Render doesn't include the
  Vercel origin.
- **Checkout page 404s the invoice** → the API's `WEB_URL` and the Vercel domain
  don't match; the invoice was created with a different `checkoutUrl` base. Set
  `WEB_URL` on Render to the exact Vercel URL.
- **First request very slow** → Render free tier cold start; pre-warm `/health`.
