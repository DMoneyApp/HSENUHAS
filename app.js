/* HSE360 V8.6 — multi-organization HSE / IMS command platform
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
    ['COMMAND CENTER',[['dashboard','Dashboard','grid'],['management','Management Overview','chart'],['reports','Reports & Analytics','chart']]],
    ['DATA & DOCUMENTS',[['imports','Import & Extract','upload']]],
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
    loading:false, mobileNav:false, dashboardPeriod:6, reportModule:'all', reportMeta:{revision:'00'}, theme:localStorage.getItem('hse360_theme')||'light', realtime:null, importTarget:'observations', actionOwner:'all', actionPriority:'all', actionDue:'all', noticeState:{read:[],cleared:[]}, noticeRemote:false
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
    // Global modal/drawer close delegation: works for dynamically-created dialogs too.
    document.addEventListener('click',e=>{
      const closeModal=e.target.closest?.('[data-close-modal]');
      if(closeModal){e.preventDefault();e.stopPropagation();document.getElementById(closeModal.dataset.closeModal)?.remove();return;}
      const closeDrawer=e.target.closest?.('[data-close-drawer]');
      if(closeDrawer){e.preventDefault();e.stopPropagation();document.getElementById('drawer')?.remove();return;}
    },true);
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
    await loadRecords();await loadNotificationState();subscribeRealtime();
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

  function showLogin(message=''){const b=document.getElementById('auth-body');if(!b)return;b.innerHTML=`<h2>Welcome back</h2><p class="lead">Sign in with your HSE360 username and password.</p>${message?noticeHtml(message,'error'):'<div id="auth-msg"></div>'}<form id="login-form" class="auth-form"><div class="field"><label>Username</label><input id="lu" autocomplete="username" placeholder="e.g. DANISH" autofocus></div><div class="field"><label>Password</label><div class="password-wrap"><input id="lp" type="password" autocomplete="current-password" placeholder="Enter your password"><button class="password-toggle" type="button" data-toggle="lp">${icon('eye',16)}</button></div></div><button class="btn primary block" type="submit">Sign in</button></form><div class="auth-switch"><button class="link-btn" data-auth="register">Create account</button><button class="link-btn" data-auth="forgot">Forgot password?</button></div><div class="auth-foot">Passwords are managed by Supabase Auth and are never visible to administrators.</div><div class="developer-credit auth-developer-credit">HSE360 Founder &amp; Developer: <strong>Danish Bilal Shaikh</strong> · <a href="https://www.linkedin.com/in/odanisho/" target="_blank" rel="noopener noreferrer" aria-label="Danish Bilal Shaikh on LinkedIn">LinkedIn profile ↗</a></div>`;document.getElementById('login-form').addEventListener('submit',e=>{e.preventDefault();doLogin()});wireAuthToggles();wireAuthLinks()}

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
    const avail=await sb.rpc('username_available',{p_username:u});
    if(avail.error){document.getElementById('auth-msg').outerHTML=noticeHtml('Unable to validate username. Please try again.','error');return}
    if(!avail.data){document.getElementById('auth-msg').outerHTML=noticeHtml('That username is already registered. Please choose another username.','error');return}
    const authEmail=email||`${u.toLowerCase()}@hse360.local`;
    const btn=document.querySelector('#register-form button[type=submit]');btn.disabled=true;btn.textContent='Creating account…';
    const {data,error}=await sb.auth.signUp({email:authEmail,password:p,options:{data:{username:u,recovery_email:email||null,full_name:n||null,department:d||null}}});
    if(error){btn.disabled=false;btn.textContent='Create secure account';document.getElementById('auth-msg').outerHTML=noticeHtml(error.message||'Registration failed.','error');return}
    if(data?.session){toast('Account created. Complete company onboarding.');await enterApp();}
    else {document.getElementById('auth-msg').outerHTML=noticeHtml('Account created. Complete email confirmation if your Supabase project requires it, then sign in.','success');btn.disabled=false;btn.textContent='Create secure account';}
  }

  async function forgot(){
    const e=document.getElementById('fe')?.value.trim().toLowerCase();
    if(!e){document.getElementById('auth-msg').outerHTML=noticeHtml('Enter your recovery email.','error');return}
    const chk=await sb.rpc('recovery_email_registered',{p_email:e});
    if(chk.error){
      document.getElementById('auth-msg').outerHTML=noticeHtml('Unable to process the recovery request right now. Please try again later.','error');
      return;
    }
    // Avoid account/recovery-email enumeration: show the same response whether or not
    // the address is registered. Only request a reset when the backend confirms a match.
    let resetError=null;
    if(chk.data){
      const result=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin+location.pathname});
      resetError=result.error||null;
    }
    document.getElementById('auth-msg').outerHTML=noticeHtml(
      resetError
        ? 'The recovery request could not be completed. Please try again later or contact your organization administrator.'
        : 'If this address is registered for account recovery, a recovery message has been requested. If no message arrives, contact your organization administrator.',
      resetError?'error':'success'
    );
  }

  function renderPasswordChange(){document.body.innerHTML=`<div class="auth-shell"><section class="auth-visual"><div class="auth-brand"><div class="platform-mark">360</div><div><div class="brand-name">HSE360 Platform</div><div class="brand-sub">Secure account control</div></div></div><div class="auth-hero"><div class="eyebrow">Administrator-issued temporary password</div><h1>Protect your<br><span>account.</span></h1><p>Your administrator cannot see the new password you choose.</p></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Required action</div><h2>Change password</h2><p class="lead">Use at least 10 characters.</p><div id="pw-msg"></div><form id="pw-form" class="auth-form"><div class="field"><label>New password</label><input id="np" type="password" autocomplete="new-password"></div><div class="field"><label>Confirm password</label><input id="nc" type="password" autocomplete="new-password"></div><button class="btn primary block" type="submit">Set private password</button></form></div></section></div>`;document.getElementById('pw-form').addEventListener('submit',async e=>{e.preventDefault();const p=document.getElementById('np').value,c=document.getElementById('nc').value;if(p.length<10||p!==c){document.getElementById('pw-msg').innerHTML=noticeHtml('Use at least 10 characters and make both passwords match.','error');return}const {error}=await sb.auth.updateUser({password:p});if(error){document.getElementById('pw-msg').innerHTML=noticeHtml(error.message,'error');return}await sb.rpc('complete_password_change');await enterApp()})}

  function renderAccessState(){
    if(isPendingOnly()){
      document.body.innerHTML=`<div class="access-state"><div class="access-card"><div class="platform-mark large">360</div><div class="eyebrow">HSE360 account</div><h1>Access is pending.</h1><p>Your account has no active company workspace yet. An organization administrator must approve your membership and assign your role/permissions.</p><div class="notice">No company records are displayed while access is pending.</div><div class="access-actions"><button class="btn" id="join-another">Request access to another company</button><button class="btn primary" id="create-company">Create a new company workspace</button><button class="link-btn" id="pending-signout">Sign out</button></div><div class="developer-credit">Founder &amp; Developer: <strong>Danish Bilal Shaikh</strong><br><a href="https://www.linkedin.com/in/odanisho/" target="_blank" rel="noopener noreferrer" aria-label="Danish Bilal Shaikh on LinkedIn">LinkedIn · @odanisho ↗</a></div></div></div>`;
    } else {
      document.body.innerHTML=`<div class="access-state"><div class="access-card"><div class="platform-mark large">360</div><div class="eyebrow">HSE360 onboarding</div><h1>Choose your workspace.</h1><p>Your account is not connected to a company yet. Join an existing company using its access code, or create a new company and become its Super Admin.</p><div class="access-actions"><button class="btn primary" id="join-company">Join existing company</button><button class="btn" id="create-company">Create new company</button><button class="link-btn" id="onboard-signout">Sign out</button></div><div class="auth-foot">No company data is available until a workspace is active.</div><div class="developer-credit">Founder &amp; Developer: <strong>Danish Bilal Shaikh</strong><br><a href="https://www.linkedin.com/in/odanisho/" target="_blank" rel="noopener noreferrer" aria-label="Danish Bilal Shaikh on LinkedIn">LinkedIn · @odanisho ↗</a></div></div></div>`;
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
    document.body.innerHTML=`<div class="app-shell"><aside id="sidebar" class="sidebar"><div class="side-brand">${brandBlock(org)}<div><div class="brand-name">${esc(org?.name||'HSE360')}</div><div class="brand-sub">HSE & IMS Command Center</div></div></div><div class="nav-wrap">${navHTML()}</div><div class="side-footer"><span>HSE360 Platform</span><small>Founder &amp; Developer</small><a href="https://www.linkedin.com/in/odanisho/" target="_blank" rel="noopener noreferrer">Danish Bilal Shaikh · LinkedIn ↗</a></div></aside><main class="main"><header class="topbar"><div class="top-left"><button class="icon-btn mobile-menu" id="mobile-menu">${icon('menu')}</button><div class="top-search">${icon('search',15)}<input id="global-search" placeholder="Search references, actions, observations…" value="${esc(state.query)}"></div></div><div class="top-right"><div class="org-switcher workspace-switcher"><div class="workspace-logo">${logo?`<img src="${esc(logo)}" alt="">`:`<span>${esc((org?.name||'H').slice(0,1).toUpperCase())}</span>`}</div><div class="workspace-select-wrap"><label for="org-select">ACTIVE WORKSPACE</label><select id="org-select" aria-label="Switch company workspace">${state.orgs.filter(o=>o.status==='active').map(o=>`<option value="${esc(o.id)}" ${o.id===activeOrgId()?'selected':''}>${esc(o.name)}</option>`).join('')}</select></div></div><button class="icon-btn" id="theme-btn" title="Theme">${icon(state.theme==='dark'?'sun':'moon',16)}</button><button class="icon-btn" id="refresh-btn" title="Refresh">${icon('history',16)}</button><button class="icon-btn" id="notification-btn" title="Notifications">${icon('bell',16)}<span id="notification-count" class="notif-count"></span></button><div class="user-chip"><div><div class="user-name">${esc(state.profile?.full_name||state.profile?.username)}</div><div class="user-role">${esc(roleLabel(state.membership?.role))}</div></div><div class="avatar">${esc(initials(state.profile))}</div></div><button class="btn signout" id="signout-btn">Sign out</button></div></header><div id="page" class="page"><div id="content"></div></div><footer class="site-developer-footer"><span>HSE360 Platform</span><span>Founder &amp; Developer: <strong>Danish Bilal Shaikh</strong></span><a href="https://www.linkedin.com/in/odanisho/" target="_blank" rel="noopener noreferrer" aria-label="Danish Bilal Shaikh on LinkedIn">LinkedIn · @odanisho ↗</a></footer></main></div><div id="toast"></div>`;
    document.getElementById('mobile-menu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('refresh-btn').addEventListener('click',refresh);document.getElementById('theme-btn').addEventListener('click',toggleTheme);document.getElementById('notification-btn').addEventListener('click',showNotifications);document.getElementById('signout-btn').addEventListener('click',signout);
    document.getElementById('org-select').addEventListener('change',e=>switchOrganization(e.target.value));
    const gs=document.getElementById('global-search');gs.addEventListener('input',e=>{state.query=e.target.value;if(state.page!=='dashboard'&&state.page!=='management')renderPage()});gs.addEventListener('keydown',e=>{if(e.key==='Enter'&&gs.value.trim()){state.query=gs.value.trim();go('observations')}});
    applyTheme();renderPage();updateNotificationCount();
  }

  function navHTML(){return GROUPS.map(([g,items],gi)=>{const sectionCount=items.reduce((sum,[key])=>sum+navBadgeCount(key),0);return `<div class="nav-section"><span>${g}</span><span class="nav-section-badge" data-nav-section-badge="${gi}" style="display:${sectionCount?'inline-flex':'none'}">${sectionCount?Math.min(sectionCount,99):''}</span></div>${items.map(([key,label,ic])=>{if(key==='users'&&!roleCanAdmin())return '';const count=Math.max(navBadgeCount(key),key==='actions'?openActions():0);return `<button class="nav-item ${state.page===key?'active':''}" data-nav="${key}"><span class="nav-icon">${icon(ic,16)}</span><span class="nav-label">${label}</span><span class="nav-badge" data-nav-badge="${key}" style="display:${count?'grid':'none'}">${count?Math.min(count,99):''}</span></button>`}).join('')}`}).join('')}
  function titleFor(){if(state.page==='imports')return ['Data Import & Extraction','Review and map data from spreadsheets and supported documents before saving into a company register.'];if(state.page==='reports')return ['Reports & Analytics','Period-based HSE performance reports and controlled-document exports.'];if(state.page==='dashboard')return ['HSE Command Center','Live operational view of safety, risk, permits, compliance and performance.'];if(state.page==='management')return ['Management Overview','Executive HSE performance, exposure, actions and compliance at a glance.'];if(state.page==='users')return ['Users & Roles','Approve company members and control role/module permissions.'];if(state.page==='auditlog')return ['Audit Trail','Auditable activity and traceability for this company workspace.'];if(state.page==='settings')return ['Organization Settings','Company identity, branding, numbering and HSE360 workspace controls.'];const m=MODULES[state.page];return m?[m.label,m.desc]:['HSE360','Integrated HSE & IMS Management System'];}
  function pageHeader(actions=''){const [t,d]=titleFor();const logo=orgLogo(state.activeOrg);return `<div class="page-head"><div><div class="eyebrow">${esc(state.activeOrg?.name||'HSE360 Workspace')}</div><h1>${t}</h1><p>${d}</p></div><div class="head-actions">${actions}</div></div>`}
  function kpi(label,value,sub,ic,trend=''){return `<div class="card kpi"><div class="kpi-top"><div class="kpi-label">${label}</div><div class="kpi-icon">${icon(ic,15)}</div></div><div class="kpi-value">${esc(value)}</div><div class="kpi-foot"><span>${sub}</span>${trend?`<span class="${trend[0]}">${trend[1]}</span>`:''}</div></div>`}
  function openActions(){return recs('actions').filter(r=>!['closed','cancelled','void','draft'].includes(String(r.status||'').toLowerCase())).length}

  function lastMonths(n){const out=[];const d=new Date();d.setDate(1);for(let i=n-1;i>=0;i--){const x=new Date(d);x.setMonth(d.getMonth()-i);out.push({key:`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`,m:x.toLocaleDateString('en-US',{month:'short'})})}return out}
  function addMonthsISO(base,months){const d=new Date(`${base}T00:00:00`);d.setMonth(d.getMonth()+months);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function addDaysISO(base,days){const d=new Date(`${base}T00:00:00`);d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function actionDeadlineState(r,todayKey=today()){
    if(['closed','cancelled','canceled','void','expired'].includes(String(r.status||'').toLowerCase()))return 'closed';
    const due=String(r.data?.due_date||'').slice(0,10),parsed=new Date(`${due}T00:00:00`);
    const parsedKey=Number.isFinite(parsed.getTime())?`${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`:'';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(due)||!parsedKey||parsedKey!==due)return 'missing';
    if(due<todayKey)return 'overdue';if(due===todayKey)return 'due_today';if(due<=addDaysISO(todayKey,7))return 'next_7';return 'upcoming';
  }

  function complianceDaysRemaining(expiryDate,todayKey=today()){
    const parse=x=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x||''));if(!m)return NaN;const y=+m[1],mo=+m[2],d=+m[3],t=Date.UTC(y,mo-1,d),check=new Date(t);return y>=1900&&check.getUTCFullYear()===y&&check.getUTCMonth()===mo-1&&check.getUTCDate()===d?t:NaN};
    const from=parse(todayKey),to=parse(expiryDate);return Number.isFinite(from)&&Number.isFinite(to)?Math.round((to-from)/86400000):null;
  }
  function complianceRenewalBand(daysRemaining){
    if(!Number.isFinite(daysRemaining))return 'Invalid expiry date';
    if(daysRemaining<0)return 'Expired / overdue';if(daysRemaining===0)return 'Expires today';
    if(daysRemaining<=7)return 'Due within 7 days';if(daysRemaining<=30)return 'Due within 30 days';
    if(daysRemaining<=60)return 'Due within 60 days';if(daysRemaining<=90)return 'Due within 90 days';
    return 'Outside reminder window';
  }
  function complianceRecordNeedsAlert(record,daysRemaining){
    const status=String(record?.data?.renewal_status||record?.data?.compliance_status||record?.data?.inspection_status||'').trim().toLowerCase();
    if(['renewed','closed','not in use'].includes(status))return false;
    return daysRemaining===null||daysRemaining<=90;
  }
  function expiryItems(){
    const todayKey=today(),mods=[['licenses','expiry_date'],['competencies','expiry_date'],['third_party','expiry_date']];const out=[];
    mods.forEach(([module,field])=>recs(module).forEach(r=>{
      if(module==='licenses'&&certificateIsSuperseded(r,state.records))return;
      const d=String(r.data?.[field]||'').slice(0,10);if(!d)return;
      const daysRemaining=complianceDaysRemaining(d,todayKey);if(!complianceRecordNeedsAlert(r,daysRemaining))return;
      out.push({r,date:d,daysRemaining,overdue:Number.isFinite(daysRemaining)&&daysRemaining<0,invalid:daysRemaining===null,band:complianceRenewalBand(daysRemaining)});
    }));
    return out.sort((a,b)=>{if(a.invalid!==b.invalid)return a.invalid?1:-1;if(a.daysRemaining===null)return 0;if(b.daysRemaining===null)return -1;return a.daysRemaining-b.daysRemaining});
  }

  function permitAlerts(){
    const now=Date.now();return recs('permits').filter(r=>['approved','open','in_progress'].includes(String(r.status||'').toLowerCase())).map(r=>{const x=r.data?.valid_until?new Date(r.data.valid_until).getTime():NaN;if(!Number.isFinite(x))return null;return {...r,_time:x}}).filter(Boolean).filter(r=>r._time<=now+4*60*60*1000).sort((a,b)=>a._time-b._time);
  }

  function complianceAlertSummary(){const e=expiryItems();return {overdue:e.filter(x=>x.overdue).length,due7:e.filter(x=>Number.isFinite(x.daysRemaining)&&x.daysRemaining>=0&&x.daysRemaining<=7).length,due8to90:e.filter(x=>Number.isFinite(x.daysRemaining)&&x.daysRemaining>7&&x.daysRemaining<=90).length,invalid:e.filter(x=>x.invalid).length,due:e.filter(x=>Number.isFinite(x.daysRemaining)&&x.daysRemaining>=0&&x.daysRemaining<=90).length}}
  function attentionRows(){
    const lti=recs('accidents').filter(r=>String(r.data?.lti||'').toLowerCase()==='yes').length;
    const high=recs('risk').filter(r=>['High','Extreme'].includes(r.data?.level)).length;
    const overdue=recs('actions').filter(r=>!['closed','draft','cancelled','void'].includes(String(r.status||'').toLowerCase())&&r.data?.due_date&&r.data.due_date<today()).length;
    const exp=expiryItems().length;const permits=permitAlerts().length;
    return [['LTI / lost time',lti,'medical','dot-red'],['High / Extreme risk',high,'risk','dot-red'],['Overdue actions',overdue,'check','dot-amber'],['Compliance renewals',exp,'scale','dot-amber'],['Permit time alerts',permits,'file','dot-amber']];
  }

  function dashboard(){
    const period=Number(state.dashboardPeriod||6),months=lastMonths(period),periodStart=months[0]?.key||today().slice(0,7),periodEnd=months[months.length-1]?.key||today().slice(0,7);
    const periodRecords=state.records.filter(r=>{const key=String(r.event_date||'').slice(0,7);return key>=periodStart&&key<=periodEnd});
    const total=periodRecords.length,lti=periodRecords.filter(r=>r.module==='accidents'&&String(r.data?.lti||'').toLowerCase()==='yes').length,near=periodRecords.filter(r=>r.module==='near_miss').length,open=openActions();
    const manhours=periodRecords.filter(r=>r.module==='manhours').reduce((a,r)=>a+Number(r.data?.hours||0),0),participantHours=periodRecords.filter(r=>['training','tbt'].includes(r.module)).reduce((a,r)=>a+Number(r.data?.participant_hours||0),0),compliance=complianceAlertSummary();
    const series=months.map(m=>({m:m.m,count:state.records.filter(r=>String(r.event_date||'').slice(0,7)===m.key).length})),max=Math.max(1,...series.map(x=>x.count));
    const attention=attentionRows();
    const moduleVolume=Object.keys(MODULES).map(k=>({key:k,label:MODULES[k].label,count:recs(k).length,icon:MODULES[k].icon})).sort((a,b)=>b.count-a.count).slice(0,6);
    const permitCounts={draft:0,pending:0,active:0,closed:0};recs('permits').forEach(r=>{const s=String(r.status||'').toLowerCase();if(s==='draft')permitCounts.draft++;else if(['pending_approval','pending'].includes(s))permitCounts.pending++;else if(['approved','open','in_progress','suspended'].includes(s))permitCounts.active++;else if(s==='closed')permitCounts.closed++;});
    const recent=[...state.records].sort((a,b)=>String(b.created_at||b.event_date||'').localeCompare(String(a.created_at||a.event_date||''))).slice(0,6);
    const critical=attention.reduce((n,x)=>n+Number(x[1]||0),0);
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-go="management">Management overview</button><button class="btn" data-export="all">${icon('download',14)} Export data</button><button class="btn primary" data-new="observations">${icon('plus2',14)} Report a hazard</button>`)}
      <section class="hse-welcome"><div class="hse-welcome-copy"><span class="hse-live-dot"></span><span class="eyebrow">Operational safety intelligence</span><h2>Good ${new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, ${esc(state.profile?.full_name?.split(' ')[0]||state.profile?.username||'team')}.</h2><p>Your HSE overview, current risks and actions that need attention — in one place.</p></div><div class="hse-welcome-side"><span>WORKSPACE</span><strong>${esc(state.activeOrg?.name||'Company workspace')}</strong><small>${fmtDate(today())} · Live workspace data</small></div></section>
      <div class="hse-quick-actions" aria-label="Quick create actions"><button data-new="observations">${icon('eye',16)}<span><b>Report a hazard</b><small>Unsafe act / condition</small></span>${icon('chevron',14)}</button><button data-new="near_miss">${icon('shield',16)}<span><b>Near miss</b><small>Capture a close call</small></span>${icon('chevron',14)}</button><button data-new="first_aid">${icon('plus',16)}<span><b>First aid</b><small>Record a case</small></span>${icon('chevron',14)}</button><button data-new="permits">${icon('file',16)}<span><b>Work permit</b><small>Save a draft</small></span>${icon('chevron',14)}</button><button data-new="risk">${icon('risk',16)}<span><b>JSA / risk assessment</b><small>Reuse activity templates</small></span>${icon('chevron',14)}</button><button data-new="fire_equipment">${icon('flame',16)}<span><b>Fire equipment check</b><small>Weekly / monthly</small></span>${icon('chevron',14)}</button></div><div class="hse-kpi-grid">${kpi('HSE records',total,`Last ${period} month${period===1?'':'s'}`,'clipboard')}${kpi('Open corrective actions',open,'All active actions','check')}${kpi('Lost-time injuries',lti,`Within ${period} month${period===1?'':'s'}`,'medical')}${kpi('Exposure hours',fmtNum(manhours),`Recorded · ${period} month${period===1?'':'s'}`,'clock')}</div>
      <div class="hse-dashboard-grid hse-main-grid"><section class="card panel hse-chart-panel"><div class="section-title"><div><span class="eyebrow">Trend analysis</span><h2>HSE activity</h2><p>Record volume by event month</p></div><div class="period-switch" role="group" aria-label="Chart period">${[[1,'1M'],[3,'3M'],[6,'6M'],[12,'12M']].map(([n,l])=>`<button class="${period===n?'active':''}" data-period="${n}">${l}</button>`).join('')}</div></div><div class="hse-chart-summary"><strong>${fmtNum(series.reduce((a,x)=>a+x.count,0))}</strong><span>records across ${period} month${period===1?'':'s'}</span></div><div class="chart hse-premium-chart">${series.map(b=>`<div class="bar" title="${esc(b.m)}: ${b.count} records" style="height:${Math.max(8,Math.round((b.count/max)*145))}px"><b>${b.count}</b><span>${esc(b.m)}</span></div>`).join('')}</div></section>
      <section class="card panel hse-attention-panel"><div class="section-title"><div><span class="eyebrow">Priority queue</span><h2>Needs attention</h2><p>Indicators calculated from current records</p></div><span class="hse-attention-total ${critical?'has-alert':''}">${critical}</span></div><div class="attention-list">${attention.map(x=>`<button class="attention-row attention-btn" data-go="${x[2]==='check'?'actions':x[2]==='risk'?'risk':x[2]==='scale'?'licenses':x[2]==='file'?'permits':'accidents'}"><span class="attention-dot ${x[3]}"></span><span style="flex:1"><b>${esc(x[0])}</b><span>${fmtNum(x[1])} item${x[1]===1?'':'s'}</span></span><strong>${fmtNum(x[1])}</strong>${icon('chevron',13)}</button>`).join('')}</div><div class="hse-panel-foot">Prioritise overdue and high-risk items first.</div></section></div>
      <div class="hse-dashboard-grid hse-lower-grid"><section class="card panel"><div class="section-title"><div><span class="eyebrow">Workforce</span><h2>Training & engagement</h2><p>Training and toolbox talk delivery</p></div><button class="btn small" data-go="training">Open training</button></div><div class="hse-feature-stat"><strong>${fmtNum(participantHours)}</strong><span>participant-hours</span></div><div class="hse-mini-stats"><div><b>${periodRecords.filter(r=>r.module==='training').length}</b><span>Training sessions · period</span></div><div><b>${periodRecords.filter(r=>r.module==='tbt').length}</b><span>Toolbox talks · period</span></div><div><b>${near}</b><span>Near misses</span></div></div></section>
      <section class="card panel"><div class="section-title"><div><span class="eyebrow">Permit control</span><h2>Work permits</h2><p>Current permit workflow status</p></div><button class="btn small" data-go="permits">Open permits</button></div><div class="hse-permit-stats"><div><span class="hse-status-dot amber"></span><span>Pending</span><strong>${permitCounts.pending}</strong></div><div><span class="hse-status-dot green"></span><span>Active</span><strong>${permitCounts.active}</strong></div><div><span class="hse-status-dot"></span><span>Closed</span><strong>${permitCounts.closed}</strong></div></div><div class="hse-permit-alert">${permitAlerts().length?`<b>${permitAlerts().length} permit time alert${permitAlerts().length===1?'':'s'}</b> require review within four hours.`:'No permit time alerts in the next four hours.'}</div></section>
      <section class="card panel"><div class="section-title"><div><span class="eyebrow">IMS compliance</span><h2>Renewal watch</h2><p>Expiry alerts at 90 / 60 / 30 / 7 days</p></div><div class="toolbar"><button class="btn small" data-export-renewals="1">Export renewal list</button><button class="btn small" data-go="licenses">View registers</button></div></div><div class="hse-renewal-number"><strong>${fmtNum(compliance.overdue+compliance.due+compliance.invalid)}</strong><span>items requiring attention</span></div><div class="hse-mini-stats"><div><b class="text-danger">${compliance.overdue}</b><span>Overdue</span></div><div><b class="text-warn">${compliance.due7}</b><span>Due in 7 days</span></div><div><b>${compliance.due8to90}</b><span>Due in 8–90 days</span></div></div>${compliance.invalid?`<div class="notice error" style="margin-top:10px">${compliance.invalid} compliance record(s) have an invalid expiry date and need data correction.</div>`:''}</section>
      <section class="card panel"><div class="section-title"><div><span class="eyebrow">Quick access</span><h2>Registers at a glance</h2><p>Jump straight to high-use modules</p></div></div><div class="hse-register-list">${moduleVolume.map(x=>`<button data-go="${x.key}"><span class="icon-square">${icon(x.icon,14)}</span><span>${esc(x.label)}</span><strong>${fmtNum(x.count)}</strong>${icon('chevron',13)}</button>`).join('')}</div></section></div>
      <section class="card panel hse-recent-panel"><div class="section-title"><div><span class="eyebrow">Latest activity</span><h2>Recently recorded</h2><p>Latest records available in this company workspace</p></div><button class="btn small" data-go="observations">Open registers</button></div>${recent.length?`<div class="hse-recent-list">${recent.map(r=>`<button data-detail="${r.id}"><span class="hse-recent-icon">${icon(MODULES[r.module]?.icon||'clipboard',15)}</span><span class="hse-recent-main"><b>${esc(r.summary||MODULES[r.module]?.singular||r.module)}</b><small>${esc(r.reference_no||'No reference')} · ${esc(MODULES[r.module]?.label||r.module)}</small></span><span class="hse-recent-date">${fmtDate(r.event_date)}</span><span class="badge ${esc(r.status||'open')}">${esc(String(r.status||'open').replaceAll('_',' '))}</span>${icon('chevron',13)}</button>`).join('')}</div>`:'<div class="empty"><strong>No records yet</strong>When records are added, the latest activity will appear here.</div>'}</section>`;
    document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{state.dashboardPeriod=Number(b.dataset.period);dashboard()}));
    wirePageEvents();
  }

  function reportsPage(){
    const from=document.getElementById('report-from')?.value||addMonthsISO(today(),-5),to=document.getElementById('report-to')?.value||today();
    const moduleFilter=document.getElementById('report-module')?.value||state.reportModule||'all';const meta=state.reportMeta||{};
    const rows=state.records.filter(r=>(r.event_date||'')>=from&&(r.event_date||'')<=to&&(moduleFilter==='all'||r.module===moduleFilter));const count=m=>rows.filter(r=>r.module===m).length;
    const actions=rows.filter(r=>r.module==='actions'),closed=actions.filter(r=>r.status==='closed').length,high=rows.filter(r=>r.module==='risk'&&['High','Extreme'].includes(r.data?.level)).length;
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-go="management">Management overview</button><button class="btn" id="report-csv">${icon('download',14)} Export report CSV</button><button class="btn primary" id="report-pdf">${icon('file',14)} Print / Save PDF</button>`)}<section class="card panel"><div class="section-title"><div><h2>Reporting period</h2><p>Choose the period, then export the visible company records as a report.</p></div></div><div class="report-period-presets" role="group" aria-label="Quick reporting periods">${[[1,'Monthly'],[3,'3 months'],[6,'6 months'],[12,'12 months / yearly']].map(([n,l])=>`<button type="button" class="btn small" data-report-preset="${n}">${l}</button>`).join('')}</div><div class="form-grid"><div class="field"><label>From date</label><input type="date" id="report-from" value="${esc(from)}"></div><div class="field"><label>To date</label><input type="date" id="report-to" value="${esc(to)}"></div><div class="field"><label>Register / report scope</label><select id="report-module"><option value="all" ${moduleFilter==='all'?'selected':''}>All registers</option>${Object.entries(MODULES).map(([key,m])=>`<option value="${key}" ${moduleFilter===key?'selected':''}>${esc(m.label)}</option>`).join('')}</select></div><div class="field"><label>Report / document number</label><input id="report-number" value="${esc(meta.number||`${(state.activeOrg?.slug||'HSE360').toUpperCase()}-HSE-RPT-${today().replaceAll('-','')}`)}"></div><div class="field"><label>Revision number</label><input id="report-revision" value="${esc(meta.revision||'00')}"></div><div class="field"><label>Issue date</label><input id="report-issue" type="date" value="${esc(meta.issue||today())}"></div><div class="field"><label>Prepared by</label><input id="report-prepared" value="${esc(meta.prepared??(state.profile?.full_name||state.profile?.username||''))}"></div><div class="field"><label>Reviewed by</label><input id="report-reviewed" value="${esc(meta.reviewed||'')}" placeholder="Optional — reviewer"></div><div class="field"><label>Approved by</label><input id="report-approved" value="${esc(meta.approved||'')}" placeholder="Optional — approver"></div></div><p class="muted small">The report uses records already loaded for this active company workspace. A report export is a snapshot, not a signed statutory submission.</p></section><div class="grid-4" style="margin-top:14px">${kpi('Records in period',rows.length,'Selected date range','clipboard')}${kpi('Incidents / accidents',count('incidents')+count('accidents'),'Incident and LTI registers','alert')}${kpi('High / Extreme risks',high,'Risk assessment register','risk')}${kpi('Corrective action closure',actions.length?`${Math.round(closed/actions.length*100)}%`:'—',`${closed} of ${actions.length} actions closed`,'check')}</div><section class="card panel" style="margin-top:14px"><div class="section-title"><div><h2>Report summary by module</h2><p>Actual record counts for the selected period</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Register</th><th>Records</th><th>Open / active</th><th>Closed</th></tr></thead><tbody>${Object.entries(MODULES).map(([key,m])=>{const rr=rows.filter(r=>r.module===key);if(!rr.length)return '';return `<tr><td>${esc(m.label)}</td><td>${rr.length}</td><td>${rr.filter(r=>!['closed','expired'].includes(r.status)).length}</td><td>${rr.filter(r=>r.status==='closed').length}</td></tr>`}).join('')||'<tr><td colspan="4">No records in the selected period.</td></tr>'}</tbody></table></div></section><section class="card panel" style="margin-top:14px"><div class="section-title"><div><h2>Included records</h2><p>${rows.length} records within ${fmtDate(from)} – ${fmtDate(to)}</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Date</th><th>Register</th><th>Status</th><th>Summary</th></tr></thead><tbody>${rows.slice().sort((a,b)=>String(b.event_date).localeCompare(String(a.event_date))).slice(0,300).map(r=>`<tr><td>${esc(r.reference_no)}</td><td>${fmtDate(r.event_date)}</td><td>${esc(MODULES[r.module]?.label||r.module)}</td><td>${esc(roleLabel(r.status))}</td><td>${esc(r.summary||'—')}</td></tr>`).join('')||'<tr><td colspan="5">No records to display.</td></tr>'}</tbody></table></div>${rows.length>300?'<p class="muted small">On-screen preview limited to 300 rows; CSV export includes all records in the selected period.</p>':''}</section>`;
    const range=()=>{const f=document.getElementById('report-from').value,t=document.getElementById('report-to').value,m=document.getElementById('report-module').value;if(!f||!t||f>t){toast('Choose a valid reporting date range.',false);return null}return {f,t,rows:state.records.filter(r=>(r.event_date||'')>=f&&(r.event_date||'')<=t&&(m==='all'||r.module===m)),module:m}};
    document.getElementById('report-from').onchange=()=>reportsPage();document.getElementById('report-to').onchange=()=>reportsPage();document.getElementById('report-module').onchange=e=>{state.reportModule=e.target.value;reportsPage()};[['report-number','number'],['report-revision','revision'],['report-issue','issue'],['report-prepared','prepared'],['report-reviewed','reviewed'],['report-approved','approved']].forEach(([id,key])=>document.getElementById(id)?.addEventListener('input',e=>{state.reportMeta={...(state.reportMeta||{}),[key]:e.target.value}}));
    document.querySelectorAll('[data-report-preset]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.reportPreset),d=new Date();d.setDate(1);d.setMonth(d.getMonth()-Math.max(0,n-1));const f=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;document.getElementById('report-from').value=f;document.getElementById('report-to').value=today();reportsPage()});
    document.getElementById('report-csv').onclick=()=>{const x=range();if(!x)return;const keys=['reference_no','event_date','module','status','department','location','summary','created_by_name'];const csv=[keys.join(','),...x.rows.map(r=>keys.map(k=>csvCell(k==='module'?(MODULES[r.module]?.label||r.module):r[k])).join(','))].join('\n');download(csv,`${document.getElementById('report-number').value||'HSE360-report'}-${x.f}-to-${x.t}.csv`,'text/csv;charset=utf-8');toast('Reporting-period CSV exported.')};
    document.getElementById('report-pdf').onclick=()=>{const x=range();if(!x)return;const org=state.activeOrg||{},num=document.getElementById('report-number').value.trim(),rev=document.getElementById('report-revision').value.trim(),issue=document.getElementById('report-issue').value,prepared=document.getElementById('report-prepared').value.trim(),reviewed=document.getElementById('report-reviewed').value.trim(),approved=document.getElementById('report-approved').value.trim();const body=x.rows.map(r=>`<tr><td>${esc(r.reference_no)}</td><td>${fmtDate(r.event_date)}</td><td>${esc(MODULES[r.module]?.label||r.module)}</td><td>${esc(roleLabel(r.status))}</td><td>${esc(r.summary||'')}</td></tr>`).join('');const w=window.open('','_blank');if(!w){toast('Allow popups to print or save the report as PDF.',false);return}w.opener=null;w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(num||'HSE360 report')}</title><style>body{font:12px Arial,sans-serif;color:#1f2937;margin:24px}header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #159a5b;padding-bottom:14px}header img{max-width:160px;max-height:65px}h1{font-size:21px;margin:0 0 6px}h2{font-size:15px;margin-top:22px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d8dee8;padding:7px;text-align:left;vertical-align:top}th{background:#edf2f7}.meta{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.meta span{border:1px solid #d8dee8;padding:8px}.muted{color:#667085;font-size:10px}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:25px}.signatures div{border:1px solid #d8dee8;padding:10px;min-height:64px}.signatures span{display:block;margin-top:14px;font-size:10px;color:#667085}@page{size:A4 portrait;margin:12mm;@bottom-right{content:'Page ' counter(page) ' of ' counter(pages);font:9px Arial;color:#667085}}@media print{body{margin:0}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><header>${orgLogo(org)?`<img src="${esc(orgLogo(org))}">`:''}<div><div class="muted">${esc(org.legal_name||org.name||'HSE360')}</div><h1>${esc(x.module==='all'?'HSE & IMS Periodic Performance Report':`${MODULES[x.module]?.label||x.module} Report`)}</h1><div>${esc(org.name||'Company workspace')}</div></div></header><div class="meta"><span><b>Document No.:</b> ${esc(num||'—')}</span><span><b>Revision:</b> ${esc(rev||'—')}</span><span><b>Issue date:</b> ${fmtDate(issue)}</span><span><b>Reporting period:</b> ${fmtDate(x.f)} – ${fmtDate(x.t)}</span><span><b>Prepared by:</b> ${esc(prepared||'—')}</span><span><b>Reviewed by:</b> ${esc(reviewed||'Not assigned')}</span><span><b>Approved by:</b> ${esc(approved||'Not approved')}</span></div><h2>Performance summary</h2><p>Total records: ${x.rows.length} · Incidents/accidents: ${x.rows.filter(r=>['incidents','accidents'].includes(r.module)).length} · High/extreme risks: ${x.rows.filter(r=>r.module==='risk'&&['High','Extreme'].includes(r.data?.level)).length} · Actions closed: ${x.rows.filter(r=>r.module==='actions'&&r.status==='closed').length}</p><h2>Register activity</h2><table><thead><tr><th>Reference</th><th>Date</th><th>Register</th><th>Status</th><th>Summary</th></tr></thead><tbody>${body||'<tr><td colspan="5">No records for the selected period.</td></tr>'}</tbody></table><div class="signatures"><div><b>Prepared by</b><span>${esc(prepared||'Name / signature / date')}</span></div><div><b>Reviewed by</b><span>${esc(reviewed||'Name / signature / date')}</span></div><div><b>Approved by</b><span>${esc(approved||'Name / signature / date')}</span></div></div><p class="muted">Generated from HSE360 workspace data. Generating this document does not constitute formal approval. Verify the content, document number, revision, issue date and sign-off before controlled issue.</p><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close()};wirePageEvents();
  }


  // Browser-side extraction and review-before-save import workflow.
  let importDraft = null;
  const IMPORT_LIMIT_ROWS = 200;
  const IMPORT_LIMIT_BYTES = 10 * 1024 * 1024;
  const IMPORT_BASE_FIELDS = [
    ['event_date','Record date'],['location','Location'],['department','Department'],['status','Status'],['summary','Summary / description'],['ignore','Do not import']
  ];
  function importsPage(){
    const permitted=Object.entries(MODULES).filter(([key])=>can(key,'create'));
    if(!permitted.some(([key])=>key===state.importTarget))state.importTarget=permitted[0]?.[0]||'observations';
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" id="import-template">${icon('download',14)} Download CSV template</button>`)}
      <section class="card panel import-intro"><div class="section-title"><div><span class="eyebrow">Safe data onboarding</span><h2>Extract → Review → Map → Import</h2><p>Nothing is saved to HSE360 until you confirm the reviewed rows. Imports use the active company workspace and your existing module permissions.</p></div><span class="badge in_progress">Preview first</span></div>
      <div class="import-steps"><div><b>01</b><span><strong>Select register</strong><small>Choose where the data belongs.</small></span></div><div><b>02</b><span><strong>Extract & map</strong><small>Correct fields and check duplicates.</small></span></div><div><b>03</b><span><strong>Confirm import</strong><small>Rows are created through the audited HSE record RPC.</small></span></div></div>
      <div class="form-grid import-controls"><div class="field"><label>Destination register *</label><select id="import-target">${permitted.map(([key,m])=>`<option value="${key}" ${key===state.importTarget?'selected':''}>${esc(m.label)}</option>`).join('')}</select></div><div class="field"><label>Source file *</label><input id="import-file" type="file" accept=".csv,.txt,.md,.pdf,.docx,.xlsx,.xls,text/csv,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ${permitted.length?'':'disabled'}><small class="muted">CSV, TXT/MD, text-based PDF, DOCX and XLSX/XLS · max 10 MB · max 200 rows per import. A blank date defaults to today; an invalid nonblank date blocks that row.</small></div></div>
      <div class="notice">General imports extract text for review; they do not use semantic AI. For third-party certificates, permits and NOCs, use the dedicated assisted certificate reader below. OCR suggestions are not verified facts: review every field before saving.</div></section>
      <section class="card panel import-intro" id="certificate-reader"><div class="section-title"><div><span class="eyebrow">Certificate assistant</span><h2>Read a certificate, permit or NOC</h2><p>Extract certificate number, document type, issuer and issue/expiry dates from selectable-text PDFs or scanned PDFs using browser-based OCR.</p></div><span class="badge in_progress">Human review required</span></div>
      <div class="form-grid import-controls"><div class="field"><label>Certificate / permit / NOC PDF *</label><input id="cert-file" type="file" accept="application/pdf,.pdf"><small>PDF only · max 10 MB · OCR limited to first 10 pages for performance.</small></div><div class="field"><label>Document processing</label><div class="notice">Text extraction and OCR run in this browser. The PDF is not sent to an AI provider. This feature does not verify authenticity or replace checking the original document.</div></div></div><div id="cert-progress" class="import-result" aria-live="polite"></div>
      <div id="cert-review" hidden><div class="notice">Check and correct every suggested field. Low-confidence or missing fields are intentionally left for manual review.</div><div class="form-grid"><div class="field"><label>Document / certificate type *</label><input id="cert-type" placeholder="e.g. Third-party inspection certificate"></div><div class="field"><label>Certificate / permit number</label><input id="cert-number" placeholder="Number printed on document"></div><div class="field"><label>Issuing authority / agency</label><input id="cert-issuer" placeholder="Inspection agency / authority"></div><div class="field"><label>Issue date</label><input id="cert-issue" type="date"></div><div class="field"><label>Expiry date / valid until</label><input id="cert-expiry" type="date"></div><div class="field"><label>Certificate holder / recipient</label><input id="cert-recipient" placeholder="Person or company named on certificate"></div><div class="field"><label>Responsible person</label><input id="cert-responsible" placeholder="Optional"></div><div class="field"><label>Previous certificate (renewal only)</label><select id="cert-renewal-of"><option value="">New / not linked to an earlier record</option></select><small class="muted">Choose the prior record if this document renews or replaces an existing certificate.</small></div><div class="field full"><label>Evidence / source file name</label><input id="cert-evidence" readonly></div><div class="field full"><label>Extracted text (review reference)</label><textarea id="cert-text" rows="5" readonly></textarea></div></div><div id="cert-validation" class="notice"></div><div class="setting-actions"><button class="btn" id="cert-reset" type="button">Clear review</button><button class="btn primary" id="cert-save" type="button">Save reviewed certificate</button></div><p class="muted small">Saving uploads the original PDF to the active company’s private HSE360 attachment bucket and links it to the certificate record. Only authorised company members can request access. The original filename and size are retained with the record.</p></div></section>
      <div id="import-workspace"></div><section class="card panel import-help"><h3>Important controls</h3><p>Bulk import creates new records; it does not overwrite existing records. Exact duplicates matching register, date, location and summary are skipped by default. Work permits imported in bulk are always saved as <strong>Draft</strong> and must complete the normal permit approval process. Verify dates, units, record type and company context before confirming.</p></section>`;
    document.getElementById('import-target')?.addEventListener('change',e=>{state.importTarget=e.target.value;if(importDraft){importDraft.mapping=defaultImportMapping(importDraft.headers,state.importTarget);renderImportPreview()}});
    document.getElementById('import-file')?.addEventListener('change',e=>handleImportFile(e.target.files?.[0]));
    document.getElementById('cert-file')?.addEventListener('change',e=>handleCertificatePDF(e.target.files?.[0]));
    document.getElementById('cert-save')?.addEventListener('click',saveReviewedCertificate);
    document.getElementById('cert-reset')?.addEventListener('click',resetCertificateReview);
    document.getElementById('import-template')?.addEventListener('click',()=>{const headers=['event_date','location','department','status','summary','responsible','due_date','remarks'];download([headers.join(','),['2026-10-01','CNC Rod Area','HSE','open','Example record - replace this row','Responsible person','2026-10-15','Template only; do not import unchanged'].map(csvCell).join(',')].join('\n'),'HSE360-import-template.csv','text/csv;charset=utf-8')});
    renderImportPreview();wirePageEvents();
  }
  // Certificate reader: selectable PDF text first, browser-side OCR as a fallback.
  const CERT_LIMIT_BYTES = 10 * 1024 * 1024;
  let certificateSourceName = '';
  let certificateSourceFile = null;
  function validateCertificatePDF(file){
    if(!file)return 'Select the original certificate PDF before saving.';
    if(!Number.isFinite(Number(file.size))||Number(file.size)<=0)return 'The selected PDF is empty or unreadable.';
    if(Number(file.size)>CERT_LIMIT_BYTES)return 'PDF exceeds 10 MB. Reduce the file size and retry.';
    if(!/\.pdf$/i.test(String(file.name||'')))return 'Select a PDF file.';
    return '';
  }
  function certificateAttachmentPath(orgId,userId,fileName,uuid){
    const org=String(orgId||'').trim(),user=String(userId||'').trim(),token=String(uuid||'').trim();
    if(!org||!user||!token)throw new Error('The active company, signed-in user or upload token is missing.');
    const safe=String(fileName||'certificate.pdf').replace(/[^a-zA-Z0-9._-]/g,'_')||'certificate.pdf';
    return `${org}/${user}/${token}-${safe}`;
  }
  function normalizeCertificateKey(value){return String(value||'').toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
  function findDuplicateCertificate(candidate,records){
    const c=candidate||{},cn=normalizeCertificateKey(c.document_no),ct=normalizeCertificateKey(c.document_name),ci=normalizeCertificateKey(c.authority),cIssue=String(c.issue_date||'').slice(0,10),cExpiry=String(c.expiry_date||'').slice(0,10);
    return (records||[]).find(r=>{
      if(r?.module!=='licenses')return false;
      const d=r.data||{},rn=normalizeCertificateKey(d.document_no),rt=normalizeCertificateKey(d.document_name||r.summary),ri=normalizeCertificateKey(d.authority),rIssue=String(d.issue_date||'').slice(0,10),rExpiry=String(d.expiry_date||'').slice(0,10);
      const sameIssuer=!!ci&&!!ri&&ci===ri;
      if(cn&&rn&&cn===rn&&(!ci||!ri||sameIssuer)){
        if(cExpiry&&rExpiry&&cExpiry===rExpiry)return r;
        if(!cExpiry&&!rExpiry&&cIssue&&rIssue&&cIssue===rIssue)return r;
      }
      if((!cn||!rn)&&ct&&rt&&ct===rt&&sameIssuer){if(cExpiry&&rExpiry&&cExpiry===rExpiry)return r;if(!cExpiry&&!rExpiry&&cIssue&&rIssue&&cIssue===rIssue)return r}
      return false;
    })||null;
  }
  function certificateRenewalRelations(record,records){
    if(!record||record.module!=='licenses')return {predecessor:null,successors:[]};
    const d=record.data||{},all=(records||[]).filter(r=>r&&r.module==='licenses'&&r.id!==record.id);
    const predecessor=all.find(r=>(d.renewal_of_record_id&&r.id===d.renewal_of_record_id)||(d.renewal_of_reference&&r.reference_no===d.renewal_of_reference))||null;
    const successors=all.filter(r=>r.data?.renewal_of_record_id===record.id||r.data?.renewal_of_reference===record.reference_no).sort((a,b)=>String(a.data?.issue_date||a.event_date||'').localeCompare(String(b.data?.issue_date||b.event_date||'')));
    return {predecessor,successors};
  }
  function certificateIsSuperseded(record,records){
    if(!record||record.module!=='licenses')return false;
    return (records||[]).some(r=>r&&r.module==='licenses'&&r.id!==record.id&&(r.data?.renewal_of_record_id===record.id||r.data?.renewal_of_reference===record.reference_no));
  }
  function certificateRegisterRenewalText(record,records){
    if(record?.data?.renewal_of_reference)return `Renewal of ${record.data.renewal_of_reference}`;
    const successor=(records||[]).find(r=>r&&r.module==='licenses'&&r.id!==record?.id&&(r.data?.renewal_of_record_id===record?.id||r.data?.renewal_of_reference===record?.reference_no));
    return successor?`Superseded by ${successor.reference_no}`:'Original / unlinked';
  }
  function certificateDateISO(raw){
    let x=String(raw||'').trim().replace(/\b(\d{1,2})(st|nd|rd|th)\b/ig,'$1'); if(!x)return '';
    let m=x.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if(m){const y=+m[1],mo=+m[2],d=+m[3];return validISODate(y,mo,d)}
    m=x.match(/\b(\d{1,2})[/ .\-](\d{1,2})[/ .\-](\d{4})\b/);
    if(m){const a=+m[1],b=+m[2],y=+m[3];if(a>12&&b<=12)return validISODate(y,b,a);if(a<=12&&b>12)return validISODate(y,a,b);if(a<=12&&b<=12)return validISODate(y,b,a);return ''}
    const months={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
    m=x.match(/\b(\d{1,2})[\s./-]+([A-Za-z]{3,9})[,\s./-]+(\d{4})\b/);if(m&&months[m[2].toLowerCase()])return validISODate(+m[3],months[m[2].toLowerCase()],+m[1]);
    m=x.match(/\b([A-Za-z]{3,9})[,\s./-]+(\d{1,2})(?:st|nd|rd|th)?[,\s./-]+(\d{4})\b/);if(m&&months[m[1].toLowerCase()])return validISODate(+m[3],months[m[1].toLowerCase()],+m[2]);
    return '';
  }
  function validISODate(y,mo,d){const dt=new Date(Date.UTC(y,mo-1,d));return y>=1900&&dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d?`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:''}
  function certificateOCRConfidenceStatus(confidence){if(confidence===null||confidence===undefined||confidence==='')return 'unavailable';const n=Number(confidence);if(!Number.isFinite(n))return 'unavailable';return n<45?'low':n<70?'moderate':'higher'}
  function pdfTextItemsToLines(items){
    const atoms=(items||[]).filter(i=>String(i?.str||'').trim()).map(i=>({text:String(i.str).replace(/\s+/g,' ').trim(),x:Number(i.transform?.[4]||0),y:Number(i.transform?.[5]||0),height:Math.abs(Number(i.height||i.transform?.[3]||0))}));
    atoms.sort((a,b)=>b.y-a.y||a.x-b.x);
    const rows=[];
    for(const atom of atoms){let row=rows.find(r=>Math.abs(r.y-atom.y)<=Math.max(2.5,Math.min(4.5,(r.height+atom.height)*0.22)));if(!row){row={y:atom.y,height:atom.height,atoms:[]};rows.push(row)}row.atoms.push(atom);row.height=Math.max(row.height,atom.height)}
    return rows.sort((a,b)=>b.y-a.y).map(r=>r.atoms.sort((a,b)=>a.x-b.x).map(a=>a.text).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
  }
  function certificateTextLines(text){return String(text||'').replace(/\r/g,'\n').split(/\n+/).map(s=>s.replace(/[\t ]+/g,' ').trim()).filter(Boolean)}
  function certificateTextQuality(text){
    const x=String(text||'').trim(),compact=x.replace(/\s/g,'');if(!compact)return 0;
    const words=x.match(/[A-Za-z]{3,}/g)||[],tokens=x.match(/[A-Za-z]{2,}|\d{2,}/g)||[],alphaNum=(compact.match(/[A-Za-z0-9]/g)||[]).length,ratio=alphaNum/Math.max(1,compact.length),lines=certificateTextLines(x);
    const noisyLines=lines.filter(line=>{const c=line.replace(/\s/g,'');return c.length>=4&&(c.match(/[A-Za-z0-9]/g)||[]).length/c.length<0.4}).length;
    return Math.max(0,Math.round(Math.min(30,words.length*2)+Math.min(25,tokens.length)+ratio*35-(lines.length?noisyLines/lines.length*20:0)));
  }
  function certificateTextNeedsOCR(text){const x=String(text||'').trim();return x.replace(/\s/g,'').length<80||certificateTextQuality(x)<50} 
  function trimCertificateFieldValue(value){
    let v=String(value||'').trim().replace(/^[\s:;|,._—–\-]+/,'').replace(/[\s:;|,._—–\-]+$/,'');
    const nextField=/\b(?:certificate\s*(?:no\.?|number|#|id)|cert\.?\s*(?:no\.?|number|#)|permit\s*(?:no\.?|number|#)|licen[cs]e\s*(?:no\.?|number|#)|date\s+of\s+issue|issue\s+date|issued\s+on|date\s+issued|expiry\s+date|expiration\s+date|date\s+of\s+expiration|valid\s+(?:until|till|through|up\s+to)|validity\s+(?:until|date)|date\s+of\s+expiry|expires\s+on|issued\s+(?:by|from)|certified\s+by|conducted\s+by|inspected\s+by|inspection\s+agency|certification\s+body|certifying\s+body|issuing\s+authority|responsible\s+person)\b/i;
    const cut=v.match(nextField);if(cut&&cut.index>0)v=v.slice(0,cut.index).trim();
    return v.replace(/^[^A-Za-z0-9]+/,'').replace(/[^A-Za-z0-9)\].]+$/,'').trim();
  }
  function plausibleCertificateIssuer(value){
    const v=trimCertificateFieldValue(value);if(!v)return false;
    const letters=(v.match(/[A-Za-z]/g)||[]).length,visible=(v.match(/[A-Za-z0-9]/g)||[]).length;
    const tokens=v.match(/[A-Za-z]+/g)||[],meaningful=tokens.filter(t=>t.length>=3).length,short=tokens.filter(t=>t.length<=2).length;
    return letters>=3&&visible>=3&&letters/Math.max(1,v.replace(/\s/g,'').length)>=0.55&&!/[<>|]{2}/.test(v)&&!/^\d+$/.test(v)&&!(tokens.length>=3&&meaningful<2&&short>=2)&&!/^(?:presented\s+to|awarded\s+to|issued\s+(?:by|from)|certified\s+by|conducted\s+by|inspected\s+by|inspection\s+agency|certification\s+body|certifying\s+body|issuing\s+authority|certificate\s+provider|customer|recipient|equipment|location|issue\s+date|expiry\s+date|valid\s+(?:until|till)|certificate\s+no)/i.test(v);
  }
  function isCertificateLabelOrHeading(line){return /^(?:presented\s+to|awarded\s+to|name\s+of\s+(?:the\s+)?(?:client|customer|recipient)|customer|recipient|client|equipment|asset\s+(?:name|id)|location|issue\s+date|date\s+of\s+issue|issued\s+on|expiry\s+date|expiration\s+date|date\s+of\s+expiry|issued\s+from|certified\s+by|conducted\s+by|inspected\s+by|certificate\s+provider|inspection\s+company|name\s+of\s+(?:the\s+)?inspection\s+agency|valid\s+(?:until|till|through|up\s+to)|validity\s+(?:until|date)|issued\s+(?:by|from)|certified\s+by|conducted\s+by|inspected\s+by|inspection\s+agency|certification\s+body|certifying\s+body|issuing\s+authority|issuer|certificate\s*(?:no\.?|number|#|id)|cert\.?\s*(?:no\.?|number|#)|permit\s*(?:no\.?|number|#)|serial\s*(?:no\.?|number)|reference\s*(?:no\.?|number|#))\b/i.test(String(line||'').trim())}
  function plausibleCertificateRecipient(value){
    const v=trimCertificateFieldValue(value);if(!v)return false;
    const letters=(v.match(/[A-Za-z]/g)||[]).length,chars=v.replace(/\s/g,''),tokens=v.match(/[A-Za-z]+/g)||[],short=tokens.filter(t=>t.length<=2).length;
    return letters>=3&&letters/Math.max(1,chars.length)>=0.65&&!(tokens.length>=3&&short>=2&&short/tokens.length>0.4)&&!/^(?:presented\s+to|awarded\s+to|issued\s+to|certificate|this\s+is\s+to\s+certify|customised\s+copper\s+products)$/i.test(v);
  }
  function firstCertificateLabelValue(lines,labelPattern,kind){
    for(let i=0;i<lines.length;i++){
      const line=lines[i],m=line.match(labelPattern);if(!m)continue;
      const inline=trimCertificateFieldValue(line.slice((m.index||0)+m[0].length));
      const candidates=[];if(inline)candidates.push(inline);
      if(i+1<lines.length&&!isCertificateLabelOrHeading(lines[i+1]))candidates.push(trimCertificateFieldValue(lines[i+1]));
      for(const candidate of candidates){
        if(!candidate)continue;
        if(kind==='date'&&certificateDateISO(candidate))return candidate.slice(0,100);
        if(kind==='issuer'&&plausibleCertificateIssuer(candidate))return candidate.slice(0,100);
        if(kind==='recipient'&&plausibleCertificateRecipient(candidate))return candidate.slice(0,100);
        if(kind==='number'){
          const n=candidate.match(/[A-Z0-9][A-Z0-9\/._-]{3,}/i)?.[0]||'';
          if(n&&/[A-Z0-9]/i.test(n)&&!/^\d{1,3}$/.test(n))return n.slice(0,80);
        }
      }
    }
    return '';
  }
  function guessCertificateFields(text,fileName){
    const lines=certificateTextLines(text),flat=lines.join(' ');
    const number=firstCertificateLabelValue(lines,/(?:certificate|cert\.?|permit|licen[cs]e|approval|reference|ref\.?|document|registration)\s*(?:no\.?|number|#|id)\s*[:#\-]?\s*/i,'number')||firstCertificateLabelValue(lines,/serial\s*(?:no\.?|number)|certificate\s+reference\s*(?:no\.?|number)?\s*[:#\-]?\s*/i,'number');
    const issueRaw=firstCertificateLabelValue(lines,/(?:date\s+of\s+issue|issue\s+date|issued\s+on|date\s+issued|issued\s+date)\s*[:\-]?\s*/i,'date');
    const expiryRaw=firstCertificateLabelValue(lines,/(?:expiry\s+date|expiration\s+date|date\s+of\s+expiration|valid\s+until|valid\s+till|valid\s+through|valid\s+up\s+to|validity\s+(?:until|date)|date\s+of\s+expiry|expires\s+on|expiry)\s*[:\-]?\s*/i,'date');
    const issuerLabel=/(?:issued\s+by|issued\s+from|certified\s+by|conducted\s+by|inspected\s+by|inspection\s+agency|name\s+of\s+(?:the\s+)?inspection\s+agency|certification\s+body|certifying\s+body|approved\s+by|issuing\s+authority|issuer|certificate\s+provider|inspection\s+company)\s*[:\-]?\s*/i;
    let issuer=firstCertificateLabelValue(lines,issuerLabel,'issuer');
    let issuerLabelFound=lines.some(line=>issuerLabel.test(line));
    if(issuer&&!plausibleCertificateIssuer(issuer))issuer='';
    const recipientLabel=/\b(?:presented\s+to|awarded\s+to|granted\s+to|issued\s+to|holder(?:\s+name)?|recipient(?:\s+name)?|name\s+of\s+(?:the\s+)?(?:holder|recipient)|issued\s+in\s+the\s+name\s+of)\b\s*[:\-]?\s*/i;
    const recipient=firstCertificateLabelValue(lines,recipientLabel,'recipient');
    const recipientLabelFound=lines.some(line=>recipientLabel.test(line));
    let title='',titleSource='document text';
    const fixedTitles=[
      [/third[ .-]*party\s+inspection\s+certificate/i,'Third-party Inspection Certificate'],
      [/lifting\s+equipment\s+inspection\s+certificate/i,'Lifting Equipment Inspection Certificate'],
      [/fire\s+system\s+certificate/i,'Fire System Certificate'],
      [/calibration\s+certificate/i,'Calibration Certificate'],
      [/test\s+certificate/i,'Test Certificate'],
      [/conformity\s+certificate/i,'Conformity Certificate'],
      [/permit\s+to\s+operate/i,'Permit to Operate'],
      [/no\s+objection\s+certificate|\bNOC\b/i,'No Objection Certificate (NOC)'],
      [/certificate\s+of\s+(appreciation|recognition|achievement|completion|attendance|training|competence|competency|excellence|participation)/i,'Certificate of Appreciation / Recognition']
    ];
    for(const [re,label] of fixedTitles){if(re.test(flat)){title=label;break}}
    const fileTitle=String(fileName||'').replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
    const awardClue=/(?:presented\s+to|awarded\s+to|certificate\s+of\s+appreciation|recognition\s+award)/i.test(flat)||/\bhse[ _-]*hero\b|\bappreciation\b|\baward\b/i.test(fileTitle);
    if(!title&&awardClue){title='Certificate of Appreciation / Recognition';titleSource='award wording';}
    if(!title){title=fileTitle.length>2?fileTitle.slice(0,120):'Third-party certificate / permit / NOC';titleSource='filename';}
    return {number,issueDate:certificateDateISO(issueRaw),expiryDate:certificateDateISO(expiryRaw),title,issuer,recipient,issueRaw,expiryRaw,titleSource,issuerLabelFound,issuerRejected:issuerLabelFound&&!issuer,recipientLabelFound,recipientRejected:recipientLabelFound&&!recipient};
  }
  async function extractPdfText(file){
    const lib=window.pdfjsLib;if(!lib)throw new Error('PDF reader library is unavailable. Refresh the page and try again.');
    lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;const pages=[];
    for(let i=1;i<=Math.min(pdf.numPages,10);i++){const page=await pdf.getPage(i);const c=await page.getTextContent();pages.push(pdfTextItemsToLines(c.items))}
    return {pdf,text:pages.join('\n\n').trim(),pagesRead:Math.min(pdf.numPages,10),totalPages:pdf.numPages};
  }
  async function ocrPdfPages(pdf,pageCount,progress){
    if(!window.Tesseract?.createWorker)throw new Error('OCR engine did not load. Check internet access, refresh the page and retry.');
    const worker=await window.Tesseract.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')progress(`OCR in progress: ${Math.round((m.progress||0)*100)}% of current page…`)}});
    try{
      const runPass=async mode=>{
        await worker.setParameters({tessedit_pageseg_mode:String(mode),preserve_interword_spaces:'1'});
        const texts=[],confidences=[];
        for(let i=1;i<=pageCount;i++){
          progress(`${mode==='11'?'OCR':'Alternative OCR'} — page ${i} of ${pageCount}…`);
          const page=await pdf.getPage(i),viewport=page.getViewport({scale:2.0}),canvas=document.createElement('canvas');
          canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          const ctx=canvas.getContext('2d',{willReadFrequently:false});
          await page.render({canvasContext:ctx,viewport}).promise;
          const result=await worker.recognize(canvas);texts.push(result.data.text||'');
          if(result.data.confidence!==null&&result.data.confidence!==undefined&&Number.isFinite(Number(result.data.confidence)))confidences.push(Number(result.data.confidence));
          canvas.width=0;canvas.height=0;
        }
        return {text:texts.join('\n\n').trim(),confidence:confidences.length?confidences.reduce((a,b)=>a+b,0)/confidences.length:null,mode};
      };
      // Sparse-text mode handles certificate layouts with separated labels. Retry as a text block only for low-confidence short documents.
      const primary=await runPass('11');
      if(pageCount>3||(Number.isFinite(primary.confidence)&&primary.confidence>=45&&certificateTextQuality(primary.text)>=45))return primary;
      progress('First OCR pass had low confidence; trying an alternative layout…');
      const alternate=await runPass('6');
      const score=r=>certificateTextQuality(r.text)+(Number.isFinite(r.confidence)?r.confidence*0.25:0);
      return alternate.text&&score(alternate)>score(primary)+2?alternate:primary;
    }finally{await worker.terminate()}
  }
  async function handleCertificatePDF(file){
    const progress=document.getElementById('cert-progress'),review=document.getElementById('cert-review');if(review)review.hidden=true;certificateSourceFile=null;certificateSourceName='';if(!file)return;
    if(!can('licenses','create')){toast('You do not have create permission for Licences & Certificates.',false);return}
    const fileIssue=validateCertificatePDF(file);if(fileIssue){toast(fileIssue,false);if(progress)progress.textContent=fileIssue;return}
    const setProgress=t=>{if(progress)progress.textContent=t};certificateSourceName=file.name;setProgress('Reading PDF text…');
    try{
      const {pdf,text,pagesRead,totalPages}=await extractPdfText(file);let extracted=text,method='selectable PDF text',ocrConfidence=null,extractionNote='';
      if(certificateTextNeedsOCR(extracted)){const originalText=extracted,originalQuality=certificateTextQuality(originalText);try{const ocr=await ocrPdfPages(pdf,pagesRead,setProgress),ocrQuality=certificateTextQuality(ocr.text);if(ocr.text.trim()&&(!originalText.trim()||originalText.replace(/\s/g,'').length<80||ocrQuality>=originalQuality+4)){extracted=ocr.text;ocrConfidence=ocr.confidence;method='browser OCR'}else{method='selectable PDF text';extractionNote=`The selectable PDF text was retained because OCR did not produce a clearer result (text quality score ${originalQuality} vs OCR ${ocrQuality}). Review all fields manually.`;setProgress(extractionNote)}}catch(ocrError){if(originalText.replace(/\s/g,'').length<80)throw ocrError;method='selectable PDF text';extractionNote=`OCR fallback unavailable; using the existing PDF text. ${ocrError.message||ocrError}`;setProgress(extractionNote)}}
      if(!extracted.trim())throw new Error('No readable text was detected. Try a clearer scan or enter the details manually.');
      const guess=guessCertificateFields(extracted,file.name);certificateSourceFile=file;certificateSourceName=file.name;
      document.getElementById('cert-type').value=guess.title;document.getElementById('cert-number').value=guess.number;document.getElementById('cert-issuer').value=guess.issuer;document.getElementById('cert-issue').value=guess.issueDate;document.getElementById('cert-expiry').value=guess.expiryDate;document.getElementById('cert-recipient').value=guess.recipient;document.getElementById('cert-responsible').value='';document.getElementById('cert-evidence').value=file.name;document.getElementById('cert-text').value=extracted.slice(0,20000);
      populateCertificateRenewalOptions();
      if(review)review.hidden=false;
      const notes=[];if(extractionNote)notes.push(extractionNote);if(method==='browser OCR'&&certificateOCRConfidenceStatus(ocrConfidence)==='low')notes.push(`Low OCR confidence (${Math.round(ocrConfidence)}%); check all fields manually`);else if(method==='browser OCR'&&certificateOCRConfidenceStatus(ocrConfidence)==='moderate')notes.push(`Moderate OCR confidence (${Math.round(ocrConfidence)}%); check all fields manually`);if(guess.titleSource==='filename')notes.push('Document type was suggested from the filename, not confidently detected from the document');if(!guess.number)notes.push('Certificate number not confidently detected');if(!guess.issueDate)notes.push('Issue date needs manual entry');if(!guess.expiryDate)notes.push('Expiry date needs manual entry');if(!guess.issuer)notes.push(guess.issuerRejected?'Issuer suggestion was ignored because the detected text looked like OCR noise':'Issuer needs manual entry');if(guess.recipientLabelFound&&!guess.recipient)notes.push('Certificate holder / recipient was not read confidently; enter it manually');
      const validation=document.getElementById('cert-validation');validation.textContent=`Extraction method: ${method}${method==='browser OCR'&&Number.isFinite(ocrConfidence)?` (average OCR confidence ${Math.round(ocrConfidence)}%)`:''}. ${pagesRead} of ${totalPages} page(s) processed. ${notes.length?notes.join('. ')+'.':''} Ambiguous numeric dates default to DD/MM/YYYY for UAE records; verify every date against the original PDF. OCR does not validate authenticity. Please compare with the original PDF before saving.`;
      setProgress('Extraction ready for review. Nothing has been saved yet.');
    }catch(e){setProgress(`Could not extract this PDF: ${e.message||e}`);toast('Certificate extraction needs attention.',false)}
  }
  function populateCertificateRenewalOptions(selectedId=''){
    const select=document.getElementById('cert-renewal-of');if(!select)return;
    const rows=recs('licenses').slice().sort((a,b)=>String(b.data?.issue_date||b.event_date||b.created_at||'').localeCompare(String(a.data?.issue_date||a.event_date||a.created_at||'')));
    select.innerHTML='<option value="">New / not linked to an earlier record</option>'+rows.map(r=>{const d=r.data||{},name=d.document_name||r.summary||'Certificate',issuer=d.authority?` · ${d.authority}`:'',expiry=d.expiry_date?` · expires ${d.expiry_date}`:'';return `<option value="${esc(r.id)}">${esc(r.reference_no)} · ${esc(name)}${esc(issuer)}${esc(expiry)}</option>`}).join('');
    if(selectedId&&rows.some(r=>r.id===selectedId))select.value=selectedId;
  }
  async function saveReviewedCertificate(){
    if(!can('licenses','create')){toast('You do not have permission to create certificate records.',false);return}
    const fileIssue=validateCertificatePDF(certificateSourceFile);if(fileIssue){toast(fileIssue,false);return}
    const value=id=>document.getElementById(id)?.value.trim()||'';const title=value('cert-type'),number=value('cert-number'),issuer=value('cert-issuer'),issue=value('cert-issue'),expiry=value('cert-expiry'),recipient=value('cert-recipient'),responsible=value('cert-responsible'),evidence=value('cert-evidence'),textValue=value('cert-text'),predecessorId=value('cert-renewal-of');
    if(!title){toast('Enter the document / certificate type before saving.',false);return}
    if(evidence!==certificateSourceFile.name){toast('The source filename no longer matches the selected PDF. Select the PDF and review it again.',false);return}
    if(issue&&expiry&&expiry<issue){toast('Expiry date cannot be earlier than issue date.',false);return}
    const predecessor=predecessorId?recs('licenses').find(r=>r.id===predecessorId):null;
    if(predecessorId&&!predecessor){toast('The selected previous certificate is no longer available in this company register. Refresh and select it again.',false);return}
    if(predecessor&&issue&&predecessor.data?.issue_date&&issue<predecessor.data.issue_date){toast('The renewal issue date cannot be earlier than the selected previous certificate issue date.',false);return}
    const duplicate=findDuplicateCertificate({document_name:title,authority:issuer,document_no:number,issue_date:issue,expiry_date:expiry},recs('licenses'));
    if(duplicate){
      const progress=document.getElementById('cert-progress');if(progress)progress.innerHTML=`<strong>Possible duplicate certificate detected.</strong> ${esc(duplicate.reference_no)} already matches this certificate number / issuer / validity. No PDF was uploaded. <button class="btn" type="button" id="cert-open-duplicate">Open existing record</button>`;
      document.getElementById('cert-open-duplicate')?.addEventListener('click',()=>{document.getElementById('drawer')?.remove();detail(duplicate.id)});
      toast('Possible duplicate found. Review the existing record before uploading again.',false);return;
    }
    const todayISO=today(),expired=expiry&&expiry<todayISO,within=expiry&&expiry<=`${new Date(Date.now()+60*86400000).getFullYear()}-${String(new Date(Date.now()+60*86400000).getMonth()+1).padStart(2,'0')}-${String(new Date(Date.now()+60*86400000).getDate()).padStart(2,'0')}`;
    const data={document_name:title,authority:issuer,document_no:number,issue_date:issue,expiry_date:expiry,recipient,compliance_status:expired?'Expired':within?'Due for Renewal':'Compliant',renewal_status:expired?'Renewal in Progress':'Open',renewal_record_type:predecessor?'Renewal':'Original',renewal_of_reference:predecessor?.reference_no||'',renewal_of_record_id:predecessor?.id||'',related_reference:predecessor?.reference_no||'',responsible,evidence,source_file_name:evidence,source_file_size:certificateSourceFile.size,source_file_type:'application/pdf',extraction_method:'browser_pdf_text_or_ocr',extracted_text_excerpt:textValue.slice(0,4000),extraction_reviewed_by:state.session?.user?.id||null,extraction_reviewed_at:new Date().toISOString()};
    const btn=document.getElementById('cert-save'),progress=document.getElementById('cert-progress');if(btn){btn.disabled=true;btn.textContent='Uploading PDF…'}
    let uploadedPath=null,recordSaved=false;
    try{
      const orgId=activeOrgId(),userId=state.session?.user?.id;if(!orgId||!userId)throw new Error('Your active company or sign-in session is missing. Please sign in again.');
      uploadedPath=certificateAttachmentPath(orgId,userId,certificateSourceFile.name,crypto.randomUUID());
      const up=await sb.storage.from('hse-attachments').upload(uploadedPath,certificateSourceFile,{upsert:false,contentType:'application/pdf',cacheControl:'3600'});
      if(up.error){uploadedPath=null;throw new Error(`Private PDF upload failed: ${up.error.message||up.error}. No certificate record was saved.`)}
      const attachment={path:uploadedPath,name:certificateSourceFile.name,size:certificateSourceFile.size,type:'application/pdf'};
      if(btn)btn.textContent='Saving certificate record…';
      const {error}=await sb.rpc('create_hse_record',{p_org_id:orgId,p_module:'licenses',p_event_date:issue||todayISO,p_location:'',p_department:state.membership?.department||state.profile?.department||'',p_status:expired?'expired':'open',p_summary:title+(number?` · ${number}`:''),p_data:data,p_attachment:attachment});
      if(error)throw new Error(error.message||String(error));
      recordSaved=true;uploadedPath=null;certificateSourceFile=null;certificateSourceName='';const sourceInput=document.getElementById('cert-file');if(sourceInput)sourceInput.value=''; // Record now owns the attachment; clear the in-memory PDF.
      toast('Reviewed certificate and original PDF saved.');if(progress)progress.textContent='Saved successfully. The original PDF is stored in private company attachment storage and linked to the certificate record.';if(btn){btn.textContent='Saved';}await loadRecords();renderPage();updateNotificationCount();
    }catch(e){
      let cleanupConfirmed=true;if(uploadedPath){try{const cleanup=await sb.storage.from('hse-attachments').remove([uploadedPath]);cleanupConfirmed=!cleanup.error}catch(cleanupError){cleanupConfirmed=false}}
      if(recordSaved){if(progress)progress.textContent='The certificate and PDF were saved, but the register refresh failed. Reopen Licences & Certificates or reload the page to confirm the record.';toast('Certificate and PDF saved, but the register refresh failed.',false);if(btn){btn.disabled=true;btn.textContent='Saved';}return}
      if(progress)progress.textContent=cleanupConfirmed?`Certificate was not saved. ${e.message||e}`:`Certificate was not saved. Upload cleanup could not be confirmed; inform an administrator to check for an orphaned file. Details: ${e.message||e}`;
      toast(`Could not save certificate: ${e.message||e}`,false);if(btn){btn.disabled=false;btn.textContent='Save reviewed certificate'}
    }
  }
  function resetCertificateReview(){certificateSourceName='';certificateSourceFile=null;const f=document.getElementById('cert-file');if(f)f.value='';const recipient=document.getElementById('cert-recipient');if(recipient)recipient.value='';const r=document.getElementById('cert-review');if(r)r.hidden=true;const select=document.getElementById('cert-renewal-of');if(select)select.value='';const p=document.getElementById('cert-progress');if(p)p.textContent='Choose a PDF to begin. No record is saved until you confirm.'}

  function normalizeImportHeader(v){return String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')}
  function importCell(v){if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;return String(v??'').trim()}
  function importFieldOptions(module){
    const out=[...IMPORT_BASE_FIELDS];
    const schema=formSchema(module)||[];
    schema.forEach(([id,label])=>{if(!['event_date','location','department'].includes(id)&&!out.some(x=>x[0]===`data:${id}`))out.splice(out.length-1,0,[`data:${id}`,`${label} (${id})`])});
    return out;
  }
  function defaultImportMapping(headers,module){
    const options=importFieldOptions(module);return headers.map(h=>{
      const n=normalizeImportHeader(h);
      if(['extracted_text','text_content','document_text','description','summary','incident_description','observation_description','work_summary','remarks'].includes(n))return 'summary';
      if(['date','event_date','record_date','incident_date'].includes(n))return 'event_date';
      if(options.some(o=>o[0]===`data:${n}`))return `data:${n}`;
      if(['inspection_date','training_date','issue_date','joining_date'].includes(n))return 'event_date';
      if(['location','equipment_location','area','site','work_location'].includes(n))return 'location';
      if(['department','department_name','dept','section'].includes(n))return 'department';
      if(['status','record_status'].includes(n))return 'status';
      if(['summary','description','title','topic','incident','finding'].includes(n))return 'summary';
      const matched=options.find(o=>o[0]===`data:${n}`)||options.find(o=>normalizeImportHeader(o[1].split(' (')[0])===n);
      return matched?matched[0]:(n?`data:${n}`:'ignore');
    });
  }
  async function handleImportFile(file){
    if(!file)return;
    const module=document.getElementById('import-target')?.value||state.importTarget;
    if(!can(module,'create')){toast('You do not have create permission for the selected register.',false);return}
    if(file.size>IMPORT_LIMIT_BYTES){toast('File is larger than 10 MB. Split or reduce the file and try again.',false);return}
    const ext=file.name.split('.').pop().toLowerCase();let headers=[],rows=[],kind='table',warning='';
    try{
      if(['csv'].includes(ext)){
        const parsed=parseCSV(await file.text());if(parsed.length<2)throw new Error('CSV needs a header row and at least one data row.');headers=parsed[0].map((h,i)=>String(h||`column_${i+1}`).trim());rows=parsed.slice(1).map(r=>headers.map((_,i)=>importCell(r[i])));
      }else if(['xlsx','xls'].includes(ext)){
        if(!window.XLSX)throw new Error('Spreadsheet parser did not load. Check internet/CDN access, then refresh the page.');
        const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});const sheetName=wb.SheetNames[0];if(!sheetName)throw new Error('Workbook contains no worksheet.');const matrix=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:false});const nonempty=matrix.filter(r=>Array.isArray(r)&&r.some(c=>String(c??'').trim()!==''));if(nonempty.length<2)throw new Error('The first worksheet needs a header row and at least one data row.');headers=nonempty[0].map((h,i)=>String(h||`column_${i+1}`).trim());rows=nonempty.slice(1).map(r=>headers.map((_,i)=>importCell(r[i])));warning=`Workbook sheet used: ${sheetName}. Only the first non-empty worksheet is imported.`;
      }else if(ext==='docx'){
        if(!window.mammoth)throw new Error('DOCX text extractor did not load. Check internet/CDN access, then refresh the page.');const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});const text=result.value.trim();if(!text)throw new Error('No extractable text was found in this DOCX.');headers=['extracted_text'];rows=[[text.slice(0,100000)]];kind='document';warning='Document text was extracted into one reviewable row. Map the extracted text into a suitable field or edit it before import.';
      }else if(ext==='pdf'){
        const lib=window.pdfjsLib;if(!lib)throw new Error('PDF text extractor did not load. Check internet/CDN access, then refresh the page.');lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';const pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;const pages=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();pages.push(content.items.map(x=>x.str||'').join(' '))}const text=pages.join('\n\n').trim();if(!text)throw new Error('No selectable text found. This PDF may be scanned or image-only; OCR is not configured.');headers=['extracted_text'];rows=[[text.slice(0,100000)]];kind='document';warning=`Text extracted from ${pdf.numPages} PDF page(s). Scanned images are not OCR-processed; manually verify this text.`;
      }else if(['txt','md'].includes(ext)){
        const text=(await file.text()).trim();if(!text)throw new Error('The text file is empty.');if(text.includes('\0'))throw new Error('File does not look like a readable text file.');headers=['extracted_text'];rows=[[text.slice(0,100000)]];kind='document';warning='Text file extracted into one reviewable row. Map or edit the extracted text before import.';
      }else throw new Error('Unsupported file type. Use CSV, TXT, MD, text-based PDF, DOCX, XLSX or XLS.');
      if(!headers.length||!rows.length)throw new Error('No importable rows were detected.');if(headers.length>30)throw new Error('The file has more than 30 columns. Select only the required columns and retry.');if(rows.length>IMPORT_LIMIT_ROWS)throw new Error(`The file contains ${rows.length} rows. The safe review limit is ${IMPORT_LIMIT_ROWS}; split the file into smaller batches so every row can be inspected.`);
      importDraft={fileName:file.name,kind,headers,rows,warning,mapping:defaultImportMapping(headers,module),errors:[],duplicateOverride:false};renderImportPreview();toast(`${headers.length} columns and ${rows.length} data row(s) extracted. Review mappings before import.`);
    }catch(err){toast(err?.message||'Could not extract this file.',false)}
  }
  function importRowModel(row,index,module){
    const out={event_date:'',location:'',department:'',status:'',summary:''},extra={};
    importDraft.headers.forEach((h,i)=>{const target=importDraft.mapping[i]||'ignore',value=importCell(row[i]);if(!value||target==='ignore')return;if(target.startsWith('data:'))extra[target.slice(5)]=value;else out[target]=value});
    const rawEventDate=out.event_date||extra.inspection_date||extra.training_date||extra.issue_date||extra.joining_date||extra.date||'';
    const parsedEventDate=normalizeImportDate(rawEventDate);const eventDate=rawEventDate?parsedEventDate:today();const location=out.location||'';const department=out.department||state.membership?.department||state.profile?.department||'';
    let summary=out.summary||extra.description||extra.topic||extra.hazard||extra.document_title||extra.employee_name||extra.equipment_id||extra.chemical_name||extra.equipment_type||'';
    if(!summary && importDraft.kind==='document')summary=`Extracted document: ${importDraft.fileName}`;
    const status=module==='permits'?'draft':(out.status||'open').toLowerCase().replace(/[\s-]+/g,'_');
    const data={...extra,import_source:importDraft.fileName,import_source_row:index+2};
    return {event_date:eventDate,_rawEventDate:String(rawEventDate||''),location,department,status,summary:String(summary).trim(),data};
  }
  function normalizeImportDate(v){
    const x=String(v||'').trim();if(!x)return '';
    const pack=(y,mo,d)=>{if(y<1900||mo<1||mo>12||d<1||d>31)return '';const dt=new Date(Date.UTC(y,mo-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return '';return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`};
    let m=x.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);if(m)return pack(Number(m[1]),Number(m[2]),Number(m[3]));
    m=x.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(m){let d=Number(m[1]),mo=Number(m[2]),y=Number(m[3]);if(mo>12&&d<=12){const tmp=d;d=mo;mo=tmp}return pack(y,mo,d)}return '';
  }
  function importRowIssues(model,rowNo){const issues=[];if(!model.summary)issues.push(`Row ${rowNo}: Summary is blank; map a summary field or edit a cell.`);if(model._rawEventDate&&!model.event_date)issues.push(`Row ${rowNo}: Date \"${model._rawEventDate}\" is not valid. Use YYYY-MM-DD or DD/MM/YYYY, or clear the date cell to default to today.`);return issues}
  function importDuplicate(model,module,seen){const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');const key=[module,model.event_date,norm(model.location),norm(model.summary)].join('|');if(seen.has(key))return true;seen.add(key);return state.records.some(r=>r.module===module&&(r.event_date||'')===model.event_date&&norm(r.location)===norm(model.location)&&norm(r.summary)===norm(model.summary))}
  function renderImportPreview(){
    const host=document.getElementById('import-workspace');if(!host)return;if(!importDraft){host.innerHTML=`<section class="card panel import-empty"><div class="empty"><strong>Ready for a source file</strong>Choose a supported file above. The extracted values will appear here for review and mapping. No records are created at extraction time.</div></section>`;return}
    const module=document.getElementById('import-target')?.value||state.importTarget;state.importTarget=module;const options=importFieldOptions(module);const models=importDraft.rows.map((r,i)=>importRowModel(r,i,module));const duplicateSeen=new Set();const dup=models.map(m=>importDuplicate(m,module,duplicateSeen));const issuesByRow=models.map((m,i)=>importRowIssues(m,i+2));const errors=issuesByRow.flat();const errorRows=issuesByRow.filter(x=>x.length).length;
    host.innerHTML=`<section class="card panel import-preview"><div class="section-title"><div><span class="eyebrow">Source preview</span><h2>${esc(importDraft.fileName)}</h2><p>${importDraft.rows.length} row(s) · ${importDraft.headers.length} column(s) · ${importDraft.kind==='document'?'document text':'tabular data'}</p></div><button class="btn" id="import-discard">Discard draft</button></div>${importDraft.warning?`<div class="notice">${esc(importDraft.warning)}</div>`:''}<div class="notice">Review every row and choose the destination field for every column. Use “Do not import” for irrelevant columns. Changes here stay in this browser until you confirm.</div>
      <div class="import-preview-wrap"><table class="data-table import-table"><thead><tr>${importDraft.headers.map((h,i)=>`<th><label>${esc(h||`Column ${i+1}`)}</label><select data-import-map="${i}">${options.map(o=>`<option value="${esc(o[0])}" ${importDraft.mapping[i]===o[0]?'selected':''}>${esc(o[1])}</option>`).join('')}${!options.some(o=>o[0]===importDraft.mapping[i])?`<option value="${esc(importDraft.mapping[i])}" selected>Keep as ${esc(importDraft.mapping[i].slice(5))}</option>`:''}</select></th>`).join('')}<th>Check</th></tr></thead><tbody>${importDraft.rows.map((row,ri)=>`<tr>${importDraft.headers.map((h,ci)=>`<td><textarea data-import-cell="${ri}" data-import-col="${ci}" rows="${row[ci]?.length>80?3:1}" aria-label="Row ${ri+2} ${esc(h)}">${esc(row[ci]||'')}</textarea></td>`).join('')}<td><span class="badge ${issuesByRow[ri].length?'open':dup[ri]?'in_progress':'closed'}">${issuesByRow[ri].length?esc(issuesByRow[ri][0].replace(/^Row \d+: /,'')):dup[ri]?'Possible duplicate':'Ready'}</span></td></tr>`).join('')}</tbody></table></div>
      <div class="import-review-summary"><div><strong>${importDraft.rows.length}</strong><span>rows to review</span></div><div><strong>${dup.filter(Boolean).length}</strong><span>possible duplicates (skipped by default)</span></div><div><strong>${errors.length}</strong><span>validation issue(s)</span></div></div><label class="check-row import-duplicate-override"><input type="checkbox" id="import-allow-duplicates" ${importDraft.duplicateOverride?'checked':''}><span>Import possible duplicates anyway (only after I have checked them)</span></label><div id="import-result" class="import-result"></div><div class="setting-actions"><button class="btn" id="import-export-errors">Export validation list</button><button class="btn primary" id="import-confirm" ${errorRows?'disabled':''}>Confirm and import ${importDraft.rows.length-errorRows} row(s)</button></div>
      <p class="muted small">The import uses the active organization ID and audited <code>create_hse_record</code> RPC. A failure on an individual row is reported; successful rows are not automatically rolled back.</p></section>`;
    host.querySelectorAll('[data-import-map]').forEach(sel=>sel.addEventListener('change',()=>{importDraft.mapping[Number(sel.dataset.importMap)]=sel.value;renderImportPreview()}));
    host.querySelectorAll('[data-import-cell]').forEach(el=>el.addEventListener('change',()=>{const r=Number(el.dataset.importCell),c=Number(el.dataset.importCol);importDraft.rows[r][c]=el.value;renderImportPreview()}));
    document.getElementById('import-allow-duplicates')?.addEventListener('change',e=>{importDraft.duplicateOverride=e.target.checked});
    document.getElementById('import-discard')?.addEventListener('click',()=>{if(confirm('Discard this unsubmitted import draft?')){importDraft=null;renderImportPreview()}});
    document.getElementById('import-export-errors')?.addEventListener('click',()=>{const rows=[['row','issue'],...errors.map(x=>[x.match(/^Row (\d+)/)?.[1]||'',x])];download(rows.map(r=>r.map(csvCell).join(',')).join('\n'),'HSE360-import-validation.csv','text/csv;charset=utf-8')});
    document.getElementById('import-confirm')?.addEventListener('click',importReviewedRows);
  }
  async function importReviewedRows(){
    if(!importDraft)return;const module=document.getElementById('import-target')?.value||state.importTarget;if(!can(module,'create')){toast('You do not have create permission for this register.',false);return}
    const btn=document.getElementById('import-confirm'),result=document.getElementById('import-result');if(btn){btn.disabled=true;btn.textContent='Importing…'}if(result)result.textContent='Starting import…';
    const errors=[],models=importDraft.rows.map((row,i)=>({rowNo:i+2,model:importRowModel(row,i,module)})),seen=new Set();let ok=0,skipped=0,failed=0;
    for(let i=0;i<models.length;i++){
      const {rowNo,model}=models[i];const rowIssues=importRowIssues(model,rowNo);if(rowIssues.length){errors.push({row:rowNo,issue:rowIssues.join(' ')});failed++;continue}
      const duplicate=importDuplicate(model,module,seen);if(duplicate&&!importDraft.duplicateOverride){errors.push({row:rowNo,issue:'Possible duplicate skipped (same register/date/location/summary).'});skipped++;continue}
      if(module==='permits')model.status='draft';
      const {error}=await sb.rpc('create_hse_record',{p_org_id:activeOrgId(),p_module:module,p_event_date:model.event_date,p_location:model.location,p_department:model.department,p_status:model.status,p_summary:model.summary,p_data:model.data,p_attachment:null});
      if(error){errors.push({row:rowNo,issue:error.message||'Record creation failed.'});failed++}else ok++;
      if(result&&((i+1)%5===0||i===models.length-1))result.textContent=`Processed ${i+1}/${models.length} rows… ${ok} created, ${skipped} duplicates skipped, ${failed} failed.`;
      if(i%4===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    await loadRecords();
    if(errors.length){const csv=[['source_row','issue'],...errors.map(x=>[x.row,x.issue])].map(r=>r.map(csvCell).join(',')).join('\n');download(csv,`HSE360-import-results-${today()}.csv`,'text/csv;charset=utf-8')}
    if(result)result.innerHTML=`<div class="notice ${failed?'error':'success'}"><strong>Import finished</strong><br>${ok} created · ${skipped} duplicates skipped · ${failed} failed. ${errors.length?'A row-level result CSV was downloaded. Correct those rows and import them separately.':'No row-level errors were reported.'}</div>`;
    toast(`Import complete: ${ok} created, ${skipped} duplicate(s) skipped, ${failed} failed.`,failed===0);
    // Keep the reviewed draft when any row failed so the user can correct/retry it.
    // Rows already created will be detected as duplicates on retry and skipped by default.
    if(failed===0)importDraft=null;
    setTimeout(()=>{if(state.page==='imports')renderImportPreview();else renderPage()},1500);renderPage();updateNotificationCount();
  }

  function management(){
    const total=state.records.length,actionTotal=recs('actions').length,closed=recs('actions').filter(r=>r.status==='closed').length,closure=actionTotal?Math.round(closed/actionTotal*100):0,riskTotal=recs('risk').length,high=recs('risk').filter(r=>['High','Extreme'].includes(r.data?.level)).length;
    const months=lastMonths(12),series=months.map(m=>({m:m.m,count:state.records.filter(r=>String(r.event_date||'').slice(0,7)===m.key).length})),max=Math.max(1,...series.map(x=>x.count));
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-go="dashboard">Back to command center</button><button class="btn" data-export="all">${icon('download',14)} Export data</button>`)}<div class="grid-4">${kpi('Total records',total,'Current company workspace','clipboard')}${kpi('CAPA closure',`${closure}%`,'Closed / total actions','check')}${kpi('High / Extreme risk',high,`${riskTotal} risk records`,'risk')}${kpi('Audits',recs('audit').length,'Registered audit records','search')}</div><div style="height:15px"></div><div class="grid-2"><section class="card panel"><div class="section-title"><div><h2>12-Month activity trend</h2><p>Live HSE360 records</p></div></div><div class="chart tall-chart">${series.map(b=>`<div class="bar" style="height:${Math.max(8,Math.round((b.count/max)*160))}px"><b>${b.count}</b><span>${esc(b.m)}</span></div>`).join('')}</div></section><section class="card panel"><div class="section-title"><div><h2>IMS coverage</h2><p>Counts are factual record coverage, not fabricated compliance percentages.</p></div></div>${[['ISO 45001','risk'],['ISO 14001','waste'],['ISO 9001','ncr'],['ISO 50001','energy'],['ADOSH','permits']].map(x=>{const c= x[1]==='risk'?riskTotal:x[1]==='waste'?recs('waste').length:x[1]==='ncr'?recs('ncr').length:x[1]==='energy'?recs('energy').length:recs('permits').length;return `<div class="progress-row"><span class="progress-label">${x[0]}</span><div class="progress blue"><span style="width:${c?Math.min(100,c*10):0}%"></span></div><span class="progress-value">${fmtNum(c)}</span></div>`}).join('')}</section></div>`;wirePageEvents();
  }

  function modulePage(module){
    const m=MODULES[module];if(!m){document.getElementById('content').innerHTML='<div class="empty">Module unavailable.</div>';return}
    if(!can(module,'view')){document.getElementById('content').innerHTML=`${pageHeader()}<section class="card panel"><div class="empty"><strong>Access not granted</strong>Your administrator has not granted view permission for this module.</div></section>`;return}
    let rows=filteredRecords(module);const total=recs(module).length,open=recs(module).filter(r=>!['closed','expired','draft','cancelled','void'].includes(String(r.status||'').toLowerCase())).length,depts=allDepartments(),canCreate=can(module,'create');
    if(module==='actions'){if(state.actionOwner!=='all')rows=rows.filter(r=>(String(r.data?.responsible||'').trim()||'Unassigned')===state.actionOwner);if(state.actionPriority!=='all')rows=rows.filter(r=>String(r.data?.priority||'').toLowerCase()===state.actionPriority);if(state.actionDue!=='all')rows=rows.filter(r=>actionDeadlineState(r)===state.actionDue);rows.sort((a,b)=>{const ac=actionDeadlineState(a)==='closed',bc=actionDeadlineState(b)==='closed';if(ac!==bc)return ac?1:-1;const ad=String(a.data?.due_date||'9999-12-31'),bd=String(b.data?.due_date||'9999-12-31');return ad.localeCompare(bd)})}
    const actions=`${canCreate?`<button class="btn" data-import-module="${module}">${icon('upload',14)} Import / Extract</button>`:''}<button class="btn" data-export-module="${module}">${icon('download',14)} Excel / CSV</button><button class="btn" data-backup="1">JSON Backup</button>${canCreate?`<button class="btn primary" data-new="${module}">${icon('plus2',14)} New ${m.singular}</button>`:''}`;
    const statusOpts=module==='permits'?['draft','pending_approval','approved','suspended','closed','expired']:module==='inspections'?['draft','open','in_progress','closed']:['draft','open','in_progress','closed'];
    const owners=module==='actions'?[...new Set(recs('actions').map(r=>String(r.data?.responsible||'').trim()||'Unassigned'))].sort((a,b)=>a.localeCompare(b)):[];
    const actionQueueFilters=module==='actions'?`<div class="action-workqueue-filters"><label>Owner<select data-action-filter="owner"><option value="all">All owners</option>${owners.map(o=>`<option value="${esc(o)}" ${state.actionOwner===o?'selected':''}>${esc(o)}</option>`).join('')}</select></label><label>Priority<select data-action-filter="priority"><option value="all">All priorities</option>${['critical','high','medium','low'].map(p=>`<option value="${p}" ${state.actionPriority===p?'selected':''}>${roleLabel(p)}</option>`).join('')}</select></label><label>Deadline<select data-action-filter="due"><option value="all">All deadlines</option><option value="overdue" ${state.actionDue==='overdue'?'selected':''}>Overdue</option><option value="due_today" ${state.actionDue==='due_today'?'selected':''}>Due today</option><option value="next_7" ${state.actionDue==='next_7'?'selected':''}>Due in 7 days</option><option value="upcoming" ${state.actionDue==='upcoming'?'selected':''}>Upcoming (&gt;7 days)</option><option value="missing" ${state.actionDue==='missing'?'selected':''}>Missing due date</option><option value="closed" ${state.actionDue==='closed'?'selected':''}>Closed / cancelled</option></select></label></div>`:'';
    const tableHead=module==='actions'?`<tr><th>Reference</th><th>Deadline</th><th>Priority</th><th>Owner</th><th>Status</th><th>Source finding</th><th>Action required</th><th></th></tr>`:`<tr><th>Reference</th><th>Date</th><th>Status</th><th>Department</th><th>Location</th><th>Summary</th><th>Created by</th><th></th></tr>`;
    const tableRows=rows.map(r=>{if(module!=='actions')return `<tr><td><button class="link-btn ref" data-detail="${r.id}">${esc(r.reference_no)}</button></td><td>${fmtDate(r.event_date)}</td><td>${statusBadge(r.status)}</td><td>${esc(r.department||'—')}</td><td>${esc(r.location||'—')}</td><td class="summary-cell" title="${esc(r.summary||'')}">${esc(r.summary||'—')}${module==='licenses'?`<br><span class="muted small">${esc(certificateRegisterRenewalText(r,state.records))}${r.data?.expiry_date?` · Expires ${fmtDate(r.data.expiry_date)}`:''}</span>`:''}</td><td>${esc(r.created_by_name||'—')}<br><span class="muted small">${ago(r.created_at)}</span></td><td><button class="icon-btn" data-detail="${r.id}" title="Open">${icon('external',14)}</button></td></tr>`;const dueState=actionDeadlineState(r),sourceRec=state.records.find(x=>x.id===r.data?.source_record_id)||state.records.find(x=>x.reference_no===r.data?.related_reference),prio=String(r.data?.priority||'medium').toLowerCase(),prioClass=prio==='critical'?'extreme':prio;return `<tr><td><button class="link-btn ref" data-detail="${r.id}">${esc(r.reference_no)}</button></td><td><span class="badge ${dueState==='overdue'?'overdue':dueState==='due_today'?'high':dueState==='next_7'||dueState==='missing'?'medium':dueState==='closed'?'closed':'low'}">${roleLabel(dueState)}</span><br><small>${fmtDate(r.data?.due_date)}</small></td><td><span class="badge ${prioClass}">${roleLabel(prio)}</span></td><td>${esc(r.data?.responsible||'Unassigned')}</td><td>${statusBadge(r.status)}</td><td>${sourceRec?`<button class="link-btn ref" data-detail="${sourceRec.id}">${esc(sourceRec.reference_no)}</button>`:esc(r.data?.related_reference||'—')}</td><td class="summary-cell" title="${esc(r.summary||'')}">${esc(r.summary||'—')}</td><td><button class="icon-btn" data-detail="${r.id}" title="Open">${icon('external',14)}</button></td></tr>`}).join('');
    document.getElementById('content').innerHTML=`${pageHeader(actions)}<input id="csv-import-${module}" type="file" accept=".csv,.txt,.md,.pdf,.docx,.xlsx,.xls,text/csv,text/plain,application/pdf" hidden><section class="card ${module==='actions'?'actions-register-card':''}"><div class="filterbar"><input class="filter-search" data-filter="query" placeholder="Search reference, summary, location, person…" value="${esc(state.query)}"><select data-filter="status"><option value="all">All statuses</option>${statusOpts.map(s=>`<option value="${s}">${roleLabel(s)}</option>`).join('')}</select><select data-filter="department"><option value="all">All departments</option>${depts.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('')}</select><input data-filter="from" type="date" value="${esc(state.dateFrom)}"><input data-filter="to" type="date" value="${esc(state.dateTo)}"></div>${actionQueueFilters}<div class="panel" style="padding-bottom:10px"><div class="legend"><span><i style="background:#f59e0b"></i>${total} total records</span><span><i style="background:#2563eb"></i>${open} active</span><span><i style="background:#159a5b"></i>Tenant-isolated database</span>${module==='actions'?`<span><i style="background:#dc3f45"></i>${recs('actions').filter(r=>actionDeadlineState(r)==='overdue').length} overdue actions</span>`:''}</div></div><div class="table-wrap"><table class="data-table"><thead>${tableHead}</thead><tbody>${tableRows}</tbody></table></div>${rows.length?'':'<div class="empty"><strong>No records match this view</strong>Clear the filters or create a new record.</div>'}</section>`;
    const s=document.querySelector('[data-filter="status"]');if(s)s.value=state.status;const d=document.querySelector('[data-filter="department"]');if(d)d.value=state.department;wirePageEvents();
    document.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener(el.dataset.filter==='query'?'input':'change',e=>{if(e.target.dataset.filter==='query')state.query=e.target.value;else if(e.target.dataset.filter==='status')state.status=e.target.value;else if(e.target.dataset.filter==='department')state.department=e.target.value;else if(e.target.dataset.filter==='from')state.dateFrom=e.target.value;else if(e.target.dataset.filter==='to')state.dateTo=e.target.value;renderPage()}));
    document.querySelectorAll('[data-action-filter]').forEach(el=>el.addEventListener('change',e=>{const k=e.target.dataset.actionFilter;if(k==='owner')state.actionOwner=e.target.value;else if(k==='priority')state.actionPriority=e.target.value;else if(k==='due')state.actionDue=e.target.value;renderPage()}));
  }

  function commonFields(){return [['event_date','Date','date',today()],['location','Location','text',''],['department','Department','text',state.membership?.department||state.profile?.department||'']]}

  // Preserve compatibility for legacy closed actions when an edit changes no closure-critical values.
  // The same signature fields are checked by the candidate database trigger.
  function legacyClosedActionSignatureUnchanged(existingRecord,nextData,nextStatus){
    if(!existingRecord||String(existingRecord.status||'').toLowerCase()!=='closed'||String(nextStatus||'').toLowerCase()!=='closed')return false;
    const previous=existingRecord.data||{};
    const fields=['responsible','due_date','priority','verification','completion_evidence','effectiveness_status','verifier','verified_at'];
    return fields.every(field=>previous[field]===nextData[field]);
  }

  // Pure validation rules kept independent from the UI so the same logic can be regression-tested.
  function actionClosureValidationError(d,todayKey){
    const responsible=String(d.responsible||'').trim(),due=String(d.due_date||'').trim(),priority=String(d.priority||'').toLowerCase().trim();
    if(!responsible)return {field:'responsible',message:'Assign a responsible person before saving the corrective action.'};
    if(!due)return {field:'due_date',message:'Enter a due date for the corrective action.'};
    const dueDate=new Date(`${due}T00:00:00`),dueKey=Number.isFinite(dueDate.getTime())?`${dueDate.getFullYear()}-${String(dueDate.getMonth()+1).padStart(2,'0')}-${String(dueDate.getDate()).padStart(2,'0')}`:'';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(due)||dueKey!==due)return {field:'due_date',message:'Enter a valid due date.'};
    if(!['low','medium','high','critical'].includes(priority))return {field:'priority',message:'Select a valid action priority.'};
    const status=String(d.status||'open').toLowerCase(),effect=String(d.effectiveness_status||'Pending verification').trim().toLowerCase();
    if(!['pending verification','effective','not effective'].includes(effect))return {field:'effectiveness_status',message:'Select a valid effectiveness result.'};
    if(effect==='not effective'&&status==='closed')return {field:'status',message:'An action with an ineffective result cannot be closed. Keep it open/in progress and record further action.'};
    if(effect==='not effective'&&!String(d.next_action||'').trim())return {field:'next_action',message:'Record the further action required because effectiveness was not demonstrated.'};
    if(status!=='closed')return null;
    if(!String(d.verification||'').trim())return {field:'verification',message:'Define the acceptance/effectiveness criteria before closing the action.'};
    if(!String(d.completion_evidence||'').trim())return {field:'completion_evidence',message:'Describe the objective completion evidence and its reference before closure. Attach supporting files where applicable.'};
    if(effect!=='effective')return {field:'effectiveness_status',message:'Effectiveness must be verified as Effective before closure.'};
    const verifier=String(d.verifier||'').trim(),ownerKey=responsible.toLowerCase().replace(/\s+/g,' '),verifierKey=verifier.toLowerCase().replace(/\s+/g,' ');
    if(!verifier)return {field:'verifier',message:'Enter the name of the person who verified effectiveness.'};
    if(ownerKey===verifierKey)return {field:'verifier',message:'The verifier must be different from the action owner.'};
    const verifiedAt=String(d.verified_at||'').trim(),verifiedDate=new Date(`${verifiedAt}T00:00:00`),verifiedKey=Number.isFinite(verifiedDate.getTime())?`${verifiedDate.getFullYear()}-${String(verifiedDate.getMonth()+1).padStart(2,'0')}-${String(verifiedDate.getDate()).padStart(2,'0')}`:'';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(verifiedAt)||verifiedKey!==verifiedAt)return {field:'verified_at',message:'Enter a valid verification date.'};
    if(verifiedAt>todayKey)return {field:'verified_at',message:'The effectiveness verification date cannot be in the future.'};
    return null;
  }

  function inspectionValidationError(d){
    const result=String(d.inspection_result||'').trim(), findings=Number(d.findings||0), follow=String(d.follow_up_required||'')==='Yes';
    const failedItems=String(d.failed_items||'').trim(), immediateControls=String(d.immediate_controls||'').trim(), notes=String(d.inspection_notes||'').trim();
    if(!result||result==='Select result')return {field:'inspection_result',message:'Select the actual inspection outcome before saving.'};
    if(!Number.isFinite(findings)||findings<0||!Number.isInteger(findings))return {field:'findings',message:'Findings count must be a whole number zero or greater.'};
    if(result==='Pass'&&(findings>0||follow))return {field:'inspection_result',message:'A Pass outcome cannot be combined with findings or required follow-up. Select Pass with findings or Fail.'};
    if(['Fail','Pass with findings'].includes(result)&&findings<1)return {field:'findings',message:'Record at least one finding for a failed inspection or an inspection with findings.'};
    const needsFollowUp=['Fail','Pass with findings'].includes(result)||findings>0||follow;
    if(needsFollowUp&&!follow)return {field:'follow_up_required',message:'Set Follow-up required to Yes when findings exist or follow-up is indicated.'};
    if(needsFollowUp&&!failedItems)return {field:'failed_items',message:'Describe the failed checklist item(s) or finding(s) before saving.'};
    if(needsFollowUp&&!immediateControls)return {field:'immediate_controls',message:'Record the immediate controls taken, or enter “None required” with the reason.'};
    if(result==='Not completed'&&!notes)return {field:'inspection_notes',message:'Explain why the inspection was not completed.'};
    if(!['Pass','Fail','Pass with findings','Not completed'].includes(result))return {field:'inspection_result',message:'Choose a supported inspection outcome.'};
    return null;
  }

  function formSchema(t){
    const extra={
      observations:[['observation_type','Observation type','select','Unsafe condition|Unsafe act|Positive observation|Environmental|Ergonomic|Other'],['risk_level','Initial risk','select','Low|Medium|High|Extreme'],['observed_by','Observed by','text',''],['immediate_action','Immediate action','textarea','']],
      incidents:[['incident_type','Incident type','select','Injury|Property damage|Environmental|Fire|Chemical|Vehicle|Security|Other'],['severity','Severity','select','Minor|Moderate|Major|Critical'],['reported_by','Reported by','text',''],['immediate_action','Immediate action','textarea','']],
      near_miss:[['potential_severity','Potential severity','select','Low|Medium|High|Critical'],['reported_by','Reported by','text',''],['immediate_action','Immediate action','textarea','']],
      first_aid:[['case_type','Case type','text',''],['injury_area','Injury / affected area','text',''],['treatment','Treatment','text',''],['treated_by','Treated by','text','']],
      accidents:[['lti','Lost-time injury (LTI)?','select','No|Yes'],['injury_type','Injury type','text',''],['days_lost','Days lost','number','0'],['medical_treatment','Medical treatment','select','First Aid|Medical Treatment|Hospitalisation'],['return_to_work','Return to work','date','']],
      inspections:[['inspection_type','Inspection type','select','Daily|Weekly|Monthly|Statutory|Housekeeping|Fire & Life Safety|Other'],['inspector','Inspector','text',''],['inspection_result','Inspection outcome *','select','Select result|Pass|Fail|Pass with findings|Not completed'],['findings','Findings count','number','0'],['follow_up_required','Follow-up required','select','No|Yes'],['failed_items','Failed checklist items / findings','textarea',''],['immediate_controls','Immediate controls taken','textarea',''],['evidence_reference','Evidence / photo reference','text',''],['inspection_notes','Inspection notes / reason incomplete','textarea','']],
      actions:[['action_type','Action type','select','Corrective|Preventive|Improvement'],['responsible','Responsible person','text',''],['due_date','Due date','date',today()],['priority','Priority','select','Low|Medium|High|Critical'],['verification','Effectiveness / acceptance criteria','textarea',''],['completion_evidence','Completion evidence / reference','textarea',''],['effectiveness_status','Effectiveness result','select','Pending verification|Effective|Not effective'],['verifier','Verifier (must be different from action owner)','text',''],['verified_at','Verification date','date',''],['next_action','Further action required if not effective','textarea','']],
      training:[['topic','Training topic','text',''],['trainer','Trainer','text',''],['participants','Participants','number','0'],['duration','Duration (hours)','number','0'],['training_type','Training type','select','Induction|Internal|External|Refresher|Emergency|Specialised|Other'],['competency_link','Competency / certificate reference','text','']],
      tbt:[['topic','TBT topic','text',''],['conductor','Conducted by','text',''],['participants','Participants','number','0'],['duration','Duration (hours)','number','0'],['attendance_reference','Attendance / register reference','text','']],
      drills:[['drill_type','Drill type','select','Fire|Chemical Spill|Medical Emergency|Evacuation|Confined Space|Rescue|Other'],['participants','Participants','number','0'],['response_time','Response time (minutes)','number','0'],['observation','Key observations','textarea',''],['follow_up','Follow-up actions','textarea','']],
      manhours:[['hours','Total manhours','number','0'],['employees','Employees covered','number','0'],['contractors','Contractors covered','number','0'],['month_reference','Month / period','month',`${today().slice(0,7)}`]],
      permits:[['permit_type','Permit class','permitType','general_work'],['requestor','Requestor','text',''],['work_scope','Work activity / scope','text',''],['jsa_templates','Selected JSA template(s)','text',''],['valid_from','Valid from','datetime-local',nowLocalInput()],['valid_until','Valid until','datetime-local',`${today()}T23:59`],['performing_company','Performing company / contractor','text',''],['responsible_person','Responsible person','text',''],['workers_involved','Workers involved','textarea',''],['risk_reference','Risk assessment / JSA reference','text',''],['hazards','Main hazards','textarea',''],['controls','Required controls','textarea',''],['ppe','Required PPE','textarea',''],['isolation_required','Isolation required?','select','No|Yes'],['isolation_details','Isolation / LOTO details','textarea',''],['permit_issuer','Permit issuer','text',''],['permit_receiver','Permit receiver','text',''],['approval_notes','Approval / verification notes','textarea',''],['closure_remarks','Closure remarks','textarea','']],
      risk:[['hazard','Hazard','text',''],['activity','Activity / task','text',''],['jsa_templates','Selected JSA template(s)','text',''],['likelihood','Likelihood (1–5)','number','1'],['severity','Severity (1–5)','number','1'],['existing_controls','Existing controls','textarea',''],['additional_controls','Additional controls','textarea',''],['responsible','Responsible person','text','']],
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
      fire_equipment:[['equipment_id','Equipment ID','text',''],['serial_no','Serial / Asset number','text',''],['inspection_frequency','Inspection frequency','select','Weekly|Monthly|Third-party / Annual'],['checklist_period','Checklist period','select','Weekly check|Monthly detailed check|Third-party / Annual'],['category','Category','select','FE-DCP|FE-CO2|FE-FOAM|FH-HR|FHY|FE-FM200|FB|MCV'],['area','Area / Department','text',''],['equipment_type','Equipment / Type','text',''],['capacity','Capacity / Rating','text',''],['equipment_location','Location','text',''],['pressure_gauge','Pressure / Gauge','select','OK|NOT OK|N/A'],['body_cylinder','Body / Cylinder','select','OK|NOT OK|N/A'],['instruction_label','Instruction / Label','select','OK|NOT OK|N/A'],['hose_nozzle','Hose / Nozzle','select','OK|NOT OK|N/A'],['pin_seal','Pin & Seal','select','OK|NOT OK|N/A'],['accessible','Accessible / Unobstructed','select','OK|NOT OK|N/A'],['mounting','Mounting / Stand','select','OK|NOT OK|N/A'],['inspection_sticker','Inspection Sticker','select','OK|NOT OK|N/A'],['last_service_date','Last service date','date',''],['expiry_date','Expiry / Service due date','date',''],['inspector','Inspected by','text',''],['inspection_date','Inspection date','date',today()],['inspection_status','Inspection status','select','OK|NOT OK|N/A'],['follow_up_required','Follow-up required','select','No|Yes'],['corrective_action_due_date','Corrective action due date','date',''],['remarks','Remarks / Corrective Action','textarea','']],
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

  const JSA_LIBRARY = [
    {id:'manual-handling',label:'Manual handling / heavy reels',activity:'Manual handling and movement of heavy reels or copper bundles',hazard:'Crush injury, strain, trapped fingers, dropped load',controls:'Assess load weight and route; use rated mechanical aids; keep hands clear of pinch points; trained team lift where appropriate; safety footwear; barricade movement path.'},
    {id:'forklift',label:'Forklift operation',activity:'Forklift movement and material handling',hazard:'Vehicle collision, pedestrian strike, falling load, overturning',controls:'Authorised operator only; pre-use inspection; seat belt; speed limits; segregated pedestrian routes; sound horn at blind corners; secure load; no passengers; park safely.'},
    {id:'hot-work',label:'Hot work / grinding',activity:'Welding, cutting or grinding',hazard:'Fire, burns, sparks, fumes, eye injury',controls:'Approved hot-work permit; remove/protect combustibles; suitable extinguisher and fire watch; inspect equipment and leads; screens and task PPE; ventilation; post-work fire watch.'},
    {id:'work-at-height',label:'Work at height',activity:'Work from platform, ladder or elevated work area',hazard:'Fall from height, dropped objects, unstable access',controls:'Avoid work at height where possible; approved platform with guardrails; inspect access equipment; secure tools/materials; exclusion zone below; fall protection and rescue plan where required.'},
    {id:'chemical-handling',label:'Chemical handling / transfer',activity:'Chemical handling, dispensing or transfer',hazard:'Splash, inhalation, incompatible mixing, spill, fire',controls:'Review SDS and compatibility; labelled containers; suitable gloves/eye protection; ventilation; bunding; spill kit available; segregate incompatibles; no unlabelled decanting; emergency eyewash access.'},
    {id:'electrical-loto',label:'Electrical isolation / LOTO',activity:'Electrical maintenance and energy isolation',hazard:'Electric shock, arc flash, unexpected energisation',controls:'Authorised competent persons; identify all energy sources; isolate, lock and tag; verify zero energy before work; use correctly rated tools/PPE; control keys; test before re-energisation.'},
    {id:'confined-space',label:'Confined space entry',activity:'Entry into a confined space',hazard:'Oxygen deficiency, toxic/flammable atmosphere, engulfment',controls:'Approved confined-space permit; isolate lines and energy; test atmosphere before and during entry; ventilate; trained attendant; communications; rescue equipment and plan; stop work if conditions change.'},
    {id:'eot-crane',label:'EOT crane / heavy load lifting',activity:'Lifting and shifting heavy copper reels, busbars or loads using EOT crane',hazard:'Dropped load, load swing, crush injuries, equipment failure, people entering suspended-load zone',controls:'Approved lift plan for non-routine/critical lifts; trained authorised operator and rigger; verify SWL and lifting accessories; inspect hooks, slings and brakes; establish exclusion zone; use agreed signals; never stand beneath suspended loads; stop if communication or visibility is lost.'},
    {id:'conveyor',label:'Conveyor / rotating equipment',activity:'Inspection, cleaning or maintenance near conveyor, roller or rotating equipment',hazard:'Entanglement, nip points, unexpected start-up, crushing and amputation',controls:'Guard nip points; never clean while running; apply lockout/tagout and verify zero energy before intervention; secure against movement; only authorised maintainers remove guards; reinstall and verify guards before restart.'},
    {id:'furnace-upcast',label:'Furnace / upcast hot work area',activity:'Work near furnace, molten copper, upcast or hot process equipment',hazard:'Burns, heat stress, molten-metal splash, fire, fumes, contact with hot surfaces',controls:'Follow area-specific SOP and permit; confirm safe process state and authorised access; maintain barriers and safe distance; wear task-specific heat-resistant PPE; ensure ventilation and emergency route; provide heat-stress controls and hydration; no water contact with molten metal; stop work if conditions change.'},
    {id:'circular-saw',label:'Circular saw / cutting operation',activity:'Cutting or trimming material with saw or powered cutting equipment',hazard:'Blade contact, kickback, flying particles, noise, dust and electrical hazards',controls:'Use correct blade and guards; do not bypass interlocks; secure workpiece; competent authorised operator; eye/face and hearing protection; isolate before adjustments; maintain extraction where required; remove damaged equipment from service.'},
    {id:'chemical-storage',label:'Chemical store / compatibility',activity:'Receipt, storage, dispensing and inventory of chemicals',hazard:'Incompatible reactions, fire, vapour exposure, spills, container failure and heat effects',controls:'Maintain current SDS and chemical inventory; segregate incompatibles using SDS/compatibility review; use compatible bunding; inspect containers and labels; keep oxidisers away from fuels/organics; control ignition sources; provide suitable spill kit and eyewash; maintain ventilation/cooling requirements and emergency access.'},
    {id:'forklift-reel-loading',label:'Forklift loading / unloading heavy reels',activity:'Forklift loading, unloading and movement of heavy reels or copper stock',hazard:'Pedestrian strike, dropped/rolling reel, crush injuries, tip-over and vehicle collision',controls:'Verify load weight and forklift capacity; use approved attachment/cradle; secure reels against rolling; trained authorised operator; seat belt; pedestrian segregation; stable travel path; no lifting over people; competent banksman where required.'},
    {id:'maintenance-isolation',label:'Mechanical maintenance and LOTO',activity:'Maintenance, troubleshooting or clearing a machine jam',hazard:'Unexpected energisation, stored pressure, gravity movement, electrical shock and crush injuries',controls:'Identify electrical, pneumatic, hydraulic, thermal and gravity energy; isolate all sources; apply personal locks/tags; release stored energy; verify zero-energy state; test-before-touch where electrical; control lock removal and conduct safe restart checks.'}
  ];
  function showJsaPicker(modal){
    const id=`jsa-picker-${Date.now()}`;
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="${id}" role="dialog" aria-modal="true"><div class="modal wide-modal"><div class="modal-head"><div><div class="eyebrow">Reusable JSA starter library</div><h2>Select task activities</h2><p class="muted small">Search, tick multiple activities, then review the imported hazards and controls against the real job.</p></div><button class="icon-btn" data-close-modal="${id}">${icon('close',16)}</button></div><div class="modal-body"><div class="field jsa-search"><label for="jsa-search-${id}">Find an activity or hazard</label><input id="jsa-search-${id}" type="search" placeholder="e.g. hot work, forklift, chemical, conveyor…"></div><div class="jsa-template-grid">${JSA_LIBRARY.map(x=>`<label class="jsa-template" data-jsa-card data-search="${esc(`${x.label} ${x.activity} ${x.hazard} ${x.controls}`.toLowerCase())}"><input type="checkbox" value="${x.id}"><span><b>${esc(x.label)}</b><small>${esc(x.activity)}</small><small class="jsa-hazard">Hazards: ${esc(x.hazard)}</small></span></label>`).join('')}</div><p class="muted small" id="jsa-result-count">${JSA_LIBRARY.length} reusable starter templates · local library, not an approved site-specific assessment.</p></div><div class="modal-foot"><button class="btn" data-close-modal="${id}">Cancel</button><button class="btn primary" id="apply-jsa-${id}">Insert selected templates</button></div></div></div>`);
    const picker=document.getElementById(id);wirePageEvents();
    picker.querySelector(`#jsa-search-${id}`)?.addEventListener('input',e=>{const term=e.target.value.trim().toLowerCase();let visible=0;picker.querySelectorAll('[data-jsa-card]').forEach(card=>{const show=!term||card.dataset.search.includes(term);card.hidden=!show;if(show)visible++});picker.querySelector('#jsa-result-count').textContent=`${visible} matching template(s) · Select multiple. Templates are starters, not approved site-specific assessments.`});
    document.getElementById(`apply-jsa-${id}`).onclick=()=>{
      const chosen=[...picker.querySelectorAll('input[type=checkbox]:checked')].map(i=>JSA_LIBRARY.find(x=>x.id===i.value)).filter(Boolean);
      if(!chosen.length){toast('Select at least one JSA template.',false);return}
      const append=(field,value)=>{const el=modal.querySelector(`#f_${field}`);if(el)el.value=el.value.trim()?`${el.value.trim()}\n\n${value}`:value};
      const joinActivities=chosen.map(x=>x.activity).join('; '),joinHazards=chosen.map(x=>`${x.label}: ${x.hazard}`).join('\n'),joinControls=chosen.map(x=>`${x.label}: ${x.controls}`).join('\n');
      if(modal.querySelector('[data-permit-type]')){
        append('work_scope',joinActivities);append('hazards',joinHazards);append('controls',joinControls);append('jsa_templates',chosen.map(x=>x.label).join('; '));
      }else{
        append('activity',joinActivities);append('hazard',joinHazards);append('existing_controls',joinControls);append('jsa_templates',chosen.map(x=>x.label).join('; '));
      }
      const summary=modal.querySelector('#f_summary');if(summary&&!summary.value.trim())summary.value=joinActivities;
      picker.remove();toast(`${chosen.length} reusable JSA template(s) inserted. Verify and edit all hazards, controls and risk scores for this specific job.`)
    }
  }

  function renderForm(t,recordId=null){
    const m=MODULES[t];if(!m)return;const existing=recordId?state.records.find(r=>r.id===recordId):null; if(existing&&!can(t,'edit',existing)){toast('You can edit only records you are authorized to edit.',false);return}
    const fields=formSchema(t),data=existing?.data||{},mid=`modal-${Date.now()}`;const val=id=>id==='event_date'?(existing?.event_date||today()):id==='location'?(existing?.location||''):id==='department'?(existing?.department||state.membership?.department||state.profile?.department||''):(data[id]??fields.find(x=>x[0]===id)?.[3]??'');
    const htmlField=([id,label,type,defaultValue])=>{const current=val(id);if(type==='permitType')return `<div class="field"><label>${label}</label><select id="f_${id}" data-permit-type>${PERMIT_TYPES.map(x=>`<option value="${x.value}" ${String(current)===x.value?'selected':''}>${esc(x.label)}</option>`).join('')}</select></div>`;if(type==='select'){const opts=defaultValue.split('|');return `<div class="field"><label>${label}</label><select id="f_${id}">${opts.map(o=>`<option value="${esc(o)}" ${String(current)===String(o)?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`}if(type==='textarea')return `<div class="field full"><label>${label}</label><textarea id="f_${id}" placeholder="Enter details…">${esc(current)}</textarea></div>`;return `<div class="field"><label>${label}</label><input id="f_${id}" type="${type}" value="${esc(current)}" ${type==='number'?'min="0" step="0.01"':''}></div>`};
    const fieldHTML=fields.map(htmlField).join('');const permitFieldsHTML=t==='permits'?`${fields.slice(0,7).map(htmlField).join('')}<details class="form-disclosure"><summary>More details, workers, isolation & closure (optional while Draft)</summary><div class="form-grid">${fields.slice(7).map(htmlField).join('')}</div></details>`:fieldHTML;const status=existing?.status||(t==='permits'?'draft':'open');const summary=existing?.summary||data.description||'';const related=data.related_reference||'';
    const statusOpts=t==='permits'?['draft','pending_approval','approved','suspended','closed','expired']:['draft','open','in_progress','closed'];
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="${mid}" role="dialog" aria-modal="true"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${existing?'Edit record':'New record'} · ${m.code}</div><h2>${existing?'Edit':'Create'} ${m.singular}</h2></div><button class="icon-btn" data-close-modal="${mid}">${icon('close',16)}</button></div><div class="modal-body"><div class="form-section"><h3>Record information</h3>${['risk','permits'].includes(t)?'<button type="button" class="btn" data-jsa-picker>Choose reusable JSA templates</button><p class="muted small">Reusable templates are starting points only. Verify actual site conditions, hazards and controls before permit authorisation.</p>':''}<div class="form-grid">${permitFieldsHTML}<div class="field"><label>Status</label><select id="f_status">${statusOpts.map(o=>`<option value="${o}" ${status===o?'selected':''}>${roleLabel(o)}</option>`).join('')}</select></div><div class="field"><label>Related reference <span class="muted">(optional)</span></label><input id="f_related" value="${esc(related)}" placeholder="e.g. HSE360-OB-2026-00001"></div><div class="field full"><label>Description / work summary <span class="muted">(optional for drafts)</span></label><textarea id="f_summary" placeholder="Briefly describe the activity, event or record…">${esc(summary)}</textarea></div></div><details class="form-disclosure"><summary>Document control (optional)</summary><div class="form-grid"><div class="field"><label>Document number</label><input id="f_document_no" value="${esc(val('document_no'))}" placeholder="Defaults to record reference"></div><div class="field"><label>Revision</label><input id="f_revision" value="${esc(val('revision')||'00')}" placeholder="00"></div><div class="field"><label>Issue date</label><input id="f_document_issue_date" type="date" value="${esc(val('document_issue_date')||today())}"></div><div class="field"><label>Prepared by</label><input id="f_prepared_by" value="${esc(val('prepared_by')||state.profile?.full_name||state.profile?.username||'')}"></div><div class="field"><label>Reviewed by</label><input id="f_reviewed_by" value="${esc(val('reviewed_by'))}" placeholder="Optional reviewer"></div><div class="field"><label>Approved by</label><input id="f_approved_by" value="${esc(val('approved_by'))}" placeholder="Optional approver"></div></div></details></div>${t==='permits'?'<div id="permit-dynamic"></div>':''}<div class="form-section"><h3>Evidence & attachments</h3><div class="field"><label>Photo / document attachment ${existing?.attachment?'(replace optional)':''}</label><input id="f_file" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"></div><p class="muted small">Files are stored in the private HSE360 attachment bucket under this company workspace.</p></div></div><div class="modal-foot"><button class="btn" data-close-modal="${mid}">Cancel</button><button class="btn primary" data-save-form="${t}" data-record-id="${recordId||''}" data-modal="${mid}">${existing?'Save changes':'Save '+m.singular}</button></div></div></div>`);
    const modal=document.getElementById(mid);if(t==='permits')renderPermitDynamic(modal,data);modal?.addEventListener('click',e=>{if(e.target===modal)modal.remove()});wirePageEvents();modal?.querySelector('[data-close-modal]')?.focus();
  }

  function renderPermitDynamic(modal,data){
    const type=modal.querySelector('#f_permit_type')?.value||'general_work';const holder=modal.querySelector('#permit-dynamic');if(!holder)return;holder.innerHTML=permitDynamicHTML(type,data)+(type==='critical_work'?criticalDetailHTML(data.critical_type||'confined_space',data):'');
    if(type==='critical_work'){const ct=modal.querySelector('#f_critical_type');ct?.addEventListener('change',()=>{modal.querySelector('#critical-detail-fields').innerHTML=criticalDetailHTML(ct.value,collectFormData(modal))})}
  }
  function collectFormData(modal){const d={};modal.querySelectorAll('[id^="f_"]').forEach(el=>{const id=el.id.slice(2);if(['event_date','location','department','status','summary','related','file'].includes(id))return;d[id]=el.type==='number'?el.value:el.value});return d}

  async function saveForm(t,mid,recordId=''){
    const modal=document.getElementById(mid),m=MODULES[t];if(!modal)return;const get=id=>modal.querySelector(`#f_${id}`)?.value??'';let summary=get('summary').trim();const requestedStatus=get('status')||'open';if(!summary){if(t==='permits'&&requestedStatus!=='draft'){toast('Add a short work summary before submitting or authorising a permit. A draft may be saved with partial details.',false);modal.querySelector('#f_summary')?.focus();return}summary=`${m?.singular||'HSE'} record — details pending`;const summaryEl=modal.querySelector('#f_summary');if(summaryEl)summaryEl.value=summary}
    if(t==='permits'){const fromRaw=get('valid_from'),untilRaw=get('valid_until'),from=new Date(fromRaw).getTime(),until=new Date(untilRaw).getTime(),status=get('status');if(status!=='draft'&&(!Number.isFinite(from)||!Number.isFinite(until)||until<=from)){toast('Before submission or authorisation, enter a valid Valid From and Valid Until time; the end must be later than the start. Drafts may remain incomplete.',false);return}if(status==='approved'){if(!roleCanAdmin()){toast('Only an organization administrator can approve a work permit in this version.',false);return}const required=[['requestor','Requestor'],['responsible_person','Responsible person'],['risk_reference','Risk assessment / JSA reference'],['hazards','Main hazards'],['controls','Required controls'],['permit_issuer','Permit issuer'],['permit_receiver','Permit receiver']];if(get('permit_type')==='hot_work')required.push(['fire_extinguisher','Fire extinguisher available'],['fire_watch','Fire watch assigned']);if(get('permit_type')==='critical_work'){required.push(['competent_supervisor','Competent supervisor']);if(get('critical_type')==='confined_space')required.push(['attendant','Confined-space attendant'],['o2_required','Oxygen test result'],['rescue_equipment','Rescue equipment / standby']);if(get('critical_type')==='work_at_height')required.push(['height_equipment','Work-at-height equipment'],['height_rescue','Work-at-height rescue plan']);if(get('critical_type')==='electrical')required.push(['authorized_electrician','Authorized electrician'],['electrical_isolation','Electrical isolation status'],['test_before_touch','Test-before-touch status']);if(get('critical_type')==='lifting')required.push(['lifting_plan','Approved lifting plan'],['lifting_equipment','Lifting equipment'],['lifting_swl','SWL / capacity'],['operator','Competent operator'],['rigger','Competent rigger / banksman']);if(get('critical_type')==='excavation')required.push(['underground_services','Underground services status'],['safe_access','Safe access / egress']);if(get('critical_type')==='line_breaking')required.push(['process_isolation','Process isolation'],['depressurized','Depressurised status']);if(get('critical_type')==='chemical_work')required.push(['chemical_name','Chemical name'],['sds_reference','SDS reference'],['exposure_controls','Exposure controls'],['spill_response','Spill response']);if(get('critical_type')==='energy_isolation')required.push(['loto_points','Isolation points'],['zero_energy','Zero-energy verification'],['try_test','Try/test result'],['isolated_by','Person performing isolation']);if(get('critical_type')==='other')required.push(['critical_controls','Specific critical controls'])}const missing=required.filter(([id])=>!get(id).trim()||(['Yes','No','N/A'].includes(get(id))&&get(id)==='No')).map(x=>x[1]);if(missing.length){toast('Permit cannot be approved. Complete/verify: '+missing.join(', '),false);return}}}
    if(t==='actions'){
      const closureData={responsible:get('responsible'),due_date:get('due_date'),priority:get('priority'),status:get('status'),verification:get('verification'),completion_evidence:get('completion_evidence'),effectiveness_status:get('effectiveness_status'),verifier:get('verifier'),verified_at:get('verified_at'),next_action:get('next_action')};
      const existingAction=recordId?state.records.find(r=>r.id===recordId):null;
      const preserveLegacyClosure=legacyClosedActionSignatureUnchanged(existingAction,closureData,get('status'));
      const closureError=preserveLegacyClosure?null:actionClosureValidationError(closureData,today());
      if(closureError){toast(closureError.message,false);modal.querySelector(`#f_${closureError.field}`)?.focus();return}
    }
    if(t==='inspections'&&get('status')!=='draft'){
      const inspectionError=inspectionValidationError({inspection_result:get('inspection_result'),findings:get('findings'),follow_up_required:get('follow_up_required'),failed_items:get('failed_items'),immediate_controls:get('immediate_controls'),inspection_notes:get('inspection_notes')});
      if(inspectionError){toast(inspectionError.message,false);modal.querySelector(`#f_${inspectionError.field}`)?.focus();return}
    }
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
    const r=state.records.find(x=>x.id===id);if(!r)return;const data=r.data||{};const edit=can(r.module,'edit',r),del=can(r.module,'delete',r);const renewalRelations=certificateRenewalRelations(r,state.records);const relation=r.module==='licenses'&&(data.renewal_of_record_id||data.renewal_of_reference)?null:state.records.find(x=>x.reference_no===data.related_reference);const linkedActions=state.records.filter(x=>x.module==='actions'&&(x.data?.source_record_id===r.id||x.data?.related_reference===r.reference_no));const canRaiseAction=can('actions','create')&&['observations','incidents','near_miss','first_aid','accidents','inspections','audit','ncr','risk','fire_equipment','third_party','permits','chemicals','drills'].includes(r.module);const printable=JSON.stringify(data,null,2);
    document.getElementById('drawer')?.remove();document.body.insertAdjacentHTML('beforeend',`<aside class="drawer" id="drawer"><div class="drawer-head"><div><div class="eyebrow">${esc(MODULES[r.module]?.label||r.module)}</div><h2>${esc(r.reference_no)}</h2><p class="muted small">Created by ${esc(r.created_by_name||'—')} · ${ago(r.created_at)}</p></div><button class="icon-btn" data-close-drawer>${icon('close',16)}</button></div><div class="drawer-body"><div class="detail-actions"><button class="btn" data-print-record="${r.id}">${icon('download',14)} Print / PDF</button>${canRaiseAction?`<button class="btn primary" data-raise-action="${r.id}">${icon('check',14)} Create corrective action</button>`:''}${edit?`<button class="btn primary" data-edit-record="${r.id}">Edit</button>`:''}${del?`<button class="btn danger" data-delete-record="${r.id}">Delete</button>`:''}</div><div class="record-detail"><div class="detail-box"><label>Date</label><div>${fmtDate(r.event_date)}</div></div><div class="detail-box"><label>Status</label><div>${statusBadge(r.status)}</div></div><div class="detail-box"><label>Department</label><div>${esc(r.department||'—')}</div></div><div class="detail-box"><label>Location</label><div>${esc(r.location||'—')}</div></div><div class="detail-box"><label>Created by</label><div>${esc(r.created_by_name||'—')}</div></div><div class="detail-box"><label>Updated</label><div>${fmtDateTime(r.updated_at||r.created_at)}</div></div></div><div class="form-section"><h3>Summary</h3><p class="detail-prose">${esc(r.summary||'—')}</p></div>${r.module==='actions'?`<div class="form-section action-closure-detail"><h3>Completion &amp; effectiveness</h3><div class="data-kv"><div><span>Completion evidence</span><strong>${esc(data.completion_evidence||'Not recorded')}</strong></div><div><span>Effectiveness result</span><strong>${esc(data.effectiveness_status||'Pending verification')}</strong></div><div><span>Verifier</span><strong>${esc(data.verifier||'Not assigned')}</strong></div><div><span>Verification date</span><strong>${esc(fmtDate(data.verified_at))}</strong></div>${String(data.effectiveness_status||'').toLowerCase()==='not effective'?`<div><span>Further action</span><strong>${esc(data.next_action||'Not recorded')}</strong></div>`:''}</div></div>`:''}${r.module==='inspections'?`<div class="form-section inspection-evidence"><h3>Inspection outcome &amp; follow-up</h3><div class="data-kv"><div><span>Outcome</span><strong>${esc(data.inspection_result||'Not recorded in this record')}</strong></div><div><span>Findings count</span><strong>${esc(data.findings??'Not recorded')}</strong></div><div><span>Follow-up required</span><strong>${esc(data.follow_up_required||'Not recorded')}</strong></div></div>${data.failed_items?`<div class="detail-box"><label>Failed checklist items / findings</label><p class="detail-prose">${esc(data.failed_items)}</p></div>`:''}${data.immediate_controls?`<div class="detail-box"><label>Immediate controls taken</label><p class="detail-prose">${esc(data.immediate_controls)}</p></div>`:''}${data.evidence_reference?`<div class="detail-box"><label>Evidence / photo reference</label><p>${esc(data.evidence_reference)}</p></div>`:''}${data.inspection_notes?`<div class="detail-box"><label>Inspection notes</label><p class="detail-prose">${esc(data.inspection_notes)}</p></div>`:''}</div>`:''}${relation?`<div class="form-section"><h3>Linked reference</h3><button class="link-btn ref" data-detail="${relation.id}">${esc(relation.reference_no)}</button><p class="muted small">${esc(relation.summary||'')}</p></div>`:''}${r.module==='licenses'&&(renewalRelations.predecessor||renewalRelations.successors.length)?`<div class="form-section certificate-renewal-history"><h3>Certificate renewal history</h3>${renewalRelations.predecessor?`<div class="renewal-history-row"><span><b>Renewed from</b><small>${esc(renewalRelations.predecessor.data?.document_name||renewalRelations.predecessor.summary||'Previous certificate')} · Issue: ${fmtDate(renewalRelations.predecessor.data?.issue_date)} · Expiry: ${fmtDate(renewalRelations.predecessor.data?.expiry_date)}</small></span><button class="btn" data-detail="${renewalRelations.predecessor.id}">${esc(renewalRelations.predecessor.reference_no)}</button></div>`:`<p class="muted small">This record has no linked predecessor.</p>`}${renewalRelations.successors.map(n=>`<div class="renewal-history-row"><span><b>Replaced / renewed by</b><small>${esc(n.data?.document_name||n.summary||'Renewal certificate')} · Issue: ${fmtDate(n.data?.issue_date)} · Expiry: ${fmtDate(n.data?.expiry_date)}</small></span><button class="btn" data-detail="${n.id}">${esc(n.reference_no)}</button></div>`).join('')}</div>`:''}${linkedActions.length?`<div class="form-section"><h3>Corrective actions (${linkedActions.length})</h3><div class="linked-action-list">${linkedActions.map(a=>`<button class="linked-action-row" data-detail="${a.id}"><span><b>${esc(a.reference_no)}</b><small>${esc(a.summary||'Corrective action')} · Owner: ${esc(a.data?.responsible||'Unassigned')} · Due: ${fmtDate(a.data?.due_date)} · Priority: ${esc(roleLabel(a.data?.priority||'medium'))}</small></span><span class="badge ${actionDeadlineState(a)==='overdue'?'overdue':esc(a.status||'open')}">${actionDeadlineState(a)==='overdue'?'Overdue':esc(roleLabel(a.status||'open'))}</span></button>`).join('')}</div></div>`:''}<div class="form-section"><h3>Record fields</h3><div class="data-kv">${Object.entries(data).filter(([k,v])=>v!==''&&v!==null&&v!==undefined&&k!=='description'&&k!=='related_reference'&&!(r.module==='inspections'&&['inspection_result','findings','follow_up_required','failed_items','immediate_controls','evidence_reference','inspection_notes'].includes(k))).map(([k,v])=>`<div><span>${esc(k.replaceAll('_',' '))}</span><strong>${esc(typeof v==='object'?JSON.stringify(v):v)}</strong></div>`).join('')||'<span class="muted">No additional fields.</span>'}</div></div>${r.attachment?.path?`<div class="form-section"><h3>Attachment</h3><button class="btn" data-download-attachment="${esc(r.attachment.path)}">Open ${esc(r.attachment.name||'attachment')}</button></div>`:''}<details class="raw-details"><summary>Technical record JSON</summary><pre>${esc(printable)}</pre></details></div></aside>`);wirePageEvents();
  }

  function openLinkedActionForm(sourceId){
    const source=state.records.find(r=>r.id===sourceId);if(!source)return;
    if(!can('actions','create')){toast('You do not have permission to create corrective actions.',false);return}
    const id=`linked-action-${Date.now()}`;
    const sd=source.data||{};const suggestedAction=source.module==='inspections'?[sd.failed_items?`Required corrective measure for failed item(s): ${sd.failed_items}`:'',sd.immediate_controls?`Immediate controls already taken (maintain until permanent correction is verified): ${sd.immediate_controls}`:'',sd.evidence_reference?`Source evidence reference: ${sd.evidence_reference}`:'','Implement the permanent correction, attach objective completion evidence, and verify effectiveness before closure.'].filter(Boolean).join('\n\n'):'';
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="${id}" role="dialog" aria-modal="true"><div class="modal small-modal"><div class="modal-head"><div><div class="eyebrow">Linked workflow · ${esc(source.reference_no)}</div><h2>Create corrective action</h2><p class="muted small">The source record will be linked automatically. Closing this action does not close the source record.</p></div><button class="icon-btn" data-close-modal="${id}">${icon('close',16)}</button></div><div class="modal-body"><div id="linked-action-error"></div><div class="field"><label>Action required *</label><textarea id="la-summary" required placeholder="Describe the specific action needed to control the risk or correct the finding…">${esc(suggestedAction)}</textarea><p class="muted small">Source finding: ${esc(source.summary||'—')}</p></div><div class="form-grid"><div class="field"><label>Action type</label><select id="la-type"><option>Corrective</option><option>Preventive</option><option>Improvement</option></select></div><div class="field"><label>Priority *</label><select id="la-priority"><option>High</option><option>Critical</option><option selected>Medium</option><option>Low</option></select></div><div class="field"><label>Responsible person *</label><input id="la-owner" placeholder="Name / role / department" value="${esc(source.data?.responsible||source.data?.observed_by||'')}"></div><div class="field"><label>Due date *</label><input id="la-due" type="date" min="${today()}" value="${addMonthsISO(today(),0)}"></div><div class="field full"><label>Acceptance / effectiveness check</label><textarea id="la-check" placeholder="What evidence will demonstrate that the action worked?"></textarea></div></div><p class="muted small">Assign an owner and due date. Verify evidence and effectiveness before closing the action.</p></div><div class="modal-foot"><button class="btn" data-close-modal="${id}">Cancel</button><button class="btn primary" id="la-save">Save corrective action</button></div></div></div>`);
    wirePageEvents();document.getElementById('la-save').onclick=async()=>{
      const summary=document.getElementById('la-summary').value.trim(),owner=document.getElementById('la-owner').value.trim(),due=document.getElementById('la-due').value,priority=document.getElementById('la-priority').value;
      const errorBox=document.getElementById('linked-action-error');
      if(!summary||!owner||!due){errorBox.innerHTML=noticeHtml('Enter the action required, responsible person and due date.','error');return}
      if(due<today()){errorBox.innerHTML=noticeHtml('The due date cannot be in the past.','error');return}
      const normalizeActionText=v=>String(v||'').toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
      const summaryKey=normalizeActionText(summary);
      const duplicate=state.records.find(r=>r.module==='actions'&&!['closed','cancelled','void'].includes(String(r.status||'').toLowerCase())&&normalizeActionText(r.summary||r.data?.description)===summaryKey&&(r.data?.source_record_id===source.id||r.data?.related_reference===source.reference_no));
      if(duplicate){errorBox.innerHTML=noticeHtml(`A matching active action already exists for this source: <b>${esc(duplicate.reference_no)}</b>. Open and update the existing action instead of creating a duplicate. <button type="button" class="btn" id="la-open-existing">Open existing action</button>`,'error');document.getElementById('la-open-existing')?.addEventListener('click',()=>{document.getElementById(id)?.remove();document.getElementById('drawer')?.remove();detail(duplicate.id)});return}
      const btn=document.getElementById('la-save');btn.disabled=true;btn.textContent='Saving…';
      const data={action_type:document.getElementById('la-type').value,responsible:owner,due_date:due,priority,verification:document.getElementById('la-check').value.trim(),related_reference:source.reference_no,source_module:source.module,source_record_id:source.id,source_summary:source.summary||'',effectiveness_status:'Pending verification',description:summary};
      const {error}=await sb.rpc('create_hse_record',{p_org_id:activeOrgId(),p_module:'actions',p_event_date:today(),p_location:source.location||'',p_department:source.department||state.membership?.department||'',p_status:'open',p_summary:summary,p_data:data,p_attachment:null});
      if(error){btn.disabled=false;btn.textContent='Save corrective action';errorBox.innerHTML=noticeHtml(`Could not save the action: ${esc(error.message||error)}`,'error');return}
      document.getElementById(id)?.remove();toast('Corrective action saved and linked to '+source.reference_no+'.');await loadRecords();renderPage();updateNotificationCount();
    };
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
    document.getElementById('content').innerHTML=`${pageHeader(`<button class="btn" data-go="users">Users & Roles</button><button class="btn" id="new-org-btn">${icon('plus2',14)} Create another company</button>`)}<div class="grid-2"><section class="card panel"><div class="section-title"><div><h2>Company profile</h2><p>${roleCanAdmin()?'Editable by company administrators.':'Read-only workspace identity.'}</p></div></div><div class="form-grid"><div class="field"><label>Company name</label><input id="set_name" value="${esc(o.name||'')}" ${roleCanAdmin()?'':'disabled'}></div><div class="field"><label>Legal name</label><input id="set_legal" value="${esc(o.legal_name||'')}" ${roleCanAdmin()?'':'disabled'}></div><div class="field"><label>Industry</label><input id="set_industry" value="${esc(o.industry||'')}" ${roleCanAdmin()?'':'disabled'}></div><div class="field"><label>Country</label><input id="set_country" value="${esc(o.country||'')}" ${roleCanAdmin()?'':'disabled'}></div><div class="field full"><label>Address</label><textarea id="set_address" ${roleCanAdmin()?'':'disabled'}>${esc(o.address||'')}</textarea></div><div class="field"><label>Reference prefix</label><input id="set_prefix" value="${esc(state.activeOrg?.slug==='nuhas'?'NUHAS':(state.activeOrg?.join_code?.split('-')[0]||'HSE360'))}" ${roleCanAdmin()?'':'disabled'}></div><div class="field"><label>Company access code</label><input value="${esc(m.join_code||'Hidden — administrator only')}" disabled></div></div>${roleCanAdmin()?`<div class="company-logo-preview" id="company-logo-preview">${orgLogo(o)?`<img id="set-logo-preview" src="${esc(orgLogo(o))}" alt="Company logo preview">`:`<div id="set-logo-empty" class="logo-empty">No custom logo selected. Select PNG, JPG or WEBP, maximum 2 MB.</div>`}<small>Preview · PNG/JPG/WEBP · Maximum 2 MB. Existing logo remains active unless the profile saves successfully.</small></div><div class="setting-actions"><div class="field logo-file-field"><label for="set_logo">Company logo</label><input id="set_logo" type="file" accept="image/png,image/jpeg,image/webp"></div><button class="btn primary" id="save-org">Save company profile</button></div>`:''}</section><section class="card panel"><div class="section-title"><div><h2>Current access</h2><p>Your role and permission model in this company.</p></div></div><div class="detail-box"><label>Role</label><div>${esc(roleLabel(m.role))}</div></div><div style="height:10px"></div><div class="detail-box"><label>Status</label><div>${statusBadge(m.status)}</div></div><div style="height:10px"></div><div class="detail-box"><label>Department</label><div>${esc(m.department||state.profile?.department||'—')}</div></div><div style="height:10px"></div><div class="detail-box"><label>Data isolation</label><div>This workspace is enforced by Supabase RLS using organization membership.</div></div><div class="notice success" style="margin-top:14px">NUHAS is one company workspace. A new company created from this account starts empty and remains isolated from NUHAS.</div></section></div>`;
    document.getElementById('new-org-btn').addEventListener('click',()=>onboardingModal('create'));
    if(roleCanAdmin()){
      document.getElementById('save-org').addEventListener('click',saveOrganization);
      document.getElementById('set_logo')?.addEventListener('change',e=>{
        const file=e.target.files?.[0];if(!file)return;
        if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){e.target.value='';toast('Choose a PNG, JPG or WEBP logo no larger than 2 MB.',false);return}
        const box=document.getElementById('company-logo-preview');if(!box)return;
        let img=box.querySelector('img');if(!img){img=document.createElement('img');img.id='set-logo-preview';img.alt='Company logo preview';box.prepend(img)}
        const previous=img.dataset.objectUrl;if(previous)URL.revokeObjectURL(previous);const objectUrl=URL.createObjectURL(file);img.src=objectUrl;img.dataset.objectUrl=objectUrl;box.querySelector('.logo-empty')?.remove();
      });
    }
    wirePageEvents();
  }

  async function saveOrganization(){
    const button=document.getElementById('save-org');if(button){button.disabled=true;button.textContent='Saving profile…'}
    let logoUrl=state.activeOrg.logo_url||'',uploadedPath='';const file=document.getElementById('set_logo')?.files?.[0];
    if(file){
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size<=0||file.size>2*1024*1024){toast('Choose a valid PNG, JPG or WEBP logo no larger than 2 MB.',false);if(button){button.disabled=false;button.textContent='Save company profile'}return}
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=`${activeOrgId()}/${crypto.randomUUID()}-${safe}`;
      const up=await sb.storage.from('org-branding').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
      if(up.error){toast(`Logo upload failed. Check the org-branding bucket and administrator Storage policy. ${up.error.message}`,false);if(button){button.disabled=false;button.textContent='Save company profile'}return}
      uploadedPath=path;logoUrl=sb.storage.from('org-branding').getPublicUrl(path).data.publicUrl;
    }
    const {data,error}=await sb.rpc('admin_update_organization',{p_org_id:activeOrgId(),p_name:document.getElementById('set_name').value.trim(),p_legal_name:document.getElementById('set_legal').value.trim()||null,p_industry:document.getElementById('set_industry').value.trim()||null,p_country:document.getElementById('set_country').value.trim()||'United Arab Emirates',p_address:document.getElementById('set_address').value.trim()||null,p_logo_url:logoUrl||null,p_numbering_prefix:document.getElementById('set_prefix').value.trim()||'HSE360'});
    if(error){if(uploadedPath){const cleanup=await sb.storage.from('org-branding').remove([uploadedPath]);if(cleanup.error)console.warn('Could not clean up unlinked company-logo upload:',cleanup.error.message)}toast(`Company profile was not saved. Your previous logo is unchanged. ${error.message}`,false);if(button){button.disabled=false;button.textContent='Save company profile'}return}
    state.activeOrg={...state.activeOrg,...data,logo_url:logoUrl};toast('Company profile saved.');await loadOrganizations();const x=state.orgs.find(o=>o.id===activeOrgId());if(x)state.membership=x;renderApp();
  }

  function renderPage(){if(!document.getElementById('content'))return;document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.nav===state.page));if(state.page==='dashboard')dashboard();else if(state.page==='reports')reportsPage();else if(state.page==='imports')importsPage();else if(state.page==='management')management();else if(state.page==='users')users();else if(state.page==='auditlog')auditlog();else if(state.page==='settings')settingsPage();else modulePage(state.page)}
  function go(page){state.page=page;state.query='';state.status='all';state.department='all';state.dateFrom='';state.dateTo='';document.getElementById('sidebar')?.classList.remove('open');renderPage()}

  function wirePageEvents(){
    document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>go(b.dataset.nav));
    document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>renderForm(b.dataset.new));
    document.querySelectorAll('[data-jsa-picker]').forEach(b=>b.onclick=()=>showJsaPicker(b.closest('.modal')));
    document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
    document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(b.dataset.detail));
    document.querySelectorAll('[data-raise-action]').forEach(b=>b.onclick=()=>openLinkedActionForm(b.dataset.raiseAction));
    document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.closeModal)?.remove());
    document.querySelectorAll('[data-close-drawer]').forEach(b=>b.onclick=()=>document.getElementById('drawer')?.remove());
    document.querySelectorAll('[data-save-form]').forEach(b=>b.onclick=()=>saveForm(b.dataset.saveForm,b.dataset.modal,b.dataset.recordId||''));
    document.querySelectorAll('[data-edit-record]').forEach(b=>b.onclick=()=>{document.getElementById('drawer')?.remove();const r=state.records.find(x=>x.id===b.dataset.editRecord);if(r)renderForm(r.module,r.id)});
    document.querySelectorAll('[data-delete-record]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.deleteRecord));
    document.querySelectorAll('[data-export-module]').forEach(b=>b.onclick=()=>exportCSV(b.dataset.exportModule));
    document.querySelectorAll('[data-import-module]').forEach(b=>b.onclick=()=>{state.importTarget=b.dataset.importModule;const input=document.getElementById(`csv-import-${b.dataset.importModule}`);if(input)input.click();else go('imports')});
    document.querySelectorAll('input[id^="csv-import-"]').forEach(inp=>inp.onchange=e=>{const f=e.target.files?.[0];if(!f)return;state.importTarget=inp.id.replace('csv-import-','');go('imports');handleImportFile(f)});
    document.querySelectorAll('[data-backup]').forEach(b=>b.onclick=backup);
    document.querySelectorAll('[data-reset-user]').forEach(b=>b.onclick=()=>resetUser(b.dataset.resetUser,b.dataset.resetName));
    document.querySelectorAll('[data-member-save]').forEach(b=>b.onclick=()=>saveMember(b.dataset.memberSave));
    document.querySelectorAll('[data-member-perms]').forEach(b=>b.onclick=()=>permissionsModal(b.dataset.memberPerms));
    document.querySelectorAll('[data-download-attachment]').forEach(b=>b.onclick=()=>downloadAttachment(b.dataset.downloadAttachment));
    document.querySelectorAll('[data-export]').forEach(b=>b.onclick=exportAll);document.querySelectorAll('[data-export-audit]').forEach(b=>b.onclick=exportAudit);document.querySelectorAll('[data-export-renewals]').forEach(b=>b.onclick=exportComplianceRenewals);
    document.querySelectorAll('[data-print-record]').forEach(b=>b.onclick=()=>printRecord(b.dataset.printRecord));
    const permitType=document.querySelector('[data-permit-type]');if(permitType)permitType.onchange=()=>renderPermitDynamic(document.getElementById(permitType.closest('.modal').id),collectFormData(permitType.closest('.modal')));
  }

  function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue}if(c==='"'){quoted=!quoted;continue}if(c===','&&!quoted){row.push(cell);cell='';continue}if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()!==''))rows.push(row);row=[];continue}cell+=c}if(quoted)throw new Error('CSV contains an unclosed quoted field. Correct the source file and retry.');if(cell!==''||row.length){row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row)}return rows}

  async function importCSV(module,file){
    if(!file)return;if(!can(module,'create')){toast('CSV import requires create permission for this module.',false);return}
    const text=await file.text(),rows=parseCSV(text);if(rows.length<2){toast('CSV contains no data rows.',false);return}const headers=rows[0].map(x=>x.trim().toLowerCase().replace(/[\s\/-]+/g,'_'));const dataRows=rows.slice(1);if(!confirm(`Import ${dataRows.length} ${MODULES[module]?.label||module} records? Existing records will not be overwritten.`))return;let ok=0,fail=0;
    for(const vals of dataRows){const raw={};headers.forEach((h,i)=>raw[h]=String(vals[i]??'').trim());const eventDate=raw.event_date||raw.date||raw.inspection_date||raw.issue_date||raw.joining_date||today();const location=raw.location||raw.equipment_location||raw.area||'';const department=raw.department||raw.department_name||state.membership?.department||'';const status=raw.status||raw.renewal_status||raw.inspection_status||'open';const summary=raw.summary||raw.description||raw.document_name||raw.employee_name||raw.equipment_id||raw.ppe_item||raw.equipment_type||`${MODULES[module]?.singular||module} record`;const d={...raw};['event_date','date','location','equipment_location','area','department','department_name','status','summary','description'].forEach(k=>delete d[k]);const {error}=await sb.rpc('create_hse_record',{p_org_id:activeOrgId(),p_module:module,p_event_date:eventDate,p_location:location,p_department:department,p_status:status,p_summary:summary,p_data:d,p_attachment:null});if(error)fail++;else ok++}
    await loadRecords();renderPage();toast(`CSV import complete: ${ok} imported${fail?`, ${fail} failed`:''}.`,fail===0)
  }

  function csvCell(v){return `"${String(v??'').replaceAll('"','""')}"`}
  function exportCSV(module){const rows=filteredRecords(module);const keys=['reference_no','event_date','status','department','location','summary','created_by_name','created_at'];const csv=[keys.join(','),...rows.map(r=>keys.map(k=>csvCell(r[k])).join(','))].join('\n');download(csv,`${module}-register-${today()}.csv`,'text/csv;charset=utf-8');toast('Excel-compatible CSV generated.')}
  function exportAll(){const rows=filteredRecords();const keys=['module','reference_no','event_date','status','department','location','summary','created_by_name','created_at'];const csv=[keys.join(','),...rows.map(r=>keys.map(k=>csvCell(r[k])).join(','))].join('\n');download(csv,`${(state.activeOrg?.slug||'hse360')}-all-records-${today()}.csv`,'text/csv;charset=utf-8');toast('Visible company data exported.')}
  function exportComplianceRenewals(){const rows=expiryItems().map(x=>({module:MODULES[x.r.module]?.label||x.r.module,reference_no:x.r.reference_no||'',document:x.r.data?.document_name||x.r.data?.certificate||x.r.data?.employee_name||x.r.summary||'',document_number:x.r.data?.document_no||x.r.data?.certificate_no||'',issuer:x.r.data?.authority||x.r.data?.provider||'',responsible:x.r.data?.responsible||x.r.data?.responsible_person||x.r.data?.employee_name||'',expiry_date:x.date,days_remaining:x.daysRemaining===null?'':x.daysRemaining,alert_band:x.band,renewal_status:x.r.data?.renewal_status||x.r.data?.compliance_status||'',renewed_by:certificateRenewalRelations(x.r,state.records).successors.map(n=>n.reference_no).join('; '),record_id:x.r.id||''}));const keys=['module','reference_no','document','document_number','issuer','responsible','expiry_date','days_remaining','alert_band','renewal_status','renewed_by','record_id'];const csv=[keys.join(','),...rows.map(r=>keys.map(k=>csvCell(r[k])).join(','))].join('\n');download(csv,`${state.activeOrg?.slug||'hse360'}-compliance-renewal-watch-${today()}.csv`,'text/csv;charset=utf-8');toast(`Compliance renewal list exported (${rows.length} record${rows.length===1?'':'s'}).`)}
  async function exportAudit(){if(!roleCanAdmin()){toast('Access restricted.',false);return}const {data,error}=await sb.from('audit_events').select('*').eq('organization_id',activeOrgId()).order('created_at',{ascending:false}).limit(5000);if(error){toast(error.message,false);return}const keys=['created_at','action','target_type','target_id','actor_id','details'];const csv=[keys.join(','),...(data||[]).map(r=>keys.map(k=>csvCell(k==='details'?JSON.stringify(r[k]||{}):r[k])).join(','))].join('\n');download(csv,`${state.activeOrg?.slug||'hse360'}-audit-${today()}.csv`,'text/csv;charset=utf-8');toast('Audit CSV generated.')}
  function backup(){download(JSON.stringify({application:'HSE360',organization:state.activeOrg,exported_at:new Date().toISOString(),records:state.records},null,2),`${state.activeOrg?.slug||'hse360'}-backup-${today()}.json`,'application/json');toast('Company JSON backup generated.')}
  function download(data,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
  async function downloadAttachment(path){const {data,error}=await sb.storage.from('hse-attachments').createSignedUrl(path,300);if(error){toast(error.message,false);return}window.open(data.signedUrl,'_blank','noopener')}

  function notificationItems(){
    const overdue=recs('actions').filter(r=>!['closed','draft','cancelled','void'].includes(String(r.status||'').toLowerCase())&&r.data?.due_date&&r.data.due_date<today()).map(r=>({type:'Overdue corrective action',ref:r.reference_no,text:r.data?.responsible||'Responsible person not set',page:'actions'}));
    const high=recs('risk').filter(r=>['High','Extreme'].includes(r.data?.level)).map(r=>({type:`${r.data?.level||'High'} risk`,ref:r.reference_no,text:r.data?.hazard||r.summary,page:'risk'}));
    const permits=permitAlerts().map(r=>({type:new Date(r._time)<new Date()?'Permit expired':'Permit expires soon',ref:r.reference_no,text:r.data?.permit_type?PERMIT_TYPES.find(x=>x.value===r.data.permit_type)?.label||r.data.permit_type:r.summary,page:'permits'}));
    const compliance=expiryItems().map(x=>{const owner=x.r.data?.responsible||x.r.data?.responsible_person||x.r.data?.employee_name||x.r.data?.owner||'Owner not assigned';const timing=x.invalid?`Invalid expiry date: ${x.date}`:x.daysRemaining<0?`Expired ${fmtDate(x.date)} · ${Math.abs(x.daysRemaining)} day(s) overdue`:x.daysRemaining===0?`Expires today · ${fmtDate(x.date)}`:`Expires ${fmtDate(x.date)} · ${x.daysRemaining} day(s) remaining`;return {type:x.band,ref:x.r.reference_no,text:`${x.r.data?.document_name||x.r.data?.certificate||x.r.data?.employee_name||x.r.summary} · ${owner} · ${timing}`,page:x.r.module}});
    return [...overdue,...high,...permits,...compliance].sort((a,b)=>a.type.localeCompare(b.type));
  }
  function notificationStorageKey(){return `hse360_notice_state_${activeOrgId()}_${state.session?.user?.id||'user'}`}
  function localNoticeState(){try{const v=JSON.parse(localStorage.getItem(notificationStorageKey())||'{"read":[],"cleared":[]}');return {read:Array.isArray(v.read)?v.read:[],cleared:Array.isArray(v.cleared)?v.cleared:[]}}catch{return {read:[],cleared:[]}}}
  function noticeItemKey(x){return `${x.ref}|${x.type}`}
  async function loadNotificationState(){
    const local=localNoticeState();state.noticeState=local;state.noticeRemote=false;
    if(!sb||!activeOrgId()||!state.session?.user?.id)return;
    try{const {data,error}=await sb.from('user_notification_state').select('notification_key,read_at,dismissed_at').eq('organization_id',activeOrgId()).eq('user_id',state.session.user.id).limit(2000);if(error){console.info('Persistent notification state unavailable; using this browser only until the V8.6 SQL migration is applied.',error.message);return}state.noticeState={read:(data||[]).filter(x=>x.read_at).map(x=>x.notification_key),cleared:(data||[]).filter(x=>x.dismissed_at).map(x=>x.notification_key)};state.noticeRemote=true;localStorage.setItem(notificationStorageKey(),JSON.stringify(state.noticeState))}catch(e){console.info('Notification state fallback:',e?.message||e)}
  }
  async function persistNotificationState(saved,keys){
    state.noticeState={read:[...new Set(saved.read||[])],cleared:[...new Set(saved.cleared||[])]};
    try{localStorage.setItem(notificationStorageKey(),JSON.stringify(state.noticeState))}catch{}
    if(!sb||!activeOrgId()||!state.session?.user?.id||!keys?.length)return;
    const stamp=new Date().toISOString();const readSet=new Set(state.noticeState.read),clearSet=new Set(state.noticeState.cleared);
    const rows=keys.map(k=>({organization_id:activeOrgId(),user_id:state.session.user.id,notification_key:k,read_at:readSet.has(k)?stamp:null,dismissed_at:clearSet.has(k)?stamp:null,updated_at:stamp}));
    try{const {error}=await sb.from('user_notification_state').upsert(rows,{onConflict:'organization_id,user_id,notification_key'});if(error){state.noticeRemote=false;console.info('Persistent notification state not enabled. Browser-local state remains available.',error.message)}else state.noticeRemote=true}catch(e){state.noticeRemote=false;console.info('Persistent notification state fallback:',e?.message||e)}
  }
  function unreadNotificationItems(){const saved=state.noticeState||localNoticeState();return notificationItems().filter(x=>!saved.cleared.includes(noticeItemKey(x))&&!saved.read.includes(noticeItemKey(x)))}
  function updateNotificationCount(){
    const saved=state.noticeState||localNoticeState();const active=notificationItems().filter(x=>!saved.cleared.includes(noticeItemKey(x)));const unread=active.filter(x=>!saved.read.includes(noticeItemKey(x)));const c=document.getElementById('notification-count');if(c){c.textContent=unread.length?String(Math.min(unread.length,99)):'';c.style.display=unread.length?'grid':'none'}
    document.querySelectorAll('[data-nav-badge]').forEach(b=>{const n=Math.max(unread.filter(x=>x.page===b.dataset.navBadge).length,b.dataset.navBadge==='actions'?openActions():0);b.textContent=n?String(Math.min(n,99)):'';b.style.display=n?'grid':'none'});
    document.querySelectorAll('[data-nav-section-badge]').forEach(b=>{const group=GROUPS[Number(b.dataset.navSectionBadge)];const n=group?group[1].reduce((sum,[page])=>sum+unread.filter(x=>x.page===page).length,0):0;b.textContent=n?String(Math.min(n,99)):'';b.style.display=n?'inline-flex':'none'});
  }
  function navBadgeCount(page){return unreadNotificationItems().filter(x=>x.page===page).length}
  function showNotifications(){
    document.getElementById('notification-panel')?.remove();const all=notificationItems(),saved=state.noticeState||localNoticeState(),items=all.filter(x=>!saved.cleared.includes(noticeItemKey(x)));
    document.body.insertAdjacentHTML('beforeend',`<div class="notification-popover" id="notification-panel"><div class="section-title"><div><h2>Notifications</h2><p>${items.length?`${items.length} active item${items.length===1?'':'s'} · ${items.filter(x=>!saved.read.includes(noticeItemKey(x))).length} unread`:'No active notifications'}</p></div><button class="icon-btn" data-close-notifications>${icon('close',14)}</button></div><div class="notification-actions"><button class="btn small" data-notice-read-all>Mark all read</button><button class="btn small" data-notice-clear-all>Clear list</button></div>${items.length?items.slice(0,100).map(x=>{const k=noticeItemKey(x),read=saved.read.includes(k);return `<div class="notice-item ${read?'notice-read':''}"><button class="attention-row" data-notification-page="${esc(x.page)}" data-notification-key="${esc(k)}" style="flex:1;text-align:left;background:transparent;border:0"><span class="attention-dot ${read?'':'dot-red'}"></span><span style="flex:1"><b>${esc(x.type)} · ${esc(x.ref)}</b><span>${esc(x.text)}</span></span>${icon('chevron',14)}</button><button class="notice-mark" data-notice-read="${esc(k)}">${read?'Read':'Mark read'}</button></div>`}).join(''):'<div class="empty" style="padding:25px 5px"><strong>All clear</strong>No active notifications are currently shown.</div>'}</div>`);
    const persist=async(next)=>{const keys=all.map(noticeItemKey);await persistNotificationState(next,keys);document.getElementById('notification-panel')?.remove();showNotifications();updateNotificationCount()};
    document.querySelector('[data-close-notifications]')?.addEventListener('click',()=>document.getElementById('notification-panel')?.remove());
    document.querySelector('[data-notice-read-all]')?.addEventListener('click',()=>{persist({...saved,read:[...new Set([...saved.read,...items.map(noticeItemKey)])]})});
    document.querySelector('[data-notice-clear-all]')?.addEventListener('click',()=>{if(!confirm('Clear the current notification list? This dismisses alerts only; it does not delete or close HSE records.'))return;persist({...saved,cleared:[...new Set([...saved.cleared,...items.map(noticeItemKey)])]})});
    document.querySelectorAll('[data-notice-read]').forEach(b=>b.onclick=()=>persist({...saved,read:[...new Set([...saved.read,b.dataset.noticeRead])] }));
    document.querySelectorAll('[data-notification-page]').forEach(b=>b.onclick=async()=>{const k=b.dataset.notificationKey;await persistNotificationState({...saved,read:[...new Set([...saved.read,k])]},all.map(noticeItemKey));document.getElementById('notification-panel')?.remove();go(b.dataset.notificationPage);updateNotificationCount()});
  }

  function printRecord(id){
    const r=state.records.find(x=>x.id===id);if(!r)return;
    const org=state.activeOrg||{},logo=orgLogo(org),mod=MODULES[r.module]||{label:r.module,code:String(r.module||'REC').toUpperCase()};
    const docNo=String(r.data?.document_no||r.reference_no||`${org.slug||'HSE360'}-${mod.code}-${r.id.slice(0,8)}`).toUpperCase();
    const revision=String(r.data?.revision||r.data?.document_revision||'00'),issue=r.data?.document_issue_date||today(),prepared=r.data?.prepared_by||state.profile?.full_name||state.profile?.username||'Not assigned',reviewed=r.data?.reviewed_by||'',approved=r.data?.approved_by||'';
    const pretty=k=>String(k).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
    const fireCheckKeys=['pressure_gauge','body_cylinder','instruction_label','hose_nozzle','pin_seal','accessible','mounting','inspection_sticker','inspection_status','follow_up_required'];const allData=Object.entries(r.data||{}).filter(([k,v])=>!['description','related_reference'].includes(k)&&v!==''&&v!==null&&v!==undefined);const fireChecks=allData.filter(([k])=>fireCheckKeys.includes(k));const rows=allData.filter(([k])=>!fireCheckKeys.includes(k)).map(([k,v])=>`<tr><th>${esc(pretty(k))}</th><td>${esc(typeof v==='object'?JSON.stringify(v):v)}</td></tr>`).join('');const checklistRows=fireChecks.map(([k,v])=>`<tr><td>${esc(pretty(k))}</td><td>${esc(String(v))}</td><td>${['NOT OK','No','Fail'].includes(String(v))?'Action required':(['OK','Yes','Pass','N/A'].includes(String(v))?'Recorded':'Review')}</td></tr>`).join('');
    const w=window.open('','_blank');if(!w){toast('Popup blocked. Allow popups for PDF/print output.',false);return}w.opener=null;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(docNo)}</title><style>@page{size:A4 portrait;margin:14mm}body{font:12px Arial,sans-serif;color:#1f2937;margin:0}header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #159a5b;padding-bottom:14px;margin-bottom:14px}header img{max-width:170px;max-height:62px;object-fit:contain}h1{font-size:20px;margin:0 0 5px}h2{font-size:13px;margin:20px 0 8px;color:#137348}.muted{color:#667085;font-size:10px}.meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0}.box{border:1px solid #d8dee8;border-radius:3px;padding:8px;min-height:30px}.box b{display:block;font-size:9px;color:#667085;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #d8dee8;padding:7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{width:32%;background:#f5f7fa;text-transform:capitalize}.approval{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:22px}.approval div{border:1px solid #d8dee8;min-height:65px;padding:9px}.approval b{font-size:10px}.approval span{display:block;border-top:1px solid #9aa5b1;margin-top:34px;padding-top:4px;font-size:9px;color:#667085}.docfoot{border-top:1px solid #d8dee8;padding-top:7px;margin-top:16px;display:flex;justify-content:space-between;gap:10px;font-size:9px;color:#667085}thead{display:table-header-group}tr{break-inside:avoid}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header>${logo?`<img src="${esc(logo)}" alt="Company logo">`:''}<div><div class="muted">${esc(org.legal_name||org.name||'HSE360')}</div><h1>${esc(mod.label)} Record</h1><div class="muted">Reference: ${esc(r.reference_no||'Not assigned')}</div></div></header><div class="meta"><div class="box"><b>Document No.</b>${esc(docNo)}</div><div class="box"><b>Revision No.</b>${esc(revision)}</div><div class="box"><b>Issue Date</b>${fmtDate(issue)}</div><div class="box"><b>Event / Inspection Date</b>${fmtDate(r.event_date)}</div><div class="box"><b>Status</b>${esc(roleLabel(r.status))}</div><div class="box"><b>Prepared By</b>${esc(prepared)}</div><div class="box"><b>Department</b>${esc(r.department||'—')}</div><div class="box"><b>Location</b>${esc(r.location||'—')}</div><div class="box"><b>Reporting Company</b>${esc(org.name||'—')}</div></div><h2>Summary / Purpose</h2><p>${esc(r.summary||'—')}</p>${r.module==='fire_equipment'?`<h2>Fire equipment inspection checklist</h2><p class="muted">Checklist period: ${esc(r.data?.checklist_period||r.data?.inspection_frequency||'Not specified')} · Inspection status: ${esc(r.data?.inspection_status||'Not recorded')}</p><table><thead><tr><th>Inspection point</th><th>Result</th><th>Disposition</th></tr></thead><tbody>${checklistRows||'<tr><td colspan="3">No checklist results were recorded.</td></tr>'}</tbody></table><h2>Equipment and inspection details</h2><table><thead><tr><th>Field</th><th>Recorded value</th></tr></thead><tbody>${rows||'<tr><td colspan="2">No additional fields were recorded.</td></tr>'}</tbody></table>`:`<h2>Record details</h2><table><thead><tr><th>Item / field</th><th>Recorded result</th></tr></thead><tbody>${allData.map(([k,v])=>`<tr><th>${esc(pretty(k))}</th><td>${esc(typeof v==='object'?JSON.stringify(v):v)}</td></tr>`).join('')||'<tr><td colspan="2">No additional fields were recorded.</td></tr>'}</tbody></table>`}<div class="approval"><div><b>Prepared by</b><strong>${esc(prepared)}</strong><span>Name / signature / date</span></div><div><b>Reviewed by</b><strong>${esc(reviewed||'Not assigned')}</strong><span>Name / signature / date</span></div><div><b>Approved by (if required)</b><strong>${esc(approved||'Not approved')}</strong><span>Name / signature / date</span></div></div><div class="docfoot"><span>HSE360 · ${esc(docNo)} · Rev ${esc(revision)}</span><span>Printed ${fmtDateTime(new Date().toISOString())} · UNCONTROLLED WHEN PRINTED</span></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close()
  }

  function toggleTheme(){state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem('hse360_theme',state.theme);applyTheme();document.getElementById('theme-btn').innerHTML=icon(state.theme==='dark'?'sun':'moon',16)}
  function applyTheme(){document.documentElement.dataset.theme=state.theme}

  window.go=go;window.refresh=refresh;window.signout=signout;window.renderForm=renderForm;window.saveForm=saveForm;window.backup=backup;window.exportCSV=exportCSV;
  init();
})();
