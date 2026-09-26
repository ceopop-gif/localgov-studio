-- Transactional integration verification. No accounts, websites or sessions persist.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE
 sid text:='qa-'||gen_random_uuid()::text;
 sid2 text:='qa-'||gen_random_uuid()::text;
 uid text:='qa-'||gen_random_uuid()::text;
 admin_id text:='qa-platform-'||gen_random_uuid()::text;
 token text:=encode(extensions.gen_random_bytes(32),'hex');
 pass text:=encode(extensions.gen_random_bytes(20),'hex');
 result jsonb; rejected boolean:=false; job_id text:=gen_random_uuid()::text;
BEGIN
 INSERT INTO localgov.platform_admins(user_id,username,password_hash) VALUES(admin_id,admin_id,extensions.crypt(pass,extensions.gen_salt('bf',12)));
 result:=localgov.register_agency(jsonb_build_object('id',sid,'slug',sid,'name','QA rollback municipality','organization_type','test','email','qa@example.invalid'),uid,pass,'QA tester',NULL);
 IF result->>'approvalStatus'<>'pending' THEN RAISE EXCEPTION 'Public registration auto-approved'; END IF;
 result:=localgov.login_site_admin('',uid,pass,token);
 IF result->>'ok'<>'false' OR result->>'pending'<>'true' OR EXISTS(SELECT 1 FROM localgov.local_admin_sessions WHERE id=token) THEN RAISE EXCEPTION 'Pending account logged in'; END IF;
 BEGIN PERFORM localgov.review_agency(sid,'site-admin:'||sid,'approved',sid,NULL,NULL); EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Tenant self-approved'; END IF;
 PERFORM localgov.review_agency(sid,admin_id,'approved',sid,NULL,NULL);
 result:=localgov.login_site_admin('',uid,pass,token);
 IF result->>'ok'<>'true' OR result->>'siteId'<>sid THEN RAISE EXCEPTION 'Approved login failed'; END IF;
 IF localgov.resolve_site_admin_session(token)->>'siteId'<>sid THEN RAISE EXCEPTION 'Wrong tenant session'; END IF;
 result:=localgov.register_agency(jsonb_build_object('id',sid2,'slug',sid2,'name','QA second municipality','organization_type','test','email','qa@example.invalid'),uid||'b',pass,'QA tester',admin_id);
 IF result->>'approvalStatus'<>'approved' THEN RAISE EXCEPTION 'Central creation pending'; END IF;
 rejected:=false; BEGIN PERFORM localgov.require_manager(sid2,'site-admin:'||sid); EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Tenant crossed scope'; END IF;
 result:=localgov.reserve_ai_image(job_id,sid,'site-admin:'||sid,'test community image','test-model','1024x1024');
 IF result->>'created'<>'true' THEN RAISE EXCEPTION 'AI reservation failed'; END IF;
 result:=localgov.reserve_ai_image(job_id,sid,'site-admin:'||sid,'test community image','test-model','1024x1024');
 IF result->>'created'<>'false' THEN RAISE EXCEPTION 'Duplicate generation charged'; END IF;
 rejected:=false; BEGIN PERFORM localgov.reserve_ai_image(gen_random_uuid()::text,sid2,'site-admin:'||sid,'test','model','size'); EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Cross-tenant AI allowed'; END IF;
 IF localgov.resolve_domain(sid)<>sid THEN RAISE EXCEPTION 'Domain lookup failed'; END IF;
 PERFORM localgov.review_agency(sid,admin_id,'suspended',sid,NULL,NULL);
 IF localgov.resolve_site_admin_session(token) IS NOT NULL THEN RAISE EXCEPTION 'Suspension kept session'; END IF;
 IF localgov.resolve_domain(sid) IS NOT NULL THEN RAISE EXCEPTION 'Suspension kept domain'; END IF;
 result:=localgov.login_platform_admin(admin_id,pass,token);
 IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Platform login failed'; END IF;
 IF localgov.resolve_platform_session(token)->>'id'<>admin_id THEN RAISE EXCEPTION 'Platform session mismatch'; END IF;
 PERFORM localgov.delete_platform_session(token);
 IF localgov.resolve_platform_session(token) IS NOT NULL THEN RAISE EXCEPTION 'Platform logout failed'; END IF;
END $$;
ROLLBACK;
SELECT true AS approval_tenant_and_ai_checks_passed;
