ALTER TABLE ledger_entries ADD COLUMN store_id VARCHAR(32);
CREATE INDEX ledger_entries_card_created ON ledger_entries (card_number, created_at);
