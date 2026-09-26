-- Site-scoped local admin accounts. Apply after schema.sql and application-operations.sql.
-- Initial passwords come only from the server secret; they are never stored as plaintext.
CREATE TABLE IF NOT EXISTS localgov.local_admin_accounts (
  site_id text PRIMARY KEY REFERENCES localgov.sites(id) ON DELETE CASCADE,
  user_id text UNIQUE NOT NULL,
  username text NOT NULL DEFAULT 'admin' CHECK (username = 'admin'),
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  failed_attempts integer NOT NULL DEFAULT 0,
  last_failed_at timestamptz,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE localgov.local_admin_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON localgov.local_admin_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON localgov.local_admin_accounts TO service_role;

CREATE OR REPLACE FUNCTION localgov.provision_site_admin(p_site_id text, p_actor_id text, p_initial_password text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE s localgov.sites%ROWTYPE; account_user text;
BEGIN
  SELECT * INTO s FROM localgov.sites WHERE id=p_site_id AND owner_user_id=p_actor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Site owner required'; END IF;
  IF p_initial_password IS NULL OR length(p_initial_password)<12 OR octet_length(p_initial_password)>72 THEN
    RAISE EXCEPTION 'Initial credential configuration invalid';
  END IF;
  account_user := 'site-admin:' || s.id;
  INSERT INTO localgov.local_admin_accounts(site_id,user_id,password_hash)
    VALUES(s.id,account_user,extensions.crypt(p_initial_password,extensions.gen_salt('bf',12)))
    ON CONFLICT(site_id) DO NOTHING;
  INSERT INTO localgov.site_members(id,site_id,user_id,email,role,department,active)
    VALUES(gen_random_uuid()::text,s.id,account_user,'admin@' || s.slug || '.localgov.invalid','super_admin','ผู้ดูแลเว็บไซต์',true)
    ON CONFLICT(site_id,user_id) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION localgov.create_site_with_admin(p_data jsonb,p_audit jsonb,p_member jsonb,p_initial_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved jsonb;
BEGIN
  saved := localgov.create_site(p_data,p_audit,p_member);
  PERFORM localgov.provision_site_admin(saved->>'id',p_audit->>'actor_user_id',p_initial_password);
  RETURN saved;
END; $$;

CREATE OR REPLACE FUNCTION localgov.login_site_admin(p_site_slug text,p_username text,p_password text,p_session_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE a localgov.local_admin_accounts%ROWTYPE; s localgov.sites%ROWTYPE; expiry text;
BEGIN
  IF p_session_hash IS NULL OR p_session_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF p_password IS NULL OR octet_length(p_password)>72 OR length(p_password)=0 THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT * INTO s FROM localgov.sites WHERE slug=p_site_slug;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT * INTO a FROM localgov.local_admin_accounts WHERE site_id=s.id AND username=p_username AND active FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false); END IF;
  IF NOT EXISTS(SELECT 1 FROM localgov.site_members WHERE site_id=s.id AND user_id=a.user_id AND active) THEN RETURN jsonb_build_object('ok',false); END IF;
  IF a.locked_until>now() THEN RETURN jsonb_build_object('ok',false,'blocked',true); END IF;
  IF a.locked_until IS NOT NULL OR a.last_failed_at<now()-interval '15 minutes' THEN a.failed_attempts:=0; END IF;
  IF extensions.crypt(p_password,a.password_hash) IS DISTINCT FROM a.password_hash THEN
    UPDATE localgov.local_admin_accounts SET failed_attempts=a.failed_attempts+1,last_failed_at=now(),
      locked_until=CASE WHEN a.failed_attempts+1>=5 THEN now()+interval '5 minutes' ELSE NULL END WHERE site_id=s.id;
    RETURN jsonb_build_object('ok',false,'blocked',a.failed_attempts+1>=5);
  END IF;
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
  WHERE ss.id=p_session_hash AND ss.expires_at>to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') LIMIT 1;
$$;

REVOKE ALL ON FUNCTION localgov.provision_site_admin(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION localgov.create_site_with_admin(jsonb,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION localgov.login_site_admin(text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION localgov.resolve_site_admin_session(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.provision_site_admin(text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION localgov.create_site_with_admin(jsonb,jsonb,jsonb,text) TO service_role;
GRANT EXECUTE ON FUNCTION localgov.login_site_admin(text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION localgov.resolve_site_admin_session(text) TO service_role;
NOTIFY pgrst, 'reload schema';
