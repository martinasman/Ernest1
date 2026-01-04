/**
 * Ernest Preview Sync Server
 *
 * Receives file updates from Ernest and writes them to the project directory.
 * Vite's HMR will automatically pick up changes and update the preview.
 */

import express from 'express'
import cors from 'cors'
import { writeFile, mkdir, rm, readdir, stat } from 'fs/promises'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const app = express()
const PORT = 3001
const PROJECT_DIR = '/app/project'

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Get current file list
app.get('/files', async (req, res) => {
  try {
    const files = await listFiles(PROJECT_DIR)
    res.json({ files })
  } catch (error) {
    console.error('Error listing files:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Sync all files
 * POST /sync
 * Body: { files: { "path/to/file": "content", ... } }
 */
app.post('/sync', async (req, res) => {
  try {
    const { files } = req.body

    if (!files || typeof files !== 'object') {
      return res.status(400).json({ error: 'Invalid files object' })
    }

    console.log(`Syncing ${Object.keys(files).length} files...`)

    // Clean existing src directory (but keep node_modules, etc.)
    const srcDir = join(PROJECT_DIR, 'src')
    if (existsSync(srcDir)) {
      await rm(srcDir, { recursive: true, force: true })
    }

    // Write all files
    const results = []
    for (const [filePath, content] of Object.entries(files)) {
      try {
        const fullPath = join(PROJECT_DIR, filePath)
        const dir = dirname(fullPath)

        // Create directory if it doesn't exist
        await mkdir(dir, { recursive: true })

        // Write file
        await writeFile(fullPath, content, 'utf-8')
        results.push({ path: filePath, status: 'success' })
        console.log(`  ✓ ${filePath}`)
      } catch (error) {
        console.error(`  ✗ ${filePath}: ${error.message}`)
        results.push({ path: filePath, status: 'error', error: error.message })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    console.log(`Sync complete: ${successCount}/${results.length} files`)

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      fileCount: results.length,
      successCount,
      results,
    })
  } catch (error) {
    console.error('Sync error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Update a single file (hot reload)
 * PUT /update
 * Body: { path: "path/to/file", content: "file content" }
 */
app.put('/update', async (req, res) => {
  try {
    const { path: filePath, content } = req.body

    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'Missing path or content' })
    }

    const fullPath = join(PROJECT_DIR, filePath)
    const dir = dirname(fullPath)

    // Create directory if it doesn't exist
    await mkdir(dir, { recursive: true })

    // Write file
    await writeFile(fullPath, content, 'utf-8')

    console.log(`Updated: ${filePath}`)

    res.json({
      success: true,
      path: filePath,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Update error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Delete a file
 * DELETE /file
 * Body: { path: "path/to/file" }
 */
app.delete('/file', async (req, res) => {
  try {
    const { path: filePath } = req.body

    if (!filePath) {
      return res.status(400).json({ error: 'Missing path' })
    }

    const fullPath = join(PROJECT_DIR, filePath)

    if (existsSync(fullPath)) {
      await rm(fullPath)
      console.log(`Deleted: ${filePath}`)
    }

    res.json({
      success: true,
      path: filePath,
      deletedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Reset project to template
 * POST /reset
 */
app.post('/reset', async (req, res) => {
  try {
    console.log('Resetting project to template...')

    // Remove everything except node_modules
    const entries = await readdir(PROJECT_DIR)
    for (const entry of entries) {
      if (entry !== 'node_modules') {
        await rm(join(PROJECT_DIR, entry), { recursive: true, force: true })
      }
    }

    // Copy template back
    const templateDir = '/app/template'
    const templateEntries = await readdir(templateDir)
    for (const entry of templateEntries) {
      if (entry !== 'node_modules') {
        const src = join(templateDir, entry)
        const dest = join(PROJECT_DIR, entry)
        const stats = await stat(src)

        if (stats.isDirectory()) {
          await copyDir(src, dest)
        } else {
          await copyFile(src, dest)
        }
      }
    }

    console.log('Reset complete')

    res.json({
      success: true,
      resetAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Reset error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Helper: List all files recursively
async function listFiles(dir, basePath = '') {
  const files = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relativePath = join(basePath, entry.name)

    if (entry.name === 'node_modules') continue

    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath, relativePath))
    } else {
      files.push(relativePath)
    }
  }

  return files
}

// Helper: Copy directory recursively
async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else {
      await copyFile(srcPath, destPath)
    }
  }
}

// Helper: Copy file
async function copyFile(src, dest) {
  const { readFile } = await import('fs/promises')
  const content = await readFile(src)
  await writeFile(dest, content)
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sync server running on port ${PORT}`)
})
