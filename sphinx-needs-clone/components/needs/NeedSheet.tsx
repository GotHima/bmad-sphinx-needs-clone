'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { suggestNeedId, createNeed } from '@/lib/actions/needs'
import type { NeedType, StatusValue } from '@/types'

interface NeedSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  types: NeedType[]
  statuses: StatusValue[]
}

interface FormState {
  type_id: number
  id: string
  title: string
  status: string
  tags: string
  description: string
}

function defaultForm(types: NeedType[]): FormState {
  return {
    type_id: types[0]?.id ?? 0,
    id: '',
    title: '',
    status: 'open',
    tags: '',
    description: '',
  }
}

export function NeedSheet({ open, onOpenChange, types, statuses }: NeedSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formState, setFormState] = useState<FormState>(() => defaultForm(types))
  const [idError, setIdError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const suggestRequestRef = useRef(0)

  const isDirty =
    formState.title !== '' ||
    formState.tags !== '' ||
    formState.description !== '' ||
    formState.status !== 'open'

  useEffect(() => {
    if (!open) return
    const fresh = defaultForm(types)
    setFormState(fresh)
    setIdError(null)
    if (fresh.type_id) {
      const token = ++suggestRequestRef.current
      startTransition(async () => {
        const result = await suggestNeedId(fresh.type_id)
        if (result.success && token === suggestRequestRef.current) {
          setFormState(prev => ({ ...prev, id: result.data }))
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleTypeChange(typeId: number) {
    setFormState(prev => ({ ...prev, type_id: typeId }))
    setIdError(null)
    const token = ++suggestRequestRef.current
    startTransition(async () => {
      const result = await suggestNeedId(typeId)
      if (result.success && token === suggestRequestRef.current) {
        setFormState(prev => ({ ...prev, id: result.data }))
      }
    })
  }

  function handleClose() {
    if (isDirty) {
      setDiscardOpen(true)
    } else {
      onOpenChange(false)
    }
  }

  function handleDiscard() {
    setDiscardOpen(false)
    onOpenChange(false)
    setFormState(defaultForm(types))
  }

  const handleSave = useCallback(() => {
    if (isPending) return
    startTransition(async () => {
      const result = await createNeed({
        id: formState.id,
        type_id: formState.type_id,
        title: formState.title,
        status: formState.status,
        tags: formState.tags || undefined,
        description: formState.description || undefined,
      })
      if (!result.success) {
        if (result.field === 'id') {
          setIdError(result.error)
        } else {
          toast.error(result.error ?? "Couldn't save. Try again.")
        }
        return
      }
      toast('Saved.')
      onOpenChange(false)
      router.refresh()
    })
  }, [formState, isPending, onOpenChange, router, startTransition])

  const handleSaveRef = useRef(handleSave)
  useEffect(() => {
    handleSaveRef.current = handleSave
  }, [handleSave])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(newOpen) => {
          if (!newOpen) handleClose()
        }}
      >
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-[480px] flex flex-col gap-0 p-0"
        >
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle>New Need</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-type">Type</Label>
              <Select
                value={String(formState.type_id)}
                onValueChange={(val) => {
                  if (val) handleTypeChange(Number(val))
                }}
              >
                <SelectTrigger id="need-type" className="w-full">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(type => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-id">ID</Label>
              <Input
                id="need-id"
                value={formState.id}
                onChange={e => {
                  setFormState(prev => ({ ...prev, id: e.target.value }))
                  setIdError(null)
                }}
                className="font-mono"
                aria-invalid={!!idError || undefined}
                aria-describedby={idError ? 'need-id-error' : undefined}
              />
              {idError && (
                <p id="need-id-error" className="text-xs text-destructive">
                  {idError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-title">Title</Label>
              <Input
                id="need-title"
                value={formState.title}
                onChange={e => setFormState(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter title…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-status">Status</Label>
              <Select
                value={formState.status}
                onValueChange={(val) => {
                  if (val) setFormState(prev => ({ ...prev, status: val }))
                }}
              >
                <SelectTrigger id="need-status" className="w-full">
                  <SelectValue placeholder="Select status…" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.id} value={s.value}>
                      {s.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-tags">Tags</Label>
              <Input
                id="need-tags"
                value={formState.tags}
                onChange={e => setFormState(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="config, auth, mvp"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-description">Description</Label>
              <Textarea
                id="need-description"
                value={formState.description}
                onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description…"
                rows={4}
              />
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex-row justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || !formState.type_id}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>Your changes will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDiscard}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
