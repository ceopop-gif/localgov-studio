# Supabase connection

Project `localgov-studio`, reference `cfgxiwfytgfhmqitfihx`, Singapore (`ap-southeast-1`).

## Integration

The application uses the standard Supabase Data API over HTTPS. Server runtime variables hold the URL, publishable key and secret key. Secret and service-role credentials are never sent to the browser or committed to source.

All seven application tables have RLS enabled. `anon` and `authenticated` have no schema/table/function privileges. The server verifies the existing ChatGPT or local-admin session and site membership. Mutations use fixed, SECURITY INVOKER PostgreSQL functions; record writes and audit writes are atomic. No arbitrary SQL gateway is used.

`localgov` is exposed using an authenticator role setting alongside the existing `public` and `graphql_public` schemas. This overrides the Dashboard's exposed-schema control. Only `service_role` receives backend access.

## Migration verified on 2026-09-26

The site entered a write pause before copying complete records directly from D1 to Supabase. Every field was included, including long Thai article bodies. A second source snapshot detected concurrent changes. Source and destination counts and SHA-256 digests matched for all tables.

| Table | Migrated rows |
| --- | ---: |
| sites | 1 |
| site_members | 2 |
| content_items | 5 |
| service_requests | 1 |
| media_files | 0 |
| audit_logs | 8 |
| local_admin_sessions | 1 |

D1 was not deleted or modified by migration. It is the pre-cutover source, not a continuously synchronized replica. Media bytes remain in the existing R2 bucket; existing media URLs are preserved.

The temporary fixed-scope migration endpoint is removed from the final version and its short-lived secret is removed from runtime configuration.

## Verification

- TypeScript checking and production builds passed.
- Four adapter tests passed, including unknown-operation rejection and error redaction.
- Live PostgreSQL tests verified defaults, long Thai text, cross-site authorization denial, atomic rollback on audit failure, requests, media metadata, session login/logout and dashboard counts. Test data was rolled back.
- A live Data API request with the server key returned HTTP 200.
- The publishable key was denied access to the private application schema (HTTP 401).
- Supabase security advisor returned no findings after the schema and function changes.

Restoring the old application after new Supabase writes requires reconciling those writes; do not blindly roll back to the stale D1 copy.
