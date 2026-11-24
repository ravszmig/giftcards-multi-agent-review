package com.example.giftcard.domain;

import java.time.LocalDate;

/**
 * A gift card and its current balance. Immutable: every change returns a new value with the
 * same version, and the repository increments the version when it stores the change.
 */
public record GiftCard(CardNumber number, Money balance, LocalDate issuedOn, int version) {

  /** The most a card may hold at any time (BD-003). */
  public static final Money MAX_BALANCE = Money.ofPence(50_000);

  public GiftCard redeem(Money amount) {
    requirePositive(amount);
    if (amount.isGreaterThan(balance)) {
      throw new InsufficientBalanceException(number, balance, amount);
    }
    return new GiftCard(number, balance.minus(amount), issuedOn, version);
  }

  public GiftCard topUp(Money amount) {
    requirePositive(amount);
    final Money after = balance.plus(amount);
    if (after.isGreaterThan(MAX_BALANCE)) {
      throw new DomainRuleException("BALANCE_LIMIT",
          "Card " + number + " would hold " + after.format() + ", above "
              + MAX_BALANCE.format());
    }
    return new GiftCard(number, after, issuedOn, version);
  }

  private static void requirePositive(Money amount) {
    if (amount.isZero()) {
      throw new IllegalArgumentException("Amount must be above zero");
    }
  }
}
