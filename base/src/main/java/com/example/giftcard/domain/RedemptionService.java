package com.example.giftcard.domain;

import java.time.Clock;

/** Spends money from a card at a store. */
public final class RedemptionService {

  private final GiftCardRepository cards;
  private final Clock clock;

  public RedemptionService(GiftCardRepository cards, Clock clock) {
    this.cards = cards;
    this.clock = clock;
  }

  /**
   * Takes {@code amount} off the card and records a REDEEM entry. The amount must be above
   * zero and at most the balance; redeeming the exact balance leaves the card at zero.
   *
   * @return the stored REDEEM entry; its id is the redemption id
   */
  public LedgerEntry redeem(CardNumber number, Money amount, String storeId) {
    final GiftCard card = cards.find(number).orElseThrow(() -> new UnknownCardException(number));
    final GiftCard updated = card.redeem(amount);
    return cards.apply(updated, LedgerEntry.unsaved(number, EntryKind.REDEEM, amount, storeId,
        clock.instant()));
  }

  /** The card after the redemption, read back from the repository. */
  public GiftCard card(CardNumber number) {
    return cards.find(number).orElseThrow(() -> new UnknownCardException(number));
  }
}
