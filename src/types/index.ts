/**
 * ClientPulse — Database Types
 *
 * Strikte TypeScript-Definitionen für alle Tabellen aus:
 *   - supabase-schema.sql      (clients, projects)
 *   - supabase-schema-v2.sql   (profiles, tasks, invoices, invoice_items, time_entries, activities)
 *   - supabase-schema-v3.sql   (profile: hourly_rate, currency)
 *   - supabase-schema-v4.sql   (expenses, recurring_invoices, tags, project_templates,
 *                               attachments, profile branding, invoice public_token)
 *
 * Konventionen:
 *   - `string` für `text`, `uuid`, `timestamptz` (ISO-String) und `date` (YYYY-MM-DD)
 *   - `number` für `numeric` und `int`
 *   - `?` markiert nullable Felder (DB `NULL` erlaubt)
 *   - DB-Defaults werden ebenfalls als optional markiert (Insert-Side macht sie optional)
 *   - Enums sind als String-Literal-Unions definiert
 *   - Pro Entity gibt es zusätzlich `XInsert` und `XUpdate` Typen
 */

// =========================================================
// AUTH (Supabase verwaltet)
// =========================================================

/** Supabase auth.users (vereinfachte Sicht — wir nutzen primär was supabase-js liefert) */
export interface User {
  id: string
  email?: string
  created_at?: string
  user_metadata?: {
    full_name?: string
    [key: string]: unknown
  }
}

// =========================================================
// PROFILES
// =========================================================

export interface Profile {
  /** PK, referenziert auth.users.id */
  id: string
  full_name: string | null
  company: string | null
  avatar_url: string | null
  /** v3 — default 0 */
  hourly_rate: number | null
  /** v3 — default 'EUR' */
  currency: string | null
  /** v4 — Branding */
  invoice_footer: string | null
  /** v4 — Branding, default '#E11D48' */
  invoice_accent_color: string | null
  /** v4 — Branding */
  address: string | null
  /** v4 — Branding */
  vat_id: string | null
  created_at: string
  updated_at: string
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>

// =========================================================
// CLIENTS
// =========================================================

export type ClientStatus = 'active' | 'inactive' | 'lead'

export interface Client {
  id: string
  user_id: string
  name: string
  email: string | null
  company: string | null
  phone: string | null
  /** Default 'active' */
  status: ClientStatus
  notes: string | null
  /** v4 — uuid[] referenzen auf tags.id */
  tag_ids: string[]
  created_at: string
  updated_at: string
}

export interface ClientInsert {
  name: string
  email?: string | null
  company?: string | null
  phone?: string | null
  status?: ClientStatus
  notes?: string | null
  tag_ids?: string[]
}

export type ClientUpdate = Partial<ClientInsert>

// =========================================================
// PROJECTS
// =========================================================

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed'

export interface Project {
  id: string
  user_id: string
  /** Nullable: Projekt kann ohne Client existieren (on delete set null) */
  client_id: string | null
  name: string
  description: string | null
  /** Default 'planning' */
  status: ProjectStatus
  /** numeric(12,2) — kann null sein */
  budget: number | null
  /** date — YYYY-MM-DD */
  start_date: string | null
  /** date — YYYY-MM-DD */
  due_date: string | null
  /** v4 — uuid[] referenzen auf tags.id */
  tag_ids: string[]
  created_at: string
  updated_at: string
}

export interface ProjectInsert {
  name: string
  client_id?: string | null
  description?: string | null
  status?: ProjectStatus
  budget?: number | null
  start_date?: string | null
  due_date?: string | null
  tag_ids?: string[]
}

export type ProjectUpdate = Partial<ProjectInsert>

/** Project mit eingebettetem Client (häufiges Join-Resultat) */
export interface ProjectWithClient extends Project {
  clients?: Pick<Client, 'name'> | null
}

// =========================================================
// NOTES (v5)
// =========================================================

export type NoteColor = 'primary' | 'success' | 'warning' | 'info' | 'neutral'

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  pinned: boolean
  color: NoteColor
  created_at: string
  updated_at: string
}

export interface NoteInsert {
  title?: string
  content?: string
  pinned?: boolean
  color?: NoteColor
}

export type NoteUpdate = Partial<NoteInsert>

// =========================================================
// QUOTES (v8 — Angebote)
// =========================================================

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'

export interface Quote {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  number: string
  status: QuoteStatus
  issue_date: string | null
  valid_until: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  converted_invoice_id: string | null
  created_at: string
  updated_at: string
}

export interface QuoteInsert {
  number?: string
  client_id?: string | null
  project_id?: string | null
  status?: QuoteStatus
  issue_date?: string | null
  valid_until?: string | null
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total?: number
  notes?: string | null
}

export type QuoteUpdate = Partial<QuoteInsert> & {
  converted_invoice_id?: string | null
}

export interface QuoteWithRelations extends Quote {
  clients?: Pick<Client, 'name' | 'company' | 'email'> | null
  projects?: Pick<Project, 'name'> | null
}

export interface QuoteItem {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  position: number
}

