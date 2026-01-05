'use client'

import { useWorkspace } from '@/hooks/use-workspace'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  const { workspace } = useWorkspace()

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace settings
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic workspace information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              key={`name-${workspace?.id}`}
              defaultValue={workspace?.name || ''}
              placeholder="My Business"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              key={`slug-${workspace?.id}`}
              defaultValue={workspace?.slug || ''}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Your workspace URL: ernest.app/{workspace?.slug}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <textarea
              id="description"
              key={`desc-${workspace?.id}`}
              className="w-full min-h-[80px] px-3 py-2 border rounded-md"
              defaultValue={workspace?.business_description || ''}
              placeholder="Describe your business..."
            />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Business Type */}
      <Card>
        <CardHeader>
          <CardTitle>Business Type</CardTitle>
          <CardDescription>How your business operates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['Product', 'Service', 'SaaS', 'Agency', 'Marketplace'].map((type) => (
              <Badge
                key={type}
                variant={workspace?.business_type === type.toLowerCase() ? 'default' : 'outline'}
                className="cursor-pointer"
              >
                {type}
              </Badge>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              key={`country-${workspace?.id}`}
              defaultValue={workspace?.country_code || 'US'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Workspace</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this workspace and all its data
              </p>
            </div>
            <Button variant="destructive">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
