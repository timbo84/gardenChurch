import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 })
    }

    // Verify the user's JWT and get their ID
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: userError } = await userClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Delete all user data before removing the auth user
    await adminClient.from('push_tokens').delete().eq('user_id', user.id)
    await adminClient.from('prayer_requests').delete().eq('user_id', user.id)
    await adminClient.from('love_actions').delete().eq('user_id', user.id)
    await adminClient.from('volunteer_opportunities').delete().eq('user_id', user.id)
    await adminClient.from('announcements').delete().eq('user_id', user.id)
    await adminClient.from('events').delete().eq('user_id', user.id)
    await adminClient.from('cell_groups').delete().eq('user_id', user.id)
    await adminClient.from('notification_log').delete().eq('record_id', user.id)
    await adminClient.from('user_profiles').delete().eq('user_id', user.id)

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('delete-account error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
