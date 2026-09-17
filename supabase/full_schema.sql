-- ==============================================================================
-- CHP DIFFUSION AGENT - FULL CONSOLIDATED DATABASE SCHEMA (Fases 1 a 6)
-- Idempotente y listo para ejecución directa en Supabase Studio / PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONES Y FUNCIONES AUXILIARES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Limpieza limpia previa si existieran tablas (evita errores de dependencia)
DROP TABLE IF EXISTS publication_queue CASCADE;
DROP TABLE IF EXISTS post_creatives CASCADE;
DROP TABLE IF EXISTS creatives CASCADE;
DROP TABLE IF EXISTS creative_briefs CASCADE;
DROP TABLE IF EXISTS ai_generations CASCADE;
DROP TABLE IF EXISTS cta_templates CASCADE;
DROP TABLE IF EXISTS post_variants CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS group_rules CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS group_categories CASCADE;

DROP TYPE IF EXISTS group_status CASCADE;
DROP TYPE IF EXISTS rule_status CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
DROP TYPE IF EXISTS creative_status CASCADE;

-- 2. CATEGORÍAS DE GRUPOS (Fase 2)
CREATE TABLE group_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO group_categories (name) VALUES
    ('Emprendedores'),
    ('PyMEs'),
    ('Ropa'),
    ('Ropa por mayoreo'),
    ('Proveedores'),
    ('DTF'),
    ('DTG'),
    ('Bordado'),
    ('Serigrafía'),
    ('Uniformes'),
    ('Restaurantes'),
    ('Cafeterías'),
    ('Escuelas'),
    ('Universidades'),
    ('Equipos deportivos'),
    ('Eventos'),
    ('Negocios locales'),
    ('Compra/venta'),
    ('Otros')
ON CONFLICT (name) DO NOTHING;

-- 3. GRUPOS DE FACEBOOK (Fase 1 & 2)
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    facebook_url TEXT NOT NULL,
    category_id UUID REFERENCES group_categories(id) ON DELETE SET NULL,
    location TEXT,
    description TEXT,
    approximate_member_count INTEGER,
    opportunity_score INTEGER DEFAULT 0,
    relevance_score INTEGER DEFAULT 0,
    activity_level TEXT,
    advertising_allowed BOOLEAN DEFAULT TRUE,
    advertising_frequency TEXT,
    approval_required BOOLEAN DEFAULT FALSE,
    preferred_day TEXT,
    preferred_time TEXT,
    status TEXT NOT NULL DEFAULT 'Pending Review',
    notes TEXT,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    last_published_at TIMESTAMP WITH TIME ZONE,
    next_allowed_publication_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. REGLAS DE GRUPO (Fase 1 & 2)
CREATE TABLE group_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Unknown',
    value TEXT,
    source TEXT,
    evidence TEXT,
    verification_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_group_rules_updated_at
BEFORE UPDATE ON group_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. CAMPAÑAS (Fase 3)
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    objective TEXT,
    product TEXT,
    audience TEXT,
    brief TEXT,
    customization TEXT,
    location TEXT,
    offer TEXT,
    cta_instruction TEXT,
    tone TEXT,
    strategy JSONB,
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. VARIANTES DE POST (Fase 3)
CREATE TABLE post_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    hook TEXT NOT NULL,
    body TEXT NOT NULL,
    cta TEXT NOT NULL,
    audience TEXT,
    estimated_length TEXT,
    angle TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_post_variants_updated_at
