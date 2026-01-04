'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/hooks/use-workspace'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, LayoutGrid, Columns } from 'lucide-react'

interface ToolRecord {
  id: string
  data: Record<string, any>
  created_at: string
}

interface Field {
  name: string
  type: string
  label: string
  required?: boolean
  options?: string[]
}

export default function ToolPage() {
  const params = useParams()
  const toolSlug = params?.toolSlug as string
  const { workspace, tools } = useWorkspace()

  const [records, setRecords] = useState<ToolRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ToolRecord | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

  const tool = tools?.find(t => t.slug === toolSlug)
  const schema = tool?.schema_definition as any
  const fields: Field[] = schema?.fields || []
  const uiDef = tool?.ui_definition as any

  // Fetch records
  useEffect(() => {
    if (!tool?.id) return

    const fetchRecords = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('internal_tool_records')
        .select('*')
        .eq('tool_id', tool.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRecords(data)
      }
      setIsLoading(false)
    }

    fetchRecords()
  }, [tool?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabase = createClient()

    if (editingRecord) {
      // Update existing record
      const { error } = await supabase
        .from('internal_tool_records')
        .update({ data: formData })
        .eq('id', editingRecord.id)

      if (!error) {
        setRecords(records.map(r =>
          r.id === editingRecord.id ? { ...r, data: formData } : r
        ))
      }
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('internal_tool_records')
        .insert({
          tool_id: tool?.id,
          workspace_id: workspace?.id,
          data: formData
        })
        .select()
        .single()

      if (!error && data) {
        setRecords([data, ...records])
      }
    }

    setIsDialogOpen(false)
    setEditingRecord(null)
    setFormData({})
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('internal_tool_records')
      .delete()
      .eq('id', recordId)

    if (!error) {
      setRecords(records.filter(r => r.id !== recordId))
    }
  }

  const openEditDialog = (record: ToolRecord) => {
    setEditingRecord(record)
    setFormData(record.data)
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingRecord(null)
    setFormData({})
    setIsDialogOpen(true)
  }

  if (isLoading || !tool) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  // Get visible columns for table
  const tableColumns = uiDef?.views?.find((v: any) => v.type === 'table')?.config?.columns || fields.slice(0, 5).map(f => f.name)

  // Check if kanban is available
  const hasKanban = uiDef?.views?.some((v: any) => v.type === 'kanban')
  const statusField = fields.find(f => f.name === 'status' && f.type === 'select')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tool.name}</h1>
          <p className="text-muted-foreground">{tool.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasKanban && (
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <Columns className="w-4 h-4" />
              </Button>
            </div>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit Record' : 'New Record'}</DialogTitle>
                <DialogDescription>
                  {editingRecord ? 'Update the record details' : 'Add a new record to ' + tool.name}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  {fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.type === 'select' ? (
                        <Select
                          value={formData[field.name] || ''}
                          onValueChange={(value) => setFormData({ ...formData, [field.name]: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === 'textarea' || field.type === 'richtext' ? (
                        <textarea
                          id={field.name}
                          className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          required={field.required}
                        />
                      ) : (
                        <Input
                          id={field.name}
                          type={field.type === 'email' ? 'email' : field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRecord ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {tableColumns.map((colName: string) => {
                  const field = fields.find(f => f.name === colName)
                  return (
                    <TableHead key={colName}>{field?.label || colName}</TableHead>
                  )
                })}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColumns.length + 1} className="text-center py-8 text-muted-foreground">
                    No records yet. Click &quot;Add Record&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    {tableColumns.map((colName: string) => {
                      const field = fields.find(f => f.name === colName)
                      const value = record.data[colName]

                      return (
                        <TableCell key={colName}>
                          {field?.type === 'select' ? (
                            <Badge variant="secondary">{value}</Badge>
                          ) : field?.type === 'currency' ? (
                            value ? `$${value}` : '-'
                          ) : (
                            value || '-'
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(record)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && statusField && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statusField.options?.map((status) => {
            const statusRecords = records.filter(r => r.data.status === status)
            const primaryDisplay = schema?.primaryDisplay || fields[0]?.name

            return (
              <div key={status} className="flex-shrink-0 w-72">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium capitalize">{status}</h3>
                    <Badge variant="secondary">{statusRecords.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {statusRecords.map((record) => (
                      <Card key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditDialog(record)}>
                        <CardContent className="p-3">
                          <p className="font-medium">{record.data[primaryDisplay]}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(record.created_at).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                    {statusRecords.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No records
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
