-- Phase 6: Human-in-the-Loop Facebook Publisher

ALTER TABLE publication_queue
  ADD COLUMN prepared_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN opened_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN skipped_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN publication_notes TEXT;

