-- Apply after registration-office-details.sql. Dates use Asia/Bangkok.
-- Rollout compatibility: existing approved records keep access until their actual
-- delivery date is configured. Every new registration requires a service term.
-- No dates, passwords, approval states or published content are backfilled.
ALTER TABLE localgov.registrations ADD COLUMN IF NOT EXISTS service_term_required boolean NOT NULL DEFAULT false;
ALTER TABLE localgov.registrations ALTER COLUMN service_term_required SET DEFAULT true;
-- expires_on is the exclusive end: access stops at 00:00 on the two-year anniversary.
ALTER TABLE localgov.registrations ADD COLUMN IF NOT EXISTS start_on date;
ALTER TABLE localgov.registrations ADD COLUMN IF NOT EXISTS expires_on date GENERATED ALWAYS AS ((start_on + interval '2 years')::date) STORED;
ALTER TABLE localgov.registrations ADD CONSTRAINT registration_start_range CHECK (start_on IS NULL OR start_on BETWEEN DATE '1900-01-01' AND DATE '9997-12-31');

CREATE OR REPLACE FUNCTION localgov.site_access_status(p_site_id text) RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce((SELECT CASE
  WHEN r.approval_status<>'approved' THEN r.approval_status
  WHEN r.start_on IS NULL AND NOT r.service_term_required THEN 'active'
  WHEN r.start_on IS NULL THEN 'awaiting_start'
  WHEN (now() AT TIME ZONE 'Asia/Bangkok')::date < r.start_on THEN 'scheduled'
  WHEN (now() AT TIME ZONE 'Asia/Bangkok')::date >= r.expires_on THEN 'expired'
  ELSE 'active' END FROM localgov.registrations r WHERE r.site_id=p_site_id),'pending');
$$;

CREATE OR REPLACE FUNCTION localgov.require_manager(p_site_id text,p_user_id text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF localgov.is_platform_admin(p_user_id) THEN RETURN; END IF;
 IF p_user_id LIKE 'site-admin:%' AND p_user_id<>'site-admin:'||p_site_id THEN RAISE EXCEPTION 'Unauthorized site' USING ERRCODE='42501'; END IF;
 IF localgov.site_access_status(p_site_id)<>'active' THEN RAISE EXCEPTION 'Account not approved' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM localgov.sites s WHERE s.id=p_site_id AND (s.owner_user_id=p_user_id OR EXISTS(SELECT 1 FROM localgov.site_members m WHERE m.site_id=s.id AND m.user_id=p_user_id AND m.active))) THEN RAISE EXCEPTION 'Unauthorized site' USING ERRCODE='42501'; END IF;
END; $$;

