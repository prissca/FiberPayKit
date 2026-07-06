# FiberPayKit API image (monorepo-aware).
FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Install dependencies using the workspace manifests.
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/sdk/package.json packages/sdk/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile=false

# Build shared, sdk, and api.
FROM deps AS build
COPY . .
RUN pnpm --filter @fiberpaykit/shared build \
  && pnpm --filter @fiberpaykit/sdk build \
  && pnpm --filter @fiberpaykit/api db:generate \
  && pnpm --filter @fiberpaykit/api build

# Runtime: run migrations + seed on start, then launch.
FROM build AS runtime
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "pnpm db:push && pnpm db:seed || true; node dist/index.js"]
