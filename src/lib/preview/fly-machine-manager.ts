/**
 * Fly.io Machines API Manager
 * Handles creating, managing, and destroying ephemeral preview VMs
 */

const FLY_API_BASE = 'https://api.machines.dev/v1'
const FLY_APP_NAME = process.env.FLY_PREVIEW_APP_NAME || 'ernest-previews'
const FLY_API_TOKEN = process.env.FLY_API_TOKEN

// Preview VM configuration
const MACHINE_CONFIG = {
  region: 'arn', // Stockholm - closest to EU users
  size: 'shared-cpu-1x',
  memory_mb: 512,
  // Auto-stop after 10 minutes of inactivity
  auto_destroy: true,
  restart: {
    policy: 'no',
  },
}

// Docker image for preview VMs (to be built separately)
const PREVIEW_IMAGE = 'registry.fly.io/ernest-preview-base:latest'

export interface FlyMachine {
  id: string
  name: string
  state: string
  region: string
  instance_id: string
  private_ip: string
  config: {
    image: string
    env: Record<string, string>
    services: Array<{
      ports: Array<{ port: number; handlers: string[] }>
      protocol: string
      internal_port: number
    }>
  }
  created_at: string
}

export interface CreateMachineOptions {
  workspaceId: string
  name?: string
}

export interface MachineStatus {
  id: string
  state: 'starting' | 'started' | 'stopping' | 'stopped' | 'destroying' | 'destroyed'
  privateIp?: string
  previewUrl?: string
  syncUrl?: string
}

class FlyMachineManager {
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    if (!FLY_API_TOKEN) {
      throw new Error('FLY_API_TOKEN is not configured')
    }

    const url = `${FLY_API_BASE}/apps/${FLY_APP_NAME}${path}`

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${FLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Fly API error (${response.status}): ${error}`)
    }

    // Handle empty responses (e.g., DELETE)
    const text = await response.text()
    if (!text) return {} as T

    return JSON.parse(text)
  }

  /**
   * Create a new preview VM
   */
  async createMachine(options: CreateMachineOptions): Promise<FlyMachine> {
    const machineName = options.name || `preview-${options.workspaceId.slice(0, 8)}-${Date.now()}`

    const machineConfig = {
      name: machineName,
      region: MACHINE_CONFIG.region,
      config: {
        image: PREVIEW_IMAGE,
        auto_destroy: MACHINE_CONFIG.auto_destroy,
        restart: MACHINE_CONFIG.restart,
        guest: {
          cpu_kind: 'shared',
          cpus: 1,
          memory_mb: MACHINE_CONFIG.memory_mb,
        },
        env: {
          WORKSPACE_ID: options.workspaceId,
          NODE_ENV: 'development',
        },
        services: [
          // Vite dev server (public preview)
          {
            ports: [
              {
                port: 443,
                handlers: ['tls', 'http'],
              },
              {
                port: 80,
                handlers: ['http'],
              },
            ],
            protocol: 'tcp',
            internal_port: 5173,
            force_https: true,
            auto_start_machines: true,
            auto_stop_machines: true,
            min_machines_running: 0,
          },
          // Sync server (internal)
          {
            ports: [
              {
                port: 3001,
                handlers: ['http'],
              },
            ],
            protocol: 'tcp',
            internal_port: 3001,
          },
        ],
      },
    }

    return this.request<FlyMachine>('POST', '/machines', machineConfig)
  }

  /**
   * Get machine status
   */
  async getMachine(machineId: string): Promise<FlyMachine | null> {
    try {
      return await this.request<FlyMachine>('GET', `/machines/${machineId}`)
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * List all machines for the app
   */
  async listMachines(): Promise<FlyMachine[]> {
    return this.request<FlyMachine[]>('GET', '/machines')
  }

  /**
   * Wait for machine to be in desired state
   */
  async waitForState(
    machineId: string,
    targetState: string,
    timeoutMs = 60000
  ): Promise<FlyMachine> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const machine = await this.getMachine(machineId)

      if (!machine) {
        throw new Error(`Machine ${machineId} not found`)
      }

      if (machine.state === targetState) {
        return machine
      }

      if (machine.state === 'destroyed' || machine.state === 'failed') {
        throw new Error(`Machine ${machineId} entered terminal state: ${machine.state}`)
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    throw new Error(`Timeout waiting for machine ${machineId} to reach state ${targetState}`)
  }

  /**
   * Start a stopped machine
   */
  async startMachine(machineId: string): Promise<void> {
    await this.request('POST', `/machines/${machineId}/start`)
  }

  /**
   * Stop a running machine
   */
  async stopMachine(machineId: string): Promise<void> {
    await this.request('POST', `/machines/${machineId}/stop`)
  }

  /**
   * Destroy a machine permanently
   */
  async destroyMachine(machineId: string): Promise<void> {
    try {
      // First try to stop the machine
      await this.stopMachine(machineId).catch(() => {
        // Ignore errors if machine is already stopped
      })

      // Then destroy it
      await this.request('DELETE', `/machines/${machineId}?force=true`)
    } catch (error) {
      // Machine might already be destroyed
      if (error instanceof Error && !error.message.includes('404')) {
        throw error
      }
    }
  }

  /**
   * Get URLs for a running machine
   */
  getUrls(machine: FlyMachine): { previewUrl: string; syncUrl: string } {
    // Fly.io auto-assigns URLs based on machine ID and app name
    const hostname = `${machine.id}.${FLY_APP_NAME}.fly.dev`

    return {
      previewUrl: `https://${hostname}`, // Port 5173 mapped to 443
      syncUrl: `http://${machine.private_ip}:3001`, // Internal sync endpoint
    }
  }

  /**
   * Extend machine lease (keep alive)
   */
  async extendLease(machineId: string, durationSeconds = 1800): Promise<void> {
    // Fly machines don't have explicit leases, but we can update the machine
    // to reset any auto-destroy timers by updating its config
    const machine = await this.getMachine(machineId)
    if (!machine) {
      throw new Error(`Machine ${machineId} not found`)
    }

    // Touch the machine by updating env
    await this.request('POST', `/machines/${machineId}`, {
      config: {
        ...machine.config,
        env: {
          ...machine.config.env,
          LAST_ACTIVITY: new Date().toISOString(),
        },
      },
    })
  }
}

// Export singleton instance
export const flyMachineManager = new FlyMachineManager()
export default flyMachineManager
