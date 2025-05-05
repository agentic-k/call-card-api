-- alter  table
ALTER TABLE templates
DROP COLUMN checkpoints,
ADD COLUMN is_default_template BOOLEAN NOT NULL DEFAULT false;