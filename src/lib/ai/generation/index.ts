// AI Generation Pipeline
//
// The generation flow:
// 1. Planner analyzes business description → BusinessPlan
// 2. Brand generator uses plan → Brand
// 3. Flow generator uses plan → Flow
// 4. Website generator uses plan + brand → Website pages
//
// All decisions are made by AI based on context.
// No hardcoded industry rules or templates.

export { generateBusinessPlan, getPlanSummary, type BusinessPlan } from './planner'
export { generateBrand, brandToCSSVariables, brandToTailwindConfig, generateBrandCSS, hexToHSL, type Brand } from './brand-generator'
export { generateFlow, flowToReactFlow, getNodeIcon, type Flow, type FlowNode, type FlowEdge } from './flow-generator'
export { generateWebsite, type GeneratedWebsite, type Brand as WebsiteBrand, type Overview as WebsiteOverview, type PageDefinition, type PageProgressCallback } from './website-generator'
