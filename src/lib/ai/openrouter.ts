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
  'claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5',
  'claude-opus-4.5': 'anthropic/claude-opus-4.5',
  'claude-haiku-4.5': 'anthropic/claude-haiku-4.5',

  // OpenAI
  'gpt-5.2': 'openai/gpt-5.2',
  'gpt-5.2-pro': 'openai/gpt-5.2-pro',

  // Google
  'gemini-3-flash': 'google/gemini-3-flash-preview',
  'gemini-3-pro': 'google/gemini-3-pro-preview',

  // xAI
  'grok-4.1-fast': 'x-ai/grok-4.1-fast',

  // DeepSeek
  'deepseek-v3': 'deepseek/deepseek-chat',

  // Image models
  'seedream-4.5': 'bytedance-seed/seedream-4.5',
  'gemini-3-pro-image': 'google/gemini-3-pro-image-preview',
} as const

export type OpenRouterModel = keyof typeof OPENROUTER_MODELS

// Model display information for UI
export interface ModelInfo {
  id: OpenRouterModel
  name: string
  provider: string
  providerId: 'anthropic' | 'openai' | 'google' | 'xai' | 'deepseek' | 'bytedance'
}

export const MODEL_INFO: Record<OpenRouterModel, ModelInfo> = {
  'claude-sonnet-4.5': { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', providerId: 'anthropic' },
  'claude-opus-4.5': { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic', providerId: 'anthropic' },
  'claude-haiku-4.5': { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', providerId: 'anthropic' },
  'gpt-5.2': { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI', providerId: 'openai' },
  'gpt-5.2-pro': { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', provider: 'OpenAI', providerId: 'openai' },
  'gemini-3-flash': { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google', providerId: 'google' },
  'gemini-3-pro': { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'Google', providerId: 'google' },
  'grok-4.1-fast': { id: 'grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'xAI', providerId: 'xai' },
  'deepseek-v3': { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', providerId: 'deepseek' },
  'seedream-4.5': { id: 'seedream-4.5', name: 'Seedream 4.5', provider: 'ByteDance', providerId: 'bytedance' },
  'gemini-3-pro-image': { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image', provider: 'Google', providerId: 'google' },
}

// Models grouped by provider for the picker
export const MODELS_BY_PROVIDER = {
  anthropic: ['claude-sonnet-4.5', 'claude-opus-4.5', 'claude-haiku-4.5'] as OpenRouterModel[],
  openai: ['gpt-5.2', 'gpt-5.2-pro'] as OpenRouterModel[],
  google: ['gemini-3-flash', 'gemini-3-pro', 'gemini-3-pro-image'] as OpenRouterModel[],
  xai: ['grok-4.1-fast'] as OpenRouterModel[],
  deepseek: ['deepseek-v3'] as OpenRouterModel[],
  bytedance: ['seedream-4.5'] as OpenRouterModel[],
}

// Get the model ID for OpenRouter
export function getModelId(model: OpenRouterModel | string): string {
  if (model in OPENROUTER_MODELS) {
    return OPENROUTER_MODELS[model as OpenRouterModel]
  }
  // Allow passing direct model IDs (e.g., 'anthropic/claude-sonnet-4.5')
  return model
}

// Default model for Ernest
export const DEFAULT_MODEL = 'claude-sonnet-4.5' as OpenRouterModel
export const DEFAULT_MODEL_ID = OPENROUTER_MODELS[DEFAULT_MODEL]
