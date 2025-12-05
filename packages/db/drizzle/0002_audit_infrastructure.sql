-- Audit infrastructure (@see https://supabase.com/blog/postgres-audit)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "audit";
--> statement-breakpoint
CREATE TABLE "audit"."record_version" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" text,
	"old_record_id" text,
	"op" text,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"table_oid" integer NOT NULL,
	"table_schema" text NOT NULL,
	"table_name" text NOT NULL,
	"record" jsonb,
	"old_record" jsonb
);
--> statement-breakpoint
CREATE INDEX "record_version_ts" ON "audit"."record_version" USING brin ("ts");
--> statement-breakpoint
CREATE INDEX "record_version_table_oid" ON "audit"."record_version" USING btree ("table_oid");
--> statement-breakpoint
CREATE INDEX "record_version_record_id" ON "audit"."record_version" USING btree ("record_id");
--> statement-breakpoint
CREATE INDEX "record_version_old_record_id" ON "audit"."record_version" USING btree ("old_record_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit.primary_key_columns(entity_oid oid)
    RETURNS text[]
    STABLE
    SECURITY DEFINER
    LANGUAGE sql
AS $$
    SELECT
        coalesce(
            array_agg(pa.attname::text ORDER BY pa.attnum),
            array[]::text[]
        ) column_names
    FROM
        pg_index pi
        JOIN pg_attribute pa
            ON pi.indrelid = pa.attrelid
            AND pa.attnum = any(pi.indkey)
    WHERE
        indrelid = $1
        AND indisprimary
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit.to_record_id(
    entity_oid oid,
    pkey_cols text[],
    rec jsonb
)
    RETURNS uuid
    STABLE
    LANGUAGE sql
AS $$
    SELECT
        CASE
            WHEN rec IS NULL THEN NULL
            WHEN pkey_cols = array[]::text[] THEN gen_random_uuid()
            ELSE (
                SELECT
                    uuid_generate_v5(
                        'fd62bc3d-8d6e-43c2-919c-802ba3762271',
                        (
                            jsonb_build_array(to_jsonb($1))
                            || jsonb_agg($3 ->> key_)
                        )::text
                    )
                FROM
                    unnest($2) x(key_)
            )
        END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit.insert_update_delete_trigger()
    RETURNS trigger
    SECURITY DEFINER
    LANGUAGE plpgsql
AS $$
DECLARE
    pkey_cols text[] = audit.primary_key_columns(TG_RELID);
    record_jsonb jsonb = to_jsonb(new);
    record_id uuid = audit.to_record_id(TG_RELID, pkey_cols, record_jsonb);
    old_record_jsonb jsonb = to_jsonb(old);
    old_record_id uuid = audit.to_record_id(TG_RELID, pkey_cols, old_record_jsonb);
BEGIN
    INSERT INTO audit.record_version(
        record_id,
        old_record_id,
        op,
        table_oid,
        table_schema,
        table_name,
        record,
        old_record
    )
    SELECT
        record_id,
        old_record_id,
        TG_OP,
        TG_RELID,
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        record_jsonb,
        old_record_jsonb;

    RETURN coalesce(new, old);
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit.enable_tracking(regclass)
    RETURNS void
    VOLATILE
    SECURITY DEFINER
    LANGUAGE plpgsql
AS $$
DECLARE
    statement_row text = format('
        CREATE TRIGGER audit_i_u_d
            BEFORE INSERT OR UPDATE OR DELETE
            ON %I
            FOR EACH ROW
            EXECUTE PROCEDURE audit.insert_update_delete_trigger();',
        $1
    );
    pkey_cols text[] = audit.primary_key_columns($1);
BEGIN
    IF pkey_cols = array[]::text[] THEN
        RAISE EXCEPTION 'Table % can not be audited because it has no primary key', $1;
    END IF;

    IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid = $1 AND tgname = 'audit_i_u_d') THEN
        EXECUTE statement_row;
    END IF;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit.disable_tracking(regclass)
    RETURNS void
    VOLATILE
    SECURITY DEFINER
    LANGUAGE plpgsql
AS $$
DECLARE
    statement_row text = format(
        'DROP TRIGGER IF EXISTS audit_i_u_d ON %I;',
        $1
    );
BEGIN
    EXECUTE statement_row;
END;
$$;
--> statement-breakpoint
SELECT audit.enable_tracking('public.bet'::regclass);
--> statement-breakpoint
SELECT audit.enable_tracking('public.follow'::regclass);
--> statement-breakpoint
SELECT audit.enable_tracking('public.user_profile'::regclass);
--> statement-breakpoint
SELECT audit.enable_tracking('public.user_stats'::regclass);
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_activity_user";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_activity_type";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_activity_created";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_activity_public";
--> statement-breakpoint
ALTER TABLE "activity" DROP CONSTRAINT IF EXISTS "activity_user_id_user_id_fk";
--> statement-breakpoint
DROP TABLE IF EXISTS "activity";
--> statement-breakpoint
DROP TYPE IF EXISTS "activity_type";
