import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import type { SubmitHandler, FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2 } from 'lucide-react'
import Modal from './ui/Modal.js'
import Button from './ui/Button.js'
import Input from './ui/Input.js'
import { toast } from '../store/toastStore.js'
import type {
  Client,
  InvoiceInsert,
  InvoiceItemDraft,
  InvoiceWithRelations,
  ProjectWithClient,
} from '../types'

// =========================================================
// ZOD SCHEMA — strenge Validierung der Rechnungsdaten
// =========================================================

const invoiceItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Beschreibung darf nicht leer sein')
    .max(200, 'Maximal 200 Zeichen'),
  quantity: z.coerce
    .number({ error: 'Menge muss eine Zahl sein' })
    .min(0, 'Menge muss ≥ 0 sein')
    .max(999999, 'Menge zu groß'),
  unit_price: z.coerce
    .number({ error: 'Einzelpreis muss eine Zahl sein' })
    .min(0, 'Einzelpreis muss ≥ 0 sein')
    .max(9999999, 'Preis zu groß'),
})

const invoiceFormSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, 'Rechnungsnummer ist Pflicht')
    .max(50, 'Maximal 50 Zeichen'),
  client_id: z.string().optional().default(''),
  project_id: z.string().optional().default(''),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']),
  issue_date: z.string().optional().default(''),
  due_date: z.string().optional().default(''),
  tax_rate: z.coerce
    .number({ error: 'Steuersatz muss eine Zahl sein' })
    .min(0, 'Steuersatz muss ≥ 0 sein')
    .max(100, 'Steuersatz darf 100% nicht überschreiten'),
  notes: z.string().max(2000, 'Notizen zu lang').optional().default(''),
  items: z
    .array(invoiceItemSchema)
    .min(1, 'Mindestens ein Posten erforderlich'),
})

// Eingabe-Shape (vor Coerce) — die RHF-FormValues
type InvoiceFormInput = z.input<typeof invoiceFormSchema>
// Ausgabe-Shape (nach Coerce) — validierte Daten
type InvoiceFormOutput = z.output<typeof invoiceFormSchema>

const EMPTY_ITEM: InvoiceFormInput['items'][number] = {
  description: '',
  quantity: 1,
  unit_price: 0,
}

const DEFAULT_VALUES: InvoiceFormInput = {
  number: '',
  client_id: '',
  project_id: '',
  status: 'draft',
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  tax_rate: 19,
  notes: '',
  items: [{ ...EMPTY_ITEM }],
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(n || 0))
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <span className="text-[11px] text-red-400 mt-0.5">{message}</span>
}

export interface InvoiceFormProps {
  open: boolean
  onClose: () => void
  editing: InvoiceWithRelations | null
  clients?: Client[]
  projects?: ProjectWithClient[]
  onSave: (payload: InvoiceInsert, items: InvoiceItemDraft[]) => Promise<unknown>
  generateNumber?: () => Promise<string>
}

