# syntax=docker/dockerfile:1

# ------------------------------------------------------------------
# Frontend image for the underwriting UI (Vite + React + TS + Tailwind).
# Multi-stage: build the static bundle, then serve it with `vite preview`
# (handles SPA fallback for client-side routing). Only vite + its runtime
# closure are installed in the serve stage, keeping it small.
# The API base URL is injected at build time via VITE_API_BASE_URL.
# ------------------------------------------------------------------

# ---- Build stage ----
FROM node:22-alpine AS build

WORKDIR /app

# Install deps first (better layer caching). npm ci can hit transient
# ECONNRESET when fetching many tarballs concurrently, so add retries.
COPY package.json package-lock.json ./
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Copy source and build.
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ---- Serve stage ----
FROM node:22-alpine AS serve

WORKDIR /app

ENV NODE_ENV=production

# Copy the built bundle and a minimal package.json, then install only the
# vite runtime closure needed by `vite preview`.
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
RUN npm install --no-save vite --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

EXPOSE 5173

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]
