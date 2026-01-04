'use client'

import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  OpenRouterModel,
  MODEL_INFO,
  MODELS_BY_PROVIDER,
} from '@/lib/ai/openrouter'
import { cn } from '@/lib/utils'

interface ModelPickerProps {
  value: OpenRouterModel
  onChange: (model: OpenRouterModel) => void
  variant?: 'default' | 'dark' | 'compact'
  className?: string
}

const PROVIDER_ORDER = ['anthropic', 'openai', 'google', 'xai', 'deepseek', 'bytedance'] as const

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  xai: 'xAI',
  deepseek: 'DeepSeek',
  bytedance: 'ByteDance',
}

// Provider logo components
function AnthropicLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0l-6.696 16.918h3.78l1.344-3.528h6.912l1.344 3.528h3.78l-6.696-16.918h-3.768zm-.576 10.632l2.46-6.456 2.46 6.456h-4.92z"/>
    </svg>
  )
}

function OpenAILogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  )
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function XAILogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 2l8.5 10L2 22h2l7-8.5L18 22h4l-8.5-10L22 2h-2l-7 8.5L6 2H2z"/>
    </svg>
  )
}

function DeepSeekLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" strokeWidth="2" stroke="currentColor" fill="none"/>
      <path d="M8 12h8M12 8v8" strokeWidth="2" stroke="currentColor"/>
    </svg>
  )
}

function ByteDanceLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
  )
}

const PROVIDER_LOGOS: Record<string, React.ComponentType<{ className?: string }>> = {
  anthropic: AnthropicLogo,
  openai: OpenAILogo,
  google: GoogleLogo,
  xai: XAILogo,
  deepseek: DeepSeekLogo,
  bytedance: ByteDanceLogo,
}

// Helper to get provider from model ID
function getProviderFromModel(modelId: OpenRouterModel): string {
  for (const [providerId, models] of Object.entries(MODELS_BY_PROVIDER)) {
    if (models.includes(modelId)) {
      return providerId
    }
  }
  return 'anthropic' // fallback
}

export function ModelPicker({ value, onChange, variant = 'default', className }: ModelPickerProps) {
  const selectedModel = MODEL_INFO[value]
  const selectedProvider = getProviderFromModel(value)
  const ProviderLogo = PROVIDER_LOGOS[selectedProvider]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'compact' ? (
          <button
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-400 hover:bg-[#3a3a3a] transition-colors',
              className
            )}
          >
            {ProviderLogo && <ProviderLogo className="w-3 h-3" />}
            <span className="max-w-[100px] truncate">{selectedModel?.name || 'Model'}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-2 font-normal',
              variant === 'dark' && 'text-gray-300 hover:text-white hover:bg-white/10',
              className
            )}
          >
            {ProviderLogo && <ProviderLogo className="w-4 h-4" />}
            <span className="max-w-[120px] truncate">{selectedModel?.name || 'Select model'}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn(
          'w-56',
          (variant === 'dark' || variant === 'compact') && 'bg-[#2a2a2a] border-[#3a3a3a]'
        )}
      >
        {PROVIDER_ORDER.map((providerId, index) => {
          const models = MODELS_BY_PROVIDER[providerId]
          if (!models || models.length === 0) return null

          return (
            <div key={providerId}>
              {index > 0 && <DropdownMenuSeparator className={(variant === 'dark' || variant === 'compact') ? 'bg-white/10' : ''} />}
              <DropdownMenuGroup>
                <DropdownMenuLabel
                  className={cn(
                    'text-xs',
                    (variant === 'dark' || variant === 'compact') && 'text-gray-400'
                  )}
                >
                  {PROVIDER_LABELS[providerId]}
                </DropdownMenuLabel>
                {models.map((modelId) => {
                  const model = MODEL_INFO[modelId]
                  const isSelected = value === modelId
                  const ModelLogo = PROVIDER_LOGOS[providerId]

                  return (
                    <DropdownMenuItem
                      key={modelId}
                      onClick={() => onChange(modelId)}
                      className={cn(
                        'cursor-pointer',
                        isSelected && 'bg-primary/10',
                        (variant === 'dark' || variant === 'compact') && 'text-gray-200 focus:bg-white/10 focus:text-white'
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {ModelLogo && <ModelLogo className="w-3.5 h-3.5 opacity-70" />}
                        <span>{model.name}</span>
                      </div>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
