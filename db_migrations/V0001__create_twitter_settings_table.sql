
-- Создание таблицы для хранения настроек Twitter API
CREATE TABLE IF NOT EXISTS t_p42702992_twitter_auto_post_bo.twitter_settings (
    id SERIAL PRIMARY KEY,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    access_token TEXT NOT NULL,
    access_token_secret TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска последней записи
CREATE INDEX idx_twitter_settings_created ON t_p42702992_twitter_auto_post_bo.twitter_settings(created_at DESC);
