FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV BETTER_AUTH_SECRET=build-time-placeholder-change-at-runtime
ENV BETTER_AUTH_URL=http://localhost:3000
ENV DATABASE_URL=postgres://muster:muster@postgres:5432/muster
ENV CI=true
RUN pnpm --filter @muster/web build
RUN mkdir -p apps/web/public

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

FROM deps AS migrate
WORKDIR /app
COPY --from=build /app .
CMD ["pnpm", "--filter", "@muster/db", "run", "db:migrate"]
