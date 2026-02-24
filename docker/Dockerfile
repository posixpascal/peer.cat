# ========================================
# peer.cat — Multi-stage Docker Build
# ========================================

# Stage 1: Build the client
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY tsconfig.json vite.config.ts ./
COPY src/ src/
COPY public/ public/

RUN npx tsc --noEmit && npx vite build

# Stage 2: Production runtime
FROM node:22-alpine AS runtime

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built client
COPY --from=builder /app/dist ./dist

# Copy server source (runs via tsx)
COPY src/server/ src/server/
COPY src/shared/ src/shared/
COPY tsconfig.json ./

# Install tsx for running TypeScript server
RUN npm install tsx --save-dev

# Expose ports
# 3000 = Static file server (vite preview)
# 8080 = Signaling WebSocket server
# 41337 = BitTorrent tracker
EXPOSE 3000 8080 41337

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Run signaling server + static file server
CMD ["npx", "concurrently", \
  "npx tsx src/server/index.ts", \
  "npx vite preview --host 0.0.0.0 --port 3000"]
