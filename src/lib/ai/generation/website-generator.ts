import { generateText } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import type { BusinessPlan } from './planner'
import { getWorkspaceIntegrations } from '@/lib/integrations/get-workspace-integrations'
import { hexToHSL } from './brand-generator'
import { ERROR_OVERLAY_INJECTION_SCRIPT } from '@/lib/preview/error-overlay-injector'

// Brand type from database
interface BrandColors {
  primary?: string
  primaryLight?: string
  primaryDark?: string
  secondary?: string
  secondaryLight?: string
  accent?: string
  background?: string
  foreground?: string
  muted?: string
  mutedForeground?: string
  success?: string
  warning?: string
  destructive?: string
}

interface BrandFonts {
  heading?: string
  headingWeight?: string
  body?: string
  bodyWeight?: string
}

interface Brand {
  name?: string
  tagline?: string
  colors?: BrandColors
  fonts?: BrandFonts
  tone_of_voice?: string
  border_radius?: string
}

// Overview type from database
interface Overview {
  problems?: string[]
  solutions?: string[]
  unique_value_proposition?: string
  high_level_concept?: string
  unfair_advantage?: string
  customer_segments?: unknown[]
  early_adopters?: string
  channels?: string[]
  revenue_streams?: unknown[]
}

// Progress callback for streaming updates
export type PageProgressCallback = (update: {
  type: 'page_start' | 'page_done' | 'file_start' | 'file_done'
  name: string
  current?: number
  total?: number
}) => void

// Generated website structure
export interface GeneratedWebsite {
  pages: Array<{
    slug: string
    title: string
    code: string
  }>
  files: Record<string, string>
}

// Page definition for generation
interface PageDefinition {
  slug: string
  title: string
  sections: string[]
}

// System prompt for generating React code
const WEBSITE_SYSTEM_PROMPT = `You are an expert React developer creating beautiful, modern, UNIQUE websites.

## CRITICAL: OUTPUT FORMAT
Return ONLY valid TypeScript React code. No markdown. No code fences. No explanations.
The code must be a complete, working React component.

## CRITICAL: USE CSS VARIABLES FOR ALL COLORS
You MUST use these Tailwind classes that map to CSS variables:

BACKGROUNDS:
- bg-background (main page background)
- bg-foreground (inverted sections for contrast)
- bg-primary (brand color backgrounds)
- bg-primary/10, bg-primary/20 (transparent brand tints)
- bg-secondary (secondary brand color)
- bg-accent (highlight/accent areas)
- bg-muted (subtle card/section backgrounds)

TEXT:
- text-foreground (main text on light backgrounds)
- text-background (text on dark/inverted sections)
- text-primary (brand colored text)
- text-primary-foreground (text ON primary backgrounds)
- text-muted-foreground (subtle/secondary text)

BORDERS:
- border-border (all borders)
- border-primary (accent borders)

NEVER USE:
- bg-gray-*, bg-white, bg-black, bg-blue-*, bg-slate-*, etc.
- text-gray-*, text-white, text-black, etc.
- Any hardcoded hex colors like #ffffff, #000000
- Any Tailwind color that isn't a CSS variable class

## DESIGN PRINCIPLES

Create VISUALLY STUNNING and UNIQUE layouts tailored to the business type:

1. CREATIVE LAYOUTS - Don't just center everything
   - Asymmetric grids
   - Overlapping elements with z-index
   - Bento-style mixed grid sizes
   - Split layouts with creative angles
   - Full-bleed sections with text overlays

2. VISUAL INTEREST
   - Gradient backgrounds: bg-gradient-to-br from-primary/10 via-background to-accent/5
   - Decorative blurred shapes: <div className="absolute -z-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
   - Creative use of whitespace
   - Subtle animations

3. MODERN EFFECTS
   - Glassmorphism: bg-background/80 backdrop-blur-md
   - Soft shadows: shadow-xl shadow-primary/10
   - Hover animations: hover:scale-105 hover:-translate-y-1 transition-all duration-300
   - Border glows: ring-2 ring-primary/20

4. TYPOGRAPHY HIERARCHY
   - Hero headlines: text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight
   - Section headlines: text-3xl md:text-4xl font-bold
   - Large body text: text-lg md:text-xl text-muted-foreground
   - Proper line heights: leading-tight for headlines, leading-relaxed for body

5. RESPONSIVE DESIGN
   - Mobile-first with md: and lg: breakpoints
   - Generous sections: py-20 md:py-28 lg:py-32
   - Breathing room: space-y-6, gap-8
   - Max widths: max-w-3xl for text blocks, max-w-7xl for layouts

## COMPONENT STRUCTURE

Always use this exact structure:
\`\`\`tsx
'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconName } from 'lucide-react'

export default function PageName() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sections here */}
    </div>
  )
}
\`\`\`

## AVAILABLE IMPORTS
- react: useState, useEffect, useCallback, useMemo
- react-router-dom: Link
- lucide-react: Any icon (ArrowRight, Star, Check, Users, Zap, Heart, Clock, Mail, Phone, MapPin, Calendar, Menu, X, ChevronDown, Play, Quote, Building, Utensils, Sparkles, Shield, Award, Target, TrendingUp, BarChart, etc.)

## MAKE IT UNIQUE
Every business should have a DIFFERENT visual style:
- Restaurants: Warm, inviting, food imagery focus, earth tones feel, elegant typography
- Tech/SaaS: Clean, modern, gradient accents, floating cards, geometric shapes
- Wellness/Spa: Soft, calming, lots of whitespace, organic shapes, gentle curves
- Professional services: Structured, trustworthy, subtle animations, balanced layouts
- Creative agencies: Bold, artistic, unconventional layouts, dynamic elements
- E-commerce: Product-focused, clear CTAs, trust indicators, conversion-optimized

Remember: You're creating a real website, not a template. Be creative.`

