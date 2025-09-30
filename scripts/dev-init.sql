-- Development Database Initialization Script
-- This script runs after the main database setup in development mode

-- Enable additional PostgreSQL extensions for development
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create development-specific indexes for better performance during development
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON "User" USING gin(email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON "User" USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_commits_message_trgm ON "Commit" USING gin(message gin_trgm_ops);

-- Create development helper views
CREATE OR REPLACE VIEW dev_user_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.username,
    COUNT(DISTINCT c.id) as total_commits,
    COUNT(DISTINCT t.id) as total_tasks,
    COALESCE(SUM(c.additions), 0) as total_lines_added,
    COALESCE(SUM(c.deletions), 0) as total_lines_deleted,
    u."productivityScore",
    u."lastSeen",
    u."isActive"
FROM "User" u
LEFT JOIN "Commit" c ON u.id = c."userId"  
LEFT JOIN "Task" t ON u.id = t."assigneeId"
GROUP BY u.id, u.name, u.email, u.username, u."productivityScore", u."lastSeen", u."isActive";

CREATE OR REPLACE VIEW dev_project_stats AS
SELECT 
    p.id,
    p.name,
    p.namespace,
    p.description,
    COUNT(DISTINCT c.id) as total_commits,
    COUNT(DISTINCT c."userId") as unique_contributors,
    COALESCE(SUM(c.additions), 0) as total_lines_added,
    COALESCE(SUM(c.deletions), 0) as total_lines_deleted,
    p."lastActivity",
    p."isActive"
FROM "Project" p
LEFT JOIN "Commit" c ON p.id = c."projectId"
GROUP BY p.id, p.name, p.namespace, p.description, p."lastActivity", p."isActive";

-- Create development logging table
CREATE TABLE IF NOT EXISTS dev_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    meta JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create development configuration table
CREATE TABLE IF NOT EXISTS dev_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default development configuration
INSERT INTO dev_config (key, value, description) VALUES
('sync_interval_minutes', '5', 'Sync interval in minutes for development (faster than production)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO dev_config (key, value, description) VALUES
('enable_debug_logging', 'true', 'Enable debug logging in development')
ON CONFLICT (key) DO NOTHING;

INSERT INTO dev_config (key, value, description) VALUES
('mock_external_apis', 'false', 'Whether to mock external API calls')
ON CONFLICT (key) DO NOTHING;

-- Create development helper functions
CREATE OR REPLACE FUNCTION dev_reset_user_activity() 
RETURNS void AS $$
BEGIN
    -- Reset all users' last seen to recent dates for testing
    UPDATE "User" SET "lastSeen" = CURRENT_TIMESTAMP - (random() * interval '30 days');
    
    -- Ensure some users are marked as active
    UPDATE "User" SET "isActive" = true WHERE random() < 0.8;
    
    RAISE NOTICE 'Development: Reset user activity timestamps';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION dev_generate_sample_commits(user_count INT DEFAULT 5, days_back INT DEFAULT 30)
RETURNS void AS $$
DECLARE
    user_rec RECORD;
    project_rec RECORD;
    i INT;
    commit_date TIMESTAMP;
BEGIN
    -- Generate sample commits for testing
    FOR user_rec IN (SELECT * FROM "User" LIMIT user_count) LOOP
        FOR project_rec IN (SELECT * FROM "Project" LIMIT 3) LOOP
            FOR i IN 1..(random() * 10 + 1)::INT LOOP
                commit_date := CURRENT_TIMESTAMP - (random() * interval '1 day' * days_back);
                
                INSERT INTO "Commit" (
                    id, sha, message, "authorName", "authorEmail", "authorDate",
                    additions, deletions, "filesChanged", "userId", "projectId",
                    "createdAt", "updatedAt"
                ) VALUES (
                    gen_random_uuid()::TEXT,
                    encode(gen_random_bytes(20), 'hex'),
                    'Development commit #' || i || ' - ' || user_rec.name,
                    user_rec.name,
                    user_rec.email,
                    commit_date,
                    (random() * 100 + 1)::INT,
                    (random() * 50)::INT,
                    (random() * 10 + 1)::INT,
                    user_rec.id,
                    project_rec.id,
                    commit_date,
                    commit_date
                ) ON CONFLICT (sha, "projectId") DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Development: Generated sample commits for % users over % days', user_count, days_back;
END;
$$ LANGUAGE plpgsql;

-- Log that development initialization completed
INSERT INTO dev_logs (level, message, meta) VALUES (
    'INFO', 
    'Development database initialization completed',
    jsonb_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'extensions', ARRAY['pg_stat_statements', 'pg_trgm'],
        'views', ARRAY['dev_user_stats', 'dev_project_stats'],
        'functions', ARRAY['dev_reset_user_activity', 'dev_generate_sample_commits']
    )
);

-- Show development setup summary
DO $$
BEGIN
    RAISE NOTICE '================================';
    RAISE NOTICE 'Development Database Setup Complete';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Available development views:';
    RAISE NOTICE '  - dev_user_stats';
    RAISE NOTICE '  - dev_project_stats'; 
    RAISE NOTICE 'Available development functions:';
    RAISE NOTICE '  - dev_reset_user_activity()';
    RAISE NOTICE '  - dev_generate_sample_commits(user_count, days_back)';
    RAISE NOTICE 'Development logs table: dev_logs';
    RAISE NOTICE 'Development config table: dev_config';
    RAISE NOTICE '================================';
END;
$$;
