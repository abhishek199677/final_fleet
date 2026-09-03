-- Fleet OS Database Initialization
-- This runs on first postgres start

-- Create schemas
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS tenant;
CREATE SCHEMA IF NOT EXISTS ref;

-- Create roles
DO $$ BEGIN
  CREATE ROLE app_owner NOLOGIN;
 EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE ROLE app_ops NOLOGIN;
 EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE ROLE app_platform NOLOGIN;
 EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Grant schema usage
GRANT USAGE ON SCHEMA platform TO app_owner, app_ops, app_platform;
GRANT USAGE ON SCHEMA tenant TO app_owner, app_ops;
GRANT USAGE ON SCHEMA ref TO app_owner, app_ops;

-- Set search_path
ALTER ROLE app_owner SET search_path TO platform, tenant, ref, public;
ALTER ROLE app_ops SET search_path TO tenant, ref, public;
ALTER ROLE app_platform SET search_path TO platform, public;
