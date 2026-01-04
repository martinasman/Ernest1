import { generateObject } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { z } from 'zod'
import type { BusinessPlan } from './planner'

// Node types for the flow diagram
const FlowNodeTypeSchema = z.enum([
  // Traffic Sources
  'traffic_organic',
  'traffic_paid',
  'traffic_social',
  'traffic_referral',
  'traffic_direct',

  // Engagement
  'landing_page',
  'website',
  'content',
  'lead_magnet',

  // Conversion
  'form_capture',
  'booking',
  'checkout',
  'signup',
  'demo',
  'quote',

  // Fulfillment
  'service_delivery',
  'product_shipping',
  'digital_delivery',
  'onboarding',

  // Retention
  'follow_up',
  'support',
  'upsell',
  'referral_program',

  // Revenue
  'one_time_payment',
  'subscription',
  'commission',

  // Logic
  'condition',
  'segment',
])

const FlowNodeSchema = z.object({
  id: z.string(),
  type: FlowNodeTypeSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    label: z.string(),
    description: z.string().optional(),
    linkedPageSlug: z.string().optional().describe('Website page this node connects to'),
    integrationProvider: z.string().optional().describe('Integration needed: stripe, cal.com, etc'),
    metrics: z.object({
      label: z.string(),
      placeholder: z.string(),
    }).optional(),
  }),
})

const FlowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  type: z.enum(['default', 'success', 'failure', 'conditional']).optional(),
})

const FlowSchema = z.object({
  nodes: z.array(FlowNodeSchema),
  edges: z.array(FlowEdgeSchema),
  keyInsights: z.array(z.string()).describe('Key insights about this business flow'),
})

export type Flow = z.infer<typeof FlowSchema>
export type FlowNode = z.infer<typeof FlowNodeSchema>
export type FlowEdge = z.infer<typeof FlowEdgeSchema>

const FLOW_SYSTEM_PROMPT = `You are Ernest's flow generation system. Your job is to create visual business flow diagrams that show how customers become paying customers.

## FLOW PATTERNS BY BUSINESS MODEL

You understand common patterns but adapt them to specific contexts:

**Service/Booking Businesses (consulting, coaching, salons, yoga):**
Traffic Sources → Website/Landing → Booking Page (Cal.com) → Service Delivery → Follow-up → Referral
- Primary conversion: booking an appointment
- Key metric: bookings per week, show rate

**E-commerce/Product Businesses:**
Traffic Sources → Website → Product Browse → Add to Cart → Checkout (Stripe) → Shipping → Review Request
- Primary conversion: completed purchase
- Key metrics: conversion rate, average order value

**SaaS/Software Businesses:**
Traffic Sources → Landing Page → Signup/Trial → Onboarding → Activation → Subscription → Expansion
- Primary conversion: paid subscription
- Key metrics: trial-to-paid, activation rate, churn

**Lead Generation (agencies, B2B):**
Traffic Sources → Content/Blog → Lead Magnet → Email Nurture → Booking/Demo → Proposal → Close
- Primary conversion: qualified lead
- Key metrics: lead quality, close rate

**Marketplace:**
Buyer: Traffic → Browse → Purchase → Commission
Seller: Signup → Listing → Sale → Payout
- Primary conversion: transactions
- Key metrics: GMV, take rate

## LAYOUT GUIDELINES

Create a clean, readable flow:
- Traffic sources at top (y: 0-100)
- Engagement in middle (y: 200-400)
- Conversion points (y: 500-600)
- Fulfillment/retention at bottom (y: 700-900)
- Space nodes horizontally (x increments of 200-250)
- Keep the flow mostly top-to-bottom
- Use side branches for alternatives or conditions

## NODE CONNECTIONS

- Link nodes to website pages where appropriate (e.g., landing_page → linkedPageSlug: 'home')
- Mark nodes that need integrations (e.g., checkout → integrationProvider: 'stripe')
- Include metrics placeholders for key conversion points

## YOUR TASK

Given a business plan, create a flow diagram that:
1. Shows the complete customer journey from discovery to revenue
2. Uses appropriate node types for this specific business
3. Links nodes to website pages and integrations
4. Includes retention/referral loops
5. Is clean and readable

Create a flow that makes sense for THIS specific business, not a generic template.`

