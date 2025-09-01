# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

# Build the application from root directory
RUN pnpm --filter @mbspro/web build

# Create a simpler directory structure for production
RUN mkdir -p /app/dist && \
    cp -r apps/web/.next /app/dist/.next && \
    cp -r apps/web/public /app/dist/public && \
    cp -r apps/web/package.json /app/dist/

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "--filter", "@mbspro/web", "start"]
