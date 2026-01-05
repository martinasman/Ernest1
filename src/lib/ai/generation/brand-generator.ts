import { generateObject } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { z } from 'zod'
import type { BusinessPlan } from './planner'

// Complete brand schema with all design tokens
const BrandSchema = z.object({
  // Identity
  name: z.string().describe('Business name'),
  tagline: z.string().describe('Short memorable tagline'),

  // Complete color system
  colors: z.object({
    primary: z.string().describe('Main brand color - hex code'),
    primaryLight: z.string().describe('Lighter variant of primary'),
    primaryDark: z.string().describe('Darker variant of primary'),
    secondary: z.string().describe('Supporting brand color'),
    secondaryLight: z.string().describe('Lighter variant of secondary'),
    accent: z.string().describe('Accent for CTAs and highlights'),
    background: z.string().describe('Main background color'),
    foreground: z.string().describe('Main text color'),
    muted: z.string().describe('Muted background for cards, sections'),
    mutedForeground: z.string().describe('Text on muted backgrounds'),
    success: z.string().describe('Success/positive state color'),
    warning: z.string().describe('Warning state color'),
    destructive: z.string().describe('Error/danger color'),
  }),

  // Typography
  fonts: z.object({
    heading: z.string().describe('Google Font name for headings'),
    headingWeight: z.enum(['300', '400', '500', '600', '700', '800', '900']),
    body: z.string().describe('Google Font name for body text'),
    bodyWeight: z.enum(['300', '400', '500', '600']),
  }),

  // Visual style
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl', 'full']).describe('Corner rounding style'),

  // Tone of voice
  toneOfVoice: z.object({
    formality: z.enum(['casual', 'conversational', 'professional', 'formal']),
    personality: z.array(z.string()).min(2).max(4).describe('Personality traits like friendly, expert, playful'),
    vocabulary: z.enum(['simple', 'industry-standard', 'sophisticated']),
    useContractions: z.boolean().describe('Use contractions like "we\'re" vs "we are"'),
    exampleGreetings: z.array(z.string()).min(2).max(4).describe('Example greetings in this voice'),
    exampleCTAs: z.array(z.string()).min(2).max(4).describe('Example call-to-action phrases'),
    avoid: z.array(z.string()).describe('Things to avoid in copy'),
  }),

  // Brand values
  values: z.array(z.string()).min(3).max(5),

  // Logo direction for future generation
  logoDirection: z.object({
    style: z.enum(['wordmark', 'icon', 'combination', 'abstract', 'lettermark']),
    description: z.string().describe('Description of what the logo should convey'),
    suggestedElements: z.array(z.string()).describe('Visual elements that could work'),
  }),
})

export type Brand = z.infer<typeof BrandSchema>

const BRAND_SYSTEM_PROMPT = `You are Ernest's brand generation system. Your job is to create cohesive, psychologically-appropriate brand identities that feel RIGHT for each specific business.

## COLOR PSYCHOLOGY KNOWLEDGE

You understand how colors affect perception and emotion. You don't apply rigid rules, but reason about what's appropriate:

**Calming & Trustworthy contexts:**
- Soft blues, sage greens, lavenders, muted teals
- Low saturation, harmonious combinations
- Evokes: peace, reliability, wellness, trust

**Professional & Authoritative contexts:**
- Navy blues, charcoals, burgundies, forest greens
- Deep, saturated, grounded colors
- Gold or silver accents for prestige
- Evokes: expertise, stability, tradition

**Warm & Inviting contexts:**
- Warm reds, oranges, browns, creams
- Earth tones, cozy combinations
- Evokes: comfort, appetite, hospitality

**Modern & Innovative contexts:**
- Electric blues, purples, teals
- Gradients acceptable
- Clean whites, dark modes
- Evokes: innovation, technology, forward-thinking

**Energetic & Playful contexts:**
- Bright primaries, vibrant combinations
- Higher saturation, contrasting pairs
- Evokes: fun, energy, youth, creativity

**Luxury & Premium contexts:**
- Black, gold, deep purple, cream
- Minimal palette, maximum impact
- Evokes: exclusivity, quality, sophistication

## TYPOGRAPHY KNOWLEDGE

You understand how fonts convey personality:

**Formal/Traditional:**
Playfair Display, Merriweather, Lora, Crimson Pro, Source Serif Pro

**Modern/Clean:**
Inter, Poppins, Montserrat, DM Sans, Plus Jakarta Sans

**Friendly/Approachable:**
Nunito, Quicksand, Lato, Rubik, Open Sans

**Luxury/Elegant:**
Cormorant Garamond, Bodoni Moda, Playfair Display, Libre Baskerville

**Technical/Developer:**
Space Grotesk, JetBrains Mono, IBM Plex Sans, Fira Code

**Wellness/Calm:**
Cormorant, Josefin Sans (light), Nunito Sans (light), Lora

## BORDER RADIUS GUIDANCE

- none/sm: Professional, serious, traditional
- md: Balanced, versatile, modern
- lg/xl: Friendly, approachable, soft
- full: Playful, modern, bold

## YOUR TASK

Given a business plan with brand direction, generate a complete brand identity. Every choice should:
1. Feel authentic to this specific business
2. Resonate with the target audience
3. Be psychologically appropriate for the context
4. Work together as a cohesive system

CRITICAL: All colors must be valid hex codes. Ensure proper contrast between background/foreground.`

