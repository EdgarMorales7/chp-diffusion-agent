-- Phase 4 Creative Engine Migration

-- 1. Modify creatives table
ALTER TABLE creatives ALTER COLUMN status TYPE TEXT USING status::TEXT;
ALTER TABLE creatives ALTER COLUMN status SET DEFAULT 'Draft';
-- Dropping the enum type if it exists
DROP TYPE IF EXISTS creative_status;

ALTER TABLE creatives
    ADD COLUMN creative_brief_id UUID REFERENCES creative_briefs(id) ON DELETE SET NULL,
    ADD COLUMN variant INTEGER DEFAULT 1,
    ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai',
    ADD COLUMN model TEXT NOT NULL DEFAULT 'gpt-image-2.5-flare',
    ADD COLUMN storage_path TEXT,
    ADD COLUMN aspect_ratio TEXT DEFAULT '1:1',
    ADD COLUMN size TEXT DEFAULT '1024x1024',
    ADD COLUMN requested_size TEXT,
    ADD COLUMN requested_quality TEXT DEFAULT 'standard',
    ADD COLUMN estimated_cost NUMERIC(10, 4) DEFAULT 0,
    ADD COLUMN actual_usage JSONB,
    ADD COLUMN generation_cost NUMERIC(10, 4) DEFAULT 0,
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Re-map old prompt_used to prompt for consistency, if needed. (I'll keep prompt_used but add a comment or rename).
ALTER TABLE creatives RENAME COLUMN prompt_used TO prompt;

-- Add Trigger for creatives updated_at
CREATE TRIGGER update_creatives_updated_at
BEFORE UPDATE ON creatives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Create post_creatives mapping table for M:N relationships
CREATE TABLE post_creatives (
    post_variant_id UUID REFERENCES post_variants(id) ON DELETE CASCADE,
    creative_id UUID REFERENCES creatives(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (post_variant_id, creative_id)
);

-- 3. Set up Storage Bucket for creatives (Private bucket for security of internal marketing assets)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('creatives', 'creatives', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 4. Storage Security Policies for Private Bucket
CREATE POLICY "Admin Select Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'creatives' );

CREATE POLICY "Admin Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'creatives' );

CREATE POLICY "Admin Update Access" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'creatives' );

CREATE POLICY "Admin Delete Access" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'creatives' );
