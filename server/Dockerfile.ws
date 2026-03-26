# server/Dockerfile.ws
# Dockerfile for the standalone WebSocket server
# Deploy this on Railway, Render, or Fly.io (Vercel can't do long-lived WS)
#
# Build: docker build -f Dockerfile.ws -t translate-r-ws .
# Run:   docker run -p 3001:3001 --env-file .env translate-r-ws

FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY server/package.json server/package-lock.json* server/
RUN cd server && npm ci --production=false

# Copy source
COPY server/src/ server/src/
COPY server/tsconfig.json server/

# Build (if using tsc)
# RUN npx tsc

# Run with tsx (TypeScript execution)
EXPOSE 3001
ENV WS_PORT=3001
ENV NODE_ENV=production

CMD ["sh", "-c", "cd server && npx tsx src/ws/standalone.ts"]
