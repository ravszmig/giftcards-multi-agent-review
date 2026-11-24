package com.example.giftcard.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.util.random.RandomGenerator;

/** Issues cards, tops them up and reads balances. */
public final class CardService {

  private final GiftCardRepository cards;
  private final RandomGenerator random;
  private final Clock clock;

  public CardService(GiftCardRepository cards, RandomGenerator random, Clock clock) {
    this.cards = cards;
    this.random = random;
    this.clock = clock;
  }

  /** Issues a card holding {@code initial}, which must be above zero and at most BD-003's cap. */
  public GiftCard issue(Money initial) {
    final GiftCard card = new GiftCard(newNumber(), Money.ZERO, LocalDate.now(clock), 0)
        .topUp(initial);
    cards.create(card, LedgerEntry.unsaved(card.number(), EntryKind.ISSUE, initial, null,
        clock.instant()));
    return card;
  }

  public GiftCard topUp(CardNumber number, Money amount) {
    final GiftCard updated = balance(number).topUp(amount);
    cards.apply(updated, LedgerEntry.unsaved(number, EntryKind.TOP_UP, amount, null,
        clock.instant()));
    return updated;
  }

  public GiftCard balance(CardNumber number) {
    return cards.find(number).orElseThrow(() -> new UnknownCardException(number));
  }

  private CardNumber newNumber() {
    final StringBuilder digits = new StringBuilder("6");
    while (digits.length() < 16) {
      digits.append(random.nextInt(10));
    }
    return new CardNumber(digits.toString());
  }
}
