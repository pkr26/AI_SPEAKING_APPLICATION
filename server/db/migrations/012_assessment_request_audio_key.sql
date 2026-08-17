-- Records which S3 object each processing assessment request is reading, so
-- submitted-object cleanup can preserve an object while ANY non-expired
-- processing claim for the same user references it: a duplicate submitted
-- under a different or malformed requestId, or a blind same-key retry that
-- re-claimed before a failed request's post-response delete landed, must
-- never delete the object out from under its live owner. NULL in local
-- multipart mode, which has no shared object to protect.

ALTER TABLE assessment_requests
  ADD COLUMN audio_key TEXT;
