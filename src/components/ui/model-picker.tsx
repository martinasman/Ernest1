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

const PROVIDER_ORDER = ['anthropic', 'google'] as const

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  google: 'Google',
}

// Provider logo components
function AnthropicLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0l-6.696 16.918h3.78l1.344-3.528h6.912l1.344 3.528h3.78l-6.696-16.918h-3.768zm-.576 10.632l2.46-6.456 2.46 6.456h-4.92z"/>
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

const PROVIDER_LOGOS: Record<string, React.ComponentType<{ className?: string }>> = {
  anthropic: AnthropicLogo,
  google: GoogleLogo,
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