export interface QuoteItemInsert {
  description: string
  quote_id?: string
  quantity?: number
  unit_price?: number
  amount?: number
  position?: number
}

// =========================================================
// EMAIL PINS (v7 — Gmail)
// =========================================================

export interface EmailPin {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  gmail_message_id: string
  gmail_thread_id: string | null
  from_email: string | null
  from_name: string | null
  subject: string | null
  snippet: string | null
  message_date: string | null
  pinned_at: string
}

export interface EmailPinInsert {
  client_id?: string | null
  project_id?: string | null
  gmail_message_id: string
  gmail_thread_id?: string | null
  from_email?: string | null
  from_name?: string | null
  subject?: string | null
  snippet?: string | null
  message_date?: string | null
}

// =========================================================
// EVENTS (v6 — Calendar)
// =========================================================

export type EventColor = 'primary' | 'success' | 'warning' | 'info' | 'neutral'

export interface Event {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  title: string
  description: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  color: EventColor
  /** Minutes before event for reminder; null = no reminder */
  reminder_minutes: number | null
  created_at: string
  updated_at: string
}

export interface EventInsert {
  title: string
  starts_at: string
  ends_at?: string | null
  description?: string
  client_id?: string | null
  project_id?: string | null
  all_day?: boolean
  color?: EventColor
  reminder_minutes?: number | null
}

export type EventUpdate = Partial<EventInsert>

export interface EventWithRelations extends Event {
  clients?: Pick<Client, 'name'> | null
  projects?: Pick<Project, 'name'> | null
}

// =========================================================
// TASKS (v2)
// =========================================================

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string | null
  /** Default 'todo' */
  status: TaskStatus
  /** Default 'medium' */
  priority: TaskPriority
  due_date: string | null
  /** Default 0 — für Sortierung im Kanban */
  position: number
  created_at: string
  updated_at: string
}

export interface TaskInsert {
  title: string
  project_id?: string | null
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  position?: number
}

export type TaskUpdate = Partial<TaskInsert>

// =========================================================
// INVOICES (v2 + v4)
// =========================================================

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export interface Invoice {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  number: string
  /** Default 'draft' */
  status: InvoiceStatus
  /** date — Default current_date */
  issue_date: string | null
  due_date: string | null
  /** numeric(12,2) — Default 0 */
  subtotal: number
  /** numeric(5,2) — Default 19 */
  tax_rate: number
  /** numeric(12,2) — Default 0 */
  tax_amount: number
  /** numeric(12,2) — Default 0 */
  total: number
  notes: string | null
  /** v4 — Public-Share-Token (unique) */
  public_token: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceInsert {
  /** Optional — wird auto-generiert wenn leer */
  number?: string
  client_id?: string | null
  project_id?: string | null
  status?: InvoiceStatus
  issue_date?: string | null
  due_date?: string | null
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total?: number
  notes?: string | null
  public_token?: string | null
}

export type InvoiceUpdate = Partial<InvoiceInsert>

/** Invoice mit eingebetteten Joins (häufiges Listen-Format) */
export interface InvoiceWithRelations extends Invoice {
  clients?: Pick<Client, 'name' | 'company' | 'email'> | null
  projects?: Pick<Project, 'name'> | null
}

// =========================================================
// INVOICE ITEMS (v2)
// =========================================================

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  /** numeric(10,2) — Default 1 */
  quantity: number
  /** numeric(12,2) — Default 0 */
  unit_price: number
  /** numeric(12,2) — Default 0 */
  amount: number
  /** Default 0 */
  position: number
}

export interface InvoiceItemInsert {
  description: string
  invoice_id?: string
  quantity?: number
  unit_price?: number
  amount?: number
  position?: number
}

export type InvoiceItemUpdate = Partial<InvoiceItemInsert>

/** Form-Item (vor dem Speichern, ohne id/invoice_id) */
export interface InvoiceItemDraft {
  description: string
  quantity: number | string
  unit_price: number | string
}

// =========================================================
// TIME ENTRIES (v2)
// =========================================================

export interface TimeEntry {
  id: string
  user_id: string
  project_id: string | null
  task_id: string | null
  description: string | null
  /** timestamptz — required */
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  /** Default true */
  billable: boolean
  created_at: string
}

export interface TimeEntryInsert {
  started_at: string
  project_id?: string | null
  task_id?: string | null
  description?: string | null
  ended_at?: string | null
  duration_seconds?: number | null
  billable?: boolean
}

export type TimeEntryUpdate = Partial<TimeEntryInsert>

/** TimeEntry mit eingebettetem Project */
export interface TimeEntryWithProject extends TimeEntry {
  projects?: Pick<Project, 'name'> | null
}

// =========================================================
// ACTIVITIES (v2)
// =========================================================

export type ActivityType =
  | 'client.created'
  | 'client.updated'
  | 'client.deleted'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'task.created'
  | 'task.deleted'
  | 'invoice.created'
  | 'invoice.deleted'
  | 'expense.created'

