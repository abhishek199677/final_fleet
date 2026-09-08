FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json packages/api/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/api/ packages/api/
COPY packages/shared/ packages/shared/
COPY packages/db/ packages/db/

# Build
RUN pnpm --filter @fleetos/shared build
RUN pnpm --filter @fleetos/api build

# Make startup script executable
RUN chmod +x packages/api/start.sh

EXPOSE 3001

CMD ["sh", "packages/api/start.sh"]
