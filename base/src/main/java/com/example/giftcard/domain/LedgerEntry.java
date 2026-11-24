package com.example.giftcard.domain;

import java.time.Instant;

/**
 * One movement of money on a card. The ledger is append-only. {@code id} is 0 until the
 * repository stores the entry. {@code relatedEntryId} points at an earlier entry this one
 * refers to, or is null. {@code storeId} is null for entries not made at a store.
 */
public record LedgerEntry(
    long id,
    CardNumber card,
    EntryKind kind,
    Money amount,
    Long relatedEntryId,
    String storeId,
    Instant at) {

  public static LedgerEntry unsaved(CardNumber card, EntryKind kind, Money amount,
      String storeId, Instant at) {
    return new LedgerEntry(0, card, kind, amount, null, storeId, at);
  }

  public LedgerEntry withId(long newId) {
    return new LedgerEntry(newId, card, kind, amount, relatedEntryId, storeId, at);
  }
}