/**
 * Generate a complete website with actual React code
 */
export async function generateWebsite(
  plan: BusinessPlan,
  brand: Brand | null,
  overview: Overview | null,
  model?: string,
  workspaceId?: string,
  onProgress?: PageProgressCallback
): Promise<GeneratedWebsite> {
  const modelId = getModelId(model || DEFAULT_MODEL)

  // Get integration status if workspaceId provided
  let integrations = {
    calcom: { connected: false, username: null as string | null, eventSlug: null as string | null },
    stripe: { connected: false, accountId: null as string | null },
  }

  if (workspaceId) {
    try {
      integrations = await getWorkspaceIntegrations(workspaceId)
    } catch (e) {
      console.warn('Could not fetch integrations:', e)
    }
  }

  // Build context from brand and overview
  const brandContext = buildBrandContext(brand)
  const overviewContext = buildOverviewContext(overview)
  const businessContext = buildBusinessContext(plan, brandContext, overviewContext)

  // Determine pages to generate based on business type
  const pagesToGenerate = determinePages(plan)

  // Generate each page as actual React code
  const pages: GeneratedWebsite['pages'] = []
  const totalPages = pagesToGenerate.length

  for (let i = 0; i < pagesToGenerate.length; i++) {
    const pageDef = pagesToGenerate[i]
    const fileName = pageDef.slug === '/' ? 'Home' : toPascalCase(pageDef.slug)

    // Notify start of page generation
    onProgress?.({
      type: 'page_start',
      name: `${fileName}.tsx`,
      current: i + 1,
      total: totalPages,
    })

    const code = await generatePageCode({
      pageDef,
      businessContext,
      plan,
      brand,
      integrations,
      modelId,
    })
    pages.push({
      slug: pageDef.slug,
      title: pageDef.title,
      code,
    })

    // Notify completion of page generation
    onProgress?.({
      type: 'page_done',
      name: `${fileName}.tsx`,
      current: i + 1,
      total: totalPages,
    })
  }

  // Generate supporting files
  const files: Record<string, string> = {}

  // Global CSS with brand variables
  files['src/index.css'] = generateGlobalCSS(brand)

  // Main entry point
  files['src/main.tsx'] = generateMainTsx()

  // App.tsx with routing
  files['src/App.tsx'] = generateAppTsx(pages, brand)

  // Navbar component
  onProgress?.({ type: 'file_start', name: 'Navbar.tsx' })
  files['src/components/Navbar.tsx'] = await generateNavbarCode({
    pages: pagesToGenerate,
    businessName: brand?.name || plan.business.description.split(' ').slice(0, 2).join(' '),
    plan,
    modelId,
  })
  onProgress?.({ type: 'file_done', name: 'Navbar.tsx' })

  // Footer component
  onProgress?.({ type: 'file_start', name: 'Footer.tsx' })
  files['src/components/Footer.tsx'] = await generateFooterCode({
    pages: pagesToGenerate,
    brand,
    plan,
    modelId,
  })
  onProgress?.({ type: 'file_done', name: 'Footer.tsx' })

  // Integrations config for runtime checks
  files['src/lib/integrations.ts'] = generateIntegrationsConfig(integrations)

  // useIntegrations hook for preview
  files['src/hooks/useIntegrations.ts'] = generateUseIntegrationsHook()

  // Add page files
  for (const page of pages) {
    const fileName = page.slug === '/' ? 'Home' : toPascalCase(page.slug)
    files[`src/pages/${fileName}.tsx`] = page.code
  }

  // Config files
  files['package.json'] = generatePackageJson(plan, brand)
  files['tailwind.config.js'] = generateTailwindConfig()
  files['postcss.config.js'] = generatePostCSSConfig()
  files['vite.config.ts'] = generateViteConfig()
  files['index.html'] = generateIndexHtml(brand)
  files['tsconfig.json'] = generateTSConfig()

  return { pages, files }
}

