CREATE TABLE ledger_entries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  card_number VARCHAR(16) NOT NULL REFERENCES cards (number),
  kind VARCHAR(16) NOT NULL,
  amount_pence BIGINT NOT NULL CHECK (amount_pence > 0),
  related_entry_id BIGINT REFERENCES ledger_entries (id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
