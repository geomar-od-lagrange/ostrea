FROM node:22.22.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

USER node

CMD ["node", "server.js"]

