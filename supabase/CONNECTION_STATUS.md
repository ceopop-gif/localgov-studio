# Supabase connection preparation

- Project: `localgov-studio`
- Organization: `AIChatbot`
- Region: Singapore (`ap-southeast-1`)
- Project reference: `cfgxiwfytgfhmqitfihx`
- API URL: `https://cfgxiwfytgfhmqitfihx.supabase.co`
- Confirmed project cost: $10/month.

## Completed

The `localgov` schema contains the seven application tables and indexes from the existing D1 schema. Row-level security is enabled. The `anon` and `authenticated` roles have no schema or table access.

`db/supabase-rest.ts` prepares a server-only adapter for the standard Supabase Data API. Keys are read from runtime configuration, never from source code or public environment variables. Failed database calls propagate an error without logging citizen data or credentials.

## Not activated

The live website still uses D1. No existing citizen records, articles, sessions, or media metadata have been migrated. The prepared tables are empty. The server-only adapter is not wired into existing routes yet.

The custom SQL gateway was not deployed. Its temporary database login was disabled. It is not an approved integration path.

## Remaining activation steps

1. Supply an existing Supabase server secret key through secure runtime configuration as `SUPABASE_SECRET_KEY`; set `SUPABASE_URL` to the API URL above. Do not send or commit the key in chat, Git, or client code.
2. Expose the `localgov` schema to the Data API and grant only the backend role the required table access. Preserve the current deny rules for anonymous and authenticated browser roles.
3. Implement the existing application operations against the Data API, retaining tenant authorization and atomic multi-table writes through narrowly scoped database functions.
4. Export complete D1 records under a bounded write pause. The database inspection tool truncates long values and cannot serve as the migration export. Verify row counts and complete field values before switching providers.
5. Test public pages, citizen request creation/tracking, admin login, CMS editing, media metadata, and denied anonymous access; publish the tested version.

Uploaded media bytes currently remain in the existing R2 bucket. Database connection work does not itself migrate those files.

## Verification (2026-09-26)

- TypeScript: `tsc --noEmit --incremental false` passed.
- Adapter tests: `node --test tests/supabase-rest.test.mjs` passed (4 tests). These use mocked HTTP responses, not a live Data API connection.
- Live PostgreSQL: synthetic insert, read, update, delete, default values, and foreign-key cascade checks passed inside a rolled-back transaction. No test records were retained.
- All seven tables have RLS enabled; schema/table privilege checks confirm that `anon` and `authenticated` cannot read application records.
- Supabase security advisor returned no findings. This is a schema check, not an end-to-end application security audit.
- Performance advisor reports unused indexes in this empty database and the default Auth connection allocation. Preserve the indexes for the existing access patterns; revisit the [index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) and [production configuration](https://supabase.com/docs/guides/deployment/going-into-prod) after activation.

## Approval blocker

Automatic approval review rejected inspecting the API-key settings because it could expose sensitive credentials and required more specific authorization. The server key has not been read or installed. Do not route around that rejection through another tool or endpoint. Obtain explicit permission to retrieve the existing server key and save it directly in the server's secret configuration before continuing that step.
