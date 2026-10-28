-- Least-privilege runtime role for Sunrise Light (PostgreSQL 16).
-- Run once as the database owner, in the application database, then:
--   DATABASE_URL           -> sunrise_app      (runtime: read/write data only, no DDL)
--   MIGRATION_DATABASE_URL -> the owner role   (only used by "prisma migrate deploy" on container start)
-- Replace the password placeholder with a long random value from your secret store; never commit it.

CREATE ROLE sunrise_app LOGIN PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_SECRET' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO sunrise_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sunrise_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sunrise_app;

-- tables created by future migrations (run by the owner) are granted automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sunrise_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO sunrise_app;

-- the audit log is append-only for the application
REVOKE UPDATE, DELETE ON audit_logs FROM sunrise_app;
-- the migration history belongs to the owner only
REVOKE ALL ON _prisma_migrations FROM sunrise_app;
