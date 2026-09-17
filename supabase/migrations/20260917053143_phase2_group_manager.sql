-- 1. Create categories table
CREATE TABLE group_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial categories
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
    ('Otros');

-- 2. Modify groups table
ALTER TABLE groups RENAME COLUMN url TO facebook_url;
ALTER TABLE groups RENAME COLUMN size_approx TO approximate_member_count;

-- Update status to use TEXT
ALTER TABLE groups ALTER COLUMN status DROP DEFAULT;
ALTER TABLE groups ALTER COLUMN status TYPE TEXT USING status::TEXT;
DROP TYPE IF EXISTS group_status;

-- Add new columns
ALTER TABLE groups
    ADD COLUMN category_id UUID REFERENCES group_categories(id) ON DELETE SET NULL,
    ADD COLUMN description TEXT,
    ADD COLUMN relevance_score INTEGER,
    ADD COLUMN activity_level TEXT,
    ADD COLUMN advertising_allowed BOOLEAN,
    ADD COLUMN advertising_frequency TEXT,
    ADD COLUMN approval_required BOOLEAN,
    ADD COLUMN preferred_day TEXT,
    ADD COLUMN preferred_time TEXT,
    ADD COLUMN last_checked_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN last_published_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN next_allowed_publication_at TIMESTAMP WITH TIME ZONE;

-- Set new default for status
ALTER TABLE groups ALTER COLUMN status SET DEFAULT 'Pending Review';

-- Drop the old category text column
ALTER TABLE groups DROP COLUMN IF EXISTS category;

-- 3. Modify group_rules table
ALTER TABLE group_rules ALTER COLUMN status TYPE TEXT USING status::TEXT;
DROP TYPE IF EXISTS rule_status;
ALTER TABLE group_rules ALTER COLUMN status SET DEFAULT 'Unknown';

ALTER TABLE group_rules
    ADD COLUMN value TEXT,
    ADD COLUMN source TEXT,
    ADD COLUMN evidence TEXT,
    ADD COLUMN verification_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN notes TEXT;
