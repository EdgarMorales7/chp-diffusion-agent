-- Phase 5: Publication Queue

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
    published_at TIMESTAMP WITH TIME ZONE,
    facebook_post_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_publication_queue_group_id ON publication_queue(group_id);
CREATE INDEX idx_publication_queue_campaign_id ON publication_queue(campaign_id);
CREATE INDEX idx_publication_queue_scheduled_for ON publication_queue(scheduled_for);
CREATE INDEX idx_publication_queue_status ON publication_queue(status);

-- Trigger for updated_at
CREATE TRIGGER update_publication_queue_updated_at
BEFORE UPDATE ON publication_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
