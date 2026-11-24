package com.example.giftcard.domain;

import java.util.List;

/** The redemptions made with a card. Reads the ledger; changes nothing. */
public final class RedemptionHistory {

  private final LedgerRepository ledger;

  public RedemptionHistory(LedgerRepository ledger) {
    this.ledger = ledger;
  }

  /** Every REDEEM entry for the card, oldest first. Empty for an unknown card. */
  public List<LedgerEntry> redemptions(CardNumber card) {
    return ledger.forCard(card).stream()
        .filter(entry -> entry.kind() == EntryKind.REDEEM)
        .toList();
  }
}
