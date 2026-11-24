package com.example.giftcard.domain;

/** A redemption asked for more than the card holds. */
public class InsufficientBalanceException extends DomainRuleException {

  public InsufficientBalanceException(CardNumber card, Money balance, Money requested) {
    super("INSUFFICIENT_BALANCE", "Card " + card.masked() + " holds " + balance.format()
        + ", cannot redeem " + requested.format());
  }
}
