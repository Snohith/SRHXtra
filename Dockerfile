# syntax=docker/dockerfile:1.7
#
# Production images for the API, outbox worker, public web, and admin apps.
# Build one target at a time:
#   docker build --target api -t srh-api .
#   docker build --target worker -t srh-worker .
#   docker build --target web --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://www.example.com -t srh-web .
#
# The Next.js build pre-renders ISR pages and therefore needs the API to be
# reachable at build time. For the api/worker targets no public API is needed.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@12.14.0 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile

FROM build AS build-api
# The ellipsis builds the shared contracts package first. Deploy creates an
# isolated production bundle (dist, migrations, prod-only node_modules).
RUN pnpm --filter @srh/api... build \
 && pnpm --filter @srh/api deploy --prod /out/api

FROM build AS build-frontends
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_IMAGE_HOSTS=""
ENV NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
    NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL}" \
    NEXT_PUBLIC_IMAGE_HOSTS="${NEXT_PUBLIC_IMAGE_HOSTS}"
# Build shared contracts first, then the two Next apps sequentially. The
# default Turborepo graph can start a Next build while contracts is still
# emitting dist on a cold store.
# Requires the API in NEXT_PUBLIC_API_URL to be reachable from the build.
RUN pnpm --filter @srh/contracts build \
 && pnpm --filter @srh/web build \
 && pnpm --filter @srh/admin build \
 && rm -rf apps/web/.next/cache apps/admin/.next/cache \
 && pnpm --filter @srh/web deploy --prod /out/web \
 && pnpm --filter @srh/admin deploy --prod /out/admin

FROM base AS api
COPY --from=build-api --chown=node:node /out/api /app
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
ENV NODE_ENV=production \
    API_PORT=4000 \
    UPLOADS_DIR=/app/uploads
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM base AS worker
COPY --from=build-api --chown=node:node /out/api /app
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
ENV NODE_ENV=production \
    UPLOADS_DIR=/app/uploads
CMD ["node", "dist/worker.js"]

FROM base AS web
COPY --from=build-frontends --chown=node:node /out/web /app
# next.config.mjs imports ../../packages/config relative to apps/web; keep that
# sibling path available after pnpm deploy flattens the app to /app.
COPY --from=build --chown=node:node /app/packages/config /packages/config
USER node
ENV NODE_ENV=production
WORKDIR /app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]

FROM base AS admin
COPY --from=build-frontends --chown=node:node /out/admin /app
# Same relative import as the web config.
COPY --from=build --chown=node:node /app/packages/config /packages/config
USER node
ENV NODE_ENV=production
WORKDIR /app
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3001"]
