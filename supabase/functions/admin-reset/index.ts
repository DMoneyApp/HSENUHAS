import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) return Response.json({ error:'Unauthorized' }, { status:401, headers:cors })

    const url = Deno.env.get('SUPABASE_URL')!
    const publishable = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
    const secret = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(url, publishable, { global:{ headers:{ Authorization:`Bearer ${jwt}` } } })
    const { data:{ user }, error:userError } = await userClient.auth.getUser(jwt)
    if (userError || !user) return Response.json({ error:'Unauthorized' }, { status:401, headers:cors })

    const admin = createClient(url, secret)
    const { data: caller, error:callerError } = await admin.from('profiles').select('role,active').eq('id',user.id).single()
    if (callerError || !caller?.active || !['super_admin','hse_admin'].includes(caller.role)) {
      return Response.json({ error:'Admin permission required' }, { status:403, headers:cors })
    }

    const body = await req.json()
    const userId = String(body.user_id || '')
    const tempPassword = String(body.temp_password || '')
    if (!userId || tempPassword.length < 10) return Response.json({ error:'User ID and a temporary password of at least 10 characters are required.' }, { status:400, headers:cors })

    const { error } = await admin.auth.admin.updateUserById(userId, { password:tempPassword })
    if (error) return Response.json({ error:error.message }, { status:400, headers:cors })

    await admin.from('profiles').update({ must_change_password:true }).eq('id',userId)
    await admin.from('audit_events').insert({ actor_id:user.id, action:'PASSWORD_RESET', target_type:'profile', target_id:userId, details:{forced_change:true} })
    return Response.json({ ok:true }, { headers:cors })
  } catch (e) {
    return Response.json({ error:String(e?.message || e) }, { status:500, headers:cors })
  }
})