/**
 * Build brand context string for prompts
 */
function buildBrandContext(brand: Brand | null): string {
  if (!brand) return ''

  return `
BRAND IDENTITY (Apply this styling throughout):
- Business Name: ${brand.name || 'Not specified'}
- Tagline: ${brand.tagline || 'Not specified'}
- Tone of Voice: ${brand.tone_of_voice || 'Professional yet approachable'}
- Border Radius Style: ${brand.border_radius || 'md'} (none=sharp corners, sm=subtle, md=rounded, lg=very rounded, xl=pill-shaped)

The CSS variables are already configured. Just use the Tailwind classes like bg-primary, text-foreground, etc.`
}

/**
 * Build overview context string for prompts
 */
function buildOverviewContext(overview: Overview | null): string {
  if (!overview) return ''

  return `
BUSINESS CONTEXT (from Lean Canvas):
- Unique Value Proposition: ${overview.unique_value_proposition || 'Not defined'}
- High-Level Concept: ${overview.high_level_concept || 'Not defined'}
- Problems We Solve: ${overview.problems?.join(', ') || 'Not defined'}
- Our Solutions: ${overview.solutions?.join(', ') || 'Not defined'}
- Unfair Advantage: ${overview.unfair_advantage || 'Not defined'}
- Early Adopters: ${overview.early_adopters || 'Not defined'}
- Customer Segments: ${JSON.stringify(overview.customer_segments) || 'General audience'}

Use this information to create compelling, SPECIFIC content. Headlines should address problems, features should map to solutions.`
}

/**
 * Build full business context for prompts
 */
function buildBusinessContext(plan: BusinessPlan, brandContext: string, overviewContext: string): string {
  return `
BUSINESS:
- Type: ${plan.business.type}
- Industry: ${plan.business.industry}${plan.business.subIndustry ? ` (${plan.business.subIndustry})` : ''}
- Description: ${plan.business.description}
- Unique Value: ${plan.business.uniqueValue}

TARGET AUDIENCE:
- Demographics: ${plan.audience.primary.demographics.join(', ')}
- Psychographics: ${plan.audience.primary.psychographics.join(', ')}
- Pain Points: ${plan.audience.primary.painPoints.join(', ')}
- Goals: ${plan.audience.primary.goals.join(', ')}
${brandContext}
${overviewContext}`
}

