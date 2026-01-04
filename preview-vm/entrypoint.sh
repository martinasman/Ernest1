#!/bin/bash

# Ernest Preview VM Entrypoint
# Starts both the Vite dev server and the sync server

set -e

echo "Starting Ernest Preview VM..."

# Start sync server in background
echo "Starting sync server on port 3001..."
cd /app/sync-server
node server.js &
SYNC_PID=$!

# Wait for sync server to be ready
sleep 2

# Start Vite dev server
echo "Starting Vite dev server on port 5173..."
cd /app/project
npm run dev &
VITE_PID=$!

# Handle shutdown gracefully
trap "kill $SYNC_PID $VITE_PID 2>/dev/null; exit 0" SIGTERM SIGINT

echo "Preview VM ready!"
echo "- Vite preview: http://localhost:5173"
echo "- Sync server: http://localhost:3001"

# Keep container running
wait
