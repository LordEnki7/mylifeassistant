# Stage 1 — Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDeps needed for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build frontend (Vite → dist/public) + backend (esbuild → dist/index.js)
RUN npm run build

# Stage 2 — Production runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the entire built dist folder (contains both server + client)
COPY --from=builder /app/dist ./dist

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
