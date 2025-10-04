-- Schema for API usage tracking
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS api_keys
(
    api_key    VARCHAR(100) NOT NULL PRIMARY KEY,
    ai_type    VARCHAR(10)  NOT NULL CHECK (ai_type IN ('openai', 'anthropic', 'google')),
    is_free    BOOLEAN      NOT NULL DEFAULT FALSE,
    -- 이 키의 주인에 대한 부가적인 정보를 담는다. 따로 키를 기증받거나 지원받은 경우를 위해서 메모를 남기는 필드이다
    owner_info TEXT,
    created_at DATETIME     NOT NULL DEFAULT (datetime('now'))
);

-- 각 키별로 토큰의 현재 사용량을 기록해둔다. 오늘, 이번달, 누적총합으로 저장한다
CREATE TABLE IF NOT EXISTS api_key_usages
(
    api_key             VARCHAR(100) NOT NULL,
    -- 이 키를 어떤 모델에 사용했는지 구분해서 기록을 남겨둔다
    -- 구글의 경우 free_token_limit가 모델별로 따로 계산되기 때문이다
    model               VARCHAR(30)  NOT NULL,

    total_input_tokens  INTEGER      NOT NULL DEFAULT 0,
    month_input_tokens  INTEGER      NOT NULL DEFAULT 0,
    week_input_tokens   INTEGER      NOT NULL DEFAULT 0,
    today_input_tokens  INTEGER      NOT NULL DEFAULT 0,

    total_output_tokens INTEGER      NOT NULL DEFAULT 0,
    month_output_tokens INTEGER      NOT NULL DEFAULT 0,
    week_output_tokens  INTEGER      NOT NULL DEFAULT 0,
    today_output_tokens INTEGER      NOT NULL DEFAULT 0,

    total_call_count    INTEGER      NOT NULL DEFAULT 0,
    month_call_count    INTEGER      NOT NULL DEFAULT 0,
    week_call_count     INTEGER      NOT NULL DEFAULT 0,
    today_call_count    INTEGER      NOT NULL DEFAULT 0,

    updated_at          DATETIME     NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (api_key, model)
);

-- updated_at을 자동으로 업데이트한다
CREATE TRIGGER IF NOT EXISTS api_key_usages_updated_at
    AFTER UPDATE
    ON api_key_usages
    FOR EACH ROW
BEGIN
    UPDATE api_key_usages SET updated_at = datetime('now') WHERE api_key = OLD.api_key AND model = OLD.model;
END;

CREATE TABLE IF NOT EXISTS daily_usage_archive
(
    api_key       VARCHAR(100) NOT NULL,
    model         VARCHAR(20)  NOT NULL,
    ai_type       VARCHAR(10)  NOT NULL CHECK (ai_type IN ('openai', 'anthropic', 'google')),
    usage_date    VARCHAR(10)  NOT NULL, -- YYYY-MM-DD in America/Los_Angeles
    input_tokens  INTEGER      NOT NULL DEFAULT 0,
    output_tokens INTEGER      NOT NULL DEFAULT 0,
    call_count    INTEGER      NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (api_key, model, usage_date)
);

CREATE TABLE IF NOT EXISTS monthly_usage_archive
(
    api_key       VARCHAR(100) NOT NULL,
    model         VARCHAR(20)  NOT NULL,
    ai_type       VARCHAR(10)  NOT NULL CHECK (ai_type IN ('openai', 'anthropic', 'google')),
    usage_month   VARCHAR(7)   NOT NULL, -- YYYY-MM in America/Los_Angeles
    input_tokens  INTEGER      NOT NULL DEFAULT 0,
    output_tokens INTEGER      NOT NULL DEFAULT 0,
    call_count    INTEGER      NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (api_key, model, usage_month)
);

CREATE TABLE IF NOT EXISTS weekly_usage_archive
(
    api_key       VARCHAR(100) NOT NULL,
    model         VARCHAR(20)  NOT NULL,
    ai_type       VARCHAR(10)  NOT NULL CHECK (ai_type IN ('openai', 'anthropic', 'google')),
    usage_week    VARCHAR(10)  NOT NULL, -- YYYY-MM-DD in America/Los_Angeles
    input_tokens  INTEGER      NOT NULL DEFAULT 0,
    output_tokens INTEGER      NOT NULL DEFAULT 0,
    call_count    INTEGER      NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (api_key, model, usage_week)
);

