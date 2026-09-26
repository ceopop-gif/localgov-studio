-- Apply after tenant-admin.sql. Account approval is independent of publishing content.
ALTER TABLE localgov.local_admin_accounts DROP CONSTRAINT IF EXISTS local_admin_accounts_username_check;
CREATE UNIQUE INDEX IF NOT EXISTS local_admin_username_unique ON localgov.local_admin_accounts(lower(username));
CREATE TABLE IF NOT EXISTS localgov.platform_admins (
 user_id text PRIMARY KEY, username text UNIQUE, password_hash text, active boolean NOT NULL DEFAULT true,
 failed_attempts integer NOT NULL DEFAULT 0,last_failed_at timestamptz,locked_until timestamptz
);
CREATE TABLE IF NOT EXISTS localgov.platform_sessions (id text PRIMARY KEY,user_id text NOT NULL REFERENCES localgov.platform_admins(user_id),expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS localgov.registrations (
 site_id text PRIMARY KEY REFERENCES localgov.sites(id) ON DELETE CASCADE,
 contact_name text NOT NULL, approval_status text NOT NULL DEFAULT 'pending' CHECK(approval_status IN('pending','approved','rejected','suspended')),
 domain_label text UNIQUE NOT NULL, domain_status text NOT NULL DEFAULT 'pending_dns' CHECK(domain_status IN('pending_dns','active')),
 submitted_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz,reviewed_by text
);
CREATE TABLE IF NOT EXISTS localgov.request_limits (key text PRIMARY KEY,window_start timestamptz NOT NULL DEFAULT now(),attempts integer NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS localgov.ai_generations (
 id text PRIMARY KEY,site_id text NOT NULL REFERENCES localgov.sites(id) ON DELETE CASCADE,actor_id text NOT NULL,
 prompt text NOT NULL,model text NOT NULL,size text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','completed','failed')),
 media_id text REFERENCES localgov.media_files(id),error_code text,usage jsonb,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_generations_site_created ON localgov.ai_generations(site_id,created_at DESC);
CREATE INDEX IF NOT EXISTS platform_sessions_expiry ON localgov.platform_sessions(expires_at);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['platform_admins','platform_sessions','registrations','request_limits','ai_generations'] LOOP
 EXECUTE format('ALTER TABLE localgov.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON localgov.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON localgov.%I TO service_role',t);
 EXECUTE format('CREATE POLICY service_role_only ON localgov.%I TO service_role USING(true) WITH CHECK(true)',t);
END LOOP; END $$;
CREATE POLICY service_role_only ON localgov.local_admin_accounts TO service_role USING(true) WITH CHECK(true);

CREATE OR REPLACE FUNCTION localgov.is_platform_admin(p_user_id text) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM localgov.platform_admins WHERE user_id=p_user_id AND active);
$$;
CREATE OR REPLACE FUNCTION localgov.require_manager(p_site_id text,p_user_id text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF localgov.is_platform_admin(p_user_id) THEN RETURN; END IF;
 IF p_user_id LIKE 'site-admin:%' AND p_user_id<>'site-admin:'||p_site_id THEN RAISE EXCEPTION 'Unauthorized site' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM localgov.registrations WHERE site_id=p_site_id AND approval_status<>'approved') THEN RAISE EXCEPTION 'Account not approved' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM localgov.sites s WHERE s.id=p_site_id AND (s.owner_user_id=p_user_id OR EXISTS(SELECT 1 FROM localgov.site_members m WHERE m.site_id=s.id AND m.user_id=p_user_id AND m.active))) THEN RAISE EXCEPTION 'Unauthorized site' USING ERRCODE='42501'; END IF;
END; $$;
CREATE OR REPLACE FUNCTION localgov.consume_request_limit(p_key text,p_limit integer,p_seconds integer) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE total integer;
BEGIN
 INSERT INTO localgov.request_limits AS r(key) VALUES(p_key) ON CONFLICT(key) DO UPDATE SET
 attempts=CASE WHEN r.window_start<now()-make_interval(secs=>p_seconds) THEN 1 ELSE r.attempts+1 END,
 window_start=CASE WHEN r.window_start<now()-make_interval(secs=>p_seconds) THEN now() ELSE r.window_start END RETURNING attempts INTO total;
 DELETE FROM localgov.request_limits WHERE window_start<now()-interval '2 days';
 RETURN total<=p_limit;
END; $$;

CREATE OR REPLACE FUNCTION localgov.register_agency(p_data jsonb,p_username text,p_password text,p_contact_name text,p_actor_id text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE saved jsonb; uid text; sid text:=p_data->>'id'; approved boolean:=p_actor_id IS NOT NULL;
BEGIN
 IF approved AND NOT localgov.is_platform_admin(p_actor_id) THEN RAISE EXCEPTION 'Platform admin required' USING ERRCODE='42501'; END IF;
 IF p_username !~ '^[a-z][a-z0-9._-]{2,39}$' OR p_username IN('admin','root','system') THEN RAISE EXCEPTION 'Invalid username'; END IF;
 IF p_password IS NULL OR length(p_password)<12 OR octet_length(p_password)>72 THEN RAISE EXCEPTION 'Invalid password'; END IF;
 uid:='site-admin:'||sid;
 saved:=localgov.create_site(p_data||jsonb_build_object('owner_user_id',uid,'status','draft'),
 jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'entity_id',sid,'actor_user_id',uid,'actor_email',p_data->>'email','action','site.registered','entity_type','site'),
 jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'user_id',uid,'email',p_data->>'email','role','super_admin','department','ผู้ดูแลเว็บไซต์','active',approved));
 INSERT INTO localgov.local_admin_accounts(site_id,user_id,username,password_hash,active) VALUES(sid,uid,p_username,extensions.crypt(p_password,extensions.gen_salt('bf',12)),approved);
 INSERT INTO localgov.registrations(site_id,contact_name,domain_label,approval_status,reviewed_by,reviewed_at) VALUES(sid,p_contact_name,p_data->>'slug',CASE WHEN approved THEN 'approved' ELSE 'pending' END,p_actor_id,CASE WHEN approved THEN now() ELSE NULL END);
 RETURN jsonb_build_object('id',sid,'slug',saved->>'slug','name',saved->>'name','approvalStatus',CASE WHEN approved THEN 'approved' ELSE 'pending' END);
