# Manual Database Migration SQL

If `alembic upgrade head` doesn't work, you can run this SQL manually.

## Connect to Database
```bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d applytide
```

## Run Migration SQL
```sql
-- Create llm_usage table
CREATE TABLE llm_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    endpoint VARCHAR(200) NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    estimated_cost FLOAT NOT NULL,
    response_time_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    extra JSONB
);

-- Create indexes for performance
CREATE INDEX idx_llm_usage_timestamp ON llm_usage(timestamp);
CREATE INDEX idx_llm_usage_user_id ON llm_usage(user_id);
CREATE INDEX idx_llm_usage_provider ON llm_usage(provider);
CREATE INDEX idx_llm_usage_model ON llm_usage(model);
CREATE INDEX idx_llm_usage_success ON llm_usage(success);

-- Verify table was created
\dt llm_usage

-- Check table structure
\d llm_usage

-- Exit
\q
```

## Update Alembic Version (if manual migration used)
```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d applytide

# Update alembic_version table
UPDATE alembic_version SET version_num = '20251023_llm_usage';

-- Verify
SELECT * FROM alembic_version;

-- Exit
\q
```

## Verify Migration
```bash
# Check table exists and has correct structure
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d applytide -c "\d llm_usage"

# Should show:
# - id (uuid, primary key)
# - timestamp (timestamp with time zone)
# - user_id (uuid, foreign key to users)
# - provider (varchar 50)
# - model (varchar 100)
# - endpoint (varchar 200)
# - prompt_tokens (integer)
# - completion_tokens (integer)
# - total_tokens (integer)
# - estimated_cost (double precision)
# - response_time_ms (integer)
# - success (boolean)
# - error_message (text)
# - extra (jsonb)
# 
# Plus 5 indexes:
# - idx_llm_usage_timestamp
# - idx_llm_usage_user_id
# - idx_llm_usage_provider
# - idx_llm_usage_model
# - idx_llm_usage_success
```

## Rollback (if needed)
```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_llm_usage_success;
DROP INDEX IF EXISTS idx_llm_usage_model;
DROP INDEX IF EXISTS idx_llm_usage_provider;
DROP INDEX IF EXISTS idx_llm_usage_user_id;
DROP INDEX IF EXISTS idx_llm_usage_timestamp;

-- Drop table
DROP TABLE IF EXISTS llm_usage;

-- Update alembic version back to previous
UPDATE alembic_version SET version_num = '20251022_initial';
```
