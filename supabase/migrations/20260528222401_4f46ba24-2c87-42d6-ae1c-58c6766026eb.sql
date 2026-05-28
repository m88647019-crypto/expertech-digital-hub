CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('keep-db-awake');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'keep-db-awake',
  '0 9 * * 1,4',
  $$ SELECT 1; $$
);