'use client'

import { useEffect, useCallback } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import { useGenerationStore, getTaskDisplayName, GENERATION_STEPS } from '@/stores/generation-store'
import { useUIStore, type OverviewSelection } from '@/stores/ui-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Lean canvas field definitions for selection
const OVERVIEW_FIELDS = {
  problems: 'Problems',
  solutions: 'Solutions',
  unique_value_proposition: 'Unique Value Proposition',
  unfair_advantage: 'Unfair Advantage',
  customer_segments: 'Customer Segments',
  key_metrics: 'Key Metrics',
  channels: 'Channels',
  cost_structure: 'Cost Structure',
  revenue_streams: 'Revenue Streams',
} as const

export default function OverviewPage() {
  const { overview, isLoading } = useWorkspace()
  const isGenerating = useGenerationStore((state) => state.isGenerating)
  const tasks = useGenerationStore((state) => state.tasks)
  const currentStep = useGenerationStore((state) => state.currentStep)

  // Selection state for editing
  const selectedElement = useUIStore((state) => state.selectedElement)
  const setSelectedElement = useUIStore((state) => state.setSelectedElement)
  const clearSelection = useUIStore((state) => state.clearSelection)

  // Handle field selection
  const handleFieldSelect = useCallback((field: keyof typeof OVERVIEW_FIELDS) => {
    setSelectedElement({
      type: 'overview',
      field,
      fieldLabel: OVERVIEW_FIELDS[field],
    } as OverviewSelection)
  }, [setSelectedElement])

  // Check if a field is selected
  const isFieldSelected = (field: string) => {
    if (!selectedElement || selectedElement.type !== 'overview') return false
    return (selectedElement as OverviewSelection).field === field
  }

  // Handle Escape key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearSelection])

  // Show generating state
  if (isGenerating) {
    const currentTask = GENERATION_STEPS[currentStep]
    const completedCount = GENERATION_STEPS.filter(t => tasks[t]?.status === 'completed').length
    const progress = (completedCount / GENERATION_STEPS.length) * 100

    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6">
          {/* Animated Logo/Spinner Container */}
          <div className="relative">
            {/* Outer pulsing ring */}
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
            {/* Inner glowing ring */}
            <div className="absolute inset-2 w-20 h-20 mx-auto rounded-full bg-primary/10 animate-pulse" />
            {/* Main spinner */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
            </div>
          </div>

          {/* Title and current task */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Building Your Business
            </h2>
            <p className="text-lg text-muted-foreground">
              {currentTask ? getTaskDisplayName(currentTask) : 'Starting...'}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-64 mx-auto">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {completedCount} of {GENERATION_STEPS.length} steps complete
            </p>
          </div>

          {/* Task list with enhanced styling */}
          <div className="flex flex-col gap-3 mt-4 max-w-sm mx-auto">
            {GENERATION_STEPS.map((task, index) => {
              const taskInfo = tasks[task]
              const isCompleted = taskInfo?.status === 'completed'
              const isRunning = taskInfo?.status === 'running'
              const isPending = !isCompleted && !isRunning

              return (
                <div
                  key={task}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300',
                    isCompleted && 'bg-green-500/10',
                    isRunning && 'bg-primary/10 scale-105',
                    isPending && 'opacity-50'
                  )}
                >
                  {/* Status indicator */}
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                    isCompleted && 'bg-green-500 text-white',
                    isRunning && 'bg-primary text-white',
                    isPending && 'border-2 border-muted-foreground/30'
                  )}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isRunning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    )}
                  </div>

                  {/* Task name */}
                  <span className={cn(
                    'text-sm font-medium',
                    isCompleted && 'text-green-600',
                    isRunning && 'text-primary',
                    isPending && 'text-muted-foreground'
                  )}>
                    {getTaskDisplayName(task)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  const customerSegments = (overview?.customer_segments as any[]) || []
  const revenueStreams = (overview?.revenue_streams as any[]) || []
  const costStructure = (overview?.cost_structure as any[]) || []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Overview</h1>
        <p className="text-muted-foreground">
          Your lean canvas and business model
        </p>
      </div>

      {/* Lean Canvas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Problem */}
        <Card
          className={cn(
            'lg:col-span-1 lg:row-span-2 cursor-pointer transition-all duration-200',
            isFieldSelected('problems') && 'selection-glow'
          )}
          onClick={() => handleFieldSelect('problems')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Problem
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.problems?.length ? (
              <ul className="space-y-2">
                {overview.problems.map((problem, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-primary">•</span>
                    {problem}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Not defined</p>
            )}
            {overview?.existing_alternatives && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Existing Alternatives</p>
                <p className="text-sm">{overview.existing_alternatives}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Solution */}
        <Card
          className={cn(
            'lg:col-span-1 lg:row-span-2 cursor-pointer transition-all duration-200',
            isFieldSelected('solutions') && 'selection-glow'
          )}
          onClick={() => handleFieldSelect('solutions')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Solution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.solutions?.length ? (
              <ul className="space-y-2">
                {overview.solutions.map((solution, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-green-500">•</span>
                    {solution}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Not defined</p>
            )}
          </CardContent>
        </Card>

        {/* Unique Value Proposition */}
        <Card
          className={cn(
            'lg:col-span-1 lg:row-span-2 bg-primary/5 cursor-pointer transition-all duration-200',
            isFieldSelected('unique_value_proposition') && 'selection-glow'
          )}
          onClick={() => handleFieldSelect('unique_value_proposition')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Value Proposition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {overview?.unique_value_proposition || 'Not defined'}
            </p>
            {overview?.high_level_concept && (
              <Badge variant="secondary" className="mt-2">
                {overview.high_level_concept}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Unfair Advantage */}
        <Card
          className={cn(
            'cursor-pointer transition-all duration-200',
            isFieldSelected('unfair_advantage') && 'selection-glow'
          )}
          onClick={() => handleFieldSelect('unfair_advantage')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unfair Advantage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {overview?.unfair_advantage || 'Not defined'}
            </p>
          </CardContent>
        </Card>

        {/* Customer Segments */}
        <Card
          className={cn(
            'lg:row-span-2 cursor-pointer transition-all duration-200',
            isFieldSelected('customer_segments') && 'selection-glow'
          )}
          onClick={() => handleFieldSelect('customer_segments')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customer Segments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customerSegments.length ? (
              <ul className="space-y-3">
                {customerSegments.map((segment, i) => (
                  <li key={i}>
                    <p className="text-sm font-medium">{segment.name}</p>
                    <p className="text-xs text-muted-foreground">{segment.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Not defined</p>
            )}
            {overview?.early_adopters && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Early Adopters</p>
                <p className="text-sm">{overview.early_adopters}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card
          className={cn(
            'cursor-pointer transition-all duration-200',
            isFieldSelected('key_metrics') && 'selection-glow'
          )}
          onClick={() => handleFieldSelect('key_metrics')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Key Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.key_metrics?.length ? (
              <div className="flex flex-wrap gap-1">
                {overview.key_metrics.map((metric, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {metric}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not defined</p>
            )}
          </CardContent>
        </Card>

        {/* Channels */}
        <Card
          className={cn(
            'cursor-pointer transition-all duration-200',
            isFieldSelected('channels') && 'selection-glow'
          )}
          onClick={() => handleFieldSelect('channels')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.channels?.length ? (
              <div className="flex flex-wrap gap-1">
                {overview.channels.map((channel, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {channel}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not defined</p>
            )}
          </CardContent>
        </Card>

        {/* Cost Structure */}
        <Card
          className={cn(
            'lg:col-span-2 cursor-pointer transition-all duration-200',
            isFieldSelected('cost_structure') && 'selection-glow'
          )}
          onClick={() => handleFieldSelect('cost_structure')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cost Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costStructure.length ? (
              <div className="space-y-2">
                {costStructure.map((cost, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{cost.name}</span>
                    <span className="text-muted-foreground">
                      {cost.amount ? `$${cost.amount}` : cost.type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not defined</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue Streams */}
        <Card
          className={cn(
            'lg:col-span-3 cursor-pointer transition-all duration-200',
            isFieldSelected('revenue_streams') && 'selection-glow'
          )}
          onClick={() => handleFieldSelect('revenue_streams')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue Streams
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueStreams.length ? (
              <div className="grid grid-cols-2 gap-4">
                {revenueStreams.map((stream, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">{stream.name}</p>
                    <p className="text-xs text-muted-foreground">{stream.type}</p>
                    {stream.price && (
                      <p className="text-lg font-bold mt-1">${stream.price}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not defined</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Use the AI assistant to build out your business model. Try saying &quot;Our main problem is...&quot; or &quot;Add a revenue stream for monthly subscriptions at $29/month&quot;.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
