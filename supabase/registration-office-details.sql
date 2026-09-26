ALTER TABLE localgov.registrations ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
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
 INSERT INTO localgov.registrations(site_id,contact_name,domain_label,approval_status,reviewed_by,reviewed_at,details) VALUES(sid,p_contact_name,p_data->>'slug',CASE WHEN approved THEN 'approved' ELSE 'pending' END,p_actor_id,CASE WHEN approved THEN now() ELSE NULL END,coalesce(p_data->'registration','{}'::jsonb));
 RETURN jsonb_build_object('id',sid,'slug',saved->>'slug','name',saved->>'name','approvalStatus',CASE WHEN approved THEN 'approved' ELSE 'pending' END);
END; $$;


NOTIFY pgrst,'reload schema';
