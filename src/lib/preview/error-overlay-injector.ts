/**
 * Error Overlay Injection Script
 *
 * This script gets injected into the preview HTML to:
 * 1. Add "Ask Ernest to Fix" buttons to Vite error overlays
 * 2. Capture runtime errors and send them to the parent window
 * 3. Handle unhandled promise rejections
 */

export const ERROR_OVERLAY_INJECTION_SCRIPT = `
(function() {
  // Wait for Vite error overlay to appear and inject fix button
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Check if this is a Vite error overlay with shadowRoot
          const elem = node as Element
          if (elem.shadowRoot) {
            injectFixButton(elem.shadowRoot)
          }
        }
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  function injectFixButton(shadowRoot: ShadowRoot) {
    // Check if this is a Vite error overlay
    const messageEl = shadowRoot.querySelector('.message') || shadowRoot.querySelector('[class*="message"]')
    if (!messageEl) return

    // Check if button already exists to avoid duplicates
    if (shadowRoot.querySelector('.ernest-fix-button')) return

    // Create Ernest fix button
    const fixButton = document.createElement('button')
    fixButton.className = 'ernest-fix-button'
    fixButton.innerHTML = '🤖 Ask Ernest to Fix This'
    fixButton.style.cssText = \`
      margin-top: 16px;
      padding: 12px 24px;
      background: #c8ff00;
      color: #1a1a1a;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: all 0.2s ease;
      font-family: inherit;
    \`

    fixButton.addEventListener('mouseenter', () => {
      fixButton.style.background = '#b8ef00'
      fixButton.style.transform = 'translateY(-2px)'
      fixButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'
    })

    fixButton.addEventListener('mouseleave', () => {
      fixButton.style.background = '#c8ff00'
      fixButton.style.transform = 'translateY(0)'
      fixButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
    })

    fixButton.addEventListener('click', () => {
      // Extract error message from the overlay
      const messageText = messageEl?.textContent || 'Unknown error'
      const stackEl = shadowRoot.querySelector('.stack') || shadowRoot.querySelector('[class*="stack"]')
      const stackTrace = stackEl?.textContent || ''

      // Send error to parent window
      window.parent.postMessage({
        source: 'ernest-preview',
        type: 'error-fix-request',
        message: messageText.slice(0, 500),
        stack: stackTrace.slice(0, 1000),
        url: window.location.href
      }, '*')

      // Visual feedback
      fixButton.innerHTML = '✓ Sent to Ernest'
      fixButton.style.background = '#10b981'
      fixButton.style.color = 'white'
      fixButton.style.cursor = 'not-allowed'

      setTimeout(() => {
        fixButton.innerHTML = '🤖 Ask Ernest to Fix This'
        fixButton.style.background = '#c8ff00'
        fixButton.style.color = '#1a1a1a'
        fixButton.style.cursor = 'pointer'
      }, 2500)
    })

    // Insert button after error message
    const container = shadowRoot.querySelector('.window') || shadowRoot.querySelector('.frame')
    const insertAfter = shadowRoot.querySelector('.tip') || shadowRoot.querySelector('[class*="tip"]')

    if (insertAfter && insertAfter.parentNode) {
      insertAfter.parentNode.insertBefore(fixButton, insertAfter.nextSibling)
    } else if (container) {
      container.appendChild(fixButton)
    }
  }

  // Catch unhandled runtime errors
  window.addEventListener('error', (event) => {
    window.parent.postMessage({
      source: 'ernest-preview',
      type: 'runtime-error',
      message: event.message || 'Unknown error',
      stack: event.error?.stack || '',
      url: window.location.href,
      lineno: event.lineno,
      colno: event.colno
    }, '*')
  })

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = (reason && typeof reason === 'object' && 'message' in reason)
      ? (reason as any).message
      : String(reason)
    const stack = (reason && typeof reason === 'object' && 'stack' in reason)
      ? (reason as any).stack
      : ''

    window.parent.postMessage({
      source: 'ernest-preview',
      type: 'runtime-error',
      message: message || 'Unhandled Promise Rejection',
      stack: stack || '',
      url: window.location.href
    }, '*')
  })
})()
`
