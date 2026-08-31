-- Migrations 022 and 024 pin `SET search_path FROM CURRENT` on every trigger
-- function they create, so a hostile persistent schema cannot capture the
-- unqualified catalog references inside those trigger bodies. The two
-- recording trigger functions predate that convention (migrations 017 and
-- 023); pin them the same way. Catalog-only change: the function bodies and
-- their triggers are untouched.

ALTER FUNCTION public.enqueue_recording_s3_deletion() SET search_path FROM CURRENT;

ALTER FUNCTION public.assign_recording_retention_epoch() SET search_path FROM CURRENT;