export type ActivityEntityType = 'client' | 'project' | 'task' | 'invoice' | 'expense'

export interface Activity {
  id: string
  user_id: string
  type: ActivityType | string
  entity_type: ActivityEntityType | string | null
  entity_id: string | null
  entity_name: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ActivityInsert {
  type: ActivityType | string
  entity_type?: ActivityEntityType | string | null
  entity_id?: string | null
  entity_name?: string | null
  metadata?: Record<string, unknown> | null
}

// =========================================================
// EXPENSES (v4)
// =========================================================

export type ExpenseCategory =
  | 'software'
  | 'hardware'
  | 'travel'
  | 'marketing'
  | 'office'
  | 'other'

export interface Expense {
  id: string
  user_id: string
  project_id: string | null
  client_id: string | null
  /** Default 'other' */
  category: ExpenseCategory
  description: string
  /** numeric(12,2) */
  amount: number
  /** date — Default current_date */
  date: string | null
  /** Default false */
  billable: boolean
  receipt_url: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseInsert {
  description: string
  amount: number
  project_id?: string | null
  client_id?: string | null
  category?: ExpenseCategory
  date?: string | null
  billable?: boolean
  receipt_url?: string | null
}

export type ExpenseUpdate = Partial<ExpenseInsert>

export interface ExpenseWithRelations extends Expense {
  projects?: Pick<Project, 'name'> | null
  clients?: Pick<Client, 'name'> | null
}

// =========================================================
// RECURRING INVOICES (v4)
// =========================================================

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

/** Item-Schema innerhalb der jsonb `items`-Spalte */
export interface RecurringInvoiceItem {
  description: string
  quantity: number
  unit_price: number
}

export interface RecurringInvoice {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  name: string
  /** Default 'monthly' */
  frequency: RecurringFrequency
  /** date — required (next scheduled run) */
  next_run: string
  /** numeric(5,2) — Default 19 */
  tax_rate: number
  /** jsonb — Default [] */
  items: RecurringInvoiceItem[]
  /** Default true */
  active: boolean
  created_at: string
  updated_at: string
}

export interface RecurringInvoiceInsert {
  name: string
  next_run: string
  client_id?: string | null
  project_id?: string | null
  frequency?: RecurringFrequency
  tax_rate?: number
  items?: RecurringInvoiceItem[]
  active?: boolean
}

export type RecurringInvoiceUpdate = Partial<RecurringInvoiceInsert>

export interface RecurringInvoiceWithRelations extends RecurringInvoice {
  clients?: Pick<Client, 'name'> | null
  projects?: Pick<Project, 'name'> | null
}

// =========================================================
// TAGS (v4)
// =========================================================

export interface Tag {
  id: string
  user_id: string
  name: string
  /** Default '#E11D48' */
  color: string
  created_at: string
}

export interface TagInsert {
  name: string
  color?: string
}

export type TagUpdate = Partial<TagInsert>

// =========================================================
// PROJECT TEMPLATES (v4)
// =========================================================

/** Task-Schema innerhalb der jsonb `tasks`-Spalte */
export interface TemplateTask {
  title: string
  status?: TaskStatus
  priority?: TaskPriority
}

export interface ProjectTemplate {
  id: string
  user_id: string
  name: string
  description: string | null
  default_budget: number | null
  /** Default 'planning' */
  default_status: ProjectStatus
  /** jsonb — Default [] */
  tasks: TemplateTask[]
  created_at: string
}

export interface ProjectTemplateInsert {
  name: string
  description?: string | null
  default_budget?: number | null
  default_status?: ProjectStatus
  tasks?: TemplateTask[]
}

export type ProjectTemplateUpdate = Partial<ProjectTemplateInsert>

// =========================================================
// ATTACHMENTS (v4)
// =========================================================

export type AttachmentEntityType = 'project' | 'client'

export interface Attachment {
  id: string
  user_id: string
  entity_type: AttachmentEntityType
  entity_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export interface AttachmentInsert {
  entity_type: AttachmentEntityType
  entity_id: string
  file_name: string
  file_path: string
  file_size?: number | null
  mime_type?: string | null
}

// =========================================================
// PUBLIC INVOICE (v4 — RPC return type)
// =========================================================

/**
 * Return-Shape von `get_public_invoice(token)` RPC.
 * Flach denormalisiert mit Profil- und Client-Daten.
 */
export interface PublicInvoice {
  id: string
  number: string
  status: InvoiceStatus
  issue_date: string | null
  due_date: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  client_name: string | null
  client_company: string | null
  client_email: string | null
  profile_name: string | null
  profile_company: string | null
  profile_address: string | null
  profile_vat: string | null
  profile_footer: string | null
  profile_accent: string | null
}

/** Return-Shape von `get_public_invoice_items(token)` RPC */
export interface PublicInvoiceItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
  item_position: number
}

// =========================================================
// PAGINATION (für die React-Query-Hooks)
// =========================================================

export interface PaginatedResult<T> {
  rows: T[]
  count: number
}

export interface PaginationParams {
  initialPage?: number
  initialPageSize?: number
}
