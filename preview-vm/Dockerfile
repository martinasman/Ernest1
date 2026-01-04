# Ernest Preview VM Base Image
# This image runs ephemeral preview servers on Fly.io

FROM node:20-slim

# Install essential tools
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create project structure
RUN mkdir -p /app/project /app/sync-server

# Copy sync server
COPY sync-server/ /app/sync-server/

# Install sync server dependencies
WORKDIR /app/sync-server
RUN npm install

# Copy Vite template project
COPY template/ /app/template/

# Install template dependencies (cached in image)
WORKDIR /app/template
RUN npm install

# Copy project files to working directory
RUN cp -r /app/template/* /app/project/

# Set working directory to project
WORKDIR /app/project

# Expose ports
# 5173 - Vite dev server (preview)
# 3001 - Sync server (file updates)
EXPOSE 5173 3001

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Start both servers
CMD ["/app/entrypoint.sh"]
