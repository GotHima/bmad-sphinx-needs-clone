'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Plus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NeedTypeBadge } from '@/components/needs/NeedTypeBadge'
import { createNeedType, updateNeedType, deleteNeedType } from '@/lib/actions/types'
import type { NeedType } from '@/types'

type NeedTypeWithCount = NeedType & { needs_count: number }

const EMPTY_DRAFT = { name: '', prefix: '', color: '#2563EB' }

interface NeedTypeTableProps {
  initialTypes: NeedTypeWithCount[]
}

export function NeedTypeTable({ initialTypes }: NeedTypeTableProps) {
  const [types, setTypes] = useState<NeedTypeWithCount[]>(initialTypes)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState(EMPTY_DRAFT)
  const [isAdding, setIsAdding] = useState(false)
  const [newDraft, setNewDraft] = useState(EMPTY_DRAFT)
  const [isPending, setIsPending] = useState(false)

  function startEdit(row: NeedTypeWithCount) {
    setIsAdding(false)
    setNewDraft(EMPTY_DRAFT)
    setEditingId(row.id)
    setEditDraft({ name: row.name, prefix: row.prefix, color: row.color })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft(EMPTY_DRAFT)
  }

  function cancelAdd() {
    setIsAdding(false)
    setNewDraft(EMPTY_DRAFT)
  }

  async function handleAdd() {
    setIsPending(true)
    const result = await createNeedType(newDraft)
    setIsPending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setTypes(prev => [{ ...result.data, needs_count: 0 }, ...prev])
    setIsAdding(false)
    setNewDraft(EMPTY_DRAFT)
    toast('Saved.')
  }

  async function handleSaveEdit() {
    if (editingId === null) return
    setIsPending(true)
    const result = await updateNeedType(editingId, editDraft)
    setIsPending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setTypes(prev =>
      prev.map(t =>
        t.id === editingId
          ? { ...result.data, needs_count: t.needs_count }
          : t
      )
    )
    setEditingId(null)
    setEditDraft(EMPTY_DRAFT)
    toast('Saved.')
  }

  async function handleDelete(id: number) {
    setIsPending(true)
    const result = await deleteNeedType(id)
    setIsPending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setTypes(prev => prev.filter(t => t.id !== id))
    toast('Deleted.')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define the types of needs used in your project.
        </p>
        {!isAdding && (
          <Button
            size="sm"
            onClick={() => { setEditingId(null); setEditDraft(EMPTY_DRAFT); setIsAdding(true) }}
          >
            <Plus className="size-3.5" />
            Add Need Type
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-[35%]">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-[20%]">Prefix</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-[25%]">Color</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-[20%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr className="border-b border-border bg-background">
                <td className="px-3 py-2">
                  <Input
                    value={newDraft.name}
                    onChange={e => setNewDraft(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Requirement"
                    onKeyDown={e => { if (e.key === 'Escape') cancelAdd() }}
                    autoFocus
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={newDraft.prefix}
                    onChange={e =>
                      setNewDraft(prev => ({
                        ...prev,
                        prefix: e.target.value.toUpperCase().slice(0, 6),
                      }))
                    }
                    placeholder="e.g. REQ"
                    onKeyDown={e => { if (e.key === 'Escape') cancelAdd() }}
                    className="font-mono"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="color"
                    value={newDraft.color}
                    onChange={e => setNewDraft(prev => ({ ...prev, color: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Escape') cancelAdd() }}
                    aria-label="Color"
                    className="h-8 w-12 cursor-pointer rounded border border-input bg-transparent p-0.5"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon-sm"
                      variant="default"
                      onClick={e => { e.stopPropagation(); void handleAdd() }}
                      disabled={isPending}
                      aria-label="Save new type"
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={e => { e.stopPropagation(); cancelAdd() }}
                      aria-label="Cancel"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {types.length === 0 && !isAdding && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No need types yet. Click "Add Need Type" to create one.
                </td>
              </tr>
            )}

            {types.map(row =>
              editingId === row.id ? (
                <tr key={row.id} className="border-b border-border bg-muted/20">
                  <td className="px-3 py-2">
                    <Input
                      value={editDraft.name}
                      onChange={e => setEditDraft(prev => ({ ...prev, name: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
                      autoFocus
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={editDraft.prefix}
                      onChange={e =>
                        setEditDraft(prev => ({
                          ...prev,
                          prefix: e.target.value.toUpperCase().slice(0, 6),
                        }))
                      }
                      onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
                      className="font-mono"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="color"
                      value={editDraft.color}
                      onChange={e => setEditDraft(prev => ({ ...prev, color: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
                      aria-label="Color"
                      className="h-8 w-12 cursor-pointer rounded border border-input bg-transparent p-0.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="default"
                        onClick={e => { e.stopPropagation(); void handleSaveEdit() }}
                        disabled={isPending}
                        aria-label="Save changes"
                      >
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={e => { e.stopPropagation(); cancelEdit() }}
                        aria-label="Cancel edit"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr
                  key={row.id}
                  onClick={() => startEdit(row)}
                  className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{row.prefix}</td>
                  <td className="px-4 py-3">
                    <NeedTypeBadge name={row.name} color={row.color} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      {row.needs_count > 0 ? (
                        <Tooltip>
                          <TooltipTrigger render={<span className="cursor-not-allowed" />}>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled
                              aria-label={`Delete ${row.name} (in use)`}
                              onClick={e => e.stopPropagation()}
                              className="pointer-events-none"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            In use by {row.needs_count} need(s)
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Delete ${row.name}`}
                                onClick={e => e.stopPropagation()}
                                className="text-muted-foreground hover:text-destructive"
                              />
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete need type?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the <strong>{row.name}</strong> ({row.prefix}) type.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => void handleDelete(row.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
