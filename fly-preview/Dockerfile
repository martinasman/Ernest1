FROM node:20-alpine

WORKDIR /app

# Install dependencies for Vite and sync server
RUN npm install -g npm@latest

# Create empty package.json for initial npm install
RUN echo '{"name":"preview","type":"module","scripts":{"dev":"vite --host"}}' > package.json

# Install base dependencies that all previews need
RUN npm install vite@5 @vitejs/plugin-react@4 react@18 react-dom@18 react-router-dom@6 tailwindcss@3 autoprefixer postcss lucide-react

# Simple file sync server
COPY sync-server.js /app/sync-server.js

# Expose ports: 5173 (Vite), 3001 (sync)
EXPOSE 5173 3001

# Start sync server (Vite starts after files are synced)
CMD ["node", "sync-server.js"]
