import { generateObject } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { z } from 'zod'
import type { BusinessPlan } from './planner'
import { validateWebsite, hasBlockingIssues, formatIssuesForRetry } from './website-validator'

// Brand type from database
interface BrandColors {
  primary?: string
  secondary?: string
  accent?: string
  background?: string
  foreground?: string
  muted?: string
  destructive?: string
}

interface BrandFonts {
  heading?: string
  body?: string
}

interface Brand {
  name?: string
  tagline?: string
  colors?: BrandColors
  fonts?: BrandFonts
  tone_of_voice?: string
  writing_guidelines?: string
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

// Section item schema for features, FAQ, pricing, etc.
const SectionItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional().describe('Lucide icon name'),
  price: z.string().optional().describe('For pricing sections'),
  features: z.array(z.string()).optional().describe('For pricing tiers'),
  question: z.string().optional().describe('For FAQ sections'),
  answer: z.string().optional().describe('For FAQ sections'),
})

// Image placeholder for future image generation
const ImagePlaceholderSchema = z.object({
  alt: z.string(),
  description: z.string().describe('Detailed description for future image generation'),
})

// Layout variants for sections - REQUIRED for all sections
const LayoutSchema = z.enum([
  'centered',      // Text centered, max-w-3xl, classic SaaS look
  'split',         // Image left (40%), text right (60%)
  'split-reverse', // Text left, image right
  'grid',          // 2-4 column card grid, responsive
  'stacked',       // Full-width vertical stack, text-focused
  'alternating',   // Zigzag pattern for storytelling
  'cards',         // Card-based with consistent styling
  'bento',         // Asymmetric grid with varied card sizes
]).describe('Layout variant - REQUIRED for every section')

// Website section schema with stricter validation
const WebsiteSectionSchema = z.object({
  type: z.enum([
    'hero',
    'features',
    'benefits',
    'testimonials',
    'pricing',
    'faq',
    'team',
    'about',
    'cta',
    'gallery',
    'contact',
    'booking',
    'products',
    'stats',
    'process',
    'trust',
  ]),

  // Layout - REQUIRED (not optional)
  layout: LayoutSchema.describe('Layout variant - REQUIRED for every section'),
  darkSection: z.boolean().default(false).describe('Use dark background for this section'),

  // Badge text - business-specific, NEVER generic
  badgeText: z.string().max(40).optional()
    .describe('Business-specific badge (max 40 chars). BANNED: "Welcome", "Features", "About". GOOD: "Trusted by 500+ businesses", "New: AI-powered"'),

  // Content with stricter limits
  headline: z.string().max(65)
    .describe('4-8 words MAX (40-65 chars). Must include specific outcome, number, or timeframe. BANNED: "Welcome to..."'),
  subheadline: z.string().max(150).optional()
    .describe('Explains the how/what in max 150 chars'),
  content: z.string().max(500).optional()
    .describe('Paragraph content for about sections, max 500 chars'),

  // Items for features, pricing, FAQ, etc.
  items: z.array(SectionItemSchema).optional(),

  // CTAs with strict rules
  ctaText: z.string().max(20).optional()
    .describe('2-4 words. Action + benefit. BANNED: "Submit", "Click Here", "Learn More", "Get Started"'),
  secondaryCtaText: z.string().max(25).optional()
    .describe('Optional secondary CTA, max 25 chars'),
  ctaHref: z.string().optional(),

  // Visual elements
  image: ImagePlaceholderSchema.optional(),

  // Stats section data
  stats: z.array(z.object({
    value: z.string().describe('Specific number with unit, e.g., "500+", "98%", "24/7"'),
    label: z.string().max(30).describe('What the stat represents'),
  })).optional(),

  // Testimonials with required specificity
  testimonials: z.array(z.object({
    quote: z.string().max(200).describe('Specific quote mentioning results/outcomes, max 200 chars'),
    author: z.string().describe('Full name'),
    role: z.string().optional().describe('Job title'),
    company: z.string().optional().describe('Company name (for B2B)'),
  })).optional(),

  // Trust indicators
  trustLogos: z.array(z.string()).optional()
    .describe('Names of companies/publications for trust badges'),
  trustMetric: z.string().optional()
    .describe('e.g., "Trusted by 10,000+ customers"'),
})

// Website page schema
const WebsitePageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  metaTitle: z.string().describe('SEO title'),
  metaDescription: z.string().describe('SEO description'),
  sections: z.array(WebsiteSectionSchema),
})

