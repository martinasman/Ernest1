import { createOpenAI } from '@ai-sdk/openai'

// OpenRouter is compatible with OpenAI API format
// We use the OpenAI SDK with custom base URL
export const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://ernest.app',
    'X-Title': process.env.OPENROUTER_SITE_NAME || 'Ernest',
  },
})

// Available models through OpenRouter
export const OPENROUTER_MODELS = {
  // Anthropic
  'claude-haiku-4.5': 'anthropic/claude-haiku-4.5',
  'claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5',
  'claude-opus-4.5': 'anthropic/claude-opus-4.5',

  // Google
  'gemini-3-flash': 'google/gemini-3-flash-preview',
  'gemini-3-pro': 'google/gemini-3-pro-preview',
  'gemini-3-pro-image': 'google/gemini-3-pro-image-preview',
} as const

export type OpenRouterModel = keyof typeof OPENROUTER_MODELS

// Model display information for UI
export interface ModelInfo {
  id: OpenRouterModel
  name: string
  provider: string
  providerId: 'anthropic' | 'google'
}

export const MODEL_INFO: Record<OpenRouterModel, ModelInfo> = {
  'claude-haiku-4.5': { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', providerId: 'anthropic' },
  'claude-sonnet-4.5': { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', providerId: 'anthropic' },
  'claude-opus-4.5': { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic', providerId: 'anthropic' },
  'gemini-3-flash': { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google', providerId: 'google' },
  'gemini-3-pro': { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'Google', providerId: 'google' },
  'gemini-3-pro-image': { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image', provider: 'Google', providerId: 'google' },
}

// Models grouped by provider for the picker
export const MODELS_BY_PROVIDER = {
  anthropic: ['claude-haiku-4.5', 'claude-sonnet-4.5', 'claude-opus-4.5'] as OpenRouterModel[],
  google: ['gemini-3-flash', 'gemini-3-pro', 'gemini-3-pro-image'] as OpenRouterModel[],
}

// Get the model ID for OpenRouter
export function getModelId(model: OpenRouterModel | string): string {
  if (model in OPENROUTER_MODELS) {
    return OPENROUTER_MODELS[model as OpenRouterModel]
  }
  // Allow passing direct model IDs (e.g., 'anthropic/claude-3.5-sonnet')
  return model
}

// Default model for Ernest
export const DEFAULT_MODEL = 'claude-sonnet-4.5' as OpenRouterModel
export const DEFAULT_MODEL_ID = OPENROUTER_MODELS[DEFAULT_MODEL]