/**
 * Determine which pages to generate based on business type
 */
function determinePages(plan: BusinessPlan): PageDefinition[] {
  const businessType = plan.business.type
  const industry = plan.business.industry.toLowerCase()

  // Base pages everyone gets
  const pages: PageDefinition[] = [
    { slug: '/', title: 'Home', sections: ['hero', 'features', 'testimonials', 'cta'] },
    { slug: '/about', title: 'About', sections: ['about', 'team', 'values'] },
    { slug: '/contact', title: 'Contact', sections: ['contact', 'location'] },
  ]

  // Business-specific pages
  if (['restaurant', 'cafe', 'bar', 'bakery', 'food'].some(t => industry.includes(t))) {
    pages.push({ slug: '/menu', title: 'Menu', sections: ['menu'] })
    pages.push({ slug: '/reservations', title: 'Reservations', sections: ['booking'] })
  } else if (['salon', 'spa', 'fitness', 'wellness', 'yoga', 'gym', 'healthcare', 'dental', 'medical'].some(t => industry.includes(t))) {
    pages.push({ slug: '/services', title: 'Services', sections: ['services', 'pricing'] })
    pages.push({ slug: '/book', title: 'Book', sections: ['booking'] })
  } else if (businessType === 'saas' || ['software', 'app', 'tech', 'platform'].some(t => industry.includes(t))) {
    pages.push({ slug: '/pricing', title: 'Pricing', sections: ['pricing', 'faq'] })
    pages.push({ slug: '/features', title: 'Features', sections: ['features', 'comparison'] })
  } else if (['ecommerce', 'retail', 'store', 'shop'].some(t => industry.includes(t))) {
    pages.push({ slug: '/products', title: 'Products', sections: ['products'] })
  } else if (businessType === 'agency' || ['consulting', 'freelance', 'design', 'marketing', 'creative'].some(t => industry.includes(t))) {
    pages.push({ slug: '/services', title: 'Services', sections: ['services', 'process'] })
    pages.push({ slug: '/work', title: 'Work', sections: ['portfolio', 'case-studies'] })
  } else if (businessType === 'service') {
    pages.push({ slug: '/services', title: 'Services', sections: ['services', 'pricing'] })
  }

  return pages
}

/**
 * Generate a single page's React code
 */
async function generatePageCode(input: {
  pageDef: PageDefinition
  businessContext: string
  plan: BusinessPlan
  brand: Brand | null
  integrations: {
    calcom: { connected: boolean; username: string | null; eventSlug: string | null }
    stripe: { connected: boolean; accountId: string | null }
  }
  modelId: string
}): Promise<string> {
  const { pageDef, businessContext, plan, integrations, modelId } = input

  // Build page-specific prompt
  const pagePrompt = buildPagePrompt(pageDef, plan, integrations)

  const { text } = await generateText({
    model: openrouter(modelId),
    system: WEBSITE_SYSTEM_PROMPT,
    prompt: `${businessContext}

---

${pagePrompt}

Remember:
- Use ONLY CSS variable Tailwind classes (bg-primary, text-foreground, bg-muted, etc.)
- Make it visually unique and creative for this specific business
- Include proper imports at the top
- Export default function with the correct name
- NO hardcoded colors like bg-gray-*, text-white, #hex values`,
  })

  return cleanCodeOutput(text)
}

/**
 * Build page-specific prompt based on page type
 */