// Complete website schema
const WebsiteSchema = z.object({
  pages: z.array(WebsitePageSchema),
  navigation: z.array(z.object({
    label: z.string(),
    href: z.string(),
    isPrimary: z.boolean().optional().describe('Style as button CTA'),
  })),
  footer: z.object({
    copyright: z.string(),
    tagline: z.string().optional(),
    links: z.array(z.object({
      label: z.string(),
      href: z.string(),
    })),
  }),
})

export type Website = z.infer<typeof WebsiteSchema>
export type WebsitePage = z.infer<typeof WebsitePageSchema>
export type WebsiteSection = z.infer<typeof WebsiteSectionSchema>

const WEBSITE_SYSTEM_PROMPT = `You are Ernest's PREMIUM website content generator. Your job is to create distinctive, hand-crafted websites that look professionally designed—NOT generic AI output.

## CRITICAL: ANTI-GENERIC RULES

### NEVER DO THIS (instant quality fail):
- Teal + beige color combinations (the "AI website" look)
- "Welcome to [Business Name]" headlines
- Three identical columns with generic icons
- Stock phrases: "quality services", "customer satisfaction", "your trusted partner"
- Generic CTAs: "Learn More", "Get Started", "Submit", "Click Here"
- Placeholder-feeling content without specific numbers or outcomes

### ALWAYS DO THIS:
- Use the brand's ACTUAL colors (provided in context)
- Headlines with specific numbers or outcomes ("Save 40 hours monthly")
- Asymmetric or varied layouts (not everything centered or in threes)
- CTAs that describe the action + benefit ("Start Free Trial", "Book My Session")
- Content that could ONLY apply to THIS specific business

## DESIGN SYSTEM

### Color Usage (60-30-10 Rule)
- 60% - Background colors (white, light gray, or brand background)
- 30% - Secondary colors (cards, sections, borders)
- 10% - Accent/CTA colors (buttons, highlights, links)

### Spacing System (8px base)
Use only these values: 8, 16, 24, 32, 48, 64, 96, 128px
- Section padding: 96px (desktop) / 64px (mobile)
- Content gaps: 24-48px
- Element spacing: 16-32px

### Typography Scale
- H1 (Hero): 48-60px, font-weight 700-800
- H2 (Section): 32-40px, font-weight 600-700
- H3 (Cards): 20-24px, font-weight 600
- Body: 16-18px minimum, line-height 1.6-1.75
- Small text: 14px minimum

### Visual Refinement
- Shadows: Use shadow-sm with border, NOT heavy drop shadows
- Border radius: rounded-xl for cards, rounded-lg for buttons
- Borders: 1px borders in neutral colors for definition

## LAYOUT SYSTEM

### Container
All sections: mx-auto max-w-7xl px-4 sm:px-6 lg:px-8

### Available Layouts (REQUIRED for every section)
- **centered**: Text centered, max-w-3xl, classic SaaS look
- **split**: Image left (40%), text right (60%), product showcase style
- **split-reverse**: Text left, image right, variation for rhythm
- **grid**: 2-4 column card grid, responsive
- **bento**: Asymmetric grid with varied card sizes
- **stacked**: Full-width vertical stack, text-focused
- **alternating**: Zigzag pattern for storytelling
- **cards**: Card-based with consistent styling

### Dark Section Rules
Use darkSection: true for:
- Final CTA sections (contrast drives conversion)
- Stats/trust sections (authority feel)
- Mid-page breaks (visual rhythm)
Never: Multiple dark sections in a row

## SECTION BLUEPRINTS

### Hero Section (CRITICAL - sets the tone)
Required elements:
1. Badge text (max 40 chars) - business-specific, NOT "Welcome"
2. Headline (4-8 words, 40-65 chars) - with specific outcome or number
3. Subheadline (max 150 chars) - explains the how/what
4. Primary CTA (2-4 words) - action + benefit
5. Optional: Secondary CTA, trust indicators, hero image description

Layouts: centered, split, split-reverse, bold

### Features Section
Required: 3-6 items with:
- Icon (Lucide icon name)
- Title (3-5 words)
- Description (1-2 sentences with specific benefit)

Layouts: grid, bento, cards

### Testimonials Section
Required: 2-4 testimonials with:
- Specific quote mentioning results/outcomes
- Full name
- Title/role
- Company (if B2B)

Layouts: cards, centered, grid

### Pricing Section
Required: 2-3 tiers (MAX 3):
- Clear tier name
- Price with billing period
- 4-6 features per tier
- Highlight recommended tier
- CTA for each tier

Layout: cards (always)

### CTA Section
Required:
- Compelling headline (not "Ready to get started?")
- Single focused CTA
- Use darkSection: true

Layout: centered

### FAQ Section
Required: 4-8 questions addressing:
- Main objections
- Common concerns
- Differentiators
Use question/answer format

Layout: stacked

## COPY RULES

### Headline Formulas
- Outcome-focused: "[Achieve X] in [Timeframe]"
- Problem-solution: "Stop [Pain Point]. Start [Benefit]."
- Social proof: "[Number] [audience] trust us to [outcome]"
- Direct value: "[Action] that [specific benefit]"

### CTA Text Rules
- 2-4 words maximum
- First person preferred ("Get My Quote" not "Get Your Quote")
- Action + benefit combo
- BANNED: "Submit", "Click Here", "Learn More", "Get Started" (generic)
- GOOD: "Start Free Trial", "Book My Session", "See Pricing", "Download Guide"

### Badge Text Rules
- Must be unique to THIS business
- BANNED: "Welcome", "Features", "About", "Get Started"
- GOOD: "Trusted by 500+ restaurants", "New: AI-powered matching", "California's #1 rated"

## YOUR TASK

Generate premium website content that:
1. Uses ONLY the brand colors provided (never default to teal/beige)
2. Has headlines under 8 words with specific outcomes
3. Creates badge text unique to THIS business
4. Uses varied layouts (never 3+ identical sections)
5. Alternates dark sections for visual rhythm
6. CTAs that are action + benefit (never generic)
7. Content so specific it could ONLY work for THIS business

QUALITY CHECK: Before finalizing, verify:
- [ ] No "Welcome to" headlines
- [ ] No generic CTAs
- [ ] Badge text is business-specific
- [ ] At least 2 different layouts used
- [ ] Dark sections are strategic, not consecutive
- [ ] All headlines have specifics (numbers, outcomes, timeframes)`

