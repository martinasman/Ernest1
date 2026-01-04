// Layout-to-Tailwind class mappings for website sections
// These classes are used by the preview renderer to apply consistent layouts

export type LayoutType =
  | 'centered'
  | 'split'
  | 'split-reverse'
  | 'grid'
  | 'bento'
  | 'stacked'
  | 'alternating'
  | 'cards'

// Container classes for all sections
export const CONTAINER_CLASSES = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

// Section padding
export const SECTION_PADDING = 'py-16 md:py-24 lg:py-32'
export const SECTION_PADDING_COMPACT = 'py-12 md:py-16 lg:py-20'

// Layout wrapper classes
export const LAYOUT_CLASSES: Record<LayoutType, string> = {
  centered: 'text-center max-w-3xl mx-auto',
  split: 'grid lg:grid-cols-2 gap-12 lg:gap-16 items-center',
  'split-reverse': 'grid lg:grid-cols-2 gap-12 lg:gap-16 items-center',
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8',
  bento: 'grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]',
  stacked: 'flex flex-col gap-8 md:gap-12 max-w-3xl mx-auto',
  alternating: 'flex flex-col gap-16 md:gap-24',
  cards: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8',
}

// Text alignment classes per layout
export const TEXT_ALIGNMENT: Record<LayoutType, string> = {
  centered: 'text-center',
  split: 'text-left',
  'split-reverse': 'text-left',
  grid: 'text-left',
  bento: 'text-left',
  stacked: 'text-left',
  alternating: 'text-left',
  cards: 'text-left',
}

// Content order classes for split layouts
export const SPLIT_CONTENT_ORDER: Record<'split' | 'split-reverse', { text: string; image: string }> = {
  split: {
    text: 'lg:order-2',
    image: 'lg:order-1',
  },
  'split-reverse': {
    text: 'lg:order-1',
    image: 'lg:order-2',
  },
}

// Card classes
export const CARD_CLASSES = {
  base: 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md',
  dark: 'rounded-xl border border-gray-700 bg-gray-800 p-6',
  feature: 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
  pricing: 'rounded-xl border-2 p-8 flex flex-col',
  pricingHighlight: 'border-primary shadow-lg scale-105',
  pricingDefault: 'border-gray-200',
  testimonial: 'rounded-xl bg-gray-50 p-6',
}

// Bento grid item sizes
export const BENTO_SIZES = {
  large: 'col-span-2 row-span-2',
  wide: 'col-span-2 row-span-1',
  tall: 'col-span-1 row-span-2',
  small: 'col-span-1 row-span-1',
}

// Typography classes
export const TYPOGRAPHY = {
  h1: 'text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight',
  h2: 'text-3xl md:text-4xl font-semibold tracking-tight',
  h3: 'text-xl md:text-2xl font-semibold',
  body: 'text-base md:text-lg leading-relaxed text-gray-600',
  bodyDark: 'text-base md:text-lg leading-relaxed text-gray-300',
  small: 'text-sm text-gray-500',
  badge: 'inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary',
}

// Button classes
export const BUTTON_CLASSES = {
  primary: 'inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm',
  secondary: 'inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 transition-colors',
  ghost: 'inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors',
}

// Dark section classes
export const DARK_SECTION = {
  background: 'bg-gray-900',
  text: 'text-white',
  muted: 'text-gray-400',
  border: 'border-gray-700',
}

// Spacing utilities
export const SPACING = {
  sectionGap: 'space-y-16 md:space-y-24',
  contentGap: 'space-y-6 md:space-y-8',
  elementGap: 'space-y-4',
  inlineGap: 'gap-4',
}

// Helper function to get layout classes
export function getLayoutClasses(layout: LayoutType): string {
  return LAYOUT_CLASSES[layout] || LAYOUT_CLASSES.centered
}

// Helper function to get section wrapper classes
export function getSectionClasses(darkSection: boolean = false, compact: boolean = false): string {
  const padding = compact ? SECTION_PADDING_COMPACT : SECTION_PADDING
  const bg = darkSection ? DARK_SECTION.background : 'bg-white'
  return `${padding} ${bg}`
}

// Helper function to build complete section HTML structure
export function buildSectionStructure(
  layout: LayoutType,
  darkSection: boolean = false,
  compact: boolean = false
): { section: string; container: string; content: string } {
  return {
    section: getSectionClasses(darkSection, compact),
    container: CONTAINER_CLASSES,
    content: getLayoutClasses(layout),
  }
}

// Alternating row helper (for process/how-it-works sections)
export function getAlternatingRowClasses(index: number): { wrapper: string; text: string; image: string } {
  const isEven = index % 2 === 0
  return {
    wrapper: 'grid lg:grid-cols-2 gap-12 lg:gap-16 items-center',
    text: isEven ? 'lg:order-1' : 'lg:order-2',
    image: isEven ? 'lg:order-2' : 'lg:order-1',
  }
}

// Grid column configurations
export const GRID_COLS = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
}

// Responsive breakpoints reference (for documentation)
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}
