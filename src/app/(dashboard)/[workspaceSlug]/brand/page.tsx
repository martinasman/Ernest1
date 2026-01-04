'use client'

import { useWorkspace } from '@/hooks/use-workspace'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

export default function BrandPage() {
  const { brand, isLoading } = useWorkspace()

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const colors = brand?.colors as Record<string, string> || {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f59e0b',
    background: '#ffffff',
    foreground: '#0f172a'
  }

  const fonts = brand?.fonts as Record<string, string> || {
    heading: 'Inter',
    body: 'Inter'
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Brand Identity</h1>
        <p className="text-muted-foreground">
          Manage your visual identity, colors, fonts, and brand voice
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Info */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Information</CardTitle>
            <CardDescription>Basic brand details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Brand Name</label>
              <p className="text-lg font-semibold">{brand?.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tagline</label>
              <p>{brand?.tagline || 'No tagline set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tone of Voice</label>
              <Badge variant="secondary" className="mt-1">
                {brand?.tone_of_voice || 'professional'}
              </Badge>
            </div>
            {brand?.brand_values && brand.brand_values.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Brand Values</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {brand.brand_values.map((value, i) => (
                    <Badge key={i} variant="outline">{value}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Your brand colors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(colors).map(([name, color]) => (
                <div key={name} className="space-y-2">
                  <div
                    className="h-16 rounded-lg border"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <p className="text-sm font-medium capitalize">{name}</p>
                    <p className="text-xs text-muted-foreground">{color}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Font selections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Heading Font</label>
              <p className="text-2xl" style={{ fontFamily: fonts.heading }}>
                {fonts.heading}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Body Font</label>
              <p className="text-lg" style={{ fontFamily: fonts.body }}>
                {fonts.body}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Border Radius</label>
              <Badge variant="secondary">{brand?.border_radius || 'md'}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Logo Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>Your brand logo</CardDescription>
          </CardHeader>
          <CardContent>
            {brand?.logo_url ? (
              <img
                src={brand.logo_url}
                alt="Brand logo"
                className="max-h-32 object-contain"
              />
            ) : (
              <div className="h-32 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                <p className="text-sm">No logo uploaded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Use the AI assistant to update your brand. Try saying &quot;Change my primary color to purple&quot; or &quot;Set my brand tone to friendly&quot;.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
