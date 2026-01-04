import { generateObject } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { z } from 'zod'

// Schema for the comprehensive business plan
const BusinessPlanSchema = z.object({
  // Business Understanding
  business: z.object({
    type: z.enum(['product', 'service', 'saas', 'agency', 'marketplace', 'content', 'community']),
    industry: z.string().describe('The primary industry (e.g., wellness, finance, food, tech, education)'),
    subIndustry: z.string().optional().describe('More specific category within the industry'),
    description: z.string().describe('Clear description of what the business does'),
    uniqueValue: z.string().describe('What makes this business different from competitors'),
  }),

  // Target Audience Analysis
  audience: z.object({
    primary: z.object({
      demographics: z.array(z.string()).describe('Age, location, profession, income level'),
      psychographics: z.array(z.string()).describe('Values, interests, lifestyle, attitudes'),
      painPoints: z.array(z.string()).describe('Problems they face that this business solves'),
      goals: z.array(z.string()).describe('What they want to achieve'),
    }),
    secondary: z.object({
      demographics: z.array(z.string()),
      description: z.string(),
    }).optional(),
  }),

  // Brand Direction (AI decides based on analysis)
  brand: z.object({
    personality: z.object({
      formal: z.number().min(1).max(10).describe('1=very casual, 10=very formal'),
      playful: z.number().min(1).max(10).describe('1=serious, 10=playful'),
      traditional: z.number().min(1).max(10).describe('1=cutting-edge modern, 10=classic traditional'),
      bold: z.number().min(1).max(10).describe('1=subtle/understated, 10=bold/loud'),
      warm: z.number().min(1).max(10).describe('1=cool/professional, 10=warm/friendly'),
    }),
    positioning: z.enum(['budget', 'mid-market', 'premium', 'luxury']),
    values: z.array(z.string()).min(3).max(5).describe('Core brand values'),
    voiceDescription: z.string().describe('How the brand should sound in writing'),
    colorMood: z.string().describe('The emotional feeling colors should evoke (e.g., calming and trustworthy, energetic and bold)'),
    typographyFeel: z.string().describe('How text should feel (e.g., modern and clean, elegant and refined, friendly and approachable)'),
  }),

  // Website Structure
  website: z.object({
    pages: z.array(z.object({
      slug: z.string(),
      title: z.string(),
      purpose: z.string().describe('What this page accomplishes'),
      sections: z.array(z.string()).describe('Section types needed: hero, features, testimonials, pricing, cta, about, team, faq, gallery, contact, booking, products'),
      hasIntegration: z.string().optional().describe('If this page needs an integration: cal.com, stripe, contact-form'),
    })),
    navigation: z.array(z.object({
      label: z.string(),
      href: z.string(),
      isPrimaryCTA: z.boolean().optional(),
    })),
    primaryCTA: z.object({
      text: z.string(),
      action: z.enum(['booking', 'checkout', 'signup', 'contact', 'demo', 'quote']),
    }),
  }),

  // Revenue Flow
  flow: z.object({
    model: z.enum(['one-time-purchase', 'subscription', 'booking-based', 'lead-generation', 'marketplace', 'freemium', 'advertising']),
    customerJourney: z.array(z.object({
      stage: z.string(),
      description: z.string(),
      touchpoints: z.array(z.string()),
    })),
    primaryConversion: z.string().describe('The main action that generates revenue'),
    retentionStrategy: z.string().describe('How to keep customers coming back'),
  }),

  // Required Integrations
  integrations: z.object({
    required: z.array(z.object({
      provider: z.enum(['stripe', 'cal.com', 'mailchimp', 'google-analytics', 'intercom', 'zapier']),
      purpose: z.string(),
      usedOn: z.array(z.string()).describe('Page slugs where this integration appears'),
    })),
    recommended: z.array(z.object({
      provider: z.string(),
      reason: z.string(),
    })),
  }),
})

export type BusinessPlan = z.infer<typeof BusinessPlanSchema>

