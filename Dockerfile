# Multi-stage production Dockerfile for CNTCollect on Google Cloud Run
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build Vite frontend assets
RUN npm run build

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/data ./data
COPY --from=builder /app/migrations ./migrations

# Expose HTTP port for Cloud Run
EXPOSE 3000

# Start server using tsx runtime
CMD ["npm", "start"]
