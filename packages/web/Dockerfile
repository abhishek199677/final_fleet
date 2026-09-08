FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/web/package.json packages/web/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source and configs
COPY packages/web/ packages/web/
COPY packages/shared/ packages/shared/
COPY tsconfig.base.json ./

# Build
RUN pnpm --filter @fleetos/shared build
RUN pnpm --filter @fleetos/web build

# Copy standalone output to root
RUN cp -r packages/web/.next/standalone ./
RUN mkdir -p .next/static && cp -r packages/web/.next/static/* ./.next/static/
RUN cp -r packages/web/public ./public || true

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
