package com.example.giftcard.api;

import com.example.giftcard.domain.CardNumber;
import com.example.giftcard.domain.CardService;
import com.example.giftcard.domain.Money;
import com.example.giftcard.domain.RedemptionService;

/**
 * The published API of the gift card library, used in-process by partner teams. Partner
 * builds depend on {@code com.example:gift-card-service} and call this class only.
 */
public final class GiftCards {

  /** The library version. Matches the version in {@code pom.xml}. */
  public static final String VERSION = "1.4.0";

  private final CardService cards;
  private final RedemptionService redemptions;

  public GiftCards(CardService cards, RedemptionService redemptions) {
    this.cards = cards;
    this.redemptions = redemptions;
  }

  /** Issues a card. The returned number is the only copy the caller gets. */
  public CardNumber issue(Money initial) {
    return cards.issue(initial).number();
  }

  public CardView balance(CardNumber number) {
    return CardView.of(cards.balance(number));
  }

  public CardView redeem(CardNumber number, Money amount, String storeId) {
    redemptions.redeem(number, amount, storeId);
    return CardView.of(redemptions.card(number));
  }

  public CardView topUp(CardNumber number, Money amount) {
    return CardView.of(cards.topUp(number, amount));
  }
}
