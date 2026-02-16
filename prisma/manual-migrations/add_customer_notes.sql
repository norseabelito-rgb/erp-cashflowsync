-- Customer Notes table for storing notes about customers
-- Notes are linked to customer email (case-insensitive, stored lowercase)

CREATE TABLE IF NOT EXISTS customer_notes (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  note TEXT NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_email ON customer_notes(email);
