# Dockerfile – build for AstridOS (Node.js runtime)

# ---------- Base image ----------
FROM node:18-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# ---------- Build stage ----------
FROM base AS builder
COPY tsconfig.json ./
COPY src/ ./src
RUN npm run build

# ---------- Runtime for Game Master ----------
FROM base AS gm
COPY --from=builder /app/dist ./dist
ENV AGENT_TYPE=gm
CMD ["node", "dist/game_master.js"]

# ---------- Runtime for Player ----------
FROM base AS player
COPY --from=builder /app/dist ./dist
ENV AGENT_TYPE=player
CMD ["node", "dist/player_predict.js"]
