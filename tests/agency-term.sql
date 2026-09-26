-- Integration checks run in a rollback transaction; never change real delivery dates.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE sid text:='qa-term-'||gen_random_uuid()::text;
 actor text:='qa-admin-'||gen_random_uuid()::text;
 username text:='qa-'||gen_random_uuid()::text;
 pass text:=encode(extensions.gen_random_bytes(20),'hex');
 token text:=encode(extensions.gen_random_bytes(32),'hex');
 today date:=(now() AT TIME ZONE 'Asia/Bangkok')::date;
 result jsonb; denied boolean; listed jsonb;
BEGIN
 INSERT INTO localgov.platform_admins(user_id,username) VALUES(actor,actor);
 PERFORM localgov.register_agency(jsonb_build_object('id',sid,'slug',sid,'name','QA term rollback','organization_type','test','email','qa@example.invalid'),username,pass,'QA term',NULL);
 denied:=false;
 BEGIN PERFORM localgov.review_agency(sid,actor,'approved',sid,NULL,NULL); EXCEPTION WHEN OTHERS THEN denied:=SQLERRM='Delivery date required'; END;
 IF NOT denied THEN RAISE EXCEPTION 'Approval accepted without delivery date'; END IF;
 PERFORM localgov.review_agency(sid,actor,'approved',sid,NULL,NULL,today+1);
 IF localgov.site_access_status(sid)<>'scheduled' THEN RAISE EXCEPTION 'Future term started early'; END IF;
 result:=localgov.login_site_admin('',username,pass,token);
 IF result->>'ok'<>'false' OR result->>'accessStatus'<>'scheduled' THEN RAISE EXCEPTION 'Future term logged in'; END IF;
 PERFORM localgov.require_manager(sid,actor);
 PERFORM localgov.review_agency(sid,actor,'approved',sid,NULL,NULL,today);
 UPDATE localgov.sites SET status='published' WHERE id=sid;
 IF localgov.site_access_status(sid)<>'active' THEN RAISE EXCEPTION 'Start day not active'; END IF;
 IF (SELECT expires_on FROM localgov.registrations WHERE site_id=sid)<>(today+interval '2 years')::date THEN RAISE EXCEPTION 'Wrong expiry'; END IF;
 result:=localgov.login_site_admin('',username,pass,token);
 IF result->>'ok'<>'true' OR localgov.resolve_site_admin_session(token) IS NULL THEN RAISE EXCEPTION 'Active login failed'; END IF;
 -- Simulate an already-issued session reaching the expiry date without a cron job.
 UPDATE localgov.registrations SET start_on=(today-interval '2 years')::date WHERE site_id=sid;
 IF localgov.site_access_status(sid)<>'expired' THEN RAISE EXCEPTION 'Expired anniversary stayed active'; END IF;
 IF localgov.resolve_site_admin_session(token) IS NOT NULL OR localgov.resolve_domain(sid) IS NOT NULL THEN RAISE EXCEPTION 'Expired session/domain survived'; END IF;
 result:=localgov.login_site_admin('',username,pass,encode(extensions.gen_random_bytes(32),'hex'));
 IF result->>'accessStatus'<>'expired' THEN RAISE EXCEPTION 'Expired login allowed'; END IF;
 denied:=false; BEGIN PERFORM localgov.require_manager(sid,'site-admin:'||sid); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Expired tenant manager allowed'; END IF;
 denied:=false; BEGIN PERFORM localgov.create_request(jsonb_build_object('site_id',sid),'{}'::jsonb); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Expired citizen submission allowed'; END IF;
 PERFORM localgov.require_manager(sid,actor);
 PERFORM localgov.review_agency(sid,actor,'approved',sid,NULL,NULL,today);
 IF localgov.resolve_domain(sid)<>sid THEN RAISE EXCEPTION 'Renewal did not reactivate domain'; END IF;
 PERFORM localgov.review_agency(sid,actor,'suspended',sid,NULL,NULL);
 IF localgov.site_access_status(sid)<>'suspended' THEN RAISE EXCEPTION 'Pause failed'; END IF;
 IF (SELECT start_on FROM localgov.registrations WHERE site_id=sid)<>today THEN RAISE EXCEPTION 'Pause changed delivery date'; END IF;
 IF (SELECT status FROM localgov.sites WHERE id=sid)<>'published' THEN RAISE EXCEPTION 'Pause overwrote content publication state'; END IF;
 IF localgov.resolve_domain(sid) IS NOT NULL OR localgov.resolve_site_admin_session(token) IS NOT NULL THEN RAISE EXCEPTION 'Paused access survived'; END IF;
 PERFORM localgov.review_agency(sid,actor,'approved',sid,NULL,NULL,DATE '2024-02-29');
 IF (SELECT expires_on FROM localgov.registrations WHERE site_id=sid)<>DATE '2026-02-28' THEN RAISE EXCEPTION 'Leap day expiry is incorrect'; END IF;
 SELECT item INTO listed FROM jsonb_array_elements(localgov.list_agencies(actor)) item WHERE item->>'id'=sid;
 IF listed->>'startOn'<>'2024-02-29' OR listed->>'expiresOn'<>'2026-02-28' OR listed->>'accessStatus'<>'expired' THEN RAISE EXCEPTION 'Central dates mismatch'; END IF;
 -- Legacy owner-managed template can be paused without adding a new account.
 DELETE FROM localgov.local_admin_accounts WHERE site_id=sid;
 PERFORM localgov.review_agency(sid,actor,'suspended',sid,NULL,NULL);
END $$;
ROLLBACK;
SELECT true AS agency_term_checks_passed;
