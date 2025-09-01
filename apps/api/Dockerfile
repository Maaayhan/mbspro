# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Build the application from root directory
RUN pnpm --filter @mbspro/api build

# Create a simpler directory structure for production
RUN mkdir -p /app/dist && \
    cp -r dist/apps/api/src/* /app/dist/ && \
    cp -r dist/packages/shared/src/* /app/dist/shared/

# Expose port
EXPOSE 4000

# Start the application
CMD ["node", "dist/main.js"]
