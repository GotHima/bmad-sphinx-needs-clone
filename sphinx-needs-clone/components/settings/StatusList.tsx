'use client'

import { useState } from 'react'
import { Lock, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/needs/StatusBadge'
import { createStatus, deleteStatus } from '@/lib/actions/statuses'
import type { StatusValue } from '@/types'

interface StatusListProps {
  initialStatuses: StatusValue[]
}

export function StatusList({ initialStatuses }: StatusListProps) {
  const [statuses, setStatuses] = useState<StatusValue[]>(initialStatuses)
  const [isAdding, setIsAdding] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [isPending, setIsPending] = useState(false)

  async function handleAdd() {
    if (isPending) return
    setIsPending(true)
    try {
      const result = await createStatus(newValue)
      if (result.success) {
        setStatuses(prev => [...prev, result.data])
        setNewValue('')
        setIsAdding(false)
        toast('Saved.')
      } else {
        toast.error(result.error)
      }
    } finally {
      setIsPending(false)
    }
  }

  async function handleDelete(id: number) {
    const result = await deleteStatus(id)
    if (result.success) {
      setStatuses(prev => prev.filter(s => s.id !== id))
      toast('Deleted.')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage the lifecycle status values available for needs.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
        >
          <Plus className="size-3.5 mr-1.5" />
          Add Status
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Value</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr className="border-b bg-muted/20">
                <td className="px-4 py-2.5">
                  <Input
                    autoFocus
                    placeholder="e.g. closed"
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') void handleAdd()
                      if (e.key === 'Escape') {
                        setIsAdding(false)
                        setNewValue('')
                      }
                    }}
                    maxLength={50}
                    className="h-7 text-sm max-w-[200px]"
                    aria-label="New status value"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => void handleAdd()}
                      disabled={isPending || !newValue.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAdding(false)
                        setNewValue('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            )}
            {statuses.map(status => (
              <tr key={status.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {status.value === 'open' && (
                      <Lock className="size-3.5 text-muted-foreground shrink-0" aria-label="Default status — cannot be deleted" />
                    )}
                    <StatusBadge value={status.value} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    {status.value === 'open' ? (
                      <Tooltip>
                        <TooltipTrigger render={<span className="cursor-not-allowed" />}>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled
                            aria-label="Cannot delete default status"
                            className="pointer-events-none"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cannot delete the default status</TooltipContent>
                      </Tooltip>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Delete ${status.value}`}
                              className="text-muted-foreground hover:text-destructive"
                            />
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete status?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the <strong>{status.value}</strong> status value.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => void handleDelete(status.id)}
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
            ))}
            {statuses.length === 0 && !isAdding && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No status values yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