END; $$;

CREATE OR REPLACE FUNCTION localgov.review_agency(p_site_id text,p_actor_id text,p_status text,p_domain_label text,p_username text DEFAULT NULL,p_password text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT localgov.is_platform_admin(p_actor_id) THEN RAISE EXCEPTION 'Platform admin required' USING ERRCODE='42501'; END IF;
 IF p_status NOT IN('approved','rejected','suspended') OR p_domain_label !~ '^[a-z][a-z0-9-]{2,59}$' OR p_domain_label IN('www','admin','api','mail','website','register') THEN RAISE EXCEPTION 'Invalid review'; END IF;
 UPDATE localgov.registrations SET approval_status=p_status,domain_status=CASE WHEN domain_label=p_domain_label THEN domain_status ELSE 'pending_dns' END,domain_label=p_domain_label,reviewed_at=now(),reviewed_by=p_actor_id WHERE site_id=p_site_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Registration missing'; END IF;
 IF p_username IS NOT NULL AND (p_username !~ '^[a-z][a-z0-9._-]{2,39}$' OR p_username IN('admin','root','system')) THEN RAISE EXCEPTION 'Invalid username'; END IF;
 IF p_password IS NOT NULL AND (length(p_password)<12 OR octet_length(p_password)>72) THEN RAISE EXCEPTION 'Invalid password'; END IF;
 IF NOT EXISTS(SELECT 1 FROM localgov.local_admin_accounts WHERE site_id=p_site_id) THEN
 IF p_username IS NULL OR p_password IS NULL THEN RAISE EXCEPTION 'Username and password required'; END IF;
 INSERT INTO localgov.local_admin_accounts(site_id,user_id,username,password_hash,active) VALUES(p_site_id,'site-admin:'||p_site_id,p_username,extensions.crypt(p_password,extensions.gen_salt('bf',12)),p_status='approved');
 INSERT INTO localgov.site_members(id,site_id,user_id,email,role,department,active) VALUES(gen_random_uuid()::text,p_site_id,'site-admin:'||p_site_id,'','super_admin','ผู้ดูแลเว็บไซต์',p_status='approved') ON CONFLICT(site_id,user_id) DO NOTHING;
 END IF;
 UPDATE localgov.local_admin_accounts SET active=p_status='approved',username=coalesce(p_username,username),password_hash=CASE WHEN p_password IS NULL THEN password_hash ELSE extensions.crypt(p_password,extensions.gen_salt('bf',12)) END,failed_attempts=0,locked_until=NULL WHERE site_id=p_site_id;
 UPDATE localgov.site_members SET active=p_status='approved' WHERE site_id=p_site_id AND user_id='site-admin:'||p_site_id;
 DELETE FROM localgov.local_admin_sessions WHERE site_id=p_site_id;
 IF p_status<>'approved' THEN UPDATE localgov.sites SET status='draft' WHERE id=p_site_id; END IF;
 INSERT INTO localgov.audit_logs(id,site_id,actor_user_id,actor_email,action,entity_type,entity_id,metadata) VALUES(gen_random_uuid()::text,p_site_id,p_actor_id,'','registration.'||p_status,'site',p_site_id,jsonb_build_object('domain',p_domain_label||'.weblocalgov.com','credentialsChanged',p_password IS NOT NULL OR p_username IS NOT NULL)::text);
END; $$;

CREATE OR REPLACE FUNCTION localgov.list_agencies(p_actor_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT localgov.is_platform_admin(p_actor_id) THEN RAISE EXCEPTION 'Platform admin required' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'slug',s.slug,'province',s.province,'email',s.email,'phone',s.phone,'status',s.status,'username',a.username,'contactName',r.contact_name,'approvalStatus',r.approval_status,'domainLabel',r.domain_label,'domainStatus',r.domain_status,'submittedAt',r.submitted_at) ORDER BY r.submitted_at DESC) FROM localgov.sites s JOIN localgov.registrations r ON r.site_id=s.id LEFT JOIN localgov.local_admin_accounts a ON a.site_id=s.id),'[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION localgov.login_platform_admin(p_username text,p_password text,p_session_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE a localgov.platform_admins%ROWTYPE;
BEGIN
 IF p_session_hash !~ '^[a-f0-9]{64}$' OR p_password IS NULL OR octet_length(p_password)>72 THEN RETURN jsonb_build_object('ok',false); END IF;
 SELECT * INTO a FROM localgov.platform_admins WHERE username=p_username AND active FOR UPDATE;
 IF NOT FOUND OR a.password_hash IS NULL THEN RETURN jsonb_build_object('ok',false); END IF;
 IF a.locked_until>now() THEN RETURN jsonb_build_object('ok',false,'blocked',true); END IF;
 IF a.locked_until IS NOT NULL OR a.last_failed_at<now()-interval '15 minutes' THEN a.failed_attempts:=0; END IF;
 IF extensions.crypt(p_password,a.password_hash) IS DISTINCT FROM a.password_hash THEN
 UPDATE localgov.platform_admins SET failed_attempts=a.failed_attempts+1,last_failed_at=now(),locked_until=CASE WHEN a.failed_attempts+1>=5 THEN now()+interval '5 minutes' ELSE NULL END WHERE user_id=a.user_id;
 RETURN jsonb_build_object('ok',false,'blocked',a.failed_attempts+1>=5); END IF;
 UPDATE localgov.platform_admins SET failed_attempts=0,last_failed_at=NULL,locked_until=NULL WHERE user_id=a.user_id;
 DELETE FROM localgov.platform_sessions WHERE expires_at<now();
 INSERT INTO localgov.platform_sessions VALUES(p_session_hash,a.user_id,now()+interval '8 hours');
 RETURN jsonb_build_object('ok',true,'platform',true);
