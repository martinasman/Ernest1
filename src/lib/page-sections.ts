// Section definitions per page type
// Mirrors the determinePages logic in website-generator.ts

export const PAGE_SECTIONS: Record<string, string[]> = {
  // Home page
  'home': ['hero', 'features', 'testimonials', 'cta'],
  '/': ['hero', 'features', 'testimonials', 'cta'],

  // About page
  'about': ['about', 'team', 'values'],
  '/about': ['about', 'team', 'values'],

  // Contact page
  'contact': ['contact', 'location'],
  '/contact': ['contact', 'location'],

  // Services page
  'services': ['services', 'pricing'],
  '/services': ['services', 'pricing'],

  // Pricing page
  'pricing': ['pricing', 'faq'],
  '/pricing': ['pricing', 'faq'],

  // Menu page (restaurants)
  'menu': ['menu'],
  '/menu': ['menu'],

  // Reservations page
  'reservations': ['booking'],
  '/reservations': ['booking'],

  // Book page
  'book': ['booking'],
  '/book': ['booking'],

  // Features page
  'features': ['features', 'comparison'],
  '/features': ['features', 'comparison'],

  // Products page
  'products': ['products'],
  '/products': ['products'],

  // Work/Portfolio page
  'work': ['portfolio', 'case-studies'],
  '/work': ['portfolio', 'case-studies'],

  // Gallery page
  'gallery': ['gallery'],
  '/gallery': ['gallery'],
}

// Human-readable labels for section types
export const SECTION_LABELS: Record<string, string> = {
  'hero': 'Hero Section',
  'features': 'Features',
  'testimonials': 'Testimonials',
  'cta': 'Call to Action',
  'about': 'About',
  'team': 'Team',
  'values': 'Values',
  'contact': 'Contact Form',
  'location': 'Location',
  'menu': 'Menu',
  'booking': 'Booking',
  'services': 'Services',
  'pricing': 'Pricing',
  'faq': 'FAQ',
  'comparison': 'Comparison',
  'products': 'Products',
  'portfolio': 'Portfolio',
  'case-studies': 'Case Studies',
  'gallery': 'Gallery',
  'content': 'Content',
}

/**
 * Get the list of sections for a given page slug
 */
export function getSectionsForPage(pageSlug: string): string[] {
  // Normalize the slug (handle with/without leading slash)
  const normalized = pageSlug.replace(/^\//, '').toLowerCase()

  return PAGE_SECTIONS[normalized] ||
         PAGE_SECTIONS[`/${normalized}`] ||
         ['hero', 'content', 'cta'] // Default sections
}

/**
 * Get human-readable label for a section type
 */
export function getSectionLabel(sectionType: string): string {
  return SECTION_LABELS[sectionType] ||
    sectionType
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
}
