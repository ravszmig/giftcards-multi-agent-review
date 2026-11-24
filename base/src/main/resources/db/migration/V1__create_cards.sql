CREATE TABLE cards (
  number VARCHAR(16) PRIMARY KEY,
  balance_pence BIGINT NOT NULL CHECK (balance_pence >= 0),
  issued_on DATE NOT NULL,
  version INT NOT NULL
);
