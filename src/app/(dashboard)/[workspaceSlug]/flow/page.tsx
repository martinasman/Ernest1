'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GitBranch, ArrowRight } from 'lucide-react'

export default function FlowPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Flow</h1>
        <p className="text-muted-foreground">
          Visualize how your business operates
        </p>
      </div>

      {/* Placeholder Flow Diagram */}
      <Card className="min-h-[400px]">
        <CardContent className="flex items-center justify-center h-full py-16">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-24 h-16 rounded-lg bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">Customer</span>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
              <div className="w-24 h-16 rounded-lg bg-green-500/10 border-2 border-green-500 flex items-center justify-center">
                <span className="text-sm font-medium text-green-600">Product</span>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
              <div className="w-24 h-16 rounded-lg bg-purple-500/10 border-2 border-purple-500 flex items-center justify-center">
                <span className="text-sm font-medium text-purple-600">Revenue</span>
              </div>
            </div>
            <p className="text-muted-foreground mb-4">
              Interactive flow editor coming soon
            </p>
            <p className="text-sm text-muted-foreground">
              For now, describe your business flow to the AI assistant
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Flow Elements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Acquisition
            </CardTitle>
            <CardDescription>How customers find you</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define your marketing channels and customer acquisition strategy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Delivery
            </CardTitle>
            <CardDescription>How you deliver value</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define your product or service delivery process
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              Revenue
            </CardTitle>
            <CardDescription>How money flows</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define your pricing and payment collection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Coming Soon:</strong> Full React Flow editor for creating and editing business flow diagrams. Ask the AI to help you map out your business processes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
