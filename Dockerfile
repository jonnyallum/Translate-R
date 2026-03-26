# Global Dockerfile for Railway WebSockets Deployment
FROM node:22-alpine AS base

WORKDIR /app

# Copy module manifest explicitly for caching
COPY server/package.json server/package-lock.json* ./server/

# Install the server block dependencies
RUN cd server && npm ci --production=false

# Copy server application source code
COPY server/src/ ./server/src/
COPY server/tsconfig.json ./server/

# Expose WebSockets port
EXPOSE 3001
ENV WS_PORT=3001
ENV NODE_ENV=production

# Boot standalone TSX process
CMD ["sh", "-c", "cd server && npx tsx src/ws/standalone.ts"]
