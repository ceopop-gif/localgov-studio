BEGIN;
CREATE TABLE IF NOT EXISTS localgov.media_folders (
 id text PRIMARY KEY,
 site_id text NOT NULL REFERENCES localgov.sites(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (site_id, id), UNIQUE (site_id, name)
);
ALTER TABLE localgov.media_folders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON localgov.media_folders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON localgov.media_folders TO service_role;
ALTER TABLE localgov.media_files ADD COLUMN IF NOT EXISTS folder_id text;
ALTER TABLE localgov.media_files ADD CONSTRAINT media_folder_same_site FOREIGN KEY (site_id, folder_id) REFERENCES localgov.media_folders(site_id,id);
CREATE INDEX IF NOT EXISTS media_files_folder_idx ON localgov.media_files(site_id,folder_id);
CREATE OR REPLACE FUNCTION localgov.manage_media_folder(p_site_id text,p_actor_id text,p_actor_email text,p_action text,p_folder_id text DEFAULT NULL,p_name text DEFAULT NULL,p_file_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM localgov.require_manager(p_site_id,p_actor_id);
 IF p_action='list' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY name),'[]'::jsonb) INTO result FROM localgov.media_folders WHERE site_id=p_site_id;
  RETURN result;
 ELSIF p_action='create' THEN
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid folder name'; END IF;
  INSERT INTO localgov.media_folders(id,site_id,name) VALUES(p_folder_id,p_site_id,btrim(p_name)) RETURNING jsonb_build_object('id',id,'name',name) INTO result;
 ELSIF p_action='move' THEN
  IF p_folder_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM localgov.media_folders WHERE id=p_folder_id AND site_id=p_site_id) THEN RAISE EXCEPTION 'Folder not found'; END IF;
  UPDATE localgov.media_files SET folder_id=p_folder_id WHERE id=p_file_id AND site_id=p_site_id RETURNING jsonb_build_object('id',id,'folderId',folder_id) INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'File not found'; END IF;
 ELSE RAISE EXCEPTION 'Invalid operation'; END IF;
 INSERT INTO localgov.audit_logs(id,site_id,actor_user_id,actor_email,action,entity_type,entity_id,metadata)
 VALUES(gen_random_uuid()::text,p_site_id,p_actor_id,p_actor_email,'media.folder.'||p_action,'media',coalesce(p_file_id,p_folder_id),jsonb_build_object('folderId',p_folder_id,'name',p_name)::text);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION localgov.manage_media_folder(text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION localgov.manage_media_folder(text,text,text,text,text,text,text) TO service_role;
-- Extend the existing audited upload operation without changing its authorization.
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('localgov.create_media(jsonb,jsonb)'::regprocedure) INTO definition;
 definition := replace(definition,'RETURNING * INTO saved;', 'RETURNING * INTO saved; UPDATE localgov.media_files SET folder_id = nullif(p_data->>''folder_id'','''') WHERE id=saved.id RETURNING * INTO saved;');
 EXECUTE definition;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