export default function InvoiceForm({
  open,
  onClose,
  editing,
  clients = [],
  projects = [],
  onSave,
  generateNumber,
}: InvoiceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormInput, unknown, InvoiceFormOutput>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onBlur',
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function init() {
      if (editing) {
        reset({
          number: editing.number || '',
          client_id: editing.client_id || '',
          project_id: editing.project_id || '',
          status: (editing.status as InvoiceFormInput['status']) || 'draft',
          issue_date: editing.issue_date || '',
          due_date: editing.due_date || '',
          tax_rate: editing.tax_rate ?? 19,
          notes: editing.notes || '',
          items: [{ ...EMPTY_ITEM }],
        })
      } else {
        const number = generateNumber ? await generateNumber() : ''
        if (cancelled) return
        reset({ ...DEFAULT_VALUES, number })
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [open, editing, generateNumber, reset])

  // Watch for live calculation
  const watchedItems = watch('items')
  const watchedTaxRate = watch('tax_rate')
  const watchedClientId = watch('client_id')

  const subtotal = (watchedItems || []).reduce(
    (s, it) => s + Number(it?.quantity || 0) * Number(it?.unit_price || 0),
    0
  )
  const taxAmount = (subtotal * Number(watchedTaxRate || 0)) / 100
  const total = subtotal + taxAmount

  const clientProjects = projects.filter(
    (p) => !watchedClientId || p.client_id === watchedClientId
  )

  const onSubmit: SubmitHandler<InvoiceFormOutput> = async (data) => {
    try {
      const payload: InvoiceInsert = {
        number: data.number,
        client_id: data.client_id || null,
        project_id: data.project_id || null,
        status: data.status,
        issue_date: data.issue_date || null,
        due_date: data.due_date || null,
        tax_rate: data.tax_rate,
        notes: data.notes?.trim() || null,
      }
      const items: InvoiceItemDraft[] = data.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
      }))
      await onSave(payload, items)
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function onInvalid(errs: FieldErrors<InvoiceFormInput>) {
    // Zeige einen Summary-Toast bei fehlgeschlagener Validierung
    const firstError =
      errs.number?.message ||
      errs.tax_rate?.message ||
      errs.items?.message ||
      (Array.isArray(errs.items)
        ? errs.items.find((i) => i)?.description?.message
        : undefined) ||
      'Bitte überprüfe die markierten Felder'
    toast.error(firstError as string)
  }

  const itemsRootError = Array.isArray(errors.items)
    ? undefined
    : (errors.items as { message?: string } | undefined)?.message

  return (
    <Modal
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title={editing ? 'Edit Invoice' : 'New Invoice'}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <Input
              label="Number"
              {...register('number')}
              error={errors.number?.message}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Status</label>
            <select
              {...register('status')}
              className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <FieldError message={errors.status?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Client</label>
            <Controller
              control={control}
              name="client_id"
              render={({ field }) => (
                <select
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    setValue('project_id', '')
                  }}
                  className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
                >
                  <option value="">— No client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Project</label>
            <select
              {...register('project_id')}
              className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
            >
              <option value="">— No project —</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Issue date"
            type="date"
            {...register('issue_date')}
            error={errors.issue_date?.message}
          />
          <Input
            label="Due date"
            type="date"
            {...register('due_date')}
            error={errors.due_date?.message}
          />
          <Input
            label="Tax %"
            type="number"
            step="0.01"
            {...register('tax_rate')}
            error={errors.tax_rate?.message}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-text/40 font-medium">Line items</label>
            {itemsRootError && (
              <span className="text-[11px] text-red-400">{itemsRootError}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {fields.map((field, idx) => {
              const itemErrors = Array.isArray(errors.items) ? errors.items[idx] : undefined
              return (
                <div key={field.id} className="flex flex-col gap-1">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <input
                      className="col-span-6 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text placeholder:text-text/30 focus:border-primary/50 outline-none"
                      placeholder="Description"
                      {...register(`items.${idx}.description` as const)}
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="col-span-2 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 outline-none"
                      placeholder="Qty"
                      {...register(`items.${idx}.quantity` as const)}
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="col-span-3 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 outline-none"
                      placeholder="Unit price"
                      {...register(`items.${idx}.unit_price` as const)}
                    />
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="col-span-1 h-10 rounded-lg text-text/40 hover:text-red-400 hover:bg-red-500/5 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {itemErrors && (
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6">
                        <FieldError message={itemErrors.description?.message} />
                      </div>
                      <div className="col-span-2">
                        <FieldError message={itemErrors.quantity?.message} />
                      </div>
                      <div className="col-span-3">
                        <FieldError message={itemErrors.unit_price?.message} />
                      </div>
                      <div className="col-span-1" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => append({ ...EMPTY_ITEM })}
            className="text-xs text-primary hover:text-accent font-semibold self-start"
          >
            + Add line item
          </button>
        </div>

        <div className="flex flex-col gap-1 bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 text-sm">
          <div className="flex justify-between text-text/60">
            <span>Subtotal</span>
            <span>{fmtMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-text/60">
            <span>Tax ({Number(watchedTaxRate || 0)}%)</span>
            <span>{fmtMoney(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-text pt-1 border-t border-white/[0.04]">
            <span>Total</span>
            <span>{fmtMoney(total)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text/40 font-medium">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-text placeholder:text-text/30 focus:border-primary/50 focus:outline-none resize-none"
          />
          <FieldError message={errors.notes?.message} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : editing ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
