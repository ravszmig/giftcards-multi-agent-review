package com.example.giftcard.api;

import com.example.giftcard.domain.GiftCard;
import com.example.giftcard.domain.Money;
import java.time.LocalDate;

/** What a partner sees of a card. Carries the masked number only. */
public record CardView(String maskedNumber, Money balance, LocalDate issuedOn) {

  public static CardView of(GiftCard card) {
    return new CardView(card.number().masked(), card.balance(), card.issuedOn());
  }
}
