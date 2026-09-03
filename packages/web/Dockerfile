FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/web/package.json packages/web/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/web/ packages/web/
COPY packages/shared/ packages/shared/

# Build
RUN pnpm --filter @fleetos/shared build
RUN pnpm --filter @fleetos/web build

# Expose port
EXPOSE 3000

# Start
CMD ["node", "packages/web/server.js"]