export async function generateFlow(
  plan: BusinessPlan,
  model?: string
): Promise<Flow> {
  const modelId = getModelId(model || DEFAULT_MODEL)
  // Get website pages for linking
  const pagesList = plan.website.pages.map(p => `${p.slug} (${p.purpose})`).join(', ')
  const integrationsList = plan.integrations.required.map(i => `${i.provider} for ${i.purpose}`).join(', ')

  const { object: flow } = await generateObject({
    model: openrouter(modelId),
    schema: FlowSchema,
    system: FLOW_SYSTEM_PROMPT,
    prompt: `Create a business flow diagram for this business:

BUSINESS:
- Type: ${plan.business.type}
- Industry: ${plan.business.industry}
- Description: ${plan.business.description}

REVENUE MODEL: ${plan.flow.model}
- Primary Conversion: ${plan.flow.primaryConversion}
- Retention Strategy: ${plan.flow.retentionStrategy}

CUSTOMER JOURNEY FROM PLAN:
${plan.flow.customerJourney.map(stage =>
  `- ${stage.stage}: ${stage.description} (Touchpoints: ${stage.touchpoints.join(', ')})`
).join('\n')}

WEBSITE PAGES AVAILABLE:
${pagesList}

INTEGRATIONS NEEDED:
${integrationsList}

Create a flow diagram that:
1. Shows how customers in this ${plan.business.industry} business discover and engage
2. Leads to the primary conversion: ${plan.flow.primaryConversion}
3. Links to the appropriate website pages
4. Marks where integrations are needed
5. Includes the retention loop: ${plan.flow.retentionStrategy}

Make sure node positions create a clean, readable layout.
Use IDs like 'node_1', 'node_2', etc.
Edge IDs should be 'edge_source_target'.`,
  })

  return flow
}

// Convert to React Flow format
export function flowToReactFlow(flow: Flow) {
  return {
    nodes: flow.nodes.map(node => ({
      id: node.id,
      type: getReactFlowNodeType(node.type),
      position: node.position,
      data: {
        ...node.data,
        nodeType: node.type, // Keep original type for styling
      },
    })),
    edges: flow.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type === 'conditional' ? 'smoothstep' : 'default',
      animated: edge.type === 'success',
      style: edge.type === 'failure' ? { stroke: '#ef4444' } : undefined,
    })),
  }
}

// Map our node types to React Flow node types
function getReactFlowNodeType(type: z.infer<typeof FlowNodeTypeSchema>): string {
  // Traffic sources
  if (type.startsWith('traffic_')) return 'trafficNode'

  // Conversion points
  if (['booking', 'checkout', 'signup', 'demo', 'quote', 'form_capture'].includes(type)) {
    return 'conversionNode'
  }

  // Revenue
  if (['one_time_payment', 'subscription', 'commission'].includes(type)) {
    return 'revenueNode'
  }

  // Integration nodes
  if (['booking', 'checkout'].includes(type)) return 'integrationNode'

  // Default
  return 'defaultNode'
}

// Get icon suggestion for node type
export function getNodeIcon(type: z.infer<typeof FlowNodeTypeSchema>): string {
  const icons: Record<string, string> = {
    traffic_organic: 'Search',
    traffic_paid: 'Megaphone',
    traffic_social: 'Share2',
    traffic_referral: 'Users',
    traffic_direct: 'Globe',
    landing_page: 'Layout',
    website: 'Globe',
    content: 'FileText',
    lead_magnet: 'Gift',
    form_capture: 'Mail',
    booking: 'Calendar',
    checkout: 'CreditCard',
    signup: 'UserPlus',
    demo: 'Play',
    quote: 'FileQuestion',
    service_delivery: 'CheckCircle',
    product_shipping: 'Truck',
    digital_delivery: 'Download',
    onboarding: 'Compass',
    follow_up: 'Mail',
    support: 'HeadphonesIcon',
    upsell: 'TrendingUp',
    referral_program: 'Gift',
    one_time_payment: 'DollarSign',
    subscription: 'Repeat',
    commission: 'Percent',
    condition: 'GitBranch',
    segment: 'Users',
  }
  return icons[type] || 'Circle'
}
