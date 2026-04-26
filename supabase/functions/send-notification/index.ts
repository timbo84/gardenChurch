import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID')!
const FCM_CLIENT_EMAIL = Deno.env.get('FCM_CLIENT_EMAIL')!
const FCM_PRIVATE_KEY = Deno.env.get('FCM_PRIVATE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function getAccessToken(): Promise<string> {
  const privateKeyPem = FCM_PRIVATE_KEY.replace(/\\n/g, '\n')
  const pemBody = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const now = getNumericDate(0)
  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: FCM_CLIENT_EMAIL,
      sub: FCM_CLIENT_EMAIL,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: getNumericDate(3600),
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    },
    privateKey
  )
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

async function sendToToken(token: string, platform: string, title: string, body: string) {
  const accessToken = await getAccessToken()

  const message: any = { token, data: { title, body } }

  if (platform === 'ios') {
    // iOS needs a notification key for reliable APNs delivery.
    // The app's onMessage handler shows it when in foreground;
    // APNs shows it when in background/quit so the background handler skips display.
    message.notification = { title, body }
    message.apns = {
      headers: { 'apns-priority': '10' },
      payload: { aps: { 'content-available': 1, sound: 'default' } },
    }
  } else {
    // Android: data-only so Notifee is the single display path (no double notification)
    message.android = { priority: 'high' }
  }

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    }
  )
  const resBody = await res.json()
  if (!res.ok) {
    console.error(`FCM send failed [${platform}]:`, JSON.stringify(resBody))
  } else {
    console.log(`FCM send ok [${platform}]:`, resBody.name)
  }
}

async function sendToAll(title: string, body: string) {
  const { data: tokens } = await supabase.from('push_tokens').select('token, platform')
  if (!tokens || tokens.length === 0) return
  for (const row of tokens) {
    await sendToToken(row.token, row.platform ?? 'android', title, body)
  }
}

async function sendToUser(userId: string, title: string, body: string) {
  const { data } = await supabase
    .from('push_tokens')
    .select('token, platform')
    .eq('user_id', userId)
    .single()
  if (data?.token) await sendToToken(data.token, data.platform ?? 'android', title, body)
}

async function sendToAdmins(title: string, body: string) {
  const { data: admins } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('role', 'admin')
  if (!admins || admins.length === 0) return
  for (const admin of admins) {
    await sendToUser(admin.user_id, title, body)
  }
}

// Returns true if this exact event was already sent in the last 60 seconds
async function alreadySent(recordId: string, eventKey: string): Promise<boolean> {
  const since = new Date(Date.now() - 60000).toISOString()
  const { data } = await supabase
    .from('notification_log')
    .select('id')
    .eq('record_id', recordId)
    .eq('event_key', eventKey)
    .gte('sent_at', since)
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function markSent(recordId: string, eventKey: string) {
  await supabase.from('notification_log').insert({ record_id: recordId, event_key: eventKey })
  // Clean up old entries
  const cutoff = new Date(Date.now() - 300000).toISOString()
  await supabase.from('notification_log').delete().lt('sent_at', cutoff)
}

// Returns true only when status just changed TO 'approved' or 'published'
function justChangedTo(status: string, record: any, old_record: any): boolean {
  const newStatus = record?.status
  const oldStatus = old_record?.status
  return newStatus === status && oldStatus !== status
}

// Returns true when a new record is inserted with status already set
function insertedAs(status: string, type: string, record: any): boolean {
  return type === 'INSERT' && record?.status === status
}

serve(async (req) => {
  try {
    const payload = await req.json()
    const { type, table, record, old_record } = payload

    // ─── PRAYER REQUESTS ─────────────────────────────────────────────────────
    if (table === 'prayer_requests') {
      // Notify admin when a new prayer request is submitted for review
      if (type === 'INSERT' && record?.status === 'pending') {
        const key = `prayer_pending_${record.id}`
        if (!await alreadySent(record.id, key)) {
          await markSent(record.id, key)
          await sendToAdmins('New Prayer Request Needs Approval', `"${record.title ?? 'A prayer request'}" is waiting for your review.`)
        }
      }
      // Notify community when approved
      if (type === 'UPDATE' && justChangedTo('approved', record, old_record)) {
        const key = `prayer_approved_${record.id}`
        if (!await alreadySent(record.id, key)) {
          await markSent(record.id, key)
          if (record.user_id) {
            await sendToUser(record.user_id, 'Prayer Request Approved', 'Your prayer request has been approved and is now visible to the community.')
          }
          await sendToAll('New Prayer Request', record.title ?? 'A new prayer request has been shared with the community.')
        }
      }
    }

    // ─── LOVE ACTIONS ────────────────────────────────────────────────────────
    if (table === 'love_actions') {
      // Notify admin when a new love action is submitted
      if (type === 'INSERT' && record?.status === 'pending') {
        const key = `love_pending_${record.id}`
        if (!await alreadySent(record.id, key)) {
          await markSent(record.id, key)
          await sendToAdmins('New Love Action Needs Approval', `"${record.title ?? 'A love action'}" is waiting for your review.`)
        }
      }
      // Notify community when approved
      if (type === 'UPDATE' && justChangedTo('approved', record, old_record)) {
        const key = `love_approved_${record.id}`
        if (!await alreadySent(record.id, key)) {
          await markSent(record.id, key)
          if (record.user_id) {
            await sendToUser(record.user_id, 'Love Action Approved', `Your love action "${record.title}" has been approved.`)
          }
          await sendToAll('New Love Action', `"${record.title ?? 'A new love action'}" is now available.`)
        }
      }
    }

    // ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────
    if (table === 'announcements') {
      if (insertedAs('published', type, record) || justChangedTo('published', record, old_record)) {
        const key = `announcement_published_${record.id}`
        if (!await alreadySent(record.id, key)) {
          await markSent(record.id, key)
          await sendToAll('New Announcement', record.title ?? 'A new announcement has been posted.')
        }
      }
    }

    // ─── EVENTS ──────────────────────────────────────────────────────────────
    if (table === 'events') {
      if (insertedAs('published', type, record) || justChangedTo('published', record, old_record)) {
        const key = `event_published_${record.id}`
        if (!await alreadySent(record.id, key)) {
          await markSent(record.id, key)
          await sendToAll('New Event', record.title ?? 'A new event has been posted.')
        }
      }
    }

    // ─── VOLUNTEER OPPORTUNITIES ─────────────────────────────────────────────
    if (table === 'volunteer_opportunities') {
      if (insertedAs('published', type, record) || justChangedTo('published', record, old_record)) {
        const key = `volunteer_published_${record.id}`
        if (!await alreadySent(record.id, key)) {
          await markSent(record.id, key)
          await sendToAll('New Volunteer Opportunity', record.title ?? 'A new volunteer opportunity is available.')
        }
      }
    }

    // ─── CELL GROUPS ─────────────────────────────────────────────────────────
    if (table === 'cell_groups') {
      if (insertedAs('published', type, record) || justChangedTo('published', record, old_record)) {
        const key = `cellgroup_published_${record.id}`
        if (!await alreadySent(record.id, key)) {
          await markSent(record.id, key)
          await sendToAll('New Cell Group', `${record.name ?? 'A new cell group'} is now available to join.`)
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-notification error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