DROP FUNCTION localgov.review_agency(text,text,text,text,text,text);
CREATE OR REPLACE FUNCTION localgov.review_agency(p_site_id text,p_actor_id text,p_status text,p_domain_label text,p_username text DEFAULT NULL,p_password text DEFAULT NULL,p_start_on date DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE previous localgov.registrations%ROWTYPE; start_date date;
BEGIN
 IF NOT localgov.is_platform_admin(p_actor_id) THEN RAISE EXCEPTION 'Platform admin required' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_domain_label IS NULL OR p_status NOT IN('approved','rejected','suspended') OR p_domain_label !~ '^[a-z][a-z0-9-]{2,59}$' OR p_domain_label IN('www','admin','api','mail','website','register') THEN RAISE EXCEPTION 'Invalid review'; END IF;
 SELECT * INTO previous FROM localgov.registrations WHERE site_id=p_site_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Registration missing'; END IF;
 start_date:=coalesce(p_start_on,previous.start_on);
 IF p_status='approved' AND start_date IS NULL THEN RAISE EXCEPTION 'Delivery date required'; END IF;
 UPDATE localgov.registrations SET approval_status=p_status,start_on=start_date,service_term_required=CASE WHEN start_date IS NOT NULL THEN true ELSE service_term_required END,domain_status=CASE WHEN domain_label=p_domain_label THEN domain_status ELSE 'pending_dns' END,domain_label=p_domain_label,reviewed_at=now(),reviewed_by=p_actor_id WHERE site_id=p_site_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Registration missing'; END IF;
 IF p_username IS NOT NULL AND (p_username !~ '^[a-z][a-z0-9._-]{2,39}$' OR p_username IN('admin','root','system')) THEN RAISE EXCEPTION 'Invalid username'; END IF;
 IF p_password IS NOT NULL AND (length(p_password)<12 OR octet_length(p_password)>72) THEN RAISE EXCEPTION 'Invalid password'; END IF;
 IF NOT EXISTS(SELECT 1 FROM localgov.local_admin_accounts WHERE site_id=p_site_id) AND (p_username IS NOT NULL OR p_password IS NOT NULL) THEN
 IF p_username IS NULL OR p_password IS NULL THEN RAISE EXCEPTION 'Username and password required'; END IF;
 INSERT INTO localgov.local_admin_accounts(site_id,user_id,username,password_hash,active) VALUES(p_site_id,'site-admin:'||p_site_id,p_username,extensions.crypt(p_password,extensions.gen_salt('bf',12)),p_status='approved');
 INSERT INTO localgov.site_members(id,site_id,user_id,email,role,department,active) VALUES(gen_random_uuid()::text,p_site_id,'site-admin:'||p_site_id,'','super_admin','ผู้ดูแลเว็บไซต์',p_status='approved') ON CONFLICT(site_id,user_id) DO NOTHING;
 END IF;
 UPDATE localgov.local_admin_accounts SET active=p_status='approved',username=coalesce(p_username,username),password_hash=CASE WHEN p_password IS NULL THEN password_hash ELSE extensions.crypt(p_password,extensions.gen_salt('bf',12)) END,failed_attempts=0,locked_until=NULL WHERE site_id=p_site_id;
 UPDATE localgov.site_members SET active=p_status='approved' WHERE site_id=p_site_id AND user_id='site-admin:'||p_site_id;
 DELETE FROM localgov.local_admin_sessions WHERE site_id=p_site_id;
 INSERT INTO localgov.audit_logs(id,site_id,actor_user_id,actor_email,action,entity_type,entity_id,metadata) VALUES(gen_random_uuid()::text,p_site_id,p_actor_id,'','registration.'||p_status,'site',p_site_id,jsonb_build_object('domain',p_domain_label||'.weblocalgov.com','credentialsChanged',p_password IS NOT NULL OR p_username IS NOT NULL,'previousStatus',previous.approval_status,'previousStartOn',previous.start_on,'startOn',start_date,'expiresOn',(start_date+interval '2 years')::date)::text);
END; $$;

CREATE OR REPLACE FUNCTION localgov.list_agencies(p_actor_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT localgov.is_platform_admin(p_actor_id) THEN RAISE EXCEPTION 'Platform admin required' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'slug',s.slug,'province',s.province,'email',s.email,'phone',s.phone,'status',s.status,'username',a.username,'contactName',r.contact_name,'approvalStatus',r.approval_status,'domainLabel',r.domain_label,'domainStatus',r.domain_status,'submittedAt',r.submitted_at,'startOn',r.start_on,'expiresOn',r.expires_on,'accessStatus',localgov.site_access_status(s.id)) ORDER BY r.submitted_at DESC) FROM localgov.sites s JOIN localgov.registrations r ON r.site_id=s.id LEFT JOIN localgov.local_admin_accounts a ON a.site_id=s.id),'[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION localgov.login_site_admin(p_site_slug text,p_username text,p_password text,p_session_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE a localgov.local_admin_accounts%ROWTYPE; s localgov.sites%ROWTYPE; expiry text; access_status text;
BEGIN
  IF p_session_hash IS NULL OR p_session_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF p_password IS NULL OR octet_length(p_password)>72 OR length(p_password)=0 THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT * INTO a FROM localgov.local_admin_accounts WHERE username=p_username FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT * INTO s FROM localgov.sites WHERE id=a.site_id;
  IF p_site_slug<>'' AND s.slug<>p_site_slug THEN RETURN jsonb_build_object('ok',false); END IF;
  IF a.locked_until>now() THEN RETURN jsonb_build_object('ok',false,'blocked',true); END IF;
  IF a.locked_until IS NOT NULL OR a.last_failed_at<now()-interval '15 minutes' THEN a.failed_attempts:=0; END IF;
  IF extensions.crypt(p_password,a.password_hash) IS DISTINCT FROM a.password_hash THEN
    UPDATE localgov.local_admin_accounts SET failed_attempts=a.failed_attempts+1,last_failed_at=now(),
      locked_until=CASE WHEN a.failed_attempts+1>=5 THEN now()+interval '5 minutes' ELSE NULL END WHERE site_id=s.id;
    RETURN jsonb_build_object('ok',false,'blocked',a.failed_attempts+1>=5);
  END IF;
  access_status:=localgov.site_access_status(s.id);
  IF access_status<>'active' THEN RETURN jsonb_build_object('ok',false,'pending',access_status='pending','accessStatus',access_status); END IF;
  IF NOT a.active THEN RETURN jsonb_build_object('ok',false,'pending',EXISTS(SELECT 1 FROM localgov.registrations WHERE site_id=s.id AND approval_status='pending')); END IF;
  PERFORM localgov.require_manager(s.id,a.user_id);
  UPDATE localgov.local_admin_accounts SET failed_attempts=0,last_failed_at=NULL,locked_until=NULL WHERE site_id=s.id;
  expiry:=to_char((now()+interval '8 hours') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  DELETE FROM localgov.local_admin_sessions WHERE expires_at<to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  INSERT INTO localgov.local_admin_sessions(id,site_id,user_id,username,expires_at) VALUES(p_session_hash,s.id,a.user_id,a.username,expiry);
  INSERT INTO localgov.audit_logs(id,site_id,actor_user_id,actor_email,action,entity_type,entity_id,metadata)
    VALUES(gen_random_uuid()::text,s.id,a.user_id,'admin@' || s.slug || '.localgov.invalid','auth.login','session',p_session_hash,'{"auth":"site_admin","expiresInHours":8}');
  RETURN jsonb_build_object('ok',true,'siteId',s.id,'expiresAt',expiry);
END; $$;

CREATE OR REPLACE FUNCTION localgov.resolve_site_admin_session(p_session_hash text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object('id',ss.user_id,'siteId',ss.site_id,'username',ss.username,
    'email','admin@' || s.slug || '.localgov.invalid','displayName',ss.username || ' · ' || s.name)
  FROM localgov.local_admin_sessions ss
  JOIN localgov.local_admin_accounts a ON a.site_id=ss.site_id AND a.user_id=ss.user_id AND a.active
  JOIN localgov.sites s ON s.id=ss.site_id
  JOIN localgov.site_members m ON m.site_id=ss.site_id AND m.user_id=ss.user_id AND m.active
  WHERE localgov.site_access_status(ss.site_id)='active' AND ss.id=p_session_hash AND ss.expires_at>to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION localgov.resolve_domain(p_label text) RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT s.slug FROM localgov.registrations r JOIN localgov.sites s ON s.id=r.site_id WHERE r.domain_label=p_label AND localgov.site_access_status(s.id)='active'; $$;

CREATE OR REPLACE FUNCTION localgov.create_request(p_data jsonb, p_audit jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.service_requests%ROWTYPE;
BEGIN
IF localgov.site_access_status(p_data->>'site_id')<>'active' OR NOT EXISTS(SELECT 1 FROM localgov.sites WHERE id=p_data->>'site_id' AND status='published') THEN RAISE EXCEPTION 'Website unavailable' USING ERRCODE='42501'; END IF;
IF p_audit->>'site_id' IS DISTINCT FROM p_data->>'site_id' OR p_audit->>'entity_id' IS DISTINCT FROM p_data->>'id' THEN RAISE EXCEPTION 'Audit scope mismatch'; END IF;
INSERT INTO localgov.service_requests (id, site_id, tracking_code, request_type, full_name, phone, email, details, address, latitude, longitude, status, assigned_department, consent, created_at, updated_at) VALUES ((p_data->>'id')::text, (p_data->>'site_id')::text, (p_data->>'tracking_code')::text, (p_data->>'request_type')::text, (p_data->>'full_name')::text, (p_data->>'phone')::text, coalesce((p_data->>'email')::text, ''), (p_data->>'details')::text, coalesce((p_data->>'address')::text, ''), coalesce((p_data->>'latitude')::text, ''), coalesce((p_data->>'longitude')::text, ''), coalesce((p_data->>'status')::text, 'received'), coalesce((p_data->>'assigned_department')::text, 'สำนักปลัด'), coalesce((p_data->>'consent')::boolean, false), coalesce((p_data->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))), coalesce((p_data->>'updated_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) RETURNING * INTO saved;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN to_jsonb(saved);
END; $$;

CREATE OR REPLACE FUNCTION localgov.create_session(p_data jsonb, p_member jsonb, p_audit jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.local_admin_sessions%ROWTYPE;
BEGIN
IF localgov.site_access_status(p_data->>'site_id')<>'active' THEN RAISE EXCEPTION 'Website unavailable' USING ERRCODE='42501'; END IF;

IF p_data->>'site_id' IS DISTINCT FROM p_member->>'site_id' OR p_data->>'user_id' IS DISTINCT FROM p_member->>'user_id' OR p_data->>'site_id' IS DISTINCT FROM p_audit->>'site_id' OR p_data->>'user_id' IS DISTINCT FROM p_audit->>'actor_user_id' THEN RAISE EXCEPTION 'Session scope mismatch'; END IF;
DELETE FROM localgov.local_admin_sessions WHERE expires_at < to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
INSERT INTO localgov.site_members (id, site_id, user_id, email, role, department, active, created_at) VALUES ((p_member->>'id')::text, (p_member->>'site_id')::text, (p_member->>'user_id')::text, (p_member->>'email')::text, coalesce((p_member->>'role')::text, 'editor'), coalesce((p_member->>'department')::text, 'ส่วนกลาง'), coalesce((p_member->>'active')::boolean, true), coalesce((p_member->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ON CONFLICT (site_id,user_id) DO UPDATE SET email=excluded.email,role=excluded.role,department=excluded.department,active=excluded.active;
INSERT INTO localgov.local_admin_sessions (id, site_id, user_id, username, expires_at, created_at) VALUES ((p_data->>'id')::text, (p_data->>'site_id')::text, (p_data->>'user_id')::text, (p_data->>'username')::text, (p_data->>'expires_at')::text, coalesce((p_data->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) RETURNING * INTO saved;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN to_jsonb(saved);
END; $$;

REVOKE ALL ON FUNCTION localgov.site_access_status(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.site_access_status(text) TO service_role;
REVOKE ALL ON FUNCTION localgov.review_agency(text,text,text,text,text,text,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.review_agency(text,text,text,text,text,text,date) TO service_role;
NOTIFY pgrst,'reload schema';
