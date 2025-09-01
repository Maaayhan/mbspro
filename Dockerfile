# Multi-stage build for MBSPro
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build shared package
RUN pnpm --filter @mbspro/shared run build

# Build API
RUN pnpm --filter @mbspro/api run build

# Build Web
RUN pnpm --filter @mbspro/web run build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy built applications
COPY --from=base /app/apps/api/dist ./api/dist
COPY --from=base /app/apps/api/package.json ./api/
COPY --from=base /app/apps/web/.next ./web/.next
COPY --from=base /app/apps/web/public ./web/public
COPY --from=base /app/apps/web/package.json ./web/
COPY --from=base /app/packages/shared/dist ./shared/dist
COPY --from=base /app/packages/shared/package.json ./shared/

# Install production dependencies
RUN cd api && pnpm install --prod
RUN cd web && pnpm install --prod
RUN cd shared && pnpm install --prod

# Expose ports
EXPOSE 3000 3001

# Start both services
CMD ["sh", "-c", "cd api && pnpm start & cd web && pnpm start & wait"]
