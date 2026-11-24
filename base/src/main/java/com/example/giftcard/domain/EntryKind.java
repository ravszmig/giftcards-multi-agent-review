package com.example.giftcard.domain;

/** What a ledger entry records. Stored by name in {@code ledger_entries.kind}. */
public enum EntryKind {
  ISSUE,
  REDEEM,
  TOP_UP
}