END; $$;
CREATE OR REPLACE FUNCTION localgov.resolve_platform_session(p_session_hash text) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('id',a.user_id,'username',a.username,'email','','displayName','ผู้ดูแลระบบกลาง','platform',true) FROM localgov.platform_sessions s JOIN localgov.platform_admins a ON a.user_id=s.user_id AND a.active WHERE s.id=p_session_hash AND s.expires_at>now();
$$;
CREATE OR REPLACE FUNCTION localgov.delete_platform_session(p_session_hash text) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ DELETE FROM localgov.platform_sessions WHERE id=p_session_hash; $$;

CREATE OR REPLACE FUNCTION localgov.reserve_ai_image(p_id text,p_site_id text,p_actor_id text,p_prompt text,p_model text,p_size text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE existing localgov.ai_generations%ROWTYPE;
BEGIN
 PERFORM localgov.require_manager(p_site_id,p_actor_id);
 PERFORM 1 FROM localgov.sites WHERE id=p_site_id FOR UPDATE;
 SELECT * INTO existing FROM localgov.ai_generations WHERE id=p_id;
 IF FOUND THEN
 IF existing.site_id<>p_site_id OR existing.actor_id<>p_actor_id THEN RAISE EXCEPTION 'Generation scope mismatch'; END IF;
 RETURN jsonb_build_object('created',false,'id',existing.id,'status',existing.status,'mediaId',existing.media_id,'errorCode',existing.error_code); END IF;
 IF (SELECT count(*) FROM localgov.ai_generations WHERE site_id=p_site_id AND created_at>now()-interval '24 hours')>=20 THEN RETURN jsonb_build_object('created',false,'status','limit'); END IF;
 IF EXISTS(SELECT 1 FROM localgov.ai_generations WHERE site_id=p_site_id AND status='pending' AND created_at>now()-interval '5 minutes') THEN RETURN jsonb_build_object('created',false,'status','busy'); END IF;
 INSERT INTO localgov.ai_generations(id,site_id,actor_id,prompt,model,size) VALUES(p_id,p_site_id,p_actor_id,p_prompt,p_model,p_size);
 RETURN jsonb_build_object('created',true,'id',p_id,'status','pending');
END; $$;
CREATE OR REPLACE FUNCTION localgov.finish_ai_image(p_id text,p_site_id text,p_actor_id text,p_media_id text,p_error text,p_usage jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM localgov.require_manager(p_site_id,p_actor_id);
 IF p_media_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM localgov.media_files WHERE id=p_media_id AND site_id=p_site_id) THEN RAISE EXCEPTION 'Media scope mismatch'; END IF;
 UPDATE localgov.ai_generations SET status=CASE WHEN p_media_id IS NULL THEN 'failed' ELSE 'completed' END,media_id=p_media_id,error_code=p_error,usage=p_usage WHERE id=p_id AND site_id=p_site_id AND actor_id=p_actor_id;
END; $$;
-- Restrict every new function explicitly. Existing operations retain their grants.
DO $$ DECLARE f record; BEGIN FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='localgov' AND p.proname IN('is_platform_admin','consume_request_limit','register_agency','review_agency','list_agencies','login_platform_admin','resolve_platform_session','delete_platform_session','reserve_ai_image','finish_ai_image') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
END LOOP; END $$;
NOTIFY pgrst,'reload schema';

CREATE OR REPLACE FUNCTION localgov.login_site_admin(p_site_slug text,p_username text,p_password text,p_session_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE a localgov.local_admin_accounts%ROWTYPE; s localgov.sites%ROWTYPE; expiry text;
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


CREATE OR REPLACE FUNCTION localgov.resolve_domain(p_label text) RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT s.slug FROM localgov.registrations r JOIN localgov.sites s ON s.id=r.site_id WHERE r.domain_label=p_label AND r.approval_status='approved'; $$;
REVOKE ALL ON FUNCTION localgov.resolve_domain(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.resolve_domain(text) TO service_role;
NOTIFY pgrst,'reload schema';
