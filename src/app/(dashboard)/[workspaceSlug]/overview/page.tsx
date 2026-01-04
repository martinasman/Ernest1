'use client'

import { useWorkspace } from '@/hooks/use-workspace'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

export default function OverviewPage() {
  const { overview, isLoading } = useWorkspace()

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
        <Card className="lg:col-span-1 lg:row-span-2">
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
        <Card className="lg:col-span-1 lg:row-span-2">
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
        <Card className="lg:col-span-1 lg:row-span-2 bg-primary/5">
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
        <Card>
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
        <Card className="lg:row-span-2">
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
        <Card>
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
        <Card>
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
        <Card className="lg:col-span-2">
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
        <Card className="lg:col-span-3">
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
