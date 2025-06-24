# Use an official Node runtime as the base image
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port the API runs on
EXPOSE 3000

# Start the API server
CMD ["node", "server.js"]

