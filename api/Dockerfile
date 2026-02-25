FROM node:22.22.0-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22.22.0-alpine

# Remove npm (and its bundled glob/tar) — not needed at runtime
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

USER 1000

CMD ["node", "server.js"]

