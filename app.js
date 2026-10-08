/* NUHAS HSE360 v5 — premium single-page HSE + IMS client
   Frontend: GitHub Pages. Data/Auth: Supabase. No service-role secrets in this file. */
(() => {
  'use strict';
  const C = window.NUHAS_CONFIG || {};
  const sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }) : null;

  const MODULES = {
    observations:{label:'Observations',singular:'Observation',code:'OB',icon:'eye',desc:'Safety observations, unsafe acts, unsafe conditions and positive observations.'},
    incidents:{label:'Incidents',singular:'Incident',code:'INC',icon:'alert',desc:'Incident investigation and event reporting.'},
    near_miss:{label:'Near Miss',singular:'Near Miss',code:'NM',icon:'shield',desc:'Near-miss and high-potential near-miss reporting.'},
    first_aid:{label:'First Aid',singular:'First Aid',code:'FA',icon:'plus',desc:'First-aid cases and treatment records.'},
    accidents:{label:'Accidents / LTI',singular:'Accident / LTI',code:'ACC',icon:'medical',desc:'Accidents, lost-time injuries and outcome tracking.'},
    inspections:{label:'Inspections',singular:'Inspection',code:'INS',icon:'clipboard',desc:'Routine, statutory and workplace inspections.'},
    actions:{label:'Corrective Actions',singular:'Corrective Action',code:'CAR',icon:'check',desc:'CAPA, corrective and preventive actions with due dates.'},
    training:{label:'Training',singular:'Training',code:'TR',icon:'book',desc:'Training sessions, participants and participant-hours.'},
    tbt:{label:'Toolbox Talks',singular:'Toolbox Talk',code:'TBT',icon:'users',desc:'TBT records and participant-hours.'},
    drills:{label:'Mock Drills',singular:'Mock Drill',code:'DRL',icon:'flame',desc:'Emergency drills, response performance and actions.'},
    manhours:{label:'Manhours',singular:'Manhours',code:'MH',icon:'clock',desc:'Workforce manhours and exposure hours.'},
    permits:{label:'Work Permits',singular:'Work Permit',code:'PTW',icon:'file',desc:'General and critical permits with high-risk work types.'},
    risk:{label:'Risk Assessments',singular:'Risk Assessment',code:'RA',icon:'risk',desc:'Hazard identification, risk scoring and controls.'},
    chemicals:{label:'Chemicals',singular:'Chemical Record',code:'CHM',icon:'flask',desc:'Chemical inventory, storage, SDS and controls.'},
    waste:{label:'Waste',singular:'Waste Record',code:'WST',icon:'trash',desc:'Waste streams, quantities and disposal tracking.'},
    energy:{label:'Energy',singular:'Energy Record',code:'ENR',icon:'bolt',desc:'Energy consumption and efficiency records.'},
    audit:{label:'Audits',singular:'Audit',code:'AUD',icon:'search',desc:'Internal, external and compliance audit records.'},
    ncr:{label:'NCR / CAPA',singular:'NCR / CAPA',code:'NCR',icon:'flag',desc:'Nonconformities, root causes and CAPA.'},
    documents:{label:'Document Control',singular:'Document',code:'DOC',icon:'folder',desc:'Controlled documents, revisions and approvals.'},
    legal:{label:'Legal Compliance',singular:'Legal Compliance',code:'LEG',icon:'scale',desc:'Legal requirements, applicability, evidence and status.'},
    objectives:{label:'IMS Objectives',singular:'IMS Objective',code:'OBJ',icon:'target',desc:'Objectives, targets, measures and performance.'},
    employees:{label:'Employees',singular:'Employee',code:'EMP',icon:'users',desc:'Employee master register, codes, departments and active status.'},
    ppe:{label:'PPE Issue Register',singular:'PPE Issue',code:'PPE',icon:'shield',desc:'Employee-linked PPE issue history, dates, quantities and remarks.'},
    competencies:{label:'Competency & Authorisations',singular:'Competency Record',code:'CMP',icon:'book',desc:'First aiders, fire fighters, external training, licences and competency validity.'},
    licenses:{label:'Licences & Certificates',singular:'Licence / Certificate',code:'LIC',icon:'scale',desc:'Company licences, certificates and contracts with renewal control and 2-month alerts.'},
    fire_equipment:{label:'Fire Equipment Register',singular:'Fire Equipment',code:'FIR',icon:'flame',desc:'Fire extinguishers, hose reels, hydrants and fire systems with monthly inspection controls.'},
    third_party:{label:'3rd Party Inspections',singular:'3rd Party Inspection',code:'TPV',icon:'clipboard',desc:'Forklifts, scissor lifts, EOT cranes and other externally inspected equipment with expiry alerts.'}
  };

  const GROUPS = [
    ['COMMAND CENTER',[['dashboard','Dashboard','grid'],['management','Management Overview','chart']]],
    ['HSE',[['observations','Observations','eye'],['incidents','Incidents','alert'],['near_miss','Near Miss','shield'],['first_aid','First Aid','plus'],['accidents','Accidents / LTI','medical'],['inspections','Inspections','clipboard'],['actions','Corrective Actions','check']]],
    ['TRAINING & EMERGENCY',[['training','Training','book'],['tbt','Toolbox Talks','users'],['drills','Mock Drills','flame']]],
    ['WORK CONTROL & RISK',[['manhours','Manhours','clock'],['permits','Work Permits','file'],['risk','Risk Assessments','risk']]],
    ['ENVIRONMENT & ENERGY',[['chemicals','Chemicals','flask'],['waste','Waste','trash'],['energy','Energy','bolt']]],
    ['WORKFORCE & COMPLIANCE',[['employees','Employees','users'],['ppe','PPE Issue Register','shield'],['competencies','Competency & Authorisations','book'],['licenses','Licences & Certificates','scale'],['fire_equipment','Fire Equipment Register','flame'],['third_party','3rd Party Inspections','clipboard']]],
    ['IMS & COMPLIANCE',[['audit','Audits','search'],['ncr','NCR / CAPA','flag'],['documents','Document Control','folder'],['legal','Legal Compliance','scale'],['objectives','IMS Objectives','target']]],
    ['ADMINISTRATION',[['users','Users & Roles','users'],['auditlog','Audit Trail','history'],['settings','System Settings','settings']]]
  ];

  const state = { session:null, profile:null, records:[], page:'dashboard', query:'', status:'all', department:'all', dateFrom:'', dateTo:'', loading:false, mobileNav:false, theme:localStorage.getItem('nuhas_theme')||'light' };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const initials = p => (String(p?.full_name||p?.username||'U').split(/\s+/).slice(0,2).map(x=>x[0]).join('')||'U').toUpperCase();
  const fmtNum = n => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const fmtDate = d => d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const ago = iso => { if(!iso) return '—'; const s=Math.max(0,(Date.now()-new Date(iso).getTime())/1000); if(s<60)return 'just now'; if(s<3600)return `${Math.floor(s/60)}m ago`; if(s<86400)return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; };
  const icon = (name, size=17) => {
    const p = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
    const paths={
      grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
      chart:'<path d="M4 19V5"/><path d="M4 19h17"/><path d="m7 15 4-5 3 3 5-7"/>',
      eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
      alert:'<path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
      shield:'<path d="M12 3 20 6v5c0 5-3.3 8.7-8 10-4.7-1.3-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
      plus:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
      medical:'<path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M9 2h6v4H9z"/><path d="M12 9v6M9 12h6"/>',
      clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/>',
      check:'<path d="M20 6 9 17l-5-5"/><path d="M3 12v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7"/>',
      book:'<path d="M4 5a3 3 0 0 1 3-3h13v18H7a3 3 0 0 0-3 3V5Z"/><path d="M7 20h13"/>',
      users:'<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M17 11a4 4 0 0 0 0-8M21 21v-2a4 4 0 0 0-3-3.87"/>',
      flame:'<path d="M12 22c4 0 7-2.7 7-7 0-3-1.8-5.7-4.7-8.4.2 2.5-1 4-2.5 4.9.2-3.5-1.1-6.2-3.8-8.5C8.3 7.8 5 10.8 5 15c0 4.3 3 7 7 7Z"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
      risk:'<path d="M12 3 3 8v8l9 5 9-5V8l-9-5Z"/><path d="M12 8v8M8.5 10l7 4M15.5 10l-7 4"/>',
      flask:'<path d="M9 3h6M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3"/><path d="M7.5 16h9"/>',
      trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
      bolt:'<path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/>',
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      flag:'<path d="M5 21V4"/><path d="M5 5c5-4 9 4 14 0v9c-5 4-9-4-14 0"/>',
      folder:'<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/>',
      scale:'<path d="M12 3v18M5 7h14M4 7l-3 6a4 4 0 0 0 6 0L4 7ZM20 7l-3 6a4 4 0 0 0 6 0l-3-6ZM7 21h10"/>',
      target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
      history:'<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6M12 7v5l3 2"/>',
      settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.46 15a1.7 1.7 0 0 0-1.56-1.03H6.7v-2.4h.2A1.7 1.7 0 0 0 8.46 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.73 5.2V5h2.4v.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.97 11h.2v2.4h-.2A1.7 1.7 0 0 0 19.4 15Z"/>',
      menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',moon:'<path d="M20 15.3A8.5 8.5 0 0 1 8.7 4a8.5 8.5 0 1 0 11.3 11.3Z"/>',download:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',plus2:'<path d="M12 5v14M5 12h14"/>',chevron:'<path d="m9 18 6-6-6-6"/>',external:'<path d="M14 3h7v7M21 3l-9 9"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
    };
    return `<svg ${p}>${paths[name]||paths.grid}</svg>`;
  };

  function toast(msg, good=true){ let el=document.getElementById('toast'); if(!el){el=document.createElement('div');el.id='toast';document.body.appendChild(el)} el.className=`toast ${good?'good':'bad'}`;el.textContent=msg; clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.remove(),4200); }
  function setNotice(id,msg,type='error'){const el=document.getElementById(id);if(el){el.className=`notice ${type}`;el.innerHTML=esc(msg)}}
  function roleCanAdmin(){return ['super_admin','hse_admin'].includes(state.profile?.role)}
  function roleLabel(r){return String(r||'employee').replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase())}
  function recs(module){return state.records.filter(r=>r.module===module)}
  function allDepartments(){return [...new Set(state.records.map(r=>r.department).filter(Boolean))].sort()}
  function filteredRecords(module=null){
    let a=module?recs(module):state.records.slice();
    const q=state.query.trim().toLowerCase();
    if(q)a=a.filter(r=>[r.reference_no,r.summary,r.location,r.department,r.created_by_name,r.status,JSON.stringify(r.data||{})].join(' ').toLowerCase().includes(q));
    if(state.status!=='all')a=a.filter(r=>r.status===state.status);
    if(state.department!=='all')a=a.filter(r=>r.department===state.department);
    if(state.dateFrom)a=a.filter(r=>(r.event_date||'')>=state.dateFrom);
    if(state.dateTo)a=a.filter(r=>(r.event_date||'')<=state.dateTo);
    return a;
  }

  async function init(){
    if(!sb){renderAuth('Configuration required. Add config.js with your Supabase URL and publishable key.');return;}
    sb.auth.onAuthStateChange(async(_event,s)=>{state.session=s;if(s) await enterApp(); else renderAuth();});
    const {data,error}=await sb.auth.getSession();
    if(error){console.error(error);renderAuth(error.message);return}
    state.session=data.session;
    if(state.session) await enterApp(); else renderAuth();
  }
  async function enterApp(){
    await loadProfile();
    if(!state.profile){ await sb.auth.signOut(); renderAuth('Your profile could not be loaded. Ask an administrator to check the account.'); return; }
    if(state.profile.must_change_password){renderPasswordChange();return;}
    await loadRecords();
    subscribeRealtime();
    renderApp();
  }
  async function loadProfile(){const {data,error}=await sb.from('profiles').select('*').eq('id',state.session.user.id).single(); if(error){console.error(error);state.profile=null;return} state.profile=data;}
  async function loadRecords(){state.loading=true; if(document.getElementById('content')) document.getElementById('content').innerHTML='<div class="card card-pad loading"><div class="spinner"></div><p>Loading HSE records…</p></div>'; const {data,error}=await sb.from('hse_records').select('*').order('created_at',{ascending:false}).limit(5000); state.loading=false; if(error){console.error(error);toast(error.message,false);state.records=[]}else state.records=data||[];}
  let realtime;
  function subscribeRealtime(){ if(realtime)sb.removeChannel(realtime); realtime=sb.channel('hse360-live').on('postgres_changes',{event:'*',schema:'public',table:'hse_records'},payload=>{ if(payload.eventType==='INSERT')state.records.unshift(payload.new); if(payload.eventType==='UPDATE'){const i=state.records.findIndex(x=>x.id===payload.new.id);if(i>=0)state.records[i]=payload.new} if(payload.eventType==='DELETE')state.records=state.records.filter(x=>x.id!==payload.old.id); renderPage(); }).subscribe(); }
  async function refresh(){await loadRecords();renderPage();toast('Dashboard refreshed.');}
  async function signout(){if(realtime)sb.removeChannel(realtime);await sb.auth.signOut();}

  function renderAuth(message=''){
    document.body.innerHTML=`<div class="auth-shell"><section class="auth-visual"><div class="auth-brand"><div class="brand-mark">N</div><div><div class="brand-name">NUHAS HSE360</div><div class="brand-sub">Integrated HSE & IMS Management System</div></div></div><div class="auth-hero"><div class="eyebrow">Emirates National Copper Factory – NUHAS</div><h1>Safety. <span>Control.</span><br>Performance.</h1><p>A single command platform for HSE, risk, work permits, training, emergency preparedness, environment, energy and integrated management systems.</p><div class="auth-pills"><span class="auth-pill">ISO 45001</span><span class="auth-pill">ISO 14001</span><span class="auth-pill">ISO 9001</span><span class="auth-pill">ISO 50001</span><span class="auth-pill">ADOSH</span></div></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Secure access</div><div id="auth-body"></div></div></section></div>`;
    showLogin(message);
  }
  function showLogin(message=''){
    const b=document.getElementById('auth-body');if(!b)return;
    b.innerHTML=`<h2>Welcome back</h2><p class="lead">Sign in to your NUHAS HSE360 command center.</p>${message?`<div id="auth-msg" class="notice ${message.toLowerCase().includes('required')?'':'error'}">${esc(message)}</div>`:'<div id="auth-msg"></div>'}<form id="login-form" class="auth-form"><div class="field"><label>Username</label><input id="lu" autocomplete="username" placeholder="e.g. DANISH" autofocus></div><div class="field"><label>Password</label><div class="password-wrap"><input id="lp" type="password" autocomplete="current-password" placeholder="Enter your password"><button class="password-toggle" type="button" data-toggle="lp">${icon('eye',16)}</button></div></div><div class="auth-actions"><button class="btn primary block" type="submit">Sign in</button></div></form><div class="auth-switch"><button class="link-btn" data-auth="register">Create account</button><button class="link-btn" data-auth="forgot">Forgot password?</button></div>`;
    document.getElementById('login-form').addEventListener('submit',e=>{e.preventDefault();doLogin()});
    wireAuthToggles(); wireAuthLinks();
  }
  function showRegister(){
    const b=document.getElementById('auth-body');if(!b)return;
    b.innerHTML=`<h2>Create account</h2><p class="lead">Create a NUHAS HSE360 user account. The first account is provisioned as Super Admin.</p><div id="auth-msg"></div><form id="register-form" class="auth-form"><div class="form-grid"><div class="field"><label>Username *</label><input id="ru" autocomplete="username" placeholder="3–40 characters"></div><div class="field"><label>Recovery email <span class="muted">(optional)</span></label><input id="re" type="email" autocomplete="email" placeholder="For password recovery"></div><div class="field"><label>Full name</label><input id="rn" placeholder="Full name"></div><div class="field"><label>Department</label><input id="rd" placeholder="HSE / Production / Maintenance…"></div><div class="field"><label>Password *</label><div class="password-wrap"><input id="rp" type="password" autocomplete="new-password" placeholder="Minimum 10 characters"><button class="password-toggle" type="button" data-toggle="rp">${icon('eye',16)}</button></div></div><div class="field"><label>Confirm password *</label><div class="password-wrap"><input id="rc" type="password" autocomplete="new-password" placeholder="Repeat password"><button class="password-toggle" type="button" data-toggle="rc">${icon('eye',16)}</button></div></div></div><div class="notice">Passwords are never visible to administrators. If no recovery email is provided, password reset must be handled by an authorized NUHAS Admin.</div><button class="btn primary block" type="submit">Create account</button></form><div class="auth-switch"><button class="link-btn" data-auth="login">Back to sign in</button><span></span></div>`;
    document.getElementById('register-form').addEventListener('submit',e=>{e.preventDefault();register()});wireAuthToggles(); wireAuthLinks();
  }
  function showForgot(){
    const b=document.getElementById('auth-body');if(!b)return;
    b.innerHTML=`<h2>Recover access</h2><p class="lead">Use the recovery email attached to your NUHAS HSE360 account.</p><div id="auth-msg"></div><form id="forgot-form" class="auth-form"><div class="field"><label>Recovery email</label><input id="fe" type="email" autocomplete="email" placeholder="name@company.com"></div><button class="btn primary block" type="submit">Send recovery link</button></form><div class="notice">No recovery email? Contact an authorized NUHAS HSE360 Admin. The Admin can issue a temporary password without revealing your existing password.</div><div class="auth-switch"><button class="link-btn" data-auth="login">Back to sign in</button><span></span></div>`;
    document.getElementById('forgot-form').addEventListener('submit',e=>{e.preventDefault();forgot()}); wireAuthLinks();
  }
  function wireAuthToggles(){document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{const i=document.getElementById(b.dataset.toggle);if(i)i.type=i.type==='password'?'text':'password'}));}
  function wireAuthLinks(){document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>b.dataset.auth==='login'?showLogin():b.dataset.auth==='register'?showRegister():showForgot());}
  async function doLogin(){
    const u=document.getElementById('lu')?.value.trim(), p=document.getElementById('lp')?.value, msg=document.getElementById('auth-msg');
    if(!u||!p){setNotice('auth-msg','Enter your username and password.','error');return;}
    const btn=document.querySelector('#login-form button[type=submit]');btn.disabled=true;btn.textContent='Signing in…';
    const {data,error}=await sb.rpc('login_with_username',{p_username:u,p_password:p});
    if(error||!data){btn.disabled=false;btn.textContent='Sign in';setNotice('auth-msg','Invalid username or password.','error');return;}
    const r=await sb.auth.signInWithPassword({email:data.email,password:p});
    if(r.error){btn.disabled=false;btn.textContent='Sign in';setNotice('auth-msg',r.error.message||'Unable to sign in.','error');return;}
    if(r.data.user) await sb.rpc('touch_last_login');
  }
  async function register(){
    const u=document.getElementById('ru')?.value.trim(), email=document.getElementById('re')?.value.trim().toLowerCase(), n=document.getElementById('rn')?.value.trim(), d=document.getElementById('rd')?.value.trim(), p=document.getElementById('rp')?.value, c=document.getElementById('rc')?.value;
    if(!u||!p||!c){setNotice('auth-msg','Username, password and confirmation are required.','error');return}
    if(!/^[A-Za-z0-9._-]{3,40}$/.test(u)){setNotice('auth-msg','Username must be 3–40 letters, numbers, dot, underscore or hyphen.','error');return}
    if(p.length<10){setNotice('auth-msg','Password must contain at least 10 characters.','error');return}
    if(p!==c){setNotice('auth-msg','Passwords do not match.','error');return}
    if(email&&!/^\S+@\S+\.\S+$/.test(email)){setNotice('auth-msg','Enter a valid recovery email.','error');return}
    const authEmail=email||`${u.toLowerCase()}@nuhas.local`;
    const btn=document.querySelector('#register-form button[type=submit]');btn.disabled=true;btn.textContent='Creating account…';
    const {data,error}=await sb.auth.signUp({email:authEmail,password:p,options:{data:{username:u,recovery_email:email||null,full_name:n||null,department:d||null}}});
    if(error){btn.disabled=false;btn.textContent='Create account';setNotice('auth-msg',error.message||'Registration failed.','error');return}
    if(data?.user){
      if(data.session){toast('Account created. Signing you in…');}
      else {setNotice('auth-msg','Account created. Check your email if confirmation is required, then sign in.','success');setTimeout(()=>showLogin(),1800);}
    } else {btn.disabled=false;btn.textContent='Create account';setNotice('auth-msg','The account could not be created. Please try again.','error');}
  }
  async function forgot(){const e=document.getElementById('fe')?.value.trim();if(!e){setNotice('auth-msg','Enter your registered recovery email.','error');return}const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin+location.pathname});if(error)setNotice('auth-msg',error.message,'error');else setNotice('auth-msg','If the email is registered, a recovery message has been sent.','success');}
  function renderPasswordChange(){document.body.innerHTML=`<div class="auth-shell"><section class="auth-visual"><div class="auth-brand"><div class="brand-mark">N</div><div><div class="brand-name">NUHAS HSE360</div><div class="brand-sub">Secure account control</div></div></div><div class="auth-hero"><div class="eyebrow">Temporary password issued</div><h1>Protect your<br><span>account.</span></h1><p>Your administrator issued a temporary password. Set your private password before continuing.</p></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Required action</div><h2>Change password</h2><p class="lead">Use at least 10 characters. Your administrator cannot see the new password.</p><div id="pw-msg"></div><form id="pw-form" class="auth-form"><div class="field"><label>New password</label><div class="password-wrap"><input id="np" type="password"><button class="password-toggle" type="button" data-toggle="np">${icon('eye',16)}</button></div></div><div class="field"><label>Confirm password</label><input id="nc" type="password"></div><button class="btn primary block" type="submit">Set new password</button></form></div></section></div>`;wireAuthToggles();document.getElementById('pw-form').addEventListener('submit',async e=>{e.preventDefault();const p=document.getElementById('np').value,c=document.getElementById('nc').value;if(p.length<10||p!==c){setNotice('pw-msg','Use at least 10 characters and make both passwords match.','error');return}const {error}=await sb.auth.updateUser({password:p});if(error){setNotice('pw-msg',error.message,'error');return}await sb.rpc('complete_password_change');await enterApp();});}

  function renderApp(){
    document.body.innerHTML=`<div class="app-shell"><aside id="sidebar" class="sidebar"><div class="side-brand"><div class="brand-mark">N</div><div><div class="brand-name">NUHAS HSE360</div><div class="brand-sub">Integrated HSE & IMS</div></div></div><div class="nav-wrap">${navHTML()}</div></aside><main class="main"><header class="topbar"><div class="top-left"><button class="icon-btn mobile-menu" id="mobile-menu">${icon('menu')}</button><div class="top-search">${icon('search',15)}<input id="global-search" placeholder="Search references, incidents, actions…" value="${esc(state.query)}"></div></div><div class="top-right"><button class="icon-btn" id="theme-btn" title="Theme">${icon(state.theme==='dark'?'sun':'moon',16)}</button><button class="icon-btn" id="refresh-btn" title="Refresh">${icon('history',16)}</button><button class="icon-btn" id="notification-btn" title="Notifications" aria-label="Notifications">${icon('bell',16)}</button><div class="user-chip"><div><div class="user-name">${esc(state.profile.full_name||state.profile.username)}</div><div class="user-role">${esc(roleLabel(state.profile.role))}</div></div><div class="avatar">${esc(initials(state.profile))}</div></div></div></header><div id="page" class="page"><div id="content"></div></div></main></div><div id="toast"></div>`;
    document.getElementById('mobile-menu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('refresh-btn').addEventListener('click',refresh);
    document.getElementById('theme-btn').addEventListener('click',toggleTheme);
    document.getElementById('notification-btn').addEventListener('click',showNotifications);
    const gs=document.getElementById('global-search'); gs.addEventListener('input',e=>{state.query=e.target.value; if(state.page!=='dashboard'&&state.page!=='management')renderPage();}); gs.addEventListener('keydown',e=>{if(e.key==='Enter'&&gs.value.trim()){state.query=gs.value.trim();go('observations');}});
    applyTheme();renderPage();
  }
  function navHTML(){return GROUPS.map(([g,items])=>`<div class="nav-section">${g}</div>${items.map(([key,label,ic])=>{const allowed=key==='users'&& !roleCanAdmin();return allowed?'':`<button class="nav-item ${state.page===key?'active':''}" data-nav="${key}"><span class="nav-icon">${icon(ic,16)}</span><span>${label}</span>${key==='actions'&&openActions()>0?`<span class="nav-badge">${openActions()}</span>`:''}</button>`}).join('')}`).join('');}
  function titleFor(){if(state.page==='dashboard')return ['HSE Command Center','Live operational view of safety, risk, compliance and performance.'];if(state.page==='management')return ['Management Overview','Executive HSE performance, exposure, actions and compliance at a glance.'];if(state.page==='users')return ['Users & Roles','Manage access, status and administrator password resets.'];if(state.page==='auditlog')return ['Audit Trail','System activity and traceability across HSE360.'];if(state.page==='settings')return ['System Settings','Application preferences and connection information.'];const m=MODULES[state.page];return m?[m.label,m.desc]:['HSE360','Integrated HSE & IMS Management System'];}
  function renderPage(){if(!document.getElementById('content'))return;document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.nav===state.page));if(state.page==='dashboard')dashboard();else if(state.page==='management')management();else if(state.page==='users')users();else if(state.page==='auditlog')auditlog();else if(state.page==='settings')settingsPage();else modulePage(state.page);}
  function go(page){state.page=page;state.query='';state.status='all';state.department='all';state.dateFrom='';state.dateTo='';document.getElementById('sidebar')?.classList.remove('open');renderPage();}

  function pageHeader(actions=''){const [t,d]=titleFor();return `<div class="page-head"><div><div class="eyebrow">Emirates National Copper Factory – NUHAS</div><h1>${t}</h1><p>${d}</p></div><div class="head-actions">${actions}</div></div>`;}
  function kpi(label,value,sub,ic,trend=''){return `<div class="card kpi"><div class="kpi-top"><div class="kpi-label">${label}</div><div class="kpi-icon">${icon(ic,15)}</div></div><div class="kpi-value">${fmtNum(value)}</div><div class="kpi-foot"><span>${sub}</span>${trend?`<span class="${trend[0]}">${trend[1]}</span>`:''}</div></div>`;}
  function openActions(){return recs('actions').filter(r=>r.status!=='closed').length;}
  function dashboard(){
    const mh=recs('manhours').reduce((a,r)=>a+Number(r.data?.hours||0),0), lti=recs('accidents').filter(r=>String(r.data?.lti||'').toLowerCase()==='yes').length, obs=recs('observations').length, nm=recs('near_miss').length, fa=recs('first_aid').length, accidents=recs('accidents').length, th=recs('training').reduce((a,r)=>a+Number(r.data?.participant_hours||0),0), tbt=recs('tbt').reduce((a,r)=>a+Number(r.data?.participant_hours||0),0), drills=recs('drills').length, permits=recs('permits').length, risks=recs('risk'), high=risks.filter(r=>['High','Extreme'].includes(r.data?.level)).length;
    const recent=state.records.slice(0,7), months=lastMonths(6), bars=months.map(m=>({m,count:state.records.filter(r=>String(r.event_date||'').slice(0,7)===m.key).length}));
    const riskCounts={Low:risks.filter(r=>r.data?.level==='Low').length,Medium:risks.filter(r=>r.data?.level==='Medium').length,High:risks.filter(r=>r.data?.level==='High').length,Extreme:risks.filter(r=>r.data?.level==='Extreme').length};
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn primary" data-new="observations">${icon('plus2',14)} New Observation</button><button class="btn" data-new="near_miss">${icon('plus2',14)} Near Miss</button><button class="btn" data-new="permits">${icon('plus2',14)} Work Permit</button>`)}
      <div class="grid-4">${kpi('Manhours',mh,'Registered exposure hours','clock')}${kpi('LTI',lti,'Lost-time injuries','medical',lti?['trend-danger','Attention']:['trend-up','On track'])}${kpi('Near Miss',nm,'Reported learning events','shield')}${kpi('Open Actions',openActions(),'Corrective actions not closed','check',openActions()?['trend-warn','Review']:['trend-up','Clear'])}${kpi('Observations',obs,'Safety observations','eye')}${kpi('Training Participant-Hours',th,'Training exposure','book')}${kpi('TBT Participant-Hours',tbt,'Toolbox exposure','users')}${kpi('High / Extreme Risks',high,'Current risk register','risk',high?['trend-danger','Priority']:['trend-up','Controlled'])}</div>
      <div style="height:15px"></div>
      <div class="quick-actions">${[['observations','New Observation','Record a hazard or positive finding','eye'],['actions','Corrective Action','Assign and track an action','check'],['risk','Risk Assessment','Score a new hazard','risk'],['training','Training','Log a completed session','book'],['permits','Work Permit','Start controlled work','file']].map(x=>`<button class="quick" data-new="${x[0]}"><span class="icon-square">${icon(x[3],15)}</span><strong>${x[1]}</strong><span>${x[2]}</span></button>`).join('')}</div>
      <div style="height:15px"></div>
      <div class="grid-2"><section class="card panel"><div class="section-title"><div><h2>HSE Activity</h2><p>Records created over the last six reporting months</p></div><button class="btn" data-go="management">View analytics ${icon('chevron',13)}</button></div><div class="chart">${bars.map(b=>`<div class="bar" style="height:${Math.max(8,(b.count/Math.max(1,...bars.map(x=>x.count)))*155)}px"><b>${b.count}</b><span>${b.m}</span></div>`).join('')}</div></section><section class="card panel"><div class="section-title"><div><h2>Risk Profile</h2><p>Current risk register distribution</p></div><button class="btn" data-go="risk">Open register ${icon('chevron',13)}</button></div><div style="display:grid;grid-template-columns:150px 1fr;gap:24px;align-items:center"><div class="risk-grid">${['Low','Medium','High','Extreme'].map(l=>`<div class="risk-cell risk-${l.toLowerCase()}">${riskCounts[l]}</div>`).join('')}</div><div>${['Low','Medium','High','Extreme'].map(l=>`<div class="progress-row"><div class="progress-label">${l}</div><div class="progress ${l==='Low'?'green':''}"><span style="width:${risks.length?Math.round(riskCounts[l]/risks.length*100):0}%"></span></div><div class="progress-value">${risks.length?Math.round(riskCounts[l]/risks.length*100):0}%</div></div>`).join('')}</div></div></section></div>
      <div style="height:15px"></div>
      <div class="grid-2"><section class="card panel"><div class="section-title"><div><h2>Management Attention</h2><p>Items requiring review or timely follow-up</p></div></div><div class="attention-list">${attentionRows(lti,openActions(),high,permits)}</div></section><section class="card panel"><div class="section-title"><div><h2>Recent Activity</h2><p>Latest registered HSE360 records</p></div><button class="btn" data-go="observations">All registers ${icon('chevron',13)}</button></div>${recent.length?`<div class="attention-list">${recent.map(r=>`<button class="attention-row" data-detail="${r.id}" style="text-align:left;background:#fff;border:1px solid #edf1f5"><span class="attention-dot dot-green"></span><span style="flex:1"><b>${esc(r.reference_no)} · ${esc(MODULES[r.module]?.singular||r.module)}</b><span>${esc(r.summary||'Record')} · ${ago(r.created_at)}</span></span>${icon('chevron',14)}</button>`).join('')}</div>`:'<div class="empty"><strong>No activity yet</strong>Create your first HSE record.</div>'}</section></div>
      <div style="height:15px"></div><section class="card panel"><div class="section-title"><div><h2>Integrated Management Systems</h2><p>Live coverage from HSE360 records — no invented compliance percentages.</p></div></div><div class="grid-3">${frameworkSnapshot().map(x=>`<div class="detail-box"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${x.name}</strong><span class="badge ${x.count?'closed':'open'}">${x.count?'Records linked':'No records yet'}</span></div><div style="margin-top:5px;color:var(--muted);font-size:11px">${x.desc}</div><div style="margin-top:9px;font-size:11px;font-weight:800">${fmtNum(x.count)} linked record${x.count===1?'':'s'}</div></div>`).join('')}</div></section>`;
    wirePageEvents();
  }
  function frameworkSnapshot(){
    const auditText=recs('audit').map(r=>`${r.data?.standard||''} ${r.summary||''}`.toLowerCase()).join(' ');
    const legalCount=recs('legal').length, docCount=recs('documents').length, objectiveCount=recs('objectives').length;
    return [
      {name:'ISO 45001',desc:'Occupational health & safety management',count:recs('risk').length+recs('inspections').length+recs('incidents').length+recs('near_miss').length+recs('accidents').length},
      {name:'ISO 14001',desc:'Environmental management and waste controls',count:recs('waste').length+recs('chemicals').length+(auditText.includes('14001')?1:0)},
      {name:'ISO 9001',desc:'Quality and nonconformity controls',count:recs('ncr').length+(auditText.includes('9001')?1:0)},
      {name:'ISO 50001',desc:'Energy management and efficiency',count:recs('energy').length+(auditText.includes('50001')?1:0)},
      {name:'ADOSH',desc:'Legal, audit and occupational safety controls',count:legalCount+(auditText.includes('adosh')?1:0)+recs('inspections').length},
      {name:'IMS Objectives',desc:'Objectives, targets and continual improvement',count:objectiveCount}
    ];
  }
  function addMonthsISO(base, months){
    const d=new Date(`${base||today()}T00:00:00`);
    d.setMonth(d.getMonth()+months);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function expiryItems(){
    const cutoff=addMonthsISO(today(),2);
    const now=today();
    const out=[];
    state.records.forEach(r=>{
      const d=r.data||{};
      const expiry=d.expiry_date||d.valid_until||d.license_expiry||d.certificate_expiry;
      if(!expiry)return;
      const renewal=String(d.renewal_status||d.compliance_status||r.status||'open').toLowerCase();
      const fulfilled=['renewed','renewed/closed','closed','compliant','valid','completed'].includes(renewal);
      if(!fulfilled && expiry<=cutoff){
        const overdue=expiry<now;
        out.push({r,expiry,overdue,days:Math.ceil((new Date(`${expiry}T00:00:00`)-new Date(`${now}T00:00:00`))/86400000)});
      }
    });
    return out.sort((a,b)=>a.expiry.localeCompare(b.expiry));
  }
  function complianceAlertSummary(){
    const items=expiryItems();
    const overdue=items.filter(x=>x.overdue).length;
    const due=items.filter(x=>!x.overdue).length;
    return {items,overdue,due,total:items.length};
  }
  function attentionRows(lti,open,high,permits){
    const a=complianceAlertSummary();
    const expiryRow=a.total?`<button class="attention-row" data-go="licenses" style="text-align:left;background:#fff;border:0"><span class="attention-dot ${a.overdue?'dot-red':'dot-amber'}"></span><span style="flex:1"><b>${a.total} licence / competency / inspection alert${a.total===1?'':'s'}</b><span>${a.overdue?`${a.overdue} overdue · `:''}${a.due} due within 2 months. Alert remains until the record is renewed/updated.</span></span>${icon('chevron',14)}</button>`:`<button class="attention-row" data-go="licenses" style="text-align:left;background:#fff;border:0"><span class="attention-dot dot-green"></span><span style="flex:1"><b>No renewal alerts</b><span>Licences, certificates and validity records are currently outside the 2-month alert window.</span></span>${icon('chevron',14)}</button>`;
    return `<button class="attention-row" data-go="actions" style="text-align:left;background:#fff;border:0"><span class="attention-dot ${open?'dot-red':'dot-green'}"></span><span style="flex:1"><b>${open} open corrective actions</b><span>${open?'Review due dates and overdue items.':'No open actions currently recorded.'}</span></span>${icon('chevron',14)}</button>${a.total?expiryRow:''}<button class="attention-row" data-go="risk" style="text-align:left;background:#fff;border:0"><span class="attention-dot ${high?'dot-amber':'dot-green'}"></span><span style="flex:1"><b>${high} high / extreme risks</b><span>${high?'Prioritize treatment and verification.':'No high or extreme risks recorded.'}</span></span>${icon('chevron',14)}</button><button class="attention-row" data-go="accidents" style="text-align:left;background:#fff;border:0"><span class="attention-dot ${lti?'dot-red':'dot-green'}"></span><span style="flex:1"><b>${lti} LTI cases</b><span>${lti?'Management review required.':'No LTI recorded in the current dataset.'}</span></span>${icon('chevron',14)}</button><button class="attention-row" data-go="permits" style="text-align:left;background:#fff;border:0"><span class="attention-dot dot-green"></span><span style="flex:1"><b>${permits} work permits</b><span>Controlled work records in the system.</span></span>${icon('chevron',14)}</button>`;
  }
  function lastMonths(n){const out=[];const d=new Date();d.setDate(1);for(let i=n-1;i>=0;i--){const x=new Date(d);x.setMonth(d.getMonth()-i);out.push({key:`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`,m:x.toLocaleDateString('en-US',{month:'short'})})}return out;}

  function management(){
    const total=state.records.length, closed=recs('actions').filter(r=>r.status==='closed').length, actionTotal=recs('actions').length, closure=actionTotal?Math.round(closed/actionTotal*100):0, riskTotal=recs('risk').length, high=recs('risk').filter(r=>['High','Extreme'].includes(r.data?.level)).length, audits=recs('audit').length, training=recs('training').length;
    const months=lastMonths(12); const series=months.map(m=>({m:m.m,count:state.records.filter(r=>String(r.event_date||'').slice(0,7)===m.key).length}));
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-export="all">${icon('download',14)} Export data</button><button class="btn primary" data-go="dashboard">Back to command center</button>`)}
      <div class="grid-4">${kpi('Total HSE Records',total,'Across all modules','clipboard')}${kpi('Action Closure',`${closure}%`,'Closed / total corrective actions','check',closure>=80?['trend-up','Healthy']:['trend-warn','Improve'])}${kpi('High / Extreme Risk',high,`${riskTotal} total risk records`,'risk')}${kpi('Audits',audits,'Audit records registered','search')}</div><div style="height:15px"></div>
      <div class="grid-2"><section class="card panel"><div class="section-title"><div><h2>12-Month Activity Trend</h2><p>All HSE360 records by event month</p></div></div><div class="chart">${series.map(b=>`<div class="bar" style="height:${Math.max(8,(b.count/Math.max(1,...series.map(x=>x.count)))*160)}px"><b>${b.count}</b><span>${b.m}</span></div>`).join('')}</div></section><section class="card panel"><div class="section-title"><div><h2>Performance Snapshot</h2><p>Live indicators derived from registered records</p></div></div>${[['Manhours',recs('manhours').reduce((a,r)=>a+Number(r.data?.hours||0),0),'clock'],['Training sessions',training,'book'],['TBT participant-hours',recs('tbt').reduce((a,r)=>a+Number(r.data?.participant_hours||0),0),'users'],['Mock drills',recs('drills').length,'flame'],['Near misses',recs('near_miss').length,'shield']].map(x=>`<div class="attention-row"><span class="icon-square">${icon(x[2],14)}</span><span style="flex:1"><b>${x[0]}</b><span>Live from HSE360 database</span></span><strong>${fmtNum(x[1])}</strong></div>`).join('')}</section></div><div style="height:15px"></div>
      <section class="card panel"><div class="section-title"><div><h2>IMS & Compliance Command View</h2><p>Live record coverage and CAPA performance. Formal compliance scores are only shown when configured from verified evidence.</p></div></div><div class="grid-3">${frameworkSnapshot().concat([{name:'CAPA',desc:'Corrective action closure',count:actionTotal}]).map(x=>`<div class="detail-box"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${x.name}</strong><strong>${x.name==='CAPA'?`${closure}%`:fmtNum(x.count)}</strong></div><div style="margin:8px 0 6px;color:var(--muted);font-size:10px">${x.desc}</div>${x.name==='CAPA'?`<div class="progress green" style="height:7px"><span style="width:${closure}%"></span></div>`:`<div class="muted small">${fmtNum(x.count)} linked record${x.count===1?'':'s'}</div>`}</div>`).join('')}</div></section>`;
    wirePageEvents();
  }

  function modulePage(module){
    const m=MODULES[module]; if(!m){document.getElementById('content').innerHTML='<div class="empty">Module unavailable.</div>';return;}
    const rows=filteredRecords(module), total=recs(module).length, open=recs(module).filter(r=>r.status!=='closed').length;
    const depts=allDepartments();
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-import-module="${module}">${icon('download',14)} Import CSV</button><button class="btn" data-export-module="${module}">${icon('download',14)} Export CSV</button><button class="btn" data-backup="1">Backup JSON</button><button class="btn primary" data-new="${module}">${icon('plus2',14)} New ${m.singular}</button>`)}<input id="csv-import-${module}" type="file" accept=".csv,text/csv" hidden>
      <section class="card"><div class="filterbar"><input class="filter-search" data-filter="query" placeholder="Search reference, summary, location…" value="${esc(state.query)}"><select data-filter="status"><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="closed">Closed</option></select><select data-filter="department"><option value="all">All departments</option>${depts.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('')}</select><input data-filter="from" type="date" value="${esc(state.dateFrom)}"><input data-filter="to" type="date" value="${esc(state.dateTo)}"></div><div class="panel" style="padding-bottom:10px"><div class="legend"><span><i style="background:#f59e0b"></i>${total} total records</span><span><i style="background:#2563eb"></i>${open} open / active</span><span><i style="background:#159a5b"></i>Live database</span></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Date</th><th>Status</th><th>Department</th><th>Location</th><th>Summary</th><th>Created</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><button class="link-btn ref" data-detail="${r.id}">${esc(r.reference_no)}</button></td><td>${fmtDate(r.event_date)}</td><td>${statusBadge(r.status)}</td><td>${esc(r.department||'—')}</td><td>${esc(r.location||'—')}</td><td class="summary-cell" title="${esc(r.summary||'')}">${esc(r.summary||'—')}</td><td>${esc(r.created_by_name||'—')}<br><span class="muted small">${ago(r.created_at)}</span></td><td><button class="icon-btn" data-detail="${r.id}">${icon('external',14)}</button></td></tr>`).join('')}</tbody></table></div>${rows.length?'':'<div class="empty"><strong>No records match this view</strong>Use the New button to create a record or clear the filters.</div>'}</section>`;
    const s=document.querySelector('[data-filter="status"]');if(s)s.value=state.status;const d=document.querySelector('[data-filter="department"]');if(d)d.value=state.department;wirePageEvents();
    document.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener(el.dataset.filter==='query'?'input':'change',e=>{if(e.target.dataset.filter==='query')state.query=e.target.value;else if(e.target.dataset.filter==='status')state.status=e.target.value;else if(e.target.dataset.filter==='department')state.department=e.target.value;else if(e.target.dataset.filter==='from')state.dateFrom=e.target.value;else if(e.target.dataset.filter==='to')state.dateTo=e.target.value;renderPage()}));
  }
  function statusBadge(s){const k=s||'open';return `<span class="badge ${esc(k)}">${esc(String(k).replaceAll('_',' '))}</span>`}

  function formSchema(t){
    const common=[['event_date','Date','date',today()],['location','Location','text',''],['department','Department','text',state.profile?.department||'']];
    const extra={
      observations:[['observation_type','Observation type','select','Unsafe condition|Unsafe act|Positive observation|Environmental|Ergonomic|Other'],['risk_level','Initial risk','select','Low|Medium|High|Extreme']],
      incidents:[['incident_type','Incident type','select','Injury|Property damage|Environmental|Fire|Chemical|Vehicle|Security|Other'],['severity','Severity','select','Minor|Moderate|Major|Critical']],
      near_miss:[['potential_severity','Potential severity','select','Low|Medium|High|Critical'],['immediate_action','Immediate action taken','text','']],
      first_aid:[['case_type','Case type','text',''],['treatment','Treatment','text','']],
      accidents:[['lti','Lost-time injury (LTI)?','select','No|Yes'],['injury_type','Injury type','text',''],['days_lost','Days lost','number','0']],
      inspections:[['inspection_type','Inspection type','select','Daily|Weekly|Monthly|Statutory|Housekeeping|Fire & Life Safety|Other'],['findings','Findings count','number','0']],
      actions:[['action_type','Action type','select','Corrective|Preventive|Improvement'],['responsible','Responsible person','text',''],['due_date','Due date','date',today()],['priority','Priority','select','Low|Medium|High|Critical']],
      training:[['topic','Training topic','text',''],['trainer','Trainer','text',''],['participants','Participants','number','0'],['duration','Duration (hours)','number','0']],
      tbt:[['topic','TBT topic','text',''],['conductor','Conducted by','text',''],['participants','Participants','number','0'],['duration','Duration (hours)','number','0']],
      drills:[['drill_type','Drill type','select','Fire|Chemical Spill|Medical Emergency|Evacuation|Confined Space|Other'],['participants','Participants','number','0'],['response_time','Response time (minutes)','number','0']],
      manhours:[['hours','Total manhours','number','0'],['employees','Employees covered','number','0'],['contractors','Contractors covered','number','0']],
      permits:[['permit_type','Permit type','select','General Work Permit|Critical Work Permit|Hot Work|Work at Height|Confined Space|Electrical Work|Lifting Operation|Excavation|Line Breaking|Chemical Work'],['requestor','Requestor','text',''],['valid_until','Valid until','date',today()],['hazards','Key hazards','text','']],
      risk:[['hazard','Hazard','text',''],['likelihood','Likelihood (1–5)','number','1'],['severity','Severity (1–5)','number','1'],['existing_controls','Existing controls','textarea','']],
      chemicals:[['chemical_name','Chemical name','text',''],['cas_no','CAS / identifier','text',''],['quantity','Quantity','number','0'],['unit','Unit','text',''],['storage','Storage location','text',''],['sds','SDS available','select','Yes|No']],
      waste:[['waste_stream','Waste stream','select','General|Metal|Chemical|Hazardous|Plastic|Paper|E-waste|Other'],['quantity','Quantity','number','0'],['unit','Unit','text',''],['vendor','Waste vendor','text',''],['manifest','Manifest / reference','text','']],
      energy:[['energy_source','Energy source','select','Electricity|Natural Gas|Diesel|Water|Other'],['quantity','Consumption','number','0'],['unit','Unit','text',''],['meter','Meter / source','text','']],
      audit:[['audit_type','Audit type','select','Internal|External|Certification|ADOSH|Customer|Supplier'],['standard','Standard / criteria','text',''],['auditor','Auditor','text',''],['findings','Findings count','number','0']],
      ncr:[['ncr_type','NCR type','select','Internal|External|Customer|Audit|Incident|Legal'],['root_cause','Root cause','textarea',''],['responsible','Responsible person','text',''],['due_date','Due date','date',today()]],
      documents:[['document_title','Document title','text',''],['document_no','Document number','text',''],['revision','Revision','text','00'],['owner','Document owner','text',''],['approval_status','Approval status','select','Draft|For Review|Approved|Obsolete']],
      legal:[['requirement','Legal requirement','text',''],['authority','Authority / source','text',''],['applicability','Applicability','select','Applicable|Not Applicable|Under Review'],['compliance_status','Compliance status','select','Compliant|Partially Compliant|Non-Compliant|Not Assessed'],['next_review','Next review','date',today()]],
      objectives:[['objective','Objective','text',''],['target','Target','text',''],['measure','Measure / KPI','text',''],['owner','Owner','text',''],['progress','Progress %','number','0']],
      employees:[['employee_code','Employee code / stock code','text',''],['employee_name','Employee name','text',''],['designation','Designation','text',''],['department_name','Department','text',''],['employment_type','Employment type','select','NUHAS|Contractor|Other'],['active_status','Active status','select','Active|Inactive'],['joining_date','Joining date','date',today()],['contact','Contact / extension','text','']],
      ppe:[['employee_code','Employee code / stock code','text',''],['employee_name','Employee name','text',''],['designation','Designation / location','text',''],['ppe_item','PPE item','text',''],['size','Size','text',''],['issue_date','PPE issue date','date',today()],['quantity','Quantity','number','1'],['issue_type','Issue type','select','New Joining|Replacement|Additional|Other'],['remarks','Remarks','textarea','']],
      competencies:[['employee_code','Employee code','text',''],['employee_name','Employee name','text',''],['designation','Designation','text',''],['competency_type','Competency / authorisation','select','First Aider|Fire Fighter|External Training|Forklift Operator|Scissor Lift Operator|EOT Crane Operator|Other'],['certificate','Certificate / licence name','text',''],['provider','Training provider / authority','text',''],['issue_date','Issue date','date',today()],['expiry_date','Expiry / validity date','date',today()],['renewal_status','Renewal status','select','Valid|Due for Renewal|Expired|Renewed'],['remarks','Remarks','textarea','']],
      licenses:[['document_name','Licence / certificate / contract','text',''],['authority','Authority / issuer','text',''],['document_no','Licence / certificate no.','text',''],['issue_date','Issue date','date',today()],['expiry_date','Expiry date','date',today()],['compliance_status','Compliance status','select','Compliant|Partially Compliant|Non-Compliant|Under Renewal|Expired'],['renewal_status','Renewal status','select','Open|Renewal in Progress|Renewed|Closed'],['responsible','Responsible person','text',''],['evidence','Evidence / file reference','text',''],['remarks','Remarks','textarea','']],
      fire_equipment:[['equipment_id','Equipment ID','text',''],['category','Category','select','FE-DCP|FE-CO2|FE-FOAM|FH-HR|FHY|FE-FM200|FB|MCV'],['area','Area','text',''],['equipment_type','Equipment / Type','text',''],['equipment_location','Location','text',''],['pressure_gauge','Pressure / Gauge','select','OK|NOT OK|N/A'],['body_cylinder','Body / Cylinder','select','OK|NOT OK|N/A'],['instruction_label','Instruction / Label','select','OK|NOT OK|N/A'],['hose_nozzle','Hose / Nozzle','select','OK|NOT OK|N/A'],['pin_seal','Pin & Seal','select','OK|NOT OK|N/A'],['accessible','Accessible / Unobstructed','select','OK|NOT OK|N/A'],['mounting','Mounting / Stand','select','OK|NOT OK|N/A'],['inspection_sticker','Inspection Sticker','select','OK|NOT OK|N/A'],['inspection_date','Inspection date','date',today()],['inspection_status','Inspection status','select','OK|NOT OK|N/A'],['remarks','Remarks / Corrective Action','textarea','']],
      third_party:[['serial_no','Serial No. / ID','text',''],['equipment_type','Equipment type','select','Forklift|Scissor Lift|EOT Crane|Crawler Excavator|Air Compressor|Other'],['manufacturer','Manufacturer / Model','text',''],['swl','SWL / Capacity','text',''],['inspection_date','Inspection date','date',today()],['expiry_date','Expiry date','date',today()],['third_party_name','3rd party name','text',''],['inspection_status','Inspection status','select','Valid|Due for Renewal|Expired|Not in use|Action Required'],['remarks','Remarks','textarea','']]
    };
    return [...common,...(extra[t]||[])];
  }
  function renderForm(t, recordId=null){
    const m=MODULES[t]; if(!m)return;
    const existing=recordId?state.records.find(r=>r.id===recordId):null;
    const fields=formSchema(t), data=existing?.data||{}, mid=`modal-${Date.now()}`;
    const val=(id, fallback='')=> id==='event_date'?(existing?.event_date||fallback):id==='location'?(existing?.location||fallback):id==='department'?(existing?.department||fallback):(data[id]??fallback);
    const fieldHTML=fields.map(([id,label,type,defaultValue])=>{
      const current=val(id,defaultValue);
      if(type==='select'){
        const opts=defaultValue.split('|');
        return `<div class="field"><label>${label}</label><select id="f_${id}">${opts.map(o=>`<option value="${esc(o)}" ${String(current)===String(o)?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
      }
      if(type==='textarea')return `<div class="field full"><label>${label}</label><textarea id="f_${id}" placeholder="Enter details…">${esc(current)}</textarea></div>`;
      return `<div class="field"><label>${label}</label><input id="f_${id}" type="${type}" value="${esc(current)}" ${type==='number'?'min="0" step="0.01"':''}></div>`;
    }).join('');
    const status=existing?.status||'open';
    const summary=existing?.summary||data.description||'';
    const related=data.related_reference||'';
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="${mid}" role="dialog" aria-modal="true" aria-labelledby="${mid}-title"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${existing?'Edit record':'New record'} · ${m.code}</div><h2 id="${mid}-title">${existing?'Edit':'Create'} ${m.singular}</h2></div><button class="icon-btn" type="button" data-close-modal="${mid}" aria-label="Close">${icon('close',16)}</button></div><div class="modal-body"><div class="form-section"><h3>Record information</h3><div class="form-grid">${fieldHTML}<div class="field"><label>Status</label><select id="f_status"><option value="open" ${status==='open'?'selected':''}>Open</option><option value="in_progress" ${status==='in_progress'?'selected':''}>In Progress</option><option value="closed" ${status==='closed'?'selected':''}>Closed</option></select></div><div class="field"><label>Related reference <span class="muted">(optional)</span></label><input id="f_related" value="${esc(related)}" placeholder="e.g. NUHAS-OB-2026-00001"></div><div class="field full"><label>Description / summary *</label><textarea id="f_summary" required placeholder="Describe the event, finding, activity or record…">${esc(summary)}</textarea></div></div></div><div class="form-section"><h3>Evidence</h3><div class="field"><label>Photo / document attachment ${existing?.attachment?'(replace optional)':''}</label><input id="f_file" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"></div><p class="muted small">Attachments are stored in the private HSE360 storage bucket.</p></div></div><div class="modal-foot"><button class="btn" type="button" data-close-modal="${mid}">Cancel</button><button class="btn primary" type="button" data-save-form="${t}" data-record-id="${recordId||''}" data-modal="${mid}">${existing?'Save changes':'Save '+m.singular}</button></div></div></div>`);
    const modal=document.getElementById(mid);
    modal?.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
    const escHandler=e=>{if(e.key==='Escape'&&document.getElementById(mid)){document.getElementById(mid).remove();document.removeEventListener('keydown',escHandler);}};
    document.addEventListener('keydown',escHandler);
    modal?.querySelector('[data-close-modal]')?.focus();
    wirePageEvents();
  }

  async function saveForm(t,mid,recordId=''){
    const get=id=>document.getElementById(`f_${id}`)?.value??''; const m=MODULES[t]; const modal=document.getElementById(mid); const btn=modal?.querySelector('[data-save-form]');
    const summary=get('summary').trim();
    if(!summary){toast('Description / summary is required.',false);document.getElementById('f_summary')?.focus();return;}
    if(btn){btn.disabled=true;btn.textContent=recordId?'Saving…':'Saving…';}
    const fields=formSchema(t), data={}; fields.forEach(([id])=>{if(!['event_date','location','department'].includes(id))data[id]=get(id)});
    data.related_reference=get('related'); data.description=summary;
    if(['training','tbt'].includes(t))data.participant_hours=Number(data.participants||0)*Number(data.duration||0);
    if(t==='risk'){const l=Math.max(1,Math.min(5,Number(data.likelihood||0))),s=Math.max(1,Math.min(5,Number(data.severity||0)));data.likelihood=l;data.severity=s;data.score=l*s;data.level=data.score>=20?'Extreme':data.score>=12?'High':data.score>=6?'Medium':'Low';}
    if(t==='objectives')data.progress=Math.max(0,Math.min(100,Number(data.progress||0)));
    if(t==='accidents')data.lti=String(data.lti||'No');
    const file=document.getElementById('f_file')?.files?.[0]; let attachment=null, uploadedPath=null;
    if(file){
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); uploadedPath=`${state.session.user.id}/${crypto.randomUUID()}-${safeName}`;
      const up=await sb.storage.from('hse-attachments').upload(uploadedPath,file,{upsert:false});
      if(up.error){if(btn){btn.disabled=false;btn.textContent=recordId?'Save changes':'Save '+m.singular;}toast(up.error.message,false);return;}
      attachment={path:uploadedPath,name:file.name,size:file.size,type:file.type};
    }
    let out,error;
    if(recordId){
      if(!attachment && state.records.find(r=>r.id===recordId)?.attachment) attachment=state.records.find(r=>r.id===recordId).attachment;
      ({data:out,error}=await sb.rpc('update_hse_record',{p_id:recordId,p_event_date:get('event_date')||today(),p_location:get('location'),p_department:get('department'),p_status:get('status')||'open',p_summary:summary,p_data:data,p_attachment:attachment}));
    } else {
      ({data:out,error}=await sb.rpc('create_hse_record',{p_module:t,p_event_date:get('event_date')||today(),p_location:get('location'),p_department:get('department'),p_status:get('status')||'open',p_summary:summary,p_data:data,p_attachment:attachment}));
    }
    if(error){if(uploadedPath)await sb.storage.from('hse-attachments').remove([uploadedPath]);if(btn){btn.disabled=false;btn.textContent=recordId?'Save changes':'Save '+m.singular;}toast(error.message,false);return;}
    if(recordId && uploadedPath){const oldPath=state.records.find(r=>r.id===recordId)?.attachment?.path;if(oldPath&&oldPath!==uploadedPath)await sb.storage.from('hse-attachments').remove([oldPath]);}
    modal?.remove();toast(`${out.reference_no} ${recordId?'updated':'saved'} successfully.`);await loadRecords();renderPage();
  }

  async function users(){
    if(!roleCanAdmin()){document.getElementById('content').innerHTML=`${pageHeader()}<section class="card panel"><div class="empty"><strong>Access restricted</strong>Only HSE administrators can manage users.</div></section>`;return;}
    const {data,error}=await sb.from('profiles').select('id,username,email,full_name,department,role,active,last_login_at,created_at').order('created_at',{ascending:false});
    if(error){toast(error.message,false);return;}
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-go="settings">Settings</button>`)}<section class="card"><div class="panel" style="border-bottom:1px solid var(--line)"><div class="section-title"><div><h2>Access directory</h2><p>${data.length} registered account${data.length===1?'':'s'} · Passwords are never readable.</p></div></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>User</th><th>Recovery email</th><th>Department</th><th>Role</th><th>Status</th><th>Last login</th><th>Created</th><th></th></tr></thead><tbody>${data.map(u=>`<tr><td><strong>${esc(u.full_name||u.username)}</strong><br><span class="muted small">@${esc(u.username)}</span></td><td>${esc(u.email||'No recovery email')}</td><td>${esc(u.department||'—')}</td><td><select class="user-role-select" data-user-role="${u.id}" ${u.id===state.profile.id?'disabled':''}>${['super_admin','hse_admin','hse_engineer','supervisor','employee','contractor','management','auditor'].map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${roleLabel(r)}</option>`).join('')}</select></td><td><label class="switch"><input type="checkbox" data-user-active="${u.id}" ${u.active?'checked':''} ${u.id===state.profile.id?'disabled':''}><span></span></label></td><td>${ago(u.last_login_at)}</td><td>${fmtDate(String(u.created_at||'').slice(0,10))}</td><td><div class="toolbar"><button class="btn" data-reset-user="${u.id}" data-reset-name="${esc(u.username)}">Reset password</button><button class="btn" data-save-user="${u.id}">Save access</button></div></td></tr>`).join('')}</tbody></table></div></section>`;
    wirePageEvents();
  }
  async function saveUserAccess(id){
    const role=document.querySelector(`[data-user-role="${id}"]`)?.value;
    const active=document.querySelector(`[data-user-active="${id}"]`)?.checked;
    if(!role)return;
    const {data,error}=await sb.rpc('admin_update_profile',{p_user_id:id,p_role:role,p_active:active});
    if(error){toast(error.message,false);return;}
    toast(`${data?.username||'User'} access updated.`);await users();
  }
  async function resetUser(id,name){const p=prompt(`Set a temporary password for ${name}. Minimum 10 characters:`);if(!p)return;if(p.length<10){toast('Temporary password must be at least 10 characters.',false);return}const {data,error}=await sb.functions.invoke('admin-reset',{body:{user_id:id,temp_password:p}});if(error||data?.error){toast(error?.message||data?.error||'Password reset failed. Deploy the admin-reset Edge Function first.',false);return}toast('Temporary password issued. User must change it at next login.');}
  async function auditlog(){
    if(!roleCanAdmin()){document.getElementById('content').innerHTML=`${pageHeader()}<section class="card panel"><div class="empty"><strong>Access restricted</strong>Only HSE administrators can view the audit trail.</div></section>`;return;}
    const {data,error}=await sb.from('audit_events').select('*').order('created_at',{ascending:false}).limit(300);if(error){toast(error.message,false);return}
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-export-audit="1">${icon('download',14)} Export audit</button>`)}<section class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Time</th><th>Action</th><th>Target</th><th>Actor</th><th>Details</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${new Date(x.created_at).toLocaleString()}</td><td><span class="badge in_progress">${esc(x.action)}</span></td><td>${esc(x.target_type||'—')}</td><td>${esc(x.actor_id||'System')}</td><td class="summary-cell">${esc(JSON.stringify(x.details||{}))}</td></tr>`).join('')}</tbody></table></div>${data?.length?'':'<div class="empty"><strong>No audit events</strong>Events will appear as users create HSE360 records.</div>'}</section>`;wirePageEvents();
  }
  function settingsPage(){document.getElementById('content').innerHTML=`${pageHeader()}<div class="grid-2"><section class="card panel"><div class="section-title"><div><h2>Application</h2><p>Local preferences for this browser.</p></div></div><div class="attention-list"><div class="attention-row"><span class="icon-square">${icon('moon',14)}</span><span style="flex:1"><b>Theme</b><span>Choose light or dark workspace.</span></span><button class="btn" data-theme-toggle>${state.theme==='dark'?'Light':'Dark'}</button></div><div class="attention-row"><span class="icon-square">${icon('history',14)}</span><span style="flex:1"><b>Cached drafts</b><span>Draft support can be expanded without affecting live records.</span></span><span class="badge in_progress">Ready</span></div></div></section><section class="card panel"><div class="section-title"><div><h2>Connection</h2><p>Frontend is connected to the configured Supabase project.</p></div></div><div class="detail-box"><label>Supabase project</label><div>${esc((C.SUPABASE_URL||'').replace('https://',''))}</div></div><div style="height:10px"></div><div class="detail-box"><label>Signed in as</label><div>${esc(state.profile?.username)} · ${esc(roleLabel(state.profile?.role))}</div></div><div style="height:10px"></div><div class="detail-box"><label>Records loaded</label><div>${fmtNum(state.records.length)}</div></div></section></div>`;wirePageEvents();}

  function detail(id){
    const r=state.records.find(x=>x.id===id);if(!r)return;const m=MODULES[r.module];const data=r.data||{};const entries=Object.entries(data).filter(([k])=>!['description','related_reference'].includes(k));
    const canEdit=r.created_by===state.session.user.id||roleCanAdmin();
    document.body.insertAdjacentHTML('beforeend',`<div class="drawer" id="drawer" role="dialog" aria-modal="true"><div class="drawer-head"><div><div class="eyebrow">${esc(m?.code||'HSE')}</div><h2 style="margin:3px 0;font-size:20px">${esc(r.reference_no)}</h2><div class="muted small">${esc(m?.singular||r.module)} · ${fmtDate(r.event_date)}</div></div><button class="icon-btn" data-close-drawer aria-label="Close">${icon('close',16)}</button></div><div class="drawer-body"><div class="toolbar" style="margin-bottom:16px">${statusBadge(r.status)}<span class="muted small">Created ${ago(r.created_at)}</span><span style="flex:1"></span>${canEdit?`<button class="btn" data-edit-record="${r.id}">${icon('settings',13)} Edit</button><button class="btn danger" data-delete-record="${r.id}">Delete</button>`:''}</div><div class="record-detail"><div class="detail-box"><label>Department</label><div>${esc(r.department||'—')}</div></div><div class="detail-box"><label>Location</label><div>${esc(r.location||'—')}</div></div><div class="detail-box"><label>Created by</label><div>${esc(r.created_by_name||'—')}</div></div><div class="detail-box"><label>Updated</label><div>${ago(r.updated_at)}</div></div></div><div style="height:12px"></div><div class="detail-box"><label>Summary</label><div style="line-height:1.6;white-space:pre-wrap">${esc(r.summary||data.description||'—')}</div></div>${entries.length?`<div style="height:12px"></div><div class="form-section"><h3>Record data</h3><div class="record-detail">${entries.map(([k,v])=>`<div class="detail-box"><label>${esc(k.replaceAll('_',' '))}</label><div>${esc(typeof v==='object'?JSON.stringify(v):v)}</div></div>`).join('')}</div></div>`:''}${r.attachment?`<div class="form-section"><h3>Attachment</h3><div class="attention-row"><span class="icon-square">${icon('file',14)}</span><span style="flex:1"><b>${esc(r.attachment.name||'Attachment')}</b><span>${fmtNum((r.attachment.size||0)/1024)} KB</span></span><button class="btn" data-download-attachment="${esc(r.attachment.path)}">Open</button></div></div>`:''}</div></div>`);wirePageEvents();
  }
  async function deleteRecord(id){
    const r=state.records.find(x=>x.id===id); if(!r)return;
    if(!confirm(`Delete ${r.reference_no}? This cannot be undone.`))return;
    const {error}=await sb.rpc('delete_hse_record',{p_id:id});
    if(error){toast(error.message,false);return;}
    if(r.attachment?.path)await sb.storage.from('hse-attachments').remove([r.attachment.path]);
    document.getElementById('drawer')?.remove();toast(`${r.reference_no} deleted.`);await loadRecords();renderPage();
  }

  function wirePageEvents(){
    document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>go(b.dataset.nav));
    document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>renderForm(b.dataset.new));
    document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
    document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(b.dataset.detail));
    document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.closeModal)?.remove());
    document.querySelectorAll('[data-close-drawer]').forEach(b=>b.onclick=()=>document.getElementById('drawer')?.remove());
    document.querySelectorAll('[data-save-form]').forEach(b=>b.onclick=()=>saveForm(b.dataset.saveForm,b.dataset.modal,b.dataset.recordId||''));
    document.querySelectorAll('[data-edit-record]').forEach(b=>b.onclick=()=>{document.getElementById('drawer')?.remove();const r=state.records.find(x=>x.id===b.dataset.editRecord);if(r)renderForm(r.module,r.id);});
    document.querySelectorAll('[data-delete-record]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.deleteRecord));
    document.querySelectorAll('[data-export-module]').forEach(b=>b.onclick=()=>exportCSV(b.dataset.exportModule));    document.querySelectorAll('[data-import-module]').forEach(b=>b.onclick=()=>document.getElementById(`csv-import-${b.dataset.importModule}`)?.click());
    document.querySelectorAll('input[id^="csv-import-"]').forEach(inp=>inp.onchange=e=>importCSV(inp.id.replace('csv-import-',''),e.target.files?.[0]));
    document.querySelectorAll('[data-backup]').forEach(b=>b.onclick=backup);
    document.querySelectorAll('[data-reset-user]').forEach(b=>b.onclick=()=>resetUser(b.dataset.resetUser,b.dataset.resetName));
    document.querySelectorAll('[data-save-user]').forEach(b=>b.onclick=()=>saveUserAccess(b.dataset.saveUser));
    document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.onclick=toggleTheme);
    document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{const i=document.getElementById(b.dataset.toggle);if(i)i.type=i.type==='password'?'text':'password'});
    document.querySelectorAll('[data-download-attachment]').forEach(b=>b.onclick=()=>downloadAttachment(b.dataset.downloadAttachment));
    document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>exportAll());
    document.querySelectorAll('[data-export-audit]').forEach(b=>b.onclick=()=>exportAudit());
    document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>b.dataset.auth==='login'?showLogin():b.dataset.auth==='register'?showRegister():showForgot());
  }
  function parseCSV(text){
    const rows=[]; let row=[], cell='', quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i], n=text[i+1];
      if(c==='"' && quoted && n==='"'){cell+='"';i++;continue}
      if(c==='"'){quoted=!quoted;continue}
      if(c===',' && !quoted){row.push(cell);cell='';continue}
      if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()!==''))rows.push(row);row=[];continue}
      cell+=c;
    }
    if(cell!==''||row.length){row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row)}
    return rows;
  }
  async function importCSV(module,file){
    if(!file)return;
    if(!['super_admin','hse_admin','hse_engineer'].includes(state.profile?.role)){toast('CSV import is restricted to HSE administrators and HSE engineers.',false);return;}
    const text=await file.text(), rows=parseCSV(text);
    if(rows.length<2){toast('CSV contains no data rows.',false);return;}
    const headers=rows[0].map(x=>x.trim().toLowerCase().replace(/[\s\/-]+/g,'_'));
    const dataRows=rows.slice(1);
    if(!confirm(`Import ${dataRows.length} ${MODULES[module]?.label||module} records? Existing records will not be overwritten.`))return;
    let ok=0,fail=0;
    for(const vals of dataRows){
      const raw={}; headers.forEach((h,i)=>raw[h]=String(vals[i]??'').trim());
      const eventDate=raw.event_date||raw.date||raw.inspection_date||raw.issue_date||raw.joining_date||today();
      const location=raw.location||raw.equipment_location||raw.area||'';
      const department=raw.department||raw.department_name||'';
      const status=raw.status||raw.renewal_status||raw.inspection_status||'open';
      const summary=raw.summary||raw.description||raw.document_name||raw.employee_name||raw.equipment_id||raw.ppe_item||raw.equipment_type||`${MODULES[module]?.singular||module} record`;
      const d={...raw};
      delete d.event_date; delete d.date; delete d.location; delete d.equipment_location; delete d.area; delete d.department; delete d.department_name; delete d.status; delete d.summary; delete d.description;
      const {error}=await sb.rpc('create_hse_record',{p_module:module,p_event_date:eventDate,p_location:location,p_department:department,p_status:status,p_summary:summary,p_data:d,p_attachment:null});
      if(error)fail++; else ok++;
    }
    await loadRecords(); renderPage(); toast(`CSV import complete: ${ok} imported${fail?`, ${fail} failed`:''}.`,fail===0);
  }

  function exportCSV(module){const rows=filteredRecords(module);const keys=['reference_no','event_date','status','department','location','summary','created_by_name','created_at'];const csv=[keys.join(','),...rows.map(r=>keys.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\n');download(csv,`${module}-register-${today()}.csv`,'text/csv;charset=utf-8');}
  function exportAll(){const keys=['module','reference_no','event_date','status','department','location','summary','created_by_name','created_at'];const csv=[keys.join(','),...state.records.map(r=>keys.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\n');download(csv,`nuhas-hse360-all-records-${today()}.csv`,'text/csv;charset=utf-8');}
  async function exportAudit(){const {data,error}=await sb.from('audit_events').select('*').order('created_at',{ascending:false}).limit(5000);if(error){toast(error.message,false);return}const keys=['created_at','action','target_type','target_id','actor_id','details'];const csv=[keys.join(','),...(data||[]).map(r=>keys.map(k=>`"${String(k==='details'?JSON.stringify(r[k]||{}):r[k]??'').replaceAll('\"','\"\"')}"`).join(','))].join('\n');download(csv,`nuhas-hse360-audit-${today()}.csv`,'text/csv;charset=utf-8');toast('Audit CSV generated.');}
  function backup(){download(JSON.stringify({application:'NUHAS HSE360',exported_at:new Date().toISOString(),records:state.records},null,2),'nuhas-hse360-backup.json','application/json');toast('JSON backup generated.');}
  function download(data,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
  async function downloadAttachment(path){const {data,error}=await sb.storage.from('hse-attachments').createSignedUrl(path,300);if(error){toast(error.message,false);return}window.open(data.signedUrl,'_blank','noopener');}
  function showNotifications(){
    document.getElementById('notification-panel')?.remove();
    const overdue=recs('actions').filter(r=>r.status!=='closed'&&r.data?.due_date&&r.data.due_date<today());
    const high=recs('risk').filter(r=>['High','Extreme'].includes(r.data?.level));
    const expiring=recs('permits').filter(r=>r.status!=='closed'&&r.data?.valid_until&&r.data.valid_until<today());
    const compliance=expiryItems();
    const items=[...overdue.map(r=>({type:'Overdue action',ref:r.reference_no,text:r.data?.responsible||'Responsible person not set',page:'actions'})),...high.map(r=>({type:`${r.data?.level||'High'} risk`,ref:r.reference_no,text:r.data?.hazard||r.summary,page:'risk'})),...expiring.map(r=>({type:'Expired permit',ref:r.reference_no,text:r.data?.permit_type||r.summary,page:'permits'})),...compliance.map(x=>({type:x.overdue?'Expired / overdue':'Renewal due within 2 months',ref:x.r.reference_no,text:x.r.data?.document_name||x.r.data?.certificate||x.r.data?.employee_name||x.r.summary,page:x.r.module==='licenses'?'licenses':x.r.module}))];
    document.body.insertAdjacentHTML('beforeend',`<div class="notification-popover" id="notification-panel"><div class="section-title"><div><h2>Notifications</h2><p>${items.length?`${items.length} item${items.length===1?'':'s'} need attention`:'No urgent items'}</p></div><button class="icon-btn" data-close-notifications>${icon('close',14)}</button></div>${items.length?items.slice(0,10).map(x=>`<button class="attention-row" data-notification-page="${x.page}" style="width:100%;text-align:left;background:transparent;border:0"><span class="attention-dot dot-red"></span><span style="flex:1"><b>${esc(x.type)} · ${esc(x.ref)}</b><span>${esc(x.text)}</span></span>${icon('chevron',14)}</button>`).join(''):'<div class="empty" style="padding:25px 5px"><strong>All clear</strong>No overdue actions, high/extreme risks, expired permits or upcoming renewal alerts detected.</div>'}</div>`);
    document.querySelector('[data-close-notifications]')?.addEventListener('click',()=>document.getElementById('notification-panel')?.remove());
    document.querySelectorAll('[data-notification-page]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('notification-panel')?.remove();go(b.dataset.notificationPage);}));
  }
  function toggleTheme(){state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem('nuhas_theme',state.theme);applyTheme();if(document.getElementById('theme-btn'))document.getElementById('theme-btn').innerHTML=icon(state.theme==='dark'?'sun':'moon',16);}
  function applyTheme(){document.documentElement.dataset.theme=state.theme;}

  window.go=go;window.refresh=refresh;window.signout=signout;window.register=register;window.doLogin=doLogin;window.showLogin=showLogin;window.showRegister=showRegister;window.showForgot=showForgot;window.forgot=forgot;window.renderForm=renderForm;window.saveForm=saveForm;window.backup=backup;window.exportCSV=exportCSV;
  init();
})();
