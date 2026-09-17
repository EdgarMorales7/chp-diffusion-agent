-- Phase 3 AI Content Engine Migration

-- 1. Modify campaigns table
ALTER TABLE campaigns RENAME COLUMN target_audience TO audience;
ALTER TABLE campaigns ALTER COLUMN status TYPE TEXT USING status::TEXT;
ALTER TABLE campaigns ALTER COLUMN status SET DEFAULT 'Draft';
-- Dropping the enum type if it exists
DROP TYPE IF EXISTS campaign_status;

ALTER TABLE campaigns
    ADD COLUMN brief TEXT,
    ADD COLUMN customization TEXT,
    ADD COLUMN location TEXT,
    ADD COLUMN offer TEXT,
    ADD COLUMN cta_instruction TEXT,
    ADD COLUMN tone TEXT,
    ADD COLUMN strategy JSONB;

-- 2. Modify post_variants table
ALTER TABLE post_variants
    ADD COLUMN audience TEXT,
    ADD COLUMN estimated_length TEXT,
    ADD COLUMN angle TEXT,
    ADD COLUMN status TEXT DEFAULT 'Draft';

-- 3. Create ai_generations table
CREATE TABLE ai_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    generation_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    input JSONB,
    output JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create creative_briefs table
CREATE TABLE creative_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    visual_concept TEXT,
    product_focus TEXT,
    target_audience TEXT,
    setting TEXT,
    model_direction TEXT,
    clothing_direction TEXT,
    composition TEXT,
    lighting TEXT,
    background TEXT,
    visual_style TEXT,
    text_on_image TEXT,
    aspect_ratio TEXT,
    image_prompt TEXT,
    status TEXT DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create cta_templates table
CREATE TABLE cta_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed some CTAs
INSERT INTO cta_templates (text, category) VALUES
    ('Cotiza por WhatsApp', 'WhatsApp'),
    ('Solicita tu cotización', 'WhatsApp'),
    ('Mándanos mensaje', 'General'),
    ('Cuéntanos qué necesitas', 'Asesoría'),
    ('Pregunta por opciones', 'Catálogo'),
    ('Escríbenos para cotizar', 'WhatsApp');

-- Add Trigger for creative_briefs
CREATE TRIGGER update_creative_briefs_updated_at
BEFORE UPDATE ON creative_briefs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
