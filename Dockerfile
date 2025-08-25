# Dockerfile for MBSPro Frontend Deployment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install
RUN cd packages/shared && npm install
RUN cd apps/web && npm install

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build the shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build the frontend
WORKDIR /app/apps/web
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
