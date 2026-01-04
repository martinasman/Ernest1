'use client'

import { useEffect, useRef } from 'react'

interface CalComEmbedProps {
  calLink: string
  config?: {
    layout?: 'month_view' | 'week_view' | 'column_view'
    theme?: 'light' | 'dark' | 'auto'
    hideEventTypeDetails?: boolean
    brandColor?: string
  }
  className?: string
}

export function CalComEmbed({ calLink, config = {}, className }: CalComEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load Cal.com embed script
    const script = document.createElement('script')
    script.src = 'https://app.cal.com/embed/embed.js'
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      // Initialize Cal.com embed
      if (window.Cal && containerRef.current) {
        window.Cal('init', {
          origin: 'https://app.cal.com',
        })

        window.Cal('inline', {
          elementOrSelector: containerRef.current,
          calLink,
          config: {
            layout: config.layout || 'month_view',
            theme: config.theme || 'auto',
            hideEventTypeDetails: config.hideEventTypeDetails ?? false,
            styles: {
              branding: {
                brandColor: config.brandColor || '#2563eb',
              },
            },
          },
        })
      }
    }

    return () => {
      // Cleanup
      document.body.removeChild(script)
    }
  }, [calLink, config])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: '500px', width: '100%' }}
    />
  )
}

// Declare Cal on window for TypeScript
declare global {
  interface Window {
    Cal?: (action: string, ...args: unknown[]) => void
  }
}

// Popup booking modal
export function openCalComModal(calLink: string) {
  if (typeof window !== 'undefined') {
    // Load script if not already loaded
    if (!document.querySelector('script[src*="cal.com/embed"]')) {
      const script = document.createElement('script')
      script.src = 'https://app.cal.com/embed/embed.js'
      script.async = true
      document.body.appendChild(script)

      script.onload = () => {
        window.Cal?.('init', { origin: 'https://app.cal.com' })
        window.Cal?.('modal', { calLink })
      }
    } else {
      window.Cal?.('modal', { calLink })
    }
  }
}