function buildPagePrompt(
  pageDef: PageDefinition,
  plan: BusinessPlan,
  integrations: { calcom: { connected: boolean; username: string | null; eventSlug: string | null }; stripe: { connected: boolean } }
): string {
  const { slug } = pageDef

  if (slug === '/') {
    return `Create a stunning HOME page that makes visitors want to stay and explore.

Include these sections:
1. HERO - Make it impactful and unique to this business
   - Compelling headline (4-8 words max, specific to this business, addresses a pain point or promise)
   - Subheadline explaining the value proposition
   - Primary CTA button (Link to /contact or /book or /services)
   - Secondary CTA or trust indicators
   - Decorative visual elements (gradients, blurred shapes, patterns)

2. FEATURES/BENEFITS - Why choose this business (3-6 key points)
   - Icons from lucide-react
   - Brief, compelling descriptions
   - Creative layout (bento grid, cards with hover effects, alternating rows)

3. SOCIAL PROOF - Build trust
   - 2-3 testimonials with names and roles
   - Stats or metrics if relevant
   - Trust badges or partner logos area

4. CTA SECTION - Drive action
   - Compelling headline
   - Clear action button
   - Maybe add urgency or a bonus

Make the layout CREATIVE and UNIQUE. Use decorative elements, gradients, overlapping shapes.
The design should reflect the business type and industry.`
  }

  if (slug === '/menu') {
    return `Create a MENU page for this ${plan.business.industry} business.

Include:
1. Page header with appetizing description and decorative elements
2. Menu categories (e.g., Starters, Mains, Desserts, Drinks - adapt to the cuisine)
3. Menu items displayed in a creative grid or card layout with:
   - Dish name (make them authentic and appetizing)
   - Mouth-watering description
   - Price
   - Dietary tags where appropriate (V, VG, GF, Spicy, etc.)
4. Featured/special items highlighted with visual emphasis
5. CTA to make a reservation (Link to /reservations)

Make it visually appetizing. Use creative layouts - not just a boring list.
Consider the cuisine type and make the design match (elegant for fine dining, casual for cafes, etc.)`
  }

  if (slug === '/reservations' || slug === '/book') {
    const hasCalcom = integrations.calcom.connected

    return `Create a ${slug === '/reservations' ? 'RESERVATIONS' : 'BOOKING'} page.

Include:
1. Page header with welcoming copy explaining the booking process
2. ${hasCalcom
      ? `Cal.com booking widget integration:
   \`\`\`tsx
   import { useIntegrations } from '../hooks/useIntegrations'
   // In component:
   const { calcom } = useIntegrations()
   // In JSX:
   {calcom.connected ? (
     <div className="bg-muted rounded-2xl p-4 min-h-[500px]">
       <iframe
         src={\`https://cal.com/\${calcom.username}/\${calcom.eventSlug}?embed=true&theme=light\`}
         className="w-full h-[500px] border-0 rounded-xl"
         title="Book an appointment"
       />
     </div>
   ) : (
     <div className="bg-muted rounded-2xl p-12 text-center">
       <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
       <h3 className="text-xl font-semibold mb-2">Online Booking Coming Soon</h3>
       <p className="text-muted-foreground mb-6">Connect Cal.com in settings to enable online booking</p>
       <p className="text-sm text-muted-foreground">Or call us to book: [Phone Number]</p>
     </div>
   )}`
      : `Placeholder for future booking integration:
   <div className="bg-muted rounded-2xl p-12 text-center">
     <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
     <h3 className="text-xl font-semibold mb-2">Online Booking Coming Soon</h3>
     <p className="text-muted-foreground mb-6">We're setting up online booking. In the meantime:</p>
     <div className="space-y-2 text-muted-foreground">
       <p>Call us: [Phone Number]</p>
       <p>Email: [Email Address]</p>
     </div>
   </div>`}
3. Contact information for phone/email bookings as fallback
4. What to expect section or booking policy info

Make it feel easy and inviting to book. Add some personality.`
  }

  if (slug === '/services') {
    return `Create a SERVICES page for this ${plan.business.type} business in ${plan.business.industry}.

Include:
1. Page header with overview of what you offer
2. Individual service cards (3-6 services) with:
   - Service name
   - Compelling description
   - Duration (if time-based)
   - Price or "Starting from $X"
   - Icon from lucide-react
   - Book/Contact button
3. Process explanation section (How it works - 3-4 steps)
4. FAQ section about the services (4-6 questions)
5. CTA to book or contact

Use a creative grid or card layout. Make each service feel premium and valuable.
Consider adding hover effects, icons, and visual hierarchy.`
  }

  if (slug === '/pricing') {
    return `Create a PRICING page.

Include:
1. Headline about the value customers get
2. 2-3 pricing tiers displayed as cards with:
   - Tier name (e.g., Starter, Professional, Enterprise)
   - Price (monthly with /mo)
   - List of features with checkmarks
   - CTA button
   - Highlight the recommended tier with: ring-2 ring-primary scale-105
   - Add a "Most Popular" badge to the recommended tier
3. Feature comparison table (optional, if complex)
4. FAQ about pricing (4-5 questions)
5. Money-back guarantee or trust elements

Make the recommended tier clearly stand out.
Use creative design - not just three plain boxes.`
  }

  if (slug === '/contact') {
    return `Create a CONTACT page.

Include:
1. Friendly, welcoming headline
2. Contact form with:
   - Name field (required)
   - Email field (required)
   - Phone field (optional)
   - Subject or inquiry type (optional select)
   - Message textarea (required)
   - Submit button with loading state
   - Add useState for form handling and success message

3. Direct contact information section:
   - Email address with Mail icon
   - Phone number with Phone icon
   - Physical address with MapPin icon
   - Business hours with Clock icon

4. Map placeholder or embed area

Use a split layout or creative arrangement. Not just a centered form.
Add form state management with useState for success/error messages.`
  }

  if (slug === '/about') {
    return `Create an ABOUT page.

Include:
1. "Our Story" section with compelling narrative
2. Mission and vision statements
3. Core values displayed creatively (icons + text)
4. Team section with placeholder cards (if relevant):
   - Photo placeholder (bg-muted rounded-full aspect-square)
   - Name
   - Role
   - Brief bio
5. "Why Choose Us" section with differentiators
6. CTA to contact or book

Make it feel personal and authentic to this business type.
Use creative layouts - not just walls of text.`
  }

  if (slug === '/work' || slug === '/portfolio') {
    return `Create a PORTFOLIO/WORK page showcasing projects.

Include:
1. Page header with brief intro about the work
2. Project grid/gallery with 4-6 placeholder projects:
   - Project image placeholder (bg-muted aspect-video)
   - Project name
   - Brief description
   - Client name or category
   - Hover effect revealing more info
3. Filtering by category (if relevant)
4. Case study highlights or featured work section
5. CTA to discuss a project

Use creative grid layouts with varying sizes for visual interest.`
  }

  if (slug === '/products') {
    return `Create a PRODUCTS page.

Include:
1. Page header with product category overview
2. Product grid with 6-8 placeholder products:
   - Product image placeholder (bg-muted aspect-square)
   - Product name
   - Brief description
   - Price
   - "Add to Cart" or "View Details" button
   - Hover effect with quick actions
3. Filter/sort options (placeholder)
4. Category navigation
5. Featured products section

Make it feel like a real e-commerce experience with proper product cards.`
  }

  if (slug === '/features') {
    return `Create a FEATURES page showcasing product/service capabilities.

Include:
1. Hero section with main value proposition
2. Feature grid with 6-9 features:
   - Icon from lucide-react
   - Feature name
   - Description
   - Visual element or illustration placeholder
3. Detailed feature sections with alternating layouts:
   - Image/visual on one side
   - Description and bullet points on the other
   - Alternate left/right for visual interest
4. Comparison section (us vs others or before/after)
5. CTA to get started or learn more

Use creative layouts with plenty of visual elements.`
  }

  // Default generic page
  return `Create a ${pageDef.title} page with sections: ${pageDef.sections.join(', ')}.
Make it relevant and creative for a ${plan.business.type} business in ${plan.business.industry}.
Include appropriate content, CTAs, and visual design elements.`
}

/**
 * Generate Navbar component
 */
async function generateNavbarCode(input: {
  pages: PageDefinition[]
  businessName: string
  plan: BusinessPlan
  modelId: string
}): Promise<string> {
  const { pages, businessName, modelId } = input

  const navLinks = pages.map(p => `{ label: '${p.title}', href: '${p.slug}' }`).join(',\n    ')

  const { text } = await generateText({
    model: openrouter(modelId),
    system: WEBSITE_SYSTEM_PROMPT,
    prompt: `Create a responsive Navbar component.

Business name: ${businessName}

Navigation links:
${pages.map(p => `- ${p.title} → "${p.slug}"`).join('\n')}

Requirements:
1. Sticky navbar with backdrop blur: sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border
2. Logo/business name on left as Link to "/"
3. Desktop navigation links (hidden on mobile, visible on md:)
4. Mobile hamburger menu with useState toggle (Menu/X icons from lucide-react)
5. Primary CTA button that stands out (the last nav item or Contact/Book)
6. Smooth transitions on mobile menu open/close

Code structure:
\`\`\`tsx
'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const navLinks = [
    ${navLinks}
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      {/* Your creative implementation */}
    </nav>
  )
}
\`\`\`

Use ONLY CSS variable classes. Make it clean and professional.`,
  })

  return cleanCodeOutput(text)
}

