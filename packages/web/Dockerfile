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

# Set API URL at build time
ENV NEXT_PUBLIC_API_URL=https://fleetos-api-rdwp.onrender.com

# Build
RUN pnpm --filter @fleetos/shared build
RUN pnpm --filter @fleetos/web build

# Copy standalone to a clean location
RUN mkdir -p /app/run
RUN cp -r packages/web/.next/standalone/* /app/run/
RUN mkdir -p /app/run/packages/web/.next/static
RUN cp -r packages/web/.next/static/* /app/run/packages/web/.next/static/
RUN cp -r packages/web/public /app/run/packages/web/public 2>/dev/null || true

WORKDIR /app/run/packages/web

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
