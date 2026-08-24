-- Keep persisted strings returned through the public app contract nonblank
-- under the same ECMAScript trim semantics used by the mobile parsers.
-- PostgreSQL's one-argument btrim only removes U+0020, so list every
-- ECMAScript whitespace/line-terminator code point explicitly.

ALTER TABLE users
  ADD CONSTRAINT users_name_nonblank_check CHECK (
    btrim(name, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') <> ''
  ) NOT VALID,
  ADD CONSTRAINT users_email_nonblank_check CHECK (
    btrim(email, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') <> ''
  ) NOT VALID;

ALTER TABLE attempts
  ADD CONSTRAINT attempts_feedback_nonblank_check CHECK (
    btrim(feedback, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') <> ''
  ) NOT VALID;

ALTER TABLE users VALIDATE CONSTRAINT users_name_nonblank_check;
ALTER TABLE users VALIDATE CONSTRAINT users_email_nonblank_check;
ALTER TABLE attempts VALIDATE CONSTRAINT attempts_feedback_nonblank_check;
