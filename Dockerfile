# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Stage 2: Production image
FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER app
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server-neon.js"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
