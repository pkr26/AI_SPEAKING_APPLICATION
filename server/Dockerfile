# syntax=docker/dockerfile:1

# ---- deps: full install (incl. dev deps) for building ----
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# python3/make/g++ only needed if a native module (bcrypt) has no musl prebuild
RUN apk add --no-cache python3 make g++ && npm ci

# ---- build: compile TypeScript, then trim to production deps ----
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime: prod deps + dist only, non-root ----
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runtime
WORKDIR /app
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# tsc does not copy SQL assets; the compiled migration runner reads these paths.
COPY --from=build /app/db/migrations ./dist/db/migrations
COPY --from=build /app/db/seed.sql ./dist/db/seed.sql
COPY package.json package-lock.json ./
# Compiled upload.ts writes under dist/uploads. Keep application code and
# dependencies root-owned; only this transient directory is writable.
RUN mkdir -p dist/uploads && chown node:node dist/uploads
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:4000/health"]
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/index.js"]
