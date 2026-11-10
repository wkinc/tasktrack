FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DB_PATH=/data/tasks.db
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY public ./public
RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/server.js"]