package com.example.giftcard.domain;

import java.util.Optional;

/**
 * Stores cards. Every write stores the card and one ledger entry in a single transaction, so
 * the balance and the ledger never disagree.
 */
public interface GiftCardRepository {

  Optional<GiftCard> find(CardNumber number);

  /** Inserts a new card and its ISSUE entry. Returns the entry with its id. */
  LedgerEntry create(GiftCard card, LedgerEntry issue);

  /**
   * Stores the changed card and appends the entry. Throws
   * {@link java.util.ConcurrentModificationException} when the stored version is not
   * {@code updated.version()}: somebody else changed the card first.
   */
  LedgerEntry apply(GiftCard updated, LedgerEntry entry);
}
