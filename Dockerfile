# Léo platform — production image
# Node 22 is required: the data layer uses the built-in node:sqlite module (ADR-001).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build needs a database file present (RSC pages read the curriculum at build probing).
RUN DATABASE_FILE=/app/build.db node db/seed.mjs \
 && DATABASE_FILE=/app/build.db NEXTAUTH_SECRET=build-placeholder NEXTAUTH_URL=http://localhost:3000 npm run build \
 && rm -f /app/build.db*

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S leo && adduser -S leo -G leo

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json next.config.mjs ./
COPY db ./db
COPY src ./src
COPY tsconfig.json ./

# SQLite lives on a mounted volume in production
VOLUME ["/data"]
ENV DATABASE_FILE=/data/leo.db PORT=3000
EXPOSE 3000

USER leo
# Seed is idempotent: safe to run on every start (creates schema + content if missing).
CMD ["sh", "-c", "node db/seed.mjs && npx next start -p ${PORT}"]