BEFORE UPDATE ON post_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. CREATIVE BRIEFS (Fase 3 & 4)
CREATE TABLE creative_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
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
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_creative_briefs_updated_at
BEFORE UPDATE ON creative_briefs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. CREATIVOS VISUALES (Fase 4)
CREATE TABLE creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creative_brief_id UUID REFERENCES creative_briefs(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    image_url TEXT,
    storage_path TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    variant INTEGER DEFAULT 1,
    provider TEXT NOT NULL DEFAULT 'openai',
    model TEXT NOT NULL DEFAULT 'gpt-image-2.5-flare',
    aspect_ratio TEXT DEFAULT '1:1',
    size TEXT DEFAULT '1024x1024',
    requested_size TEXT,
    requested_quality TEXT DEFAULT 'standard',
    estimated_cost NUMERIC(10, 4) DEFAULT 0,
    actual_usage JSONB,
    generation_cost NUMERIC(10, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_creatives_updated_at
BEFORE UPDATE ON creatives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. RELACIÓN POSTS - CREATIVOS (Fase 4)
CREATE TABLE post_creatives (
    post_variant_id UUID REFERENCES post_variants(id) ON DELETE CASCADE,
    creative_id UUID REFERENCES creatives(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (post_variant_id, creative_id)
);

-- 10. TRAZABILIDAD IA (Fase 3)
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

-- 11. PLANTILLAS DE CTA (Fase 3)
CREATE TABLE cta_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO cta_templates (text, category) VALUES
    ('Cotiza por WhatsApp', 'WhatsApp'),
    ('Solicita tu cotización', 'WhatsApp'),
    ('Mándanos mensaje', 'General'),
    ('Cuéntanos qué necesitas', 'Asesoría'),
    ('Pregunta por opciones', 'Catálogo'),
    ('Escríbenos para cotizar', 'WhatsApp');

-- 12. COLA DE PUBLICACIÓN Y AUDITORÍA HITL (Fases 5 y 6)
CREATE TABLE publication_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    post_variant_id UUID REFERENCES post_variants(id) ON DELETE SET NULL,
    creative_id UUID REFERENCES creatives(id) ON DELETE SET NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Planned', 'Ready', 'Approved', 'Today', 'Published', 'Skipped', 'Cancelled')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    notes TEXT,
    publication_notes TEXT,
    prepared_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    skipped_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    facebook_post_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_publication_queue_updated_at
BEFORE UPDATE ON publication_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices de consulta rápida
CREATE INDEX idx_publication_queue_group_id ON publication_queue(group_id);
CREATE INDEX idx_publication_queue_campaign_id ON publication_queue(campaign_id);
CREATE INDEX idx_publication_queue_scheduled_for ON publication_queue(scheduled_for);
CREATE INDEX idx_publication_queue_status ON publication_queue(status);

-- 13. CONFIGURACIÓN DEL BUCKET PRIVADO DE STORAGE ('creatives')
INSERT INTO storage.buckets (id, name, public) 
VALUES ('creatives', 'creatives', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Políticas de Storage
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Select Access' AND tablename = 'objects') THEN
        CREATE POLICY "Admin Select Access" ON storage.objects FOR SELECT USING (bucket_id = 'creatives');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Insert Access' AND tablename = 'objects') THEN
        CREATE POLICY "Admin Insert Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'creatives');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Update Access' AND tablename = 'objects') THEN
        CREATE POLICY "Admin Update Access" ON storage.objects FOR UPDATE USING (bucket_id = 'creatives');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Delete Access' AND tablename = 'objects') THEN
        CREATE POLICY "Admin Delete Access" ON storage.objects FOR DELETE USING (bucket_id = 'creatives');
    END IF;
END $$;

-- 14. GRUPOS DE PRUEBA INICIALES (DEMO)
INSERT INTO groups (name, facebook_url, description, approximate_member_count, relevance_score, opportunity_score, status, notes)
VALUES
('DEMO - Emprendedores México', 'https://facebook.com/groups/emprendedoresmx', 'Grupo de prueba para playeras y textiles', 150000, 85, 80, 'Active', 'DEMO'),
('DEMO - Restaurantes y Cafeterías CDMX', 'https://facebook.com/groups/restaurantes', 'Grupo de prueba para mandiles y uniformes', 25000, 70, 65, 'Active', 'DEMO'),
('DEMO - Ropa por Mayoreo México', 'https://facebook.com/groups/ropamayoreo', 'Grupo de prueba para mayoreo textil', 350000, 95, 90, 'Active', 'DEMO')
ON CONFLICT DO NOTHING;
