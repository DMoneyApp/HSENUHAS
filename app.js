/* HSE360 V8 — multi-organization HSE / IMS command platform
   Frontend: GitHub Pages. Auth/data/storage: Supabase. No service-role secrets here. */
(() => {
  'use strict';

  const C = window.NUHAS_CONFIG || {};
  const sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
        auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
      }) : null;

  const MODULES = {
    observations:{label:'Observations',singular:'Observation',code:'OB',icon:'eye',desc:'Unsafe conditions, unsafe acts, positive observations and improvement findings.'},
    incidents:{label:'Incidents',singular:'Incident',code:'INC',icon:'alert',desc:'Incident reporting, classification, immediate response and investigation.'},
    near_miss:{label:'Near Miss',singular:'Near Miss',code:'NM',icon:'shield',desc:'Near-miss and high-potential near-miss reporting.'},
    first_aid:{label:'First Aid',singular:'First Aid Case',code:'FA',icon:'plus',desc:'First-aid cases, treatment and follow-up.'},
    accidents:{label:'Accidents / LTI',singular:'Accident / LTI',code:'ACC',icon:'medical',desc:'Accidents, injury classification, LTI and days lost.'},
    inspections:{label:'Inspections',singular:'Inspection',code:'INS',icon:'clipboard',desc:'Routine, statutory, workplace, housekeeping and life-safety inspections.'},
    actions:{label:'Corrective Actions',singular:'Corrective Action',code:'CAR',icon:'check',desc:'Corrective and preventive actions, owners, deadlines and closure.'},
    training:{label:'Training',singular:'Training Record',code:'TR',icon:'book',desc:'Training sessions, attendance and participant-hours.'},
    tbt:{label:'Toolbox Talks',singular:'Toolbox Talk',code:'TBT',icon:'users',desc:'Toolbox talks and participation records.'},
    drills:{label:'Mock Drills',singular:'Mock Drill',code:'DRL',icon:'flame',desc:'Emergency drills, response times, observations and corrective actions.'},
    manhours:{label:'Manhours',singular:'Manhours Record',code:'MH',icon:'clock',desc:'Workforce and contractor exposure/manhours.'},
    permits:{label:'Work Permits',singular:'Work Permit',code:'PTW',icon:'file',desc:'Three permit classes: General, Hot Work and Critical Work.'},
    risk:{label:'Risk Assessments',singular:'Risk Assessment',code:'RA',icon:'risk',desc:'Hazard identification, risk scoring and controls.'},
    chemicals:{label:'Chemicals',singular:'Chemical Record',code:'CHM',icon:'flask',desc:'Chemical inventory, storage, SDS, compatibility and controls.'},
    waste:{label:'Waste',singular:'Waste Record',code:'WST',icon:'trash',desc:'Waste streams, quantities, vendors and disposal traceability.'},
    energy:{label:'Energy',singular:'Energy Record',code:'ENR',icon:'bolt',desc:'Energy use, source, meter and performance tracking.'},
    audit:{label:'Audits',singular:'Audit',code:'AUD',icon:'search',desc:'Internal, external, certification, ADOSH and customer audits.'},
    ncr:{label:'NCR / CAPA',singular:'NCR / CAPA',code:'NCR',icon:'flag',desc:'Nonconformities, root cause, actions and closure.'},
    documents:{label:'Document Control',singular:'Controlled Document',code:'DOC',icon:'folder',desc:'Controlled documents, revisions, owners and approval status.'},
    legal:{label:'Legal Compliance',singular:'Legal Compliance Record',code:'LEG',icon:'scale',desc:'Legal requirements, applicability, evidence and review status.'},
    objectives:{label:'IMS Objectives',singular:'IMS Objective',code:'OBJ',icon:'target',desc:'Integrated management objectives, targets, measures and performance.'},
    employees:{label:'Employees',singular:'Employee',code:'EMP',icon:'users',desc:'Employee master register and workforce information.'},
    ppe:{label:'PPE Issue Register',singular:'PPE Issue',code:'PPE',icon:'shield',desc:'Employee-linked PPE issues, quantities, dates and remarks.'},
    competencies:{label:'Competency & Authorisations',singular:'Competency Record',code:'CMP',icon:'book',desc:'First aiders, fire fighters, operator authorisations and competency validity.'},
    licenses:{label:'Licences & Certificates',singular:'Licence / Certificate',code:'LIC',icon:'scale',desc:'Company licences, certificates and contracts with renewal control.'},
    fire_equipment:{label:'Fire Equipment Register',singular:'Fire Equipment',code:'FIR',icon:'flame',desc:'Extinguishers, hose reels, hydrants and fire-system inspection records.'},
    third_party:{label:'3rd Party Inspections',singular:'3rd Party Inspection',code:'TPV',icon:'clipboard',desc:'Forklifts, EOT cranes, scissor lifts and other externally inspected equipment.'}
  };

  const GROUPS = [
    ['COMMAND CENTER',[['dashboard','Dashboard','grid'],['management','Management Overview','chart']]],
    ['HSE',[['observations','Observations','eye'],['incidents','Incidents','alert'],['near_miss','Near Miss','shield'],['first_aid','First Aid','plus'],['accidents','Accidents / LTI','medical'],['inspections','Inspections','clipboard'],['actions','Corrective Actions','check']]],
    ['TRAINING & EMERGENCY',[['training','Training','book'],['tbt','Toolbox Talks','users'],['drills','Mock Drills','flame']]],
    ['WORK CONTROL & RISK',[['manhours','Manhours','clock'],['permits','Work Permits','file'],['risk','Risk Assessments','risk']]],
    ['ENVIRONMENT & ENERGY',[['chemicals','Chemicals','flask'],['waste','Waste','trash'],['energy','Energy','bolt']]],
    ['WORKFORCE & COMPLIANCE',[['employees','Employees','users'],['ppe','PPE Issue Register','shield'],['competencies','Competency & Authorisations','book'],['licenses','Licences & Certificates','scale'],['fire_equipment','Fire Equipment Register','flame'],['third_party','3rd Party Inspections','clipboard']]],
    ['IMS & COMPLIANCE',[['audit','Audits','search'],['ncr','NCR / CAPA','flag'],['documents','Document Control','folder'],['legal','Legal Compliance','scale'],['objectives','IMS Objectives','target']]],
    ['ADMINISTRATION',[['users','Users & Roles','users'],['auditlog','Audit Trail','history'],['settings','Organization Settings','settings']]]
  ];

  const PERMIT_TYPES = [
    {value:'general_work',label:'General Work Permit'},
    {value:'hot_work',label:'Hot Work Permit'},
    {value:'critical_work',label:'Critical Work Permit'}
  ];
  const CRITICAL_TYPES = [
    ['confined_space','Confined Space'],['work_at_height','Work at Height'],['electrical','Electrical Work'],['lifting','Lifting Operation'],['excavation','Excavation'],['line_breaking','Line Breaking'],['chemical_work','Chemical Work'],['energy_isolation','Energy Isolation / LOTO'],['other','Other Critical Work']
  ];

  const state = {
    session:null, profile:null, orgs:[], activeOrg:null, membership:null,
    records:[], page:'dashboard', query:'', status:'all', department:'all', dateFrom:'', dateTo:'',
    loading:false, mobileNav:false, theme:localStorage.getItem('hse360_theme')||'light', realtime:null
  };

  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const nowLocalInput = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); };
  const initials = p => (String(p?.full_name||p?.username||'U').split(/\s+/).slice(0,2).map(x=>x[0]).join('')||'U').toUpperCase();
  const fmtNum = n => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const fmtDate = d => d ? new Date(`${String(d).slice(0,10)}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const fmtDateTime = d => d ? new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  const roleLabel = r => String(r||'guest').replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
  const ago = iso => { if(!iso) return '—'; const s=Math.max(0,(Date.now()-new Date(iso).getTime())/1000); if(s<60)return 'just now'; if(s<3600)return `${Math.floor(s/60)}m ago`; if(s<86400)return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; };
  const activeOrgId = () => state.activeOrg?.id || '';
  const orgLogo = org => org?.logo_url || (org?.slug==='nuhas' ? 'assets/nuhas-logo.jpg' : '');
  const roleCanAdmin = () => ['super_admin','hse_admin'].includes(state.membership?.role) && state.membership?.status==='active';
  const isPendingOnly = () => state.orgs.length>0 && !state.orgs.some(o=>o.status==='active');

  const icon = (name, size=17) => {
    const p=`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
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
      menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>',
      bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
      sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
      moon:'<path d="M20 15.3A8.5 8.5 0 0 1 8.7 4a8.5 8.5 0 1 0 11.3 11.3Z"/>',
      download:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
      upload:'<path d="M12 21V9M7 12l5-5 5 5M4 3h16v4H4z"/>',
      plus2:'<path d="M12 5v14M5 12h14"/>',
      chevron:'<path d="m9 18 6-6-6-6"/>',
      external:'<path d="M14 3h7v7M21 3l-9 9"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
    };
    return `<svg ${p}>${paths[name]||paths.grid}</svg>`;
  };

  function toast(msg,good=true){let el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';document.body.appendChild(el)}el.className=`toast ${good?'good':'bad'}`;el.textContent=msg;clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.remove(),4200)}
  function noticeHtml(msg,type='error'){return `<div class="notice ${type}">${esc(msg)}</div>`}
  function recs(module){return state.records.filter(r=>r.module===module)}
  function allDepartments(){return [...new Set(state.records.map(r=>r.department).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
  function filteredRecords(module=null){
    let a=module?recs(module):state.records.slice(); const q=state.query.trim().toLowerCase();
    if(q)a=a.filter(r=>[r.reference_no,r.summary,r.location,r.department,r.created_by_name,r.status,JSON.stringify(r.data||{})].join(' ').toLowerCase().includes(q));
    if(state.status!=='all')a=a.filter(r=>r.status===state.status);
    if(state.department!=='all')a=a.filter(r=>r.department===state.department);
    if(state.dateFrom)a=a.filter(r=>(r.event_date||'')>=state.dateFrom);
    if(state.dateTo)a=a.filter(r=>(r.event_date||'')<=state.dateTo);
    return a;
  }
  function can(module,action='view',record=null){
    if(!state.membership || state.membership.status!=='active')return false;
    if(['super_admin','hse_admin'].includes(state.membership.role))return true;
    const p=state.membership.permissions?.[module]||{};
    if(action==='edit' || action==='delete') return record?.created_by===state.session?.user?.id ? (!!p[`${action}_own`] || !!p[`${action}_all`]) : !!p[`${action}_all`];
    return !!p[action];
  }
  function statusBadge(s){const k=s||'open';return `<span class="badge ${esc(k)}">${esc(String(k).replaceAll('_',' '))}</span>`}

  async function init(){
    applyTheme();
    if(!sb){renderAuth('Connection settings are missing. Add the Supabase URL and publishable key to config.js.');return;}
    sb.auth.onAuthStateChange(async(_event,s)=>{state.session=s;if(s){await enterApp()}else{state.profile=null;state.activeOrg=null;state.membership=null;state.records=[];renderAuth();}});
    const {data,error}=await sb.auth.getSession();
    if(error){renderAuth(error.message);return;}
    state.session=data.session;
    if(state.session)await enterApp();else renderAuth();
  }

  async function enterApp(){
    await loadProfile();
    if(!state.profile){await sb.auth.signOut();return;}
    if(state.profile.must_change_password){renderPasswordChange();return;}
    await loadOrganizations();
    const active=state.orgs.filter(o=>o.status==='active');
    if(!active.length){renderAccessState();return;}
    const saved=localStorage.getItem('hse360_org_id'); const pick=active.find(o=>o.id===saved)||active[0];
    await switchOrganization(pick.id,false);
  }

  async function loadProfile(){const {data,error}=await sb.from('profiles').select('id,username,email,full_name,department,role,active,must_change_password,last_login_at,created_at').eq('id',state.session.user.id).single();if(error){console.error(error);state.profile=null;toast(error.message,false);return}state.profile=data;}
  async function loadOrganizations(){const {data,error}=await sb.rpc('my_organizations');if(error){toast(error.message,false);state.orgs=[];return}state.orgs=data||[];}

  async function switchOrganization(orgId,rerender=true){
    const item=state.orgs.find(o=>o.id===orgId && o.status==='active'); if(!item)return;
    if(state.realtime){await sb.removeChannel(state.realtime);state.realtime=null;}
    state.activeOrg={id:item.id,name:item.name,legal_name:item.legal_name||'',slug:item.slug,logo_url:item.logo_url||'',address:item.address||'',industry:item.industry,country:item.country,join_code:item.join_code};
    state.membership=item; localStorage.setItem('hse360_org_id',item.id); state.page='dashboard';state.query='';state.status='all';state.department='all';state.dateFrom='';state.dateTo='';
    await loadRecords();subscribeRealtime();
    if(rerender)renderApp();else renderApp();
  }

  async function loadRecords(){
    state.loading=true;
    if(document.getElementById('content'))document.getElementById('content').innerHTML='<div class="card card-pad loading"><div class="spinner"></div><p>Loading company workspace…</p></div>';
    const {data,error}=await sb.from('hse_records').select('*').eq('organization_id',activeOrgId()).order('created_at',{ascending:false}).limit(5000);
    state.loading=false;
    if(error){state.records=[];toast(error.message,false);}else state.records=data||[];
  }

  function subscribeRealtime(){
    if(!activeOrgId())return;
    state.realtime=sb.channel(`hse360-org-${activeOrgId()}`).on('postgres_changes',{event:'*',schema:'public',table:'hse_records',filter:`organization_id=eq.${activeOrgId()}`},payload=>{
      if(payload.eventType==='INSERT')state.records.unshift(payload.new);
      if(payload.eventType==='UPDATE'){const i=state.records.findIndex(x=>x.id===payload.new.id);if(i>=0)state.records[i]=payload.new;}
      if(payload.eventType==='DELETE')state.records=state.records.filter(x=>x.id!==payload.old.id);
      renderPage();
    }).subscribe();
  }

  async function refresh(){await loadOrganizations();const a=state.orgs.find(o=>o.id===activeOrgId());if(a)state.membership=a;await loadRecords();renderPage();toast('Workspace refreshed.');}
  async function signout(){if(state.realtime)await sb.removeChannel(state.realtime);state.realtime=null;await sb.auth.signOut();}

  function brandBlock(org=null){const logo=orgLogo(org);return logo?`<img class="brand-logo" src="${esc(logo)}" alt="Company logo">`:`<div class="brand-mark">${esc((org?.name||'HSE360').slice(0,1).toUpperCase())}</div>`}

  function renderAuth(message=''){document.body.innerHTML=`<div class="auth-shell"><section class="auth-visual"><div class="auth-brand"><div class="platform-mark">360</div><div><div class="brand-name">HSE360 Platform</div><div class="brand-sub">Multi-organization HSE & IMS management</div></div></div><div class="auth-hero"><div class="eyebrow">Secure HSE operations</div><h1>Safety. <span>Control.</span><br>Performance.</h1><p>One secure platform for HSE, risk, permits, training, emergency response, environment, energy, quality and integrated management systems.</p><div class="auth-pills"><span class="auth-pill">ISO 45001</span><span class="auth-pill">ISO 14001</span><span class="auth-pill">ISO 9001</span><span class="auth-pill">ISO 50001</span><span class="auth-pill">ADOSH</span></div></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Secure access</div><div id="auth-body"></div></div></section></div>`;showLogin(message)}

  function showLogin(message=''){const b=document.getElementById('auth-body');if(!b)return;b.innerHTML=`<h2>Welcome back</h2><p class="lead">Sign in with your HSE360 username and password.</p>${message?noticeHtml(message,'error'):'<div id="auth-msg"></div>'}<form id="login-form" class="auth-form"><div class="field"><label>Username</label><input id="lu" autocomplete="username" placeholder="e.g. DANISH" autofocus></div><div class="field"><label>Password</label><div class="password-wrap"><input id="lp" type="password" autocomplete="current-password" placeholder="Enter your password"><button class="password-toggle" type="button" data-toggle="lp">${icon('eye',16)}</button></div></div><button class="btn primary block" type="submit">Sign in</button></form><div class="auth-switch"><button class="link-btn" data-auth="register">Create account</button><button class="link-btn" data-auth="forgot">Forgot password?</button></div><div class="auth-foot">Passwords are managed by Supabase Auth and are never visible to administrators.</div>`;document.getElementById('login-form').addEventListener('submit',e=>{e.preventDefault();doLogin()});wireAuthToggles();wireAuthLinks()}

  function showRegister(){
    const b=document.getElementById('auth-body');if(!b)return;
    b.innerHTML=`<h2>Create account</h2><p class="lead">A new account starts with <strong>no company access</strong>. Choose a company later by joining with an access code or create a new company.</p><div id="auth-msg"></div><form id="register-form" class="auth-form"><div class="form-grid"><div class="field"><label>Username *</label><input id="ru" autocomplete="username" placeholder="3–40 characters"></div><div class="field"><label>Recovery email <span class="muted">(optional)</span></label><input id="re" type="email" autocomplete="email" placeholder="Used only for self-service recovery"></div><div class="field"><label>Full name</label><input id="rn" placeholder="Full name"></div><div class="field"><label>Department</label><input id="rd" placeholder="HSE / Production / Maintenance…"></div><div class="field"><label>Password *</label><div class="password-wrap"><input id="rp" type="password" autocomplete="new-password" placeholder="Minimum 10 characters"><button class="password-toggle" type="button" data-toggle="rp">${icon('eye',16)}</button></div></div><div class="field"><label>Confirm password *</label><input id="rc" type="password" autocomplete="new-password"></div></div><div class="notice">No recovery email means password recovery must be handled by an authorized organization administrator.</div><button class="btn primary block" type="submit">Create secure account</button></form><div class="auth-switch"><button class="link-btn" data-auth="login">Back to sign in</button><span></span></div>`;
    document.getElementById('register-form').addEventListener('submit',e=>{e.preventDefault();register()});wireAuthToggles();wireAuthLinks();
  }

  function showForgot(){const b=document.getElementById('auth-body');if(!b)return;b.innerHTML=`<h2>Recover access</h2><p class="lead">Enter the recovery email attached to your HSE360 account.</p><div id="auth-msg"></div><form id="forgot-form" class="auth-form"><div class="field"><label>Recovery email</label><input id="fe" type="email" autocomplete="email" placeholder="name@company.com"></div><button class="btn primary block" type="submit">Send recovery link</button></form><div class="notice">Accounts without a recovery email cannot use this route. An authorized organization administrator can issue a temporary password without seeing your current password.</div><div class="auth-switch"><button class="link-btn" data-auth="login">Back to sign in</button><span></span></div>`;document.getElementById('forgot-form').addEventListener('submit',e=>{e.preventDefault();forgot()});wireAuthLinks()}
  function wireAuthToggles(){document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{const i=document.getElementById(b.dataset.toggle);if(i)i.type=i.type==='password'?'text':'password'}))}
  function wireAuthLinks(){document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>b.dataset.auth==='login'?showLogin():b.dataset.auth==='register'?showRegister():showForgot())}

  async function doLogin(){
    const u=document.getElementById('lu')?.value.trim(),p=document.getElementById('lp')?.value;
    if(!u||!p){document.getElementById('auth-msg').outerHTML=noticeHtml('Enter your username and password.','error');return;}
    const btn=document.querySelector('#login-form button[type=submit]');btn.disabled=true;btn.textContent='Signing in…';
    const {data,error}=await sb.rpc('login_with_username',{p_username:u,p_password:p});
    if(error||!data){btn.disabled=false;btn.textContent='Sign in';document.getElementById('auth-msg').outerHTML=noticeHtml('Invalid username or password.','error');return;}
    const r=await sb.auth.signInWithPassword({email:data.email,password:p});
    if(r.error){btn.disabled=false;btn.textContent='Sign in';document.getElementById('auth-msg').outerHTML=noticeHtml(r.error.message||'Unable to sign in.','error');return;}
    if(r.data.user)await sb.rpc('touch_last_login');
  }

  async function register(){
    const u=document.getElementById('ru')?.value.trim(),email=document.getElementById('re')?.value.trim().toLowerCase(),n=document.getElementById('rn')?.value.trim(),d=document.getElementById('rd')?.value.trim(),p=document.getElementById('rp')?.value,c=document.getElementById('rc')?.value;
    if(!u||!p||!c){document.getElementById('auth-msg').outerHTML=noticeHtml('Username, password and confirmation are required.','error');return}
    if(!/^[A-Za-z0-9._-]{3,40}$/.test(u)){document.getElementById('auth-msg').outerHTML=noticeHtml('Username must be 3–40 letters, numbers, dot, underscore or hyphen.','error');return}
    if(p.length<10){document.getElementById('auth-msg').outerHTML=noticeHtml('Password must contain at least 10 characters.','error');return}
    if(p!==c){document.getElementById('auth-msg').outerHTML=noticeHtml('Passwords do not match.','error');return}
    if(email&&!/^\S+@\S+\.\S+$/.test(email)){document.getElementById('auth-msg').outerHTML=noticeHtml('Enter a valid recovery email.','error');return}
    const authEmail=email||`${u.toLowerCase()}@hse360.local`;
    const btn=document.querySelector('#register-form button[type=submit]');btn.disabled=true;btn.textContent='Creating account…';
    const {data,error}=await sb.auth.signUp({email:authEmail,password:p,options:{data:{username:u,recovery_email:email||null,full_name:n||null,department:d||null}}});
    if(error){btn.disabled=false;btn.textContent='Create secure account';document.getElementById('auth-msg').outerHTML=noticeHtml(error.message||'Registration failed.','error');return}
    if(data?.session){toast('Account created. Complete company onboarding.');await enterApp();}
    else {document.getElementById('auth-msg').outerHTML=noticeHtml('Account created. Complete email confirmation if your Supabase project requires it, then sign in.','success');btn.disabled=false;btn.textContent='Create secure account';}
  }

  async function forgot(){const e=document.getElementById('fe')?.value.trim();if(!e){document.getElementById('auth-msg').outerHTML=noticeHtml('Enter your recovery email.','error');return}const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin+location.pathname});document.getElementById('auth-msg').outerHTML=noticeHtml(error?error.message:'If the account has a recovery email, a recovery message has been requested.',error?'error':'success')}

  function renderPasswordChange(){document.body.innerHTML=`<div class="auth-shell"><section class="auth-visual"><div class="auth-brand"><div class="platform-mark">360</div><div><div class="brand-name">HSE360 Platform</div><div class="brand-sub">Secure account control</div></div></div><div class="auth-hero"><div class="eyebrow">Administrator-issued temporary password</div><h1>Protect your<br><span>account.</span></h1><p>Your administrator cannot see the new password you choose.</p></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Required action</div><h2>Change password</h2><p class="lead">Use at least 10 characters.</p><div id="pw-msg"></div><form id="pw-form" class="auth-form"><div class="field"><label>New password</label><input id="np" type="password" autocomplete="new-password"></div><div class="field"><label>Confirm password</label><input id="nc" type="password" autocomplete="new-password"></div><button class="btn primary block" type="submit">Set private password</button></form></div></section></div>`;document.getElementById('pw-form').addEventListener('submit',async e=>{e.preventDefault();const p=document.getElementById('np').value,c=document.getElementById('nc').value;if(p.length<10||p!==c){document.getElementById('pw-msg').innerHTML=noticeHtml('Use at least 10 characters and make both passwords match.','error');return}const {error}=await sb.auth.updateUser({password:p});if(error){document.getElementById('pw-msg').innerHTML=noticeHtml(error.message,'error');return}await sb.rpc('complete_password_change');await enterApp()})}

  function renderAccessState(){
    if(isPendingOnly()){
      document.body.innerHTML=`<div class="access-state"><div class="access-card"><div class="platform-mark large">360</div><div class="eyebrow">HSE360 account</div><h1>Access is pending.</h1><p>Your account has no active company workspace yet. An organization administrator must approve your membership and assign your role/permissions.</p><div class="notice">No company records are displayed while access is pending.</div><div class="access-actions"><button class="btn" id="join-another">Request access to another company</button><button class="btn primary" id="create-company">Create a new company workspace</button><button class="link-btn" id="pending-signout">Sign out</button></div><div class="auth-foot">HSE360 Platform · Developed by Danish Shaikh · @odanisho</div></div></div>`;
    } else {
      document.body.innerHTML=`<div class="access-state"><div class="access-card"><div class="platform-mark large">360</div><div class="eyebrow">HSE360 onboarding</div><h1>Choose your workspace.</h1><p>Your account is not connected to a company yet. Join an existing company using its access code, or create a new company and become its Super Admin.</p><div class="access-actions"><button class="btn primary" id="join-company">Join existing company</button><button class="btn" id="create-company">Create new company</button><button class="link-btn" id="onboard-signout">Sign out</button></div><div class="auth-foot">No company data is available until a workspace is active.</div></div></div>`;
    }
    document.getElementById('join-company')?.addEventListener('click',()=>onboardingModal('join'));
    document.getElementById('join-another')?.addEventListener('click',()=>onboardingModal('join'));
    document.getElementById('create-company')?.addEventListener('click',()=>onboardingModal('create'));
    document.getElementById('pending-signout')?.addEventListener('click',signout);
    document.getElementById('onboard-signout')?.addEventListener('click',signout);
  }

  function onboardingModal(mode='join'){
    const id=`onboard-${Date.now()}`;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="${id}"><div class="modal small-modal"><div class="modal-head"><div><div class="eyebrow">Company onboarding</div><h2>${mode==='join'?'Join an existing company':'Create a new company'}</h2></div><button class="icon-btn" data-close-modal="${id}">${icon('close',16)}</button></div><div class="modal-body">${mode==='join'?`<div id="onboard-msg"></div><div class="field"><label>Company access code *</label><input id="join-code" placeholder="e.g. NUHAS-AB12CD34"></div><div class="field"><label>Department <span class="muted">(optional)</span></label><input id="join-dept" placeholder="HSE / Production / Maintenance"></div><p class="muted small">The company administrator controls approval, role and module permissions. No company data is shown until your membership is active.</p>`:`<div id="onboard-msg"></div><div class="form-grid"><div class="field"><label>Company name *</label><input id="org-name" placeholder="Company legal / operating name"></div><div class="field"><label>Legal name</label><input id="org-legal"></div><div class="field"><label>Industry</label><input id="org-industry" placeholder="Manufacturing / Construction / Logistics…"></div><div class="field"><label>Country</label><input id="org-country" value="United Arab Emirates"></div><div class="field full"><label>Address</label><textarea id="org-address" placeholder="Company address"></textarea></div></div><p class="muted small">The new company starts empty and isolated from every other company in HSE360. You become its Super Admin.</p>`}</div><div class="modal-foot"><button class="btn" data-close-modal="${id}">Cancel</button><button class="btn primary" id="onboard-submit">${mode==='join'?'Request access':'Create company'}</button></div></div></div>`);wirePageEvents();document.getElementById('onboard-submit').addEventListener('click',()=>mode==='join'?joinCompany(id):createCompany(id))}

  async function joinCompany(modalId){const code=document.getElementById('join-code')?.value.trim(),dept=document.getElementById('join-dept')?.value.trim();if(!code){toast('Company access code is required.',false);return}const {data,error}=await sb.rpc('join_organization',{p_join_code:code,p_department:dept||null});if(error){toast(error.message,false);return}document.getElementById(modalId)?.remove();await loadOrganizations();renderAccessState();toast('Access request submitted. No company data is available until approval.')}
  async function createCompany(modalId){const n=document.getElementById('org-name')?.value.trim();if(!n){toast('Company name is required.',false);return}const {data,error}=await sb.rpc('create_organization',{p_name:n,p_legal_name:document.getElementById('org-legal')?.value.trim()||null,p_industry:document.getElementById('org-industry')?.value.trim()||null,p_country:document.getElementById('org-country')?.value.trim()||'United Arab Emirates',p_address:document.getElementById('org-address')?.value.trim()||null});if(error){toast(error.message,false);return}document.getElementById(modalId)?.remove();await loadOrganizations();const created=state.orgs.find(o=>o.id===data.id);if(created)await switchOrganization(created.id);else await enterApp();}

  function renderApp(){
    const org=state.activeOrg; const logo=orgLogo(org);
    document.body.innerHTML=`<div class="app-shell"><aside id="sidebar" class="sidebar"><div class="side-brand">${brandBlock(org)}<div><div class="brand-name">${esc(org?.name||'HSE360')}</div><div class="brand-sub">HSE & IMS Command Center</div></div></div><div class="nav-wrap">${navHTML()}</div><div class="side-footer"><span>HSE360 Platform</span><small>Developed by Danish Shaikh · @odanisho</small></div></aside><main class="main"><header class="topbar"><div class="top-left"><button class="icon-btn mobile-menu" id="mobile-menu">${icon('menu')}</button><div class="top-search">${icon('search',15)}<input id="global-search" placeholder="Search references, actions, observations…" value="${esc(state.query)}"></div></div><div class="top-right"><div class="org-switcher"><label>Workspace</label><select id="org-select">${state.orgs.filter(o=>o.status==='active').map(o=>`<option value="${esc(o.id)}" ${o.id===activeOrgId()?'selected':''}>${esc(o.name)}</option>`).join('')}</select></div><button class="icon-btn" id="theme-btn" title="Theme">${icon(state.theme==='dark'?'sun':'moon',16)}</button><button class="icon-btn" id="refresh-btn" title="Refresh">${icon('history',16)}</button><button class="icon-btn" id="notification-btn" title="Notifications">${icon('bell',16)}<span id="notification-count" class="notif-count"></span></button><div class="user-chip"><div><div class="user-name">${esc(state.profile?.full_name||state.profile?.username)}</div><div class="user-role">${esc(roleLabel(state.membership?.role))}</div></div><div class="avatar">${esc(initials(state.profile))}</div></div><button class="btn signout" id="signout-btn">Sign out</button></div></header><div id="page" class="page"><div id="content"></div></div></main></div><div id="toast"></div>`;
    document.getElementById('mobile-menu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('refresh-btn').addEventListener('click',refresh);document.getElementById('theme-btn').addEventListener('click',toggleTheme);document.getElementById('notification-btn').addEventListener('click',showNotifications);document.getElementById('signout-btn').addEventListener('click',signout);
    document.getElementById('org-select').addEventListener('change',e=>switchOrganization(e.target.value));
    const gs=document.getElementById('global-search');gs.addEventListener('input',e=>{state.query=e.target.value;if(state.page!=='dashboard'&&state.page!=='management')renderPage()});gs.addEventListener('keydown',e=>{if(e.key==='Enter'&&gs.value.trim()){state.query=gs.value.trim();go('observations')}});
    applyTheme();renderPage();updateNotificationCount();
  }

  function navHTML(){return GROUPS.map(([g,items])=>`<div class="nav-section">${g}</div>${items.map(([key,label,ic])=>{if(key==='users'&&!roleCanAdmin())return '';return `<button class="nav-item ${state.page===key?'active':''}" data-nav="${key}"><span class="nav-icon">${icon(ic,16)}</span><span>${label}</span>${key==='actions'&&openActions()>0?`<span class="nav-badge">${openActions()}</span>`:''}</button>`}).join('')}`).join('')}
  function titleFor(){if(state.page==='dashboard')return ['HSE Command Center','Live operational view of safety, risk, permits, compliance and performance.'];if(state.page==='management')return ['Management Overview','Executive HSE performance, exposure, actions and compliance at a glance.'];if(state.page==='users')return ['Users & Roles','Approve company members and control role/module permissions.'];if(state.page==='auditlog')return ['Audit Trail','Auditable activity and traceability for this company workspace.'];if(state.page==='settings')return ['Organization Settings','Company identity, branding, numbering and HSE360 workspace controls.'];const m=MODULES[state.page];return m?[m.label,m.desc]:['HSE360','Integrated HSE & IMS Management System'];}
  function pageHeader(actions=''){const [t,d]=titleFor();const logo=orgLogo(state.activeOrg);return `<div class="page-head"><div><div class="eyebrow">${esc(state.activeOrg?.name||'HSE360 Workspace')}</div><h1>${t}</h1><p>${d}</p></div><div class="head-actions">${actions}</div></div>`}
  function kpi(label,value,sub,ic,trend=''){return `<div class="card kpi"><div class="kpi-top"><div class="kpi-label">${label}</div><div class="kpi-icon">${icon(ic,15)}</div></div><div class="kpi-value">${esc(value)}</div><div class="kpi-foot"><span>${sub}</span>${trend?`<span class="${trend[0]}">${trend[1]}</span>`:''}</div></div>`}
  function openActions(){return recs('actions').filter(r=>r.status!=='closed').length}

  function lastMonths(n){const out=[];const d=new Date();d.setDate(1);for(let i=n-1;i>=0;i--){const x=new Date(d);x.setMonth(d.getMonth()-i);out.push({key:`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`,m:x.toLocaleDateString('en-US',{month:'short'})})}return out}
  function addMonthsISO(base,months){const d=new Date(`${base}T00:00:00`);d.setMonth(d.getMonth()+months);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

  function expiryItems(){
    const todayKey=today(),limit=addMonthsISO(todayKey,2),mods=[['licenses','expiry_date'],['competencies','expiry_date'],['third_party','expiry_date']];const out=[];
    mods.forEach(([module,field])=>recs(module).forEach(r=>{const d=String(r.data?.[field]||'').slice(0,10);if(!d)return;const status=String(r.data?.renewal_status||r.data?.compliance_status||r.data?.inspection_status||'').trim().toLowerCase();const complete=['renewed','closed','valid','compliant','not in use'].includes(status);if(complete&&d>=todayKey)return;if(d<=limit)out.push({r,date:d,overdue:d<todayKey})}));
    return out.sort((a,b)=>a.date.localeCompare(b.date));
  }

  function permitAlerts(){
    const now=Date.now();return recs('permits').filter(r=>['approved','open','in_progress'].includes(String(r.status||'').toLowerCase())).map(r=>{const x=r.data?.valid_until?new Date(r.data.valid_until).getTime():NaN;if(!Number.isFinite(x))return null;return {...r,_time:x}}).filter(Boolean).filter(r=>r._time<=now+4*60*60*1000).sort((a,b)=>a._time-b._time);
  }

  function complianceAlertSummary(){const e=expiryItems();return {overdue:e.filter(x=>x.overdue).length,due:e.filter(x=>!x.overdue).length}}
  function attentionRows(){
    const lti=recs('accidents').filter(r=>String(r.data?.lti||'').toLowerCase()==='yes').length;
    const high=recs('risk').filter(r=>['High','Extreme'].includes(r.data?.level)).length;
    const overdue=recs('actions').filter(r=>r.status!=='closed'&&r.data?.due_date&&r.data.due_date<today()).length;
    const exp=expiryItems().length;const permits=permitAlerts().length;
    return [['LTI / lost time',lti,'medical','dot-red'],['High / Extreme risk',high,'risk','dot-red'],['Overdue actions',overdue,'check','dot-amber'],['Compliance renewals',exp,'scale','dot-amber'],['Permit time alerts',permits,'file','dot-amber']];
  }

  function dashboard(){
    const total=state.records.length,lti=recs('accidents').filter(r=>String(r.data?.lti||'').toLowerCase()==='yes').length,near=recs('near_miss').length,open=openActions();
    const manhours=recs('manhours').reduce((a,r)=>a+Number(r.data?.hours||0),0),participantHours=[...recs('training'),...recs('tbt')].reduce((a,r)=>a+Number(r.data?.participant_hours||0),0),compliance=complianceAlertSummary();
    const months=lastMonths(6),series=months.map(m=>({m:m.m,count:state.records.filter(r=>String(r.event_date||'').slice(0,7)===m.key).length})),max=Math.max(1,...series.map(x=>x.count));
    const attention=attentionRows();
    const moduleVolume=Object.keys(MODULES).map(k=>({key:k,label:MODULES[k].label,count:recs(k).length,icon:MODULES[k].icon})).sort((a,b)=>b.count-a.count).slice(0,8);
    const permitCounts={draft:0,pending:0,approved:0,active:0,closed:0};recs('permits').forEach(r=>{const s=String(r.status||'').toLowerCase();if(s==='draft')permitCounts.draft++;else if(s==='pending_approval')permitCounts.pending++;else if(['approved','open','in_progress','suspended'].includes(s))permitCounts.active++;else if(s==='closed')permitCounts.closed++;});
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-go="management">Management view</button><button class="btn" data-export="all">${icon('download',14)} Export visible data</button><button class="btn primary" data-new="observations">${icon('plus2',14)} New Observation</button>`)}
      <div class="grid-4">${kpi('HSE records',total,'Current company workspace','clipboard')}${kpi('Open actions',open,'Not closed','check')}${kpi('LTI',lti,'Accident records marked LTI','medical')}${kpi('Manhours',fmtNum(manhours),'Recorded exposure hours','clock')}</div>
      <div style="height:15px"></div>
      <div class="grid-2"><section class="card panel"><div class="section-title"><div><h2>6-Month HSE Activity</h2><p>Records by event month</p></div></div><div class="chart">${series.map(b=>`<div class="bar" style="height:${Math.max(8,Math.round((b.count/max)*160))}px"><b>${b.count}</b><span>${esc(b.m)}</span></div>`).join('')}</div></section>
      <section class="card panel"><div class="section-title"><div><h2>Operational Attention</h2><p>Only actionable indicators are shown</p></div></div><div class="attention-list">${attention.map(x=>`<button class="attention-row attention-btn" data-go="${x[1]?'dashboard':'dashboard'}"><span class="attention-dot ${x[3]}"></span><span style="flex:1"><b>${esc(x[0])}</b><span>${fmtNum(x[1])} item${x[1]===1?'':'s'}</span></span><strong>${fmtNum(x[1])}</strong></button>`).join('')}</div></section></div>
      <div style="height:15px"></div>
      <div class="grid-3"><section class="card panel"><div class="section-title"><div><h2>Training exposure</h2><p>Training + toolbox talk participant-hours</p></div></div><div class="hero-stat">${fmtNum(participantHours)} <span>hours</span></div><div class="metric-note">${recs('training').length} training sessions · ${recs('tbt').length} TBT records</div></section><section class="card panel"><div class="section-title"><div><h2>Compliance renewals</h2><p>Licences, competency and 3rd-party validity only</p></div></div><div class="hero-stat">${fmtNum(compliance.overdue+compliance.due)} <span>attention</span></div><div class="metric-note"><span class="text-danger">${compliance.overdue} overdue</span> · <span class="text-warn">${compliance.due} due within 2 months</span></div></section><section class="card panel"><div class="section-title"><div><h2>Work permit status</h2><p>Time-controlled PTW lifecycle</p></div></div><div class="permit-mini"><span>Active ${permitCounts.active}</span><span>Pending ${permitCounts.pending}</span><span>Closed ${permitCounts.closed}</span></div><div class="metric-note">${permitAlerts().length} permit time alert${permitAlerts().length===1?'':'s'} within 4 hours</div></section></div>
      <div style="height:15px"></div>
      <div class="grid-2"><section class="card panel"><div class="section-title"><div><h2>Top active registers</h2><p>Current record distribution</p></div></div>${moduleVolume.map(x=>`<button class="attention-row" data-go="${x.key}" style="width:100%;text-align:left"><span class="icon-square">${icon(x.icon,14)}</span><span style="flex:1"><b>${esc(x.label)}</b><span>Open register</span></span><strong>${fmtNum(x.count)}</strong>${icon('chevron',14)}</button>`).join('')}</section><section class="card panel"><div class="section-title"><div><h2>Renewal & expiry watch</h2><p>PTW validity is deliberately excluded from the 2-month compliance engine.</p></div></div>${expiryItems().slice(0,6).map(x=>`<button class="attention-row" data-go="${x.r.module}" style="width:100%;text-align:left"><span class="attention-dot ${x.overdue?'dot-red':'dot-amber'}"></span><span style="flex:1"><b>${esc(x.r.reference_no)}</b><span>${esc(x.r.data?.document_name||x.r.data?.certificate||x.r.data?.employee_name||x.r.summary||'')}</span></span><strong>${fmtDate(x.date)}</strong></button>`).join('') || '<div class="empty"><strong>No upcoming compliance renewals</strong>Only compliance-validity modules are included in this watch.</div>'}</section></div>`;
    wirePageEvents();
  }

  function management(){
    const total=state.records.length,actionTotal=recs('actions').length,closed=recs('actions').filter(r=>r.status==='closed').length,closure=actionTotal?Math.round(closed/actionTotal*100):0,riskTotal=recs('risk').length,high=recs('risk').filter(r=>['High','Extreme'].includes(r.data?.level)).length;
    const months=lastMonths(12),series=months.map(m=>({m:m.m,count:state.records.filter(r=>String(r.event_date||'').slice(0,7)===m.key).length})),max=Math.max(1,...series.map(x=>x.count));
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-go="dashboard">Back to command center</button><button class="btn" data-export="all">${icon('download',14)} Export data</button>`)}<div class="grid-4">${kpi('Total records',total,'Current company workspace','clipboard')}${kpi('CAPA closure',`${closure}%`,'Closed / total actions','check')}${kpi('High / Extreme risk',high,`${riskTotal} risk records`,'risk')}${kpi('Audits',recs('audit').length,'Registered audit records','search')}</div><div style="height:15px"></div><div class="grid-2"><section class="card panel"><div class="section-title"><div><h2>12-Month activity trend</h2><p>Live HSE360 records</p></div></div><div class="chart tall-chart">${series.map(b=>`<div class="bar" style="height:${Math.max(8,Math.round((b.count/max)*160))}px"><b>${b.count}</b><span>${esc(b.m)}</span></div>`).join('')}</div></section><section class="card panel"><div class="section-title"><div><h2>IMS coverage</h2><p>Counts are factual record coverage, not fabricated compliance percentages.</p></div></div>${[['ISO 45001','risk'],['ISO 14001','waste'],['ISO 9001','ncr'],['ISO 50001','energy'],['ADOSH','permits']].map(x=>{const c= x[1]==='risk'?riskTotal:x[1]==='waste'?recs('waste').length:x[1]==='ncr'?recs('ncr').length:x[1]==='energy'?recs('energy').length:recs('permits').length;return `<div class="progress-row"><span class="progress-label">${x[0]}</span><div class="progress blue"><span style="width:${c?Math.min(100,c*10):0}%"></span></div><span class="progress-value">${fmtNum(c)}</span></div>`}).join('')}</section></div>`;wirePageEvents();
  }

  function modulePage(module){
    const m=MODULES[module];if(!m){document.getElementById('content').innerHTML='<div class="empty">Module unavailable.</div>';return}
    if(!can(module,'view')){document.getElementById('content').innerHTML=`${pageHeader()}<section class="card panel"><div class="empty"><strong>Access not granted</strong>Your administrator has not granted view permission for this module.</div></section>`;return}
    const rows=filteredRecords(module),total=recs(module).length,open=recs(module).filter(r=>!['closed','expired'].includes(r.status)).length,depts=allDepartments(),canCreate=can(module,'create');
    const actions=`${canCreate?`<button class="btn" data-import-module="${module}">${icon('upload',14)} Import CSV</button>`:''}<button class="btn" data-export-module="${module}">${icon('download',14)} Excel / CSV</button><button class="btn" data-backup="1">JSON Backup</button>${canCreate?`<button class="btn primary" data-new="${module}">${icon('plus2',14)} New ${m.singular}</button>`:''}`;
    const statusOpts=module==='permits'?['draft','pending_approval','approved','suspended','closed','expired']:['open','in_progress','closed'];
    document.getElementById('content').innerHTML=`${pageHeader(actions)}<input id="csv-import-${module}" type="file" accept=".csv,text/csv" hidden><section class="card"><div class="filterbar"><input class="filter-search" data-filter="query" placeholder="Search reference, summary, location, person…" value="${esc(state.query)}"><select data-filter="status"><option value="all">All statuses</option>${statusOpts.map(s=>`<option value="${s}">${roleLabel(s)}</option>`).join('')}</select><select data-filter="department"><option value="all">All departments</option>${depts.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('')}</select><input data-filter="from" type="date" value="${esc(state.dateFrom)}"><input data-filter="to" type="date" value="${esc(state.dateTo)}"></div><div class="panel" style="padding-bottom:10px"><div class="legend"><span><i style="background:#f59e0b"></i>${total} total records</span><span><i style="background:#2563eb"></i>${open} active</span><span><i style="background:#159a5b"></i>Tenant-isolated database</span></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Date</th><th>Status</th><th>Department</th><th>Location</th><th>Summary</th><th>Created by</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><button class="link-btn ref" data-detail="${r.id}">${esc(r.reference_no)}</button></td><td>${fmtDate(r.event_date)}</td><td>${statusBadge(r.status)}</td><td>${esc(r.department||'—')}</td><td>${esc(r.location||'—')}</td><td class="summary-cell" title="${esc(r.summary||'')}">${esc(r.summary||'—')}</td><td>${esc(r.created_by_name||'—')}<br><span class="muted small">${ago(r.created_at)}</span></td><td><button class="icon-btn" data-detail="${r.id}" title="Open">${icon('external',14)}</button></td></tr>`).join('')}</tbody></table></div>${rows.length?'':'<div class="empty"><strong>No records match this view</strong>Use the New button to create a record or clear the filters.</div>'}</section>`;
    const s=document.querySelector('[data-filter="status"]');if(s)s.value=state.status;const d=document.querySelector('[data-filter="department"]');if(d)d.value=state.department;wirePageEvents();
    document.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener(el.dataset.filter==='query'?'input':'change',e=>{if(e.target.dataset.filter==='query')state.query=e.target.value;else if(e.target.dataset.filter==='status')state.status=e.target.value;else if(e.target.dataset.filter==='department')state.department=e.target.value;else if(e.target.dataset.filter==='from')state.dateFrom=e.target.value;else if(e.target.dataset.filter==='to')state.dateTo=e.target.value;renderPage()}));
  }

  function commonFields(){return [['event_date','Date','date',today()],['location','Location','text',''],['department','Department','text',state.membership?.department||state.profile?.department||'']]}

  function formSchema(t){
    const extra={
      observations:[['observation_type','Observation type','select','Unsafe condition|Unsafe act|Positive observation|Environmental|Ergonomic|Other'],['risk_level','Initial risk','select','Low|Medium|High|Extreme'],['observed_by','Observed by','text',''],['immediate_action','Immediate action','textarea','']],
      incidents:[['incident_type','Incident type','select','Injury|Property damage|Environmental|Fire|Chemical|Vehicle|Security|Other'],['severity','Severity','select','Minor|Moderate|Major|Critical'],['reported_by','Reported by','text',''],['immediate_action','Immediate action','textarea','']],
      near_miss:[['potential_severity','Potential severity','select','Low|Medium|High|Critical'],['reported_by','Reported by','text',''],['immediate_action','Immediate action','textarea','']],
      first_aid:[['case_type','Case type','text',''],['injury_area','Injury / affected area','text',''],['treatment','Treatment','text',''],['treated_by','Treated by','text','']],
      accidents:[['lti','Lost-time injury (LTI)?','select','No|Yes'],['injury_type','Injury type','text',''],['days_lost','Days lost','number','0'],['medical_treatment','Medical treatment','select','First Aid|Medical Treatment|Hospitalisation'],['return_to_work','Return to work','date','']],
      inspections:[['inspection_type','Inspection type','select','Daily|Weekly|Monthly|Statutory|Housekeeping|Fire & Life Safety|Other'],['inspector','Inspector','text',''],['findings','Findings count','number','0'],['follow_up_required','Follow-up required','select','No|Yes']],
      actions:[['action_type','Action type','select','Corrective|Preventive|Improvement'],['responsible','Responsible person','text',''],['due_date','Due date','date',today()],['priority','Priority','select','Low|Medium|High|Critical'],['verification','Effectiveness verification','textarea','']],
      training:[['topic','Training topic','text',''],['trainer','Trainer','text',''],['participants','Participants','number','0'],['duration','Duration (hours)','number','0'],['training_type','Training type','select','Induction|Internal|External|Refresher|Emergency|Specialised|Other'],['competency_link','Competency / certificate reference','text','']],
      tbt:[['topic','TBT topic','text',''],['conductor','Conducted by','text',''],['participants','Participants','number','0'],['duration','Duration (hours)','number','0'],['attendance_reference','Attendance / register reference','text','']],
      drills:[['drill_type','Drill type','select','Fire|Chemical Spill|Medical Emergency|Evacuation|Confined Space|Rescue|Other'],['participants','Participants','number','0'],['response_time','Response time (minutes)','number','0'],['observation','Key observations','textarea',''],['follow_up','Follow-up actions','textarea','']],
      manhours:[['hours','Total manhours','number','0'],['employees','Employees covered','number','0'],['contractors','Contractors covered','number','0'],['month_reference','Month / period','month',`${today().slice(0,7)}`]],
      permits:[['permit_type','Permit class','permitType','general_work'],['requestor','Requestor','text',''],['valid_from','Valid from','datetime-local',nowLocalInput()],['valid_until','Valid until','datetime-local',`${today()}T23:59`],['performing_company','Performing company / contractor','text',''],['responsible_person','Responsible person','text',''],['workers_involved','Workers involved','textarea',''],['risk_reference','Risk assessment / JSA reference','text',''],['hazards','Main hazards','textarea',''],['controls','Required controls','textarea',''],['ppe','Required PPE','textarea',''],['isolation_required','Isolation required?','select','No|Yes'],['isolation_details','Isolation / LOTO details','textarea',''],['permit_issuer','Permit issuer','text',''],['permit_receiver','Permit receiver','text',''],['approval_notes','Approval / verification notes','textarea',''],['closure_remarks','Closure remarks','textarea','']],
      risk:[['hazard','Hazard','text',''],['activity','Activity / task','text',''],['likelihood','Likelihood (1–5)','number','1'],['severity','Severity (1–5)','number','1'],['existing_controls','Existing controls','textarea',''],['additional_controls','Additional controls','textarea',''],['responsible','Responsible person','text','']],
      chemicals:[['chemical_name','Chemical name','text',''],['cas_no','CAS / identifier','text',''],['hazard_class','Hazard class','text',''],['quantity','Quantity','number','0'],['unit','Unit','text',''],['storage','Storage location','text',''],['segregation','Segregation / compatibility','text',''],['sds','SDS available','select','Yes|No']],
      waste:[['waste_stream','Waste stream','select','General|Metal|Chemical|Hazardous|Plastic|Paper|E-waste|Other'],['quantity','Quantity','number','0'],['unit','Unit','text',''],['vendor','Waste vendor','text',''],['manifest','Manifest / reference','text',''],['disposal_method','Disposal / recovery method','text','']],
      energy:[['energy_source','Energy source','select','Electricity|Natural Gas|Diesel|Water|Other'],['quantity','Consumption','number','0'],['unit','Unit','text',''],['meter','Meter / source','text',''],['period','Period','month',`${today().slice(0,7)}`]],
      audit:[['audit_type','Audit type','select','Internal|External|Certification|ADOSH|Customer|Supplier'],['standard','Standard / criteria','text',''],['auditor','Auditor','text',''],['findings','Findings count','number','0'],['major_findings','Major findings','number','0'],['follow_up_date','Follow-up date','date','']],
      ncr:[['ncr_type','NCR type','select','Internal|External|Customer|Audit|Incident|Legal'],['root_cause','Root cause','textarea',''],['responsible','Responsible person','text',''],['due_date','Due date','date',today()],['effectiveness_check','Effectiveness check','textarea','']],
      documents:[['document_title','Document title','text',''],['document_no','Document number','text',''],['revision','Revision','text','00'],['document_type','Document type','select','Policy|Procedure|Work Instruction|Form|Register|Manual|External Document|Record'],['owner','Document owner','text',''],['approval_status','Approval status','select','Draft|For Review|Approved|Obsolete'],['effective_date','Effective date','date',today()],['next_review','Next review','date','']],
      legal:[['requirement','Legal requirement','text',''],['authority','Authority / source','text',''],['reference_no','Legal reference / code','text',''],['applicability','Applicability','select','Applicable|Not Applicable|Under Review'],['compliance_status','Compliance status','select','Compliant|Partially Compliant|Non-Compliant|Not Assessed'],['next_review','Next review','date',today()],['evidence','Evidence / record reference','text','']],
      objectives:[['objective','Objective','text',''],['target','Target','text',''],['measure','Measure / KPI','text',''],['owner','Owner','text',''],['progress','Progress %','number','0'],['due_date','Target date','date',today()]],
      employees:[['employee_code','Employee code / stock code','text',''],['employee_name','Employee name','text',''],['designation','Designation','text',''],['department_name','Department','text',''],['employment_type','Employment type','select','NUHAS|Contractor|Other'],['active_status','Active status','select','Active|Inactive'],['joining_date','Joining date','date',today()],['contact','Contact / extension','text','']],
      ppe:[['employee_code','Employee code / stock code','text',''],['employee_name','Employee name','text',''],['designation','Designation / location','text',''],['ppe_item','PPE item','text',''],['size','Size','text',''],['issue_date','PPE issue date','date',today()],['quantity','Quantity','number','1'],['issue_type','Issue type','select','New Joining|Replacement|Additional|Other'],['remarks','Remarks','textarea','']],
      competencies:[['employee_code','Employee code','text',''],['employee_name','Employee name','text',''],['designation','Designation','text',''],['competency_type','Competency / authorisation','select','First Aider|Fire Fighter|External Training|Forklift Operator|Scissor Lift Operator|EOT Crane Operator|Other'],['certificate','Certificate / licence name','text',''],['provider','Training provider / authority','text',''],['issue_date','Issue date','date',today()],['expiry_date','Expiry / validity date','date',today()],['renewal_status','Renewal status','select','Valid|Due for Renewal|Expired|Renewed'],['remarks','Remarks','textarea','']],
      licenses:[['document_name','Licence / certificate / contract','text',''],['authority','Authority / issuer','text',''],['document_no','Licence / certificate no.','text',''],['issue_date','Issue date','date',today()],['expiry_date','Expiry date','date',today()],['compliance_status','Compliance status','select','Compliant|Partially Compliant|Non-Compliant|Under Renewal|Expired'],['renewal_status','Renewal status','select','Open|Renewal in Progress|Renewed|Closed'],['responsible','Responsible person','text',''],['evidence','Evidence / file reference','text',''],['remarks','Remarks','textarea','']],
      fire_equipment:[['equipment_id','Equipment ID','text',''],['category','Category','select','FE-DCP|FE-CO2|FE-FOAM|FH-HR|FHY|FE-FM200|FB|MCV'],['area','Area','text',''],['equipment_type','Equipment / Type','text',''],['equipment_location','Location','text',''],['pressure_gauge','Pressure / Gauge','select','OK|NOT OK|N/A'],['body_cylinder','Body / Cylinder','select','OK|NOT OK|N/A'],['instruction_label','Instruction / Label','select','OK|NOT OK|N/A'],['hose_nozzle','Hose / Nozzle','select','OK|NOT OK|N/A'],['pin_seal','Pin & Seal','select','OK|NOT OK|N/A'],['accessible','Accessible / Unobstructed','select','OK|NOT OK|N/A'],['mounting','Mounting / Stand','select','OK|NOT OK|N/A'],['inspection_sticker','Inspection Sticker','select','OK|NOT OK|N/A'],['inspection_date','Inspection date','date',today()],['inspection_status','Inspection status','select','OK|NOT OK|N/A'],['remarks','Remarks / Corrective Action','textarea','']],
      third_party:[['serial_no','Serial No. / ID','text',''],['equipment_type','Equipment type','select','Forklift|Scissor Lift|EOT Crane|Crawler Excavator|Air Compressor|Other'],['manufacturer','Manufacturer / Model','text',''],['swl','SWL / Capacity','text',''],['inspection_date','Inspection date','date',today()],['expiry_date','Expiry date','date',today()],['third_party_name','3rd party name','text',''],['inspection_status','Inspection status','select','Valid|Due for Renewal|Expired|Not in use|Action Required'],['remarks','Remarks','textarea','']]
    };
    return [...commonFields(),...(extra[t]||[])];
  }

  function permitDynamicHTML(type,data){
    const field=(id,label,type='text',value='',opts='')=>type==='select'?`<div class="field"><label>${label}</label><select id="f_${id}">${opts.split('|').map(o=>`<option value="${esc(o)}" ${String(value)===o?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`:type==='textarea'?`<div class="field full"><label>${label}</label><textarea id="f_${id}">${esc(value)}</textarea></div>`:`<div class="field"><label>${label}</label><input id="f_${id}" type="${type}" value="${esc(value)}"></div>`;
    if(type==='hot_work')return `<div class="form-section"><h3>Hot work controls</h3><div class="form-grid">${field('hot_activity','Hot-work activity','select',data.hot_activity||'Welding','Welding|Cutting|Grinding|Torch work|Other')}${field('combustible_removed','Combustible material removed?','select',data.combustible_removed||'Yes','Yes|No|N/A')}${field('fire_extinguisher','Fire extinguisher available?','select',data.fire_extinguisher||'Yes','Yes|No')}${field('fire_blanket','Fire blanket / spark containment?','select',data.fire_blanket||'Yes','Yes|No|N/A')}${field('fire_watch','Fire watch assigned?','select',data.fire_watch||'Yes','Yes|No')}${field('gas_test_required','Gas test required?','select',data.gas_test_required||'No','Yes|No')}${field('oxygen_percent','O₂ %','number',data.oxygen_percent||'')}${field('lel_percent','LEL %','number',data.lel_percent||'')}${field('h2s_ppm','H₂S ppm','number',data.h2s_ppm||'')}${field('co_ppm','CO ppm','number',data.co_ppm||'')}${field('fire_detection_isolated','Fire detection isolated?','select',data.fire_detection_isolated||'No','Yes|No|N/A')}${field('post_work_fire_watch','Post-work fire watch (minutes)','number',data.post_work_fire_watch||'30')}${field('area_inspected_after','Area inspected after completion?','select',data.area_inspected_after||'Yes','Yes|No')}</div></div>`;
    if(type!=='critical_work')return '';
    const ct=data.critical_type||'confined_space';
    let html=`<div class="form-section"><h3>Critical work controls</h3><div class="form-grid">${field('critical_type','Critical work subtype','select',ct,CRITICAL_TYPES.map(x=>x[0]).join('|'))}${field('rescue_plan','Emergency / rescue plan available?','select',data.rescue_plan||'Yes','Yes|No|N/A')}${field('competent_supervisor','Competent supervisor/person','text',data.competent_supervisor||'')}</div><div id="critical-detail-fields"></div></div>`;
    return html;
  }

  function criticalDetailHTML(type,data){
    const f=(id,l,t='text',v='',opts='')=>t==='select'?`<div class="field"><label>${l}</label><select id="f_${id}">${opts.split('|').map(o=>`<option value="${esc(o)}" ${String(v)===o?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`:t==='textarea'?`<div class="field full"><label>${l}</label><textarea id="f_${id}">${esc(v)}</textarea></div>`:`<div class="field"><label>${l}</label><input id="f_${id}" type="${t}" value="${esc(v)}"></div>`;
    const wrap=(title,inner)=>`<div class="form-subsection"><h4>${title}</h4><div class="form-grid">${inner}</div></div>`;
    if(type==='confined_space')return wrap('Confined space',f('entry_monitoring','Continuous atmosphere monitoring?','select',data.entry_monitoring||'Yes','Yes|No')+f('o2_required','O₂ acceptable range / test result','text',data.o2_required||'')+f('lel_required','LEL result','text',data.lel_required||'')+f('h2s_required','H₂S result','text',data.h2s_required||'')+f('co_required','CO result','text',data.co_required||'')+f('attendant','Dedicated attendant','text',data.attendant||'')+f('ventilation','Ventilation provided','select',data.ventilation||'Yes','Yes|No|N/A')+f('communication','Communication method','text',data.communication||'')+f('access_egress','Safe access / egress','text',data.access_egress||'')+f('rescue_equipment','Rescue equipment / standby','text',data.rescue_equipment||''));
    if(type==='work_at_height')return wrap('Work at height',f('work_height','Work height (m)','number',data.work_height||'')+f('height_equipment','Equipment / scaffold / MEWP','text',data.height_equipment||'')+f('harness','Full-body harness / fall protection','select',data.harness||'Yes','Yes|No|N/A')+f('anchor','Certified anchor / lifeline','text',data.anchor||'')+f('falling_objects','Falling-object controls','textarea',data.falling_objects||'')+f('height_rescue','Rescue plan / retrieval','text',data.height_rescue||''));
    if(type==='electrical')return wrap('Electrical work',f('voltage','Voltage / system','text',data.voltage||'')+f('electrical_isolation','Isolation / LOTO completed','select',data.electrical_isolation||'Yes','Yes|No|N/A')+f('authorized_electrician','Authorized electrician','text',data.authorized_electrician||'')+f('test_before_touch','Test-before-touch completed','select',data.test_before_touch||'Yes','Yes|No')+f('arc_flash','Arc-flash controls / PPE','text',data.arc_flash||'')+f('dead_live_work','Dead / live work justification','textarea',data.dead_live_work||''));
    if(type==='lifting')return wrap('Lifting operation',f('lifting_plan','Approved lifting plan','text',data.lifting_plan||'')+f('lifting_equipment','Lifting equipment ID/type','text',data.lifting_equipment||'')+f('lifting_swl','SWL / capacity','text',data.lifting_swl||'')+f('operator','Competent operator','text',data.operator||'')+f('rigger','Competent rigger / banksman','text',data.rigger||'')+f('exclusion_zone','Exclusion / drop zone','text',data.exclusion_zone||''));
    if(type==='excavation')return wrap('Excavation',f('excavation_depth','Depth (m)','number',data.excavation_depth||'')+f('underground_services','Underground services identified','select',data.underground_services||'Yes','Yes|No|N/A')+f('shoring','Shoring / benching','text',data.shoring||'')+f('barricade','Barricading / edge protection','text',data.barricade||'')+f('safe_access','Safe access / egress','text',data.safe_access||''));
    if(type==='line_breaking')return wrap('Line breaking',f('process_isolation','Process isolation','text',data.process_isolation||'')+f('depressurized','Depressurized / drained','select',data.depressurized||'Yes','Yes|No|N/A')+f('residual_material','Residual material / containment','text',data.residual_material||'')+f('chemical_ppe','Chemical-specific PPE','text',data.chemical_ppe||'')+f('spill_response','Spill response readiness','text',data.spill_response||''));
    if(type==='chemical_work')return wrap('Chemical work',f('chemical_name','Chemical','text',data.chemical_name||'')+f('sds_reference','SDS reference / revision','text',data.sds_reference||'')+f('exposure_controls','Exposure controls / LEV','textarea',data.exposure_controls||'')+f('spill_response','Spill / emergency response','textarea',data.spill_response||'')+f('compatibility','Compatibility / segregation','text',data.compatibility||''));
    if(type==='energy_isolation')return wrap('Energy isolation / LOTO',f('loto_points','Isolation points / locks','textarea',data.loto_points||'')+f('zero_energy','Zero energy verification','select',data.zero_energy||'Yes','Yes|No|N/A')+f('try_test','Try / test performed','select',data.try_test||'Yes','Yes|No')+f('isolated_by','Isolation performed by','text',data.isolated_by||'')+f('loto_reference','LOTO reference','text',data.loto_reference||''));
    return wrap('Other critical work',f('critical_controls','Specific critical controls','textarea',data.critical_controls||''));
  }

  function renderForm(t,recordId=null){
    const m=MODULES[t];if(!m)return;const existing=recordId?state.records.find(r=>r.id===recordId):null; if(existing&&!can(t,'edit',existing)){toast('You can edit only records you are authorized to edit.',false);return}
    const fields=formSchema(t),data=existing?.data||{},mid=`modal-${Date.now()}`;const val=id=>id==='event_date'?(existing?.event_date||today()):id==='location'?(existing?.location||''):id==='department'?(existing?.department||state.membership?.department||state.profile?.department||''):(data[id]??fields.find(x=>x[0]===id)?.[3]??'');
    const htmlField=([id,label,type,defaultValue])=>{const current=val(id);if(type==='permitType')return `<div class="field"><label>${label}</label><select id="f_${id}" data-permit-type>${PERMIT_TYPES.map(x=>`<option value="${x.value}" ${String(current)===x.value?'selected':''}>${esc(x.label)}</option>`).join('')}</select></div>`;if(type==='select'){const opts=defaultValue.split('|');return `<div class="field"><label>${label}</label><select id="f_${id}">${opts.map(o=>`<option value="${esc(o)}" ${String(current)===String(o)?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`}if(type==='textarea')return `<div class="field full"><label>${label}</label><textarea id="f_${id}" placeholder="Enter details…">${esc(current)}</textarea></div>`;return `<div class="field"><label>${label}</label><input id="f_${id}" type="${type}" value="${esc(current)}" ${type==='number'?'min="0" step="0.01"':''}></div>`};
    const fieldHTML=fields.map(htmlField).join('');const status=existing?.status||'open';const summary=existing?.summary||data.description||'';const related=data.related_reference||'';
    const statusOpts=t==='permits'?['draft','pending_approval','approved','suspended','closed','expired']:['open','in_progress','closed'];
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="${mid}" role="dialog" aria-modal="true"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${existing?'Edit record':'New record'} · ${m.code}</div><h2>${existing?'Edit':'Create'} ${m.singular}</h2></div><button class="icon-btn" data-close-modal="${mid}">${icon('close',16)}</button></div><div class="modal-body"><div class="form-section"><h3>Record information</h3><div class="form-grid">${fieldHTML}<div class="field"><label>Status</label><select id="f_status">${statusOpts.map(o=>`<option value="${o}" ${status===o?'selected':''}>${roleLabel(o)}</option>`).join('')}</select></div><div class="field"><label>Related reference <span class="muted">(optional)</span></label><input id="f_related" value="${esc(related)}" placeholder="e.g. HSE360-OB-2026-00001"></div><div class="field full"><label>Description / work summary *</label><textarea id="f_summary" required placeholder="Describe the event, finding, activity or record…">${esc(summary)}</textarea></div></div></div>${t==='permits'?'<div id="permit-dynamic"></div>':''}<div class="form-section"><h3>Evidence & attachments</h3><div class="field"><label>Photo / document attachment ${existing?.attachment?'(replace optional)':''}</label><input id="f_file" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"></div><p class="muted small">Files are stored in the private HSE360 attachment bucket under this company workspace.</p></div></div><div class="modal-foot"><button class="btn" data-close-modal="${mid}">Cancel</button><button class="btn primary" data-save-form="${t}" data-record-id="${recordId||''}" data-modal="${mid}">${existing?'Save changes':'Save '+m.singular}</button></div></div></div>`);
    const modal=document.getElementById(mid);if(t==='permits')renderPermitDynamic(modal,data);modal?.addEventListener('click',e=>{if(e.target===modal)modal.remove()});wirePageEvents();modal?.querySelector('[data-close-modal]')?.focus();
  }

  function renderPermitDynamic(modal,data){
    const type=modal.querySelector('#f_permit_type')?.value||'general_work';const holder=modal.querySelector('#permit-dynamic');if(!holder)return;holder.innerHTML=permitDynamicHTML(type,data)+(type==='critical_work'?criticalDetailHTML(data.critical_type||'confined_space',data):'');
    if(type==='critical_work'){const ct=modal.querySelector('#f_critical_type');ct?.addEventListener('change',()=>{modal.querySelector('#critical-detail-fields').innerHTML=criticalDetailHTML(ct.value,collectFormData(modal))})}
  }
  function collectFormData(modal){const d={};modal.querySelectorAll('[id^="f_"]').forEach(el=>{const id=el.id.slice(2);if(['event_date','location','department','status','summary','related','file'].includes(id))return;d[id]=el.type==='number'?el.value:el.value});return d}

  async function saveForm(t,mid,recordId=''){
    const modal=document.getElementById(mid),m=MODULES[t];if(!modal)return;const get=id=>modal.querySelector(`#f_${id}`)?.value??'';const summary=get('summary').trim();if(!summary){toast('Description / work summary is required.',false);modal.querySelector('#f_summary')?.focus();return}
    if(t==='permits'){const from=new Date(get('valid_from')).getTime(),until=new Date(get('valid_until')).getTime();if(!Number.isFinite(from)||!Number.isFinite(until)||until<=from){toast('Permit Valid Until must be later than Valid From.',false);return}}
    if(t==='risk'){const l=Math.max(1,Math.min(5,Number(get('likelihood')||1))),s=Math.max(1,Math.min(5,Number(get('severity')||1)));modal.querySelector('#f_likelihood').value=l;modal.querySelector('#f_severity').value=s}
    const btn=modal.querySelector('[data-save-form]');if(btn){btn.disabled=true;btn.textContent='Saving…'}
    const d=collectFormData(modal);d.related_reference=get('related');d.description=summary;
    if(['training','tbt'].includes(t))d.participant_hours=Number(d.participants||0)*Number(d.duration||0);
    if(t==='risk'){const l=Math.max(1,Math.min(5,Number(d.likelihood||1))),s=Math.max(1,Math.min(5,Number(d.severity||1)));d.likelihood=l;d.severity=s;d.score=l*s;d.level=d.score>=20?'Extreme':d.score>=12?'High':d.score>=6?'Medium':'Low'}
    if(t==='objectives')d.progress=Math.max(0,Math.min(100,Number(d.progress||0)));
    const file=modal.querySelector('#f_file')?.files?.[0];let attachment=null,uploadedPath=null;
    if(recordId&&!file)attachment=state.records.find(r=>r.id===recordId)?.attachment||null;
    if(file){const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');uploadedPath=`${activeOrgId()}/${state.session.user.id}/${crypto.randomUUID()}-${safe}`;const up=await sb.storage.from('hse-attachments').upload(uploadedPath,file,{upsert:false});if(up.error){btn.disabled=false;btn.textContent=recordId?'Save changes':'Save '+m.singular;toast(up.error.message,false);return}attachment={path:uploadedPath,name:file.name,size:file.size,type:file.type}}
    let data,error;
    if(recordId){({data,error}=await sb.rpc('update_hse_record',{p_org_id:activeOrgId(),p_id:recordId,p_event_date:get('event_date')||today(),p_location:get('location'),p_department:get('department'),p_status:get('status')||'open',p_summary:summary,p_data:d,p_attachment:attachment}))}
    else {({data,error}=await sb.rpc('create_hse_record',{p_org_id:activeOrgId(),p_module:t,p_event_date:get('event_date')||today(),p_location:get('location'),p_department:get('department'),p_status:get('status')||'open',p_summary:summary,p_data:d,p_attachment:attachment}))}
    if(error){if(uploadedPath)await sb.storage.from('hse-attachments').remove([uploadedPath]);btn.disabled=false;btn.textContent=recordId?'Save changes':'Save '+m.singular;toast(error.message,false);return}
    if(recordId&&uploadedPath){const oldPath=state.records.find(r=>r.id===recordId)?.attachment?.path;if(oldPath&&oldPath!==uploadedPath)await sb.storage.from('hse-attachments').remove([oldPath])}
    modal.remove();toast(`${data?.reference_no||'Record'} ${recordId?'updated':'saved'} successfully.`);await loadRecords();renderPage();updateNotificationCount();
  }

  async function detail(id){
    const r=state.records.find(x=>x.id===id);if(!r)return;const data=r.data||{};const edit=can(r.module,'edit',r),del=can(r.module,'delete',r);const relation=state.records.find(x=>x.reference_no===data.related_reference);const printable=JSON.stringify(data,null,2);
    document.getElementById('drawer')?.remove();document.body.insertAdjacentHTML('beforeend',`<aside class="drawer" id="drawer"><div class="drawer-head"><div><div class="eyebrow">${esc(MODULES[r.module]?.label||r.module)}</div><h2>${esc(r.reference_no)}</h2><p class="muted small">Created by ${esc(r.created_by_name||'—')} · ${ago(r.created_at)}</p></div><button class="icon-btn" data-close-drawer>${icon('close',16)}</button></div><div class="drawer-body"><div class="detail-actions"><button class="btn" data-print-record="${r.id}">${icon('download',14)} Print / PDF</button>${edit?`<button class="btn primary" data-edit-record="${r.id}">Edit</button>`:''}${del?`<button class="btn danger" data-delete-record="${r.id}">Delete</button>`:''}</div><div class="record-detail"><div class="detail-box"><label>Date</label><div>${fmtDate(r.event_date)}</div></div><div class="detail-box"><label>Status</label><div>${statusBadge(r.status)}</div></div><div class="detail-box"><label>Department</label><div>${esc(r.department||'—')}</div></div><div class="detail-box"><label>Location</label><div>${esc(r.location||'—')}</div></div><div class="detail-box"><label>Created by</label><div>${esc(r.created_by_name||'—')}</div></div><div class="detail-box"><label>Updated</label><div>${fmtDateTime(r.updated_at||r.created_at)}</div></div></div><div class="form-section"><h3>Summary</h3><p class="detail-prose">${esc(r.summary||'—')}</p></div>${relation?`<div class="form-section"><h3>Linked reference</h3><button class="link-btn ref" data-detail="${relation.id}">${esc(relation.reference_no)}</button><p class="muted small">${esc(relation.summary||'')}</p></div>`:''}<div class="form-section"><h3>Record fields</h3><div class="data-kv">${Object.entries(data).filter(([k,v])=>v!==''&&v!==null&&v!==undefined&&k!=='description'&&k!=='related_reference').map(([k,v])=>`<div><span>${esc(k.replaceAll('_',' '))}</span><strong>${esc(typeof v==='object'?JSON.stringify(v):v)}</strong></div>`).join('')||'<span class="muted">No additional fields.</span>'}</div></div>${r.attachment?.path?`<div class="form-section"><h3>Attachment</h3><button class="btn" data-download-attachment="${esc(r.attachment.path)}">Open ${esc(r.attachment.name||'attachment')}</button></div>`:''}<details class="raw-details"><summary>Technical record JSON</summary><pre>${esc(printable)}</pre></details></div></aside>`);wirePageEvents();
  }

  async function deleteRecord(id){const r=state.records.find(x=>x.id===id);if(!r||!can(r.module,'delete',r)){toast('You do not have permission to delete this record.',false);return}if(!confirm(`Delete ${r.reference_no}? This action is audited and cannot be undone.`))return;const {error}=await sb.rpc('delete_hse_record',{p_org_id:activeOrgId(),p_id:id});if(error){toast(error.message,false);return}document.getElementById('drawer')?.remove();toast(`${r.reference_no} deleted.`);await loadRecords();renderPage();updateNotificationCount()}

  function users(){
    if(!roleCanAdmin()){document.getElementById('content').innerHTML=`${pageHeader()}<section class="card panel"><div class="empty"><strong>Access restricted</strong>Only organization administrators can manage users.</div></section>`;return}
    sb.rpc('admin_list_members',{p_org_id:activeOrgId()}).then(({data,error})=>{if(error){toast(error.message,false);return}const rows=data||[];document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-go="settings">Organization settings</button>`)}<section class="card"><div class="panel user-admin-head"><div class="section-title"><div><h2>Company access directory</h2><p>${rows.length} member record${rows.length===1?'':'s'} · passwords are never readable.</p></div></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>User</th><th>Department</th><th>Role</th><th>Status</th><th>Last login</th><th>Created</th><th>Actions</th></tr></thead><tbody>${rows.map(u=>`<tr><td><strong>${esc(u.full_name||u.username)}</strong><br><span class="muted small">@${esc(u.username)} · ${esc(u.email||'no recovery email')}</span></td><td><input class="inline-input" data-member-dept="${u.member_id}" value="${esc(u.department||'')}"></td><td><select class="user-role-select" data-member-role="${u.member_id}">${['super_admin','hse_admin','hse_engineer','hse_officer','supervisor','employee','contractor','management','auditor','guest'].map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${roleLabel(r)}</option>`).join('')}</select></td><td><select class="user-role-select" data-member-status="${u.member_id}">${['pending','active','suspended','rejected'].map(s=>`<option value="${s}" ${u.status===s?'selected':''}>${roleLabel(s)}</option>`).join('')}</select></td><td>${ago(u.last_login_at)}</td><td>${fmtDate(String(u.created_at||'').slice(0,10))}</td><td><div class="toolbar"><button class="btn" data-member-perms="${u.member_id}">Permissions</button><button class="btn primary" data-member-save="${u.member_id}">Save access</button><button class="btn" data-reset-user="${u.user_id}" data-reset-name="${esc(u.username)}">Reset password</button></div></td></tr>`).join('')}</tbody></table></div></section>`;window.__membersCache=rows;wirePageEvents()});
  }

  async function saveMember(id){const row=(window.__membersCache||[]).find(x=>x.member_id===id);if(!row)return;let perms=row.permissions||{};const role=document.querySelector(`[data-member-role="${id}"]`)?.value||row.role,status=document.querySelector(`[data-member-status="${id}"]`)?.value||row.status,dept=document.querySelector(`[data-member-dept="${id}"]`)?.value||'';const permissionsPayload = row.role!==role ? null : (Object.keys(perms).length?perms:null);const {error}=await sb.rpc('admin_update_member',{p_org_id:activeOrgId(),p_member_id:id,p_role:role,p_status:status,p_department:dept,p_permissions:permissionsPayload});if(error){toast(error.message,false);return}toast('Member access updated.');await users()}

  function permissionsModal(id){const row=(window.__membersCache||[]).find(x=>x.member_id===id);if(!row)return;const modules=Object.keys(MODULES),p=row.permissions||{};const modalId=`perm-${Date.now()}`;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="${modalId}"><div class="modal wide-modal"><div class="modal-head"><div><div class="eyebrow">Granular permissions</div><h2>${esc(row.full_name||row.username)}</h2><p class="muted small">View / create / edit own / edit all / delete own / delete all</p></div><button class="icon-btn" data-close-modal="${modalId}">${icon('close',16)}</button></div><div class="modal-body permission-grid">${modules.map(m=>{const q=p[m]||{};return `<div class="permission-card"><div class="permission-title">${esc(MODULES[m].label)}</div>${['view','create','edit_own','edit_all','delete_own','delete_all'].map(a=>`<label class="check-row"><input type="checkbox" data-perm-module="${m}" data-perm-action="${a}" ${q[a]?'checked':''}><span>${roleLabel(a)}</span></label>`).join('')}</div>`}).join('')}</div><div class="modal-foot"><button class="btn" data-close-modal="${modalId}">Cancel</button><button class="btn primary" id="save-permissions">Save permissions</button></div></div></div>`);document.getElementById('save-permissions').addEventListener('click',async()=>{const perms={};document.querySelectorAll(`#${modalId} [data-perm-module]`).forEach(i=>{perms[i.dataset.permModule] ||= {};perms[i.dataset.permModule][i.dataset.permAction]=i.checked});const role=document.querySelector(`[data-member-role="${id}"]`)?.value||row.role,status=document.querySelector(`[data-member-status="${id}"]`)?.value||row.status,dept=document.querySelector(`[data-member-dept="${id}"]`)?.value||row.department||'';const permissionsPayload = row.role!==role ? null : perms;const {error}=await sb.rpc('admin_update_member',{p_org_id:activeOrgId(),p_member_id:id,p_role:role,p_status:status,p_department:dept,p_permissions:permissionsPayload});if(error){toast(error.message,false);return}document.getElementById(modalId)?.remove();toast('Permissions saved.');await users()})}

  async function resetUser(userId,name){const p=prompt(`Set a temporary password for ${name}. Minimum 10 characters:`);if(!p)return;if(p.length<10){toast('Temporary password must be at least 10 characters.',false);return}const {data,error}=await sb.functions.invoke('admin-reset',{body:{organization_id:activeOrgId(),user_id:userId,temp_password:p}});if(error||data?.error){toast(error?.message||data?.error||'Password reset failed. Verify the admin-reset Edge Function is deployed.',false);return}toast('Temporary password issued. User must change it at next login.')}

  async function auditlog(){
    if(!roleCanAdmin()){document.getElementById('content').innerHTML=`${pageHeader()}<section class="card panel"><div class="empty"><strong>Access restricted</strong>Only organization administrators can view the audit trail.</div></section>`;return}
    const {data,error}=await sb.from('audit_events').select('*').eq('organization_id',activeOrgId()).order('created_at',{ascending:false}).limit(500);if(error){toast(error.message,false);return}
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-export-audit="1">${icon('download',14)} Export audit CSV</button>`)}<section class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Time</th><th>Action</th><th>Target</th><th>Actor</th><th>Details</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${fmtDateTime(x.created_at)}</td><td><span class="badge in_progress">${esc(x.action)}</span></td><td>${esc(x.target_type||'—')}</td><td>${esc(x.actor_id||'System')}</td><td class="summary-cell">${esc(JSON.stringify(x.details||{}))}</td></tr>`).join('')}</tbody></table></div>${data?.length?'':'<div class="empty"><strong>No audit events</strong>Audited activity will appear as company users work in HSE360.</div>'}</section>`;wirePageEvents();
  }

  function settingsPage(){
    const o=state.activeOrg||{},m=state.membership||{};
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-go="users">Users & Roles</button><button class="btn" id="new-org-btn">${icon('plus2',14)} Create another company</button>`)}<div class="grid-2"><section class="card panel"><div class="section-title"><div><h2>Company profile</h2><p>${roleCanAdmin()?'Editable by company administrators.':'Read-only workspace identity.'}</p></div></div><div class="form-grid"><div class="field"><label>Company name</label><input id="set_name" value="${esc(o.name||'')}" ${roleCanAdmin()?'':'disabled'}></div><div class="field"><label>Legal name</label><input id="set_legal" value="${esc(o.legal_name||'')}" ${roleCanAdmin()?'':'disabled'}></div><div class="field"><label>Industry</label><input id="set_industry" value="${esc(o.industry||'')}" ${roleCanAdmin()?'':'disabled'}></div><div class="field"><label>Country</label><input id="set_country" value="${esc(o.country||'')}" ${roleCanAdmin()?'':'disabled'}></div><div class="field full"><label>Address</label><textarea id="set_address" ${roleCanAdmin()?'':'disabled'}>${esc(o.address||'')}</textarea></div><div class="field"><label>Reference prefix</label><input id="set_prefix" value="${esc(state.activeOrg?.slug==='nuhas'?'NUHAS':(state.activeOrg?.join_code?.split('-')[0]||'HSE360'))}" ${roleCanAdmin()?'':'disabled'}></div><div class="field"><label>Company access code</label><input value="${esc(m.join_code||'Hidden — administrator only')}" disabled></div></div>${roleCanAdmin()?`<div class="setting-actions"><input id="set_logo" type="file" accept="image/png,image/jpeg,image/webp"><button class="btn primary" id="save-org">Save company profile</button></div>`:''}${orgLogo(o)?`<div class="company-logo-preview"><img src="${esc(orgLogo(o))}" alt="Company logo"></div>`:''}</section><section class="card panel"><div class="section-title"><div><h2>Current access</h2><p>Your role and permission model in this company.</p></div></div><div class="detail-box"><label>Role</label><div>${esc(roleLabel(m.role))}</div></div><div style="height:10px"></div><div class="detail-box"><label>Status</label><div>${statusBadge(m.status)}</div></div><div style="height:10px"></div><div class="detail-box"><label>Department</label><div>${esc(m.department||state.profile?.department||'—')}</div></div><div style="height:10px"></div><div class="detail-box"><label>Data isolation</label><div>This workspace is enforced by Supabase RLS using organization membership.</div></div><div class="notice success" style="margin-top:14px">NUHAS is one company workspace. A new company created from this account starts empty and remains isolated from NUHAS.</div></section></div>`;
    document.getElementById('new-org-btn').addEventListener('click',()=>onboardingModal('create'));if(roleCanAdmin())document.getElementById('save-org').addEventListener('click',saveOrganization);wirePageEvents();
  }

  async function saveOrganization(){
    let logoUrl=state.activeOrg.logo_url||'';const file=document.getElementById('set_logo')?.files?.[0];
    if(file){const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=`${activeOrgId()}/${crypto.randomUUID()}-${safe}`;const up=await sb.storage.from('org-branding').upload(path,file,{upsert:true});if(up.error){toast(up.error.message,false);return}logoUrl=sb.storage.from('org-branding').getPublicUrl(path).data.publicUrl}
    const {data,error}=await sb.rpc('admin_update_organization',{p_org_id:activeOrgId(),p_name:document.getElementById('set_name').value.trim(),p_legal_name:document.getElementById('set_legal').value.trim()||null,p_industry:document.getElementById('set_industry').value.trim()||null,p_country:document.getElementById('set_country').value.trim()||'United Arab Emirates',p_address:document.getElementById('set_address').value.trim()||null,p_logo_url:logoUrl||null,p_numbering_prefix:document.getElementById('set_prefix').value.trim()||'HSE360'});if(error){toast(error.message,false);return}
    state.activeOrg={...state.activeOrg,...data,logo_url:logoUrl};toast('Company profile saved.');await loadOrganizations();const x=state.orgs.find(o=>o.id===activeOrgId());if(x)state.membership=x;renderApp();
  }

  function renderPage(){if(!document.getElementById('content'))return;document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.nav===state.page));if(state.page==='dashboard')dashboard();else if(state.page==='management')management();else if(state.page==='users')users();else if(state.page==='auditlog')auditlog();else if(state.page==='settings')settingsPage();else modulePage(state.page)}
  function go(page){state.page=page;state.query='';state.status='all';state.department='all';state.dateFrom='';state.dateTo='';document.getElementById('sidebar')?.classList.remove('open');renderPage()}

  function wirePageEvents(){
    document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>go(b.dataset.nav));
    document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>renderForm(b.dataset.new));
    document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
    document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(b.dataset.detail));
    document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.closeModal)?.remove());
    document.querySelectorAll('[data-close-drawer]').forEach(b=>b.onclick=()=>document.getElementById('drawer')?.remove());
    document.querySelectorAll('[data-save-form]').forEach(b=>b.onclick=()=>saveForm(b.dataset.saveForm,b.dataset.modal,b.dataset.recordId||''));
    document.querySelectorAll('[data-edit-record]').forEach(b=>b.onclick=()=>{document.getElementById('drawer')?.remove();const r=state.records.find(x=>x.id===b.dataset.editRecord);if(r)renderForm(r.module,r.id)});
    document.querySelectorAll('[data-delete-record]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.deleteRecord));
    document.querySelectorAll('[data-export-module]').forEach(b=>b.onclick=()=>exportCSV(b.dataset.exportModule));
    document.querySelectorAll('[data-import-module]').forEach(b=>b.onclick=()=>document.getElementById(`csv-import-${b.dataset.importModule}`)?.click());
    document.querySelectorAll('input[id^="csv-import-"]').forEach(inp=>inp.onchange=e=>importCSV(inp.id.replace('csv-import-',''),e.target.files?.[0]));
    document.querySelectorAll('[data-backup]').forEach(b=>b.onclick=backup);
    document.querySelectorAll('[data-reset-user]').forEach(b=>b.onclick=()=>resetUser(b.dataset.resetUser,b.dataset.resetName));
    document.querySelectorAll('[data-member-save]').forEach(b=>b.onclick=()=>saveMember(b.dataset.memberSave));
    document.querySelectorAll('[data-member-perms]').forEach(b=>b.onclick=()=>permissionsModal(b.dataset.memberPerms));
    document.querySelectorAll('[data-download-attachment]').forEach(b=>b.onclick=()=>downloadAttachment(b.dataset.downloadAttachment));
    document.querySelectorAll('[data-export]').forEach(b=>b.onclick=exportAll);document.querySelectorAll('[data-export-audit]').forEach(b=>b.onclick=exportAudit);
    document.querySelectorAll('[data-print-record]').forEach(b=>b.onclick=()=>printRecord(b.dataset.printRecord));
    const permitType=document.querySelector('[data-permit-type]');if(permitType)permitType.onchange=()=>renderPermitDynamic(document.getElementById(permitType.closest('.modal').id),collectFormData(permitType.closest('.modal')));
  }

  function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue}if(c==='"'){quoted=!quoted;continue}if(c===','&&!quoted){row.push(cell);cell='';continue}if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()!==''))rows.push(row);row=[];continue}cell+=c}if(cell!==''||row.length){row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row)}return rows}

  async function importCSV(module,file){
    if(!file)return;if(!can(module,'create')){toast('CSV import requires create permission for this module.',false);return}
    const text=await file.text(),rows=parseCSV(text);if(rows.length<2){toast('CSV contains no data rows.',false);return}const headers=rows[0].map(x=>x.trim().toLowerCase().replace(/[\s\/-]+/g,'_'));const dataRows=rows.slice(1);if(!confirm(`Import ${dataRows.length} ${MODULES[module]?.label||module} records? Existing records will not be overwritten.`))return;let ok=0,fail=0;
    for(const vals of dataRows){const raw={};headers.forEach((h,i)=>raw[h]=String(vals[i]??'').trim());const eventDate=raw.event_date||raw.date||raw.inspection_date||raw.issue_date||raw.joining_date||today();const location=raw.location||raw.equipment_location||raw.area||'';const department=raw.department||raw.department_name||state.membership?.department||'';const status=raw.status||raw.renewal_status||raw.inspection_status||'open';const summary=raw.summary||raw.description||raw.document_name||raw.employee_name||raw.equipment_id||raw.ppe_item||raw.equipment_type||`${MODULES[module]?.singular||module} record`;const d={...raw};['event_date','date','location','equipment_location','area','department','department_name','status','summary','description'].forEach(k=>delete d[k]);const {error}=await sb.rpc('create_hse_record',{p_org_id:activeOrgId(),p_module:module,p_event_date:eventDate,p_location:location,p_department:department,p_status:status,p_summary:summary,p_data:d,p_attachment:null});if(error)fail++;else ok++}
    await loadRecords();renderPage();toast(`CSV import complete: ${ok} imported${fail?`, ${fail} failed`:''}.`,fail===0)
  }

  function csvCell(v){return `"${String(v??'').replaceAll('"','""')}"`}
  function exportCSV(module){const rows=filteredRecords(module);const keys=['reference_no','event_date','status','department','location','summary','created_by_name','created_at'];const csv=[keys.join(','),...rows.map(r=>keys.map(k=>csvCell(r[k])).join(','))].join('\n');download(csv,`${module}-register-${today()}.csv`,'text/csv;charset=utf-8');toast('Excel-compatible CSV generated.')}
  function exportAll(){const rows=filteredRecords();const keys=['module','reference_no','event_date','status','department','location','summary','created_by_name','created_at'];const csv=[keys.join(','),...rows.map(r=>keys.map(k=>csvCell(r[k])).join(','))].join('\n');download(csv,`${(state.activeOrg?.slug||'hse360')}-all-records-${today()}.csv`,'text/csv;charset=utf-8');toast('Visible company data exported.')}
  async function exportAudit(){if(!roleCanAdmin()){toast('Access restricted.',false);return}const {data,error}=await sb.from('audit_events').select('*').eq('organization_id',activeOrgId()).order('created_at',{ascending:false}).limit(5000);if(error){toast(error.message,false);return}const keys=['created_at','action','target_type','target_id','actor_id','details'];const csv=[keys.join(','),...(data||[]).map(r=>keys.map(k=>csvCell(k==='details'?JSON.stringify(r[k]||{}):r[k])).join(','))].join('\n');download(csv,`${state.activeOrg?.slug||'hse360'}-audit-${today()}.csv`,'text/csv;charset=utf-8');toast('Audit CSV generated.')}
  function backup(){download(JSON.stringify({application:'HSE360',organization:state.activeOrg,exported_at:new Date().toISOString(),records:state.records},null,2),`${state.activeOrg?.slug||'hse360'}-backup-${today()}.json`,'application/json');toast('Company JSON backup generated.')}
  function download(data,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
  async function downloadAttachment(path){const {data,error}=await sb.storage.from('hse-attachments').createSignedUrl(path,300);if(error){toast(error.message,false);return}window.open(data.signedUrl,'_blank','noopener')}

  function notificationItems(){
    const overdue=recs('actions').filter(r=>r.status!=='closed'&&r.data?.due_date&&r.data.due_date<today()).map(r=>({type:'Overdue corrective action',ref:r.reference_no,text:r.data?.responsible||'Responsible person not set',page:'actions'}));
    const high=recs('risk').filter(r=>['High','Extreme'].includes(r.data?.level)).map(r=>({type:`${r.data?.level||'High'} risk`,ref:r.reference_no,text:r.data?.hazard||r.summary,page:'risk'}));
    const permits=permitAlerts().map(r=>({type:new Date(r._time)<new Date()?'Permit expired':'Permit expires soon',ref:r.reference_no,text:r.data?.permit_type?PERMIT_TYPES.find(x=>x.value===r.data.permit_type)?.label||r.data.permit_type:r.summary,page:'permits'}));
    const compliance=expiryItems().map(x=>({type:x.overdue?'Expired / overdue':'Renewal due within 2 months',ref:x.r.reference_no,text:x.r.data?.document_name||x.r.data?.certificate||x.r.data?.employee_name||x.r.summary,page:x.r.module}));
    return [...overdue,...high,...permits,...compliance].sort((a,b)=>a.type.localeCompare(b.type));
  }
  function updateNotificationCount(){const c=document.getElementById('notification-count');if(!c)return;const n=notificationItems().length;c.textContent=n?String(Math.min(n,99)):'';c.style.display=n?'grid':'none'}
  function showNotifications(){document.getElementById('notification-panel')?.remove();const items=notificationItems();document.body.insertAdjacentHTML('beforeend',`<div class="notification-popover" id="notification-panel"><div class="section-title"><div><h2>Notifications</h2><p>${items.length?`${items.length} item${items.length===1?'':'s'} need attention`:'No urgent items'}</p></div><button class="icon-btn" data-close-notifications>${icon('close',14)}</button></div>${items.length?items.slice(0,15).map(x=>`<button class="attention-row" data-notification-page="${x.page}" style="width:100%;text-align:left;background:transparent;border:0"><span class="attention-dot dot-red"></span><span style="flex:1"><b>${esc(x.type)} · ${esc(x.ref)}</b><span>${esc(x.text)}</span></span>${icon('chevron',14)}</button>`).join(''):'<div class="empty" style="padding:25px 5px"><strong>All clear</strong>No overdue actions, high/extreme risks, permit time alerts or compliance renewals are currently due.</div>'}</div>`);document.querySelector('[data-close-notifications]')?.addEventListener('click',()=>document.getElementById('notification-panel')?.remove());document.querySelectorAll('[data-notification-page]').forEach(b=>b.onclick=()=>{document.getElementById('notification-panel')?.remove();go(b.dataset.notificationPage)})}

  function printRecord(id){const r=state.records.find(x=>x.id===id);if(!r)return;const logo=orgLogo(state.activeOrg);const rows=Object.entries(r.data||{}).filter(([k,v])=>v!==''&&v!==null&&v!==undefined).map(([k,v])=>`<tr><th>${esc(k.replaceAll('_',' '))}</th><td>${esc(typeof v==='object'?JSON.stringify(v):v)}</td></tr>`).join('');const w=window.open('','_blank','noopener');if(!w){toast('Popup blocked. Allow popups for PDF/print output.',false);return}w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.reference_no)}</title><style>body{font:13px Arial,sans-serif;color:#222;padding:35px}header{display:flex;align-items:center;gap:18px;border-bottom:2px solid #159a5b;padding-bottom:15px;margin-bottom:22px}header img{max-width:220px;max-height:70px}h1{font-size:20px;margin:0}h2{font-size:14px;margin:22px 0 8px;color:#159a5b}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}th{width:32%;background:#f5f7fa;text-transform:capitalize}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.box{border:1px solid #ddd;padding:10px}.muted{color:#667085;font-size:11px}@media print{body{padding:12px}}</style></head><body><header>${logo?`<img src="${esc(logo)}">`:''}<div><div class="muted">HSE360 Company Record</div><h1>${esc(r.reference_no)}</h1><div class="muted">${esc(MODULES[r.module]?.label||r.module)}</div></div></header><div class="meta"><div class="box"><b>Date</b><br>${fmtDate(r.event_date)}</div><div class="box"><b>Status</b><br>${esc(r.status)}</div><div class="box"><b>Department</b><br>${esc(r.department||'—')}</div><div class="box"><b>Location</b><br>${esc(r.location||'—')}</div></div><h2>Summary</h2><p>${esc(r.summary||'—')}</p><h2>Record fields</h2><table>${rows||'<tr><td colspan="2">No additional fields.</td></tr>'}</table><p class="muted">Printed from HSE360 Platform · ${new Date().toLocaleString()}</p><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close()}

  function toggleTheme(){state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem('hse360_theme',state.theme);applyTheme();document.getElementById('theme-btn').innerHTML=icon(state.theme==='dark'?'sun':'moon',16)}
  function applyTheme(){document.documentElement.dataset.theme=state.theme}

  window.go=go;window.refresh=refresh;window.signout=signout;window.renderForm=renderForm;window.saveForm=saveForm;window.backup=backup;window.exportCSV=exportCSV;
  init();
})();