export async function generateBrand(
  plan: BusinessPlan,
  businessName?: string,
  model?: string
): Promise<Brand> {
  const modelId = getModelId(model || DEFAULT_MODEL)
  const { object: brand } = await generateObject({
    model: openrouter(modelId),
    schema: BrandSchema,
    system: BRAND_SYSTEM_PROMPT,
    prompt: `Generate a complete brand identity based on this business plan:

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

BRAND DIRECTION FROM PLAN:
- Personality Scales:
  - Formal: ${plan.brand.personality.formal}/10
  - Playful: ${plan.brand.personality.playful}/10
  - Traditional: ${plan.brand.personality.traditional}/10
  - Bold: ${plan.brand.personality.bold}/10
  - Warm: ${plan.brand.personality.warm}/10
- Positioning: ${plan.brand.positioning}
- Values: ${plan.brand.values.join(', ')}
- Voice: ${plan.brand.voiceDescription}
- Color Mood: ${plan.brand.colorMood}
- Typography Feel: ${plan.brand.typographyFeel}

${businessName ? `BUSINESS NAME: ${businessName}` : 'Generate an appropriate business name based on the context.'}

Create a brand identity that:
1. Uses the personality scales to guide color intensity and typography weight
2. Matches the positioning (${plan.brand.positioning}) with appropriate sophistication
3. Evokes the mood described: "${plan.brand.colorMood}"
4. Uses typography that feels: "${plan.brand.typographyFeel}"
5. Creates copy guidelines that match the voice description

Be distinctive. Not generic. Not safe. Create something that feels RIGHT for this specific business.`,
  })

  return brand
}

// Convert brand to CSS variables for easy application
export function brandToCSSVariables(brand: Brand): Record<string, string> {
  return {
    '--color-primary': brand.colors.primary,
    '--color-primary-light': brand.colors.primaryLight,
    '--color-primary-dark': brand.colors.primaryDark,
    '--color-secondary': brand.colors.secondary,
    '--color-secondary-light': brand.colors.secondaryLight,
    '--color-accent': brand.colors.accent,
    '--color-background': brand.colors.background,
    '--color-foreground': brand.colors.foreground,
    '--color-muted': brand.colors.muted,
    '--color-muted-foreground': brand.colors.mutedForeground,
    '--color-success': brand.colors.success,
    '--color-warning': brand.colors.warning,
    '--color-destructive': brand.colors.destructive,
    '--font-heading': brand.fonts.heading,
    '--font-body': brand.fonts.body,
    '--border-radius': brand.borderRadius === 'none' ? '0' :
                       brand.borderRadius === 'sm' ? '0.25rem' :
                       brand.borderRadius === 'md' ? '0.375rem' :
                       brand.borderRadius === 'lg' ? '0.5rem' :
                       brand.borderRadius === 'xl' ? '0.75rem' : '9999px',
  }
}

