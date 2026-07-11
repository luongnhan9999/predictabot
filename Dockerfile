# Dockerfile – build for AstridOS (Node.js runtime)

# ---------- Base image ----------
FROM node:18-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- Build stage ----------
FROM base AS builder
COPY tsconfig.json ./
COPY src/ ./src
RUN npm run build

# ---------- Runtime ----------
FROM base AS runtime
COPY --from=builder /app/dist ./dist
CMD ["npm", "run", "start:all"]