/**
 * Generate Footer component
 */
async function generateFooterCode(input: {
  pages: PageDefinition[]
  brand: Brand | null
  plan: BusinessPlan
  modelId: string
}): Promise<string> {
  const { pages, brand, plan, modelId } = input

  const { text } = await generateText({
    model: openrouter(modelId),
    system: WEBSITE_SYSTEM_PROMPT,
    prompt: `Create a Footer component.

Business: ${brand?.name || plan.business.description.split(' ').slice(0, 3).join(' ')}
Tagline: ${brand?.tagline || ''}

Navigation pages: ${pages.map(p => p.title).join(', ')}

Include:
1. Business name and tagline
2. Navigation links (Link components to each page)
3. Contact info placeholders (email, phone, address)
4. Social media icon placeholders
5. Copyright with dynamic year: {new Date().getFullYear()}

Style options:
- Dark footer: bg-foreground text-background
- Light footer: bg-muted text-foreground
Choose what fits the brand better.

Use ONLY CSS variable classes. Keep it clean and organized.`,
  })

  return cleanCodeOutput(text)
}

/**
 * Generate global CSS with brand variables
 */
function generateGlobalCSS(brand: Brand | null): string {
  const colors = brand?.colors || {}
  const fonts = brand?.fonts || { heading: 'Inter', body: 'Inter', headingWeight: '700', bodyWeight: '400' }
  const radius = brand?.border_radius || 'md'

  const radiusValue = {
    none: '0',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  }[radius] || '0.375rem'

  // Default colors if not provided
  const primary = colors.primary || '#3b82f6'
  const secondary = colors.secondary || '#6366f1'
  const accent = colors.accent || '#f59e0b'
  const background = colors.background || '#ffffff'
  const foreground = colors.foreground || '#0f172a'
  const muted = colors.muted || '#f1f5f9'
  const mutedForeground = colors.mutedForeground || '#64748b'

  return `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonts.heading || 'Inter')}:wght@400;500;600;700;800&family=${encodeURIComponent(fonts.body || 'Inter')}:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: ${hexToHSL(background)};
    --foreground: ${hexToHSL(foreground)};

    --primary: ${hexToHSL(primary)};
    --primary-foreground: ${getContrastColor(primary)};

    --secondary: ${hexToHSL(secondary)};
    --secondary-foreground: ${getContrastColor(secondary)};

    --accent: ${hexToHSL(accent)};
    --accent-foreground: ${getContrastColor(accent)};

    --muted: ${hexToHSL(muted)};
    --muted-foreground: ${hexToHSL(mutedForeground)};

    --border: ${hexToHSL(muted)};
    --input: ${hexToHSL(muted)};
    --ring: ${hexToHSL(primary)};

    --radius: ${radiusValue};
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: '${fonts.body || 'Inter'}', system-ui, sans-serif;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: '${fonts.heading || 'Inter'}', system-ui, sans-serif;
    font-weight: ${fonts.headingWeight || '700'};
  }
}
`
}

