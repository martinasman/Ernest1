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
      formal: z.number().describe('1-10 scale: 1=very casual, 10=very formal'),
      playful: z.number().describe('1-10 scale: 1=serious, 10=playful'),
      traditional: z.number().describe('1-10 scale: 1=cutting-edge modern, 10=classic traditional'),
      bold: z.number().describe('1-10 scale: 1=subtle/understated, 10=bold/loud'),
      warm: z.number().describe('1-10 scale: 1=cool/professional, 10=warm/friendly'),
    }),
    positioning: z.enum(['budget', 'mid-market', 'premium', 'luxury']),
    values: z.array(z.string()).describe('3-5 core brand values'),
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
      forms: z.array(z.object({
        id: z.string().describe('Unique form ID like "contact-form", "booking-form"'),
        purpose: z.string().describe('What this form does'),
        targetTool: z.string().describe('Tool slug this form submits to (e.g., "customers", "reservations")'),
        fields: z.array(z.string()).describe('Field names from the target tool schema'),
        integration: z.enum(['stripe', 'calcom']).optional().describe('If form triggers an integration'),
      })).optional().describe('Forms on this page that submit to internal tools'),
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

  // Internal Tools for Business Owner
  suggestedTools: z.array(z.object({
    name: z.string().describe('Human-readable name like "Menu Items", "Reservations"'),
    slug: z.string().describe('URL-safe slug like "menu-items", "reservations"'),
    icon: z.string().describe('Lucide icon name like "UtensilsCrossed", "Calendar", "Users"'),
    description: z.string().describe('What this tool helps manage'),
    viewType: z.enum(['table', 'kanban', 'calendar', 'cards']).describe('Best view for this data'),
    schema: z.object({
      fields: z.array(z.object({
        name: z.string().describe('Field name in snake_case'),
        type: z.enum(['text', 'email', 'phone', 'number', 'currency', 'date', 'datetime', 'time', 'select', 'boolean', 'textarea', 'url', 'image']),
        label: z.string().describe('Human-readable label'),
        required: z.boolean(),
        options: z.array(z.string()).optional().describe('For select type - list of options'),
      })),
    }),
  })).describe('2-5 internal tools the business owner needs to manage their business'),
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

### Internal Tools by Business Type
You know what tools each business type needs:

**RESTAURANT/CAFE/BAR:**
- Menu Items (table): name, description, price, category, dietary_tags, available
- Reservations (calendar): customer_name, email, phone, party_size, date, time, status, notes
- Customers (table): name, email, phone, preferences, visit_count, notes

**SALON/SPA/FITNESS:**
- Services (table): name, description, price, duration, category
- Appointments (calendar): client_name, email, phone, service, datetime, staff, status, notes
- Clients (table): name, email, phone, preferences, notes

**RETAIL/E-COMMERCE:**
- Products (cards): name, description, price, sku, category, stock, image_url
- Orders (kanban): customer_name, email, items, total, status, shipping_address
- Customers (table): name, email, phone, address, order_count

**AGENCY/CONSULTING:**
- Projects (kanban): name, client, status, deadline, budget, description
- Clients (table): company, contact_name, email, phone, industry, notes
- Leads (kanban): company, contact_name, email, source, status, value

**HEALTHCARE/DENTAL:**
- Appointments (calendar): patient_name, email, phone, datetime, type, status, notes
- Patients (table): name, email, phone, dob, insurance, medical_notes

**EDUCATION/COACHING:**
- Students (table): name, email, phone, program, enrollment_date, status
- Sessions (calendar): student_name, datetime, type, status, notes
- Courses (cards): name, description, price, duration, capacity

### Form → Tool Connections
Website forms should connect to internal tools:
- Contact form → Customers/Leads tool
- Booking form → Reservations/Appointments tool (with Cal.com)
- Order form → Orders tool (with Stripe)
- Newsletter signup → Customers tool (email field only)

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
7. Internal tools the business owner needs (2-5 tools with full field schemas)
8. Forms on the website that connect to those internal tools

IMPORTANT for suggestedTools:
- Each tool must have a complete schema with field types
- Use appropriate view types: calendar for time-based data, kanban for status-based, table for lists, cards for visual items
- Include status fields with options like: ["pending", "confirmed", "completed", "cancelled"]
- Field types: text, email, phone, number, currency, date, datetime, time, select, boolean, textarea

IMPORTANT for forms:
- Every contact/booking/order form must specify a targetTool (the tool slug it submits to)
- List the field names that the form captures (must match tool schema fields)
- Add integration if form triggers Cal.com or Stripe

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
