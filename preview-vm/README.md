# Ernest Preview VM

This directory contains the Docker image for Ernest's live preview system.

## Architecture

Each preview session spawns an ephemeral Fly.io machine running:
- **Vite dev server** (port 5173) - Serves the live preview
- **Sync server** (port 3001) - Receives file updates from Ernest

## Deployment

### 1. Create the Fly.io app (one-time setup)

```bash
cd preview-vm
fly apps create ernest-previews
```

### 2. Build and deploy the base image

```bash
fly deploy --image-label latest
```

### 3. Verify deployment

```bash
fly status
```

## How it works

1. User generates a website in Ernest
2. Ernest calls `/api/preview/start` which spawns a new Fly machine
3. Ernest calls `/api/preview/sync` to push generated files to the VM
4. Vite's HMR picks up the changes and updates the preview instantly
5. User edits via chat → Ernest pushes single file updates → instant refresh
6. Machine auto-stops after 30 minutes of inactivity

## Sync Server API

### Health Check
```
GET /health
```

### Sync All Files
```
POST /sync
Body: { files: { "path/to/file": "content", ... } }
```

### Update Single File (Hot Reload)
```
PUT /update
Body: { path: "path/to/file", content: "file content" }
```

### Delete File
```
DELETE /file
Body: { path: "path/to/file" }
```

### Reset to Template
```
POST /reset
```

## Local Development

To test the preview VM locally:

```bash
# Build the image
docker build -t ernest-preview .

# Run the container
docker run -p 5173:5173 -p 3001:3001 ernest-preview

# Test sync
curl -X POST http://localhost:3001/sync \
  -H "Content-Type: application/json" \
  -d '{"files": {"src/App.tsx": "export default function App() { return <div>Hello</div> }"}}'
```

## File Structure

```
preview-vm/
├── Dockerfile          # Multi-stage build for the preview VM
├── entrypoint.sh       # Starts both Vite and sync server
├── fly.toml           # Fly.io machine configuration
├── sync-server/       # Express server for file sync
│   ├── package.json
│   └── server.js
└── template/          # Base Vite + React + Tailwind project
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        └── index.css
```
