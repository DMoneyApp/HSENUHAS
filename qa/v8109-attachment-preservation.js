'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const migration=fs.readFileSync(path.join(root,'supabase','v8.10.9-attachment-preservation.sql'),'utf8');
const core=fs.readFileSync(path.join(root,'supabase','v8-multitenant.sql'),'utf8');
const enhancement=fs.readFileSync(path.join(root,'supabase','v8.6-enhancements.sql'),'utf8');
const updateSection=sql=>{
  const start=sql.indexOf('create or replace function public.update_hse_record(');
  const end=sql.indexOf('\n$$;',start);
  assert(start>=0&&end>start,'update_hse_record function was not found');
  return sql.slice(start,end);
};
for(const [name,sql] of [['migration',migration],['core schema',core],['enhancement schema',enhancement]]){
  assert(/attachment\s*=\s*coalesce\(p_attachment\s*,\s*(?:r|target)\.attachment\)/i.test(updateSection(sql)),`${name} must retain the existing attachment when p_attachment is NULL`);
}
assert(/set search_path\s*=\s*''/i.test(migration),'migration must pin its SECURITY DEFINER search_path');
assert(/has_module_permission\(auth\.uid\(\),p_org_id,r\.module,'edit_own'/i.test(migration),'migration must retain record edit authorization');
assert(/insert into public\.audit_events[\s\S]*?'UPDATE'[\s\S]*?'hse_record'/i.test(migration),'migration must retain the update audit event');
assert(/hse360_validate_permit_authorization/i.test(migration),'migration must retain the installed permit authorization preflight');
console.log('ATTACHMENT PRESERVATION: PASSED (3 SQL paths, authorization, audit, permit validation and pinned search_path)');