/**
 * Generate main.tsx entry point
 */
function generateMainTsx(): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
`
}

/**
 * Generate App.tsx with routing
 */
function generateAppTsx(pages: GeneratedWebsite['pages'], brand: Brand | null): string {
  const imports = pages.map(p => {
    const name = p.slug === '/' ? 'Home' : toPascalCase(p.slug)
    return `import ${name} from './pages/${name}'`
  }).join('\n')

  const routes = pages.map(p => {
    const name = p.slug === '/' ? 'Home' : toPascalCase(p.slug)
    return `          <Route path="${p.slug}" element={<${name} />} />`
  }).join('\n')

  return `import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
${imports}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Routes>
${routes}
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
`
}

/**
 * Generate integrations config file for preview
 */
function generateIntegrationsConfig(integrations: {
  calcom: { connected: boolean; username: string | null; eventSlug: string | null }
  stripe: { connected: boolean; accountId: string | null }
}): string {
  return `// Auto-generated integrations config
// This file is regenerated when integrations change

export const integrations = {
  calcom: {
    connected: ${integrations.calcom.connected},
    username: ${integrations.calcom.username ? `'${integrations.calcom.username}'` : 'null'},
    eventSlug: ${integrations.calcom.eventSlug ? `'${integrations.calcom.eventSlug}'` : "'30min'"},
  },
  stripe: {
    connected: ${integrations.stripe.connected},
    accountId: ${integrations.stripe.accountId ? `'${integrations.stripe.accountId}'` : 'null'},
  },
} as const

