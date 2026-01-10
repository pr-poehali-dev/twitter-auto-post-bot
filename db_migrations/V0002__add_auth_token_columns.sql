
-- Добавление колонок для auth_token
ALTER TABLE t_p42702992_twitter_auto_post_bo.twitter_settings 
  ADD COLUMN IF NOT EXISTS auth_token TEXT,
  ADD COLUMN IF NOT EXISTS ct0 TEXT;
