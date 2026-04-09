/**
 * Gmail integration via Google Identity Services token client (implicit OAuth).
 * Access tokens live in memory, ~1h lifetime, re-consent on expiry.
 * No backend / no refresh tokens.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
].join(' ')

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
  callback: (resp: GoogleTokenResponse) => void
}

interface GoogleGSI {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        callback: (resp: GoogleTokenResponse) => void
      }) => TokenClient
      revoke: (token: string, done?: () => void) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleGSI
  }
}

let gsiLoaded: Promise<void> | null = null

export function loadGSI(): Promise<void> {
  if (gsiLoaded) return gsiLoaded
  gsiLoaded = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
  return gsiLoaded
}

export function hasGoogleClientId(): boolean {
  return !!CLIENT_ID && CLIENT_ID.length > 0
}

/**
 * Kicks off the OAuth consent popup. Resolves with an access token.
 */
export async function requestAccessToken(prompt: 'consent' | '' = ''): Promise<string> {
  if (!CLIENT_ID) {
    throw new Error(
      'Missing VITE_GOOGLE_CLIENT_ID. Add it to .env and restart the dev server.'
    )
  }
  await loadGSI()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: GMAIL_SCOPES,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error))
          return
        }
        resolve(resp.access_token)
      },
    })
    client.requestAccessToken({ prompt })
  })
}

export function revokeAccessToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    window.google.accounts.oauth2.revoke(token, () => resolve())
  })
}

// ============================================================
// Gmail REST API wrappers
// ============================================================

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

async function gmailFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gmail ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export interface GmailProfile {
  emailAddress: string
  messagesTotal: number
  threadsTotal: number
  historyId: string
}

export function getProfile(token: string): Promise<GmailProfile> {
  return gmailFetch<GmailProfile>('/profile', token)
}

export interface GmailListResponse {
  messages?: { id: string; threadId: string }[]
  resultSizeEstimate: number
  nextPageToken?: string
}

export function listMessages(
  token: string,
  query: string = 'in:inbox',
  maxResults: number = 25
): Promise<GmailListResponse> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  })
  return gmailFetch<GmailListResponse>(`/messages?${params}`, token)
}

export interface GmailHeader {
  name: string
  value: string
}

export interface GmailBody {
  size: number
  data?: string
  attachmentId?: string
}

export interface GmailPart {
  partId?: string
  mimeType: string
  filename?: string
  headers?: GmailHeader[]
  body: GmailBody
  parts?: GmailPart[]
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet: string
  internalDate: string
  payload: GmailPart
}

export function getMessage(token: string, id: string): Promise<GmailMessage> {
  return gmailFetch<GmailMessage>(`/messages/${id}?format=full`, token)
}

export function getAttachment(
  token: string,
  messageId: string,
  attachmentId: string
): Promise<{ size: number; data: string }> {
  return gmailFetch<{ size: number; data: string }>(
    `/messages/${messageId}/attachments/${attachmentId}`,
    token
  )
}

// ============================================================
// Helpers — parsing, decoding, MIME building
// ============================================================

export function getHeader(message: GmailMessage, name: string): string {
  const headers = message.payload.headers || []
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

export function decodeBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  try {
    // Handle UTF-8
    const decoded = atob(padded)
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return ''
  }
}

export function decodeBase64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const decoded = atob(padded)
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0))
}

function encodeBase64Url(input: string): string {
  const b64 = btoa(unescape(encodeURIComponent(input)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export interface ExtractedBody {
  text: string
  html: string
  attachments: {
    filename: string
    mimeType: string
    attachmentId: string
    size: number
  }[]
}

export function extractBody(message: GmailMessage): ExtractedBody {
  const result: ExtractedBody = { text: '', html: '', attachments: [] }

  function walk(part: GmailPart) {
    if (part.filename && part.body.attachmentId) {
      result.attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        attachmentId: part.body.attachmentId,
        size: part.body.size,
      })
    }
    if (part.mimeType === 'text/plain' && part.body.data) {
      result.text += decodeBase64Url(part.body.data)
    } else if (part.mimeType === 'text/html' && part.body.data) {
      result.html += decodeBase64Url(part.body.data)
    }
    if (part.parts) part.parts.forEach(walk)
  }

  walk(message.payload)
  if (!result.text && !result.html && message.payload.body.data) {
    result.text = decodeBase64Url(message.payload.body.data)
  }
  return result
}

export interface SendReplyArgs {
  to: string
  subject: string
  body: string
  threadId: string
  inReplyTo?: string
  references?: string
}

export async function sendReply(token: string, args: SendReplyArgs): Promise<void> {
  const headers = [
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
  ]
  if (args.inReplyTo) headers.push(`In-Reply-To: ${args.inReplyTo}`)
  if (args.references) headers.push(`References: ${args.references}`)
  const raw = headers.join('\r\n') + '\r\n\r\n' + args.body
  const encoded = encodeBase64Url(raw)
  await gmailFetch('/messages/send', token, {
    method: 'POST',
    body: JSON.stringify({ raw: encoded, threadId: args.threadId }),
  })
}

/** Parse "Jane Doe <jane@example.com>" into { name, email } */
export function parseFromHeader(value: string): { name: string; email: string } {
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: '', email: value.trim() }
}
