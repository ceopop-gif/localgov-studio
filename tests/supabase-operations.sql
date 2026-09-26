-- Transactional verification: all test records are rolled back.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE sid text := gen_random_uuid()::text; sid2 text := gen_random_uuid()::text; cid text := gen_random_uuid()::text; rid text := gen_random_uuid()::text; mid text := gen_random_uuid()::text; sess text := gen_random_uuid()::text;
owner_id text := 'test-owner'; data jsonb; before_audit bigint;
BEGIN
 data := localgov.create_site(jsonb_build_object('id',sid,'owner_user_id',owner_id,'name','ทดสอบ','slug',sid,'organization_type','เทศบาล'),jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'actor_user_id',owner_id,'actor_email','test@example.invalid','action','test','entity_type','site','entity_id',sid),jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'user_id',owner_id,'email','test@example.invalid'));
 IF data->>'status' <> 'draft' THEN RAISE EXCEPTION 'Default missing'; END IF;
 PERFORM localgov.create_site(jsonb_build_object('id',sid2,'owner_user_id','other-owner','name','other','slug',sid2,'organization_type','เทศบาล'),jsonb_build_object('id',gen_random_uuid(),'site_id',sid2,'actor_user_id','other-owner','actor_email','other@example.invalid','action','test','entity_type','site','entity_id',sid2),jsonb_build_object('id',gen_random_uuid(),'site_id',sid2,'user_id','other-owner','email','other@example.invalid'));
 data:=localgov.create_content(jsonb_build_object('id',cid,'site_id',sid,'type','news','title','ข่าวทดสอบ','body',repeat('ข้อมูลภาษาไทย',1000),'created_by','test@example.invalid'),jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'actor_user_id',owner_id,'actor_email','test@example.invalid','action','test','entity_type','news','entity_id',cid));
 IF length(data->>'body') <> length(repeat('ข้อมูลภาษาไทย',1000)) THEN RAISE EXCEPTION 'Body truncated'; END IF;
 BEGIN
 PERFORM localgov.update_content(cid,sid,'{"title":"attack"}',jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'actor_user_id','other-owner','actor_email','other@example.invalid','action','test','entity_type','news','entity_id',cid));
 RAISE EXCEPTION 'Unauthorized write was accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 SELECT count(*) INTO before_audit FROM localgov.audit_logs WHERE site_id=sid;
 BEGIN
 PERFORM localgov.update_content(cid,sid,'{"title":"rollback"}',jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'actor_user_id',owner_id,'action','test','entity_type','news','entity_id',cid));
 RAISE EXCEPTION 'Missing audit field was accepted';
 EXCEPTION WHEN not_null_violation THEN NULL;
 END;
 IF (SELECT title FROM localgov.content_items WHERE id=cid) <> 'ข่าวทดสอบ' THEN RAISE EXCEPTION 'Atomicity failed'; END IF;
 IF (SELECT count(*) FROM localgov.audit_logs WHERE site_id=sid) <> before_audit THEN RAISE EXCEPTION 'Audit rollback failed'; END IF;
 data:=localgov.create_request(jsonb_build_object('id',rid,'site_id',sid,'tracking_code',rid,'request_type','lighting','full_name','ทดสอบ','phone','0000000000','details','ตัวอย่าง','consent',true),jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'actor_user_id','public','actor_email','anonymous','action','test','entity_type','request','entity_id',rid));
 data:=localgov.update_request(rid,sid,'{"status":"completed"}',jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'actor_user_id',owner_id,'actor_email','test@example.invalid','action','test','entity_type','request','entity_id',rid));
 IF data->>'status' <> 'completed' THEN RAISE EXCEPTION 'Request update failed'; END IF;
 data:=localgov.create_media(jsonb_build_object('id',mid,'site_id',sid,'object_key',mid,'file_name','test.pdf','content_type','application/pdf','size_bytes',1,'uploaded_by','test@example.invalid'),jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'actor_user_id',owner_id,'actor_email','test@example.invalid','action','test','entity_type','media','entity_id',mid));
 data:=localgov.create_session(jsonb_build_object('id',sess,'site_id',sid,'user_id',owner_id,'username','test','expires_at','2099-01-01T00:00:00Z'),jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'user_id',owner_id,'email','test@example.invalid'),jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'actor_user_id',owner_id,'actor_email','test@example.invalid','action','test','entity_type','session','entity_id',sess));
 PERFORM localgov.delete_session(sess,jsonb_build_object('id',gen_random_uuid(),'site_id',sid,'actor_user_id',owner_id,'actor_email','test@example.invalid','action','test','entity_type','session','entity_id',sess));
 IF EXISTS(SELECT 1 FROM localgov.local_admin_sessions WHERE id=sess) THEN RAISE EXCEPTION 'Logout failed'; END IF;
 IF (localgov.dashboard_stats(sid)->>'completedRequests')::int <> 1 THEN RAISE EXCEPTION 'Counts failed'; END IF;
END $$;
ROLLBACK;
SELECT 'atomic writes, scope denial, long Thai text, requests, media, sessions and counts passed' AS verification;
