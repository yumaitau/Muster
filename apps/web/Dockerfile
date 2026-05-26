FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
ENV BETTER_AUTH_SECRET=build-time-placeholder-change-at-runtime
ENV BETTER_AUTH_URL=http://localhost:3000
ENV DATABASE_URL=postgres://muster:muster@postgres:5432/muster
RUN pnpm --filter @muster/web build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:migrate && pnpm --filter @muster/web start"]