// Generate Tailwind config extension from brand
export function brandToTailwindConfig(brand: Brand): string {
  return `// Generated from brand: ${brand.name}
// Add this to your tailwind.config.js theme.extend

{
  colors: {
    primary: {
      DEFAULT: '${brand.colors.primary}',
      light: '${brand.colors.primaryLight}',
      dark: '${brand.colors.primaryDark}',
    },
    secondary: {
      DEFAULT: '${brand.colors.secondary}',
      light: '${brand.colors.secondaryLight}',
    },
    accent: '${brand.colors.accent}',
    background: '${brand.colors.background}',
    foreground: '${brand.colors.foreground}',
    muted: {
      DEFAULT: '${brand.colors.muted}',
      foreground: '${brand.colors.mutedForeground}',
    },
    success: '${brand.colors.success}',
    warning: '${brand.colors.warning}',
    destructive: '${brand.colors.destructive}',
  },
  fontFamily: {
    heading: ['${brand.fonts.heading}', 'sans-serif'],
    body: ['${brand.fonts.body}', 'sans-serif'],
  },
  borderRadius: {
    DEFAULT: '${brand.borderRadius === 'none' ? '0' :
              brand.borderRadius === 'sm' ? '0.25rem' :
              brand.borderRadius === 'md' ? '0.375rem' :
              brand.borderRadius === 'lg' ? '0.5rem' :
              brand.borderRadius === 'xl' ? '0.75rem' : '9999px'}',
  },
}`
}

// Convert hex color to HSL format for Tailwind CSS variables
// Returns format: "210 40% 98%" (without hsl() wrapper)
export function hexToHSL(hex: string): string {
  // Handle invalid input
  if (!hex || !hex.startsWith('#') || hex.length < 7) {
    return '0 0% 50%'
  }

  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// Calculate contrasting foreground color (white or black) based on background luminance
function getContrastingForeground(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) {
    return '0 0% 100%' // Default to white
  }

  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  // Calculate relative luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

  // Return white for dark backgrounds, near-black for light backgrounds
  return luminance > 0.5 ? '0 0% 9%' : '0 0% 100%'
}

// Get border radius CSS value
function getRadiusValue(radius: Brand['borderRadius']): string {
  switch (radius) {
    case 'none': return '0'
    case 'sm': return '0.25rem'
    case 'md': return '0.375rem'
    case 'lg': return '0.5rem'
    case 'xl': return '0.75rem'
    case 'full': return '9999px'
    default: return '0.375rem'
  }
}

// Generate complete CSS for globals.css with Tailwind v4 compatible variables
// This CSS should be included in the generated website's globals.css
export function generateBrandCSS(brand: Brand): string {
  // Calculate border color from muted if not explicitly set
  const borderColor = brand.colors.muted

  return `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(brand.fonts.heading)}:wght@${brand.fonts.headingWeight}&family=${encodeURIComponent(brand.fonts.body)}:wght@${brand.fonts.bodyWeight}&display=swap');

@layer base {
  :root {
    --background: ${hexToHSL(brand.colors.background)};
    --foreground: ${hexToHSL(brand.colors.foreground)};

    --primary: ${hexToHSL(brand.colors.primary)};
    --primary-foreground: ${getContrastingForeground(brand.colors.primary)};

    --secondary: ${hexToHSL(brand.colors.secondary)};
    --secondary-foreground: ${getContrastingForeground(brand.colors.secondary)};

    --accent: ${hexToHSL(brand.colors.accent)};
    --accent-foreground: ${getContrastingForeground(brand.colors.accent)};

    --muted: ${hexToHSL(brand.colors.muted)};
    --muted-foreground: ${hexToHSL(brand.colors.mutedForeground)};

    --destructive: ${hexToHSL(brand.colors.destructive)};
    --destructive-foreground: ${getContrastingForeground(brand.colors.destructive)};

    --success: ${hexToHSL(brand.colors.success)};
    --warning: ${hexToHSL(brand.colors.warning)};

    --border: ${hexToHSL(borderColor)};
    --input: ${hexToHSL(borderColor)};
    --ring: ${hexToHSL(brand.colors.primary)};

    --radius: ${getRadiusValue(brand.borderRadius)};

    --font-heading: '${brand.fonts.heading}', system-ui, sans-serif;
    --font-body: '${brand.fonts.body}', system-ui, sans-serif;
  }
}

@layer base {
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-body);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    font-weight: ${brand.fonts.headingWeight};
  }
}`
}
