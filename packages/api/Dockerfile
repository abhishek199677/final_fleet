FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json packages/api/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/api/ packages/api/
COPY packages/shared/ packages/shared/

# Build
RUN pnpm --filter @fleetos/shared build
RUN pnpm --filter @fleetos/api build

# Expose port
EXPOSE 3001

# Start
CMD ["node", "packages/api/dist/main.js"]