const PLANNER_SYSTEM_PROMPT = `You are Ernest's strategic business planner. Your job is to deeply analyze a business idea and create a comprehensive plan that will guide the generation of Brand, Website, and Flow.

IMPORTANT: You must think deeply about THIS SPECIFIC business. Every decision should be tailored to the unique context provided. Do not give generic or safe answers.

## YOUR KNOWLEDGE BASE

### Color Psychology by Context
You understand that different contexts evoke different emotional needs:
- Businesses focused on relaxation, health, wellness → calming, serene, natural colors
- Businesses focused on trust, money, security → stable, professional, authoritative colors
- Businesses focused on food, hospitality → warm, appetizing, inviting colors
- Businesses focused on innovation, technology → modern, clean, forward-thinking colors
- Businesses focused on children, play → energetic, bright, joyful colors
- Businesses focused on luxury, exclusivity → sophisticated, refined, premium colors

### Typography Psychology
You understand how fonts convey personality:
- Formal/Traditional businesses → serif fonts, heavier weights, classic proportions
- Modern/Innovative businesses → geometric sans-serifs, clean lines
- Friendly/Approachable businesses → rounded fonts, medium weights
- Luxury/Elegant businesses → high-contrast fonts, refined details
- Technical/Developer businesses → monospace or geometric fonts

### Business Model Patterns
You recognize common patterns:
- Service businesses (consulting, coaching, salons) → booking-based, relationship-focused
- E-commerce businesses → product catalog, checkout flow, shipping
- SaaS businesses → signup/trial, onboarding, subscription
- Lead generation businesses → content, lead magnets, nurture sequences
- Marketplace businesses → two-sided, transactions, fees

### Integration Mapping
You know when integrations are needed:
- Appointment/booking businesses → Cal.com for scheduling
- Payment/purchase businesses → Stripe for transactions
- Lead capture → Email service for nurturing
- Customer support → Chat/support tools

## YOUR TASK

Analyze the business description and create a comprehensive plan. Consider:

1. **Business Understanding**: What type of business is this really? What industry? What's unique about it?

2. **Target Audience**: Who are the ideal customers? What do they care about? What problems do they have?

3. **Brand Personality**: Based on the business and audience, what personality should the brand have? Use the 1-10 scales thoughtfully.

4. **Website Structure**: What pages does this specific business need? Not every business needs the same pages.

5. **Revenue Flow**: How does money flow from customer to business? What's the customer journey?

6. **Integrations**: What integrations are actually needed based on the business model?

Remember: A yoga studio in Brooklyn targeting stressed tech workers needs a DIFFERENT plan than a corporate law firm. Be specific to the context.`

export async function generateBusinessPlan(
  businessDescription: string,
  model?: string
): Promise<BusinessPlan> {
  const modelId = getModelId(model || DEFAULT_MODEL)
  const { object: plan } = await generateObject({
    model: openrouter(modelId),
    schema: BusinessPlanSchema,
    system: PLANNER_SYSTEM_PROMPT,
    prompt: `Analyze this business and create a comprehensive generation plan:

BUSINESS DESCRIPTION:
${businessDescription}

Create a detailed plan that covers:
1. Deep understanding of what this business actually is
2. Who the target customers are (be specific, not generic)
3. Brand personality that fits THIS business (use the scales thoughtfully)
4. Website structure with the specific pages this business needs
5. Revenue flow showing how customers become paying customers
6. Integrations that this specific business model requires

Think step by step. Be specific. Don't give generic answers.`,
  })

  return plan
}

// Helper to get a summary of the plan for display
export function getPlanSummary(plan: BusinessPlan): string {
  return `
Business: ${plan.business.type} in ${plan.business.industry}
Audience: ${plan.audience.primary.demographics.slice(0, 2).join(', ')}
Positioning: ${plan.brand.positioning}
Revenue Model: ${plan.flow.model}
Pages: ${plan.website.pages.map(p => p.slug).join(', ')}
Integrations: ${plan.integrations.required.map(i => i.provider).join(', ') || 'None required'}
`.trim()
}