export type Integrations = typeof integrations
`
}

/**
 * Generate useIntegrations hook for preview
 */
function generateUseIntegrationsHook(): string {
  return `import { integrations } from '../lib/integrations'

/**
 * Hook to access integration configuration
 * The config is generated at build time and updated when integrations change
 */
export function useIntegrations() {
  return integrations
}

export default useIntegrations
`
}

/**
 * Generate Tailwind config
 */
function generateTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
`
}

/**
 * Generate PostCSS config
 */
function generatePostCSSConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`
}

/**
 * Generate Vite config
 */
function generateViteConfig(): string {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
`
}

/**
 * Generate index.html
 */
function generateIndexHtml(brand: Brand | null): string {
  const title = brand?.name || 'Website'
  const description = brand?.tagline || ''

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${description}" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      ${ERROR_OVERLAY_INJECTION_SCRIPT}
    </script>
  </body>
</html>
`
}

/**
 * Generate tsconfig.json
 */
function generateTSConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noFallthroughCasesInSwitch: true,
    },
    include: ['src'],
  }, null, 2)
}

/**
 * Generate package.json
 */
function generatePackageJson(plan: BusinessPlan, brand: Brand | null): string {
  const name = (brand?.name || plan.business.description)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'website'

  return JSON.stringify({
    name,
    private: true,
    version: '0.0.1',
    type: 'module',
    scripts: {
      dev: 'vite --host',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'react-router-dom': '^6.20.0',
      'lucide-react': '^0.294.0',
    },
    devDependencies: {
      '@types/react': '^18.2.37',
      '@types/react-dom': '^18.2.15',
      '@vitejs/plugin-react': '^4.2.0',
      'autoprefixer': '^10.4.16',
      'postcss': '^8.4.31',
      'tailwindcss': '^3.3.5',
      'typescript': '^5.2.2',
      'vite': '^5.0.0',
    },
  }, null, 2)
}

// Utility functions

/**
 * Convert slug to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/^\//, '')
    .replace(/[-\/]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

/**
 * Get contrasting foreground color as HSL
 */
function getContrastColor(hex: string): string {
  if (!hex || !hex.startsWith('#')) return '0 0% 100%'

  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

  return luminance > 0.5 ? '0 0% 9%' : '0 0% 100%'
}

/**
 * Clean code output from LLM - remove markdown fences
 */
function cleanCodeOutput(text: string): string {
  let code = text.trim()

  // Remove markdown code fences
  if (code.startsWith('```')) {
    code = code.replace(/^```(?:tsx?|jsx?|typescript|javascript)?\n?/, '').replace(/\n?```$/, '')
  }

  return code.trim()
}

// Export types for use elsewhere
export type { Brand, Overview, PageDefinition }
