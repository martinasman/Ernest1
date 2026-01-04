const CALCOM_API_BASE = 'https://api.cal.com/v1'

interface CalComClientConfig {
  apiKey: string
}

interface CalComUser {
  id: number
  username: string
  name: string
  email: string
  avatar?: string
}

interface CalComEventType {
  id: number
  title: string
  slug: string
  length: number
  description?: string
  hidden: boolean
}

interface CalComBooking {
  id: number
  uid: string
  title: string
  description?: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  attendees: Array<{
    id: number
    name: string
    email: string
  }>
  eventType: {
    id: number
    title: string
  }
  location?: string
  metadata?: Record<string, unknown>
}

export class CalComClient {
  private apiKey: string

  constructor(config: CalComClientConfig) {
    this.apiKey = config.apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${CALCOM_API_BASE}${endpoint}?apiKey=${this.apiKey}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Cal.com API error: ${response.status}`)
    }

    return response.json()
  }

  // Get current user (to verify API key)
  async getMe(): Promise<CalComUser> {
    const data = await this.request<{ user: CalComUser }>('/me')
    return data.user
  }

  // Get event types
  async getEventTypes(): Promise<CalComEventType[]> {
    const data = await this.request<{ event_types: CalComEventType[] }>('/event-types')
    return data.event_types
  }

  // Get bookings
  async getBookings(params?: {
    dateFrom?: string
    dateTo?: string
    status?: 'upcoming' | 'recurring' | 'past' | 'cancelled' | 'unconfirmed'
  }): Promise<CalComBooking[]> {
    let endpoint = '/bookings'

    if (params) {
      const searchParams = new URLSearchParams()
      if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom)
      if (params.dateTo) searchParams.set('dateTo', params.dateTo)
      if (params.status) searchParams.set('status', params.status)
      endpoint += `&${searchParams.toString()}`
    }

    const data = await this.request<{ bookings: CalComBooking[] }>(endpoint)
    return data.bookings
  }

  // Get single booking
  async getBooking(bookingId: number): Promise<CalComBooking> {
    const data = await this.request<{ booking: CalComBooking }>(`/bookings/${bookingId}`)
    return data.booking
  }

  // Cancel booking
  async cancelBooking(bookingId: number, reason?: string): Promise<void> {
    await this.request(`/bookings/${bookingId}/cancel`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    })
  }

  // Get availability
  async getAvailability(params: {
    eventTypeId: number
    dateFrom: string
    dateTo: string
  }): Promise<{ slots: Array<{ time: string }> }> {
    const searchParams = new URLSearchParams({
      eventTypeId: String(params.eventTypeId),
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    })

    return this.request(`/availability?${searchParams.toString()}`)
  }
}

// Create client from API key
export function createCalComClient(apiKey: string): CalComClient {
  return new CalComClient({ apiKey })
}

// Verify API key is valid
export async function verifyCalComApiKey(apiKey: string): Promise<{
  valid: boolean
  user?: CalComUser
  error?: string
}> {
  try {
    const client = createCalComClient(apiKey)
    const user = await client.getMe()
    return { valid: true, user }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid API key',
    }
  }
}
