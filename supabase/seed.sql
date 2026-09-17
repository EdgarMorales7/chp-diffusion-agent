-- Supabase Seed File

-- Insert dummy group categories is handled by migration phase2_group_manager

-- Insert dummy groups
INSERT INTO groups (name, facebook_url, description, approximate_member_count, relevance_score, opportunity_score, status, notes)
VALUES
('DEMO / EXAMPLE - Emprendedores México', 'https://facebook.com/groups/emprendedoresmx', 'Grupo ficticio para pruebas locales', 150000, 80, 75, 'Active', 'DEMO'),
('DEMO / EXAMPLE - Restaurantes y Cafeterías', 'https://facebook.com/groups/restaurantes', 'Grupo ficticio para pruebas locales', 25000, 60, 50, 'Pending Review', 'DEMO'),
('DEMO / EXAMPLE - Ropa por Mayoreo', 'https://facebook.com/groups/ropamayoreo', 'Grupo ficticio para pruebas locales', 350000, 95, 90, 'Active', 'DEMO');
