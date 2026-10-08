import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({error:'Unauthorized'}), {status:401,headers:cors});

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken:false, persistSession:false } });
    const token = authHeader.slice('Bearer '.length);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return new Response(JSON.stringify({error:'Unauthorized'}), {status:401,headers:cors});

    const body = await req.json();
    const organization_id = String(body?.organization_id || '');
    const user_id = String(body?.user_id || '');
    const temp_password = String(body?.temp_password || '');
    if (!organization_id || !user_id || temp_password.length < 10) {
      return new Response(JSON.stringify({error:'organization_id, user_id and a temporary password of at least 10 characters are required'}), {status:400,headers:cors});
    }
    if (user_id === authData.user.id) return new Response(JSON.stringify({error:'Use your normal password change flow for your own account'}), {status:400,headers:cors});

    const { data: requester, error: requesterError } = await admin
      .from('organization_memberships')
      .select('role,status')
      .eq('organization_id', organization_id)
      .eq('user_id', authData.user.id)
      .single();
    if (requesterError || !requester || requester.status !== 'active' || !['super_admin','hse_admin'].includes(requester.role)) {
      return new Response(JSON.stringify({error:'Only an active organization administrator can reset this account'}), {status:403,headers:cors});
    }

    const { data: target, error: targetError } = await admin
      .from('organization_memberships')
      .select('user_id,status')
      .eq('organization_id', organization_id)
      .eq('user_id', user_id)
      .single();
    if (targetError || !target) return new Response(JSON.stringify({error:'Target user is not a member of this organization'}), {status:404,headers:cors});
    if (target.user_id === authData.user.id) return new Response(JSON.stringify({error:'Self-reset is not permitted here'}), {status:400,headers:cors});

    const { error: resetError } = await admin.auth.admin.updateUserById(user_id, { password: temp_password });
    if (resetError) return new Response(JSON.stringify({error:resetError.message}), {status:400,headers:cors});

    await admin.from('profiles').update({ must_change_password:true }).eq('id', user_id);
    await admin.from('audit_events').insert({
      organization_id,
      actor_id: authData.user.id,
      action: 'ADMIN_PASSWORD_RESET',
      target_type: 'profile',
      target_id: user_id,
      details: { forced_change: true }
    });

    return new Response(JSON.stringify({ok:true,forced_change:true}), {status:200,headers:cors});
  } catch (e) {
    return new Response(JSON.stringify({error:String(e?.message || e)}), {status:500,headers:cors});
  }
});
