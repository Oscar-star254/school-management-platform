FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false
COPY server ./server
COPY src/domain.ts ./src/domain.ts
EXPOSE 3001
CMD ["pnpm", "api:start"]