export async function generateWebsite(
  plan: BusinessPlan,
  brand: Brand | null,
  overview: Overview | null,
  model?: string
): Promise<Website> {
  const modelId = getModelId(model || DEFAULT_MODEL)

  // Build context from plan
  const pagesList = plan.website.pages
    .map(p => `- ${p.slug}: ${p.purpose} (sections: ${p.sections.join(', ')})`)
    .join('\n')

  // Build brand context
  const brandColors = brand?.colors as BrandColors | undefined
  const brandFonts = brand?.fonts as BrandFonts | undefined

  const brandContext = brand ? `
BRAND DESIGN SYSTEM (USE THESE EXACT VALUES):
- Brand Name: ${brand.name || 'My Business'}
- Tagline: ${brand.tagline || 'Not set'}
- Primary Color: ${brandColors?.primary || '#2563eb'}
- Secondary Color: ${brandColors?.secondary || '#64748b'}
- Accent Color: ${brandColors?.accent || '#f59e0b'}
- Background Color: ${brandColors?.background || '#ffffff'}
- Text Color: ${brandColors?.foreground || '#0f172a'}
- Muted Background: ${brandColors?.muted || '#f1f5f9'}
- Heading Font: ${brandFonts?.heading || 'Inter'}
- Body Font: ${brandFonts?.body || 'Inter'}
- Border Radius Style: ${brand.border_radius || 'md'}
- Tone of Voice: ${brand.tone_of_voice || 'professional'}

WRITING GUIDELINES:
${brand.writing_guidelines || 'Write in a clear, professional manner that builds trust.'}

IMPORTANT: The generated code will use CSS variables like var(--color-primary), var(--color-secondary), etc.
Make content decisions that complement these colors - for example, if the primary color is warm/orange, use warm, energetic language.
If it's cool/blue, use calm, professional language.` : ''

  // Build overview context
  const overviewContext = overview ? `
BUSINESS CONTEXT (from Lean Canvas):
- Unique Value Proposition: ${overview.unique_value_proposition || plan.business.uniqueValue}
- High-Level Concept: ${overview.high_level_concept || 'Not defined'}
- Problems We Solve: ${overview.problems?.join(', ') || 'Not defined'}
- Our Solutions: ${overview.solutions?.join(', ') || 'Not defined'}
- Unfair Advantage: ${overview.unfair_advantage || 'Not defined'}
- Early Adopters: ${overview.early_adopters || 'Not defined'}
- Key Channels: ${overview.channels?.join(', ') || 'Website'}
- Customer Segments: ${JSON.stringify(overview.customer_segments) || 'General audience'}
- Revenue Streams: ${JSON.stringify(overview.revenue_streams) || 'Not defined'}

CRITICAL: Use this information to create compelling, SPECIFIC content:
- Headlines should directly address the problems listed above
- Features should map to the solutions
- CTAs should align with the revenue model
- Testimonials should reference the problems being solved
- Badge text should relate to the unique value proposition` : ''

  // Build the base prompt
  const basePrompt = `Generate complete website content for this business:

BUSINESS:
- Type: ${plan.business.type}
- Industry: ${plan.business.industry}
- Description: ${plan.business.description}
- Unique Value: ${plan.business.uniqueValue}
${brandContext}
${overviewContext}

TARGET AUDIENCE:
- Demographics: ${plan.audience.primary.demographics.join(', ')}
- Psychographics: ${plan.audience.primary.psychographics.join(', ')}
- Pain Points: ${plan.audience.primary.painPoints.join(', ')}
- Goals: ${plan.audience.primary.goals.join(', ')}

BRAND VOICE:
- Positioning: ${plan.brand.positioning}
- Personality: Formal ${plan.brand.personality.formal}/10, Playful ${plan.brand.personality.playful}/10, Traditional ${plan.brand.personality.traditional}/10, Bold ${plan.brand.personality.bold}/10, Warm ${plan.brand.personality.warm}/10
- Voice: ${plan.brand.voiceDescription}
- Values: ${plan.brand.values.join(', ')}

WEBSITE STRUCTURE (from plan):
${pagesList}

NAVIGATION:
${plan.website.navigation.map(n => `- ${n.label} → ${n.href}${n.isPrimaryCTA ? ' (CTA)' : ''}`).join('\n')}

PRIMARY CTA:
- Text: ${plan.website.primaryCTA.text}
- Action: ${plan.website.primaryCTA.action}

CONVERSION GOAL:
${plan.flow.primaryConversion}

REQUIRED INTEGRATIONS:
${plan.integrations.required.map(i => `- ${i.provider} on ${i.usedOn.join(', ')}`).join('\n')}

Generate website content that:
1. Uses the exact page structure from the plan
2. Matches the brand voice, colors, and typography feel
3. Addresses the audience's SPECIFIC pain points from the business context
4. Drives toward the primary conversion goal
5. Includes rich, SPECIFIC content that references the actual business problems and solutions - NO generic filler
6. Has compelling headlines that speak directly to THIS audience's struggles
7. IMPORTANT: Specify a layout for EVERY section (centered, split, grid, bento, cards, stacked, alternating)
8. Use darkSection: true for CTAs and sections that need contrast
9. Badge text must be unique and specific to THIS business - NOT generic like "Welcome" or "Features"
10. Content should feel custom-written for this exact business, not templated

For each page, generate all the sections specified in the plan with full content.
Make testimonials feel real - reference specific outcomes that relate to the problems solved.
Make pricing realistic for the positioning.
Make FAQ address real objections this specific audience would have based on the pain points.
Choose layouts based on the industry type and section purpose.`

  // Validation and retry logic
  const MAX_ATTEMPTS = 2
  let attempts = 0
  let lastIssues: string = ''

  while (attempts < MAX_ATTEMPTS) {
    const prompt = attempts === 0
      ? basePrompt
      : `${basePrompt}\n\n${lastIssues}\n\nPlease regenerate with these issues fixed.`

    const { object: website } = await generateObject({
      model: openrouter(modelId),
      schema: WebsiteSchema,
      system: WEBSITE_SYSTEM_PROMPT,
      prompt,
    })

    // Validate the generated website
    const issues = validateWebsite(website)

    // If no blocking issues, return the website
    if (!hasBlockingIssues(issues)) {
      return website
    }

    // Log issues for debugging
    console.warn(`Website generation attempt ${attempts + 1} had quality issues:`, issues.filter(i => i.severity === 'error'))

    // Format issues for retry
    lastIssues = formatIssuesForRetry(issues)
    attempts++
  }

  // If we've exhausted retries, generate one more time without validation
  // (better to return something than fail completely)
  console.warn('Website generation exhausted retries, returning best effort')
  const { object: website } = await generateObject({
    model: openrouter(modelId),
    schema: WebsiteSchema,
    system: WEBSITE_SYSTEM_PROMPT,
    prompt: basePrompt,
  })

  return website
}

// Helper to get section display name
export function getSectionDisplayName(type: WebsiteSection['type']): string {
  const names: Record<WebsiteSection['type'], string> = {
    hero: 'Hero Section',
    features: 'Features',
    benefits: 'Benefits',
    testimonials: 'Testimonials',
    pricing: 'Pricing',
    faq: 'FAQ',
    team: 'Team',
    about: 'About',
    cta: 'Call to Action',
    gallery: 'Gallery',
    contact: 'Contact',
    booking: 'Booking',
    products: 'Products',
    stats: 'Statistics',
    process: 'How It Works',
    trust: 'Trust Badges',
  }
  return names[type]
}
