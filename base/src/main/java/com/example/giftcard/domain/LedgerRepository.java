package com.example.giftcard.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Reads the ledger. Entries are written only through {@link GiftCardRepository}. */
public interface LedgerRepository {

  Optional<LedgerEntry> find(long id);

  /** Every entry for the card, oldest first. */
  List<LedgerEntry> forCard(CardNumber card);

  /** Every entry with {@code from <= at < to}, oldest first. */
  List<LedgerEntry> between(Instant from, Instant to);
}
