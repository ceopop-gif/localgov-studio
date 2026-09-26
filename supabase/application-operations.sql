-- Fixed application operations. No SQL text or arbitrary table names are accepted.

GRANT USAGE ON SCHEMA localgov TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA localgov TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA localgov REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE OR REPLACE FUNCTION localgov.require_manager(p_site_id text, p_user_id text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM localgov.sites s WHERE s.id=p_site_id AND (s.owner_user_id=p_user_id OR EXISTS(SELECT 1 FROM localgov.site_members m WHERE m.site_id=s.id AND m.user_id=p_user_id AND m.active))) THEN
  RAISE EXCEPTION 'Unauthorized site' USING ERRCODE='42501';
 END IF;
END; $$;
REVOKE ALL ON FUNCTION localgov.require_manager(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.require_manager(text,text) TO service_role;

CREATE OR REPLACE FUNCTION localgov.create_site(p_data jsonb, p_audit jsonb, p_member jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.sites%ROWTYPE;
BEGIN
IF p_audit->>'site_id' IS DISTINCT FROM p_data->>'id' OR p_audit->>'entity_id' IS DISTINCT FROM p_data->>'id' THEN RAISE EXCEPTION 'Audit scope mismatch'; END IF;
IF p_data->>'owner_user_id' IS DISTINCT FROM p_audit->>'actor_user_id' OR p_member->>'site_id' IS DISTINCT FROM p_data->>'id' OR p_member->>'user_id' IS DISTINCT FROM p_data->>'owner_user_id' THEN RAISE EXCEPTION 'Owner scope mismatch'; END IF;
INSERT INTO localgov.sites (id, owner_user_id, name, english_name, slug, organization_type, province, district, subdistrict, address, phone, email, vision, logo_url, primary_color, secondary_color, services_json, status, completeness, created_at, updated_at, homepage_json) VALUES ((p_data->>'id')::text, (p_data->>'owner_user_id')::text, (p_data->>'name')::text, coalesce((p_data->>'english_name')::text, ''), (p_data->>'slug')::text, (p_data->>'organization_type')::text, coalesce((p_data->>'province')::text, ''), coalesce((p_data->>'district')::text, ''), coalesce((p_data->>'subdistrict')::text, ''), coalesce((p_data->>'address')::text, ''), coalesce((p_data->>'phone')::text, ''), coalesce((p_data->>'email')::text, ''), coalesce((p_data->>'vision')::text, ''), coalesce((p_data->>'logo_url')::text, ''), coalesce((p_data->>'primary_color')::text, '#0B5260'), coalesce((p_data->>'secondary_color')::text, '#E4B949'), coalesce((p_data->>'services_json')::text, '["lighting","road","water","waste","complaint","construction","tax","welfare"]'), coalesce((p_data->>'status')::text, 'draft'), coalesce((p_data->>'completeness')::integer, 18), coalesce((p_data->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))), coalesce((p_data->>'updated_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))), coalesce((p_data->>'homepage_json')::text, '{}')) RETURNING * INTO saved;
INSERT INTO localgov.site_members (id, site_id, user_id, email, role, department, active, created_at) VALUES ((p_member->>'id')::text, (p_member->>'site_id')::text, (p_member->>'user_id')::text, (p_member->>'email')::text, coalesce((p_member->>'role')::text, 'editor'), coalesce((p_member->>'department')::text, 'ส่วนกลาง'), coalesce((p_member->>'active')::boolean, true), coalesce((p_member->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN to_jsonb(saved);
END; $$;

REVOKE ALL ON FUNCTION localgov.create_site(jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.create_site(jsonb,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION localgov.update_site(p_id text, p_site_id text, p_data jsonb, p_audit jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.sites%ROWTYPE;
BEGIN
PERFORM localgov.require_manager(p_site_id,p_audit->>'actor_user_id');
IF p_audit->>'site_id' IS DISTINCT FROM p_site_id OR p_audit->>'entity_id' IS DISTINCT FROM p_id THEN RAISE EXCEPTION 'Audit scope mismatch'; END IF;
UPDATE localgov.sites SET name=CASE WHEN p_data ? 'name' THEN (p_data->>'name')::text ELSE name END, english_name=CASE WHEN p_data ? 'english_name' THEN (p_data->>'english_name')::text ELSE english_name END, slug=CASE WHEN p_data ? 'slug' THEN (p_data->>'slug')::text ELSE slug END, organization_type=CASE WHEN p_data ? 'organization_type' THEN (p_data->>'organization_type')::text ELSE organization_type END, province=CASE WHEN p_data ? 'province' THEN (p_data->>'province')::text ELSE province END, district=CASE WHEN p_data ? 'district' THEN (p_data->>'district')::text ELSE district END, subdistrict=CASE WHEN p_data ? 'subdistrict' THEN (p_data->>'subdistrict')::text ELSE subdistrict END, address=CASE WHEN p_data ? 'address' THEN (p_data->>'address')::text ELSE address END, phone=CASE WHEN p_data ? 'phone' THEN (p_data->>'phone')::text ELSE phone END, email=CASE WHEN p_data ? 'email' THEN (p_data->>'email')::text ELSE email END, vision=CASE WHEN p_data ? 'vision' THEN (p_data->>'vision')::text ELSE vision END, logo_url=CASE WHEN p_data ? 'logo_url' THEN (p_data->>'logo_url')::text ELSE logo_url END, primary_color=CASE WHEN p_data ? 'primary_color' THEN (p_data->>'primary_color')::text ELSE primary_color END, secondary_color=CASE WHEN p_data ? 'secondary_color' THEN (p_data->>'secondary_color')::text ELSE secondary_color END, services_json=CASE WHEN p_data ? 'services_json' THEN (p_data->>'services_json')::text ELSE services_json END, status=CASE WHEN p_data ? 'status' THEN (p_data->>'status')::text ELSE status END, completeness=CASE WHEN p_data ? 'completeness' THEN (p_data->>'completeness')::integer ELSE completeness END, updated_at=CASE WHEN p_data ? 'updated_at' THEN (p_data->>'updated_at')::text ELSE updated_at END, homepage_json=CASE WHEN p_data ? 'homepage_json' THEN (p_data->>'homepage_json')::text ELSE homepage_json END WHERE id=p_id AND id=p_site_id RETURNING * INTO saved;
IF NOT FOUND THEN RETURN NULL; END IF;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN to_jsonb(saved);
END; $$;

REVOKE ALL ON FUNCTION localgov.update_site(text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.update_site(text,text,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION localgov.create_content(p_data jsonb, p_audit jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.content_items%ROWTYPE;
BEGIN
IF p_audit->>'site_id' IS DISTINCT FROM p_data->>'site_id' OR p_audit->>'entity_id' IS DISTINCT FROM p_data->>'id' THEN RAISE EXCEPTION 'Audit scope mismatch'; END IF;
PERFORM localgov.require_manager(p_data->>'site_id',p_audit->>'actor_user_id');
INSERT INTO localgov.content_items (id, site_id, type, title, excerpt, body, category, fiscal_year, status, cover_url, created_by, approved_by, scheduled_at, published_at, created_at, updated_at, attachment_url, attachment_name, gallery_json, youtube_url) VALUES ((p_data->>'id')::text, (p_data->>'site_id')::text, (p_data->>'type')::text, (p_data->>'title')::text, coalesce((p_data->>'excerpt')::text, ''), coalesce((p_data->>'body')::text, ''), coalesce((p_data->>'category')::text, 'ทั่วไป'), (p_data->>'fiscal_year')::integer, coalesce((p_data->>'status')::text, 'draft'), coalesce((p_data->>'cover_url')::text, ''), (p_data->>'created_by')::text, coalesce((p_data->>'approved_by')::text, ''), (p_data->>'scheduled_at')::text, (p_data->>'published_at')::text, coalesce((p_data->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))), coalesce((p_data->>'updated_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))), coalesce((p_data->>'attachment_url')::text, ''), coalesce((p_data->>'attachment_name')::text, ''), coalesce((p_data->>'gallery_json')::text, '[]'), coalesce((p_data->>'youtube_url')::text, '')) RETURNING * INTO saved;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN to_jsonb(saved);
END; $$;

REVOKE ALL ON FUNCTION localgov.create_content(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.create_content(jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION localgov.update_content(p_id text, p_site_id text, p_data jsonb, p_audit jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.content_items%ROWTYPE;
BEGIN
PERFORM localgov.require_manager(p_site_id,p_audit->>'actor_user_id');
IF p_audit->>'site_id' IS DISTINCT FROM p_site_id OR p_audit->>'entity_id' IS DISTINCT FROM p_id THEN RAISE EXCEPTION 'Audit scope mismatch'; END IF;
UPDATE localgov.content_items SET type=CASE WHEN p_data ? 'type' THEN (p_data->>'type')::text ELSE type END, title=CASE WHEN p_data ? 'title' THEN (p_data->>'title')::text ELSE title END, excerpt=CASE WHEN p_data ? 'excerpt' THEN (p_data->>'excerpt')::text ELSE excerpt END, body=CASE WHEN p_data ? 'body' THEN (p_data->>'body')::text ELSE body END, category=CASE WHEN p_data ? 'category' THEN (p_data->>'category')::text ELSE category END, fiscal_year=CASE WHEN p_data ? 'fiscal_year' THEN (p_data->>'fiscal_year')::integer ELSE fiscal_year END, status=CASE WHEN p_data ? 'status' THEN (p_data->>'status')::text ELSE status END, cover_url=CASE WHEN p_data ? 'cover_url' THEN (p_data->>'cover_url')::text ELSE cover_url END, approved_by=CASE WHEN p_data ? 'approved_by' THEN (p_data->>'approved_by')::text ELSE approved_by END, scheduled_at=CASE WHEN p_data ? 'scheduled_at' THEN (p_data->>'scheduled_at')::text ELSE scheduled_at END, published_at=CASE WHEN p_data ? 'published_at' THEN (p_data->>'published_at')::text ELSE published_at END, updated_at=CASE WHEN p_data ? 'updated_at' THEN (p_data->>'updated_at')::text ELSE updated_at END, attachment_url=CASE WHEN p_data ? 'attachment_url' THEN (p_data->>'attachment_url')::text ELSE attachment_url END, attachment_name=CASE WHEN p_data ? 'attachment_name' THEN (p_data->>'attachment_name')::text ELSE attachment_name END, gallery_json=CASE WHEN p_data ? 'gallery_json' THEN (p_data->>'gallery_json')::text ELSE gallery_json END, youtube_url=CASE WHEN p_data ? 'youtube_url' THEN (p_data->>'youtube_url')::text ELSE youtube_url END WHERE id=p_id AND site_id=p_site_id RETURNING * INTO saved;
IF NOT FOUND THEN RETURN NULL; END IF;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN to_jsonb(saved);
END; $$;

REVOKE ALL ON FUNCTION localgov.update_content(text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.update_content(text,text,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION localgov.create_request(p_data jsonb, p_audit jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.service_requests%ROWTYPE;
BEGIN
IF p_audit->>'site_id' IS DISTINCT FROM p_data->>'site_id' OR p_audit->>'entity_id' IS DISTINCT FROM p_data->>'id' THEN RAISE EXCEPTION 'Audit scope mismatch'; END IF;
INSERT INTO localgov.service_requests (id, site_id, tracking_code, request_type, full_name, phone, email, details, address, latitude, longitude, status, assigned_department, consent, created_at, updated_at) VALUES ((p_data->>'id')::text, (p_data->>'site_id')::text, (p_data->>'tracking_code')::text, (p_data->>'request_type')::text, (p_data->>'full_name')::text, (p_data->>'phone')::text, coalesce((p_data->>'email')::text, ''), (p_data->>'details')::text, coalesce((p_data->>'address')::text, ''), coalesce((p_data->>'latitude')::text, ''), coalesce((p_data->>'longitude')::text, ''), coalesce((p_data->>'status')::text, 'received'), coalesce((p_data->>'assigned_department')::text, 'สำนักปลัด'), coalesce((p_data->>'consent')::boolean, false), coalesce((p_data->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))), coalesce((p_data->>'updated_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) RETURNING * INTO saved;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN to_jsonb(saved);
END; $$;

REVOKE ALL ON FUNCTION localgov.create_request(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.create_request(jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION localgov.update_request(p_id text, p_site_id text, p_data jsonb, p_audit jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.service_requests%ROWTYPE;
BEGIN
PERFORM localgov.require_manager(p_site_id,p_audit->>'actor_user_id');
IF p_audit->>'site_id' IS DISTINCT FROM p_site_id OR p_audit->>'entity_id' IS DISTINCT FROM p_id THEN RAISE EXCEPTION 'Audit scope mismatch'; END IF;
UPDATE localgov.service_requests SET address=CASE WHEN p_data ? 'address' THEN (p_data->>'address')::text ELSE address END, latitude=CASE WHEN p_data ? 'latitude' THEN (p_data->>'latitude')::text ELSE latitude END, longitude=CASE WHEN p_data ? 'longitude' THEN (p_data->>'longitude')::text ELSE longitude END, status=CASE WHEN p_data ? 'status' THEN (p_data->>'status')::text ELSE status END, assigned_department=CASE WHEN p_data ? 'assigned_department' THEN (p_data->>'assigned_department')::text ELSE assigned_department END, updated_at=CASE WHEN p_data ? 'updated_at' THEN (p_data->>'updated_at')::text ELSE updated_at END WHERE id=p_id AND site_id=p_site_id RETURNING * INTO saved;
IF NOT FOUND THEN RETURN NULL; END IF;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN to_jsonb(saved);
END; $$;

REVOKE ALL ON FUNCTION localgov.update_request(text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.update_request(text,text,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION localgov.create_media(p_data jsonb, p_audit jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.media_files%ROWTYPE;
BEGIN
IF p_audit->>'site_id' IS DISTINCT FROM p_data->>'site_id' OR p_audit->>'entity_id' IS DISTINCT FROM p_data->>'id' THEN RAISE EXCEPTION 'Audit scope mismatch'; END IF;
PERFORM localgov.require_manager(p_data->>'site_id',p_audit->>'actor_user_id');
INSERT INTO localgov.media_files (id, site_id, object_key, file_name, content_type, size_bytes, category, alt_text, uploaded_by, created_at) VALUES ((p_data->>'id')::text, (p_data->>'site_id')::text, (p_data->>'object_key')::text, (p_data->>'file_name')::text, (p_data->>'content_type')::text, (p_data->>'size_bytes')::integer, coalesce((p_data->>'category')::text, 'document'), coalesce((p_data->>'alt_text')::text, ''), (p_data->>'uploaded_by')::text, coalesce((p_data->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) RETURNING * INTO saved;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN to_jsonb(saved);
END; $$;

REVOKE ALL ON FUNCTION localgov.create_media(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.create_media(jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION localgov.create_session(p_data jsonb, p_member jsonb, p_audit jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.local_admin_sessions%ROWTYPE;
BEGIN

IF p_data->>'site_id' IS DISTINCT FROM p_member->>'site_id' OR p_data->>'user_id' IS DISTINCT FROM p_member->>'user_id' OR p_data->>'site_id' IS DISTINCT FROM p_audit->>'site_id' OR p_data->>'user_id' IS DISTINCT FROM p_audit->>'actor_user_id' THEN RAISE EXCEPTION 'Session scope mismatch'; END IF;
DELETE FROM localgov.local_admin_sessions WHERE expires_at < to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
INSERT INTO localgov.site_members (id, site_id, user_id, email, role, department, active, created_at) VALUES ((p_member->>'id')::text, (p_member->>'site_id')::text, (p_member->>'user_id')::text, (p_member->>'email')::text, coalesce((p_member->>'role')::text, 'editor'), coalesce((p_member->>'department')::text, 'ส่วนกลาง'), coalesce((p_member->>'active')::boolean, true), coalesce((p_member->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ON CONFLICT (site_id,user_id) DO UPDATE SET email=excluded.email,role=excluded.role,department=excluded.department,active=excluded.active;
INSERT INTO localgov.local_admin_sessions (id, site_id, user_id, username, expires_at, created_at) VALUES ((p_data->>'id')::text, (p_data->>'site_id')::text, (p_data->>'user_id')::text, (p_data->>'username')::text, (p_data->>'expires_at')::text, coalesce((p_data->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) RETURNING * INTO saved;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN to_jsonb(saved);
END; $$;

REVOKE ALL ON FUNCTION localgov.create_session(jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.create_session(jsonb,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION localgov.delete_session(p_id text, p_audit jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved localgov.local_admin_sessions%ROWTYPE;
BEGIN
DELETE FROM localgov.local_admin_sessions WHERE id=p_id AND site_id=p_audit->>'site_id' AND user_id=p_audit->>'actor_user_id' RETURNING * INTO saved;
IF NOT FOUND THEN RETURN NULL; END IF;
INSERT INTO localgov.audit_logs (id, site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES ((p_audit->>'id')::text, (p_audit->>'site_id')::text, (p_audit->>'actor_user_id')::text, (p_audit->>'actor_email')::text, (p_audit->>'action')::text, (p_audit->>'entity_type')::text, (p_audit->>'entity_id')::text, coalesce((p_audit->>'metadata')::text, '{}'), coalesce((p_audit->>'created_at')::text, (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ;
RETURN '{}'::jsonb;
END; $$;

REVOKE ALL ON FUNCTION localgov.delete_session(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.delete_session(text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION localgov.dashboard_stats(p_site_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
SELECT jsonb_build_object(
'content',(select count(*) from localgov.content_items where site_id=p_site_id),
'drafts',(select count(*) from localgov.content_items where site_id=p_site_id and status='draft'),
'openRequests',(select count(*) from localgov.service_requests where site_id=p_site_id and status<>'completed'),
'completedRequests',(select count(*) from localgov.service_requests where site_id=p_site_id and status='completed')) INTO result;
RETURN result;
END; $$;

REVOKE ALL ON FUNCTION localgov.dashboard_stats(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.dashboard_stats(text) TO service_role;

NOTIFY pgrst, 'reload schema';
