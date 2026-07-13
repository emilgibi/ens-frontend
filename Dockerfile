FROM node:22-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Install dependencies
RUN npm install --include=dev --ignore-scripts

# Copy source code
COPY . .

# Copy environment file for build process (will be overridden by k8s env vars at runtime)
COPY .env* ./

# Generate database schema and build the application
RUN npm run db:pull && npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD [ "node", "server.js" ]