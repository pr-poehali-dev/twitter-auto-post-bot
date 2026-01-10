
-- Создаём новую таблицу для auth_token
CREATE TABLE IF NOT EXISTS t_p42702992_twitter_auto_post_bo.twitter_auth (
    id SERIAL PRIMARY KEY,
    auth_token TEXT NOT NULL,
    ct0 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_twitter_auth_created ON t_p42702992_twitter_auto_post_bo.twitter_auth(created_at DESC);
